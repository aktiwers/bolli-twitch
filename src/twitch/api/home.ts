// Home's rows as Twitch's TV app shows them: the same shelves query, rows, order and tiles, but asked a few rows at
// a time (Twitch's shelves field pages with first/after) with only the fields our tiles and the hero draw, where
// Twitch's TV app asks all its rows with every tile's full fields at once, several times per Home load. The first
// page is kept a few minutes, so Following's empty state shows Home's rows without asking them again.

import { Cache } from './cache.js';
import { gql, platform, randomId } from './gql.js';
import { Item, Page, Shelf } from './types.js';
import { CATEGORY_FIELDS, PAGE_INFO, Raw, STREAM_FIELDS, TOP_STREAM, addShelf, nextCursor, nodes, oneReply, parseAll, toStream, withTopStream } from './parse.js';

/** Tiles per row, as Twitch's TV app asks */
var ITEMS_PER_ROW = 25;
/** The first page is shared this long */
var FIRST_MS = 5 * 60 * 1000;

var QUERY = 'query Home($first: Int, $after: Cursor, $itemsPerRow: Int!, $platform: String!, $requestID: String!) {' +
    ' shelves(first: $first, after: $after, itemsPerRow: $itemsPerRow, platform: $platform, requestID: $requestID) {' +
    ' edges { node { id title { fallbackLocalizedTitle localizedTitleTokens { node { __typename ... on Game { displayName name } ... on TextToken { text } } } }' +
    ' content { edges { node { __typename ... on Stream { ' + STREAM_FIELDS + ' } ... on Game { ' + CATEGORY_FIELDS + ' ' + TOP_STREAM + ' } } } } } } ' +
    PAGE_INFO + ' } }';

/** A first page and the request id its later pages go with */
interface First {
    page: Page<Shelf>;
    requestId: string;
}

var firstPages = new Cache<First>(FIRST_MS, FIRST_MS, 2);

/** count rows after a cursor (none: the first) */
export type ShelfLoader = (count: number, after?: string) => Promise<Page<Shelf>>;

/** Home's rows for one screen: its first page (shared while fresh) and the pages after it, all under the first
 * page's request id (Twitch makes one per Home load) */
export function homeLoader(): ShelfLoader {
    var requestId = '';
    return function (count: number, after?: string): Promise<Page<Shelf>> {
        if (after && requestId) {
            return shelves(count, after, requestId);
        }
        return firstPages.get(String(count), function () {
            var id = randomId(32);
            return shelves(count, undefined, id).then(function (page: Page<Shelf>) {
                return { page: page, requestId: id };
            });
        }).then(function (first: First) {
            requestId = first.requestId;
            return first.page;
        });
    };
}

function shelves(count: number, after: string | undefined, requestId: string): Promise<Page<Shelf>> {
    return gql<Raw>(QUERY, { first: count, after: after || null, itemsPerRow: ITEMS_PER_ROW, platform: platform(), requestID: requestId }).then(toShelves);
}

/** The rows of a shelves reply: tiles Twitch's TV app draws (live streams with a channel, categories), rows
 * without any left out, as Twitch's TV app does */
export var toShelves = oneReply(function (data: Raw): Page<Shelf> {
    var shelves = data && data.shelves;
    var rows = nodes(shelves);
    var out: Shelf[] = [];
    for (var i = 0; i < rows.length; i++) {
        addShelf(out, rows[i].id, shelfTitle(rows[i].title), parseAll(nodes(rows[i].content), toItem));
    }
    return { items: out, next: nextCursor(shelves) };
});

function toItem(raw: Raw): Item | null {
    if (raw.__typename === 'Stream') {
        var stream = toStream(raw);
        return stream ? { kind: 'stream', stream: stream } : null;
    }
    if (raw.__typename === 'Game') {
        var game = withTopStream(raw);
        return game ? { kind: 'game', game: game } : null;
    }
    return null;
}

/** A row's title as Twitch's TV app shows it on Home: its tokens' text and category names when every token is one
 * of those, else the fallback title; each word capitalised */
export function shelfTitle(title: Raw): string {
    var tokens: Raw[] = (title && title.localizedTitleTokens) || [];
    var words: string[] = [];
    for (var i = 0; i < tokens.length; i++) {
        var node = tokens[i] && tokens[i].node;
        if (node && node.__typename === 'Game') {
            words.push(node.displayName || node.name || '');
        } else if (node && node.__typename === 'TextToken') {
            words.push(node.text);
        }
    }
    if (!tokens.length || words.length !== tokens.length) {
        words = title && title.fallbackLocalizedTitle ? [title.fallbackLocalizedTitle] : [];
    }
    return words.join(' ').replace(/\s+/g, ' ').trim().replace(/(^|\s)(\S)/g, function (all: string, space: string, first: string) {
        return space + first.toUpperCase();
    });
}
