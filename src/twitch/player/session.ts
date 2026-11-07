// One playback at a time on the app's video: a live channel, a past broadcast or a clip. The session resolves the
// stream: a token as an ad-free player type (popout first, or the one that last played without ads in this run of
// the app), the master through usher (v1, or v2 once v1 fails in a way the token does not explain), its qualities,
// and, before any engine starts, the start quality's media playlist (ads there: the next player type). Around the
// engines it owns the policy: which engine plays (engineFor: hls.js for live streams and past broadcasts wherever
// Media Source exists, the TV's own player for clips), ads that show up later (the next player type), one retry
// budget per failure episode, the remembered quality, and what is the same for every engine (seek, pause, position,
// buffer). A worker that cannot start sends past broadcasts to the TV's own player for the rest of the run, while a
// live stream fails as not playable here (on the TV's own player it freezes on its first picture). Every engine start
// gets the current height limit and pause, and a past broadcast or clip that showed a picture starts where the viewer
// was.
// prefetch() resolves a likely next start ahead. A target that already plays is handed over (a preview going full
// screen), not restarted. Ownership: the screen whose events play owns the playback; a screen going out of sight
// leaves it (leave), and unless the screen shown next plays the same target (a claim), it pauses once that
// navigation is done and stops when its screen goes. The video: the screen in sight places it (placeVideo) and takes
// its place away when it goes out of sight; it shows there while a playback runs that its screen has not left, and a
// stopped playback's last picture stays hidden until the next playback's first picture. The app going to the
// background tells the owner, lets the pipeline go and starts the same playback again on return. The player screens
// and the test hook (player/test-hook.ts) drive it.

import { getText, HttpError } from '../../core/http.js';
import { noteStall, noteZap } from '../../core/perf.js';
import { load, save } from '../../core/store.js';
import { releaseVideo } from '../../player/video.js';
import { clip } from '../api/clip.js';
import { GqlError } from '../api/gql.js';
import { PLAYER_TYPES, playbackUrl, StreamKind, Token, TokenRefusal, tokenRefuses, UsherVersion } from '../api/playback.js';
import { aheadOf, Engine, EngineEvents, Failure, FailureKind, playVideo, Quality, showVideo, Source } from './engine.js';
import { firstDateOnly, mediaSourcePlays, parseQualities } from './master.js';
import { hasAds, markAdGaps } from './ads.js';
import { bandwidth, fitQuality, pickUnder } from './bandwidth.js';
import { loadHls } from './hls-loader.js';
import { MseEngine } from './mse-engine.js';
import { NativeEngine } from './native-engine.js';
import { releasePipeline } from './pipeline.js';

export type EngineName = 'native' | 'mse';

export interface Target {
    kind: 'live' | 'vod' | 'clip';
    /** The channel's login, the video's id, the clip's slug */
    id: string;
    /** Where a past broadcast starts (s) */
    startAt?: number;
    /** A clip's files when the clip page has them already (api/clip.ts): no second request */
    files?: Quality[];
}

export interface PlayOptions {
    /** The largest picture height wanted (a preview); none or 0: no limit */
    maxHeight?: number;
    muted?: boolean;
    /** Whether a quality picked during this playback is remembered for the next ones (true unless false: a preview) */
    remember?: boolean;
}

/** What the player screen hears; every member is optional */
export interface SessionEvents {
    /** The picture moves (again) */
    playing?(): void;
    /** Waiting for data */
    buffering?(): void;
    paused?(): void;
    /** A past broadcast played to its end */
    ended?(): void;
    /** The qualities (best first), the one picked (-1 Auto) and the one playing (-1 not known yet): the menu's
     * Auto (720p60) */
    qualities?(list: Quality[], picked: number, playing: number): void;
    /** Another ad-free player type plays now (ads showed up, or one was refused) */
    playerTypeChanged?(playerType: string): void;
    /** The picture waited for data after it had played; action: what was done about it ('' nothing) */
    stalled?(action: string): void;
    /** It cannot play */
    failed?(failure: Failure): void;
    /** The app goes to the background: the pipeline goes right after (where it stands can still be read) */
    background?(): void;
}

/** What plays, for the overlay and the tests (no token or address) */
export interface PlaybackState {
    kind: 'live' | 'vod' | 'clip';
    id: string;
    engine: EngineName;
    /** The ad-free player type playing ('' for a clip) */
    playerType: string;
    /** The usher version playing ('' for a clip) */
    usher: UsherVersion | '';
    qualities: string[];
    /** The quality picked (an index in qualities), -1 for Auto */
    picked: number;
    /** The quality playing ('' not known yet) */
    quality: string;
    picture: string;
    position: number;
    duration: number;
    bufferedAhead: number;
    droppedFrames: number;
    decodedFrames: number;
    paused: boolean;
    /** How often ads showed up (each time the next player type was asked) */
    adBreaks: number;
    /** Engine starts in this playback (a hand-over adds none) */
    starts: number;
    /** Why it stopped ('' while it plays) */
    failed: FailureKind | '';
}

