// The channel page's preview box as Twitch's TV app has it (527x297 at 1920): a live channel plays its stream there
// with LIVE and the viewers; an offline one plays its newest video with its date, views and length; a channel or
// video Twitch gates for its content shows the gate's words in the box instead (mature content plays there with
// Bolli's Mature Content Warning switched off, Twitch's age and region restrictions never), and one with no video
// says there is no content. Both play with sound and small (at most 360p), as Twitch's preview does. The app's one
// video lies under the page: while it plays the box is clear and the video is placed under it. The full-screen
// player of the same target takes the same playback over, and the box takes it back (the session's leave and claim).

import { h, setShown, setText, toggleClass } from '../../../core/dom.js';
import { clock } from '../../../core/time.js';
import { ChannelPage } from '../../api/channel.js';
import { Box, keyOf, leave, owns, placeVideo, play, PlayOptions, playingKey, SessionEvents, stop, Target } from '../../player/session.js';
import { skipsGate } from '../player/gate.js';
import { ago, count } from '../tiles.js';

/** What the preview needs of the session (the tests give a fake) */
export interface PreviewPlayer {
    play(target: Target, events: SessionEvents, options: PlayOptions): void;
    leave(events: SessionEvents): void;
    owns(events: SessionEvents): boolean;
    stop(): void;
    playingKey(): string;
    placeVideo(box: Box | null): void;
}

export var sessionPlayer: PreviewPlayer = {
    play: play, leave: leave, owns: owns, stop: stop, playingKey: playingKey, placeVideo: placeVideo
};

/** The box in 1280x720 units (1303,252 527x297 at 1920); raised: beside the shrunk header, above its band's end at
 * 300 (Settings' Keep Live Preview) */
var BOX: Box = { left: 868.67, top: 168, width: 351.33, height: 198 };
var RAISED: Box = { left: 868.67, top: 96, width: 351.33, height: 198 };
/** Twitch's preview is small: at most this tall */
var OPTIONS: PlayOptions = { maxHeight: 360, muted: false, remember: false };

export class Preview {
    el: HTMLElement;
    private gate: HTMLElement;
    private gateText: HTMLElement;
    private none: HTMLElement;
    private live: HTMLElement;
    private viewers: HTMLElement;
    private date: HTMLElement;
    private views: HTMLElement;
    private length: HTMLElement;
    private target: Target | null = null;
    private events: SessionEvents;
    /** The video placed beside the shrunk header (focus in the rows, Keep Live Preview on) */
    private raised = false;

    /** failed: the box's playback failed (a live stream may have ended) */
    constructor(private player: PreviewPlayer, failed?: (target: Target) => void) {
        this.el = h('div', 'bt-ch-preview');
        this.gate = this.el.appendChild(h('div', 'bt-ch-gate')) as HTMLElement;
        this.gate.appendChild(h('div', 'bt-ch-gate-title', 'Just one second...'));
        this.gateText = this.gate.appendChild(h('div', 'bt-ch-gate-text')) as HTMLElement;
        this.none = this.el.appendChild(h('div', 'bt-ch-none', 'No content available')) as HTMLElement;
        this.live = this.el.appendChild(h('div', 'bt-live', 'Live')) as HTMLElement;
        this.viewers = this.el.appendChild(h('div', 'bt-stat')) as HTMLElement;
        this.date = this.el.appendChild(h('div', 'bt-stat bt-ch-date')) as HTMLElement;
        this.views = this.el.appendChild(h('div', 'bt-stat')) as HTMLElement;
        this.length = this.el.appendChild(h('div', 'bt-stat bt-stat--end')) as HTMLElement;
        this.set(null);
        var self = this;
        this.events = {
            playing: function () {
                self.setMoving(true);
            },
            failed: function () {
                self.setMoving(false);
                if (failed && self.target) {
                    failed(self.target);
                }
            }
        };
    }

    /** The page's live stream or newest video (null: nothing yet); true when the target is another one now */
    set(page: ChannelPage | null): boolean {
        var s = page && page.stream;
        var v = page && !s ? page.latest : null;
        var shown: { mature?: boolean; restricted?: boolean } | null = s || v;
        var gated = !!shown && !!shown.mature && (!!shown.restricted || !skipsGate());
        setShown(this.gate, gated);
        setShown(this.none, !!page && !s && !v);
        if (gated && page) {
            setText(this.gateText, page.channel.displayName + '\'s content is intended for certain audiences.');
        }
        setShown(this.live, !!s && !gated);
        setShown(this.viewers, !!s && !gated);
        setText(this.viewers, s ? count(s.viewers, 1, 'viewer') : '');
        var video = !!v && !gated;
        setShown(this.date, video);
        setShown(this.views, video);
        setShown(this.length, video);
        if (v) {
            setText(this.date, ago(v.publishedAt));
            setText(this.views, count(v.views, 1, 'view'));
            setText(this.length, clock(v.lengthSeconds));
        }
        var target: Target | null = gated || !page ? null : s ? { kind: 'live', id: page.channel.login } : v ? { kind: 'vod', id: v.id } : null;
        if ((target ? keyOf(target) : '') === this.key()) {
            return false;
        }
        this.target = target;
        this.setMoving(false);
        return true;
    }

    /** What plays (or would) in the box, as the session names it ('' none) */
    key(): string {
        return this.target ? keyOf(this.target) : '';
    }

    /** Plays in the box when the page shows (the same playback claimed from the player goes on) */
    start(): void {
        if (!this.target) {
            return;
        }
        this.player.placeVideo(this.raised ? RAISED : BOX);
        // Claimed from the player: its picture moves already (else the box stays dark until it does)
        this.setMoving(this.player.playingKey() === this.key());
        this.player.play(this.target, this.events, OPTIONS);
    }

    /** The video beside the shrunk header (on) or in the box; moved now while the page plays in it */
    raise(on: boolean): void {
        if (on === this.raised) {
            return;
        }
        this.raised = on;
        if (this.target && this.player.owns(this.events)) {
            this.player.placeVideo(on ? RAISED : BOX);
        }
    }

    /** The page goes out of sight: the screen shown over it may claim the playback */
    leave(): void {
        this.player.leave(this.events);
        this.setMoving(false);
    }

    /** The page goes: what it still owns stops */
    drop(): void {
        if (this.player.owns(this.events)) {
            this.player.stop();
        }
    }

    /** The box clear over the playing video (moving), or its own dark until the picture comes */
    private setMoving(moving: boolean): void {
        toggleClass(this.el, 'bt-ch-preview--playing', moving);
    }
}
