// What Twitch says about the favorite channels (api/favorites.ts): who is live (the stream as its tile draws it), when
// each was last live and playing what, and each one's newest past broadcasts with the cursor they go on from. Asked in
// batches of at most BATCH channels (one query each, the most Twitch's users(ids:) takes), the front of the list
// first: up to BATCH favorites that is one query for all. The next batch is asked only when the viewer nears the end of
// what is loaded (moreFavorites(), from the tab); a refresh asks the loaded batches again, one after another. The last
// answer is kept in memory, and its front batch on the device, so a screen draws it at once (a start loads that batch
// only, the rest again as the viewer gets to them); refreshFavorites() asks
// again when it is older than STALE_MS; a channel added within the loaded part, one moved into it from after it, or
// one let in by one removed or moved out, is asked about alone, at once. From the list and the answer come the Favorites tab's rows (favoriteShelves): Live Now and All
// Favorites; its Latest Broadcasts, the past broadcasts of all favorites merged, start from the same answer and go on
// from there (api/favorites-latest.ts).

import { load, save } from '../../core/store.js';
import { onAccountChange } from './auth.js';
import { Favorite, FavoriteChange, favoriteCount, favorites, isFavorite, noteFavorites, onFavoritesChange } from './favorites.js';
import { gql } from './gql.js';
import { Listeners } from './listeners.js';
import { GAME_FIELDS, GATE_FIELDS, HISTORY_FIELDS, LIVE_CHANNEL, Raw, VIDEO_PICTURE, addShelf, nodes, oneReply, parseAll, toLive, toOfflineItem,
    toVideo } from './parse.js';
import { isChannel, isGame, isStream, isText, isVideo } from './shapes.js';
import { Channel, Game, Item, Shelf, Stream, Video } from './types.js';

/** An answer older than this is asked again when the tab shows or focus rests on it in the menu */
var STALE_MS = 60 * 1000;
/** The past broadcasts the answer brings of all channels together, and the most asked per channel (with few
 * favorites, more of each) */
var LATEST = 25;
var PER_CHANNEL = 10;
/** The kept answer; another VERSION is not drawn */
var KEPT_KEY = 'twitch.favorites.feed';
var KEPT_VERSION = 1;
/** Channels in one query (Twitch's users(ids:) answers at most 100), and the pause between the batches of a refresh,
 * so they never come as a burst */
export var BATCH = 100;
var PAUSE_MS = 300;

/** A page of a channel's past broadcasts, the newest first, with each one's cursor and whether more follow */
export var VIDEOS_PAGE = 'edges { cursor node { ' + VIDEO_PICTURE + ' ' + HISTORY_FIELDS + ' ' + GATE_FIELDS + ' } } pageInfo { hasNextPage }';

var QUERY = 'query Favorites($ids: [ID!], $videos: Int!, $me: Boolean!) { users(ids: $ids) { ' + LIVE_CHANNEL +
    ' lastBroadcast { startedAt game { ' + GAME_FIELDS + ' } }' +
    ' videos(first: $videos, type: ARCHIVE, sort: TIME) { ' + VIDEOS_PAGE + ' } } }';

/** What Twitch last said about one favorite */
export interface FavoriteState {
    channel: Channel;
    /** Its live stream, or null when it is offline */
    stream: Stream | null;
    /** When its last broadcast began (ISO) and what it played, where Twitch says */
    lastLive?: string;
    lastGame?: Game;
    /** Its newest past broadcasts, the newest first, and the cursor the older ones follow (none: these are all) */
    videos: Video[];
    more?: string;
}

interface Kept {
    v: number;
    at: number;
    /** The channels it was asked for (Twitch has none for one that is gone) */
    ids: string[];
    states: FavoriteState[];
}

type States = { [id: string]: FavoriteState };

/** The last answer by channel id (null: the kept one not read yet), when it came (0: none) and the channels it was
 * asked for */
var states: States | null = null;
var at = 0;
var answered: { [id: string]: boolean } = {};
/** How many favorites at the front of the list are loaded: asked on every refresh (BATCH or more, in steps of it) */
var reach = BATCH;
/** The next batch was wanted while a refresh was out: asked after it */
var more = false;
/** The ask out is the next batch (wanted again meanwhile: that one, not the one after) */
var growing = false;
/** The next batch failed: keys ask it no more until the next refresh is wanted (the tab shows, the app comes back in
 * front, the network is back), as a failed refresh waits for those */
var growFailed = false;
/** The account changed: the answer is asked again whatever its age */
var stale = false;
var asking: Promise<unknown> | null = null;
/** Asked for while an answer was coming: asked once more after it */
var again = false;
/** A favorite came into the loaded part unasked while an answer was coming: asked after it */
var missing = false;
var listeners = new Listeners<[]>();