var USHER_KEY = 'twitch.usher';
var QUALITY_KEY = 'twitch.quality';
/** A prefetched start is used this long */
var AHEAD_MS = 60 * 1000;
/** A live stream on the TV's own player has its playlist looked at for ads this often */
var AD_CHECK_MS = 20 * 1000;
/** Network and media failures tried again per failure episode */
var RETRIES = 2;
/** The wait before a retry, times the retry's number */
var RETRY_MS = 1000;
/** Playback that ran this long since the last failure starts a new episode (a full retry budget) */
var EPISODE_MS = 30 * 1000;

interface Resolved {
    token: Token;
    url: string;
    text: string;
    qualities: Quality[];
    /** A past broadcast's start quality's media playlist, fetched ahead with it (it does not change) */
    level?: { url: string; text: string };
}

/** An usher answer that is not a master: its status, and whether the token explains a refusal */
interface UsherError {
    usherStatus: number;
    explained: boolean;
}

/** What a failure means: the failure to tell, or a step to try first; resolve: it came from resolving the stream */
interface Outcome {
    failure: Failure;
    next?: 'type' | 'v2' | 'guest';
    resolve?: boolean;
}

interface Playback {
    /** A copy of what was asked (a hand-over may move its start) */
    target: Target;
    /** A clip's files (the target's, until a network failure asks them again) */
    files: Quality[] | null;
    events: SessionEvents;
    options: PlayOptions;
    engineName: EngineName;
    engine: Engine | null;
    source: Source | null;
    /** The token playing (null for a clip, and until an engine starts) */
    token: Token | null;
    /** Index in PLAYER_TYPES of the token asked; and of the one playing */
    type: number;
    playingType: number;
    usher: UsherVersion;
    triedV2: boolean;
    triedGuest: boolean;
    /** Raised by every resolve: answers of an older one are dropped */
    resolving: number;
    /** Raised by every engine start: events of an older run are dropped */
    run: number;
    /** The run whose ads were acted on */
    adsRun: number;
    adBreaks: number;
    retries: number;
    /** Since when the picture moves after the last failure (0: not since) */
    movingSince: number;
    startedAt: number;
    /** The first picture was shown */
    shown: boolean;
    /** Where a past broadcast or clip stands (s), kept as it plays: a failed engine's video no longer tells */
    at: number;
    /** The viewer paused: every engine start holds it */
    paused: boolean;
    /** Its screen left it and no other claimed it: paused until a claim */
    left: boolean;
    held: boolean;
    failed: FailureKind | '';
    adTimer: number;
    retryTimer: number;
}

interface Ahead {
    at: number;
    type: number;
    usher: UsherVersion;
    result: Promise<Resolved>;
}

var video: HTMLVideoElement | null = null;
var engines: { [name: string]: Engine } = {};
var makeEngine = function (name: EngineName, v: HTMLVideoElement): Engine {
    return name === 'mse' ? new MseEngine(v) : new NativeEngine(v);
};
var now: Playback | null = null;
var ahead: { [key: string]: Ahead } = {};
/** For the rest of the app's run: the player type that last played without ads, the usher version that worked when
 * v1 did not, a Media Source worker that could not start, and the engine the test hook forced ('' none) */
var adFreeType = 0;
var usherForRun: UsherVersion | null = null;
var workerBroken = false;
var forced: EngineName | '' = '';
/** What played when the app went to the background, to start again on return */
var parked: { target: Target; events: SessionEvents; options: PlayOptions; paused: boolean } | null = null;

/** A place for the video, in layout units */
export interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** The video's place as last set (placeVideo; null: the stylesheet's) */
var placed: Box | null = null;

function noop(): undefined {
    return undefined;
}

/** The app's one video */
export function videoElement(): HTMLVideoElement {
    if (!video) {
        video = document.getElementById('video') as HTMLVideoElement;
        document.addEventListener('visibilitychange', visibilityChanged, false);
        video.addEventListener('waiting', function () {
            if (now && now.events.buffering) {
                now.events.buffering();
            }
        });
        video.addEventListener('ended', function () {
            if (now && now.events.ended) {
                now.events.ended();
            }
        });
        video.addEventListener('timeupdate', function () {
            var v = video as HTMLVideoElement;
            // Only with data where it stands (HAVE_CURRENT_DATA): an unloaded or starting video says 0
            if (now && now.shown && now.target.kind !== 'live' && v.readyState >= 2) {
                now.at = v.currentTime;
            }
        });
    }
    return video;
}

