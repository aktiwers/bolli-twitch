// A past broadcast's segment fetched ahead of hls.js's own request for it (a start's first one, as soon as its
// playlist is known or focus rests on its tile; the one after a jump's told end): the Media Source engine takes it
// when hls.js asks for the same address. One at a time of each kind: a newer one stops the older one's download and
// lets its bytes go (8-10 MB each), unless the engine took it already (what plays keeps its segment while focus
// rests on another tile). A landing's segment (where a start or jump shows its first picture) is asked in
// two requests (askInTwo): its first bytes bring the picture half a second before the whole segment is in (on a
// 40 Mbit/s line a second and a half).

import { segmentAt } from './master.js';

/** A segment's data (null once a newer one replaced it), and how long its download took (ms: hls.js measures the line
 * by it) */
export interface Loaded {
    bytes: ArrayBuffer | null;
    took: number;
}

export interface SegmentAhead {
    url: string;
    /** Fetched whole: rejects when the fetch fails or a newer one replaced it */
    data?: Promise<Loaded>;
    /** Asked in two requests instead */
    two?: InTwo;
}

/** What one of a segment's two requests brought: its status (0: no answer) and bytes */
export type Answer = (status: number, bytes: ArrayBuffer | null) => void;

/** A segment asked in two requests: its first size bytes and the rest */
export interface InTwo {
    url: string;
    size: number;
    /** When it was asked, when the first answer began and when the last one was in (performance.now(); 0: not yet) */
    asked: number;
    answered: number;
    ended: number;
    /** A loader listens to it: it is that loader's to let go */
    taken: boolean;
    /** done hears the first request's answer, and the rest's: at once when it is in already (one listener each).
     * The rest is not asked when the first answer is all of the segment (a short one, a server without ranges) */
    first(done: Answer): void;
    rest(done: Answer): void;
    /** Both requests, and what they brought, let go */
    drop(): void;
}

/** MPEG-TS packets' size */
export var TS_PACKET = 188;
/** A landing's first request asks FIRST_BYTES (whole TS packets, one part for hls.js's converter: about 1.5 s of
 * 1080p60), or of an fMP4 segment (by its address) FIRST_FMP4_BYTES (its first group of pictures, 2 s, and the chunk
 * after it). Those fit 1080p60's 8-10 MB segments; a quality with a lower declared rate has smaller ones (720p60:
 * 4 MB), of which they are most, so it is asked FIRST_S or FIRST_FMP4_S seconds at its rate instead when that is
 * less, and never under FIRST_MIN_BYTES */
var FIRST_BYTES = 7978 * TS_PACKET;
var FIRST_FMP4_BYTES = 3 * 1024 * 1024;
var FIRST_S = 2;
var FIRST_FMP4_S = 4;
var FIRST_MIN_BYTES = 256 * 1024;
var FMP4_ADDRESS = /\.mp4(\?|$)/;

/** How many bytes a landing's first request asks of a segment of a quality declared at bps bits a second (0 or
 * none: unknown, as 1080p60) */
export function firstBytes(fmp4: boolean, bps?: number): number {
    var most = fmp4 ? FIRST_FMP4_BYTES : FIRST_BYTES;
    if (!bps || !(bps > 0)) {
        return most;
    }
    var bytes = Math.max(FIRST_MIN_BYTES, Math.min(most, bps / 8 * (fmp4 ? FIRST_FMP4_S : FIRST_S)));
    return fmp4 ? Math.round(bytes) : Math.floor(bytes / TS_PACKET) * TS_PACKET;
}

var TIMEOUT_MS = 20000;
var flying: XMLHttpRequest | null = null;
/** The newest one's data once loaded */
var newest: Loaded | null = null;

/** The segment holding at (s) in the media playlist text fetched from listUrl, fetched now (inTwo: as a landing, in
 * two requests, the first sized for a quality declared at bps bits a second); null past its end */
