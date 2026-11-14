// One playback at a time on the app's video: a live channel, a past broadcast or a clip. The session resolves the
// stream: a token as one of the player types (popout first, or the one that last played without stitched segments in
// this run of the app), the master through usher (v1, or v2 once v1 fails in a way the token does not explain), its
// qualities, and, before any engine starts, the start quality's media playlist (stitched segments there: the next
// player type). Around the engines it owns the policy: which engine plays (engineFor: hls.js for live streams and past
// broadcasts wherever Media Source exists, the TV's own player for clips), stitched segments that show up later (the
// next player type), one retry
// budget per failure episode, the remembered quality, and what is the same for every engine (seek, pause, position,
// buffer). A worker that cannot start sends past broadcasts to the TV's own player for the rest of the run, while a
// live stream fails as not playable here (on the TV's own player it freezes on its first picture). Every engine start
// gets the current pause, and a past broadcast or clip that showed a picture starts where the viewer
// was. A past broadcast that still records plays to the end it had at its start, then is resolved again from there.
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
import { GqlError, signedIn } from '../api/gql.js';
import { PLAYER_TYPES, playbackUrl, StreamKind, Token, TokenRefusal, tokenRefuses, usherCode, UsherVersion } from '../api/playback.js';
import { aheadOf, Delay, Engine, EngineEvents, Failure, FailureKind, Fetched, playVideo, Quality, showVideo, Source } from './engine.js';
import { cutWindow, liveTarget, mediaSourcePlays, movedWindow, mutedRanges, parseQualities, pastBroadcast, segmentStart, Span, windowAt } from './master.js';
import { hasAds, markAdGaps } from './ads.js';
import { SegmentAhead, segmentAhead } from './segment.js';
import { stabilize } from './stable-volume.js';
import { startQuality } from './bandwidth.js';
import { loadHls } from './hls-loader.js';
import { MseEngine, quickHere } from './mse-engine.js';
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
    /** A past broadcast went into a stretch Twitch muted for copyrighted audio (true), or out of it */
    muted?(on: boolean): void;
    /** The qualities (best first), the one picked (-1 Auto) and the one playing (-1 not known yet): the menu's
     * Auto (720p60) */
    qualities?(list: Quality[], picked: number, playing: number): void;
    /** Another player type plays now (stitched segments showed up, or one was refused) */
    playerTypeChanged?(playerType: string): void;
    /** The picture waited for data after it had played; action: what was done about it ('' nothing) */
    stalled?(action: string): void;
    /** It cannot play */
    failed?(failure: Failure): void;
    /** The app goes to the background: the pipeline goes right after (where it stands can still be read) */
    background?(): void;
    /** A live stream's commercial break that every player type has (true; it plays on without the break, its picture
     * standing), or its end */
    commercial?(on: boolean): void;
}

/** What plays, for the overlay and the tests (no token or address) */
export interface PlaybackState {
    kind: 'live' | 'vod' | 'clip';
    id: string;
    engine: EngineName;
    /** The player type playing ('' for a clip) */
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
    /** How often stitched segments showed up (each time the next player type was asked) */
    adBreaks: number;
    /** Media playlists with a commercial break that went on as another player type's without it */
    swaps: number;
    /** Engine starts in this playback (a hand-over adds none) */
    starts: number;
    /** Why it stopped ('' while it plays) */
    failed: FailureKind | '';
}

var USHER_KEY = 'twitch.usher';
var QUALITY_KEY = 'twitch.quality';
/** A prefetched start is used this long */
var AHEAD_MS = 60 * 1000;
/** A live stream started ahead and not claimed stops after this: it would download for as long as focus rests */
var READY_LIVE_MS = 20 * 1000;
/** A past broadcast is kept this long after its player closed (keep) */
var KEPT_MS = 60 * 1000;
/** A live stream on the TV's own player has its playlist looked at for stitched segments this often */
var AD_CHECK_MS = 20 * 1000;
/** A seek this close to the end of the window hls.js has (or past it, or before it) starts the past broadcast again
 * with a new window there */
var REWINDOW_S = 60;
/** A live stream's spare player type is asked this long after its engine started (out of the start's way), then this
 * often */
var SPARE_FIRST_MS = 15 * 1000;
var SPARE_MS = 10 * 60 * 1000;
/** Spare player types by preference (indexes in PLAYER_TYPES): embed last, the type Twitch put its breaks into
 * while we watched */
