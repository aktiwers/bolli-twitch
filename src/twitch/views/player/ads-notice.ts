// The notice that a commercial break was skipped (Settings, on unless switched off): a short toast once per break
// the player leaves behind, and the two that tell a 1440p's start again for a break (Skipping ads, Ads skipped).

import { load, save } from '../../../core/store.js';

var KEY = 'twitch.player.adsNotice';
var on: boolean | null = null;

export function adsNotice(): boolean {
    if (on === null) {
        on = load<boolean>(KEY) !== false;
    }
    return on;
}

export function setAdsNotice(value: boolean): void {
    on = value;
    save(KEY, value);
}
