// Third-party emotes in chat (Settings, on unless switched off): the 7TV, BetterTTV and FrankerFaceZ emotes that
// viewers with those browser extensions see, a word that names one drawn as its picture. Twitch's TV app has none;
// Twitch's own emotes, placed by the chat line, go first, then the channel's (7TV's before BetterTTV's before
// FrankerFaceZ's), then the global ones. The lists are stored (the global one under its key, the CHANNELS_KEPT
// channels opened last in as many slots, an index of those). Each service in a list is asked again on its own:
// REFRESH_MS after it answered, RETRY_MS after it failed, keeping its emotes from before meanwhile; its emotes are
// used as soon as it answers. Animated emotes come as their still picture, as Twitch's own are drawn here (animating
// costs the TV's CPU every frame, and BetterTTV's animations run to megabytes), each at its own width so a row's
// layout is known before its pictures load; a 7TV zero-width emote goes over the emote before it.

import { getJson, postJson } from '../../core/http.js';
import { load, save } from '../../core/store.js';
import { gql } from '../api/gql.js';
import { has, isObject } from './assets.js';
import { ChatEmote, EmoteFinder } from './types.js';

/** A service's emotes are asked again this long after it answered (the stored ones are used meanwhile), or after it
 * failed */
var REFRESH_MS = 6 * 3600 * 1000;
var RETRY_MS = 30 * 60 * 1000;
var CHANNELS_KEPT = 8;
var SETTING_KEY = 'twitch.chat.thirdPartyEmotes';
var INDEX_KEY = 'twitch.emotes';
var GLOBAL_KEY = 'twitch.emotes.global';
var SLOT_KEY = 'twitch.emotes.';
/** Wider emotes are drawn this wide at most (width over height) */
var MAX_RATIO = 4;

var SEVEN_TV = 'https://7tv.io/v4/gql';
var BTTV = 'https://api.betterttv.net/3/cached/';
var FFZ = 'https://api.frankerfacez.com/v1/';
var SEVEN_TV_ITEMS = 'emotes(perPage: 3000, page: $page) { pageCount items { alias flags { zeroWidth } emote { id flags { animated } ' +
    'aspectRatio } } }';
var SEVEN_TV_USER = 'query($id: String!, $page: Int) { users { userByConnection(platform: TWITCH, platformId: $id) { style { ' +
    'activeEmoteSet { ' + SEVEN_TV_ITEMS + ' } } } } }';
var SEVEN_TV_GLOBAL = 'query($page: Int) { emoteSets { global { ' + SEVEN_TV_ITEMS + ' } } }';
/** A 7TV set's pages read at most (a page holds 3000; sets hold up to their capacity, 1000 for most) */
var SEVEN_TV_PAGES = 4;

/** A picture's address by its kind (the letter an emote is kept with): 7TV's (s, S animated) and BetterTTV's (b, B
 * animated) at 2x as WebP, an animated one's still picture; FrankerFaceZ's (f at 2x, g at 1x where it has no 2x) */
var PICTURES: { [kind: string]: (id: string) => string } = {
    s: function (id) { return 'https://cdn.7tv.app/emote/' + id + '/2x.webp'; },
    S: function (id) { return 'https://cdn.7tv.app/emote/' + id + '/2x_static.webp'; },
    b: function (id) { return 'https://cdn.betterttv.net/emote/' + id + '/2x.webp'; },
    B: function (id) { return 'https://cdn.betterttv.net/emote/' + id + '/static/2x.webp'; },
    f: function (id) { return 'https://cdn.frankerfacez.com/emote/' + id + '/2'; },
    g: function (id) { return 'https://cdn.frankerfacez.com/emote/' + id + '/1'; }
};
/** The services in order of precedence, by the kinds their emotes are kept with */
var SERVICES = ['sS', 'bB', 'fg'];

/** The services in order of precedence, by the kinds their emotes are kept with */
var SERVICES = ['sS', 'bB', 'fg'];

/** An emote as kept, one string: its kind, its id, then |ratio (width over height) when not square or drawn over,
 * and |o when drawn over the emote before it */
type Kept = string;
type Emotes = { [name: string]: Kept };

interface List {
    /** When each service (in SERVICES' order) is to be asked again */
    due: number[];
    /** The channel it is ('' for the global list) */
    login: string;
    emotes: Emotes;
}

