// Following (signed in): Twitch's TV app's rows in its order, each only when it has tiles: Live Followed Channels,
// Followed Categories, Followed Offline Channels. With none of them Twitch shows "Follow your favorites!" over
// Home's rows (its query asks Home's 54 rows every time): we hand over no rows and the view takes Home's
// (api/home.ts), already loaded. A guest has no Following (Twitch's TV app sends a guest to Home).
// The live and offline rows go on a page at a time as Twitch's TV app asks them: 25 first, then 4 live channels or 8
// followed channels after the cursor of the last one. The offline row is the followed channels whose stream is null,
// picked from each page of follows as Twitch's TV app picks them.

import { gql, signedIn } from './gql.js';
import { Item, Page, Shelf } from './types.js';
import { CATEGORY_FIELDS, GAME_FIELDS, LIVE_CHANNEL, Raw, TOP_STREAM, USER_FIELDS, addShelf, liveItem, nodes, oneReply, parseAll, toOfflineItem,
    withTopStream } from './parse.js';

/** Tiles per row and followed categories, as Twitch's TV app asks */
var FIRST = 25;
var CATEGORIES = 100;
/** The first followed categories, whose tiles carry their top stream for the hero */
var WITH_TOP = 10;
/** A later page of the live and the offline row, as Twitch's TV app asks it (the whole tiles one row shows) */
var LIVE_MORE = 4;
var OFFLINE_MORE = 8;
/** The newest follows all live: at most this many more pages of follows are asked for the offline row */
var SEEK_PAGES = 20;
var OFFLINE_ID = 'following-offline';
var OFFLINE_TITLE = 'Followed Offline Channels';

/** A page of each row, with the cursors to go on from and whether Twitch has more */
var LIVE_PAGE = 'edges { cursor node { ' + LIVE_CHANNEL + ' } } pageInfo { hasNextPage }';
var OFFLINE_PAGE = 'edges { cursor node { ' + USER_FIELDS + ' bannerImageURL followers { totalCount }' +
    ' lastBroadcast { startedAt game { ' + GAME_FIELDS + ' } } stream { id } } } pageInfo { hasNextPage }';

var QUERY = 'query Following($first: Int!, $categories: Int!, $withTop: Int!) { user {' +
    ' followedLiveUsers(first: $first) { ' + LIVE_PAGE + ' }' +
    ' followedGames(first: $categories, type: ALL) { nodes { ' + CATEGORY_FIELDS + ' } }' +
    ' topGames: followedGames(first: $withTop, type: ALL) { nodes { id ' + TOP_STREAM + ' } }' +
    ' follows(first: $first) { ' + OFFLINE_PAGE + ' } } }';
var LIVE_QUERY = 'query FollowedLive($first: Int!, $after: Cursor) { user {' +
    ' followedLiveUsers(first: $first, after: $after) { ' + LIVE_PAGE + ' } } }';
var OFFLINE_QUERY = 'query FollowedOffline($first: Int!, $after: Cursor) { user {' +
    ' follows(first: $first, after: $after) { ' + OFFLINE_PAGE + ' } } }';

/** A followed row that goes on: the cursor of its next page (none: it ended) and how a page after a cursor is asked */
export interface FollowedShelf extends Shelf {
    next?: string;
    more?: (after: string) => Promise<Page<Item>>;
}

/** The followed rows, or none (a guest, or an account that follows nothing yet) */
export function following(): Promise<Shelf[]> {
    if (!signedIn()) {
        return Promise.resolve([]);
    }
    return gql<Raw>(QUERY, { first: FIRST, categories: CATEGORIES, withTop: WITH_TOP }).then(function (data: Raw) {
        var shelves = toFollowing(data);
        var next = nextAfter(data && data.user && data.user.follows, FIRST);
        var last = shelves[shelves.length - 1];
        return next === undefined || (last && last.id === OFFLINE_ID) ? shelves : seekOffline(shelves, next, SEEK_PAGES);
    });
}