/** The last answer by channel id; the kept one the first time */
export function favoriteStates(): States {
    if (!states) {
        states = {};
        var kept = load<Kept>(KEPT_KEY);
        if (fits(kept)) {
            at = kept.at;
            // The front batch only (one kept by an older build may hold more): the rest wait for their batch
            var front: { [id: string]: boolean } = {};
            var list = favorites();
            for (var f = 0; f < list.length && f < BATCH; f++) {
                front[list[f].id] = true;
            }
            for (var i = 0; i < kept.states.length; i++) {
                if (front[kept.states[i].channel.id]) {
                    states[kept.states[i].channel.id] = kept.states[i];
                }
            }
            for (var k = 0; k < kept.ids.length; k++) {
                if (front[kept.ids[k]]) {
                    answered[kept.ids[k]] = true;
                }
            }
        }
    }
    return states;
}

/** The last answer was asked for every loaded favorite (false: one came in since, or nothing was asked yet) */
export function favoritesAnswered(): boolean {
    favoriteStates();
    var list = favorites();
    for (var i = 0; i < list.length && i < reach; i++) {
        if (!answered[list[i].id]) {
            return false;
        }
    }
    return true;
}

/** When the last answer came (0: none yet) */
export function favoritesAt(): number {
    favoriteStates();
    return at;
}

/** How old an answer that came at when is (ms). One from the future came while the device's clock was ahead (it has
 * been set back since): nothing says how old it is, so it is as old as can be */
export function answerAge(when: number): number {
    var age = Date.now() - when;
    return age < 0 ? Infinity : age;
}

/** How many favorites at the front of the list are loaded (the rest wait for moreFavorites()) */
export function favoritesLoaded(): number {
    favoriteStates();
    return Math.min(reach, favoriteCount());
}

/** Favorites after the loaded ones wait to be asked */
export function favoritesHaveMore(): boolean {
    return favoritesLoaded() < favoriteCount();
}

/** Asks Twitch about the loaded favorites when the last answer is older than STALE_MS (force: whatever its age), batch
 * by batch, the front first, each taken as it comes; one ask at a time. Settles once all are in or one failed (a
 * failure keeps the last answer and ends the round); listeners hear each batch */
export function refreshFavorites(force?: boolean): Promise<unknown> {
    favoriteStates();
    growFailed = false;
    var ids = favorites().slice(0, reach).map(idOf);
    if (!ids.length) {
        return Promise.resolve();
    }
    if (asking) {
        again = again || !!force;
        return asking;
    }
    if (!force && !stale && answerAge(at) < STALE_MS) {
        return Promise.resolve();
    }
    var step = function (from: number): Promise<unknown> {
        return ask(ids.slice(from, from + BATCH), !from, 0).then(function (ok: boolean) {
            return ok && from + BATCH < ids.length ? pause().then(function () { return step(from + BATCH); }) : undefined;
        });
    };
    return run(step(0));
}

/** Asks the next batch after the loaded favorites (none, or the last try failed: settles at once). After a refresh
 * that is out, never beside it; while the next batch is out, that one */
export function moreFavorites(): Promise<unknown> {
    if (!favoritesHaveMore() || growFailed) {
        return Promise.resolve();
    }
    if (asking) {
        more = more || !growing;
        return asking;
    }
    growing = true;
    return run(ask(favorites().slice(reach, reach + BATCH).map(idOf), false, reach + BATCH).then(function (ok: boolean) {
        growFailed = !ok;
    }));
}

/** The one ask out: once it settles, a refresh or next batch wanted meanwhile follows */
function run(work: Promise<unknown>): Promise<unknown> {
    var done = function (): Promise<unknown> | undefined {
        asking = null;
        growing = false;
        if (again) {
            again = false;
            return refreshFavorites(true);
        }
        if (missing) {
            missing = false;
            return askMissing();
        }
        if (more) {
            more = false;
            return moreFavorites();
        }
        return undefined;
    };
    asking = work.then(done, done);
    return asking;
}

function pause(): Promise<void> {
    return new Promise<void>(function (resolve) {
        setTimeout(resolve, PAUSE_MS);
    });
}

/** One query for these channels; renew: the front batch of a refresh (the answer's time); grow: the loaded part
 * reaches this far once it is in. True when it was taken */
