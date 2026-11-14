// The line's measured speed, remembered between starts, and the quality it allows. Twitch's player starts every
// stream at 160p and climbs; ours starts at the best quality the remembered speed allows (a fresh install assumes a
// line fast enough for 1080p60, and the Media Source engine steps down within a segment if it is not). The Media
// Source engine measures (hls.js's estimate); the TV's own player cannot be measured, and a stall there lowers only
// its own picks for the app's run (it may stall where hls.js plays on, so hls.js keeps the measured speed).

import { load, save } from '../../core/store.js';
import { Quality } from './engine.js';

var KEY = 'twitch.bandwidth';
/** Bits per second assumed before anything was measured */
var FIRST_GUESS = 12e6;
/** A quality fits when its bandwidth is at most this share of the estimate */
export var SHARE = 0.8;
/** The estimate is written to storage at most this often */
var SAVE_MS = 30 * 1000;

var estimate = 0;
var savedAt = 0;
/** What the TV's own player stalled above in this run (bits per second; 0: nothing) */
var nativeCap = 0;

/** The line's speed in bits per second (remembered, or the first guess) */
export function bandwidth(): number {
    if (!estimate) {
        estimate = load<number>(KEY) || FIRST_GUESS;
    }
    return estimate;
}

/** A new measurement; flush: write it to storage now (a stop) */
export function noteBandwidth(bps: number, flush?: boolean): void {
    if (!(bps > 0) || !isFinite(bps)) {
        return;
    }
    estimate = bps;
    var now = Date.now();
    if (flush || now - savedAt >= SAVE_MS) {
        savedAt = now;
        save(KEY, Math.round(bps));
    }
}

/** The line speed the TV's own player picks by: the remembered one, kept under what it stalled above */
export function nativeBandwidth(): number {
    var bps = bandwidth();
    return nativeCap ? Math.min(bps, nativeCap) : bps;
}

/** The TV's own player stalled above q: its picks stay at q or below for the rest of the app's run (it is never
 * measured, so nothing would raise them again); hls.js's estimate stays as it was */
export function lowerTo(q: Quality): void {
    nativeCap = Math.min(nativeBandwidth(), q.bandwidth / SHARE);
}

/** The best quality the line allows (an index in list, best first): the first whose bandwidth fits, else the
 * lowest */
export function fitQuality(list: Quality[], bps: number): number {
    for (var i = 0; i < list.length; i++) {
        if (list[i].bandwidth <= bps * SHARE) {
            return i;
        }
    }
    return list.length - 1;
}

/** The quality a Media Source start plays first (an index in list): the picked one, in Auto the best the line allows
 * (the engine's own choice, so a playlist or segment fetched for it ahead is the one it asks) */
export function startQuality(list: Quality[], picked: number): number {
    return picked >= 0 ? picked : fitQuality(list, bandwidth());
}
