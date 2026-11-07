// The Media Source engine on hls.js (third_party/hls.js, built into apps/bolli-twitch/hls/). hls.js reads the
// playlists, converts MPEG-TS to fMP4 in its worker (fMP4 segments pass through), measures the line, picks and
// switches qualities and keeps live playback about 2 s behind the newest segment, as Twitch's own player does. On top
// of it:
// - the start: Auto lets hls.js pick from the remembered line speed (its default estimate is that speed times the
//   share a quality may use: bandwidth.ts); a quality the viewer picked is set as it is,
// - the master and the first media playlist from the session's fetches, live playlists through the session's
//   filter (ad segments become gaps),
// - fMP4 segments made of low-latency chunks rewritten as one fragment before hls.js gets them (cmaf.ts: the TV's
//   Media Source fails on the chunks),
// - quality changes that let what is buffered play on (no stall),
// - the pipeline handed from video to video (pipeline.ts); on a taken pipeline the video still stands where the last
//   one stopped, so once the first segment is in it is moved there with one seek (hls.js's own, or ours) and the
//   source gets the new stream's duration, and hls.js's first fatal media error starts the stream again on a fresh
//   pipeline (where the video stood); a stop hides the video, as the kept pipeline still shows the last picture (the
//   session shows it again with the next first picture),
// - a quality picked that is taller than a preview's largest height plays as Auto under it,
// - paused, no loading (live at once; a past broadcast once its buffer is full).

import { aheadOf, Engine, EngineEvents, Failure, hideVideo, playVideo, Source } from './engine.js';
import { HLS_WORKER, HlsInstance, HlsStatic, loadHls, whenWorkerFails, workerFailed, workerRuns } from './hls-loader.js';
import { keepPipeline, releasePipeline, takePipeline, Transfer } from './pipeline.js';
import { bandwidth, fitQuality, noteBandwidth, pickUnder, SHARE } from './bandwidth.js';
import { mergeChunks } from './cmaf.js';
import { whenKeysRest } from './rest.js';

/** Live playback this far behind the end of the newest segment (Twitch's liveSyncDuration) */
var LIVE_SYNC_S = 2;
/** Buffer ahead: past broadcasts (the TV's memory is small), live (bounded by the newest segment anyway) */
var VOD_AHEAD_S = 20;
var LIVE_AHEAD_S = 8;
/** Kept behind the playhead (a short jump back plays at once) */
var VOD_BEHIND_S = 10;
var LIVE_BEHIND_S = 6;
var MAX_BUFFER_BYTES = 30 * 1000 * 1000;
/** The field of hls.js's config the playlist loader reads the session's playlists from (not enumerable: hls.js posts
 * its config to the worker) */
var PLAYLISTS = 'bolliPlaylists';

/** hls.js's warnings and errors on the console (the test hook turns it on) */
var debug = false;

export function setHlsDebug(on: boolean): void {
    debug = on;
}

/** What the playlist loader serves or changes for one hls.js instance */
interface Playlists {
    /** Served for the manifest (once) */
    master: { url: string; text: string } | null;
    /** Served for this media playlist (once) */
    level: { url: string; text: string } | null;
    /** Every media playlist goes through it */
    filter: ((text: string) => string) | null;
}

/** A class around hls.js's own loader: the inner one loads (its stats, context, cache age, abort and destroy are the
 * wrapper's), and load decides what each load does */
function wrapLoader(Hls: HlsStatic, load: (this: any, context: any, config: unknown, callbacks: any) => void): unknown {
    var Base = Hls.DefaultConfig.loader;
    var Wrapper = function (this: any, config: any) {
        this.inner = new Base(config);
        this.lists = config[PLAYLISTS] as Playlists;
    } as any;
    var proto = Wrapper.prototype;
    Object.defineProperty(proto, 'stats', { get: function (this: any) { return this.inner.stats; } });
    Object.defineProperty(proto, 'context', { get: function (this: any) { return this.inner.context; } });
    proto.load = load;
    proto.getCacheAge = function (this: any) {
        return this.inner.getCacheAge ? this.inner.getCacheAge() : null;
    };
    proto.abort = function (this: any) {
        this.inner.abort();
    };
    proto.destroy = function (this: any) {
        this.inner.destroy();
    };
    return Wrapper;
}