/** Engines from make instead of the real ones (the tests) */
export function useEngines(make: (name: EngineName, v: HTMLVideoElement) => Engine): void {
    makeEngine = make;
    engines = {};
}

function engineOf(name: EngineName): Engine {
    return engines[name] || (engines[name] = makeEngine(name, videoElement()));
}

/** The engine a target starts on. hls.js plays live streams and past broadcasts wherever Media Source exists (webOS,
 * Android TV): the TV's own player cannot play Twitch live (it stands still after the first picture) nor fMP4. A past
 * broadcast goes to the TV's own player once the worker failed in this run (its TS plays there); a live stream stays
 * on hls.js and fails. Clips, plain MP4 files, play on the TV's own player, and so does everything on a device
 * without Media Source. The test hook may force one (forceEngine). */
export function engineFor(kind: 'live' | 'vod' | 'clip'): EngineName {
    if (kind === 'clip') {
        return 'native';
    }
    if (forced) {
        return forced;
    }
    if (!(window as unknown as { MediaSource?: unknown }).MediaSource) {
        return 'native';
    }
    return kind === 'vod' && workerBroken ? 'native' : 'mse';
}

/** The engine live streams and past broadcasts start on from now on in this run ('' the policy's): the test hook's,
 * never stored */
export function forceEngine(name: EngineName | ''): void {
    forced = name;
}

/** The stored stream request version ('' for the default: v1, v2 once v1 fails; v1 or v2: that one only) */
export function usherPref(): UsherVersion | '' {
    var pref = load<string>(USHER_KEY);
    return pref === 'v1' || pref === 'v2' ? pref : '';
}

export function setUsher(version: UsherVersion | ''): void {
    save(USHER_KEY, version);
}

function usherFor(): UsherVersion {
    return usherPref() || usherForRun || 'v1';
}

/** A target as the session tells them apart */
export function keyOf(target: Target): string {
    return target.kind + ':' + target.id.toLowerCase();
}

var key = keyOf;

/** What plays now as keyOf names it ('' for nothing, or a playback that failed) */
export function playingKey(): string {
    return now && !now.failed ? key(now.target) : '';
}

/** The quality new starts begin at (its height and frame rate), or null for Auto */
export function rememberedQuality(): { height: number; fps: number } | null {
    var r = load<{ height: number; fps: number }>(QUALITY_KEY);
    return r && r.height > 0 ? r : null;
}

/** The remembered quality's index in list: the best at or below its height and frame rate (-1: Auto) */
function rememberedIndex(list: Quality[]): number {
    var r = rememberedQuality();
    if (!r) {
        return -1;
    }
    for (var i = 0; i < list.length; i++) {
        if (list[i].height < r.height || (list[i].height === r.height && list[i].fps <= r.fps)) {
            return i;
        }
    }
    return list.length - 1;
}

/** The quality the next starts begin at (null: Auto) */
export function rememberQuality(q: Quality | null): void {
    save(QUALITY_KEY, q ? { height: q.height, fps: q.fps } : null);
}

/** Token, master and qualities of a live channel or past broadcast as PLAYER_TYPES[type] through usher */
function resolveStream(target: Target, type: number, usher: UsherVersion): Promise<Resolved> {
    return playbackUrl(target.kind as StreamKind, target.id, PLAYER_TYPES[type], usher).then(function (r) {
        return getText(r.url, 10000).then(function (text) {
            return { token: r.token, url: r.url, text: text, qualities: parseQualities(text, r.url) };
        }, function (e: HttpError) {
            throw { usherStatus: e.status, explained: tokenRefuses(r.token) } as UsherError;
        });
    });
}

function sweepAhead(): void {
    var t = Date.now();
    for (var k in ahead) {
        if (t - ahead[k].at >= AHEAD_MS) {
            delete ahead[k];
        }
    }
}

/** r with its start quality's media playlist as a full-screen start picks it (the remembered one, else Auto's), or
 * r as it is when that fails */
function withLevel(r: Resolved): Promise<Resolved> {
    var list = r.qualities.filter(mediaSourcePlays);
    var pick = rememberedIndex(list);
    var first = list[pick >= 0 ? pick : fitQuality(list, bandwidth(), 0)];
    if (!first) {
        return Promise.resolve(r);
    }
    return getText(first.url, 10000).then(function (text) {
        r.level = { url: first.url, text: text };
        return r;
    }, function () {
        return r;
    });
}

/** Resolves a likely next start ahead (used by a start within AHEAD_MS); loads hls.js when it will play it. Settles
 * (never rejects) once the stream is resolved or failed */
