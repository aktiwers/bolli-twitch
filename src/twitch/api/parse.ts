// The fields our tiles draw, asked once here for every query (Twitch's TV app asks about twice as many per tile),
// and the parsers that turn Twitch's reply objects into api/types.ts. The parsers read exactly the fields asked
// here; one gives null for an item it cannot draw (Twitch's TV app skips those too). A channel's or category's
// Follow state goes to the follow store as it is parsed.

import { Channel, Clip, Game, Item, Shelf, Stream, Video } from './types.js';
import { noteFollow } from './follow.js';
import { boxArt, preview, videoPreview } from './pictures.js';

/** A channel on a stream tile: name and the 50x50 avatar */
export var USER_FIELDS = 'id login displayName profileImageURL(width: 50)';
export var GAME_FIELDS = 'id name displayName boxArtURL';
/** A category tile: box art, name, viewers */
export var CATEGORY_FIELDS = GAME_FIELDS + ' viewersCount';
/** Where a long list goes on (nextCursor) */
export var PAGE_INFO = 'pageInfo { hasNextPage endCursor }';
/** Twitch's content gate for a channel, video or clip ("Just one second..." before it plays) */
export var GATE_FIELDS = 'contentClassificationLabelPolicyProperties { contentGateProperties { contentGate } signPostProperties { signPost } }';
/** A stream's own part of its tile: picture (and whether it is portrait), title, viewers; when it began and its
 * content gate, for the player it opens */
export var STREAM_PICTURE = 'id title viewersCount previewImageURL width height isDualFormat createdAt ' + GATE_FIELDS;
/** A stream tile under its channel: the picture part and the category */
export var STREAM_TILE = STREAM_PICTURE + ' game { ' + GAME_FIELDS + ' }';
/** A stream tile with its channel (the hero adds the category's box art) */
export var STREAM_FIELDS = STREAM_TILE + ' broadcaster { ' + USER_FIELDS + ' }';
/** A channel with its stream when live (toLive) */
export var LIVE_CHANNEL = USER_FIELDS + ' stream { ' + STREAM_TILE + ' }';
/** A category's top stream, for the hero while its tile has focus: picture, title, channel, viewers (withTopStream) */
export var TOP_STREAM = 'topStream: streams(first: 1) { edges { node { ' + STREAM_PICTURE + ' broadcaster { id login displayName } } } }';
/** A past broadcast tile without its channel (under a channel): picture, title, date, views, length, category */
export var VIDEO_PICTURE = 'id title previewThumbnailURL lengthSeconds viewCount createdAt broadcastType game { ' + GAME_FIELDS + ' }';
/** A past broadcast tile */
export var VIDEO_FIELDS = VIDEO_PICTURE + ' owner { id login displayName }';
/** A clip tile without its channel (Twitch draws clip tiles as video tiles) */
export var CLIP_PICTURE = 'slug title thumbnailURL durationSeconds viewCount createdAt game { ' + GAME_FIELDS + ' }';
/** Signed in: where the account stopped watching a video (asked only signed in: a guest has no history) */
export var HISTORY_FIELDS = 'self @include(if: $me) { viewingHistory { position } }';
/** Signed in: whether the account follows the channel (the Follow button) */
export var FOLLOW_FIELDS = 'self @include(if: $me) { follower { followedAt } }';
/** The channel page's header: description, followers, colour, the Follow state */
export var CHANNEL_FIELDS = USER_FIELDS + ' description primaryColorHex followers { totalCount } ' + FOLLOW_FIELDS;

/** A reply object from Twitch, read field by field */
export type Raw = any;

/** The games of the reply being parsed, by id (oneReply) */
var replyGames: { [id: string]: Game } | null = null;

/** A reply's parser whose tiles share one Game object per category (a category on many tiles is one object) */
export function oneReply<T>(parse: (data: Raw) => T): (data: Raw) => T {
    return function (data: Raw): T {
        var outer = replyGames;
        replyGames = outer || {};
        try {
            return parse(data);
        } finally {
            replyGames = outer;
        }
    };
}

