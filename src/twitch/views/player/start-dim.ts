// The overlay at a player's start (Settings, on unless switched off): as in Twitch's TV app a new player opens with
// its overlay, and the shade it lays over the picture, for a moment. Switched off, it opens on a clear picture and
// the first key shows the overlay.

import { load, save } from '../../../core/store.js';

var KEY = 'twitch.player.startDim';
var on: boolean | null = null;

export function startDim(): boolean {
    if (on === null) {
        on = load<boolean>(KEY) !== false;
    }
    return on;
}

/** Players opened after it follow it */
export function setStartDim(value: boolean): void {
    on = value;
    save(KEY, value);
}