export function prefetch(target: Target): Promise<unknown> {
    if (target.kind === 'clip') {
        return Promise.resolve();
    }
    if (engineFor(target.kind) === 'mse') {
        loadHls().then(null, noop);
    }
    sweepAhead();
    var k = key(target);
    var usher = usherFor();
    var had = ahead[k];
    if (had && had.type === adFreeType && had.usher === usher) {
        return had.result.then(noop, noop);
    }
    var result = resolveStream(target, adFreeType, usher);
    if (target.kind === 'vod' && engineFor('vod') === 'mse') {
        result = result.then(withLevel);
    }
    var entry: Ahead = { at: Date.now(), type: adFreeType, usher: usher, result: result };
    ahead[k] = entry;
    return entry.result.then(noop, function () {
        if (ahead[k] === entry) {
            delete ahead[k];
        }
    });
}

/** The prefetched start of p's target, if it was asked as p's player type and usher version */
function takeAhead(p: Playback): Promise<Resolved> | null {
    sweepAhead();
    var k = key(p.target);
    var had = ahead[k];
    delete ahead[k];
    return had && had.type === p.type && had.usher === p.usher ? had.result : null;
}

/** Plays target. When it plays already (a preview going full screen) its new owner claims it: only the events and
 * options change, a past broadcast or clip goes to a new start position, and a playback paused while left goes on.
 * Played again after it failed (Reload), a past broadcast or clip starts where it stood unless told otherwise. */
export function play(target: Target, events: SessionEvents, options?: PlayOptions): void {
    var opts = options || {};
    var p = now;
    var startAt = target.startAt;
    if (p && key(p.target) === key(target)) {
        if (!p.failed) {
            p.events = events;
            p.left = false;
            applyOptions(p, opts);
            moveTo(p, startAt);
            unhold(p);
            drawVideo();
            replay(p);
            return;
        }
        if (startAt === undefined && p.target.kind !== 'live') {
            startAt = p.at;
        }
    }
    stop();
    var name = engineFor(target.kind);
    if (name === 'mse') {
        // Loads while the token and the master are asked
        loadHls().then(null, noop);
    }
    p = now = {
        target: { kind: target.kind, id: target.id, startAt: startAt },
        files: target.files && target.files.length ? target.files : null, events: events, options: opts,
        engineName: name, engine: null, source: null, token: null, type: adFreeType, playingType: adFreeType, usher: usherFor(),
        triedV2: false, triedGuest: false, resolving: 0, run: 0, adsRun: -1, adBreaks: 0, retries: 0, movingSince: 0,
        startedAt: Date.now(), shown: false, at: startAt || 0, paused: false, left: false, held: false, failed: '', adTimer: 0,
        retryTimer: 0
    };
    applyOptions(p, opts);
    drawVideo();
    if (events.buffering) {
        events.buffering();
    }
    restart(p);
}

function applyOptions(p: Playback, opts: PlayOptions): void {
    p.options = opts;
    videoElement().muted = !!opts.muted;
    var height = opts.maxHeight || 0;
    if (p.source && p.source.maxHeight !== height) {
        p.source.maxHeight = height;
        if (p.engine) {
            p.engine.setMaxHeight(height);
        }
    }
}

/** A past broadcast or clip handed over with another start position goes there */
function moveTo(p: Playback, at: number | undefined): void {
    if (p.target.kind === 'live' || typeof at !== 'number' || at === p.target.startAt) {
        return;
    }
    p.target.startAt = at;
    if (p.shown) {
        seek(at);
    } else if (p.engine && p.source) {
        // Started, no picture yet: started again from there
        startEngine(p, p.source, null);
    }
}

/** Tells new events where a handed-over playback stands */
function replay(p: Playback): void {
    var e = p.events;
    if (p.source && e.qualities) {
        e.qualities(p.source.qualities, p.source.quality, p.engine ? p.engine.current() : -1);
    }
    var moving = p.shown && !videoElement().paused;
    if (moving && e.playing) {
        e.playing();
    } else if (!moving && p.shown && e.paused) {
        e.paused();
    } else if (!moving && e.buffering) {
        e.buffering();
    }
}

function stale(p: Playback, attempt: number): boolean {
    return p !== now || attempt !== p.resolving;
}

/** Resolves p's target again from the start (a new token, or the clip's files) */
function restart(p: Playback): void {
    if (p.target.kind === 'clip') {
        startClip(p);
    } else {
        startStream(p);
    }
}