export function segmentAhead(listUrl: string, text: string, at: number, inTwo?: boolean, bps?: number): SegmentAhead | null {
    var segment = segmentAt(text, at);
    if (!segment || !segment.uri) {
        return null;
    }
    var url = /^https?:\/\//.test(segment.uri) ? segment.uri : directory(listUrl) + segment.uri;
    if (!inTwo) {
        return fetchAhead(url);
    }
    // (one a loader took is what plays: its rest still comes)
    if (landing && !landing.taken) {
        landing.drop();
    }
    landing = askInTwo(url, bps);
    return { url: url, two: landing };
}

/** The newest landing asked ahead */
var landing: InTwo | null = null;

/** One request for a range of url's bytes (none: all); answering hears when its answer begins, done its status
 * (0: no answer) and what came */
function ranged(url: string, range: string, answering: () => void, done: Answer): XMLHttpRequest {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.timeout = TIMEOUT_MS;
    xhr.setRequestHeader('Range', range);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 2) {
            answering();
        }
    };
    xhr.onload = function () {
        done(xhr.status, xhr.response as ArrayBuffer | null);
    };
    xhr.onerror = xhr.ontimeout = function () {
        done(0, null);
    };
    xhr.send();
    return xhr;
}

/** The segment at url asked in two requests now, the first sized for its quality's declared rate (bps; firstBytes).
 * A TS segment's at once (its 1.5 MB are in before the rest's connection is up); an fMP4 segment's rest once its
 * first bytes are in: beside them it took most of the line (3 MB came after 1 s, later than the 6 MB after them) */
export function askInTwo(url: string, bps?: number): InTwo {
    var fmp4 = FMP4_ADDRESS.test(url);
    var size = firstBytes(fmp4, bps);
    /** Per request: its answer once in, and who hears it */
    var got: ({ status: number; bytes: ArrayBuffer | null } | null)[] = [null, null];
    var hears: (Answer | null)[] = [null, null];
    var a: XMLHttpRequest | null = null;
    var b: XMLHttpRequest | null = null;
    var dropped = false;
    var answer = function (which: number, status: number, bytes: ArrayBuffer | null): void {
        if (dropped) {
            return;
        }
        got[which] = { status: status, bytes: bytes };
        var whole = which === 0 && (status !== 206 || !bytes || bytes.byteLength < size);
        if (which === 1 || whole) {
            two.ended = performance.now();
        }
        if (which === 0 && !whole && !b) {
            askRest();
        } else if (which === 0 && whole && b) {
            b.abort();
        }
        var done = hears[which];
        if (done) {
            done(status, bytes);
        }
    };
    var answering = function (): void {
        two.answered = two.answered || performance.now();
    };
    var askRest = function (): void {
        b = ranged(url, 'bytes=' + size + '-', answering, function (status, bytes) {
            answer(1, status, bytes);
        });
    };
    var listen = function (which: number, done: Answer): void {
        if (dropped) {
            // Let go before it was taken (a newer one came): no answer
            done(0, null);
            return;
        }
        two.taken = true;
        hears[which] = done;
        var had = got[which];
        if (had) {
            done(had.status, had.bytes);
        }
    };
    var two: InTwo = {
        url: url, size: size, asked: performance.now(), answered: 0, ended: 0, taken: false,
        first: function (done: Answer): void {
            listen(0, done);
        },
        rest: function (done: Answer): void {
            listen(1, done);
        },
        drop: function (): void {
            if (dropped) {
                return;
            }
            dropped = true;
            var waiting = hears;
            var had = got;
            got = [null, null];
            hears = [null, null];
            if (a) {
                a.abort();
            }
            if (b) {
                b.abort();
            }
            // Who still waits for an answer hears there is none
            for (var which = 0; which < 2; which++) {
                var done = waiting[which];
                if (done && !had[which]) {
                    done(0, null);
                }
            }
        }
    };
    a = ranged(url, 'bytes=0-' + (size - 1), answering, function (status, bytes) {
        answer(0, status, bytes);
    });
    if (!fmp4) {
        askRest();
    }
    return two;
}

/** The segment at url, fetched now */
export function fetchAhead(url: string): SegmentAhead {
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
