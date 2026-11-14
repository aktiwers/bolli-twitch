// Which rows the Favorites tab shows above Latest Broadcasts (Settings, both on unless switched off): Live Now and
// All Favorites. The tab reads them when it shows (favorites.ts).

import { load, save } from '../../../core/store.js';

var LIVE_KEY = 'twitch.favorites.liveRow';
var ALL_KEY = 'twitch.favorites.allRow';
var live: boolean | null = null;
var all: boolean | null = null;

export function showsLiveRow(): boolean {
    if (live === null) {
        live = load<boolean>(LIVE_KEY) !== false;
    }
    return live;
}

export function showsAllRow(): boolean {
    if (all === null) {
        all = load<boolean>(ALL_KEY) !== false;
    }
    return all;
}

export function setShowsLiveRow(on: boolean): void {
    live = on;
    save(LIVE_KEY, on);
}

export function setShowsAllRow(on: boolean): void {
    all = on;
    save(ALL_KEY, on);
}

/** The values read again from the device (tests) */
export function forgetRowsShown(): void {
    live = null;
    all = null;
}
