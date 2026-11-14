// The Media Source engine on hls.js (third_party/hls.js, built into apps/bolli-twitch/hls/). hls.js reads the
// playlists, converts MPEG-TS to fMP4 in its worker (fMP4 segments pass through), measures the line, picks and
// switches qualities and keeps live playback about 2 s behind the newest segment, as Twitch's own player does. On top
// of it:
// - the start: Auto lets hls.js pick from the remembered line speed (its default estimate is that speed times the
//   share a quality may use: bandwidth.ts); a quality the viewer picked is set as it is,
// - the master and the first media playlist from the session's fetches, live playlists through the session's
//   filter (stitched segments become gaps),
// - fMP4 segments made of low-latency chunks rewritten as one fragment before hls.js gets them (cmaf.ts: the TV's
//   Media Source fails on the chunks),
// - TS segments handed to hls.js's converter in parts (its progressive mode), so the first part is appended while
//   the rest waits: the TV works through all of a first append before its first picture,
// - quality changes that let what is buffered play on (no stall),
// - the pipeline handed from video to video (pipeline.ts); on a taken pipeline the video still stands where the last
//   one stopped, so once its start is in it is moved there with one seek (hls.js's own, or ours) and the
//   source gets the new stream's duration, and hls.js's first fatal media error starts the stream again on a fresh
//   pipeline (where the video stood); a stop hides the video, as the kept pipeline still shows the last picture (the
//   session shows it again with the next first picture),
// - paused, no loading (live at once; a past broadcast once its buffer is full),
// - a past broadcast's start or jump past the buffer takes the segment it lands in as its first bytes and the rest
//   (quickHere: webOS TV 3 and later, the Android app), and tells this TV a short length, so its picture comes at
//   once (TOLD_S, shortHere: webOS only).

import { aheadOf, Delay, Engine, EngineEvents, Failure, Fetched, hideVideo, playVideo, Source } from './engine.js';
import { HlsDetails as Details, HlsInstance, HlsStatic, loadHls, whenWorkerFails, workerFailed, workerPath, workerRuns } from './hls-loader.js';
import { dropPipeline, fits, keepPipeline, releasePipeline, takePipeline, Transfer } from './pipeline.js';
import { bandwidth, noteBandwidth, SHARE, startQuality } from './bandwidth.js';
import { firstGroup, mergeChunks } from './cmaf.js';
import { askInTwo, fetchAhead, InTwo, Loaded, SegmentAhead, TS_PACKET } from './segment.js';
import { whenKeysRest } from './rest.js';
import { android, oldEngine } from '../../core/platform.js';

/** Live playback this far behind the end of the newest segment (Twitch's liveSyncDuration) */
var LIVE_SYNC_S = 2;
/** A live media playlist the session fetched is served to hls.js only this soon after (each second older is a second
 * further behind) */
var LIVE_LEVEL_MS = 1000;
/** Buffer ahead: past broadcasts (the TV's memory is small), live (bounded by the newest segment anyway) */
var VOD_AHEAD_S = 20;
var LIVE_AHEAD_S = 8;
/** Kept behind the playhead (a short jump back plays at once) */
var VOD_BEHIND_S = 10;
var LIVE_BEHIND_S = 6;
var MAX_BUFFER_BYTES = 30 * 1000 * 1000;
/** A TS segment goes to the converter in parts about this big (about 1.8 s of 1080p60: a 10 s past broadcast segment
 * is six); a first append of one part shows its picture after 0.3 s instead of the whole segment's 1.7 s */
var PART_BYTES = 1500 * 1000;
/** A seek lands where it was asked when this much is buffered from there; else where its segment begins */
var SEEK_AHEAD_S = 5;
/** The short length: a past broadcast's start or jump tells this TV's Media Source that the video ends where the
 * segment it lands in ends, under TOLD_S after the landing. A video that ends within 10 s of the playhead shows its
 * picture as soon as the landing's video is in; told the real length, the TV first works through all the video it
 * was fed (1.7 s for a 10 s segment). So a landing at a segment's start goes LAND_IN_S into it (a 10 s segment ends
 * 10 s on), a landing in the buffer needs TOLD_MIN_S of its segment left, what is buffered past the told end goes
 * first (the length cuts it off anyway) and nothing more is loaded meanwhile (an append past the told end raises
 * it). The real length comes back once the picture has moved LIFT_S past the landing, at the earliest LIFT_MS after
 * the seek ended (until then the video's clock runs on a guess: given the real length before a frame shows, the TV
 * waits after all), or within LIFT_END_S of the told end. */
var TOLD_S = 9.95;
var LAND_IN_S = 0.1;
var TOLD_MIN_S = 1.5;
var LIFT_S = 0.25;
var LIFT_MS = 600;
var LIFT_END_S = 0.5;
/** While a short length is told hls.js loads nothing more with this much buffered ahead (s) */
var HELD_AHEAD_S = 1;
/** A jump waits at most this long for its turn (a seek on its way to end: a removal during a seek hangs this TV; then
 * what is buffered past its told end to go); after it, it lands as it is, no short length told */
var CLEAR_WAIT_MS = 1200;
/** Buffered this little past a segment's end is that segment's last sound, not the next segment */
var OVERHANG_S = 0.25;
/** The byte each MPEG-TS packet begins with */
var TS_SYNC = 0x47;
/** The moof of the fragment an fMP4 landing's rest becomes is this long (padded: 600 pictures' and their sound's
 * samples take a third of it), so its first bytes are known before the rest is in */
var REST_MOOF_BYTES = 32768;
/** The field of hls.js's config the playlist loader reads the session's playlists from (not enumerable: hls.js posts
 * its config to the worker) */
var PLAYLISTS = 'bolliPlaylists';

/** hls.js's warnings and errors on the console (the test hook turns it on) */
var debug = false;

export function setHlsDebug(on: boolean): void {
    debug = on;
}

/** Quick landings, and short lengths with them, on or off whatever the device (the tests, the test hook); null: the
 * device decides */
var quickForced: boolean | null = null;
var shortForced: boolean | null = null;

/** on: quick landings; lengths: short lengths too (as on unless given). null: the device's own */
export function setQuick(on: boolean | null, lengths?: boolean): void {
    quickForced = on;
    shortForced = on === null ? null : on && lengths !== false;
}

function webos(): boolean {
    return !!(window as unknown as { PalmSystem?: unknown }).PalmSystem;
}

