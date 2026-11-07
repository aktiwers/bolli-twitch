// A channel's page as Twitch's TV app shows it (header, live preview or latest video, the channel's video rows in
// Twitch's order and wording), what changes on the player's live line (title, category, uptime, viewers), which
// Twitch's TV app asks again every 60 s, and the content labels the player's gate names. No playback token here:
// the player asks its own with an ad-free player type.

import { gql, notFound } from './gql.js';
import { Channel, Item, LiveUpdate, Shelf, Stream, Video } from './types.js';
import { CHANNEL_FIELDS, GAME_FIELDS, GATE_FIELDS, HISTORY_FIELDS, Raw, STREAM_TILE, VIDEO_PICTURE, addShelf, nodes, oneReply, parseAll,
    toChannel, toClip, toLive, toVideo } from './parse.js';

/** A clip among a row's videos: Clip and Video type title, viewCount and createdAt differently (String! and String),
 * which GraphQL refuses in one list, so the clip's come under other names */
var CLIP_IN_ROW = 'slug clipTitle: title thumbnailURL durationSeconds clipViews: viewCount clipCreatedAt: createdAt game { ' + GAME_FIELDS + ' }';

/** The live stream as the channel page and the player draw it */
var LIVE = 'stream { ' + STREAM_TILE + ' }';

var PAGE = 'query ChannelPage($login: String!, $me: Boolean!) { user(login: $login) { ' + CHANNEL_FIELDS + ' ' + LIVE +
    ' videos(first: 1, sort: TIME) { edges { node { ' + VIDEO_PICTURE + ' ' + GATE_FIELDS + ' } } }' +
    ' videoShelves { edges { node { id title items { __typename ... on Video { ' + VIDEO_PICTURE + ' ' + HISTORY_FIELDS + ' ' + GATE_FIELDS +
    ' } ... on Clip { ' + CLIP_IN_ROW + ' ' + GATE_FIELDS + ' } } } } } } }';

/** The player's line, asked again every minute: only what changes while live (no stream: it ended) */
var LIVE_INFO = 'query LiveInfo($login: String!) { user(login: $login) { stream { id title viewersCount createdAt game { id name displayName } } } }';

/** The gate's labels and Twitch's gate kind, asked only for a gated stream, video or clip */
var GATE_LABELS = 'contentClassificationLabels { localizedName } contentClassificationLabelPolicyProperties { contentGateProperties { contentGate } }';
var GATE_QUERIES: { [kind: string]: string } = {
    live: 'query GateLabels($id: String!) { user(login: $id) { stream { ' + GATE_LABELS + ' } } }',
    vod: 'query GateLabels($id: ID!) { video(id: $id) { ' + GATE_LABELS + ' } }',
    clip: 'query GateLabels($id: ID!) { clip(slug: $id) { ' + GATE_LABELS + ' } }'
};

/** What the gate says: the labels' names, and Twitch's gate kind ('' when it has none) */
export interface GateInfo {
    labels: string[];
    gate: string;
}

export interface ChannelPage {
    channel: Channel;
    /** The live stream, or null when offline */
    stream: Stream | null;
    /** Its rows: live, Recent broadcasts / Recent highlights and uploads / All videos; offline, Featured Clips first */
    shelves: Shelf[];
    /** The newest video: what "Watch Latest Video" plays on an offline channel, and its preview */
    latest: Video | null;
}

/** Rejects with notFound() when there is no such channel */
export function channelPage(login: string): Promise<ChannelPage> {
    return gql<Raw>(PAGE, { login: login }).then(toChannelPage);
}

/** What changed on the player's live line; null when the channel is offline (or gone) */
export function liveInfo(login: string): Promise<LiveUpdate | null> {
    return gql<Raw>(LIVE_INFO, { login: login }).then(function (data: Raw) {
        return toLiveUpdate(data && data.user && data.user.stream);
    });
}

function toLiveUpdate(s: Raw): LiveUpdate | null {
    if (!s || !s.id) {
        return null;
    }
    var update: LiveUpdate = { id: s.id, title: s.title || '', viewers: s.viewersCount || 0 };
    if (s.createdAt) {
        update.startedAt = s.createdAt;
    }
    if (s.game && s.game.id && s.game.name) {
        update.game = { id: s.game.id, name: s.game.name, displayName: s.game.displayName || s.game.name };
    }
    return update;
}

export var toChannelPage = oneReply(function (data: Raw): ChannelPage {
    var user = data && data.user;
    var channel = toChannel(user);
    if (!channel) {
        throw notFound();
    }
    var owner = channel;
    var toItem = function (raw: Raw): Item | null {
        return toShelfItem(raw, owner);
    };
    var shelves: Shelf[] = [];
    var rows = nodes(user.videoShelves);
    for (var i = 0; i < rows.length; i++) {
        addShelf(shelves, rows[i].id, rows[i].title || '', parseAll(rows[i].items, toItem));
    }
    var newest = nodes(user.videos)[0];
    return {
        channel: channel,
        stream: toLive(user),
        shelves: shelves,
        latest: newest ? toVideo(newest, channel) : null
    };
});

function toShelfItem(raw: Raw, channel: Channel): Item | null {
    if (raw.__typename === 'Video') {
        var video = toVideo(raw, channel);
        return video ? { kind: 'video', video: video } : null;
    }
    if (raw.__typename === 'Clip') {
        raw.title = raw.clipTitle;
        raw.viewCount = raw.clipViews;
        raw.createdAt = raw.clipCreatedAt;
        var clip = toClip(raw, channel);
        return clip ? { kind: 'clip', clip: clip } : null;
    }
    return null;
}

/** The gate's labels for a live channel (its login), a video (id) or a clip (slug) */
export function gateInfo(kind: 'live' | 'vod' | 'clip', id: string): Promise<GateInfo> {
    return gql<Raw>(GATE_QUERIES[kind], { id: id }).then(function (data: Raw) {
        var item = data && (kind === 'live' ? data.user && data.user.stream : kind === 'vod' ? data.video : data.clip);
        var labels: string[] = [];
        var list = (item && item.contentClassificationLabels) || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i] && list[i].localizedName) {
                labels.push(list[i].localizedName);
            }
        }
        var p = item && item.contentClassificationLabelPolicyProperties;
        var gate = (p && p.contentGateProperties && p.contentGateProperties.contentGate) || '';
        return { labels: labels, gate: gate };
    });
}