function startClip(p: Playback): void {
    var attempt = ++p.resolving;
    var files = p.files ? Promise.resolve(p.files) : clip(p.target.id).then(function (c) { return c.files; });
    files.then(function (list) {
        if (stale(p, attempt)) {
            return;
        }
        if (!list.length) {
            failed(p, { failure: { kind: 'offline', detail: 'the clip has no file' } });
            return;
        }
        startEngine(p, { kind: 'clip', url: list[0].url, master: '', qualities: list, quality: rememberedIndex(list), maxHeight: p.options.maxHeight || 0 }, null);
    }, function (e) {
        if (!stale(p, attempt)) {
            failed(p, outcome(p, e));
        }
    });
}

/** Token, master and the start quality's media playlist as the current player type; ads there move on to the next
 * player type before any engine starts */
function startStream(p: Playback): void {
    var attempt = ++p.resolving;
    (takeAhead(p) || resolveStream(p.target, p.type, p.usher)).then(function (r) {
        if (stale(p, attempt)) {
            return undefined;
        }
        // hls.js plays only the qualities whose codecs this device's Media Source plays (an HEVC variant on a device
        // without HEVC): the menu offers those; none of them is a stream this device cannot play
        var list = p.engineName === 'mse' ? r.qualities.filter(mediaSourcePlays) : r.qualities;
        if (!list.length) {
            failed(p, { failure: { kind: 'stream', detail: r.qualities.length ? 'no quality this device plays' : 'no qualities' } });
            return undefined;
        }
        var height = p.options.maxHeight || 0;
        var source: Source = { kind: p.target.kind, url: r.url, master: r.text, qualities: list, quality: rememberedIndex(list), maxHeight: height };
        var live = p.target.kind === 'live';
        if (!live && p.engineName === 'native') {
            // No ads to look for, and the TV's player fetches the playlist itself
            startEngine(p, source, r.token, true);
            return undefined;
        }
        var pick = pickUnder(list, source.quality, height);
        var first = list[pick >= 0 ? pick : fitQuality(list, bandwidth(), height)];
        var kept = r.level && r.level.url === first.url ? r.level.text : null;
        return (kept !== null ? Promise.resolve(kept) : getText(first.url, 10000)).then(function (text) {
            if (stale(p, attempt)) {
                return;
            }
            var ads = live && hasAds(text);
            if (ads && p.type < PLAYER_TYPES.length - 1) {
                p.adBreaks++;
                nextType(p);
                return;
            }
            source.level = { url: first.url, text: text };
            // Ads in the last player type too: it plays (their segments left out) but is not remembered
            startEngine(p, source, r.token, !ads);
        }, function () {
            // The engine asks for it again and tells what is wrong
            if (!stale(p, attempt)) {
                startEngine(p, source, r.token, false);
            }
        });
    }).then(null, function (e) {
        if (!stale(p, attempt)) {
            failed(p, outcome(p, e));
        }
    });
}

/** Asks the stream again as the next ad-free player type (remembered for the app's run once it starts without ads);
 * false after the last one, and for a clip (one query, no player types) */
function nextType(p: Playback): boolean {
    if (p.target.kind === 'clip' || p.type >= PLAYER_TYPES.length - 1) {
        return false;
    }
    p.type++;
    startStream(p);
    return true;
}

/** Ads showed up in what plays: the next player type (meanwhile the Media Source engine leaves them out) */
function adsShowedUp(p: Playback): void {
    if (p.adsRun !== p.run) {
        p.adsRun = p.run;
        p.adBreaks++;
        nextType(p);
    }
}

/** A live stream's media playlists on the Media Source engine: ad segments become gaps, and the session is told */
function adFilter(p: Playback): (text: string) => string {
    return function (text: string): string {
        var r = markAdGaps(text);
        if (r.ads && p === now) {
            adsShowedUp(p);
        }
        return r.text;
    };
}

/** Starts p's engine on source. token: a new one for it, which was asked as p's player type; adFree: that start was
 * seen without ads (only then is its player type remembered for the run). The options may have changed since source
 * was made (a hand-over), and a past broadcast or clip that showed a picture starts where the viewer was. */
function startEngine(p: Playback, source: Source, token: Token | null, adFree?: boolean): void {
    var v = videoElement();
    var engine = engineOf(p.engineName);
    if (p.engine && p.engine !== engine) {
        p.engine.stop();
    }
    if (!engine.keepsPipeline) {
        releasePipeline(v, true);
    }
    var typeChanged = !!p.source && p.target.kind !== 'clip' && p.playingType !== p.type;
    p.engine = engine;
    p.source = source;
    source.maxHeight = p.options.maxHeight || 0;
    source.startAt = p.shown && p.target.kind !== 'live' ? p.at : p.target.startAt;
    if (token) {
        p.token = token;
        p.playingType = p.type;
        if (adFree) {
            adFreeType = p.type;
        }
        if (token.usher === 'v2' && p.triedV2) {
            usherForRun = 'v2';
        }
    }
    if (source.kind === 'live' && p.engineName === 'mse') {
        source.filter = adFilter(p);
    } else if (source.kind === 'vod' && p.engineName === 'mse') {
        source.filter = firstDateOnly;
    }
    var run = ++p.run;
    clearTimeout(p.adTimer);
    p.adTimer = 0;
    if (p.events.qualities) {
        p.events.qualities(source.qualities, source.quality, -1);
    }
    engine.start(source, engineEvents(p, run), p.paused || p.held);
    if (typeChanged && p.events.playerTypeChanged) {
        p.events.playerTypeChanged(PLAYER_TYPES[p.type]);
    }
}

