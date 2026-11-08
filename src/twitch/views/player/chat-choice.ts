// Chat shown or hidden in the live player, as the viewer last left it with the chat button: Twitch's TV app keeps
// that choice across runs and opens every live player the same way. Hidden, the video is full width and the chat is
// not joined until the chat button shows it (less work and memory on the TV while nobody reads it). Where it shows
// is a Bolli setting: beside the video as in Twitch's app, or over it with the video full width.

import { load, save } from '../../../core/store.js';

/** The stored layout: true when chat shows over the video */
var OVER_KEY = 'twitch.player.chatOver';
var over: boolean | null = null;

/** Whether chat shows over the video (beside it unless switched) */
export function chatOver(): boolean {
    if (over === null) {
        over = load<boolean>(OVER_KEY) === true;
    }
    return over;
}

/** Chat over the video (true) or beside it (Settings); players opened after it follow it */
export function setChatOver(on: boolean): void {
    over = on;
    save(OVER_KEY, on);
}

/** The stored choice: true when chat was last hidden */
var HIDDEN_KEY = 'twitch.player.chatHidden';
/** The choice in memory, read from storage the first time */
var hidden: boolean | null = null;

/** Whether live players open with chat hidden */
export function chatHidden(): boolean {
    if (hidden === null) {
        hidden = load<boolean>(HIDDEN_KEY) === true;
    }
    return hidden;
}

/** The chat button hid (true) or showed chat; players opened after it follow it */
export function setChatHidden(on: boolean): void {
    hidden = on;
    save(HIDDEN_KEY, on);
}
