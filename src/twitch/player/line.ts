// Whether the TV's line answers, for a picture that stands. A probe asks one of Google's connection checks (an empty
// 204, nothing of the viewer's sent), never Twitch's hosts: the browser opens at most 6 connections to a host, and
// during a drop those to the video's servers fill with requests that hang, so a probe there would wait behind them.
// No answer marks the line lost; while a picture stands for it (awaitLine) the probe is asked again on a growing
// wait, one at a time (each that times out leaves the browser trying to connect for minutes, and a pile of those on a
// host delays the probe after the line's return), and its first answer tells the listeners (onLineBack). The
// connection manager's online and offline (core/network.ts) mark it too.

import { getText, HttpError } from '../../core/http.js';
import { onNetwork } from '../../core/network.js';
import { noteStall } from '../../core/perf.js';

/** Taken in turn: spread over nine hosts, each gets few probes that hang through a drop of minutes. Twitch's API host
 * last (any status is an answer): a network that blocks Google's checks still finds the line up (nothing the app
 * waits on long goes there) */
var PROBES = ['https://www.gstatic.com/generate_204', 'https://connectivitycheck.gstatic.com/generate_204',
    'https://clients3.google.com/generate_204', 'https://www.google.com/generate_204', 'https://play.googleapis.com/generate_204',
    'https://clients1.google.com/generate_204', 'https://connectivitycheck.android.com/generate_204', 'https://google.com/generate_204', 'https://gql.twitch.tv/'];
/** A probe waits this long for its answer: a line that holds answers within a second, and one that comes back while
 * the probe waits is seen by the browser's own tries to connect (1 and 3 s after it went), so its return is seen
 * within 2 s, not at the next probe */
var PROBE_WAIT_MS = 3500;
/** While a picture stands for the line it is asked this often (the line's return is seen at most this much later),
 * and after it has stood so long, less often: few probes through a TV left standing offline */
var STANDING_MS = 1000;
var BACKOFF: number[][] = [[60000, 5000], [300000, 30000]];

var turn = 0;
var down = false;
var backs: (() => void)[] = [];
/** The probe on its way (null: none) */
var asking: Promise<boolean> | null = null;
var awaited = false;
var awaitSince = 0;
var awaitTimer = 0;

/** f is called each time the line answers again after a loss */
export function onLineBack(f: () => void): void {
    backs.push(f);
}

/** Asks whether the line answers: true for any answer (an error status too), false for none within PROBE_WAIT_MS. One
 * on its way is not asked twice. An answer marks the line up, none marks it lost. The host that answered is asked
 * again (its connection is warm); the next one only after it gave no answer */
export function probe(): Promise<boolean> {
    if (asking) {
        return asking;
    }
    // (refused, as a host a filter on the network blocks is: while the line counts as up, the next host is asked once
    // before it counts; while it is down, a refusal is the line's)
    var ask = function (again: boolean): Promise<boolean> {
        return getText(PROBES[turn % PROBES.length], PROBE_WAIT_MS).then(function () {
            return true;
        }, function (e: HttpError) {
            if (!!e && e.status > 0) {
                return true;
            }
            turn++;
            return !again && !down && !!e && e.message === 'network error' ? ask(true) : false;
        });
    };
    asking = ask(false).then(function (answered) {
        asking = null;
        if (answered) {
            up();
        } else if (!down) {
            down = true;
            noteStall('line', 'no answer');
        }
        return answered;
    });
    return asking;
}

/** on: a picture stands for the line; the probe is asked until it answers (onLineBack's listeners are then told).
 * Off: it no longer waits (it plays on, or closed) */
export function awaitLine(on: boolean): void {
    if (on === awaited) {
        return;
    }
    awaited = on;
    clearTimeout(awaitTimer);
    awaitTimer = 0;
    if (on) {
        awaitSince = Date.now();
        next();
    }
}

function next(): void {
    var stood = Date.now() - awaitSince;
    var gap = STANDING_MS;
    for (var i = 0; i < BACKOFF.length; i++) {
        if (stood >= BACKOFF[i][0]) {
            gap = BACKOFF[i][1];
        }
    }
    awaitTimer = setTimeout(due, gap) as unknown as number;
}

/** A standing picture's probe is due: asked, or once the one on its way has its answer (one at a time: each that
 * times out leaves the browser trying to connect for minutes) */
function due(): void {
    awaitTimer = 0;
    if (asking) {
        asking.then(function () {
            if (awaited && !awaitTimer) {
                due();
            }
        });
        return;
    }
    next();
    probe();
}

/** The line answers: listeners are told if it was lost or awaited */
function up(): void {
    if (!down && !awaited) {
        return;
    }
    if (down) {
        noteStall('line', 'answers again');
    }
    down = false;
    awaitLine(false);
    for (var i = 0; i < backs.length; i++) {
        backs[i]();
    }
}

// (the TV's word is no answer yet: online asks the probe at once, which tells)
onNetwork(function (online: boolean) {
    if (!online) {
        down = true;
    } else if (down || awaited) {
        probe();
    }
});
