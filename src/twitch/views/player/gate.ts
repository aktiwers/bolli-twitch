// Twitch's content gate (its Just one second... prompt): the channels whose gate the viewer passed in this run of
// the app (Twitch asks once per channel), and Bolli's Mature Content Warning setting (on unless switched off in
// Settings, as Twitch's TV app always asks): off, mature content plays at once. Twitch's age, region and account
// restrictions (restricted) always show Twitch's gate, whatever the setting says.

import { load, save } from '../../../core/store.js';

/** The stored setting: true when the warning is switched off */
var SKIP_KEY = 'twitch.player.skipGate';
/** The setting in memory, read from storage the first time */
var skip: boolean | null = null;
var accepted: { [login: string]: boolean } = {};

/** Whether the warning is switched off */
export function skipsGate(): boolean {
    if (skip === null) {
        skip = load<boolean>(SKIP_KEY) === true;
    }
    return skip;
}

/** Switches the warning off (true) or on (Settings); players opened after it follow it */
export function setSkipsGate(on: boolean): void {
    skip = on;
    save(SKIP_KEY, on);
}

/** Whether a channel's gated content plays without the gate: plain mature content whose gate was passed in this run
 * (Start Watching), or with the warning switched off; restricted content never */
export function gatePassed(login: string, restricted: boolean): boolean {
    return !restricted && (skipsGate() || !!accepted[login.toLowerCase()]);
}

/** Start Watching on a channel's gate: its mature content is not asked again in this run */
export function acceptGate(login: string): void {
    accepted[login.toLowerCase()] = true;
}