var SPARE_ORDER = [2, 0, 3, 1];
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
    level?: Fetched;
    /** And the segment it starts in, being fetched, and the start position it was asked for */
    segment?: SegmentAhead;
    segmentFor?: number;
}

/** An usher answer that is not a master: its status, whether the token explains a refusal, and usher's own code */
interface UsherError {
    usherStatus: number;
    explained: boolean;
    code: string;
}

/** Usher's codes for a past broadcast or stream kept for subscribers (as Twitch's TV app reads them) */
var SUB_ONLY: { [code: string]: boolean } = { vod_manifest_restricted: true, unauthorized_entitlements: true };

/** What a failure means: the failure to tell, or a step to try first; resolve: it came from resolving the stream */
interface Outcome {
    failure: Failure;
    next?: 'type' | 'v2' | 'guest' | 'account';
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
    /** The token is asked with the account (after a guest's was refused: subscribers only); else as a guest, whose
     * player types carry no stitched segments */
    withAccount: boolean;
    /** Raised by every resolve: answers of an older one are dropped */
    resolving: number;
    /** Raised by every engine start: events of an older run are dropped */
    run: number;
    /** The run whose stitched segments were acted on */
    adsRun: number;
    adBreaks: number;
    swaps: number;
    /** A live stream's spare: another player type's qualities, ready for a commercial break, and when it was last
     * asked (or the engine started) */
    spare: { type: number; qualities: Quality[]; at: number } | null;
    spareAt: number;
    /** Every player type has the commercial break now (the screen was told) */
    inBreak: boolean;
    retries: number;
    /** Since when the picture moves after the last failure (0: not since) */
    movingSince: number;
    startedAt: number;
    /** The first picture was shown */
    shown: boolean;
    /** Where a past broadcast or clip stands (s), kept as it plays: a failed engine's video no longer tells */
    at: number;
    /** The past broadcast still records: its playlist got an end (pastBroadcast), so it goes on at that end */
    recording: boolean;
    /** A past broadcast's window on the Media Source engine (master.ts): what its playlists are cut to now (want),
     * where the last cut handed to hls.js begins and ends, and the broadcast's end; null: handed whole */
    window: { want: Span; from: number; to: number; end: number } | null;
    /** Its engine started and no playlist is cut yet: where the window falls is not known */
    cutting: boolean;
    /** The end it last went on from (s; 0: none) */
    wentOnAt: number;
    /** The viewer paused: every engine start holds it */
    paused: boolean;
    /** Its screen left it and no other claimed it: paused until a claim */
    left: boolean;
    held: boolean;
    /** Started ahead for a resting tile (ready) and not claimed yet */
    ahead: boolean;
    /** Kept after its player closed (keep), until a claim or keptTimer's end */
    kept: boolean;
    keptTimer: number;
    /** A past broadcast's stretches Twitch muted ([start, end] s), and whether it stands in one */
    muted: number[][];
    inMuted: boolean;
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
/** For the rest of the app's run: the player type that last played without stitched segments, the usher version that
 * worked when v1 did not, a Media Source worker that could not start, the engine the test hook forced ('' none) and
 * whether it asks stream tokens with the account */
var adFreeType = 0;
var usherForRun: UsherVersion | null = null;
var workerBroken = false;
var forced: EngineName | '' = '';
var accountForced = false;
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
        stabilize(video);
        document.addEventListener('visibilitychange', visibilityChanged, false);
        video.addEventListener('waiting', function () {
            if (now && now.events.buffering) {
                now.events.buffering();
            }
        });
        video.addEventListener('ended', function () {
            // (the end of a short length the engine told the TV, not the stream's: the engine goes on)
            if (now && now.engine && now.engine.length && now.engine.length()) {
                return;
            }
            if (now && now.recording && goOn(now)) {
                return;
            }
            if (now && now.events.ended) {
                now.events.ended();
            }
        });
        video.addEventListener('timeupdate', function () {
            var v = video as HTMLVideoElement;
            // Only with data where it stands (HAVE_CURRENT_DATA): an unloaded or starting video says 0
            if (now && now.shown && now.target.kind !== 'live' && v.readyState >= 2) {
                now.at = v.currentTime;
                mutedNow(now, v.currentTime);
                growWindow(now, v.currentTime);
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

/** Stream tokens asked with the account from the next start on in this run (signed in), as Twitch then stitches its
 * segments into these player types too: the test hook's, to see them; never stored */
export function forceAccount(on: boolean): void {
    accountForced = on;
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
function resolveStream(target: Target, type: number, usher: UsherVersion, withAccount?: boolean): Promise<Resolved> {
    return playbackUrl(target.kind as StreamKind, target.id, PLAYER_TYPES[type], usher, withAccount).then(function (r) {
        return getText(r.url, 10000).then(function (text) {
            return { token: r.token, url: r.url, text: text, qualities: parseQualities(text, r.url) };
        }, function (e: HttpError) {
            throw { usherStatus: e.status, explained: tokenRefuses(r.token), code: usherCode(e.body || '') } as UsherError;
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

/** r with its start quality's media playlist as a full-screen start picks it (the remembered one, else Auto's) and
 * the segment holding at being fetched (at known: where its player starts it), or r as it is when that fails */
function withLevel(r: Resolved, at: number | undefined): Promise<Resolved> {
    var list = r.qualities.filter(mediaSourcePlays);
    var first = list[startQuality(list, rememberedIndex(list))];
    if (!first) {
        return Promise.resolve(r);
    }
    return getText(first.url, 10000).then(function (text) {
        r.level = { url: first.url, text: text, at: Date.now() };
        r.segment = at !== undefined ? segmentAhead(first.url, text, at, quickHere(), first.bandwidth) || undefined : undefined;
        r.segmentFor = at;
        return r;
    }, function () {
        return r;
    });
}

/** Resolves a likely next start ahead (used by a start within AHEAD_MS); loads hls.js when it will play it. Settles
 * (never rejects) once the stream is resolved or failed */
export function prefetch(target: Target): Promise<unknown> {
    // (what plays already, also kept after its player closed, is claimed as it stands: no start to fetch)
    if (target.kind === 'clip' || (now && !now.failed && key(now.target) === key(target))) {
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
        result = result.then(function (r) {
            return withLevel(r, target.startAt);
        });
    }
    var entry: Ahead = { at: Date.now(), type: adFreeType, usher: usher, result: result };
    ahead[k] = entry;
    return entry.result.then(noop, function () {
        if (ahead[k] === entry) {
            delete ahead[k];
        }
    });
}

/** Starts target out of sight for the player likely to open it next (focus resting on its tile): a past broadcast
 * paused where it starts, a live stream muted (so it stays live). The player's play() of it hands it over: the TV's
 * slow first picture (it works through the whole first segment, 1.7 s for 10 s at 60 fps) is done by then. Not while
 * something plays for a screen, also one under another screen (a channel page's preview keeps its stream, a player
 * under the channel page its avatar opened stays ready for Back); a live one not claimed in READY_LIVE_MS
 * stops (a past broadcast stops loading once its buffer is full) */
export function ready(target: Target): void {
    var p = now;
    // (a past broadcast kept after its player closed gives way to another tile's, as one started ahead does)
    if (target.kind === 'clip' || p && (!(p.ahead || p.kept) || key(p.target) === key(target) && !p.failed)) {
        return;
    }
    play(target, {}, { muted: true, remember: false });
    var started = now as Playback;
    started.ahead = true;
    started.held = target.kind !== 'live';
    if (target.kind === 'live') {
        setTimeout(function () {
            if (started === now && started.ahead) {
                stop();
            }
        }, READY_LIVE_MS);
    }
}

/** Focus left the tile a playback was started ahead for, or its screen hid: it stops unless a play() claims it in this
 * navigation (OK opened its player) */
export function unready(): void {
    var p = now;
    if (!p || !p.ahead) {
        return;
    }
    var started = p;
    Promise.resolve().then(function () {
        if (started === now && started.ahead) {
            stop();
        }
    });
}

/** The prefetched start of p's target, if it was asked as p's player type and usher version (always as a guest) */
function takeAhead(p: Playback): Promise<Resolved> | null {
    sweepAhead();
    var k = key(p.target);
    var had = ahead[k];
    delete ahead[k];
    return had && had.type === p.type && had.usher === p.usher && !p.withAccount ? had.result : null;
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
            p.ahead = false;
            p.kept = false;
            clearTimeout(p.keptTimer);
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
        triedV2: false, triedGuest: false, withAccount: accountForced && signedIn(), resolving: 0, run: 0, adsRun: -1, adBreaks: 0, swaps: 0, spare: null, spareAt: 0, inBreak: false, retries: 0, movingSince: 0,
        startedAt: Date.now(), shown: false, at: startAt || 0, recording: false, window: null, cutting: false, wentOnAt: 0, paused: false, left: false, held: false,
        ahead: false, kept: false, keptTimer: 0, muted: [], inMuted: false, failed: '', adTimer: 0, retryTimer: 0
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

/** Tells p's screen when it goes into or out of a stretch Twitch muted */
function mutedNow(p: Playback, at: number): void {
    var on = false;
    for (var i = 0; i < p.muted.length && !on; i++) {
        on = at >= p.muted[i][0] && at < p.muted[i][1];
    }
    if (on !== p.inMuted) {
        p.inMuted = on;
        if (p.events.muted) {
            p.events.muted(on);
        }
    }
}

/** Tells new events where a handed-over playback stands */
function replay(p: Playback): void {
    var e = p.events;
    if (p.inMuted && e.muted) {
        e.muted(true);
    }
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

/** A past broadcast still recording at the end its playlist had: resolved again to go on with what was recorded
 * since; false when the last time added nothing (the viewer is where the recording stands) */
function goOn(p: Playback): boolean {
    var end = videoElement().duration;
    if (!(end > p.wentOnAt + 1)) {
        return false;
    }
    p.wentOnAt = end;
    p.at = end;
    restart(p);
    return true;
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
        startEngine(p, { kind: 'clip', url: list[0].url, master: '', qualities: list, quality: rememberedIndex(list) }, null);
    }, function (e) {
        if (!stale(p, attempt)) {
            failed(p, outcome(p, e));
        }
    });
}

/** Token, master and the start quality's media playlist as the current player type; stitched segments there move on
 * to the next player type before any engine starts */
function startStream(p: Playback): void {
    var attempt = ++p.resolving;
    (takeAhead(p) || resolveStream(p.target, p.type, p.usher, p.withAccount)).then(function (r) {
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
        var source: Source = { kind: p.target.kind, url: r.url, master: r.text, qualities: list, quality: rememberedIndex(list) };
        var live = p.target.kind === 'live';
        if (!live && p.engineName === 'native') {
            // Nothing stitched to look for, and the TV's player fetches the playlist itself
            startEngine(p, source, r.token, true);
            return undefined;
        }
        var first = list[startQuality(list, source.quality)];
        var kept = r.level && r.level.url === first.url ? r.level : null;
        return (kept ? Promise.resolve(kept.text) : getText(first.url, 10000)).then(function (text) {
            if (stale(p, attempt)) {
                return;
            }
            var ads = live && hasAds(text);
            if (ads && p.type < PLAYER_TYPES.length - 1) {
                p.adBreaks++;
                nextType(p);
                return;
            }
            source.level = { url: first.url, text: text, at: kept ? kept.at : Date.now() };
            if (!live) {
                p.muted = mutedRanges(text);
            }
            var at = (p.shown ? p.at : p.target.startAt) || 0;
            if (kept && r.segment && r.segmentFor === at) {
                source.segment = r.segment;
            } else if (!live && quickHere()) {
                // The segment the start lands in is asked now: hls.js asks for it only once it has read the playlist
                // (0.25-0.45 s later on the TV); one fetched ahead for another position (a seek meanwhile) is let go
                source.segment = segmentAhead(first.url, text, at, true, first.bandwidth) || undefined;
            }
            // Stitched segments in the last player type too: it plays (those left out) but is not remembered
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

/** Asks the stream again as the next player type (remembered for the app's run once it starts without stitched
 * segments); false after the last one, and for a clip (one query, no player types) */
function nextType(p: Playback): boolean {
    if (p.target.kind === 'clip' || p.type >= PLAYER_TYPES.length - 1) {
        return false;
    }
    p.type++;
    startStream(p);
    return true;
}

/** Stitched segments showed up in what plays: the next player type (meanwhile the Media Source engine leaves them
 * out) */
function adsShowedUp(p: Playback): void {
    if (p.adsRun !== p.run) {
        p.adsRun = p.run;
        p.adBreaks++;
        nextType(p);
    }
}

/** A live stream's media playlists on the Media Source engine: stitched segments become gaps (the session is told),
 * and the target duration is the real segments' (master.ts liveTarget) */
function liveFilter(p: Playback): (text: string) => string {
    return function (text: string): string {
        var r = markAdGaps(text);
        if (p === now) {
            breakNow(p, r.ads);
            keepSpare(p);
        }
        return liveTarget(r.text);
    };
}

/** Stitched segments still in what plays (every player type has the break: the swap found none without it), or not
 * any more: the screen is told when that changes */
function breakNow(p: Playback, on: boolean): void {
    if (on === p.inBreak) {
        return;
    }
    p.inBreak = on;
    if (on) {
        p.adBreaks++;
    }
    if (p.events.commercial) {
        p.events.commercial(on);
    }
}

/** The test hook's: every live media playlist taken for one with a commercial break (the swap then runs as in one) */
var breakForced = false;

export function forceBreak(on: boolean): void {
    breakForced = on;
}

/** The test hook's: the screen told that every player type has a commercial break (true), or that it ended */
export function showBreak(on: boolean): void {
    if (now) {
        breakNow(now, on);
    }
}

/** A live stream's media playlists with a commercial break go on as the same quality's playlist of another player
 * type without it: the running hls.js simply goes on (the types' playlists line up, the same segments with the same
 * numbers, dates and addresses; only the stitched ones differ), so nothing restarts. The spare type is asked first,
 * then all others at once; with every type in the break the text as it is (its stitched segments become gaps) */
function swapper(p: Playback): (url: string, text: string) => Promise<string> | null {
    return function (url: string, text: string): Promise<string> | null {
        if (p !== now || !(breakForced || hasAds(text))) {
            return null;
        }
        var name = '';
        var list = p.source ? p.source.qualities : [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].url === url) {
                name = list[i].name;
            }
        }
        var spare = p.spare;
        var first = spare && spare.type !== p.type ? levelOf(spare.qualities, name) : Promise.resolve(null);
        return first.then(function (clean) {
            return clean !== null && !hasAds(clean) ? clean : otherTypes(p, name, spare ? spare.type : -1);
        }).then(function (clean) {
            if (clean !== null && p === now) {
                p.swaps++;
            }
            return clean !== null ? clean : text;
        });
    };
}

/** The media playlist of the quality called name in list (the first when none is), or null when it cannot be had */
function levelOf(list: Quality[], name: string): Promise<string | null> {
    var q = list[0];
    for (var i = 0; i < list.length; i++) {
        if (list[i].name === name) {
            q = list[i];
        }
    }
    return q ? getText(q.url, 5000).then(null, function () { return null; }) : Promise.resolve(null);
}

/** The first player type (in SPARE_ORDER; not p's, nor skip) whose quality called name has no stitched segments, all
 * asked at once: its playlist (that type becomes the spare), or null */
function otherTypes(p: Playback, name: string, skip: number): Promise<string | null> {
    return Promise.all(PLAYER_TYPES.map(function (playerType, type) {
        if (type === p.type || type === skip) {
            return Promise.resolve(null);
        }
        return resolveStream(p.target, type, p.usher, p.withAccount).then(function (r) {
            return levelOf(r.qualities, name).then(function (text) {
                return text !== null && !hasAds(text) ? { type: type, qualities: r.qualities, text: text } : null;
            });
        }, function () { return null; });
    })).then(function (found) {
        for (var i = 0; i < SPARE_ORDER.length; i++) {
            var f = found[SPARE_ORDER[i]];
            if (f) {
                if (p === now) {
                    p.spare = { type: f.type, qualities: f.qualities, at: Date.now() };
                }
                return f.text;
            }
        }
        return null;
    });
}

/** Keeps p's spare as its media playlists come (every 2 s while live plays): the first type of SPARE_ORDER that is
 * not p's, resolved SPARE_FIRST_MS after the engine started and then every SPARE_MS (its addresses carry a token that
 * runs out) */
function keepSpare(p: Playback): void {
    var t = Date.now();
    if (t - p.spareAt < (p.spare ? SPARE_MS : SPARE_FIRST_MS)) {
        return;
    }
    p.spareAt = t;
    var type = SPARE_ORDER[0] === p.type ? SPARE_ORDER[1] : SPARE_ORDER[0];
    resolveStream(p.target, type, p.usher, p.withAccount).then(function (r) {
        if (p === now) {
            p.spare = { type: type, qualities: r.qualities, at: Date.now() };
        }
    }, noop);
}

/** A past broadcast's media playlists on the Media Source engine: one date tag, an end while it records, and cut to
 * a window: around at (where this start begins) when the first one comes, then as p's window has moved on */
function vodFilter(p: Playback, at: number): (text: string) => string {
    return function (text: string): string {
        var r = pastBroadcast(text);
        p.recording = r.recording;
        p.cutting = false;
        var w = p.window;
        var want = w ? w.want : windowAt(r.text, at);
        if (!want) {
            return r.text;
        }
        var cut = cutWindow(r.text, want);
        p.window = { want: want, from: cut.from, to: cut.to, end: cut.end };
        return cut.text;
    };
}

/** Playback at at nears the end of p's window: it moves on, and the engine hands hls.js the grown playlist. Only
 * within what hls.js has: right after a start the video may still say where the last one stood */
function growWindow(p: Playback, at: number): void {
    var w = p.window;
    var next = w && at >= w.from && at <= w.to ? movedWindow(w.want, at, w.end) : null;
    if (w && next) {
        w.want = next;
        if (p.engine && p.engine.refresh) {
            p.engine.refresh();
        }
    }
}

/** A past broadcast goes on from at with a new window around it: its engine started again there, where the segment
 * holding at begins (the TV shows a picture once it has about 5 s from where it starts), the playlist of the quality
 * the new start plays first served as fetched before and that segment asked at once */
function rewindow(p: Playback, at: number): void {
    var source = p.source;
    var q = source ? source.qualities[startQuality(source.qualities, source.quality)] : null;
    var text = q && source && source.levels ? source.levels[q.url] : undefined;
    if (source && q && typeof text === 'string') {
        at = segmentStart(text, at);
        source.level = { url: q.url, text: text, at: Date.now() };
        source.segment = quickHere() ? segmentAhead(q.url, text, at, true, q.bandwidth) || undefined : undefined;
    }
    p.window = null;
    p.at = at;
    if (!p.shown) {
        // (a start without a picture yet starts where it was asked to)
        p.target.startAt = at;
    }
    if (source) {
        startEngine(p, source, null);
    }
}

/** Whether a seek to at leaves p's window (before it, or near or past its end), or may: the window is not cut yet,
 * and the first cut is made around where the start began (a seek past it would wait for a playlist that never
 * grows, one before it land in the gap) */
function outsideWindow(p: Playback, at: number): boolean {
    var w = p.window;
    return (p.cutting && !p.failed) || (!!w && (at < w.from || (w.to < w.end && at > w.to - REWINDOW_S)));
}

/** Starts p's engine on source. token: a new one for it, which was asked as p's player type; adFree: that start was
 * seen without stitched segments (only then is its player type remembered for the run). A past broadcast or clip
 * that showed a picture starts where the viewer was. */
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
    source.startAt = p.shown && p.target.kind !== 'live' ? p.at : p.target.startAt;
    if (!p.shown && source.kind === 'vod' && source.startAt && source.level) {
        // A past broadcast opens where the segment holding its start begins (at most 10 s before): the TV shows its
        // first picture once it has worked through about 5 s of video from there, so a start late in a segment waits
        // for all of it
        source.startAt = segmentStart(source.level.text, source.startAt);
    }
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
        source.filter = liveFilter(p);
        source.swap = swapper(p);
        p.spareAt = Date.now();
    } else if (source.kind === 'vod' && p.engineName === 'mse') {
        // A fresh hls.js gets a fresh window (with the gap before it)
        p.window = null;
        p.cutting = true;
        source.filter = vodFilter(p, source.startAt || 0);
        source.whole = function (): number {
            return p.window ? p.window.end : 0;
        };
        source.levels = source.levels || {};
        if (source.level) {
            // (as hls.js's first load of it keeps it: a seek before that starts again with it, nothing fetched)
            source.levels[source.level.url] = source.level.text;
        }
    } else {
        // (a source an engine of the other kind had: the TV's own player after a failed worker gets the stream whole)
        p.window = null;
        p.cutting = false;
        source.filter = source.whole = source.swap = source.levels = undefined;
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

/** A live stream on the TV's own player: its playlist looked at for stitched segments every AD_CHECK_MS from the
 * first picture on (the start was checked already), not while paused or in the background */
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
        if (s === 403 && SUB_ONLY[u.code] === true) {
            // A subscriber's account may watch it
            return { failure: failure('subonly', said + ' ' + u.code), next: accountMay(p) ? 'account' : undefined };
        }
        if (s === 403 && u.explained) {
            return { failure: failure('forbidden', said), next: accountMay(p) ? 'account' : undefined };
        }
        if (s === 0 || s >= 500) {
            return { failure: failure('network', said) };
        }
        // v2 only when no version was chosen in Settings
        return { failure: failure('stream', said), next: p.usher === 'v1' && !p.triedV2 && !usherPref() ? 'v2' : 'type' };
    }
    var r = e as TokenRefusal;
    if (r && (r.kind === 'offline' || r.kind === 'forbidden')) {
        return { failure: failure(r.kind, r.detail), next: r.kind === 'forbidden' && accountMay(p) ? 'account' : undefined };
    }
    return { failure: failure('stream', e instanceof Error ? e.message : String(e)) };
}

/** Whether a refusal of the guest's token may be asked again with the account (signed in, not tried yet) */
function accountMay(p: Playback): boolean {
    return !p.withAccount && signedIn();
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
    if (o.next === 'account' && !p.withAccount) {
        p.withAccount = true;
        startStream(p);
        return;
    }
    if (o.resolve && p.shown && p.engine && p.playingType !== p.type) {
        // Moving on cannot be done: what plays goes on (the Media Source engine leaves the stitched segments out)
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

/** Whether a picture plays in sight: a playback runs at its place, not held under another screen, moving, the app in
 * front (the screensaver and watch time ask; the video is not made for it) */
export function pictureRuns(): boolean {
    var v = video;
    return !!v && !!placed && !!now && !now.held && !v.paused && !v.ended && !v.error && v.readyState > 2 && !document.hidden;
}

/** How far the live stream that plays is behind (the test hook), or null */
/** The past broadcast's window in hls.js (the test hook): where the cut it has begins and ends, and the broadcast's
 * end; null: it has all of it */
export function vodWindow(): { from: number; to: number; end: number } | null {
    var w = now && now.window;
    return w ? { from: w.from, to: w.to, end: w.end } : null;
}

export function liveDelay(): Delay | null {
    return now && now.engine && now.engine.liveDelay ? now.engine.liveDelay() : null;
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

/** The video plays, unless p's engine plays it itself later: none started yet (the stream is still resolved; the
 * video still has the last one), or it still stands in the last stream */
function playOn(p: Playback): void {
    if (p.engine && (!p.engine.mayPlay || p.engine.mayPlay())) {
        playVideo(videoElement());
    }
}

/** Claimed again: plays on unless the viewer paused */
function unhold(p: Playback): void {
    if (!p.held) {
        return;
    }
    p.held = false;
    if (!p.paused) {
        playOn(p);
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
            var kept = !p.failed && !p.left && !p.ahead ? { target: { kind: p.target.kind, id: p.target.id, startAt: at, files: p.files || undefined },
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
        clearTimeout(p.keptTimer);
        if (p.engine) {
            p.engine.stop();
        }
        drawVideo();
    }
}

/** Its player closes (Back): a past broadcast that has shown its picture is kept KEPT_MS, paused and out of sight,
 * instead of stopped. Its player opened again claims it (play), and it plays on where it stood, nothing loaded
 * anew. It goes when its time is up, when anything else plays, when focus rests on another tile (ready) and when
 * the app hides. Not a live stream (it would come back that far behind) nor a clip; those stop. */
export function keep(events: SessionEvents): void {
    var p = now;
    if (!p || p.events !== events) {
        return;
    }
    if (p.target.kind !== 'vod' || p.failed || !p.shown) {
        stop();
        return;
    }
    var kept = p;
    // (its screen is gone: it hears no more of it)
    kept.events = {};
    kept.left = true;
    kept.kept = true;
    hold(kept);
    clearTimeout(kept.keptTimer);
    kept.keptTimer = setTimeout(function () {
        if (kept === now && kept.kept) {
            stop();
        }
    }, KEPT_MS) as unknown as number;
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
        var at = Math.max(0, seconds);
        if (outsideWindow(p, at)) {
            rewindow(p, at);
            return;
        }
        if (!p.engine) {
            // Still resolved: the start goes there. The video is not touched: it still stands in the last stream (a
            // kept pipeline's), and a seek there to where nothing comes would be left waiting for the next start
            p.at = at;
            if (!p.shown) {
                p.target.startAt = at;
            }
        } else if (p.engine.seek) {
            p.at = p.engine.seek(at);
        } else {
            p.at = at;
            videoElement().currentTime = at;
        }
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
        playOn(p);
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
    var d = now && now.engine && now.engine.length && now.engine.length() || videoElement().duration;
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
        swaps: p.swaps,
        starts: p.run,
        failed: p.failed
    };
}
