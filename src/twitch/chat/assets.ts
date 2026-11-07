// Chat badges: Twitch's global list and a channel's own (subscriber months, bits), asked in one small query (set,
// version and the 2x picture only: ~80 KB, where Twitch's TV app asks ~250 KB with three sizes and titles on every
// start) and kept a day under one storage key: the global list and the last CHANNELS_KEPT channels' own. Pictures at
// 2x stay sharp at the 1.5x scale.

import { load, save } from '../../core/store.js';
import { gql } from '../api/gql.js';

/** Lists older than this are asked again, and left out when the lists are written */
var KEEP_MS = 24 * 3600 * 1000;
var CHANNELS_KEPT = 20;
var KEY = 'twitch.badges';
var PICTURE = 'https://static-cdn.jtvnw.net/badges/v1/';

/** "set/version" -> the picture's id (or its whole address when it is not Twitch's usual one) */
interface BadgeList {
    at: number;
    ids: { [id: string]: string };
}

interface Lists {
    global: BadgeList | null;
    channels: { [login: string]: BadgeList };
}

interface BadgeReply {
    setID: string;
    version: string;
    imageURL: string;
}

var FIELDS = '{ setID version imageURL(size: DOUBLE) }';
var BOTH = 'query ChatBadges($login: String) { badges ' + FIELDS + ' user(login: $login) { broadcastBadges ' + FIELDS + ' } }';
var CHANNEL = 'query ChatChannelBadges($login: String) { user(login: $login) { broadcastBadges ' + FIELDS + ' } }';

var lists: Lists | null = null;
// Maps keyed by logins or picture ids have no prototype: a login such as "constructor" finds nothing of Object's
/** Picture id -> its address, made once for every message that shows it */
var addresses: { [picture: string]: string } = Object.create(null);
var asking: { [login: string]: Promise<void> } = Object.create(null);

/** The lists in memory, read from storage the first time (stored lists of the wrong shape are left out) */
function kept(): Lists {
    if (!lists) {
        var stored = load<Lists>(KEY);
        var all: Lists = { global: null, channels: Object.create(null) };
        if (stored && isObject(stored.channels) && (!stored.global || isObject(stored.global.ids))) {
            all.global = stored.global || null;
            for (var login in stored.channels) {
                if (has(stored.channels, login)) {
                    all.channels[login] = stored.channels[login];
                }
            }
        }
        lists = all;
    }
    return lists;
}

function isObject(value: unknown): boolean {
    return !!value && typeof value === 'object';
}

function has(map: object, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(map, key);
}

/** map's own picture id for key (a stored map is a plain object, perhaps broken), else '' */
function own(map: { [key: string]: string } | undefined, key: string): string {
    var picture: unknown = map && typeof map === 'object' && has(map, key) ? map[key] : '';
    return typeof picture === 'string' ? picture : '';
}

/** Makes sure the global list and login's are here (kept, or asked); resolves even when asking fails */
export function loadBadges(login: string): Promise<void> {
    if (badgesReady(login)) {
        return Promise.resolve();
    }
    if (!asking[login]) {
        var both = !fresh(kept().global);
        var done = function () { delete asking[login]; };
        asking[login] = gql<{ badges?: BadgeReply[]; user: { broadcastBadges: BadgeReply[] } | null }>(both ? BOTH : CHANNEL, { login: login })
            .then(function (data) {
                var all = kept();
                var at = Date.now();
                if (data.badges) {
                    all.global = listOf(data.badges, at);
                }
                all.channels[login] = listOf(data.user ? data.user.broadcastBadges : [], at);
                write(all, at);
            })
            .then(done, done);
    }
    return asking[login];
}

/** Stores the lists without those older than a day, and only the newest CHANNELS_KEPT channels' */
function write(all: Lists, now: number): void {
    var logins: string[] = [];
    for (var login in all.channels) {
        if (fresh(all.channels[login])) {
            logins.push(login);
        } else {
            delete all.channels[login];
        }
    }
    logins.sort(function (a, b) { return all.channels[b].at - all.channels[a].at; });
    for (var i = CHANNELS_KEPT; i < logins.length; i++) {
        delete all.channels[logins[i]];
    }
    if (all.global && now - all.global.at >= KEEP_MS) {
        all.global = null;
    }
    save(KEY, all);
}

/** A list still within its day */
function fresh(list: BadgeList | null | undefined): boolean {
    return !!list && !!list.ids && Date.now() - list.at < KEEP_MS;
}

function listOf(replies: BadgeReply[], at: number): BadgeList {
    var ids: { [id: string]: string } = {};
    for (var i = 0; i < replies.length; i++) {
        var url = replies[i].imageURL || '';
        var match = /\/badges\/v1\/([^/]+)\/2$/.exec(url);
        ids[replies[i].setID + '/' + replies[i].version] = match ? match[1] : url;
    }
    return { at: at, ids: ids };
}

/** The picture of badge "set/version" in login's chat (its own before the global one), or '' when unknown */
export function badgeOf(login: string, id: string): string {
    var all = kept();
    var channel = all.channels[login];
    var picture = (channel && own(channel.ids, id)) || (all.global && own(all.global.ids, id)) || '';
    if (!picture || picture.indexOf('/') >= 0) {
        return picture;
    }
    return addresses[picture] || (addresses[picture] = PICTURE + picture + '/2');
}

/** The lists are here for login (a message parsed now gets its badges) */
export function badgesReady(login: string): boolean {
    var all = kept();
    return fresh(all.global) && fresh(all.channels[login]);
}