/** hls.js's callbacks with the response's data changed before its onSuccess gets it */
function changing(callbacks: any, change: (data: any) => any): { [name: string]: unknown } {
    var wrapped: { [name: string]: unknown } = {};
    for (var name in callbacks) {
        wrapped[name] = callbacks[name];
    }
    wrapped.onSuccess = function (response: any, stats: unknown, ctx: unknown, details: unknown) {
        response.data = change(response.data);
        callbacks.onSuccess(response, stats, ctx, details);
    };
    return wrapped;
}

/** A playlist load: the session's master and first media playlist instead of a fetch (each offered once: the first
 * media playlist only to the first level load, whichever level that asks), media playlists through the filter */
function loadPlaylist(this: any, context: any, config: unknown, callbacks: any): void {
    var lists = this.lists as Playlists;
    var level = context.type === 'level';
    var kept = context.type === 'manifest' ? lists.master : level ? lists.level : null;
    if (level) {
        lists.level = null;
    } else if (kept) {
        lists.master = null;
    }
    var filter = level ? lists.filter : null;
    if (kept && (!level || kept.url === context.url)) {
        serve(this.inner, context, filter ? filter(kept.text) : kept.text, callbacks);
    } else if (filter) {
        this.inner.load(context, config, changing(callbacks, function (data: any) {
            return typeof data === 'string' ? (filter as (text: string) => string)(data) : data;
        }));
    } else {
        this.inner.load(context, config, callbacks);
    }
}

/** Answers a load with text the session fetched already, as hls.js's own loader would */
function serve(inner: any, context: any, text: string, callbacks: any): void {
    var now = performance.now();
    var stats = inner.stats;
    stats.loading.start = stats.loading.first = stats.loading.end = now;
    stats.parsing.start = now;
    stats.loaded = stats.total = text.length;
    inner.context = context;
    setTimeout(function () {
        if (inner.context === context) {
            callbacks.onSuccess({ url: context.url, data: text, code: 200 }, stats, context, null);
        }
    }, 0);
}

/** A segment load: each segment's chunks made one fragment (cmaf.ts); on any doubt, or a throw, the segment as it
 * came */
function loadFragment(this: any, context: any, config: unknown, callbacks: any): void {
    this.inner.load(context, config, changing(callbacks, merged));
}

function merged(data: any): any {
    if (!(data instanceof ArrayBuffer)) {
        return data;
    }
    try {
        return mergeChunks(data);
    } catch (e) {
        return data;
    }
}

/** The two loader classes, made once */
var PlaylistLoader: unknown = null;
var FragmentLoader: unknown = null;

function destroy(hls: HlsInstance): void {
    try {
        hls.destroy();
    } catch (e) {
        // Torn down already
    }
}

export class MseEngine implements Engine {
    readonly keepsPipeline = true;
    private hls: HlsInstance | null = null;
    private events: EngineEvents | null = null;
    private source: Source | null = null;
    /** Our quality index -> hls.js's level index, and back */
    private levelOf: number[] = [];
    private ourOf: number[] = [];
    /** The quality picked (an index in the source's qualities), -1 for Auto */
    private choice = -1;
    /** The largest picture height wanted (0: any) */
    private maxHeight = 0;
    /** Raised by every start and stop: work of an older start is dropped */
    private gen = 0;
    /** Started on a taken pipeline (its first fatal media error starts it again on a fresh one) */
    private taken = false;
    /** The first segment is in (and on a taken pipeline the video moved to it): the picture can move */
    private ready = false;
    /** hls.js measured the line in this playback (only then is its estimate remembered) */
    private measured = false;
    private pausedOn = false;
    private loadStopped = false;
    private onPlaying: (() => void) | null = null;

    constructor(private video: HTMLVideoElement) {
        var self = this;
        whenWorkerFails(function () {
            if (self.events) {
                self.fail({ kind: 'worker', detail: 'the worker failed' });
            }
        });
    }