/** A kept channel: when it was last opened, its Twitch user id and the slot its list is stored in */
interface Entry {
    at: number;
    id: string;
    slot: number;
}

interface Index {
    channels: { [login: string]: Entry };
}

var on: boolean | null = null;
var index: Index | null = null;
/** The global list (undefined: not read yet) */
var global: List | null | undefined;
// Maps keyed by logins or emote names have no prototype: a name such as "constructor" finds nothing of Object's
/** The channel whose list is in memory (one at a time: the others wait in storage), and its list */
var current = '';
var currentList: List | null = null;
/** The emotes found so far in current's chat, each made once; a word that names none is looked up again (chat's
 * words are endless). Forgotten whenever a list in use changes */
var made: { [name: string]: ChatEmote } = Object.create(null);
var asking: { [login: string]: Promise<void> } = Object.create(null);
var askingGlobal: Promise<void> | null = null;

/** The setting: on unless switched off */
export function thirdPartyEmotes(): boolean {
    if (on === null) {
        on = load<boolean>(SETTING_KEY) !== false;
    }
    return on;
}

/** Switches them on or off (Settings); messages drawn after it follow it */
export function setThirdPartyEmotes(value: boolean): void {
    on = value;
    save(SETTING_KEY, value);
}

/** A stored list of the right shape for login, else null */
function validList(value: unknown, login: string): List | null {
    var list = value as List | null;
    return list && list.login === login && isObject(list.emotes) && list.due instanceof Array && list.due.length === SERVICES.length &&
        typeof list.due[0] === 'number' ? list : null;
}

function validEntry(value: unknown): boolean {
    var e = value as Entry;
    return isObject(e) && typeof e.at === 'number' && typeof e.id === 'string' && e.slot >= 0 && e.slot < CHANNELS_KEPT && e.slot % 1 === 0;
}

function kept(): Index {
    if (!index) {
        var stored = load<Index>(INDEX_KEY);
        var all: Index = { channels: Object.create(null) };
        if (stored && isObject(stored.channels)) {
            for (var login in stored.channels) {
                if (has(stored.channels, login) && validEntry(stored.channels[login])) {
                    all.channels[login] = stored.channels[login];
                }
            }
        }
        index = all;
    }
    return index;
}

function globalList(): List | null {
    if (global === undefined) {
        global = validList(load<List>(GLOBAL_KEY), '');
    }
    return global;
}

/** login's list, read from its slot when another channel's was in memory */
function channelList(login: string): List | null {
    if (login !== current) {
        current = login;
        currentList = storedList(login);
        made = Object.create(null);
    }
    return currentList;
}

/** login's stored list, without taking the place of the one in memory */
function storedList(login: string): List | null {
    var entry = kept().channels[login];
    return entry ? validList(load<List>(SLOT_KEY + entry.slot), login) : null;
}

/** login's newer list, in use at once when it is the current one */
function useList(login: string, list: List): void {
    if (login === current) {
        currentList = list;
        made = Object.create(null);
    }
}

function useGlobal(list: List): void {
    global = list;
    made = Object.create(null);
}

/** Which services are to be asked now for list (all of them without one) */
function dueOf(list: List | null): boolean[] {
    var now = Date.now();
    return SERVICES.map(function (kinds, i) { return !list || now >= list.due[i]; });
}

/** Makes sure the global list and login's are here: kept ones as they are (a service whose time has come asked again
 * in the background), missing ones asked. channelId: login's Twitch user id when the caller knows it (else asked).
 * Resolves once asking ends, also when it fails */
export function loadEmotes(login: string, channelId?: string): Promise<void> {
    if (!thirdPartyEmotes()) {
        return Promise.resolve();
    }
    var waits: Promise<void>[] = [];
    var g = globalList();
    if (dueOf(g).indexOf(true) >= 0) {
        var askedGlobal = askGlobal();
        if (!g) {
            waits.push(askedGlobal);
        }
    }
    var all = kept();
    var list = channelList(login);
    var entry = all.channels[login];
    var now = Date.now();
    if (entry) {
        entry.at = now;
        save(INDEX_KEY, all);
    }
    if (dueOf(list).indexOf(true) >= 0) {
        var askedChannel = askChannel(login, channelId || (entry ? entry.id : ''), now);
        if (!list) {
            waits.push(askedChannel);
        }
    }
    return Promise.all(waits).then(function () { return undefined; });
}