function ask(ids: string[], renew: boolean, grow: number): Promise<boolean> {
    var per = Math.max(1, Math.min(PER_CHANNEL, Math.ceil(LATEST / Math.min(reach, favorites().length))));
    return gql<Raw>(QUERY, { ids: ids, videos: per }).then(function (data: Raw) {
        take(toFavoriteStates(data), ids, renew, grow);
        return true;
    }).then(null, function () {
        return false;
    });
}

/** listener() after every new answer; returns the function that stops it */
export function onFavoriteStates(listener: () => void): () => void {
    return listeners.on(listener);
}

/** A new answer, asked for ids, in place of what was known of them: the channels still favorites, kept for the next
 * start (with the rest); the list takes their current names */
function take(fresh: FavoriteState[], ids: string[], renew: boolean, grow: number): void {
    var known = favoriteStates();
    for (var a = 0; a < ids.length; a++) {
        delete known[ids[a]];
        answered[ids[a]] = true;
    }
    for (var i = 0; i < fresh.length; i++) {
        if (isFavorite(fresh[i].channel.id)) {
            known[fresh[i].channel.id] = fresh[i];
        }
    }
    if (renew) {
        at = Date.now();
        stale = false;
    }
    reach = Math.max(reach, grow);
    noteFavorites(fresh.map(function (s) { return s.channel; }));
    keep();
    listeners.tell();
}

/** Writes the kept answer of the front batch, in the list's order: a start loads no more */
function keep(): void {
    var known = favoriteStates();
    var out: Kept = { v: KEPT_VERSION, at: at, ids: [], states: [] };
    var list = favorites();
    for (var i = 0; i < list.length && i < BATCH; i++) {
        var id = list[i].id;
        if (answered[id]) {
            out.ids.push(id);
        }
        if (known[id]) {
            out.states.push(known[id]);
        }
    }
    save(KEPT_KEY, out);
}

function idOf(f: Favorite): string {
    return f.id;
}

/** One query for the favorites within the loaded part Twitch was never asked about (none: nothing asked) */
function askMissing(): Promise<unknown> | undefined {
    var list = favorites();
    var ids: string[] = [];
    for (var i = 0; i < list.length && i < reach; i++) {
        if (!answered[list[i].id]) {
            ids.push(list[i].id);
        }
    }
    if (!ids.length) {
        return undefined;
    }
    if (asking) {
        missing = true;
        return asking;
    }
    return run(ask(ids, false, 0));
}

/** The favorite that an add, a move or a removal brought into the loaded part was never asked about (one added or
 * moved in from after it, or the one after it that slid in) */
function cameInUnasked(id: string): boolean {
    var front = favorites().slice(0, reach);
    var last = front[front.length - 1];
    if (last && !answered[last.id]) {
        return true;
    }
    for (var i = 0; i < front.length; i++) {
        if (front[i].id === id) {
            return !answered[id];
        }
    }
    return false;
}

// A channel added within the loaded part is asked about at once, alone (it goes at the end, so none slides out; one
// after the loaded part comes with its batch); the first one, or one before any answer, asks for all. One removed
// leaves the answer. One an add, a move or a removal brings into the loaded part unasked is asked about with any other
// such (one query), so its tile, Live Now and Latest Broadcasts show it as Twitch has it
onFavoritesChange(function (change: FavoriteChange, id: string) {
    favoriteStates();
    if (change === 'add' && (!at || favoriteCount() === 1)) {
        if (favoriteCount() <= reach) {
            stale = true;
            refreshFavorites(true);
        }
        return;
    }
    if (change === 'add' && growing) {
        // (the next batch out may bring it into the loaded part: asked after it, if so)
        missing = true;
    }
    if (change === 'remove' && states && states[id]) {
        delete states[id];
        keep();
    }
    if (at && cameInUnasked(id)) {
        askMissing();
    }
});

// Past broadcasts carry where the account stopped: another account's are asked again, now when a screen draws them
// or an answer for the last account is still coming, else with the next ask
onAccountChange(function () {
    stale = true;
    if (asking || listeners.count) {
        refreshFavorites(true);
    }
});

type ChannelItem = Extract<Item, { kind: 'channel' }>;

export var toFavoriteStates = oneReply(function (data: Raw): FavoriteState[] {
    return parseAll(data && data.users, toState);
});

function toState(u: Raw): FavoriteState | null {
    var offline = toOfflineItem(u) as ChannelItem | null;
    if (!offline) {
        return null;
    }
    var channel = offline.channel;
    var state: FavoriteState = {
        channel: channel,
        stream: toLive(u),
        videos: parseAll(nodes(u.videos), function (v: Raw) { return toVideo(v, channel); })
    };
    if (offline.lastLive) {
        state.lastLive = offline.lastLive;
    }
    if (offline.lastGame) {
        state.lastGame = offline.lastGame;
    }
    var more = videosNext(u.videos);
    if (more) {
        state.more = more;
    }
    return state;
}

