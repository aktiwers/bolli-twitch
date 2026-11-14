// What a playback engine does for the session (player/session.ts): the TV's own player and our Media Source engine
// on hls.js both implement it. The session resolves the stream (token, master, qualities, stitched segments) and does
// what is the same for both on the video itself (seek, pause, position, buffer, duration); an engine plays a source.

import { SegmentAhead } from './segment.js';

/** One quality of a stream (a master playlist's variant) or one file of a clip */
export interface Quality {
    /** As Twitch's menu shows it: 1080p60, 720p60, 480p, 360p, 160p */
    name: string;
    width: number;
    height: number;
    fps: number;
    /** Bits per second (0 for a clip's file) */
    bandwidth: number;
    /** The quality's media playlist, or the clip's file */
    url: string;
    /** The variant's codecs as the master names them (none: not named, or a clip's file) */
    codecs?: string;
}

/** Why playback stopped: no broadcast or no such video (offline), refused to this viewer (forbidden), kept for the
 * channel's subscribers (subonly), no answer (network), the account's token refused (auth), the picture failed
 * (media), no Media Source worker (worker), a stream the app cannot play (stream) */
export type FailureKind = 'offline' | 'forbidden' | 'subonly' | 'network' | 'auth' | 'media' | 'worker' | 'stream';

export interface Failure {
    kind: FailureKind;
    /** For the logs (never a token or an address) */
    detail: string;
}

export interface Source {
    kind: 'live' | 'vod' | 'clip';
    /** The master playlist (live, past broadcast), or the clip's best file */
    url: string;
    /** The master playlist's text ('' for a clip) */
    master: string;
    /** The qualities, best first: the master's variants, or a clip's files */
    qualities: Quality[];
    /** The quality to play (an index in qualities), -1 for Auto */
    quality: number;
    /** Where a past broadcast starts (s) */
    startAt?: number;
    /** A media playlist the session already fetched (its stitched check), handed to hls.js once instead of a fetch */
    level?: Fetched;
    /** A past broadcast's first segment fetched ahead, handed to hls.js once when it asks for that address */
    segment?: SegmentAhead;
    /** Live streams and past broadcasts on the Media Source engine: every media playlist goes through it (live:
     * stitched segments become gaps; a past broadcast: cut to the window around where it plays) */
    filter?: (text: string) => string;
    /** A past broadcast on the Media Source engine: its whole length while the filter hands hls.js a window of it
     * (0: whole) */
    whole?: () => number;
    /** A past broadcast on the Media Source engine: its media playlists as fetched, by address; a later load of one
     * (its window moved on, a new start of this source) takes it from here instead of a fetch */
    levels?: { [url: string]: string };
    /** Live streams on the Media Source engine: a media playlist as fetched (its address and text) goes on as another
     * text the session finds for it (a commercial break left behind), or null for as it is */
    swap?: (url: string, text: string) => Promise<string> | null;
}

export interface EngineEvents {
    /** The picture moves */
    playing(): void;
    /** The playing quality changed (an index in the source's qualities) */
    quality(index: number): void;
    /** The picture waited for data after it had played; action: what the engine did about it ('' nothing) */
    stalled(action: string): void;
    /** It cannot go on */
    failed(failure: Failure): void;
}

/** A playlist's text as fetched, and when (Date.now()) */
export interface Fetched {
    url: string;
    text: string;
    at: number;
}

export interface Engine {
    /** Whether it keeps the video's Media Source pipeline (the session lets the pipeline go before another starts) */
    readonly keepsPipeline: boolean;
    /** Plays source on the app's one video (stops what this engine played); paused: it loads but does not play (the
     * viewer paused) */
    start(source: Source, events: EngineEvents, paused?: boolean): void;
    /** An index in the source's qualities, -1 for Auto */
    setQuality(index: number): void;
    /** The quality playing (an index in the source's qualities; -1 not known yet) */
    current(): number;
    /** The session paused (true) or resumed the video */
    paused(on: boolean): void;
    /** False while the video may not play yet: it still stands in the last stream (a taken pipeline before the new
     * start is in), where the TV would play on the last stream's sound it decoded already. The engine plays it itself
     * once it may (none: always) */
    mayPlay?(): boolean;
    /** Stops and hides the video (the Media Source engine keeps its pipeline for the next start) */
    stop(): void;
    /** Moves the video to seconds or near it, and returns where it lands (none: the session seeks, there) */
    seek?(seconds: number): number;
    /** The stream's real length (s) while the video is told another (0, or none: the video's own is it) */
    length?(): number;
    /** The past broadcast's window moved on (Source.whole): hls.js gets its media playlist again through the filter */
    refresh?(): void;
    /** How far a live stream is behind (the test hook; null when not known) */
    liveDelay?(): Delay | null;
}

/** Seconds a live stream plays behind the end of its playlist and behind the broadcast (-1: not known) */
export interface Delay {
    edge: number;
    broadcast: number;
}

/** Seconds buffered ahead of the video's playhead */
export function aheadOf(video: HTMLVideoElement): number {
    var t = video.currentTime;
    var b = video.buffered;
    for (var i = 0; i < b.length; i++) {
        if (b.start(i) <= t + 0.3 && b.end(i) > t) {
            return b.end(i) - t;
        }
    }
    return 0;
}

/** The video's display before a stopping engine hid it (null: not hidden) */
var hiddenDisplay: string | null = null;

/** Hides the video (a stopped picture must not linger while its unload waits, or under the next stream until its own
 * picture comes); showVideo undoes it */
export function hideVideo(video: HTMLVideoElement): void {
    if (hiddenDisplay === null) {
        hiddenDisplay = video.style.display;
        video.style.display = 'none';
    }
}

/** Shows the video again if a stopping engine hid it (the session does at the next first picture) */
export function showVideo(video: HTMLVideoElement): void {
    if (hiddenDisplay !== null) {
        video.style.display = hiddenDisplay;
        hiddenDisplay = null;
    }
}

/** Plays the video: Chrome 38 returns nothing, newer browsers a promise that rejects when playing is not allowed yet */
export function playVideo(video: HTMLVideoElement): void {
    var p = video.play() as unknown;
    if (p && typeof (p as Promise<void>).then === 'function') {
        (p as Promise<void>).then(null, function () { return undefined; });
    }
}
