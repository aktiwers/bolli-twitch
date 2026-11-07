// A category page: its header (box art, name, viewers, followers, Follow state when signed in) and its live streams
// in Twitch's order, 24 first and 16 per page after that. Twitch's TV app asks the same game(name).streams field
// (GameDirectory_Query) but with self.follow even for a guest, which Twitch answers with an "unauthenticated"
// error beside the data; we ask the Follow state only signed in, and the header only with the first page. The
// streams leave out their category: it is this one.

import { gql, notFound } from './gql.js';
import { Game, Page, Stream } from './types.js';
import { PAGE_INFO, Raw, STREAM_PICTURE, USER_FIELDS, bareGame, nextCursor, nodes, parseAll, toGame, toStream } from './parse.js';
import { pageVariables } from './browse.js';

var QUERY = 'query Category($name: String!, $first: Int, $after: Cursor, $options: GameStreamOptions, $me: Boolean!, $header: Boolean!) {' +
    ' game(name: $name) { id name displayName ... @include(if: $header) { boxArtURL viewersCount followersCount self @include(if: $me) { follow { followedAt } } }' +
    ' streams(first: $first, after: $after, options: $options) { edges { node { ' + STREAM_PICTURE + ' broadcaster { ' + USER_FIELDS + ' } } } ' +
    PAGE_INFO + ' } } }';

/** Each category's header from its first page, and the game its streams carry, by game id: later pages come
 * without it, and more than one category page may be alive */
var headers: { [id: string]: { game: Game; own: Game } } = {};

/** The category (by its name, any case) and its first streams, or its streams after a cursor from an earlier page
 * (the game then as its first page gave it). Rejects with notFound() when Twitch has no such category */
export function gameStreams(name: string, after?: string): Promise<{ game: Game; streams: Page<Stream> }> {
    var variables = pageVariables('SST-GAME-DIRECTORY', after);
    variables.name = name;
    variables.header = !after;
    return gql<Raw>(QUERY, variables).then(toCategory);
}

export function toCategory(data: Raw): { game: Game; streams: Page<Stream> } {
    var raw = data && data.game;
    var game = toGame(raw);
    if (!game) {
        throw notFound();
    }
    var header = headers[game.id];
    if ('boxArtURL' in raw || !header) {
        header = headers[game.id] = { game: game, own: bareGame(game) };
    }
    var own = header.own;
    var streams = parseAll(nodes(raw.streams), function (s: Raw) {
        var stream = toStream(s);
        if (stream) {
            stream.game = own;
        }
        return stream;
    });
    return { game: header.game, streams: { items: streams, next: nextCursor(raw.streams) } };
}