/** The cursor a page of past broadcasts (VIDEOS_PAGE) goes on from: its last one's, while Twitch says more follow */
export function videosNext(page: Raw): string | undefined {
    var edges = page && page.edges;
    var last = edges && edges.length ? edges[edges.length - 1] : null;
    return page && page.pageInfo && page.pageInfo.hasNextPage && last && last.cursor ? String(last.cursor) : undefined;
}

/** The past broadcasts of all these channels as one list, the newest first, at most max */
export function latestVideos(known: { videos: Video[] }[], max: number): Video[] {
    var all: Video[] = [];
    var seen: { [id: string]: boolean } = {};
    for (var i = 0; i < known.length; i++) {
        for (var k = 0; k < known[i].videos.length; k++) {
            var v = known[i].videos[k];
            if (!seen[v.id]) {
                seen[v.id] = true;
                all.push(v);
            }
        }
    }
    all.sort(function (a: Video, b: Video) {
        // (the same moment: by id, so the order never depends on the sort)
        return (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0) || (a.id < b.id ? 1 : -1);
    });
    return all.slice(0, max);
}

/** A favorite's tile in All Favorites: live with what it plays, else when it was last live and what it played; one
 * Twitch has not answered for yet draws from the list (offline, no line) */
function favoriteItem(f: Favorite, state: FavoriteState | undefined): Item {
    if (!state) {
        return { kind: 'channel', channel: { id: f.id, login: f.login, displayName: f.displayName, avatar: f.avatar }, live: false };
    }
    var item: ChannelItem = { kind: 'channel', channel: state.channel, live: !!state.stream };
    var game = state.stream ? state.stream.game : state.lastGame;
    if (game) {
        item.lastGame = game;
    }
    if (!state.stream && state.lastLive) {
        item.lastLive = state.lastLive;
    }
    return item;
}

/** The Favorites tab's rows, each only when it has tiles: the favorites that are live as stream tiles, and every
 * favorite as a channel tile (live says which are live); both in the list's order */
export function favoriteShelves(list: Favorite[], known: States): Shelf[] {
    var live: Item[] = [];
    var all: Item[] = [];
    for (var i = 0; i < list.length; i++) {
        var state = known[list[i].id];
        if (state && state.stream) {
            live.push({ kind: 'stream', stream: state.stream });
        }
        all.push(favoriteItem(list[i], state));
    }
    var shelves: Shelf[] = [];
    addShelf(shelves, 'favorites-live', 'Live Now', live);
    addShelf(shelves, 'favorites-all', 'All Favorites', all);
    return shelves;
}

/** Live Now while a favorite is moved in it: every favorite in the list's order, the live ones as their stream
 * tiles and the rest as ghosts (offline, or not asked about yet: drawn from the list) */
export function liveWithGhosts(list: Favorite[], known: States): Item[] {
    var out: Item[] = [];
    for (var i = 0; i < list.length; i++) {
        var state = known[list[i].id];
        if (state && state.stream) {
            out.push({ kind: 'stream', stream: state.stream });
        } else {
            var ghost = favoriteItem(list[i], state) as ChannelItem;
            ghost.ghost = true;
            out.push(ghost);
        }
    }
    return out;
}

/** A kept answer this build can draw: its version, and every channel, stream and past broadcast of the shape drawn */
function fits(kept: Kept | null): kept is Kept {
    if (!kept || kept.v !== KEPT_VERSION || typeof kept.at !== 'number' || !Array.isArray(kept.ids) || !Array.isArray(kept.states)) {
        return false;
    }
    for (var i = 0; i < kept.states.length; i++) {
        var s = kept.states[i];
        if (!s || !isChannel(s.channel) || (s.stream !== null && !isStream(s.stream)) || (s.lastGame !== undefined && !isGame(s.lastGame)) ||
            (s.lastLive !== undefined && !isText(s.lastLive)) || (s.more !== undefined && !isText(s.more)) || !Array.isArray(s.videos)) {
            return false;
        }
        for (var k = 0; k < s.videos.length; k++) {
            if (!isVideo(s.videos[k])) {
                return false;
            }
        }
    }
    return true;
}

/** Forgets the answer in memory, read from the store again (the tests) */
export function forgetFavoriteStates(): void {
    states = null;
    at = 0;
    answered = {};
    stale = false;
    again = false;
    missing = false;
    more = false;
    growing = false;
    growFailed = false;
    asking = null;
    reach = BATCH;
}
