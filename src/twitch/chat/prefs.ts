// The live chat's settings as stored, the same for every channel: where the chat shows and how it looks
// (views/player/chat-choice.ts lays it out from them) and how its emotes show (chat/emote-kinds.ts). The live chat
// settings page changes them (views/player/chat-settings.ts).

import { load, save } from '../../core/store.js';

/** The chat's settings, each with its values (the first the default): beside the video its side; over it its
 * position and its height at a side; a strip's style, and the picture beside a strip; its emotes as pictures, as the
 * words typed, left out, or each kind its own way (then the four kinds' settings count) */
export type ChatPref = 'chatSide' | 'chatPosition' | 'chatHeight' | 'chatBottom' | 'chatPicture' | 'chatSize' | 'chatBackground' | 'chatTimes' |
    'chatAvatars' | 'chatFade' | 'chatEmotes' | 'chatEmotesTwitch' | 'chatEmotesChannel' | 'chatEmotesOther' | 'chatEmotesWord';
export type ChatValue = string | number | boolean;
var EMOTES_AS: ChatValue[] = ['pictures', 'text', 'hidden'];
export var CHAT_VALUES: { [name in ChatPref]: ChatValue[] } = {
    chatSide: ['right', 'left', 'bottom', 'top'],
    chatPosition: ['right', 'left', 'bottom', 'custom'],
    chatHeight: ['tall', 'full', 'half'],
    chatBottom: ['ticker', 'band', 'one'],
    chatPicture: ['fit', 'fill'],
    chatSize: ['medium', 'tiny', 'small', 'large'],
    chatBackground: ['panel', 'bubbles', 'none'],
    chatTimes: [false, true],
    chatAvatars: [false, true],
    chatFade: [0, 15, 30, 60],
    chatEmotes: ['pictures', 'text', 'hidden', 'kinds'],
    chatEmotesTwitch: EMOTES_AS,
    chatEmotesChannel: EMOTES_AS,
    chatEmotesOther: EMOTES_AS,
    chatEmotesWord: EMOTES_AS
};
var PREF_KEY = 'twitch.player.';
/** Where third-party emotes' on/off was stored before the emotes had these settings */
var OLD_EMOTES_KEY = 'twitch.chat.thirdPartyEmotes';
var kept: { [name: string]: ChatValue } = {};
var moved = false;

/** A setting's value: the stored one when it is one of its values, else its default */
export function chatPref(name: ChatPref): ChatValue {
    if (!moved) {
        moveOld();
    }
    if (!(name in kept)) {
        var stored = load<ChatValue>(PREF_KEY + name);
        kept[name] = stored !== null && CHAT_VALUES[name].indexOf(stored) >= 0 ? stored : CHAT_VALUES[name][0];
    }
    return kept[name];
}

export function setChatPref(name: ChatPref, value: ChatValue): void {
    kept[name] = value;
    save(PREF_KEY + name, value);
}

/** Third-party emotes stored as switched off become word emotes as text, the other kinds as pictures; once: the old
 * value goes */
function moveOld(): void {
    moved = true;
    if (load<boolean>(OLD_EMOTES_KEY) === false) {
        setChatPref('chatEmotes', 'kinds');
        setChatPref('chatEmotesWord', 'text');
        save(OLD_EMOTES_KEY, null);
    }
}