function engineEvents(p: Playback, run: number): EngineEvents {
    var mine = function (): boolean {
        return p === now && run === p.run;
    };
    return {
        playing: function () {
            if (!mine()) {
                return;
            }
            var t = Date.now();
            if (!p.shown) {
                p.shown = true;
                noteZap(p.target.id, t - p.startedAt);
            }
            // A stopped engine hid its last picture: shown again with this one
            showVideo(videoElement());
            if (!p.movingSince) {
                p.movingSince = t;
            }
            watchAds(p);
            if (p.events.playing) {
                p.events.playing();
            }
        },
        quality: function (index: number) {
            if (mine() && p.source && p.events.qualities) {
                p.events.qualities(p.source.qualities, p.source.quality, index);
            }
        },
        stalled: function (action: string) {
            if (!mine()) {
                return;
            }
            if (action) {
                noteStall(p.target.id, action);
            }
            if (p.events.stalled) {
                p.events.stalled(action);
            }
        },
        failed: function (failure: Failure) {
            if (mine()) {
                failed(p, { failure: failure });
            }
        }
    };
}

/** A live stream on the TV's own player: its playlist looked at for ads every AD_CHECK_MS from the first picture on
 * (the start was checked already), not while paused or in the background */
function watchAds(p: Playback): void {
    if (p.adTimer || p.engineName !== 'native' || p.target.kind !== 'live' || p.type >= PLAYER_TYPES.length - 1) {
        return;
    }
    var run = p.run;
    var mine = function (): boolean {
        return p === now && run === p.run;
    };
    var check = function (): void {
        var q = p.source && p.engine ? p.source.qualities[p.engine.current()] : null;
        if (!mine()) {
            return;
        }
        if (!q || videoElement().paused || document.hidden) {
            p.adTimer = setTimeout(check, AD_CHECK_MS) as unknown as number;
            return;
        }
        getText(q.url, 10000).then(function (text) {
            if (!mine()) {
                return;
            }
            if (hasAds(text)) {
                adsShowedUp(p);
            } else {
                p.adTimer = setTimeout(check, AD_CHECK_MS) as unknown as number;
            }
        }, function () {
            if (mine()) {
                p.adTimer = setTimeout(check, AD_CHECK_MS) as unknown as number;
            }
        });
    };
    p.adTimer = setTimeout(check, AD_CHECK_MS) as unknown as number;
}

function failure(kind: FailureKind, detail: string): Failure {
    return { kind: kind, detail: detail };
}

/** What a failed resolve means */
function outcome(p: Playback, e: unknown): Outcome {
    var o = classify(p, e);
    o.resolve = true;
    return o;
}

function classify(p: Playback, e: unknown): Outcome {
    var g = e as GqlError;
    if (g && g.errors && g.kind) {
        var detail = 'gql: ' + g.errors.join('; ');
        // auth: the account's token was refused and dropped (api/gql.ts), so the next ask goes as a guest
        return g.kind === 'network' ? { failure: failure('network', detail) } :
            g.kind === 'auth' ? { failure: failure('auth', detail), next: 'guest' } :
            g.kind === 'notfound' ? { failure: failure('offline', detail) } :
            { failure: failure('stream', detail), next: 'type' };
    }
    var u = e as UsherError;
    if (u && typeof u.usherStatus === 'number') {
        var s = u.usherStatus;
        var said = 'usher ' + p.usher + ' ' + s;
        if (s === 404) {
            return { failure: failure('offline', said) };
        }
        if (s === 403 && u.explained) {
            return { failure: failure('forbidden', said) };
        }
        if (s === 0 || s >= 500) {
            return { failure: failure('network', said) };
        }
        // v2 only when no version was chosen in Settings
        return { failure: failure('stream', said), next: p.usher === 'v1' && !p.triedV2 && !usherPref() ? 'v2' : 'type' };
    }
    var r = e as TokenRefusal;
    if (r && (r.kind === 'offline' || r.kind === 'forbidden')) {
        return { failure: failure(r.kind, r.detail) };
    }
    return { failure: failure('stream', e instanceof Error ? e.message : String(e)) };
}