    start(source: Source, events: EngineEvents, paused?: boolean): void {
        this.halt(false);
        var gen = ++this.gen;
        var self = this;
        // The session's media playlist is served once: a later start of this source (a retry) fetches a fresh one
        var level = source.level || null;
        source.level = undefined;
        this.events = events;
        this.source = source;
        this.levelOf = [];
        this.ourOf = [];
        this.choice = source.quality;
        this.maxHeight = source.maxHeight;
        this.measured = false;
        this.pausedOn = !!paused;
        this.loadStopped = false;
        loadHls().then(function (Hls) {
            if (gen !== self.gen) {
                return undefined;
            }
            if (workerFailed()) {
                self.fail({ kind: 'worker', detail: 'the worker did not start' });
                return undefined;
            }
            return takePipeline().then(function (pipe) {
                if (gen !== self.gen) {
                    // Stopped meanwhile: the pipeline stays for the next start
                    if (pipe) {
                        keepPipeline(self.video, pipe);
                    }
                    return;
                }
                self.open(Hls, source, pipe, level);
            });
        }, function () {
            if (gen === self.gen) {
                self.fail({ kind: 'worker', detail: 'hls.js did not load' });
            }
        });
    }

    private open(Hls: HlsStatic, source: Source, pipe: Transfer | null, level: { url: string; text: string } | null): void {
        var self = this;
        var video = this.video;
        var E = Hls.Events;
        var live = source.kind === 'live';
        this.taken = !!pipe;
        this.ready = !pipe;
        // A clip on the TV's own player may have left it on: a past broadcast must end
        video.loop = false;
        var hls = this.hls = new Hls({
            debug: debug,
            workerPath: HLS_WORKER,
            autoStartLoad: false,
            abrEwmaDefaultEstimate: bandwidth() * SHARE,
            testBandwidth: false,
            capLevelToPlayerSize: this.maxHeight > 0,
            lowLatencyMode: false,
            liveSyncDuration: LIVE_SYNC_S,
            maxBufferLength: live ? LIVE_AHEAD_S : VOD_AHEAD_S,
            maxMaxBufferLength: live ? LIVE_AHEAD_S : VOD_AHEAD_S,
            maxBufferSize: MAX_BUFFER_BYTES,
            backBufferLength: live ? LIVE_BEHIND_S : VOD_BEHIND_S,
            startFragPrefetch: true,
            enableDateRangeMetadataCues: false,
            enableEmsgMetadataCues: false,
            enableID3MetadataCues: false,
            pLoader: PlaylistLoader || (PlaylistLoader = wrapLoader(Hls, loadPlaylist)),
            fLoader: FragmentLoader || (FragmentLoader = wrapLoader(Hls, loadFragment))
        });
        var lists: Playlists = { master: { url: source.url, text: source.master }, level: level, filter: source.filter || null };
        Object.defineProperty(hls.config, PLAYLISTS, { value: lists });
        hls.on(E.MANIFEST_PARSED, function () {
            if (self.hls === hls) {
                self.parsed(hls, source);
            }
        });
        /** A taken pipeline: the newest media playlist's end (s), its duration once the video stands in the stream */
        var end = 0;
        if (pipe) {
            hls.on(E.LEVEL_UPDATED, function (event, data) {
                end = data.details.edge;
            });
        }
        hls.on(E.LEVEL_SWITCHED, function (event, data) {
            var index = self.ourOf[data.level];
            if (self.hls === hls && self.events && index >= 0) {
                self.events.quality(index);
            }
        });
        hls.on(E.FRAG_BUFFERED, function (event, data) {
            if (self.hls === hls && data.frag && data.frag.type === 'main') {
                var first = !self.ready;
                self.buffered(hls, source);
                if (first && pipe) {
                    self.fitDuration(hls, pipe.mediaSource, end);
                }
            }
        });
        hls.on(E.ERROR, function (event, data) {
            if (self.hls === hls) {
                self.error(data);
            }
        });
        hls.on(E.STALL_RESOLVED, function () {
            if (self.hls === hls && self.events) {
                self.events.playing();
            }
        });
        // A taken pipeline's video may say 'playing' before it has anything new: only once the first segment is in
        this.onPlaying = function () {
            if (self.ready && !video.paused && self.events) {
                self.events.playing();
            }
        };
        video.addEventListener('playing', this.onPlaying);
        video.addEventListener('seeked', this.onPlaying);
        hls.attachMedia(pipe ? { media: video, mediaSource: pipe.mediaSource, tracks: pipe.tracks } : video);
        hls.loadSource(source.url);
    }

