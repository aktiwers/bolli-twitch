// What a playback engine does for the session (player/session.ts): the TV's own player and our Media Source engine
// on hls.js both implement it. The session resolves the stream (token, master, qualities, ads) and does what is the
// same for both on the video itself (seek, pause, position, buffer, duration); an engine plays a source.

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

/** Why playback stopped: no broadcast or no such video (offline), refused to this viewer (forbidden), no answer
 * (network), the account's token refused (auth), the picture failed (media), no Media Source worker (worker), a
 * stream the app cannot play (stream) */
export type FailureKind = 'offline' | 'forbidden' | 'network' | 'auth' | 'media' | 'worker' | 'stream';

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
    /** The largest picture height wanted (a preview); 0 for no limit */
    maxHeight: number;
    /** A media playlist the session already fetched (its ad check), handed to hls.js once instead of a fetch */
    level?: { url: string; text: string };
    /** A past broadcast's first segment fetched ahead, handed to hls.js once when it asks for that address */
    segment?: SegmentAhead;
    /** Live streams on the Media Source engine: every media playlist goes through it (ad segments become gaps) */
    filter?: (text: string) => string;
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

export interface Engine {
    /** Whether it keeps the video's Media Source pipeline (the session lets the pipeline go before another starts) */
    readonly keepsPipeline: boolean;
    /** Plays source on the app's one video (stops what this engine played); paused: it loads but does not play (the
     * viewer paused) */
    start(source: Source, events: EngineEvents, paused?: boolean): void;
    /** An index in the source's qualities, -1 for Auto */
    setQuality(index: number): void;
    /** The largest picture height wanted from now on; 0 for no limit */
    setMaxHeight(height: number): void;
    /** The quality playing (an index in the source's qualities; -1 not known yet) */
    current(): number;
    /** The session paused (true) or resumed the video */
    paused(on: boolean): void;
    /** Stops and hides the video (the Media Source engine keeps its pipeline for the next start) */
    stop(): void;
    /** Where a seek to seconds lands (none: there) */
    seekTarget?(seconds: number): number;
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
