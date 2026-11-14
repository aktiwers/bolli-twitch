// A past broadcast's chat as Twitch keeps it: the messages from a second of the video on, or those after a cursor,
// a page at a time (some 25 s of a busy chat). Each comes as the IRC line the live chat would have had (chat/irc.ts),
// so the chat panel draws it as it draws live chat: its text, Twitch's emotes at their places (code point positions,
// as IRC counts them), its badges, colour and sender.

import { IrcLine } from '../chat/irc.js';
import { gql } from './gql.js';
import { lastCursor, Raw, nodes, parseAll } from './parse.js';

/** A message and the second of the video it was sent at */
export interface Comment {
    at: number;
    line: IrcLine;
}

/** A page of messages in the video's order; next: the cursor of the following page ('' at the end) */
export interface CommentPage {
    comments: Comment[];
    next: string;
}

var QUERY = 'query VideoComments($id: ID!, $offset: Int, $cursor: Cursor) { video(id: $id) { comments(contentOffsetSeconds: $offset, after: $cursor) {' +
    ' edges { cursor node { id createdAt contentOffsetSeconds commenter { id login displayName }' +
    ' message { fragments { text emote { emoteID } } userBadges { setID version } userColor } } } pageInfo { hasNextPage } } } }';

/** The messages from offset (s) on, or after cursor; login: the channel's (the lines' channel) */
export function videoComments(videoId: string, login: string, from: { offset?: number; cursor?: string }): Promise<CommentPage> {
    var variables: { [name: string]: unknown } = { id: videoId };
    if (from.cursor) {
        variables.cursor = from.cursor;
    } else {
        variables.offset = Math.max(0, Math.floor(from.offset || 0));
    }
    return gql<Raw>(QUERY, variables).then(function (data: Raw): CommentPage {
        var page = data && data.video && data.video.comments;
        return {
            comments: parseAll(nodes(page), function (node: Raw) { return commentOf(node, login); }),
            next: lastCursor(page) || ''
        };
    });
}

/** A message as its IRC line; null without a sender (an account Twitch removed) or a text */
export function commentOf(node: Raw, login: string): Comment | null {
    var by = node.commenter;
    var message = node.message;
    if (!by || !by.login || !message || typeof node.contentOffsetSeconds !== 'number') {
        return null;
    }
    var text = '';
    /** Code points so far, and the emotes tag's groups by emote */
    var points = 0;
    var spans: { [id: string]: string[] } = {};
    var order: string[] = [];
    var fragments: Raw[] = message.fragments || [];
    for (var i = 0; i < fragments.length; i++) {
        var words = String(fragments[i].text || '');
        var length = codePoints(words);
        var emote = fragments[i].emote && fragments[i].emote.emoteID;
        if (emote && length) {
            if (!spans[emote]) {
                spans[emote] = [];
                order.push(emote);
            }
            spans[emote].push(points + '-' + (points + length - 1));
        }
        text += words;
        points += length;
    }
    if (!text) {
        return null;
    }
    var badges = parseAll<string>(message.userBadges, function (b: Raw) {
        return b.setID && b.version ? b.setID + '/' + b.version : null;
    });
    var tags: { [name: string]: string } = {
        id: String(node.id || ''), login: by.login, 'display-name': by.displayName || '', color: message.userColor || '', badges: badges.join(','),
        emotes: order.map(function (id) { return id + ':' + spans[id].join(','); }).join('/')
    };
    if (by.id) {
        tags['user-id'] = by.id;
    }
    var sent = Date.parse(node.createdAt);
    if (sent) {
        tags['tmi-sent-ts'] = String(sent);
    }
    return { at: node.contentOffsetSeconds, line: { tags: tags, prefix: by.login + '!' + by.login + '@' + by.login + '.tmi.twitch.tv', command: 'PRIVMSG', params: ['#' + login, text] } };
}

/** The text's length in code points (a character outside the BMP is one) */
function codePoints(text: string): number {
    var n = 0;
    for (var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i);
        if (c < 0xd800 || c > 0xdbff || i + 1 >= text.length) {
            n++;
        }
    }
    return n;
}
