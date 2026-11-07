// Where the viewer stopped in past broadcasts, kept on the TV (the newest KEPT videos): a video opened again starts
// there. A video watched to its end (the last END_S) is forgotten, so it starts from the beginning next time.

import { load, save } from '../../../core/store.js';

var STORE_KEY = 'twitch.resume';
var KEPT = 100;
/** This close to the end counts as watched */
var END_S = 30;
/** Not worth keeping: the first seconds */
var MIN_S = 10;

/** Video id and seconds, the newest first */
type Kept = [string, number][];

function kept(): Kept {
    var list = load<Kept>(STORE_KEY);
    return list && list.length !== undefined ? list : [];
}

/** Where the viewer stopped in this video (0: from the start) */
export function resumeAt(id: string): number {
    var list = kept();
    for (var i = 0; i < list.length; i++) {
        if (list[i][0] === id) {
            return list[i][1];
        }
    }
    return 0;
}

/** Keeps where the viewer is (length 0: not known) */
export function keepPosition(id: string, seconds: number, length: number): void {
    var list = kept().filter(function (e) { return e[0] !== id; });
    var done = length > 0 && seconds >= length - END_S;
    if (seconds >= MIN_S && !done) {
        list.unshift([id, Math.floor(seconds)]);
    }
    save(STORE_KEY, list.slice(0, KEPT));
}
