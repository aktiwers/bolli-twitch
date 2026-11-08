// Loads Bolli Twitch's hls.js (apps/bolli-twitch/hls/hls.js, built by tools/twitch_hls.mjs) once, when a playback on
// the Media Source engine starts or is prefetched, so the app's own script stays small; then starts its segment worker
// once and keeps it for the app's run (every hls.js instance shares it, so a stopped one can be destroyed at once).
// Android's WebView starts no worker from a file:// address (the page's own), so there the worker's text is read and
// started from a Blob. Also the part of hls.js's API the engine uses.

import { android } from '../../core/platform.js';

/** One quality as hls.js lists it (its levels are sorted by bitrate, lowest first) */
export interface HlsLevel {
    /** Its media playlist (first) */
    url: string[];
    /** Its media playlist read: the segments, where each begins and how long it is (s) */
    details?: { fragments: { start: number; duration: number }[] };
}

export interface HlsInstance {
    readonly levels: HlsLevel[];
    readonly config: { [name: string]: unknown };
    readonly currentLevel: number;
    nextLevel: number;
    loadLevel: number;
    startLevel: number;
    capLevelToPlayerSize: boolean;
    readonly bandwidthEstimate: number;
    on(event: string, listener: (event: string, data: any) => void): void;
    attachMedia(media: HTMLVideoElement | { media: HTMLVideoElement; mediaSource: MediaSource; tracks: unknown }): void;
    loadSource(url: string): void;
    startLoad(position?: number): void;
    stopLoad(): void;
    transferMedia(): any;
    destroy(): void;
}

export interface HlsStatic {
    new (config: { [name: string]: unknown }): HlsInstance;
    readonly Events: { [name: string]: string };
    readonly DefaultConfig: { loader: any };
    /** hls.js's own worker start (the build puts it on the bundle): the worker for path, shared by every instance
     * whose workerPath is path */
    loadWorker(path: string): { worker: Worker };
}

/** The bundle and its worker, beside index.html */
var HLS_SCRIPT = 'hls/hls.js';
var HLS_WORKER = 'hls/hls-worker.js';
/** The worker's address as started: its file, or on Android a Blob of its text (hls.js's workerPath must be the same) */
var workerUrl = HLS_WORKER;

var loading: Promise<HlsStatic> | null = null;
var workerBroken = false;
/** The worker answered once (it runs) */
var workerRan = false;
var onBroken: (() => void)[] = [];

/** The worker failed: remembered for the app's run, and told */
function broke(): void {
    if (!workerBroken) {
        workerBroken = true;
        for (var i = 0; i < onBroken.length; i++) {
            onBroken[i]();
        }
    }
}

/** Starts the worker for the app's run; a worker that cannot start, or fails before it ever answered (its script did
 * not load or run), is remembered. An error after its first answer is a segment it could not convert: the worker goes
 * on (hls.js tells that error itself). */
function startWorker(Hls: HlsStatic): void {
    try {
        var worker = Hls.loadWorker(workerUrl).worker;
        var answered = function (): void {
            workerRan = true;
            worker.removeEventListener('message', answered);
        };
        worker.addEventListener('message', answered);
        worker.addEventListener('error', function () {
            if (!workerRan) {
                broke();
            }
        });
    } catch (e) {
        broke();
    }
}

/** Calls listener when the worker fails: a script that does not load says so only after the start went on, and
 * hls.js listens only once it converts the first segment */
export function whenWorkerFails(listener: () => void): void {
    onBroken.push(listener);
}

/** hls.js, loaded on first use (a failed load is tried again next time) */
export function loadHls(): Promise<HlsStatic> {
    if (!loading) {
        loading = new Promise<HlsStatic>(function (resolve, reject) {
            var w = window as unknown as { BolliHls?: HlsStatic };
            var script = document.createElement('script');
            script.src = HLS_SCRIPT;
            script.onload = function () {
                var Hls = w.BolliHls;
                if (Hls) {
                    workerSource().then(function () {
                        startWorker(Hls as HlsStatic);
                        resolve(Hls as HlsStatic);
                    });
                } else {
                    loading = null;
                    reject('hls');
                }
            };
            script.onerror = function () {
                loading = null;
                reject('hls');
            };
            document.head.appendChild(script);
        });
    }
    return loading;
}

/** The worker's address for hls.js's workerPath (the one it was started from) */
export function workerPath(): string {
    return workerUrl;
}

/** On Android the worker's text as a Blob's address (workerUrl); settles either way (failing, the worker fails) */
function workerSource(): Promise<void> {
    if (!android()) {
        return Promise.resolve(undefined);
    }
    return new Promise<void>(function (resolve) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', HLS_WORKER);
        xhr.onload = function () {
            // A file:// read says status 0
            if ((xhr.status === 0 || xhr.status === 200) && xhr.responseText) {
                workerUrl = URL.createObjectURL(new Blob([xhr.responseText], { type: 'text/javascript' }));
            }
            resolve(undefined);
        };
        xhr.onerror = function () {
            resolve(undefined);
        };
        xhr.send();
    });
}

/** Whether the worker failed (the session then plays past broadcasts on the TV's own player; live fails) */
export function workerFailed(): boolean {
    return workerBroken;
}

/** The worker answered once: it runs, and an error of its is one segment it could not convert */
export function workerRuns(): boolean {
    return workerRan;
}
