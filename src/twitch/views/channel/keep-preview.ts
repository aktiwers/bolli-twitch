// The channel page's preview while focus is in the rows (Settings, off unless switched on): as in Twitch's TV app the
// shrinking header covers it and only its sound goes on; switched on, it moves up beside the shrunk header and stays
// in view (channel.ts, preview.ts).

import { load, save } from '../../../core/store.js';

var KEY = 'twitch.channel.keepPreview';
var on: boolean | null = null;

export function keepPreview(): boolean {
    if (on === null) {
        on = load<boolean>(KEY) === true;
    }
    return on;
}

/** Channel pages follow it from their next move between the header and the rows */
export function setKeepPreview(value: boolean): void {
    on = value;
    save(KEY, value);
}