/** The emote a word names in login's chat (its own before the global ones), or null when the setting is off or no
 * list is here. It looks in the lists of the chat last asked for */
export function emoteFinder(login: string): EmoteFinder | null {
    if (!thirdPartyEmotes()) {
        return null;
    }
    return channelList(login) || globalList() ? find : null;
}

function find(word: string): ChatEmote | null {
    var known = made[word];
    if (known) {
        return known;
    }
    var c = currentList;
    var g = global;
    var emote = emoteOf(c && has(c.emotes, word) ? c.emotes[word] : g && has(g.emotes, word) ? g.emotes[word] : '');
    if (emote) {
        made[word] = emote;
    }
    return emote;
}

function emoteOf(k: unknown): ChatEmote | null {
    if (typeof k !== 'string' || !k) {
        return null;
    }
    var kind = k.charAt(0);
    var parts = k.slice(1).split('|');
    return has(PICTURES, kind) && parts[0] ? { url: PICTURES[kind](parts[0]), ratio: +parts[1] || 1, over: parts[2] === 'o' } : null;
}

/** An emote to keep: its ratio rounded to hundredths and held to MAX_RATIO */
function keep(kind: string, id: string, ratio: number, over: boolean): Kept {
    var r = Math.round(Math.min(MAX_RATIO, ratio > 0 ? ratio : 1) * 100) / 100;
    return kind + id + (r !== 1 || over ? '|' + r : '') + (over ? '|o' : '');
}

/** What a service gave: its emotes (none for a channel it does not know), or null when it did not answer */
type Answer = Emotes | null;

/** A service's answer as read (null: a reply it cannot make sense of); a 404 means none where noneOn404 */
function asked(request: Promise<unknown>, read: (reply: unknown) => Answer, noneOn404: boolean): Promise<Answer> {
    return request.then(read).then(null, function (e: { status?: number }) {
        return noneOn404 && e && e.status === 404 ? {} : null;
    });
}

interface SevenTvItem {
    alias: string;
    flags: { zeroWidth: boolean } | null;
    emote: { id: string; flags: { animated: boolean } | null; aspectRatio: number } | null;
}

interface SevenTvSet {
    emotes?: { pageCount?: number; items?: SevenTvItem[] } | null;
}

/** A 7TV set's emotes over its pages (at most SEVEN_TV_PAGES): ask(page) gives the reply's set (null: none, so no
 * emotes; undefined: no answer). A page that does not answer makes the whole no answer */
function sevenTvAnswer(ask: (page: number) => Promise<SevenTvSet | null | undefined>): Promise<Answer> {
    return ask(1).then(function (first) {
        var pages = Math.min(first && first.emotes && first.emotes.pageCount || 1, SEVEN_TV_PAGES);
        if (first === undefined || pages <= 1) {
            return first === undefined ? null : sevenTv(first);
        }
        var rest: Promise<SevenTvSet | null | undefined>[] = [];
        for (var page = 2; page <= pages; page++) {
            rest.push(ask(page));
        }
        return Promise.all(rest).then(function (more) {
            var items = (first && first.emotes && first.emotes.items || []).slice();
            for (var i = 0; i < more.length; i++) {
                var set = more[i];
                if (set === undefined) {
                    return null;
                }
                items = items.concat(set && set.emotes && set.emotes.items || []);
            }
            return sevenTv({ emotes: { items: items } });
        });
    }).then(null, function () {
        return null;
    });
}

/** A 7TV reply: a GraphQL error or a reply without data is no answer */
interface SevenTvReply {
    errors?: unknown[];
    data?: { [field: string]: unknown } | null;
}

function sevenTvData(reply: unknown): { [field: string]: unknown } | null {
    var r = reply as SevenTvReply | null;
    return r && r.data && !(r.errors && r.errors.length) ? r.data : null;
}

/** A 7TV emote set's emotes (none without a set) */
function sevenTv(set: SevenTvSet | null | undefined): Emotes {
    var items = set && set.emotes && set.emotes.items;
    var out: Emotes = Object.create(null);
    for (var i = 0; items && i < items.length; i++) {
        var item = items[i];
        var e = item && item.emote;
        if (e && e.id && item.alias && !has(out, item.alias)) {
            out[item.alias] = keep(e.flags && e.flags.animated ? 'S' : 's', e.id, e.aspectRatio, !!(item.flags && item.flags.zeroWidth));
        }
    }
    return out;
}

