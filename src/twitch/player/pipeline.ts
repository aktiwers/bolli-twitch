// The Media Source pipeline (a MediaSource on the app's video with its video and audio buffers), kept from one video
// to the next: tearing one down and building the next blocks the TV's slow CPU. A stopping Media Source engine leaves
// it here, paused and emptied; the next one takes it over (hls.js's transferMedia). Another use of the video (the TV's
// own player, a clip), leaving the player or the app going to the background lets it go.

import { unloadVideo } from '../../player/video.js';

/** What hls.js's transferMedia hands over: the source and its buffers per track ({ buffer: SourceBuffer, ... }) */
export interface Transfer {
    media: HTMLVideoElement;
    mediaSource: MediaSource;
    tracks: { [track: string]: { buffer?: SourceBuffer } };
}

/** Fallback wait for a buffer that removes data without telling (removed from its source mid-update) */
var SETTLED_POLL_MS = 250;

var kept: Transfer | null = null;
/** The video's source address while it shows the kept pipeline (an object URL of its MediaSource) */
var url = '';
var emptied: Promise<void> = Promise.resolve();
var watching = false;

/** For inspection (the test hook's state): pipelines kept, taken over and let go */
export var pipelineStats = { kept: 0, taken: 0, released: 0 };

/** Still the video's own and not failed */
function usable(t: Transfer): boolean {
    return t.mediaSource.readyState !== 'closed' && t.media.getAttribute('src') === url && !t.media.error;
}

function buffersOf(t: Transfer): SourceBuffer[] {
    var out: SourceBuffer[] = [];
    for (var name in t.tracks) {
        var sb = t.tracks[name].buffer;
        if (sb) {
            out.push(sb);
        }
    }
    return out;
}

/** Resolves once sb is not updating */
function settled(sb: SourceBuffer): Promise<void> {
    return new Promise<void>(function (resolve) {
        if (!sb.updating) {
            resolve(undefined);
            return;
        }
        var poll = 0;
        var done = function (): void {
            if (sb.updating) {
                return;
            }
            sb.removeEventListener('updateend', done);
            clearInterval(poll);
            resolve(undefined);
        };
        sb.addEventListener('updateend', done);
        poll = setInterval(done, SETTLED_POLL_MS) as unknown as number;
    });
}

/** Empties a buffer: stops an append, removes all it holds, resets its parser (a remove reopens an ended source) */
function empty(source: MediaSource, sb: SourceBuffer): Promise<void> {
    if (sb.updating && source.readyState === 'open') {
        try {
            sb.abort();
        } catch (e) {
            // A remove under way: waited for
        }
    }
    return settled(sb).then(function () {
        var b = sb.buffered;
        if (b.length) {
            sb.remove(0, b.end(b.length - 1) + 1);
        }
        return settled(sb);
    }).then(function () {
        if (source.readyState === 'open') {
            sb.abort();
        }
    });
}

/** A page in the background keeps no pipeline (the TV wants its decoder back) */
function watchVisibility(): void {
    if (!watching) {
        watching = true;
        document.addEventListener('visibilitychange', function () {
            if (document.hidden && kept) {
                releasePipeline(kept.media);
            }
        });
    }
}

/** Keeps a stopped engine's pipeline (t from hls.js's transferMedia; null: none) for the next engine: paused, emptied */
export function keepPipeline(video: HTMLVideoElement, t: Transfer | null): void {
    video.pause();
    if (!t || !t.mediaSource || t.mediaSource.readyState === 'closed' || video.error) {
        releasePipeline(video);
        var src = video.getAttribute('src') || '';
        if (t && src.indexOf('blob:') === 0) {
            // hls.js left its source's object URL in the video for the transfer: nothing else lets it go
            URL.revokeObjectURL(src);
            unloadVideo(video);
        }
        return;
    }
    watchVisibility();
    kept = t;
    url = video.getAttribute('src') || '';
    pipelineStats.kept++;
    emptied = Promise.all(buffersOf(t).map(function (sb) { return empty(t.mediaSource, sb); })).then(function () {
        return undefined;
    }, function () {
        // A buffer that cannot be emptied: the next engine opens a fresh pipeline
        if (kept === t) {
            releasePipeline(video);
        }
    });
}

/** The kept pipeline once it is emptied, taken over (null: none, or no longer usable) */
export function takePipeline(): Promise<Transfer | null> {
    return emptied.then(function () {
        var t = kept;
        if (!t) {
            return null;
        }
        if (!usable(t)) {
            releasePipeline(t.media);
            return null;
        }
        kept = null;
        url = '';
        pipelineStats.taken++;
        return t;
    });
}

/** Lets the kept pipeline go; replaced: a new source goes into the video right after (one reset, not two) */
export function releasePipeline(video: HTMLVideoElement, replaced?: boolean): void {
    var t = kept;
    kept = null;
    emptied = Promise.resolve();
    if (t) {
        pipelineStats.released++;
        if (!replaced && video.getAttribute('src') === url) {
            unloadVideo(video);
        }
        // The object URL hls.js made for the source: nothing else frees it once the pipeline was handed over
        URL.revokeObjectURL(url);
    }
    url = '';
}
