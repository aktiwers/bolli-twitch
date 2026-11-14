// Latest Broadcasts: the past broadcasts of all favorites as one list, the newest first, going on for as long as the
// viewer does. It starts from what the favorites' answer has of each channel (api/favorites-feed.ts: its newest few
// and the cursor the older ones follow), and each channel goes on from its own cursor, a few channels per request, so
// nothing held is asked again. Only what is certain is in the list: a past broadcast shows once no channel can still
// have a newer one that was not asked for. The channels whose oldest one held is newest stand in the way, so they are
// asked next. The list only grows at its end while more is asked; a new answer about the favorites puts their new
// past broadcasts on top. Channels that join after the list ran out (the favorites' next batch, latestJoin()) come
// in a later wave: their past broadcasts follow the earlier waves' once those have no more, so the list still only
// grows at its end.

import { onAccountChange } from './auth.js';
import { Favorite } from './favorites.js';
import { FavoriteState, VIDEOS_PAGE, latestVideos, videosNext } from './favorites-feed.js';
import { gql } from './gql.js';
import { Listeners } from './listeners.js';
import { Raw, nodes, oneReply, parseAll, toVideo } from './parse.js';
import { Channel, Video } from './types.js';

/** Channels asked in one request, the past broadcasts asked of each, and how many more of them one call for more
 * puts in the list (three rows of the tab's grid) */
var CHANNELS = 6;
var PAGE = 10;
var MORE = 12;

/** A channel's past broadcasts as far as they are held, the newest first; the cursor the older ones follow (none:
 * these are all); pages: how many were asked beyond the favorites' answer */
interface Source {
    channel: Channel;
    videos: Video[];
    next?: string;
    pages: number;
    /** Its wave: the list has every past broadcast of the earlier waves before any of this one's */
    wave: number;
}

/** What Latest Broadcasts shows now, the newest first; more: the channels have older ones than these */
export interface Latest {
    videos: Video[];
    more: boolean;
}

var sources: { [id: string]: Source } = {};
/** The wave channels new to the list join */
var joining = 0;
var asking: Promise<void> | null = null;
var listeners = new Listeners<[]>();

function timeOf(v: Video): number {
    return Date.parse(v.publishedAt) || 0;
}

function idsOf(videos: Video[]): { [id: string]: boolean } {
    var ids: { [id: string]: boolean } = {};
    for (var i = 0; i < videos.length; i++) {
        ids[videos[i].id] = true;
    }
    return ids;
}

/** The favorites and Twitch's last answer about them: each channel starts from its past broadcasts there. One that
 * went on from an earlier answer keeps what it holds, with the answer's new ones before them; where the answer has
 * none of those it holds (many new ones, or all gone), it starts again from the answer. Channels no longer in the
 * list, or not answered for yet, are not in it. A channel's record is changed in place, so a page asked for it
 * meanwhile is still taken when it goes on from the same cursor */
export function seedLatest(list: Favorite[], known: { [id: string]: FavoriteState }): void {
    var now: { [id: string]: Source } = {};
    for (var i = 0; i < list.length; i++) {
        var state = known[list[i].id];
        if (!state) {
            continue;
        }
        var source = sources[list[i].id] || { channel: state.channel, videos: [], pages: 0, wave: joining };
        var held = source.pages ? idsOf(source.videos) : null;
        var fresh = held ? state.videos.filter(function (v) { return !(held as { [id: string]: boolean })[v.id]; }) : [];
        source.channel = state.channel;
        if (held && fresh.length < state.videos.length) {
            source.videos = fresh.concat(source.videos);
        } else {
            source.videos = state.videos;
            source.next = state.more;
            source.pages = 0;
        }
        now[list[i].id] = source;
    }
    sources = now;
}

/** Channels new to the list from now on come after what it has (the favorites' next batch, asked once the list ran
 * out) */
export function latestJoin(): void {
    for (var id in sources) {
        joining = Math.max(joining, sources[id].wave + 1);
    }
}

/** The channels of the first wave with older past broadcasts to ask for, the one whose oldest held is newest first:
 * that one stands in the list's way */
function waiting(): Source[] {
    var out: Source[] = [];
    var wave = Infinity;
    for (var id in sources) {
        if (sources[id].next) {
            wave = Math.min(wave, sources[id].wave);
        }
    }
    for (var k in sources) {
        if (sources[k].next && sources[k].wave === wave) {
            out.push(sources[k]);
        }
    }
    return out.sort(function (a, b) { return oldestOf(b) - oldestOf(a); });
}