interface BttvEmote {
    id: string;
    code: string;
    animated: boolean;
    modifier?: boolean;
    width?: number;
    height?: number;
}

/** BetterTTV's emotes; one without a size is 28 by 28; modifiers (they change the emote before them) are left out */
function bttv(emotes: BttvEmote[]): Emotes {
    var out: Emotes = Object.create(null);
    for (var i = 0; i < emotes.length; i++) {
        var e = emotes[i];
        if (e && e.id && e.code && !e.modifier && !has(out, e.code)) {
            out[e.code] = keep(e.animated ? 'B' : 'b', e.id, e.width && e.height ? e.width / e.height : 1, false);
        }
    }
    return out;
}

interface FfzSet {
    emoticons?: { id: number; name: string; width: number; height: number; urls: { [scale: string]: string }; modifier?: boolean; hidden?: boolean }[];
}

/** FrankerFaceZ's emotes in these sets (their pictures are still); modifiers and hidden ones left out */
function ffz(sets: { [id: string]: FfzSet | null }, ids: string[]): Emotes {
    var out: Emotes = Object.create(null);
    for (var s = 0; s < ids.length; s++) {
        var set = has(sets, ids[s]) ? sets[ids[s]] : null;
        var list = set && set.emoticons || [];
        for (var i = 0; i < list.length; i++) {
            var e = list[i];
            if (e && e.name && e.urls && !e.modifier && !e.hidden && !has(out, e.name)) {
                out[e.name] = keep(e.urls['2'] ? 'f' : 'g', String(e.id), e.width && e.height ? e.width / e.height : 1, false);
            }
        }
    }
    return out;
}

/** previous's emotes of the service with these kinds */
function ofService(previous: List, kinds: string): Emotes {
    var out: Emotes = Object.create(null);
    for (var name in previous.emotes) {
        var k = previous.emotes[name];
        if (has(previous.emotes, name) && typeof k === 'string' && kinds.indexOf(k.charAt(0)) >= 0) {
            out[name] = k;
        }
    }
    return out;
}

/** The services' requests in order of precedence (null: not asked now) merged with previous as each answers, so a
 * slow service does not hold back the others' emotes: shown(list) after each answer with emotes, then resolves with
 * the whole list. A service that answered is due again in REFRESH_MS, one that failed in RETRY_MS (its emotes from
 * previous kept), one not asked as before; null when none has emotes to give */
function gathered(requests: (Promise<Answer> | null)[], previous: List | null, login: string, shown: (list: List) => void): Promise<List | null> {
    var before = SERVICES.map(function (kinds) { return previous ? ofService(previous, kinds) : null; });
    var answers: Answer[] = [];
    var due: number[] = [];
    var any = !!previous;
    var list = function (): List {
        var emotes: Emotes = Object.create(null);
        for (var i = 0; i < SERVICES.length; i++) {
            var from = answers[i] || before[i];
            for (var name in from) {
                if (has(from, name) && !has(emotes, name)) {
                    emotes[name] = from[name];
                }
            }
        }
        return { due: due.slice(), login: login, emotes: emotes };
    };
    return Promise.all(requests.map(function (request, i) {
        answers[i] = null;
        due[i] = previous ? previous.due[i] : 0;
        return request && request.then(function (answer) {
            answers[i] = answer;
            due[i] = Date.now() + (answer ? REFRESH_MS : RETRY_MS);
            if (answer) {
                any = true;
                shown(list());
            }
        });
    })).then(function () {
        return any ? list() : null;
    });
}

/** Asks 7TV's GraphQL (as plain text: a request the browser sends without asking first) */
function askSevenTv(query: string, variables: object): Promise<unknown> {
    return postJson(SEVEN_TV, { query: query, variables: variables }, { 'Content-Type': 'text/plain' });
}

