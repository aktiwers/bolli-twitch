// Chat shown or hidden in the live player, as the viewer last left it with the chat button: Twitch's TV app keeps
// that choice across runs and opens every live player the same way. Hidden, the video is full width and the chat is
// not joined until the chat button shows it (less work and memory on the TV while nobody reads it).

import { load, save } from '../../../core/store.js';

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
