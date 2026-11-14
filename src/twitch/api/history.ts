// The viewer's watch history, kept on the device (Settings > Watch History): the channels watched live (with the
// broadcast's recording once known: its tile once the stream ended) and the past broadcasts watched, the newest first,
// at most KEPT, each with what its tile draws, so the Continue Watching row and the History page draw at once from it.
// A player notes what it plays once its picture first moves. Which channels are live now, and the recordings as their
// tiles draw them, is asked when the row or the page shows (one query for all, with Favorites' fields), again only when
// the last answer is older than STALE_MS or something came in since that it was not asked for; the last answer is kept
// on the device too, so a start draws it until the new one comes. With Watch History off it is only not shown: it is
// still kept and noted, so it is all there when it is shown again.

import { load, loadText, save } from '../../core/store.js';
import { STATE_FIELDS, toFavoriteStates, FavoriteState } from './favorites-feed.js';
import { gql } from './gql.js';
import { Listeners } from './listeners.js';
import { Raw, toVideo, VIDEO_PICTURE } from './parse.js';
import { Channel, Recording, Video } from './types.js';

/** Where it shows: a row at the top of Favorites, a page of its own in the menu, or nowhere (still kept) */
export type HistoryMode = 'favorites' | 'page' | 'off';
export var HISTORY_MODES: HistoryMode[] = ['favorites', 'page', 'off'];

/** One thing watched: a channel live (no video) or a past broadcast, and when (ms); a channel watched live has the
 * broadcast's recording once the player knew it (shown in its place once the stream ended) */
export interface Watched {
    at: number;
    channel: Channel;
    video?: Video;
    recording?: Recording;
}

var LIST_KEY = 'twitch.history';
var MODE_KEY = 'twitch.history.mode';
var ANSWER_KEY = 'twitch.history.answer';
/** Recordings asked in one query at most (the newest first) */
var RECORDINGS = 20;
var KEPT = 60;
var STALE_MS = 60 * 1000;

var USERS = 'users(ids: $ids) { ' + STATE_FIELDS + ' }';

/** Twitch's last answer: the channels by id, the recordings by id */
interface Answer {
    states: { [id: string]: FavoriteState };
    videos: { [id: string]: Video };
}

var mode: HistoryMode | null = null;
var list: Watched[] | null = null;
/** The last answer (null: the kept one not read yet), when it came (this run) and what it was asked for (channel ids,
 * and v and a recording's id) */
var answer: Answer | null = null;
/** The answer as stored: an answer the same as it is not told */
var answerText: string | null = null;
var answerAt = 0;
var askedFor: { [id: string]: boolean } = {};
var asking: Promise<unknown> | null = null;
var listeners = new Listeners<[]>();
var modeListeners = new Listeners<[]>();

export function historyMode(): HistoryMode {
    if (mode === null) {
        var stored = load<string>(MODE_KEY) as HistoryMode;
        mode = HISTORY_MODES.indexOf(stored) >= 0 ? stored : 'favorites';
    }
    return mode;
}

/** The menu and Favorites follow at once (onHistoryMode) */
export function setHistoryMode(m: HistoryMode): void {
    mode = m;
    save(MODE_KEY, m);
    modeListeners.tell();
}

/** Everything taken out of the list (Settings' Clear History), Twitch's answer about it too */
export function clearHistory(): void {
    list = [];
    save(LIST_KEY, list);
    answer = { states: {}, videos: {} };
    answerText = JSON.stringify(answer);
    save(ANSWER_KEY, answer);
    askedFor = {};
    listeners.tell();
}

/** What was watched, the newest first */
export function watched(): Watched[] {
    if (!list) {
        var kept = load<Watched[]>(LIST_KEY);
        list = kept && kept.length !== undefined ? kept.filter(function (w) { return !!(w && w.channel && w.channel.login); }) : [];
    }
    return list;
}

/** A channel watched live (its stream), or a past broadcast: first in the list, once */
export function noteWatched(channel: Channel, video?: Video): void {
    var key = video ? 'v' + video.id : 'c' + channel.id;
    var next = watched().filter(function (w) { return keyOf(w) !== key; });
    var entry: Watched = { at: Date.now(), channel: { id: channel.id, login: channel.login, displayName: channel.displayName, avatar: channel.avatar } };
    if (video) {
        // (without Twitch's saved position of then: the device's own position decides what is left to continue)
        var copy = {} as Video;
        for (var field in video) {
            if (video.hasOwnProperty(field) && field !== 'position') {
                (copy as unknown as { [f: string]: unknown })[field] = (video as unknown as { [f: string]: unknown })[field];
            }
        }
        entry.video = copy;
    }
    next.unshift(entry);
    list = next.slice(0, KEPT);
    save(LIST_KEY, list);
    listeners.tell();
}

