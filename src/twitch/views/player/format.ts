// The player's numbers as Twitch's TV app writes them: full counts with thousands commas (55,255 viewers, 1 view) and
// the live uptime (2:24:04).

import { clock } from '../../../core/time.js';

/** n with commas between the thousands: 1535 is 1,535 */
export function full(n: number): string {
    var s = String(Math.max(0, Math.round(n || 0)));
    var out = '';
    while (s.length > 3) {
        out = ',' + s.slice(-3) + out;
        s = s.slice(0, -3);
    }
    return s + out;
}

/** "55,255 viewers", "1 viewer" */
export function viewers(n: number): string {
    return full(n) + (n === 1 ? ' viewer' : ' viewers');
}

/** "1,535 views", "1 view" */
export function views(n: number): string {
    return full(n) + (n === 1 ? ' view' : ' views');
}

/** How long a broadcast that began at iso has run at now: 2:24:04 ('' when not known) */
export function uptime(iso: string | undefined, now: number): string {
    var began = iso ? Date.parse(iso) : NaN;
    return isNaN(began) ? '' : clock((now - began) / 1000);
}