/** The policy for a failure: the next step it names, for a missing worker the TV's own player (a past broadcast) or
 * not playable here (live), a retry for network and media failures while the episode's budget lasts; else it is
 * told */
function failed(p: Playback, o: Outcome): void {
    var f = o.failure;
    if (o.next === 'type' && nextType(p)) {
        return;
    }
    if (o.next === 'v2') {
        p.triedV2 = true;
        p.usher = 'v2';
        startStream(p);
        return;
    }
    if (o.next === 'guest' && !p.triedGuest) {
        p.triedGuest = true;
        restart(p);
        return;
    }
    if (o.resolve && p.shown && p.engine && p.playingType !== p.type) {
        // Moving on from ads cannot be done: what plays goes on (the Media Source engine leaves the ads out)
        p.type = p.playingType;
        return;
    }
    if (f.kind === 'worker' && p.engineName === 'mse') {
        workerBroken = true;
        if (engineFor(p.target.kind) !== 'native') {
            // Live: not on the TV's own player, where it would freeze on its first picture
            f = failure('stream', f.detail);
        } else {
            p.engineName = 'native';
            if (p.source) {
                // The stream is resolved already: no new token
                startEngine(p, p.source, p.token);
            } else {
                restart(p);
            }
            return;
        }
    }
    if ((f.kind === 'network' || f.kind === 'media') && retry(p, f)) {
        return;
    }
    p.failed = f.kind;
    if (p.events.failed) {
        p.events.failed(f);
    }
}

/** Tries again after a network or media failure, while the episode's budget lasts */
function retry(p: Playback, f: Failure): boolean {
    var t = Date.now();
    if (p.movingSince && t - p.movingSince >= EPISODE_MS) {
        p.retries = 0;
    }
    p.movingSince = 0;
    if (p.retries >= RETRIES) {
        return false;
    }
    p.retries++;
    noteStall(p.target.id, 'retry after ' + f.kind + ': ' + f.detail);
    var attempt = ++p.resolving;
    p.retryTimer = setTimeout(function () {
        if (stale(p, attempt)) {
            return;
        }
        if (f.kind === 'media' && p.source) {
            // The same source on a fresh pipeline (a failed engine keeps none)
            startEngine(p, p.source, p.token);
        } else {
            // A lost stream (an expired session, a dropped line): resolved again
            p.files = null;
            restart(p);
        }
    }, RETRY_MS * p.retries) as unknown as number;
    return true;
}

/** Whether what plays was started, or last claimed, with these events: a screen stops the playback only while it
 * still owns it (the screen shown after it may have claimed it) */
export function owns(events: SessionEvents): boolean {
    return !!now && now.events === events;
}

/** A screen goes out of sight: its place for the video goes at once (the screen shown next places its own); the
 * playback it owns, unless a play() of the same target claims it before this navigation is done, pauses (its screen
 * stops it when it goes) */
export function leave(events: SessionEvents): void {
    placeVideo(null);
    var p = now;
    if (!p || p.events !== events) {
        return;
    }
    var left = p;
    left.left = true;
    Promise.resolve().then(function () {
        if (left === now && left.left) {
            hold(left);
        }
    });
}

/** Paused without the viewer's pause (that one stays as it was) and out of sight until a claim: the box the screen
 * shown next placed is for what that screen plays itself */
function hold(p: Playback): void {
    if (p.held) {
        return;
    }
    p.held = true;
    drawVideo();
    videoElement().pause();
    if (p.engine) {
        p.engine.paused(true);
    }
}

/** Claimed again: plays on unless the viewer paused */
function unhold(p: Playback): void {
    if (!p.held) {
        return;
    }
    p.held = false;
    if (!p.paused) {
        playVideo(videoElement());
        if (p.engine) {
            p.engine.paused(false);
        }
    }
}

/** The app hidden: what plays lets its pipeline go; shown again, the same playback starts again where it was (one
 * left by its screen waits for that screen's next play()) */
function visibilityChanged(): void {
    var p = now;
    if (document.hidden) {
        if (p) {
            if (p.events.background) {
                p.events.background();
            }
            var at = p.shown && p.target.kind !== 'live' ? p.at : p.target.startAt;
            var kept = !p.failed && !p.left ? { target: { kind: p.target.kind, id: p.target.id, startAt: at, files: p.files || undefined },
                events: p.events, options: p.options, paused: p.paused } : null;
            release();
            parked = kept;
        }
        return;
    }
    var k = parked;
    parked = null;
    if (k && !now) {
        play(k.target, k.events, k.options);
        if (k.paused) {
            pause();
        }
    }
}