/** The recording of the broadcast a channel was watched live in, on its entry (the player knows it as it leaves) */
export function noteRecording(channel: Channel, recording: Recording): void {
    var list = watched();
    for (var i = 0; i < list.length; i++) {
        var w = list[i];
        if (!w.video && w.channel.id === channel.id) {
            if (!w.recording || w.recording.id !== recording.id) {
                w.recording = { id: recording.id, createdAt: recording.createdAt };
                save(LIST_KEY, list);
                listeners.tell();
            }
            return;
        }
    }
}

/** Taken out of the list (the hold menu's Remove from History) */
export function forgetWatched(key: string): void {
    // (a channel's entry shows its recording's tile once the stream ended: that tile's key takes the entry too)
    var next = watched().filter(function (w) { return keyOf(w) !== key && !(w.recording && 'v' + w.recording.id === key); });
    if (next.length !== watched().length) {
        list = next;
        save(LIST_KEY, list);
        listeners.tell();
    }
}

/** An entry's key: v and the video's id, or c and the channel's */
export function keyOf(w: Watched): string {
    return w.video ? 'v' + w.video.id : 'c' + w.channel.id;
}

/** Twitch's last answer; the kept one the first time */
function lastAnswer(): Answer {
    if (!answer) {
        answerText = loadText(ANSWER_KEY);
        var kept: Answer | null = null;
        try {
            kept = answerText ? JSON.parse(answerText) : null;
        } catch (e) {
            kept = null;
        }
        answer = kept && kept.states && kept.videos ? kept : { states: {}, videos: {} };
    }
    return answer;
}

/** What Twitch last said about a channel watched (none yet: not asked, or gone) */
export function historyState(id: string): FavoriteState | undefined {
    return lastAnswer().states[id];
}

/** A recording as Twitch last gave it (none yet: not asked, or gone) */
export function historyVideo(id: string): Video | undefined {
    return lastAnswer().videos[id];
}

/** Asks which channels watched are live now, with the recordings of streams watched live (their tiles once the stream
 * ended): unless the last answer is fresh and was asked for all of them (or one is coming) */
export function refreshHistory(): Promise<unknown> {
    var ids: string[] = [];
    var recordings: Watched[] = [];
    var all = watched();
    for (var i = 0; i < all.length; i++) {
        var w = all[i];
        if (w.channel.id && ids.indexOf(w.channel.id) < 0) {
            ids.push(w.channel.id);
        }
        if (w.recording && recordings.length < RECORDINGS) {
            recordings.push(w);
        }
    }
    var wanted = ids.concat(recordings.map(function (r) { return 'v' + (r.recording as { id: string }).id; }));
    var unasked = wanted.some(function (id) { return !askedFor[id]; });
    if (!ids.length || asking || (!unasked && Date.now() - answerAt < STALE_MS)) {
        return asking || Promise.resolve();
    }
    // One query: the channels, and each recording by an alias of its own
    var params = '$ids: [ID!]';
    var parts = USERS;
    var variables: { [name: string]: unknown } = { ids: ids };
    for (var r = 0; r < recordings.length; r++) {
        params += ', $r' + r + ': ID!';
        parts += ' r' + r + ': video(id: $r' + r + ') { ' + VIDEO_PICTURE + ' }';
        variables['r' + r] = (recordings[r].recording as { id: string }).id;
    }
    asking = gql<Raw>('query HistoryLive(' + params + ') { ' + parts + ' }', variables).then(function (data: Raw) {
        var fresh = toFavoriteStates(data);
        var next: Answer = { states: {}, videos: {} };
        for (var k = 0; k < fresh.length; k++) {
            next.states[fresh[k].channel.id] = fresh[k];
        }
        for (var n = 0; n < recordings.length; n++) {
            var video = toVideo(data && data['r' + n], recordings[n].channel);
            if (video) {
                next.videos[video.id] = video;
            }
        }
        lastAnswer();
        var nextText = JSON.stringify(next);
        var changed = nextText !== answerText;
        if (changed) {
            answer = next;
            answerText = nextText;
            save(ANSWER_KEY, next);
        }
        answerAt = Date.now();
        askedFor = {};
        for (var a = 0; a < wanted.length; a++) {
            askedFor[wanted[a]] = true;
        }
        asking = null;
        if (changed) {
            listeners.tell();
        }
    }, function () {
        asking = null;
    });
    return asking;
}

/** The list or Twitch's answer about it changed */
export function onHistory(listener: () => void): () => void {
    return listeners.on(listener);
}

/** Watch History's setting changed */
export function onHistoryMode(listener: () => void): () => void {
    return modeListeners.on(listener);
}

/** Read again from the device, the answer forgotten (tests) */
export function forgetHistory(): void {
    mode = null;
    list = null;
    answer = null;
    answerText = null;
    answerAt = 0;
    askedFor = {};
    asking = null;
}