    /** The master is read: hls.js's levels matched to the session's qualities, a picked quality set, then loading */
    private parsed(hls: HlsInstance, source: Source): void {
        var levels = hls.levels;
        var byUrl: { [url: string]: number } = {};
        for (var l = 0; l < levels.length; l++) {
            byUrl[levels[l].url[0]] = l;
        }
        for (var i = 0; i < source.qualities.length; i++) {
            var level = byUrl[source.qualities[i].url];
            this.levelOf[i] = level >= 0 ? level : -1;
            if (level >= 0) {
                this.ourOf[level] = i;
            }
        }
        var pick = this.pick();
        var picked = pick >= 0 ? this.levelOf[pick] : -1;
        if (picked >= 0) {
            hls.startLevel = picked;
            hls.loadLevel = picked;
        } else {
            // Auto starts at the best quality the line allows: hls.js's own first pick takes only the lowest frame
            // rate (480p30 on Twitch), and a resolution change right after the start can reset the TV's decoder
            var fit = this.levelOf[fitQuality(source.qualities, bandwidth(), this.maxHeight)];
            if (fit >= 0) {
                hls.startLevel = fit;
            }
        }
        // A past broadcast from its start position (0 unless given; never where a taken pipeline's video stands)
        hls.startLoad(source.kind === 'live' ? -1 : source.startAt || 0);
        if (!this.pausedOn) {
            playVideo(this.video);
        }
    }

    private buffered(hls: HlsInstance, source: Source): void {
        noteBandwidth(hls.bandwidthEstimate);
        this.measured = true;
        if (!this.ready) {
            this.ready = true;
            this.toStart(source);
        }
        if (this.pausedOn && !this.loadStopped) {
            this.stopWhenFull(hls);
        }
    }

    /** On a taken pipeline, once the first segment is in: the video to where the new stream starts (the start of
     * what is buffered; a past broadcast's start position when that is in it). hls.js seeks there itself when the
     * video stands before it; otherwise this is the one seek, nudged when the video stands there already (only a
     * seek makes the TV's player drop the old picture) */
    private toStart(source: Source): void {
        var video = this.video;
        var b = video.buffered;
        if (video.seeking || !b.length) {
            return;
        }
        var at = source.startAt || 0;
        var target = source.kind !== 'live' && at >= b.start(0) && at < b.end(0) ? at : b.start(0);
        if (Math.abs(target - video.currentTime) < 0.05) {
            target += 0.05;
        }
        video.currentTime = target;
    }

    /** On a taken pipeline, once the video stands in the new stream (so that no seek moves it): the source's duration
     * made the new stream's. It still has the last stream's, and hls.js only ever raises it (a shorter past broadcast
     * would end early at a seek). Waits while a buffer updates (a duration cannot change then). */
    private fitDuration(hls: HlsInstance, ms: MediaSource, seconds: number): void {
        var self = this;
        if (this.hls !== hls || !(seconds > 0) || ms.readyState !== 'open' || ms.duration === seconds ||
            this.video.currentTime > seconds) {
            return;
        }
        var buffers = ms.sourceBuffers;
        for (var i = 0; i < buffers.length; i++) {
            if (buffers[i].updating) {
                var sb = buffers[i];
                var again = function (): void {
                    sb.removeEventListener('updateend', again);
                    self.fitDuration(hls, ms, seconds);
                };
                sb.addEventListener('updateend', again);
                return;
            }
        }
        try {
            ms.duration = seconds;
        } catch (e) {
            // Data past it is in already: hls.js raises it
        }
    }

    private error(data: { fatal: boolean; type: string; details: string; event?: string }): void {
        if (data.event === 'demuxerWorker') {
            // This build converts segments in the worker only: one that never ran plays nothing here (the session
            // moves a past broadcast on to the TV's own player; live fails); one that ran threw on a segment, which a
            // fresh hls.js instance tries again (hls.js turned the worker off for this one), never the TV's player
            // (it cannot play fMP4 HLS)
            this.fail(workerRuns() ? { kind: 'media', detail: 'worker: ' + data.details } : { kind: 'worker', detail: 'the worker failed' });
            return;
        }
        if (!data.fatal) {
            if (data.details === 'bufferStalledError' && this.events) {
                this.events.stalled('');
            }
            return;
        }
        if (this.taken && data.type === 'mediaError' && this.events && this.source) {
            // A taken pipeline that cannot go on: the same source on a fresh one, a past broadcast from where the
            // video stands (read before the halt: unloading puts it back to 0)
            var events = this.events;
            var source = this.source;
            if (this.ready && source.kind !== 'live') {
                source.startAt = this.video.currentTime;
            }
            events.stalled('fresh pipeline (' + data.details + ')');
            this.halt(true);
            this.start(source, events, this.pausedOn);
            return;
        }
        this.fail({ kind: data.type === 'networkError' ? 'network' : 'media', detail: data.details });
    }