/** The video's place on the screen (a box, or null: none); the screen in sight sets it, and leave() takes it away */
export function placeVideo(box: Box | null): void {
    var was = placed;
    if (box && was ? box.left === was.left && box.top === was.top && box.width === was.width && box.height === was.height : box === was) {
        return;
    }
    placed = box;
    writePlace(box);
    drawVideo();
}

function writePlace(box: Box | null): void {
    var s = videoElement().style;
    s.left = box ? box.left + 'px' : '';
    s.top = box ? box.top + 'px' : '';
    s.width = box ? box.width + 'px' : '';
    s.height = box ? box.height + 'px' : '';
}

/** The video shows at its place while a playback runs there that its screen has not left (else the stylesheet hides
 * it: no picture of a stopped or held playback under another screen) */
function drawVideo(): void {
    videoElement().style.visibility = placed && now && !now.held ? 'visible' : '';
}

/** Stops what plays (a Media Source engine keeps its pipeline for the next start); the video hides */
export function stop(): void {
    var p = now;
    now = null;
    parked = null;
    if (p) {
        clearTimeout(p.adTimer);
        clearTimeout(p.retryTimer);
        if (p.engine) {
            p.engine.stop();
        }
        drawVideo();
    }
}

/** Stops and lets the video and the kept pipeline go (the app going to the background); the video stays where its
 * screen placed it */
export function release(): void {
    stop();
    var v = videoElement();
    // One unload for both
    releasePipeline(v, true);
    showVideo(v);
    releaseVideo(v);
    writePlace(placed);
}

/** For this playback: an index in its qualities, -1 for Auto; also remembered unless it plays with remember: false */
export function setQuality(index: number): void {
    var p = now;
    if (!p || !p.source) {
        return;
    }
    var q = p.source.qualities[index] || null;
    p.source.quality = q ? index : -1;
    if (p.options.remember !== false) {
        rememberQuality(q);
    }
    if (p.engine) {
        p.engine.setQuality(p.source.quality);
    }
    if (p.events.qualities) {
        p.events.qualities(p.source.qualities, p.source.quality, p.engine ? p.engine.current() : -1);
    }
}

/** Past broadcasts and clips */
export function seek(seconds: number): void {
    var p = now;
    if (p && p.target.kind !== 'live') {
        p.at = Math.max(0, seconds);
        videoElement().currentTime = p.at;
    }
}

/** Also while the stream is resolved or started again: the next engine start stays paused */
export function pause(): void {
    var p = now;
    if (p) {
        p.paused = true;
        videoElement().pause();
        if (p.engine) {
            p.engine.paused(true);
        }
        if (p.events.paused) {
            p.events.paused();
        }
    }
}

export function resume(): void {
    var p = now;
    if (p) {
        p.paused = false;
        playVideo(videoElement());
        if (p.engine) {
            p.engine.paused(false);
        }
    }
}

/** Seconds played (0 when nothing plays) */
export function position(): number {
    return now ? videoElement().currentTime || 0 : 0;
}

export function bufferedAhead(): number {
    return now ? aheadOf(videoElement()) : 0;
}

/** The whole video's seconds (past broadcasts, clips; 0 live or not known yet) */
export function duration(): number {
    var d = videoElement().duration;
    return now && now.target.kind !== 'live' && isFinite(d) ? d : 0;
}

export function playbackState(): PlaybackState | null {
    var p = now;
    if (!p) {
        return null;
    }
    var v = videoElement() as HTMLVideoElement & { webkitDroppedFrameCount?: number; webkitDecodedFrameCount?: number;
        getVideoPlaybackQuality?: () => { droppedVideoFrames: number; totalVideoFrames: number } };
    var q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null;
    var list = p.source ? p.source.qualities : [];
    var playing = p.engine ? list[p.engine.current()] : null;
    var stream = p.target.kind !== 'clip';
    return {
        kind: p.target.kind,
        id: p.target.id,
        engine: p.engineName,
        playerType: stream ? PLAYER_TYPES[p.playingType] : '',
        usher: stream && p.token ? p.token.usher : '',
        qualities: list.map(function (x) { return x.name; }),
        picked: p.source ? p.source.quality : -1,
        quality: playing ? playing.name : '',
        picture: v.videoWidth + 'x' + v.videoHeight,
        position: Math.round(position() * 10) / 10,
        duration: Math.round(duration()),
        bufferedAhead: Math.round(bufferedAhead() * 10) / 10,
        droppedFrames: q ? q.droppedVideoFrames : v.webkitDroppedFrameCount || 0,
        decodedFrames: q ? q.totalVideoFrames : v.webkitDecodedFrameCount || 0,
        paused: v.paused,
        adBreaks: p.adBreaks,
        starts: p.run,
        failed: p.failed
    };
}