/** The reply's one object for this category: this one when it is the first */
function shared(game: Game): Game {
    if (!replyGames) {
        return game;
    }
    return replyGames[game.id] || (replyGames[game.id] = game);
}

/** fn(item) for each item, without the empty items and the ones fn cannot draw */
export function parseAll<T>(list: Raw[] | null | undefined, fn: (item: Raw) => T | null): T[] {
    var out: T[] = [];
    for (var i = 0; list && i < list.length; i++) {
        var x = list[i] ? fn(list[i]) : null;
        if (x) {
            out.push(x);
        }
    }
    return out;
}

/** A row, when it has tiles (Twitch's TV app leaves empty rows out) */
export function addShelf(shelves: Shelf[], id: string, title: string, items: Item[]): void {
    if (items.length) {
        shelves.push({ id: id, title: title, items: items });
    }
}

export function toChannel(u: Raw): Channel | null {
    if (!u || !u.id || !u.login) {
        return null;
    }
    var c: Channel = { id: u.id, login: u.login, displayName: u.displayName || u.login, avatar: u.profileImageURL || '' };
    if (u.description) {
        c.description = u.description;
    }
    if (u.followers && typeof u.followers.totalCount === 'number') {
        c.followers = u.followers.totalCount;
    }
    if (u.primaryColorHex) {
        c.color = '#' + u.primaryColorHex;
    }
    if (u.bannerImageURL) {
        c.banner = u.bannerImageURL;
    }
    if (u.self !== undefined) {
        c.followed = !!(u.self && u.self.follower && u.self.follower.followedAt);
        noteFollow('channel', c.id, c.followed);
    }
    return c;
}

/** A category tile: box art and name; viewers, followers and the Follow state where the query asks them */
export function toGame(g: Raw): Game | null {
    if (!g || !g.id || !g.name) {
        return null;
    }
    var game: Game = { id: g.id, name: g.name, displayName: g.displayName || g.name, boxArt: boxArt(g.boxArtURL) };
    if (typeof g.viewersCount === 'number') {
        game.viewers = g.viewersCount;
    }
    if (typeof g.followersCount === 'number') {
        game.followers = g.followersCount;
    }
    if (g.self !== undefined) {
        game.followed = !!(g.self && g.self.follow && g.self.follow.followedAt);
        noteFollow('game', game.id, game.followed);
    }
    return game;
}

/** The fields every game has, without a tile's own (viewers, followers, top stream, Follow state) */
export function bareGame(game: Game): Game {
    return { id: game.id, name: game.name, displayName: game.displayName, boxArt: game.boxArt };
}

/** The category of a stream, video, clip or last broadcast (GAME_FIELDS), shared within the reply */
function gameOf(g: Raw): Game | null {
    var known = g && replyGames ? replyGames[g.id] : undefined;
    if (known) {
        return known;
    }
    var game = toGame(g);
    return game ? shared(game) : null;
}

/** A category tile with its top live stream for the hero, where the query asks it (TOP_STREAM) */
export function withTopStream(g: Raw): Game | null {
    var game = toGame(g);
    var stream = game ? toStream(nodes(g.topStream)[0]) : null;
    if (game && stream) {
        stream.game = shared(bareGame(game));
        game.topStream = stream;
    }
    return game;
}

/** Marks what Twitch gates before it plays: mature for its mature sign post, and mature and restricted for a content
 * gate (age, region, an account's limits), which only Twitch's gate decides (the mature content warning setting
 * never passes it) */
export function markGate(to: { mature?: boolean; restricted?: boolean }, item: Raw): void {
    var p = item && item.contentClassificationLabelPolicyProperties;
    if (!p) {
        return;
    }
    var gate = p.contentGateProperties && p.contentGateProperties.contentGate;
    var sign = p.signPostProperties && p.signPostProperties.signPost;
    if (gate && gate !== 'CONTENT_GATE_NOT_REQUIRED') {
        to.mature = true;
        to.restricted = true;
    } else if (sign === 'SIGN_POST_TYPE_MATURE') {
        to.mature = true;
    }
}

