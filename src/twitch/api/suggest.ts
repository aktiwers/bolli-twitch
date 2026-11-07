// Search suggestions as the text is typed, from Twitch's searchSuggestions field (the website's search tray asks it;
// a plain query with the TV app's client id answers it without the bot check): terms, categories with their box art
// and channels with their avatar and whether they are live, each with the part of its text the typed text matched.
// Answers are kept per typed text for a while, so Delete and typing the same again ask nothing.

import { Cache } from './cache.js';
import { gql } from './gql.js';
import { Channel, Game } from './types.js';
import { boxArtAt } from './pictures.js';
import { Raw, toChannel, toGame } from './parse.js';

var QUERY = 'query Suggest($text: String!) { searchSuggestions(queryFragment: $text) { edges { node { text matchingCharacters { start end }' +
    ' content { __typename ... on SearchSuggestionChannel { isLive user { id login displayName profileImageURL(width: 50) } }' +
    ' ... on SearchSuggestionCategory { game { id name displayName boxArtURL } } } } } } }';

/** The box art beside a category suggestion (Twitch's tray asks 60x80) */
var ART_WIDTH = 60;
/** Answers kept, and for how long */
var KEPT_MAX = 30;
var KEPT_MS = 5 * 60 * 1000;

/** A row of Search's list: a suggestion (a term, a category, a channel), or the list's own recent search and Clear
 * Recent Searches */
export interface Suggestion {
    /** What a search for it would ask (a term), or the category's or channel's name */
    text: string;
    kind: 'term' | 'game' | 'channel' | 'recent' | 'clear';
    /** The characters of text the typed text matched: [start, end) */
    start: number;
    end: number;
    game?: Game;
    channel?: Channel;
    live?: boolean;
    /** The small picture beside it: the category's box art or the channel's avatar ('' for a term) */
    picture: string;
}

var kept = new Cache<Suggestion[]>(KEPT_MS, KEPT_MS, KEPT_MAX);

/** Twitch's suggestions for the typed text (trimmed, any case) */
export function suggestions(text: string): Promise<Suggestion[]> {
    var key = text.trim().toLowerCase();
    return kept.get(key, function () {
        return gql<Raw>(QUERY, { text: key }).then(toSuggestions);
    });
}

export function toSuggestions(data: Raw): Suggestion[] {
    var edges = (data && data.searchSuggestions && data.searchSuggestions.edges) || [];
    var out: Suggestion[] = [];
    for (var i = 0; i < edges.length; i++) {
        var s = edges[i] && edges[i].node ? toSuggestion(edges[i].node) : null;
        if (s) {
            out.push(s);
        }
    }
    return out;
}

function toSuggestion(n: Raw): Suggestion | null {
    if (!n.text || typeof n.text !== 'string') {
        return null;
    }
    var m = n.matchingCharacters || {};
    var start = Math.max(0, Math.min(n.text.length, m.start || 0));
    var end = Math.max(start, Math.min(n.text.length, m.end || 0));
    var s: Suggestion = { text: n.text, kind: 'term', start: start, end: end, picture: '' };
    var c = n.content;
    var type = c && c.__typename;
    if (type === 'SearchSuggestionCategory') {
        var game = toGame(c.game);
        if (game) {
            s.kind = 'game';
            s.game = game;
            s.picture = boxArtAt(c.game.boxArtURL, ART_WIDTH);
        }
    } else if (type === 'SearchSuggestionChannel') {
        var channel = toChannel(c.user);
        if (channel) {
            s.kind = 'channel';
            s.channel = channel;
            s.live = !!c.isLive;
            s.picture = channel.avatar;
        }
    }
    return s;
}