export var toFollowing = oneReply(function (data: Raw): Shelf[] {
    var user = data && data.user;
    var shelves: Shelf[] = [];
    if (!user) {
        return shelves;
    }
    addRow(shelves, 'following-live', 'Live Followed Channels', toPage(user.followedLiveUsers, FIRST, liveItem), followedLive);
    var tops: { [id: string]: Raw } = {};
    var withTop: Raw[] = (user.topGames && user.topGames.nodes) || [];
    for (var i = 0; i < withTop.length; i++) {
        if (withTop[i]) {
            tops[withTop[i].id] = withTop[i].topStream;
        }
    }
    addShelf(shelves, 'following-games', 'Followed Categories', parseAll(user.followedGames && user.followedGames.nodes, function (g: Raw): Item | null {
        g.topStream = tops[g.id];
        var game = withTopStream(g);
        return game ? { kind: 'game', game: game } : null;
    }));
    addRow(shelves, OFFLINE_ID, OFFLINE_TITLE, toPage(user.follows, FIRST, offlineItem), followedOffline);
    return shelves;
});

/** Live Followed Channels after a cursor */
export function followedLive(after: string): Promise<Page<Item>> {
    return gql<Raw>(LIVE_QUERY, { first: LIVE_MORE, after: after }).then(function (data: Raw) {
        return toPage(data && data.user && data.user.followedLiveUsers, LIVE_MORE, liveItem);
    });
}

/** Followed Offline Channels after a cursor: a page of follows without the live ones (it may come empty) */
export function followedOffline(after: string): Promise<Page<Item>> {
    return offlinePage(after, OFFLINE_MORE);
}

function offlinePage(after: string, first: number): Promise<Page<Item>> {
    return gql<Raw>(OFFLINE_QUERY, { first: first, after: after }).then(function (data: Raw) {
        return toPage(data && data.user && data.user.follows, first, offlineItem);
    });
}

/** The newest follows were all live: the follows after them, a page at a time, until one is offline or they end,
 * so the offline row is there. No answer: the rows without it (asked again with the rows) */
function seekOffline(shelves: Shelf[], after: string, pages: number): Promise<Shelf[]> {
    return offlinePage(after, FIRST).then(function (page) {
        if (page.items.length) {
            addRow(shelves, OFFLINE_ID, OFFLINE_TITLE, page, followedOffline);
            return shelves;
        }
        return page.next !== undefined && pages > 1 ? seekOffline(shelves, page.next, pages - 1) : shelves;
    }, function () {
        return shelves;
    });
}

/** A row with its first page, when it has tiles; with its next cursor when it goes on */
function addRow(shelves: Shelf[], id: string, title: string, page: Page<Item>, more: (after: string) => Promise<Page<Item>>): void {
    if (page.items.length) {
        var shelf: FollowedShelf = { id: id, title: title, items: page.items, more: more };
        if (page.next !== undefined) {
            shelf.next = page.next;
        }
        shelves.push(shelf);
    }
}

/** A page of a row asked first at a time */
function toPage(connection: Raw, first: number, item: (u: Raw) => Item | null): Page<Item> {
    var page: Page<Item> = { items: parseAll(nodes(connection), item) };
    var next = nextAfter(connection, first);
    if (next !== undefined) {
        page.next = next;
    }
    return page;
}

/** The cursor after a page asked first at a time: its last edge's, while Twitch says more follow or the page came
 * full (Twitch's TV app asks on until a page comes empty) */
function nextAfter(connection: Raw, first: number): string | undefined {
    var edges: Raw[] = (connection && connection.edges) || [];
    var last = edges[edges.length - 1];
    var more = edges.length >= first || !!(connection && connection.pageInfo && connection.pageInfo.hasNextPage);
    return more && last && last.cursor ? last.cursor : undefined;
}

/** A followed channel that is not live (its stream null) */
function offlineItem(u: Raw): Item | null {
    return u.stream === null ? toOfflineItem(u) : null;
}