/** A live stream; its channel from the stream's broadcaster, or from owner when the stream sits under a user.
 * Null for no stream (an offline channel) */
export function toStream(s: Raw, owner?: Raw): Stream | null {
    var channel = s ? toChannel(s.broadcaster || owner) : null;
    if (!s || !s.id || !channel) {
        return null;
    }
    var stream: Stream = {
        id: s.id,
        channel: channel,
        title: s.title || '',
        viewers: s.viewersCount || 0,
        preview: preview(s.previewImageURL)
    };
    var game = gameOf(s.game);
    if (game) {
        stream.game = game;
    }
    if (s.createdAt) {
        stream.startedAt = s.createdAt;
    }
    markGate(stream, s);
    if (s.height > s.width && s.isDualFormat === false) {
        stream.vertical = true;
    }
    return stream;
}

/** A channel's stream (LIVE_CHANNEL), or null when it is offline */
export function toLive(u: Raw): Stream | null {
    return toStream(u.stream, u);
}

/** A live channel as a stream tile */
export function liveItem(u: Raw): Item | null {
    var stream = toLive(u);
    return stream ? { kind: 'stream', stream: stream } : null;
}

/** An offline channel tile: when its last broadcast began and what it played, where the query asks them */
export function toOfflineItem(u: Raw): Item | null {
    var channel = toChannel(u);
    if (!channel) {
        return null;
    }
    var item: Item = { kind: 'channel', channel: channel, live: false };
    var last = u.lastBroadcast;
    if (last && last.startedAt) {
        item.lastLive = last.startedAt;
    }
    var lastGame = last ? gameOf(last.game) : null;
    if (lastGame) {
        item.lastGame = lastGame;
    }
    return item;
}

var KINDS: { [type: string]: 'archive' | 'highlight' | 'upload' } = { ARCHIVE: 'archive', HIGHLIGHT: 'highlight', UPLOAD: 'upload' };

/** A past broadcast; its channel from owner, or the channel it sits under */
export function toVideo(v: Raw, owner?: Channel): Video | null {
    var channel = v ? owner || toChannel(v.owner) : null;
    if (!v || !v.id || !channel) {
        return null;
    }
    var video: Video = {
        id: v.id,
        title: v.title || '',
        channel: channel,
        preview: videoPreview(v.previewThumbnailURL),
        lengthSeconds: v.lengthSeconds || 0,
        views: v.viewCount || 0,
        publishedAt: v.createdAt || '',
        kind: KINDS[v.broadcastType] || 'archive'
    };
    var game = gameOf(v.game);
    if (game) {
        video.game = game;
    }
    var history = v.self && v.self.viewingHistory;
    if (history && typeof history.position === 'number') {
        video.position = history.position;
    }
    markGate(video, v);
    return video;
}

/** A clip; its channel from broadcaster, or the channel it sits under */
export function toClip(c: Raw, owner?: Channel): Clip | null {
    var channel = c ? owner || toChannel(c.broadcaster) : null;
    if (!c || !c.slug || !channel) {
        return null;
    }
    var clip: Clip = {
        slug: c.slug,
        title: c.title || '',
        channel: channel,
        thumbnail: videoPreview(c.thumbnailURL),
        durationSeconds: c.durationSeconds || 0,
        views: c.viewCount || 0,
        createdAt: c.createdAt || ''
    };
    var game = gameOf(c.game);
    if (game) {
        clip.game = game;
    }
    if (c.video && c.video.id) {
        clip.videoId = c.video.id;
        clip.videoOffset = c.videoOffsetSeconds || 0;
    }
    markGate(clip, c);
    return clip;
}

function edgeNode(edge: Raw): Raw {
    return edge.node || null;
}

/** The nodes of a connection's edges, without the empty ones */
export function nodes(connection: Raw): Raw[] {
    return parseAll<Raw>(connection && connection.edges, edgeNode);
}

/** A connection's next-page cursor (PAGE_INFO), or undefined at its end */
export function nextCursor(connection: Raw): string | undefined {
    var info = connection && connection.pageInfo;
    return info && info.hasNextPage && info.endCursor ? info.endCursor : undefined;
}
