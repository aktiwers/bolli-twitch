// Browse: Twitch's category grid in Twitch's order (games sorted by relevance for the TV platform), 24 first and
// 16 per page after that, as Twitch's TV app asks them.

import { gql, platform } from './gql.js';
import { Game, Page } from './types.js';
import { CATEGORY_FIELDS, PAGE_INFO, Raw, nextCursor, nodes, parseAll, toGame } from './parse.js';

var FIRST = 24;
var MORE = 16;

var QUERY = 'query Browse($first: Int, $after: Cursor, $options: GameOptions) {' +
    ' games(first: $first, after: $after, options: $options) { edges { node { ' + CATEGORY_FIELDS + ' } } ' + PAGE_INFO + ' } }';

/** The paging variables of Browse and a category page as Twitch's TV app sends them: 24 first, 16 per page after a
 * cursor, Twitch's order for the TV platform under the TV app's request id for that page */
export function pageVariables(requestId: string, after?: string): { [name: string]: unknown } {
    return {
        first: after ? MORE : FIRST,
        after: after || null,
        options: { recommendationsContext: { platform: platform() }, requestID: requestId, sort: 'RELEVANCE' }
    };
}

/** The first page of categories, or the page after a cursor from an earlier page */
export function browseGames(after?: string): Promise<Page<Game>> {
    return gql<Raw>(QUERY, pageVariables('SST-GAMES-DIRECTORY', after)).then(toGames);
}

export function toGames(data: Raw): Page<Game> {
    var games = data && data.games;
    return { items: parseAll(nodes(games), toGame), next: nextCursor(games) };
}
