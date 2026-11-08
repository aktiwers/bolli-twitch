// A past broadcast's first segment fetched ahead (focus resting on its tile): the Media Source engine takes it when
// hls.js asks for the same address, so a start whose playback could not begin ahead (under a channel page's preview)
// skips that download, about 1 s for 10 s at 1080p60. One at a time: a newer one stops the older one's download and
// lets its bytes go (8-10 MB each).

import { segmentAt } from './master.js';

/** A segment's data (null once a newer one replaced it), and how long its download took (ms: hls.js measures the line
 * by it) */
export interface Loaded {
    bytes: ArrayBuffer | null;
    took: number;
}

export interface SegmentAhead {
    url: string;
    /** Rejects when the fetch fails or a newer one replaced it */
    data: Promise<Loaded>;
}

var TIMEOUT_MS = 20000;
var flying: XMLHttpRequest | null = null;
/** The newest one's data once loaded */
var newest: Loaded | null = null;

/** The segment holding at (s) in the media playlist text fetched from listUrl, fetched now; null past its end */
export function segmentAhead(listUrl: string, text: string, at: number): SegmentAhead | null {
    var segment = segmentAt(text, at);
    if (!segment || !segment.uri) {
        return null;
    }
    var url = /^https?:\/\//.test(segment.uri) ? segment.uri : directory(listUrl) + segment.uri;
    var data = fetchBytes(url);
    // Never taken: no unhandled rejection
    data.then(null, function () { return undefined; });
    return { url: url, data: data };
}

/** The address up to its last slash, as hls.js resolves a relative segment address */
function directory(url: string): string {
    var path = url.split('?')[0];
    return path.slice(0, path.lastIndexOf('/') + 1);
}

function fetchBytes(url: string): Promise<Loaded> {
    if (flying) {
        flying.abort();
    }
    if (newest) {
        newest.bytes = null;
        newest = null;
    }
    var xhr = flying = new XMLHttpRequest();
    var start = performance.now();
    return new Promise<Loaded>(function (resolve, reject) {
        var done = function (): void {
            if (flying === xhr) {
                flying = null;
            }
        };
        xhr.open('GET', url);
        xhr.responseType = 'arraybuffer';
        xhr.timeout = TIMEOUT_MS;
        xhr.onload = function () {
            done();
            if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
                newest = { bytes: xhr.response as ArrayBuffer, took: performance.now() - start };
                resolve(newest);
            } else {
                reject(new Error('status ' + xhr.status));
            }
        };
        xhr.onerror = xhr.ontimeout = xhr.onabort = function () {
            done();
            reject(new Error('not loaded'));
        };
        xhr.send();
    });
}