/** Whether any channel has older past broadcasts to ask for (cheap: no sorting, for every key press in the grid) */
export function latestHasMore(): boolean {
    for (var id in sources) {
        if (sources[id].next) {
            return true;
        }
    }
    return false;
}

/** When a channel's oldest past broadcast held was made: its older ones are all from before that */
function oldestOf(s: Source): number {
    return s.videos.length ? timeOf(s.videos[s.videos.length - 1]) : Infinity;
}

/** The list as far as it is certain, wave by wave: each wave's past broadcasts merged; the first wave with more to
 * ask for has every one held that is no older than the oldest one held of its channels that have more, and ends the
 * list */
export function latest(): Latest {
    var waves: Source[][] = [];
    for (var id in sources) {
        var w = sources[id].wave;
        (waves[w] || (waves[w] = [])).push(sources[id]);
    }
    var first = waiting()[0];
    var out: Video[] = [];
    for (var i = 0; i < waves.length; i++) {
        if (!waves[i]) {
            continue;
        }
        var sorted = latestVideos(waves[i], Infinity);
        if (first && first.wave === i) {
            var horizon = oldestOf(first);
            var n = 0;
            while (n < sorted.length && timeOf(sorted[n]) >= horizon) {
                n++;
            }
            return { videos: out.concat(sorted.slice(0, n)), more: true };
        }
        out = out.concat(sorted);
    }
    return { videos: out, more: false };
}

/** listener() whenever more past broadcasts came; returns the function that stops it */
export function onLatest(listener: () => void): () => void {
    return listeners.on(listener);
}

/** Asks for older past broadcasts until the list is MORE longer or has them all: the channels in its way first,
 * CHANNELS per request, one request at a time (a call while one is out joins it). Listeners hear each answer.
 * Settles when done; a request that fails ends it, and the next call asks again */
export function moreLatest(): Promise<void> {
    if (!asking) {
        var target = latest().videos.length + MORE;
        var done = function (): void { asking = null; };
        var step = function (): Promise<void> | undefined {
            var due = latest().videos.length < target ? waiting().slice(0, CHANNELS) : [];
            return due.length ? askPages(due).then(function () {
                listeners.tell();
                return step();
            }) : undefined;
        };
        asking = Promise.resolve().then(step).then(done, done);
    }
    return asking;
}

/** One request for the next page of each of these channels, from its cursor */
function askPages(due: Source[]): Promise<void> {
    var declared = '$first: Int!, $me: Boolean!';
    var fields = '';
    var variables: { [name: string]: unknown } = { first: PAGE };
    for (var i = 0; i < due.length; i++) {
        declared += ', $id' + i + ': ID!, $after' + i + ': Cursor';
        fields += ' c' + i + ': user(id: $id' + i + ') { id videos(first: $first, after: $after' + i + ', type: ARCHIVE, sort: TIME) { ' + VIDEOS_PAGE + ' } }';
        variables['id' + i] = due[i].channel.id;
        variables['after' + i] = due[i].next;
    }
    var asked = due.map(function (s) { return s.next; });
    return gql<Raw>('query FavoriteVideos(' + declared + ') {' + fields + ' }', variables).then(oneReply(function (data: Raw): void {
        for (var k = 0; k < due.length; k++) {
            var source = due[k];
            // (a channel that started again from a new answer meanwhile goes on from there)
            if (sources[source.channel.id] === source && source.next === asked[k]) {
                take(source, data && data['c' + k]);
            }
        }
    }));
}

/** A channel's next page (null: Twitch no longer has the channel): its past broadcasts not held yet go after the
 * ones held. A page that brings none ends the channel, whatever it says of more */
function take(source: Source, user: Raw): void {
    var page = user && user.videos;
    var held = idsOf(source.videos);
    var fresh = parseAll(nodes(page), function (v: Raw) { return toVideo(v, source.channel); }).filter(function (v) { return !held[v.id]; });
    source.videos = source.videos.concat(fresh);
    source.next = fresh.length ? videosNext(page) : undefined;
    source.pages++;
}

// Past broadcasts carry where the account stopped: another account's start again from its answer
onAccountChange(function () {
    sources = {};
    joining = 0;
});

/** Forgets every channel (the tests) */
export function forgetLatest(): void {
    sources = {};
    joining = 0;
    asking = null;
}