/** Whether a past broadcast lands quickly here: the segment a start or a jump past the buffer lands in comes as its
 * first bytes and the rest, a start's seek comes with the first part, and the session asks a start's segment as
 * soon as its playlist is in. On webOS TV 3 and later and in the Android app (measured on both); not on webOS TV
 * 1.x-2.x's engine */
export function quickHere(): boolean {
    return quickForced !== null ? quickForced : !oldEngine() && (webos() || !!android());
}

/** Whether quick landings also tell short lengths here (TOLD_S): on webOS's browser from webOS TV 3 on (measured on
 * Chrome 38). Not on Android, whose Media Source shows a landing's picture at once anyway: told a short length it
 * was slower, and what was buffered past the told end went for nothing */
export function shortHere(): boolean {
    return shortForced !== null ? shortForced : webos() && !oldEngine();
}

/** The index of the segment holding seconds (-1: none) */
function segmentIndex(details: Details | null, seconds: number): number {
    var frags = details ? details.fragments : [];
    var lo = 0;
    var hi = frags.length - 1;
    while (lo < hi) {
        var mid = (lo + hi + 1) >> 1;
        if (frags[mid].start <= seconds) {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }
    var frag = frags[lo];
    return frag && frag.start <= seconds && seconds < frag.start + frag.duration ? lo : -1;
}

/** A jump on its way: where it lands, the short length it tells (0: none), whether hls.js's loading was stopped for
 * it and what is buffered past its told end was asked to go, and the end of its wait */
interface Jump {
    at: number;
    told: number;
    stopped: boolean;
    clearing: boolean;
    timer: number;
}

function hundredths(s: number): number {
    return Math.round(s * 100) / 100;
}

/** A playlist's average segment length as its real segments have it: a windowed past broadcast's gap segments stand
 * for hours (master.ts windowed), and hls.js's quality choice, which reads the average, took 68 s for 10 s segments
 * and dropped to 360p */
function realAverage(details: { fragments?: { duration: number; gap?: boolean }[]; averagetargetduration?: number } | null): void {
    var frags = details && details.fragments;
    var total = 0;
    var count = 0;
    for (var i = 0; frags && i < frags.length; i++) {
        if (!frags[i].gap) {
            total += frags[i].duration;
            count++;
        }
    }
    if (details && frags && count && count < frags.length) {
        details.averagetargetduration = total / count;
    }
}

/** What the playlist loader serves or changes for one hls.js instance */
interface Playlists {
    /** Served for the manifest (once) */
    master: { url: string; text: string } | null;
    /** Served for this media playlist (once) */
    level: Fetched | null;
    /** Every media playlist goes through it */
    filter: ((text: string) => string) | null;
    /** Every fetched media playlist may be swapped for another text before the filter (Source.swap) */
    swap: ((url: string, text: string) => Promise<string> | null) | null;
    /** A segment fetched ahead: served instead of a fetch when its address is asked (once) */
    segment: SegmentAhead | null;
    /** The next segment load is a start's or a jump's landing: in two requests (loadInTwo), unless the segment
     * fetched ahead is it */
    landing: boolean;
    /** The declared rate of hls.js's level index (bits a second; 0: unknown): a landing's first request is sized by it */
    rate: ((level: number) => number) | null;
    /** A past broadcast's media playlists as fetched (Source.levels): every load of one is answered from here */
    levels: { [url: string]: string } | null;
    /** Raised when the past broadcast's window moves on (refresh) */
    version: number;
    /** The media playlist last handed to hls.js: its address, the version it was cut at and whether it grows (no end:
     * hls.js asks it again every target duration) */
    handed: { url: string; version: number; open: boolean } | null;
    /** hls.js asked the growing playlist it has again: answered once the window moves on (nothing changed before) */
    held: { answer: () => void } | null;
    /** Told after every media playlist the filter cut (the whole length is known from the first) */
    cut: (() => void) | null;
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
        this.aborted = true;
        if (this.cancel) {
            this.cancel();
        }
        this.inner.abort();
    };
    proto.destroy = function (this: any) {
        if (this.cancel) {
            this.cancel();
        }
        this.inner.destroy();
    };
    return Wrapper;
}

function copied(callbacks: any): { [name: string]: any } {
    var out: { [name: string]: any } = {};
    for (var name in callbacks) {
        out[name] = callbacks[name];
    }
    return out;
}

/** hls.js's callbacks with the response's data changed before its onSuccess gets it */
function changing(callbacks: any, change: (data: any) => any): { [name: string]: any } {
    var wrapped = copied(callbacks);
    wrapped.onSuccess = function (response: any, stats: unknown, ctx: unknown, details: unknown) {
        response.data = change(response.data);
        callbacks.onSuccess(response, stats, ctx, details);
    };
    return wrapped;
}

/** A playlist load: the session's master and first media playlist instead of a fetch (each offered once: the first
 * media playlist only to the first level load, whichever level that asks), media playlists through the filter; a
 * past broadcast's media playlists fetched once (answerLevel) */
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
    var levels = level ? lists.levels : null;
    if (levels) {
        if (kept && kept.url === context.url) {
            levels[context.url] = kept.text;
        }
        if (typeof levels[context.url] === 'string') {
            answerLevel(this, context, levels[context.url], callbacks);
        } else {
            var known = levels;
            this.inner.load(context, config, changing(callbacks, function (data: any): any {
                if (typeof data !== 'string') {
                    return data;
                }
                known[context.url] = data;
                return handOn(lists, context.url, data);
            }));
        }
    } else if (kept && (!level || kept.url === context.url)) {
        serve(this.inner, context, filter ? filter(kept.text) : kept.text, callbacks);
    } else if (filter) {
        var self = this;
        var swap = level ? lists.swap : null;
        var wrapped = copied(callbacks);
        wrapped.onSuccess = function (response: any, stats: unknown, ctx: unknown, details: unknown) {
            var raw = response.data;
            var other = swap && typeof raw === 'string' ? swap(context.url, raw) : null;
            var deliver = function (text: any): void {
                response.data = typeof text === 'string' ? (filter as (text: string) => string)(text) : text;
                callbacks.onSuccess(response, stats, ctx, details);
            };
            if (other) {
                other.then(function (text) {
                    if (!self.aborted) {
                        deliver(text);
                    }
                });
            } else {
                deliver(raw);
            }
        };
        this.inner.load(context, config, wrapped);
    } else {
        this.inner.load(context, config, callbacks);
    }
}

