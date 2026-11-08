// The player screens as the shell opens them for stream, video and clip tiles, wired to the session, the API and chat.

import { gateInfo, liveInfo } from '../../api/channel.js';
import { clip, ClipFile } from '../../api/clip.js';
import { followsChannel } from '../../api/follow.js';
import { Item } from '../../api/types.js';
import { video } from '../../api/video.js';
import { ChatConnection } from '../../chat/connection.js';
import { ChatPanel } from '../../chat/panel.js';
import { duration, keyOf, leave, owns, pause, placeVideo, play, playingKey, position, prefetch, ready, resume, seek, setQuality, stop, Target } from '../../player/session.js';
import { Navigator, Screen } from '../navigator.js';
import { gatePassed } from './gate.js';
import { ChatSide, PlayerDeps, PlayerItem, PlayerSession, PlayerView } from './player.js';
import { startOf } from './resume.js';

var session: PlayerSession = {
    play: play, leave: leave, stop: stop, owns: owns, setQuality: setQuality, seek: seek, pause: pause, resume: resume,
    position: position, duration: duration, prefetch: prefetch, placeVideo: placeVideo,
    plays: function (target: Target): boolean {
        return playingKey() === keyOf(target);
    }
};

/** One chat connection and panel per live player */
function chatSide(parent: HTMLElement): ChatSide {
    var panel = new ChatPanel(parent);
    var connection = new ChatConnection();
    return {
        el: panel.el,
        join: panel.join,
        show: function (on: boolean): void {
            panel.show(on);
        },
        open: function (login: string): void {
            connection.open(login, panel);
        },
        close: function (): void {
            connection.close();
        }
    };
}

/** A clip asked ahead (focus resting on its tile) and when: its file addresses carry a token, so it is used for a
 * minute only */
var clipAhead: { slug: string; at: number; answer: Promise<ClipFile> } | null = null;
var CLIP_AHEAD_MS = 60 * 1000;

/** Focus resting on a clip's tile: the clip and its files asked now, so OK plays it without that wait */
export function prefetchClip(slug: string): Promise<unknown> {
    if (!clipAhead || clipAhead.slug !== slug || Date.now() - clipAhead.at >= CLIP_AHEAD_MS) {
        var answer = clip(slug);
        clipAhead = { slug: slug, at: Date.now(), answer: answer };
        answer.then(null, function () {
            if (clipAhead && clipAhead.answer === answer) {
                clipAhead = null;
            }
        });
    }
    return clipAhead.answer.then(null, function () { return undefined; });
}

/** The clip: the one asked ahead when fresh (taken once), else asked now */
function clipNow(slug: string): Promise<ClipFile> {
    var had = clipAhead;
    if (had && had.slug === slug && Date.now() - had.at < CLIP_AHEAD_MS) {
        clipAhead = null;
        return had.answer;
    }
    return clip(slug);
}

function depsFor(nav: Navigator): PlayerDeps {
    return {
        nav: nav, session: session, liveInfo: liveInfo, video: video, clip: clipNow, gateInfo: gateInfo, follows: followsChannel, chat: chatSide
    };
}

/** The player for a stream, video or clip tile (null for other kinds) */
export function openPlayer(item: Item, nav: Navigator): Screen | null {
    var what: PlayerItem | null = item.kind === 'stream' ? { kind: 'live', stream: item.stream } :
        item.kind === 'video' ? { kind: 'vod', video: item.video } :
        item.kind === 'clip' ? { kind: 'clip', clip: item.clip } : null;
    return what ? new PlayerView(what, depsFor(nav)) : null;
}

/** Focus resting on a stream or video tile: its playback started out of sight where its player starts it (session
 * ready), so OK plays it at once. Not for content behind a gate the viewer has not passed (its player asks first), nor
 * a video whose page has to tell that (no publish date) */
export function playAhead(item: Item): void {
    if (item.kind === 'stream') {
        var s = item.stream;
        if (!s.mature || gatePassed(s.channel.login, !!s.restricted)) {
            ready({ kind: 'live', id: s.channel.login });
        }
    } else if (item.kind === 'video') {
        var v = item.video;
        if (v.publishedAt && (!v.mature || gatePassed(v.channel.login, !!v.restricted))) {
            ready({ kind: 'vod', id: v.id, startAt: startOf(v) });
        }
    }
}
