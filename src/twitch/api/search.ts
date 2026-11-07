// Search results as Twitch's TV app shows them: Channels (live ones as stream tiles, offline ones as channel tiles
// with when they were last live and their followers, and their banner for the hero), the related live streams, Games
// and Past Videos, from the same searchFor field with the TV platform, asked once (Twitch's TV app sends it twice per
// results page).

import { gql, platform } from './gql.js';
import { Game, Item, Stream, Video } from './types.js';
import { CATEGORY_FIELDS, GATE_FIELDS, HISTORY_FIELDS, LIVE_CHANNEL, Raw, TOP_STREAM, VIDEO_FIELDS, liveItem, oneReply, parseAll, toLive, toOfflineItem, toVideo,
    withTopStream } from './parse.js';

var QUERY = 'query Search($term: String!, $platform: String!, $me: Boolean!) { searchFor(userQuery: $term, platform: $platform) {' +
    ' channels { items { ' + LIVE_CHANNEL + ' bannerImageURL followers { totalCount } lastBroadcast { startedAt } } }' +
    ' relatedLiveChannels { items { ' + LIVE_CHANNEL + ' } }' +
    ' games { items { ' + CATEGORY_FIELDS + ' ' + TOP_STREAM + ' } }' +
    ' videos { items { ' + VIDEO_FIELDS + ' ' + HISTORY_FIELDS + ' ' + GATE_FIELDS + ' } } } }';

export interface SearchResults {
    channels: Item[];
    related: Stream[];
    games: Game[];
    videos: Video[];
}

export function search(term: string): Promise<SearchResults> {
    return gql<Raw>(QUERY, { term: term, platform: platform() }).then(toResults);
}

export var toResults = oneReply(function (data: Raw): SearchResults {
    var s = (data && data.searchFor) || {};
    return {
        channels: parseAll(items(s.channels), channelItem),
        related: parseAll(items(s.relatedLiveChannels), toLive),
        games: parseAll(items(s.games), withTopStream),
        videos: parseAll(items(s.videos), toVideo)
    };
});

/** A live channel as a stream tile, an offline one as a channel tile */
function channelItem(u: Raw): Item | null {
    return liveItem(u) || toOfflineItem(u);
}

function items(list: Raw): Raw[] {
    return (list && list.items) || [];
}
