// The player screens as the shell opens them for stream, video and clip tiles, wired to the session, the API and chat.

import { gateInfo, liveInfo } from '../../api/channel.js';
import { clip } from '../../api/clip.js';
import { followsChannel } from '../../api/follow.js';
import { Item } from '../../api/types.js';
import { video } from '../../api/video.js';
import { ChatConnection } from '../../chat/connection.js';
import { ChatPanel } from '../../chat/panel.js';
import { duration, keyOf, leave, owns, pause, placeVideo, play, playingKey, position, prefetch, resume, seek, setQuality, stop, Target } from '../../player/session.js';
import { Navigator, Screen } from '../navigator.js';
import { ChatSide, PlayerDeps, PlayerItem, PlayerSession, PlayerView } from './player.js';

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

function depsFor(nav: Navigator): PlayerDeps {
    return {
        nav: nav, session: session, liveInfo: liveInfo, video: video, clip: clip, gateInfo: gateInfo, follows: followsChannel, chat: chatSide
    };
}

/** The player for a stream, video or clip tile (null for other kinds) */
export function openPlayer(item: Item, nav: Navigator): Screen | null {
    var what: PlayerItem | null = item.kind === 'stream' ? { kind: 'live', stream: item.stream } :
        item.kind === 'video' ? { kind: 'vod', video: item.video } :
        item.kind === 'clip' ? { kind: 'clip', clip: item.clip } : null;
    return what ? new PlayerView(what, depsFor(nav)) : null;
}
