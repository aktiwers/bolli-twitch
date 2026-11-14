// Chat's emotes by kind and how each kind shows, as the live chat settings have it (chat/prefs.ts): Twitch's own
// (its global ones such as Kappa and LUL, Prime's, Turbo's), the watched channel's (its subscriber and follower
// emotes), other channels' subscriber emotes, and word emotes (7TV, BetterTTV, FrankerFaceZ: a word that names one).
// Every emote shows one way, or each kind its own: as its picture, as the word that was typed, or left out.

import { has } from './assets.js';
import { ChatPref, chatPref, setChatPref } from './prefs.js';
import { EmoteShow } from './types.js';

export type EmoteKind = 'twitch' | 'channel' | 'other' | 'word';

var KINDS: EmoteKind[] = ['twitch', 'channel', 'other', 'word'];
/** Each kind's own setting, which counts while the emotes go by kind */
var KIND_PREF: { [kind in EmoteKind]: ChatPref } = {
    twitch: 'chatEmotesTwitch', channel: 'chatEmotesChannel', other: 'chatEmotesOther', word: 'chatEmotesWord'
};

/** How a kind shows */
export function emoteShow(kind: EmoteKind): EmoteShow {
    var all = chatPref('chatEmotes');
    return (all === 'kinds' ? chatPref(KIND_PREF[kind]) : all) as EmoteShow;
}

/** How the four kinds show, in one string: another one means the chat's messages are to be drawn again */
export function emoteShows(): string {
    return KINDS.map(emoteShow).join(' ');
}

/** Whether every emote shows as its picture */
export function emotesPlain(): boolean {
    for (var i = 0; i < KINDS.length; i++) {
        if (emoteShow(KINDS[i]) !== 'pictures') {
            return false;
        }
    }
    return true;
}

/** Whether the third-party lists are of use: word emotes show as pictures, or are found to be left out. As text a
 * word stays as it was typed, so no list is asked or looked in */
export function wordEmotes(): boolean {
    return emoteShow('word') !== 'text';
}

/** Whether the emotes a chat line places show in more than one way, so that their kinds have to be told apart */
export function kindsDiffer(): boolean {
    var twitch = emoteShow('twitch');
    return emoteShow('channel') !== twitch || emoteShow('other') !== twitch;
}

/** One kind shown another way, the others as they show now: one choice for every emote when that is the same for all
 * four, else each kind its own */
export function setEmoteShow(kind: EmoteKind, as: EmoteShow): void {
    var shows = KINDS.map(function (k) { return k === kind ? as : emoteShow(k); });
    var same = shows.every(function (s) { return s === as; });
    setChatPref('chatEmotes', same ? as : 'kinds');
    for (var i = 0; !same && i < KINDS.length; i++) {
        setChatPref(KIND_PREF[KINDS[i]], shows[i]);
    }
}

/** A channel's emote is named by the channel's prefix (small letters and digits) and then a capital or a digit: every
 * one of 2800 subscriber and follower emotes of 59 large channels was. Of Twitch's 310 global emotes only those in
 * GLOBAL_LIKE are named so too; Prime's, Turbo's and the like start with a capital */
var CHANNEL_NAME = /^[0-9]*[a-z][a-z0-9]*[A-Z0-9]/;
var GLOBAL_LIKE = {
    imGlitch: 1, pastaThat: 1, copyThis: 1, cmonBruh: 1, twitchRaid: 1, bleedPurple: 1, duDudu: 1, riPepperonis: 1, mcaT: 1, panicBasket: 1
};

/** The kind of an emote a chat line places, from its id and name. own: the ids of the watched channel's own emotes
 * (null: not known, so every emote counts as Twitch's). The channel's by its id (one changed with channel points,
 * id_XX, by the id it was made from); another channel's by its name; the rest Twitch's */
export function twitchKind(id: string, name: string, own: object | null): EmoteKind {
    if (!own) {
        return 'twitch';
    }
    if (has(own, id) || id.charAt(id.length - 3) === '_' && has(own, id.slice(0, -3))) {
        return 'channel';
    }
    return CHANNEL_NAME.test(name) && !has(GLOBAL_LIKE, name) ? 'other' : 'twitch';
}
