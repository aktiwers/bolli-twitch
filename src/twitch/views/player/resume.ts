// Where the viewer stopped in past broadcasts, kept on the TV (the newest KEPT videos): a video opened again starts
// there, and its tiles draw how far it was watched. A video watched to its end (the last END_S) is forgotten, so it
// starts from the beginning next time. The list is parsed once into a lookup and parsed again only when its stored
// text changes (a position kept updates it in place): tiles look it up as they are drawn.

import { loadText, save } from '../../../core/store.js';
import { Video } from '../../api/types.js';

var STORE_KEY = 'twitch.resume';
var KEPT = 100;
/** This close to the end counts as watched */
var END_S = 30;
/** Not worth keeping: the first seconds */
var MIN_S = 10;

/** Video id and seconds, the newest first */
type Kept = [string, number][];

/** The stored text last parsed, its list and a lookup by id */
var text: string | null = null;
var list: Kept = [];
var at: { [id: string]: number } = {};
/** Counts the changes seen: a tile drawn at an older count draws again */
var version = 0;
/** Counts the changes of which videos are kept (one kept or forgotten, not a position moved): rows of what can be
 * continued are built again only then */
var idsVersion = 0;

/** The list as the lookup has it */
function take(next: Kept): void {
    list = next;
    at = {};
    for (var i = list.length - 1; i >= 0; i--) {
        at[list[i][0]] = list[i][1];
    }
}

function kept(): Kept {
    var now = loadText(STORE_KEY);
    if (now !== text) {
        text = now;
        version++;
        idsVersion++;
        var parsed: Kept | null = null;
        try {
            parsed = now ? JSON.parse(now) : null;
        } catch (e) {
            parsed = null;
        }
        take(parsed && parsed.length !== undefined ? parsed : []);
    }
    return list;
}

/** Where the viewer stopped in this video (0: from the start) */
export function resumeAt(id: string): number {
    kept();
    return at.hasOwnProperty(id) ? at[id] : 0;
}

/** The list's version: it changes with every change of the positions kept (read on every focus move over a tile:
 * a number, nothing read from storage) */
export function resumeVersion(): number {
    return version;
}

/** Changes when a video is kept or forgotten (not when a kept position moves) */
export function resumeIdsVersion(): number {
    kept();
    return idsVersion;
}

/** How much of a past broadcast was watched (0 to 1; 0: not started, or watched to its end) */
export function watchedPart(v: Video): number {
    var where = startOf(v);
    var length = v.lengthSeconds;
    return length > 0 && where > 0 && where < length - END_S ? where / length : 0;
}

/** Where a past broadcast opens: where the viewer stopped in it on this TV, else where Twitch says they stopped */
export function startOf(v: Video): number {
    return resumeAt(v.id) || v.position || 0;
}

/** Keeps where the viewer is (length 0: not known) */
export function keepPosition(id: string, seconds: number, length: number): void {
    kept();
    var had = at.hasOwnProperty(id);
    var next = list.filter(function (e) { return e[0] !== id; });
    var done = length > 0 && seconds >= length - END_S;
    var keeps = seconds >= MIN_S && !done;
    if (keeps) {
        next.unshift([id, Math.floor(seconds)]);
    }
    next = next.slice(0, KEPT);
    // (in place: the text written is the one the next look reads, so it is not parsed again)
    text = JSON.stringify(next);
    save(STORE_KEY, next);
    take(next);
    version++;
    // (one kept or forgotten; a new one in a full list also let the oldest go)
    if (had !== keeps) {
        idsVersion++;
    }
}