function askGlobal(): Promise<void> {
    if (!askingGlobal) {
        var done = function () { askingGlobal = null; };
        var previous = globalList();
        var due = dueOf(previous);
        askingGlobal = gathered([
            due[0] ? sevenTvAnswer(function (page) {
                return askSevenTv(SEVEN_TV_GLOBAL, { page: page }).then(function (reply) {
                    var data = sevenTvData(reply) as { emoteSets?: { global?: SevenTvSet | null } } | null;
                    var sets = data && data.emoteSets;
                    return sets ? sets.global || null : undefined;
                });
            }) : null,
            due[1] ? asked(getJson(BTTV + 'emotes/global'), function (reply) {
                return reply instanceof Array ? bttv(reply as BttvEmote[]) : null;
            }, false) : null,
            due[2] ? asked(getJson(FFZ + 'set/global'), function (reply) {
                var r = reply as { default_sets?: number[]; sets?: { [id: string]: FfzSet } } | null;
                return r && isObject(r.sets) && r.default_sets instanceof Array ? ffz(r.sets as { [id: string]: FfzSet }, r.default_sets.map(String)) : null;
            }, false) : null
        ], previous, '', useGlobal).then(function (list) {
            if (list) {
                useGlobal(list);
                save(GLOBAL_KEY, list);
            }
        }).then(done, done);
    }
    return askingGlobal;
}

/** login's Twitch user id (the services know channels by it), asked */
function userId(login: string): Promise<string> {
    return gql<{ user: { id: string } | null }>('query($login: String) { user(login: $login) { id } }', { login: login }, true)
        .then(function (data) {
            return data.user ? data.user.id : '';
        });
}

/** Asks login's services that are due; id: its Twitch user id ('' asked first); opened: when it was opened */
function askChannel(login: string, id: string, opened: number): Promise<void> {
    if (!asking[login]) {
        var done = function () { delete asking[login]; };
        asking[login] = (id ? Promise.resolve(id) : userId(login)).then(function (known) {
            if (!known) {
                return undefined;
            }
            var previous = login === current ? currentList : storedList(login);
            var due = dueOf(previous);
            return gathered([
                due[0] ? sevenTvAnswer(function (page) {
                    return askSevenTv(SEVEN_TV_USER, { id: known, page: page }).then(function (reply) {
                        var data = sevenTvData(reply) as { users?: { userByConnection?: { style?: { activeEmoteSet?: SevenTvSet | null } } | null } } | null;
                        var users = data && data.users;
                        var user = users && users.userByConnection;
                        return users ? user && user.style && user.style.activeEmoteSet || null : undefined;
                    });
                }) : null,
                due[1] ? asked(getJson(BTTV + 'users/twitch/' + known), function (reply) {
                    var r = reply as { channelEmotes?: BttvEmote[]; sharedEmotes?: BttvEmote[] } | null;
                    return isObject(r) ? bttv((r!.channelEmotes || []).concat(r!.sharedEmotes || [])) : null;
                }, true) : null,
                due[2] ? asked(getJson(FFZ + 'room/id/' + known), function (reply) {
                    var r = reply as { sets?: { [id: string]: FfzSet } } | null;
                    return r && isObject(r.sets) ? ffz(r.sets as { [id: string]: FfzSet }, Object.keys(r.sets as object)) : null;
                }, true) : null
            ], previous, login, function (list) {
                useList(login, list);
            }).then(function (list) {
                keepChannel(login, known, list, opened);
            });
        }).then(done, done);
    }
    return asking[login];
}

/** Stores login's new list in its slot, or a free one, else the slot of the channel opened longest ago; a channel new
 * to the index counts as opened when it was */
function keepChannel(login: string, id: string, list: List | null, opened: number): void {
    if (!list) {
        return;
    }
    var all = kept();
    var entry = all.channels[login];
    var slot = entry ? entry.slot : -1;
    if (slot < 0) {
        var used: boolean[] = [];
        var oldest = '';
        for (var other in all.channels) {
            used[all.channels[other].slot] = true;
            if (!oldest || all.channels[other].at < all.channels[oldest].at) {
                oldest = other;
            }
        }
        for (var s = 0; s < CHANNELS_KEPT && slot < 0; s++) {
            if (!used[s]) {
                slot = s;
            }
        }
        if (slot < 0) {
            slot = all.channels[oldest].slot;
            delete all.channels[oldest];
        }
    }
    all.channels[login] = { at: entry ? entry.at : opened, id: id, slot: slot };
    save(SLOT_KEY + slot, list);
    save(INDEX_KEY, all);
    useList(login, list);
}