/** A past broadcast's media playlist known already (raw: as fetched), cut by the filter. Asked again while the cut
 * hls.js has grows and the window has not moved since, it is held (no answer, so no timeout either) until the
 * window moves on (refresh) or hls.js lets the request go; a growing playlist answered unchanged would be parsed
 * again for nothing every target duration */
function answerLevel(self: any, context: any, raw: string, callbacks: any): void {
    var lists = self.lists as Playlists;
    var last = lists.handed;
    if (last && last.open && last.url === context.url && last.version === lists.version) {
        var held = {
            answer: function (): void {
                answerLevel(self, context, raw, callbacks);
            }
        };
        lists.held = held;
        self.cancel = function (): void {
            if (lists.held === held) {
                lists.held = null;
            }
        };
        return;
    }
    serve(self.inner, context, handOn(lists, context.url, raw), callbacks);
}

/** A past broadcast's media playlist cut by the filter, noted as handed to hls.js */
function handOn(lists: Playlists, url: string, raw: string): string {
    var text = lists.filter ? lists.filter(raw) : raw;
    lists.handed = { url: url, version: lists.version, open: text.indexOf('#EXT-X-ENDLIST') < 0 };
    if (lists.cut) {
        lists.cut();
    }
    return text;
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
 * came. hls.js's progressive mode takes a segment's data from onProgress (this TV's loader calls it once, with all of
 * it): a TS segment goes there in parts (inParts), anything else whole; loads without it (an init segment) get the
 * data with onSuccess */
function loadFragment(this: any, context: any, config: unknown, callbacks: any): void {
    var self = this;
    var lists = this.lists as Playlists;
    var onProgress = callbacks.onProgress;
    var wrapped = onProgress ? copied(callbacks) : changing(callbacks, merged);
    var ahead = lists.segment;
    var landing = lists.landing;
    if (onProgress) {
        // Offered for the first segment load only: a later load of its address gets fresh data and timings
        lists.segment = null;
        lists.landing = false;
        wrapped.onProgress = function (stats: unknown, ctx: unknown, data: any, details: unknown) {
            var parts = inParts(merged(data));
            for (var i = 0; i < parts.length; i++) {
                onProgress(stats, ctx, parts[i], details);
            }
        };
    }
    if (ahead && ahead.two && onProgress && ahead.url === context.url) {
        loadInTwo(self, context, config, wrapped, callbacks, ahead.two);
        return;
    }
    if (ahead && ahead.data && onProgress && ahead.url === context.url) {
        // hls.js times a load from its start (its abandon check reads it while the data still comes)
        var stats = self.inner.stats;
        stats.loading.start = performance.now();
        var fetch = function (): void {
            if (!self.aborted) {
                stats.loading.start = 0;
                self.inner.load(context, config, wrapped);
            }
        };
        ahead.data.then(function (got: Loaded) {
            if (self.aborted) {
                return;
            }
            if (got.bytes) {
                serveBytes(self.inner, context, got.bytes, got.took, wrapped);
            } else {
                fetch();
            }
        }, fetch);
        return;
    }
    if (landing && onProgress && typeof XMLHttpRequest !== 'undefined') {
        var rate = lists.rate && context.frag ? lists.rate(context.frag.level) : 0;
        loadInTwo(self, context, config, wrapped, callbacks, askInTwo(context.url, rate));
        return;
    }
    this.inner.load(context, config, wrapped);
}

/** A landing's segment in two requests (segment.ts askInTwo; two: asked by the loader now, or ahead by the
 * session), answered as hls.js's own loader would: its first bytes go to hls.js as soon as they are in (a start's or
 * a jump's picture comes with them, half a second before a 10 s segment is all in), the rest when it is. A TS segment's first bytes go on as they are (they end between packets). A chunked fMP4
 * segment's go on as its first group of pictures made one fragment, the rest of the segment as a second one: this
 * TV takes no fragment that begins between keyframes, and hls.js keeps a fragment back until the next one's moof
 * comes, so the second one's first bytes (its moof's size, REST_MOOF_BYTES, and name) go on with the first. An fMP4
 * segment whose first bytes do not hold that goes on whole. A first answer that is all of the segment (a short one,
 * a server without ranges) is the segment. Trouble before anything went on: hls.js's own load instead (its retries);
 * after: told as a timeout, which hls.js answers by loading the segment again (a load error without a status it
 * does not try again: it lowers the quality, or gives up). */
function loadInTwo(self: any, context: any, config: unknown, wrapped: any, callbacks: any, two: InTwo): void {
    var stats = self.inner.stats;
    var over = false;
    var handed = false;
    var ts = false;
    var size = two.size;
    /** An fMP4 segment's first bytes not handed on yet, and whether its first group of pictures was */
    var left: Uint8Array | null = null;
    var early = false;
    var rest: ArrayBuffer | null = null;
    // One asked ahead and all in already is timed as if it had just ended (hls.js measures the line by it)
    var late = two.ended ? performance.now() - two.ended : 0;
    var stop = function (): void {
        over = true;
        two.drop();
    };
    var failed = function (): void {
        if (over) {
            return;
        }
        stop();
        if (handed) {
            callbacks.onTimeout(stats, context, null);
        } else if (!self.aborted) {
            stats.loading.start = 0;
            self.inner.load(context, config, wrapped);
        }
    };
    var finish = function (bytes: number, last: ArrayBuffer): void {
        stats.loading.first = (two.answered || two.asked) + late;
        stats.loading.end = performance.now();
        stats.loaded = stats.total = bytes;
        stop();
        callbacks.onSuccess({ url: context.url, data: last, code: 200 }, stats, context, null);
    };
    /** The rest once the first bytes went on */
    var tail = function (): void {
        if (over || !handed || !rest) {
            return;
        }
        if (ts) {
            var parts = rest.byteLength ? inParts(rest) : [];
            for (var i = 0; i < parts.length; i++) {
                callbacks.onProgress(stats, context, parts[i], null);
            }
        } else {
            var head = left || new Uint8Array(0);
            var joined = new Uint8Array(head.length + rest.byteLength);
            joined.set(head, 0);
            joined.set(new Uint8Array(rest), head.length);
            var second = early ? mergeChunks(joined.buffer, REST_MOOF_BYTES) : merged(joined.buffer);
            if (early && second === joined.buffer) {
                // The rest does not make the fragment its first bytes promised
                failed();
                return;
            }
            callbacks.onProgress(stats, context, early ? second.slice(8) : second, null);
        }
        finish(size + rest.byteLength, rest);
    };
    // hls.js times a load from its start (its abandon check reads it while the data still comes)
    stats.loading.start = two.asked + late;
    self.inner.context = context;
    self.cancel = stop;
    two.first(function (status, bytes) {
        if (over) {
            return;
        }
        if (!bytes || (status !== 200 && status !== 206)) {
            failed();
            return;
        }
        if (status === 200 || bytes.byteLength < size) {
            wrapped.onProgress(stats, context, bytes, null);
            finish(bytes.byteLength, bytes);
            return;
        }
        var u = new Uint8Array(bytes, 0, TS_PACKET + 1);
        ts = u[0] === TS_SYNC && u[TS_PACKET] === TS_SYNC;
        var group = ts ? null : firstGroup(bytes);
        left = ts ? null : group ? group.rest : new Uint8Array(bytes);
        early = !!group;
        handed = true;
        if (ts) {
            callbacks.onProgress(stats, context, bytes, null);
        } else if (group) {
            var first = new Uint8Array(group.part.byteLength + 8);
            first.set(new Uint8Array(group.part), 0);
            first.set([REST_MOOF_BYTES >>> 24, REST_MOOF_BYTES >>> 16 & 255, REST_MOOF_BYTES >>> 8 & 255, REST_MOOF_BYTES & 255, 0x6d, 0x6f, 0x6f, 0x66], group.part.byteLength);
            callbacks.onProgress(stats, context, first.buffer, null);
        }
        tail();
    });
    two.rest(function (status, bytes) {
        if (over) {
            return;
        }
        // (416: the segment ends with the first request's bytes)
        if (status === 416) {
            rest = new ArrayBuffer(0);
        } else if (status === 206 && bytes) {
            rest = bytes;
        } else {
            failed();
            return;
        }
        tail();
    });
}

/** Answers a segment load with data fetched ahead, as hls.js's own loader would: its download's length (took ms) as if
 * it had just ended, so the line estimate is the real one (not the time since it was fetched) */
function serveBytes(inner: any, context: any, bytes: ArrayBuffer, took: number, callbacks: any): void {
    var stats = inner.stats;
    var now = performance.now();
    stats.loading.start = stats.loading.first = now - took;
    stats.loading.end = now;
    stats.loaded = stats.total = bytes.byteLength;
    inner.context = context;
    if (callbacks.onProgress) {
        callbacks.onProgress(stats, context, bytes, null);
    }
    callbacks.onSuccess({ url: context.url, data: bytes, code: 200 }, stats, context, null);
}

/** A TS segment in parts of about PART_BYTES, cut between packets; anything else (fMP4) whole */
export function inParts(data: any): any[] {
    if (!(data instanceof ArrayBuffer) || data.byteLength <= PART_BYTES) {
        return [data];
    }
    var bytes = new Uint8Array(data, 0, Math.min(data.byteLength, TS_PACKET + 1));
    if (bytes[0] !== TS_SYNC || bytes[TS_PACKET] !== TS_SYNC) {
        return [data];
    }
    var count = Math.ceil(data.byteLength / PART_BYTES);
    var size = Math.ceil(data.byteLength / count / TS_PACKET) * TS_PACKET;
    var out: ArrayBuffer[] = [];
    for (var at = 0; at < data.byteLength; at += size) {
        out.push(data.slice(at, Math.min(at + size, data.byteLength)));
    }
    return out;
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
    /** Raised by every start and stop: work of an older start is dropped */
    private gen = 0;
    /** Started on a taken pipeline (its first fatal media error starts it again on a fresh one) */
    private taken = false;
    /** The first segment is in (and on a taken pipeline, or with short lengths, the video moved to it): the picture
     * can move */
    private ready = false;
    /** hls.js's estimate is a measurement of the line in this playback (only then is it remembered) */
    private measured = false;
    private pausedOn = false;
    private loadStopped = false;
    private onPlaying: (() => void) | null = null;
    private onLoadStart: (() => void) | null = null;
    private onTime: (() => void) | null = null;
    private onLength: (() => void) | null = null;
    private onEnded: (() => void) | null = null;
    /** hls.js's event names */
    private names: { [name: string]: string } = {};
    /** Starts and jumps past the buffer land quickly in this playback (quickHere), and tell short lengths (TOLD_S) */
    private quick = false;
    private short = false;
    /** hls.js reads the source's duration from it: the short length while one is told */
    private overrides: { duration?: number } = {};
    /** Where a past broadcast starts (s; LAND_IN_S into its segment with short lengths) */
    private startAt = 0;
    /** The short length told (s; 0: none), where its start or jump landed and when that seek ended (ms; 0: not yet) */
    private told = 0;
    private landing = 0;
    private landedAt = 0;
    /** The short length last lifted (s; 0: none): the video's own until hls.js has raised it */
    private lifted = 0;
    /** A start on a taken pipeline: the short length to tell once the video stands at the start (s; 0: none) */
    private toTell = 0;
    /** The newest media playlist hls.js read, and its level */
    private details: Details | null = null;
    private level = 0;
    /** The pipeline's buffers */
    private buffers: SourceBuffer[] = [];
    private jump: Jump | null = null;
    private lists: Playlists | null = null;
    /** hls.js's own limit of what it loads ahead (s), kept while a short length holds it at HELD_AHEAD_S (0: not) */
    private ownAhead = 0;
    /** A windowed past broadcast's whole length may be the source's duration (Source.whole): on a fresh pipeline at
     * once, on a taken one once the video stands in the new stream (a shorter duration before that would move it) */
    private wholeOn = false;

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
        var segment = source.segment || null;
        source.level = source.segment = undefined;
        this.events = events;
        this.source = source;
        this.levelOf = [];
        this.ourOf = [];
        this.choice = source.quality;
        this.measured = false;
        this.pausedOn = !!paused;
        this.loadStopped = false;
        // (until open() knows the pipeline: a kept one may still hold the last video)
        this.taken = true;
        this.ready = false;
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
                if (pipe && level && !fits(pipe, level.text)) {
                    // The other format: hls.js would open a new source over it and start where the last video stood
                    dropPipeline(pipe);
                    pipe = null;
                }
                try {
                    self.open(Hls, source, pipe, level, segment);
                } catch (e) {
                    self.fail({ kind: 'media', detail: 'hls.js did not start: ' + (e && (e as Error).message) });
                }
            });
        }, function () {
            if (gen === self.gen) {
                self.fail({ kind: 'worker', detail: 'hls.js did not load' });
            }
        });
    }

    private open(Hls: HlsStatic, source: Source, pipe: Transfer | null, level: Fetched | null, segment: SegmentAhead | null): void {
        var self = this;
        var video = this.video;
        var E = Hls.Events;
        var live = source.kind === 'live';
        this.taken = !!pipe;
        this.names = E;
        this.quick = source.kind === 'vod' && quickHere();
        this.short = this.quick && shortHere();
        // (a quick landing's fresh pipeline goes to the start as a taken one's does: once a first part holds it, not
        // when hls.js seeks there with the whole first segment in)
        this.ready = !pipe && !this.quick;
        this.overrides = {};
        this.startAt = (source.startAt || 0) + (this.short ? LAND_IN_S : 0);
        this.told = this.landing = this.landedAt = this.toTell = this.lifted = this.ownAhead = 0;
        this.wholeOn = !pipe;
        this.details = null;
        this.buffers = [];
        // A clip on the TV's own player may have left it on: a past broadcast must end
        video.loop = false;
        var hls = this.hls = new Hls({
            debug: debug,
            workerPath: workerPath(),
            autoStartLoad: false,
            abrEwmaDefaultEstimate: bandwidth() * SHARE,
            testBandwidth: false,
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
        // Segments to the converter as they come (loadFragment hands TS ones in parts); set after construction, as
        // hls.js's own check for it looks for fetch streaming, which is not in this build
        hls.config.progressive = true;
        // A live playlist grown old while hls.js loaded is asked again: hls.js starts behind the newest segment it knows
        var fresh = !live || !level || Date.now() - level.at < LIVE_LEVEL_MS;
        var lists: Playlists = {
            master: { url: source.url, text: source.master }, level: fresh ? level : null, filter: source.filter || null, swap: source.swap || null,
            segment: segment, landing: this.quick,
            rate: function (level: number): number {
                var l = hls.levels && hls.levels[level];
                return l && l.bitrate || 0;
            },
            levels: source.levels || null, version: 0, handed: null, held: null,
            cut: function (): void {
                if (self.hls === hls && !self.told) {
                    self.overrides.duration = self.wholeLength();
                }
            }
        };
        this.lists = lists;
        Object.defineProperty(hls.config, PLAYLISTS, { value: lists });
        hls.on(E.MANIFEST_PARSED, function () {
            if (self.hls === hls) {
                self.parsed(hls, source);
            }
        });
        var first = true;
        hls.on(E.LEVEL_LOADED, function (event, data) {
            realAverage(data.details);
            if (self.hls === hls && first) {
                first = false;
                self.startTold(data.details, !!pipe);
            }
        });
        /** A taken pipeline: the newest media playlist's end (s), its duration once the video stands in the stream */
        var end = 0;
        hls.on(E.LEVEL_UPDATED, function (event, data) {
            end = data.details.edge;
            if (self.hls === hls) {
                self.details = data.details;
                self.level = data.level;
            }
        });
        hls.on(E.BUFFER_CREATED, function (event, data) {
            if (self.hls === hls) {
                self.buffers = [];
                for (var name in data.tracks) {
                    if (data.tracks[name] && data.tracks[name].buffer) {
                        self.buffers.push(data.tracks[name].buffer);
                    }
                }
            }
        });
        hls.on(E.BUFFER_FLUSHED, function () {
            if (self.hls === hls) {
                self.step();
            }
        });
        hls.on(E.LEVEL_SWITCHED, function (event, data) {
            var index = self.ourOf[data.level];
            if (self.hls === hls && self.events && index >= 0) {
                self.events.quality(index);
            }
        });
        // A taken pipeline goes to the start once an appended part holds it (the rest of the segment comes after), or
        // hls.js moves it there itself
        if (!this.ready) {
            hls.on(E.BUFFER_APPENDED, function (event, data) {
                if (self.hls === hls && !self.ready && data.parent === 'main' && (self.seekingIn() || self.toStart(source, false))) {
                    self.ready = true;
                    self.tellStart();
                    self.playWhenTaken();
                }
            });
        }
        var fitted = false;
        hls.on(E.FRAG_BUFFERED, function (event, data) {
            if (self.hls === hls && data.frag && data.frag.type === 'main') {
                self.buffered(hls, source);
                // (a short length told has set it, and its lift raises it to the stream's)
                if (pipe && !fitted) {
                    fitted = true;
                    self.wholeOn = true;
                    if (!self.told) {
                        self.overrides.duration = self.wholeLength();
                        self.fitDuration(hls, pipe.mediaSource, self.whole() || end);
                    }
                }
            }
        });
        // A segment that loads too slowly makes hls.js fall to a low quality and set its estimate to that one's
        // bitrate: a guess, not the line's speed, until the next segment is measured
        hls.on(E.FRAG_LOAD_EMERGENCY_ABORTED, function () {
            if (self.hls === hls) {
                self.measured = false;
            }
        });
        hls.on(E.ERROR, function (event, data) {
            if (self.hls === hls) {
                self.error(data);
            }
        });
        hls.on(E.STALL_RESOLVED, function () {
            if (self.hls === hls && self.events && !video.seeking) {
                self.events.playing();
            }
        });
        // The picture (the session shows the video then): a taken pipeline's video may say 'playing' before it has
        // anything new, so only once the stream's start is in; and never while it seeks (to that start): the TV's video
        // plane still shows the last video's last frame until the seek is done ('seeked' tells it then)
        this.onPlaying = function () {
            if (self.told && !self.landedAt && !video.seeking) {
                self.landedAt = Date.now();
            }
            // (a jump waiting for this seek's end)
            self.step();
            if (self.ready && !video.paused && !video.seeking && self.events) {
                self.events.playing();
            }
        };
        video.addEventListener('playing', this.onPlaying);
        video.addEventListener('seeked', this.onPlaying);
        if (this.short) {
            this.onTime = function () {
                self.mayLift();
            };
            video.addEventListener('timeupdate', this.onTime);
            this.onLength = function () {
                self.step();
            };
            video.addEventListener('durationchange', this.onLength);
            // The video reached a told end before its lift (the page stood still meanwhile): the real length, and on
            this.onEnded = function () {
                if (self.told) {
                    self.lift();
                    if (!self.pausedOn) {
                        playVideo(video);
                    }
                }
            };
            video.addEventListener('ended', this.onEnded);
        }
        // hls.js may put a new source in the video (a reset of its own), which leaves it paused
        this.onLoadStart = function () {
            if (!self.pausedOn) {
                playVideo(video);
            }
        };
        video.addEventListener('loadstart', this.onLoadStart);
        var overrides = this.overrides;
        hls.attachMedia(pipe ? { media: video, mediaSource: pipe.mediaSource, tracks: pipe.tracks, overrides: overrides } :
            this.short || source.whole ? { media: video, overrides: overrides } : video);
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
        var picked = this.choice >= 0 ? this.levelOf[this.choice] : -1;
        if (picked >= 0) {
            hls.startLevel = picked;
            hls.loadLevel = picked;
        } else {
            // Auto starts at the best quality the line allows: hls.js's own first pick takes only the lowest frame
            // rate (480p30 on Twitch), and a resolution change right after the start can reset the TV's decoder
            var fit = this.levelOf[startQuality(source.qualities, -1)];
            if (fit >= 0) {
                hls.startLevel = fit;
            }
        }
        // A past broadcast from its start position (0 unless given; never where a taken pipeline's video stands)
        hls.startLoad(source.kind === 'live' ? -1 : this.startAt);
        if (!this.pausedOn && this.mayPlay()) {
            playVideo(this.video);
        }
    }

    private buffered(hls: HlsInstance, source: Source): void {
        noteBandwidth(hls.bandwidthEstimate);
        this.measured = true;
        if (!this.ready) {
            this.ready = true;
            this.toStart(source, true);
            this.tellStart();
            this.playWhenTaken();
        }
        if (this.pausedOn && !this.loadStopped) {
            this.stopWhenFull(hls);
        }
    }

    /** The segment holding at ends under TOLD_S and at least TOLD_MIN_S after it, before the stream's end: that end,
     * the short length a start or jump landing at at tells (0: none) */
    private toldFor(details: Details | null, at: number): number {
        var i = segmentIndex(details, at);
        if (!details || i < 0 || details.fragments[i].gap) {
            return 0;
        }
        var end = details.fragments[i].start + details.fragments[i].duration;
        return end - at >= TOLD_MIN_S && end - at < TOLD_S && end < this.streamEnd(details) - OVERHANG_S ? end : 0;
    }

    /** A windowed past broadcast's whole length (0: hls.js has all of it) */
    private whole(): number {
        return this.source && this.source.whole ? this.source.whole() : 0;
    }

    /** The source's duration when no short length is told: a windowed past broadcast's whole length once it may be
     * (wholeOn), else hls.js's own (the playlist's end) */
    private wholeLength(): number | undefined {
        return this.wholeOn && this.whole() || undefined;
    }

    /** Where the stream ends: a windowed past broadcast's whole length, else details' end */
    private streamEnd(details: Details | null): number {
        return this.whole() || (details ? details.edge : 0);
    }

    /** A start's short length, decided when its first media playlist is read. A fresh pipeline is told it from the
     * start (hls.js sets it when the source opens, or now: it read this playlist's length before we heard of it, and
     * a source open by then has the real one); a taken one once the video stands at the start (tellStart): its
     * video still stands where the last one stopped, and told a length before that, the browser moves it to that end */
    private startTold(details: Details, taken: boolean): void {
        var end = this.short ? this.toldFor(details, this.startAt) : 0;
        if (!end) {
            return;
        }
        if (taken) {
            this.toTell = end;
        } else {
            this.told = this.overrides.duration = end;
            this.landing = this.startAt;
            this.retell();
        }
        this.hold(true);
    }

    /** A taken pipeline's video stands at the start (or is on its way there): what the last stream left buffered
     * away from the start goes (else the source keeps a duration up to its end and no short length holds: a past
     * broadcast started again elsewhere kept 20 s of video 40 min on), then its short length is told */
    private tellStart(): void {
        this.dropStale();
        var end = this.toTell;
        var at = this.video.currentTime;
        this.toTell = 0;
        if (end && at < end && end - at < TOLD_S) {
            this.tell(end, at);
        } else if (end) {
            this.hold(false);
        }
    }

    /** A past broadcast's buffered ranges that do not hold its start flushed (none on a fresh pipeline) */
    private dropStale(): void {
        var b = this.video.buffered;
        var at = this.startAt;
        if (!this.hls || !this.source || this.source.kind === 'live') {
            return;
        }
        for (var i = 0; i < b.length; i++) {
            if (b.start(i) > at + 1 || b.end(i) < at - 1) {
                this.hls.trigger(this.names.BUFFER_FLUSHING, { startOffset: b.start(i), endOffset: b.end(i) + 1, type: null });
            }
        }
    }

    /** Tells the short length end for a landing at at: hls.js sets it as the source's duration once no buffer
     * updates (it reads its duration override whenever a media playlist is updated) */
    private tell(end: number, at: number): void {
        this.told = this.overrides.duration = end;
        this.landing = at;
        this.landedAt = 0;
        this.hold(true);
        this.retell();
    }

    private retell(): void {
        if (this.hls && this.details) {
            this.hls.trigger(this.names.LEVEL_UPDATED, { details: this.details, level: this.level });
        }
    }

    /** hls.js loads on (false), or nothing more past HELD_AHEAD_S (true: a short length is told). Its limit comes
     * back as it was: hls.js lowers it itself when the TV's buffer was full */
    private hold(on: boolean): void {
        var config = this.hls && this.hls.config;
        if (!config || on === this.ownAhead > 0) {
            return;
        }
        if (on) {
            this.ownAhead = config.maxMaxBufferLength as number;
            config.maxMaxBufferLength = HELD_AHEAD_S;
        } else {
            config.maxMaxBufferLength = this.ownAhead;
            this.ownAhead = 0;
        }
    }

    /** The real length back once the picture has moved where a short length's start or jump landed */
    private mayLift(): void {
        var video = this.video;
        if (!this.told || video.paused || video.seeking) {
            return;
        }
        var t = video.currentTime;
        if (t >= this.told - LIFT_END_S || (this.landedAt && Date.now() - this.landedAt >= LIFT_MS && t >= this.landing + LIFT_S)) {
            this.lift();
        }
    }

    private lift(): void {
        if (!this.told && !this.toTell) {
            return;
        }
        this.lifted = this.told;
        this.told = this.toTell = this.landedAt = 0;
        this.overrides.duration = this.wholeLength();
        this.hold(false);
        this.retell();
    }

    /** The stream's real length while a short one is told, or still is the video's: hls.js raises it after the lift
     * only once no buffer updates, and the video ending there meanwhile is not the stream's end; also while a windowed
     * past broadcast's video has another length than the whole, unless it ended in the last segment of a cut that
     * holds the end (its media may end short of the segments' added lengths: hls.js ends the source there) (0: none) */
    length(): number {
        var d = this.video.duration;
        var whole = this.whole();
        var short = this.told > 0 || (this.lifted > 0 && d <= this.lifted) ||
            (whole > 0 && !(Math.abs(d - whole) < 0.5) && !this.endedAtEnd(d));
        return short ? this.streamEnd(this.details) : 0;
    }

    /** The video ended (at d) within the last segment of a cut handed with the broadcast's end */
    private endedAtEnd(d: number): boolean {
        var handed = this.lists && this.lists.handed;
        var frags = this.details ? this.details.fragments : [];
        var last = frags[frags.length - 1];
        return this.video.ended && !!handed && !handed.open && !!last && d > last.start;
    }

    /** The window moved on: the growing playlist hls.js asked again is answered with the new cut now, or the next
     * time it asks */
    refresh(): void {
        var lists = this.lists;
        if (lists) {
            lists.version++;
            var held = lists.held;
            lists.held = null;
            if (held) {
                held.answer();
            }
        }
    }

    /** On a taken pipeline (and on a fresh one with short lengths), once what is appended holds the new stream's start
     * (whole: the first segment is in): the video to where the new stream starts (the start of what is buffered; a
     * past broadcast's start position when that is in it). hls.js seeks there itself when the video stands before it
     * and the whole first segment is in; otherwise this is the one seek, nudged when the video stands there already
     * (only a seek makes the TV's player drop the old picture). False when it did not move it: nothing buffered yet,
     * or only parts before a past broadcast's start position */
    private toStart(source: Source, whole: boolean): boolean {
        var video = this.video;
        var b = video.buffered;
        if (this.seekingIn() || !b.length) {
            return false;
        }
        var at = this.startAt;
        var vod = source.kind !== 'live';
        if (vod && !whole && at >= b.end(0)) {
            return false;
        }
        var target = vod && at >= b.start(0) && at < b.end(0) ? at : b.start(0);
        if (Math.abs(target - video.currentTime) < 0.05) {
            target += 0.05;
        }
        video.currentTime = target;
        return true;
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
        var hls = this.hls;
        var before = this.choice;
        this.choice = index;
        if (!hls || !this.levelOf.length || index === before) {
            // Not parsed yet (the start sets it), or nothing to change
            return;
        }
        var level = index >= 0 ? this.levelOf[index] : -1;
        if (level >= 0) {
            // From the next segment on; what is buffered further ahead is fetched again in the new quality
            hls.nextLevel = level;
        } else {
            // Auto from what plays now on (nothing flushed)
            hls.loadLevel = -1;
        }
    }

    /** Not on a taken pipeline until the video moves to the new start: until then it stands where the last video
     * stopped, and played there the TV plays on the last video's sound it had decoded (seconds of it) */
    mayPlay(): boolean {
        return !this.taken || this.ready;
    }

    /** A taken pipeline's video moves to the new start now: it plays from here, unless paused */
    private playWhenTaken(): void {
        if (this.taken && !this.pausedOn) {
            playVideo(this.video);
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
        } else if (this.loadStopped && !this.jump) {
            // (a jump on its way starts the loading itself, where it lands; a windowed past broadcast's playlist grows,
            // so hls.js would start one without a position known yet at its end, as live)
            this.loadStopped = false;
            if (this.whole() && this.ready) {
                hls.startLoad(this.video.currentTime);
            } else {
                hls.startLoad();
            }
        }
    }

    /** Paused: no more loading (live at once: the stream moves on anyway; a past broadcast once its buffer is full,
     * or holds all up to a short length's end: nothing more is loaded until the picture moves, while a stop before
     * that would end the request for the rest of the landing's segment) */
    private stopWhenFull(hls: HlsInstance): void {
        var video = this.video;
        var ahead = aheadOf(video);
        var end = video.currentTime + ahead;
        if (!this.source || this.source.kind === 'live' || ahead >= VOD_AHEAD_S - 0.5 ||
            (this.told > 0 && end >= this.told - OVERHANG_S) || end >= (this.length() || video.duration) - 0.5) {
            hls.stopLoad();
            this.loadStopped = true;
        }
    }

    /** Moves the video to seconds, or near it; returns where it lands. With short lengths (TOLD_S) the jump tells
     * one where it can: hls.js's loading stops (a segment on its way would land past the told end), what is
     * buffered past the told end goes, then the seek, the length (told first, a jump back, the playhead past the
     * new length, makes the browser move the video to that end before the seek) and the loading again from the
     * landing; the segment after the told end is fetched meanwhile when the landing needs no fetch itself. Without
     * them a plain seek (seekTarget), whose segment a quick landing takes in two requests when it is not buffered
     * (hls.js loads it next). */
    seek(seconds: number): number {
        var hls = this.hls;
        var video = this.video;
        var waiting = this.jump;
        this.dropJump();
        if (!this.short || !hls || !this.ready || !this.details) {
            var to = this.seekTarget(seconds);
            if (this.quick && this.lists && !this.has(to + OVERHANG_S)) {
                this.lists.landing = true;
            }
            video.currentTime = to;
            return to;
        }
        // A short length still told is in a jump's way (a seek past it would end at it)
        this.lift();
        var at = this.landingFor(seconds);
        var told = this.toldFor(this.details, at);
        var self = this;
        // (a jump still waiting had stopped the loading: this one starts it where it lands)
        var jump: Jump = { at: at, told: told, stopped: told > 0 || (!!waiting && waiting.stopped), clearing: false, timer: 0 };
        this.jump = jump;
        if (told) {
            hls.stopLoad();
            this.loadStopped = true;
            this.hold(true);
        }
        jump.timer = setTimeout(function () {
            if (self.jump === jump) {
                jump.told = 0;
                self.land(jump);
            }
        }, CLEAR_WAIT_MS) as unknown as number;
        this.step();
        return at;
    }

    /** Where a jump to seconds lands with short lengths: there when its segment is buffered from there on and
     * TOLD_MIN_S of it are left; within TOLD_MIN_S of its segment's end, at the next segment's start when that one
     * is buffered; else where its segment begins (it is fetched whole). A segment's start is LAND_IN_S into it. */
    private landingFor(seconds: number): number {
        var frags = (this.details as Details).fragments;
        var i = segmentIndex(this.details, seconds);
        if (i < 0) {
            return seconds;
        }
        var end = frags[i].start + frags[i].duration;
        var next = frags[i + 1];
        if (end - seconds >= TOLD_MIN_S && this.holds(seconds, end)) {
            return Math.max(seconds, frags[i].start + LAND_IN_S);
        }
        if (end - seconds < TOLD_MIN_S && next && this.holds(seconds, next.start + next.duration)) {
            return next.start + LAND_IN_S;
        }
        return frags[i].start + LAND_IN_S;
    }

    /** Whether the video seeks to what is buffered (hls.js's seek to the start, or ours): not a seek a taken pipeline's
     * video was left in, to where the new stream has nothing (it would wait there, and hls.js load for it) */
    private seekingIn(): boolean {
        var video = this.video;
        var t = video.currentTime;
        var b = video.buffered;
        for (var i = 0; video.seeking && i < b.length; i++) {
            if (b.start(i) - OVERHANG_S <= t && t < b.end(i)) {
                return true;
            }
        }
        return false;
    }

    /** Whether the video is buffered at at */
    private has(at: number): boolean {
        var b = this.video.buffered;
        for (var i = 0; i < b.length; i++) {
            if (b.start(i) <= at && b.end(i) > at) {
                return true;
            }
        }
        return false;
    }

    /** Whether the video is buffered from from to to (a segment's end: but for its last sound) */
    private holds(from: number, to: number): boolean {
        var b = this.video.buffered;
        for (var i = 0; i < b.length; i++) {
            if (b.start(i) <= from && b.end(i) >= to - OVERHANG_S) {
                return true;
            }
        }
        return false;
    }

    /** Where the buffers end when that is within OVERHANG_S past end (0: not) */
    private soundEnd(end: number): number {
        var most = 0;
        for (var i = 0; i < this.buffers.length; i++) {
            try {
                var b = this.buffers[i].buffered;
                var last = b.length ? b.end(b.length - 1) : 0;
                if (last > end && last <= end + OVERHANG_S) {
                    most = Math.max(most, last);
                }
            } catch (e) {
                // A buffer no longer its source's
            }
        }
        return most;
    }

    /** Whether something is buffered past end, or a buffer still updates (a removal on its way) */
    private past(end: number): boolean {
        var list = this.buffers;
        for (var i = 0; i < list.length; i++) {
            try {
                var b = list[i].buffered;
                if (list[i].updating || (b.length && b.end(b.length - 1) > end + OVERHANG_S)) {
                    return true;
                }
            } catch (e) {
                // A buffer no longer its source's: nothing of it is in the way
            }
        }
        return false;
    }

    /** A jump's next step, as far as it can go now (called again as the seek before it ends, the buffers are
     * cleared and the length changes) */
    private step(): void {
        var jump = this.jump;
        var hls = this.hls;
        var video = this.video;
        if (!jump || !hls) {
            return;
        }
        // The real length is not back yet (a buffer updated when the last short length was lifted)
        if (video.duration < jump.at + LAND_IN_S && this.details && this.streamEnd(this.details) > jump.at + LAND_IN_S) {
            return;
        }
        if (jump.told && this.past(jump.told)) {
            if (!jump.clearing && !video.seeking) {
                jump.clearing = true;
                hls.trigger(this.names.BUFFER_FLUSHING, { startOffset: jump.told, endOffset: Infinity, type: null });
            }
            return;
        }
        this.land(jump);
    }

    /** The jump's seek, its short length (if it tells one) and the loading from where it lands */
    private land(jump: Jump): void {
        var hls = this.hls;
        var details = this.details;
        this.dropJump();
        if (!hls) {
            return;
        }
        var buffered = jump.told > 0 && this.holds(jump.at, jump.told);
        this.video.currentTime = jump.at;
        if (jump.told) {
            // (with the segment's last sound, which ends just past it: a length told before that would cut it off)
            this.tell(Math.max(jump.told, this.soundEnd(jump.told)), jump.at);
            var after = segmentIndex(details, jump.told + OVERHANG_S);
            var url = buffered && details && after >= 0 && !details.fragments[after].gap ? details.fragments[after].url : '';
            if (url && this.lists) {
                // The landing is buffered: the segment after the told end comes meanwhile, for when the length lifts
                this.lists.segment = fetchAhead(url);
            } else if (!buffered && this.lists) {
                this.lists.landing = true;
            }
        } else {
            this.hold(false);
        }
        if (jump.stopped) {
            this.loadStopped = false;
            hls.startLoad(jump.at);
        }
    }

    private dropJump(): void {
        if (this.jump) {
            clearTimeout(this.jump.timer);
            this.jump = null;
        }
    }

    /** A plain seek: with SEEK_AHEAD_S buffered from it it lands there; else where its segment begins (at most 10 s
     * before): the TV shows a picture once it has about 5 s from the seek on, so a seek late in a segment not loaded
     * yet waited for the next one too (5 s instead of 2) */
    private seekTarget(seconds: number): number {
        var b = this.video.buffered;
        for (var i = 0; i < b.length; i++) {
            if (seconds >= b.start(i) && seconds + SEEK_AHEAD_S <= b.end(i)) {
                return seconds;
            }
        }
        var hls = this.hls;
        var level = hls ? hls.levels[hls.currentLevel >= 0 ? hls.currentLevel : 0] : null;
        var i2 = segmentIndex(level && level.details ? level.details : null, seconds);
        return i2 >= 0 ? ((level as { details: Details }).details).fragments[i2].start : seconds;
    }

    /** The playlist's end and the broadcast as the playlist dates its segments */
    liveDelay(): Delay | null {
        var hls = this.hls;
        if (!hls) {
            return null;
        }
        var date = hls.playingDate;
        return { edge: hundredths(hls.latency), broadcast: date ? hundredths((Date.now() - date.getTime()) / 1000) : -1 };
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
        if (this.onLoadStart) {
            this.video.removeEventListener('loadstart', this.onLoadStart);
            this.onLoadStart = null;
        }
        if (this.onTime) {
            this.video.removeEventListener('timeupdate', this.onTime);
            this.onTime = null;
        }
        if (this.onLength) {
            this.video.removeEventListener('durationchange', this.onLength);
            this.onLength = null;
        }
        if (this.onEnded) {
            this.video.removeEventListener('ended', this.onEnded);
            this.onEnded = null;
        }
        this.dropJump();
        this.told = this.toTell = this.landedAt = this.lifted = 0;
        this.lists = null;
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