    /** Gives up: the pipeline is not kept (a failed one would spoil the next video) */
    private fail(failure: Failure): void {
        var events = this.events;
        this.halt(true);
        if (events) {
            events.failed(failure);
        }
    }

    setQuality(index: number): void {
        var before = this.pick();
        this.choice = index;
        this.toPick(before);
    }

    setMaxHeight(height: number): void {
        var before = this.pick();
        this.maxHeight = height;
        if (this.hls) {
            // A small video takes a small quality, and climbs once it is full screen again
            this.hls.capLevelToPlayerSize = height > 0;
        }
        this.toPick(before);
    }

    /** The quality picked as it counts under the largest height wanted (-1 Auto) */
    private pick(): number {
        return this.source ? pickUnder(this.source.qualities, this.choice, this.maxHeight) : -1;
    }

    /** hls.js told of the pick when it is not the one it had (before) */
    private toPick(before: number): void {
        var hls = this.hls;
        var pick = this.pick();
        if (!hls || !this.levelOf.length || pick === before) {
            // Not parsed yet (the start sets it), or nothing to change
            return;
        }
        var level = pick >= 0 ? this.levelOf[pick] : -1;
        if (level >= 0) {
            // From the next segment on; what is buffered further ahead is fetched again in the new quality
            hls.nextLevel = level;
        } else {
            // Auto from what plays now on (nothing flushed)
            hls.loadLevel = -1;
        }
    }

    paused(on: boolean): void {
        var hls = this.hls;
        this.pausedOn = on;
        if (!hls) {
            return;
        }
        if (on) {
            this.stopWhenFull(hls);
        } else if (this.loadStopped) {
            this.loadStopped = false;
            hls.startLoad();
        }
    }

    /** Paused: no more loading (live at once: the stream moves on anyway; a past broadcast once its buffer is full) */
    private stopWhenFull(hls: HlsInstance): void {
        var video = this.video;
        var ahead = aheadOf(video);
        if (!this.source || this.source.kind === 'live' || ahead >= VOD_AHEAD_S - 0.5 || video.currentTime + ahead >= video.duration - 0.5) {
            hls.stopLoad();
            this.loadStopped = true;
        }
    }

    current(): number {
        var hls = this.hls;
        var index = hls && hls.currentLevel >= 0 ? this.ourOf[hls.currentLevel] : -1;
        return index >= 0 ? index : -1;
    }

    /** Stops; the pipeline is kept for the next start and its last picture hidden (display: none, which also hides the
     * TV's video plane) */
    stop(): void {
        this.halt(false);
        hideVideo(this.video);
    }

    /** spoilt: the pipeline is let go, not kept */
    private halt(spoilt: boolean): void {
        this.gen++;
        if (this.onPlaying) {
            this.video.removeEventListener('playing', this.onPlaying);
            this.video.removeEventListener('seeked', this.onPlaying);
            this.onPlaying = null;
        }
        this.events = null;
        var hls = this.hls;
        if (!hls) {
            return;
        }
        this.hls = null;
        if (this.measured) {
            noteBandwidth(hls.bandwidthEstimate, true);
        }
        hls.stopLoad();
        var transfer: Transfer | null = null;
        if (!spoilt) {
            try {
                transfer = hls.transferMedia();
            } catch (e) {
                transfer = null;
            }
        }
        if (transfer) {
            keepPipeline(this.video, transfer);
            // The worker is the app's, not the instance's: nothing of the instance is needed any more
            whenKeysRest(destroy.bind(null, hls));
        } else {
            releasePipeline(this.video);
            destroy(hls);
        }
    }
}
