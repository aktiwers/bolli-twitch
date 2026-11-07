// The full-screen players as Twitch's TV app has them: a live channel (video 1440 wide with the chat beside it, or full
// width with the chat hidden as the chat button last left it, its chat then joined only once the button shows it), a
// past broadcast and a clip (full width, with the progress track). Over the picture: Go Back, the channel's
// avatar (LIVE under it) with its name, title and "game | uptime | viewers" (a white bubble "Go to <name>'s profile..."
// while it has focus), Follow, the options, quality and chat buttons, and for clips Watch Full Video. The overlay hides
// 5 s after the last key, sooner after the screen opens; keys act at once while it is hidden. Back leaves at once (it
// first closes the quality menu or the Unfollow box). Twitch's prompts cover the screen when the content is gated
// (known before anything plays: from the tile or page, else from its own page first; mature content asked once per
// channel in a run, never with Bolli's Mature Content Warning switched off; Twitch's age, region and account
// restrictions every time, as Twitch's gate for their kind), the stream ended, the video ended or it failed; a stream
// not playable on this device gives the player's place to Twitch's error page.
// Instant: the screen and the channel's line show at once and the stream starts in show() (a stream that plays already,
// the channel page's preview, is handed over, not restarted). Out of sight it leaves the playback to the session
// (the channel page of the same stream claims it; under the options page it pauses) and its chat, timers and ticks
// rest; shown again it claims it back where it stands (also from the channel page's preview of the same video). It
// stops the playback only when it goes and still owns it. Where the viewer is in a past broadcast is kept every 15 s
// while it shows, when it goes out of sight and when the app goes to the background.

import { h, setShown, setText, toggleClass } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { GateInfo } from '../../api/channel.js';
import { ClipFile } from '../../api/clip.js';
import { GqlError } from '../../api/gql.js';
import { followState, noteFollow } from '../../api/follow.js';
import { signedIn } from '../../api/gql.js';
import { avatarAt } from '../../api/pictures.js';
import { Channel, Clip, Item, LiveUpdate, Stream, Video } from '../../api/types.js';
import { Failure } from '../../player/engine.js';
import { Box, PlayOptions, SessionEvents, Target } from '../../player/session.js';
import { Confirm } from '../confirm.js';
import { Follow } from '../follow.js';
import { chevronIcon, gearIcon } from '../icons.js';
import { MenuMode, Navigator, Screen } from '../navigator.js';
import { joinChat, QrPage } from '../qr.js';
import { Rest } from '../rest.js';
import { ago } from '../tiles.js';
import { chatHidden, setChatHidden } from './chat-choice.js';
import { Direction, FocusGraph, Links } from './focus.js';
import { uptime, viewers, views } from './format.js';
import { acceptGate, gatePassed } from './gate.js';
import { icon } from './icons.js';
import { OptionsPage } from './options.js';
import { Prompt, PromptButton, PromptModel } from './prompt.js';
import { QualityMenu } from './quality.js';
import { keepPosition, resumeAt } from './resume.js';
import { Track } from './track.js';

/** The overlay hides this long after the last key */
var IDLE_MS = 5000;
/** The overlay hides this long after the screen opens or its gate is passed, so the picture clears soon: with the
 * overlay's .25 s fade (player.css) its shade is gone after 2.625 s, half the time a key keeps it */
var OPEN_IDLE_MS = 2375;
/** The live line (title, category, viewers) is asked again this often, as Twitch's TV app does */
var LIVE_INFO_MS = 60 * 1000;
/** The picture: left of the chat, or the whole screen */
var BESIDE_CHAT: Box = { left: 0, top: 0, width: 960, height: 720 };
var WHOLE: Box = { left: 0, top: 0, width: 1280, height: 720 };
/** Where the viewer is in a past broadcast is kept this often while the player shows (and when it goes) */
var KEEP_MS = 15 * 1000;
/** Twitch's avatar is 117 px at 1920: asked a size that stays sharp */
var AVATAR_SIZE = 150;

/** Twitch's restrictions by its gate kind, as its gate shows them instead of Start Watching: the title and bold line
 * when they differ from the mature gate's, the line under them, and the one other button (Sign In for a region that
 * needs an account, Watch Anyway for the account's own limit) beside Go Home */
interface Restriction {
    title?: string;
    main?: string;
    bottom: string;
    button?: 'signin' | 'watch';
}
var AGE_REGION: Restriction = { bottom: 'Due to your age and/or region, you cannot access this stream.' };
/** A restriction whose kind is not known (yet): Go Home only */
var BLOCKED: Restriction = { bottom: '' };
var RESTRICTIONS: { [gate: string]: Restriction } = {
    CONTENT_GATE_TYPE_AGE_AND_REGION: AGE_REGION,
    CONTENT_GATE_TYPE_AGE_VERIFICATION_AND_REGION: AGE_REGION,
    CONTENT_GATE_TYPE_REGION: { bottom: '', button: 'signin' },
    CONTENT_GATE_TYPE_GUARDIAN_LIMITED: {
        title: 'Content Restricted', main: 'Your linked parent or guardian account has restricted your access to this content.',
        bottom: 'Visit the Family Center to learn more.'
    },
    CONTENT_GATE_TYPE_USER_LIMITED: {
        title: 'Content Restricted', main: 'You\'ve limited your viewing of this type of content.',
        bottom: 'You can change this anytime in your content preference settings.', button: 'watch'
    }
};

/** The play/pause keys: LG's Pause and Play, the media keys of Android TV's remotes (web view codes) */
var PAUSE = 19;
var PLAY = 415;
var PLAY_PAUSE = 179;
var MEDIA_PLAY = 250;

export type PlayerKind = 'live' | 'vod' | 'clip';

/** What the screens ask of the session (player/session.ts; the tests give a fake) */
export interface PlayerSession {
    play(target: Target, events: SessionEvents, options?: PlayOptions): void;
    leave(events: SessionEvents): void;
    stop(): void;
    owns(events: SessionEvents): boolean;
    /** Whether target plays now (for any screen; not a failed playback) */
    plays(target: Target): boolean;
    setQuality(index: number): void;
    seek(seconds: number): void;
    pause(): void;
    resume(): void;
    position(): number;
    duration(): number;
    prefetch(target: Target): void;
    placeVideo(box: Box | null): void;
}

/** The chat beside a live player: one connection and one panel per visit (chat/) */
export interface ChatSide {
    el: HTMLElement;
    /** "Join the conversation" (focused with bt-focused) */
    join: HTMLElement;
    show(on: boolean): void;
    open(login: string): void;
    close(): void;
}

export interface PlayerDeps {
    nav: Navigator;
    session: PlayerSession;
    liveInfo(login: string): Promise<LiveUpdate | null>;
    video(id: string): Promise<Video>;
    clip(slug: string): Promise<ClipFile>;
    gateInfo(kind: PlayerKind, id: string): Promise<GateInfo>;
    /** Whether the signed-in account follows the channel */
    follows(login: string): Promise<boolean>;
    chat(parent: HTMLElement): ChatSide;
}

/** What a player opens: a live stream, a past broadcast (from a position, else where the viewer stopped), a clip */
export type PlayerItem = { kind: 'live'; stream: Stream } | { kind: 'vod'; video: Video; startAt?: number } | { kind: 'clip'; clip: Clip };

/** Focus moves per kind, as measured on Twitch's app: Go Back above, the avatar at the left, the buttons at the
 * right in groups that remember their last focus */
var LINKS: { [kind: string]: Links } = {
    live: {
        back: { down: 'avatar', right: ['join', 'follow'] },
        avatar: { up: 'back', right: 'follow' },
        follow: { up: 'back', left: 'avatar', down: 'icons', right: 'join' },
        options: { up: 'follow', left: 'avatar', right: 'quality' },
        quality: { up: 'follow', left: 'options', right: 'chat' },
        chat: { up: 'follow', left: 'quality', right: 'join' },
        join: { up: 'follow' }
    },
    vod: {
        back: { down: 'knob' },
        knob: { up: 'back', down: 'bottom' },
        avatar: { up: 'knob', right: 'right' },
        follow: { up: 'knob', left: 'avatar', down: 'icons' },
        options: { up: 'follow', left: 'avatar', right: 'quality' },
        quality: { up: 'follow', left: 'options' }
    },
    clip: {
        back: { down: 'knob' },
        knob: { up: 'back', down: 'bottom' },
        avatar: { up: 'knob', right: 'right' },
        full: { up: 'knob', left: 'avatar', down: 'options' },
        options: { up: ['full', 'knob'], left: 'avatar', right: 'follow' },
        follow: { up: ['full', 'knob'], left: 'options' }
    }
};
var GROUPS: { [kind: string]: { [name: string]: string[] } } = {
    live: { icons: ['options', 'quality', 'chat'] },
    vod: { icons: ['options', 'quality'], right: ['follow', 'options', 'quality'], bottom: ['avatar', 'follow', 'options', 'quality'] },
    clip: { right: ['full', 'options', 'follow'], bottom: ['avatar', 'full', 'options', 'follow'] }
};

export class PlayerView implements Screen {
    el: HTMLElement;
    menu: MenuMode = 'none';
    plays = true;
    kind: PlayerKind;
    /** The focused control's id (the tests) */
    focusedId = '';
    private channel: Channel;
    private title: string;
    private game = '';
    /** Live: the viewers and when the broadcast began; past broadcasts and clips: the date and views */
    private viewers = 0;
    private startedAt = '';
    private date = '';
    private views = 0;
    private target: Target;
    private events: SessionEvents;
    private focus: FocusGraph;
    private gated: boolean;
    /** Twitch restricts it (age, region, an account's limits): no Start Watching, whatever Bolli's setting says */
    private restricted: boolean;
    /** Whether Twitch gates it is known (decided before anything of it plays) */
    private gateKnown: boolean;
    /** A clip's files and its past broadcast, once the clip page came */
    private clipFile: Promise<ClipFile> | null = null;
    /** A past broadcast's own page, when it is asked (opened from a clip's Watch Full Video) */
    private videoPage: Promise<Video> | null = null;
    private videoId = '';
    private videoOffset = 0;
    private visible = false;
    /** Shown once already: showing again is not an open */
    private opened = false;
    /** The overlay is hidden */
    private idle = false;
    private paused = false;
    private buffering = true;
    /** Where a past broadcast starts when it is started anew (kept as it plays) */
    private resumeAt = 0;
    /** Over: a prompt (ended, failed) shows instead of the picture */
    private over = false;
    private chatShown = true;
    /** The chat's connection is open (with chat hidden at the start: once the chat button first shows it) */
    private chatJoined = false;
    /** Where focus was before it went to Join (Left from Join goes back there) */
    private beforeJoin = 'follow';
    private hideTimer = 0;
    private tickTimer = 0;
    private liveTimer = 0;
    private keepTimer = 0;
    /** When the live line was last asked (at first: the tile's, just in) */
    private liveAskedAt = Date.now();
    /** Focus resting on the avatar: the channel's page fetched ahead */
    private rest = new Rest();

    private controls: HTMLElement;
    private back: HTMLElement;
    private avatar: HTMLImageElement;
    private nameEl: HTMLElement;
    private titleEl: HTMLElement;
    private metaGame: HTMLElement;
    private metaSecond: HTMLElement;
    private metaThird: HTMLElement;
    private sep1: HTMLElement;
    private sep2: HTMLElement;
    private bubbleName: HTMLElement;
    private bubbleText: HTMLElement;
    private follow: Follow;
    private buttons: { [id: string]: HTMLElement } = {};
    private track: Track | null = null;
    private quality: QualityMenu;
    private chat: ChatSide | null = null;
    private prompt = new Prompt();
    private confirm = new Confirm();

    constructor(item: PlayerItem, private deps: PlayerDeps) {
        this.kind = item.kind;
        var self = this;
        if (item.kind === 'live') {
            var s = item.stream;
            this.channel = s.channel;
            this.title = s.title;
            this.game = s.game ? s.game.displayName : '';
            this.viewers = s.viewers;
            this.startedAt = s.startedAt || '';
            this.gated = !!s.mature;
            this.restricted = !!s.restricted;
            this.target = { kind: 'live', id: s.channel.login };
        } else if (item.kind === 'vod') {
            var v = item.video;
            this.channel = v.channel;
            this.title = v.title;
            this.gated = !!v.mature;
            this.restricted = !!v.restricted;
            this.resumeAt = item.startAt !== undefined ? item.startAt : resumeAt(v.id) || v.position || 0;
            this.target = { kind: 'vod', id: v.id };
        } else {
            var c = item.clip;
            this.channel = c.channel;
            this.title = c.title;
            this.game = c.game ? c.game.displayName : '';
            this.date = c.createdAt;
            this.views = c.views;
            this.gated = !!c.mature;
            this.restricted = !!c.restricted;
            this.videoId = c.videoId || '';
            this.videoOffset = c.videoOffset || 0;
            this.target = { kind: 'clip', id: c.slug };
        }
        // Streams, tiles and pages say whether Twitch gates them; a clip's own page, which comes before it plays,
        // says it again; a past broadcast opened from a clip's Watch Full Video waits for its page (it may be
        // restricted, which nothing passes)
        this.gateKnown = this.gated || item.kind === 'live' || (item.kind === 'vod' && !!item.video.publishedAt);
        if (this.gated && gatePassed(this.channel.login, this.restricted)) {
            this.gated = false;
        }
        this.events = {
            playing: function () {
                self.setBuffering(false);
                self.setPaused(false);
            },
            buffering: function () {
                self.setBuffering(true);
            },
            paused: function () {
                self.setPaused(true);
            },
            ended: function () {
                if (self.kind === 'vod') {
                    self.watchAgain();
                }
            },
            qualities: function (list, picked, playing) {
                self.quality.set(list.map(function (q) { return q.name; }), picked, playing);
            },
            failed: function (f: Failure) {
                self.failed(f);
            },
            background: function () {
                self.keep();
            }
        };
        this.el = h('div', 'bt-pl bt-pl--' + this.kind);
        var box = this.el.appendChild(h('div', 'bt-pl-box')) as HTMLElement;
        box.appendChild(h('div', 'bt-pl-play')).appendChild(icon('play'));
        box.appendChild(h('div', 'bt-pl-spin'));
        this.controls = this.el.appendChild(h('div', 'bt-pl-controls')) as HTMLElement;
        // The shade over the picture fades with the overlay
        this.controls.appendChild(h('div', 'bt-pl-shade'));
        this.back = this.controls.appendChild(h('div', 'bt-button bt-back bt-pl-back')) as HTMLElement;
        this.back.appendChild(h('span', 'bt-button-icon')).appendChild(chevronIcon());
        this.back.appendChild(h('span', '', 'Go Back'));
        if (this.kind !== 'live') {
            this.track = new Track();
            this.controls.appendChild(this.track.el);
            if (item.kind === 'clip') {
                this.track.setDuration(item.clip.durationSeconds);
            }
        }
        var info = this.controls.appendChild(h('div', 'bt-pl-info')) as HTMLElement;
        var pic = info.appendChild(h('div', 'bt-pl-avatar')) as HTMLElement;
        this.avatar = pic.appendChild(h('img', 'bt-pl-avatar-img')) as HTMLImageElement;
        var status = pic.appendChild(h('div', 'bt-pl-status')) as HTMLElement;
        if (this.kind === 'live') {
            status.appendChild(h('div', 'bt-pl-live', 'LIVE'));
        }
        var lines = info.appendChild(h('div', 'bt-pl-lines')) as HTMLElement;
        this.nameEl = lines.appendChild(h('div', 'bt-pl-name')) as HTMLElement;
        this.titleEl = lines.appendChild(h('div', 'bt-pl-title')) as HTMLElement;
        var meta = lines.appendChild(h('div', 'bt-pl-meta')) as HTMLElement;
        this.metaGame = meta.appendChild(h('span')) as HTMLElement;
        this.sep1 = meta.appendChild(h('span', 'bt-pl-sep', '|')) as HTMLElement;
        this.metaSecond = meta.appendChild(h('span')) as HTMLElement;
        this.sep2 = meta.appendChild(h('span', 'bt-pl-sep', '|')) as HTMLElement;
        this.metaThird = meta.appendChild(h('span', this.kind === 'live' ? 'bt-pl-viewers' : '')) as HTMLElement;
        var bubble = info.appendChild(h('div', 'bt-pl-bubble')) as HTMLElement;
        this.bubbleName = bubble.appendChild(h('div', 'bt-pl-bubble-name')) as HTMLElement;
        this.bubbleText = bubble.appendChild(h('div', 'bt-pl-bubble-text')) as HTMLElement;

        if (this.kind === 'clip') {
            this.buttons.full = this.controls.appendChild(h('div', 'bt-button bt-pl-full', 'Watch Full Video')) as HTMLElement;
        }
        this.follow = new Follow('bt-pl-follow', deps.nav, this.confirm);
        this.follow.set({ kind: 'channel', id: this.channel.id, name: this.channel.displayName });
        this.controls.appendChild(this.follow.el);
        this.buttons.follow = this.follow.el;
        this.buttons.options = this.iconButton('bt-pl-options', icon('options'));
        if (this.kind !== 'clip') {
            this.buttons.quality = this.iconButton('bt-pl-gear', gearIcon());
        }
        if (this.kind === 'live') {
            this.buttons.chat = this.iconButton('bt-pl-chat', icon('chat'));
        }
        this.quality = new QualityMenu(function (index: number) {
            self.deps.session.setQuality(index);
        });
        this.controls.appendChild(this.quality.el);
        if (this.kind === 'live') {
            this.chat = deps.chat(this.el);
            this.buttons.join = this.chat.join;
            this.chatShown = !chatHidden();
            toggleClass(this.el, 'bt-pl--chatless', !this.chatShown);
        }
        this.el.appendChild(this.prompt.el);
        this.el.appendChild(this.confirm.el);

        this.focus = new FocusGraph(LINKS[this.kind], GROUPS[this.kind], this.kind === 'live' ? 'avatar' : 'knob', function (id: string) {
            return self.usable(id);
        });
        if (item.kind === 'vod') {
            this.setVideo(item.video);
        }
        this.drawInfo();
        this.drawFocus();

        if (this.kind === 'clip') {
            this.loadClip();
        } else if (this.kind === 'vod' && !(item.kind === 'vod' && item.video.publishedAt)) {
            this.askVideo();
        }
        this.askFollow();
        if (this.chatShown) {
            this.joinChat();
        }
    }

    show(): void {
        this.visible = true;
        setShown(this.el, true);
        this.placeVideo();
        if (this.chat) {
            this.chat.show(this.chatShown);
        }
        if (this.gated) {
            if (!this.prompt.shown) {
                this.showGate();
            }
        } else if (!this.over) {
            this.start();
        }
        // Back from a page it opened: as after a key
        this.wake(this.opened ? IDLE_MS : OPEN_IDLE_MS);
        this.opened = true;
        var self = this;
        if (this.kind === 'live') {
            if (Date.now() - this.liveAskedAt >= LIVE_INFO_MS) {
                this.askLiveInfo();
            }
            this.liveTimer = setInterval(function () {
                self.askLiveInfo();
            }, LIVE_INFO_MS) as unknown as number;
        } else if (this.kind === 'vod') {
            this.keepTimer = setInterval(function () {
                self.keep();
            }, KEEP_MS) as unknown as number;
        }
    }

    /** Out of sight: the playback left to the session, chat hidden, its timers stopped */
    hide(): void {
        this.visible = false;
        this.rest.cancel();
        setShown(this.el, false);
        this.keep();
        this.deps.session.leave(this.events);
        if (this.chat) {
            this.chat.show(false);
        }
        clearInterval(this.liveTimer);
        clearInterval(this.keepTimer);
        this.ticking(false);
        clearTimeout(this.hideTimer);
    }

    destroy(): void {
        this.keep();
        clearInterval(this.liveTimer);
        clearInterval(this.keepTimer);
        this.ticking(false);
        clearTimeout(this.hideTimer);
        this.rest.cancel();
        this.follow.destroy();
        if (this.chat) {
            this.chat.close();
        }
        // The screen under it (the channel page) may have taken the same playback back already
        if (this.deps.session.owns(this.events)) {
            this.deps.session.stop();
        }
    }

    /** Signed in or out: the Follow state for the account now */
    accountChanged(): void {
        this.askFollow();
    }

    onKey(code: number): boolean {
        if (this.confirm.open) {
            return this.confirm.onKey(code);
        }
        if (this.prompt.shown) {
            if (code === KEY.BACK) {
                this.deps.nav.back();
                return true;
            }
            return this.prompt.onKey(code);
        }
        var media = this.mediaKey(code);
        this.wake();
        if (media) {
            return true;
        }
        if (this.quality.open) {
            var used = this.quality.onKey(code);
            if (!this.quality.open) {
                this.drawFocus();
            }
            if (used) {
                return true;
            }
        }
        if (code === KEY.BACK) {
            this.deps.nav.back();
        } else if (code === KEY.OK) {
            this.press(this.focus.current);
        } else if ((code === KEY.LEFT || code === KEY.RIGHT) && this.focus.current === 'knob' && this.track) {
            this.seekStep(code === KEY.LEFT ? -1 : 1);
        } else if (code === KEY.UP || code === KEY.DOWN || code === KEY.LEFT || code === KEY.RIGHT) {
            this.move(code === KEY.UP ? 'up' : code === KEY.DOWN ? 'down' : code === KEY.LEFT ? 'left' : 'right');
        }
        return true;
    }

    /** What the prompt over the picture says ('' none; the tests) */
    promptTitle(): string {
        return this.prompt.shown;
    }

    /** The overlay is shown (the tests) */
    overlayShown(): boolean {
        return !this.idle;
    }

    /** Signed in, a channel whose Follow state no reply gave: asked */
    private askFollow(): void {
        if (signedIn() && followState('channel', this.channel.id) === undefined) {
            var id = this.channel.id;
            this.deps.follows(this.channel.login).then(function (on: boolean) {
                noteFollow('channel', id, on);
            }, function () { return undefined; });
        }
    }

    private iconButton(cls: string, glyph: Node): HTMLElement {
        var b = this.controls.appendChild(h('div', 'bt-button bt-pl-icon ' + cls)) as HTMLElement;
        b.appendChild(glyph);
        return b;
    }

    private setVideo(v: Video): void {
        this.game = v.game ? v.game.displayName : '';
        this.date = v.publishedAt;
        this.views = v.views;
        if (this.track && v.lengthSeconds) {
            this.track.setDuration(v.lengthSeconds);
        }
        if (this.track) {
            this.track.setPosition(this.resumeAt);
        }
    }

    // Playing

    /** Plays the target: claimed where it stands when the session plays it already (its own playback, or the channel
     * page's preview of the same video), else started (a past broadcast where the viewer was) */
    private start(): void {
        if (this.kind === 'clip') {
            this.startClip();
            return;
        }
        var s = this.deps.session;
        var target: Target = { kind: this.target.kind, id: this.target.id };
        if (!this.gateKnown) {
            if (!s.plays(target)) {
                // Its page tells first whether Twitch gates it; the stream is resolved meanwhile
                this.setBuffering(true);
                s.prefetch(this.target);
                if (!this.videoPage) {
                    this.askVideo();
                }
                return;
            }
            // It plays already for the screen under it: the channel page's preview, which plays gated content only when
            // its gate is passed
            this.gateKnown = true;
        }
        if (this.kind === 'vod' && !s.owns(this.events) && !s.plays(target)) {
            target.startAt = this.resumeAt;
        }
        s.play(target, this.events, {});
    }

    private loadClip(): void {
        var self = this;
        this.clipFile = this.deps.clip(this.target.id);
        this.clipFile.then(function (c: ClipFile) {
            self.videoId = c.clip.videoId || '';
            self.videoOffset = c.clip.videoOffset || 0;
            if (self.track) {
                self.track.setDuration(c.clip.durationSeconds);
            }
        }, function () { return undefined; });
    }

    /** A clip plays its files from the clip page (asked once, with the screen) */
    private startClip(): void {
        var self = this;
        var files = this.clipFile || this.deps.clip(this.target.id);
        files.then(function (c: ClipFile) {
            if (!self.gateKnown) {
                self.decideGate(c.clip);
            }
            if (self.visible && !self.over && !self.gated) {
                self.deps.session.play({ kind: 'clip', id: self.target.id, files: c.files }, self.events, {});
            }
        }, function (e: GqlError) {
            if (e && e.kind === 'notfound') {
                self.deps.nav.error(self, 'not-found');
            } else if (self.visible) {
                self.clipFile = null;
                self.failed({ kind: 'network', detail: 'clip page' });
            }
        });
    }

    /** A past broadcast's own page: its line (opened from a clip's Watch Full Video it has none) and whether Twitch
     * gates it; a failed ask is asked again by the next start (Reload) */
    private askVideo(): void {
        var self = this;
        var page = this.videoPage = this.deps.video(this.target.id);
        page.then(function (v: Video) {
            self.title = v.title;
            self.setVideo(v);
            self.drawInfo();
            if (!self.gateKnown) {
                self.decideGate(v);
                if (self.visible && !self.over && !self.gated) {
                    self.start();
                }
            }
        }, function (e: GqlError) {
            if (self.videoPage === page) {
                self.videoPage = null;
            }
            if (self.gateKnown || !self.visible || self.over) {
                return;
            }
            if (e && e.kind === 'notfound') {
                self.deps.nav.error(self, 'not-found');
            } else {
                self.failed({ kind: 'network', detail: 'video page' });
            }
        });
    }

    /** Whether Twitch gates it, from its own page before anything of it plays: the gate shows when the screen is in
     * sight */
    private decideGate(item: { mature?: boolean; restricted?: boolean }): void {
        this.gateKnown = true;
        this.restricted = !!item.restricted;
        this.gated = !!item.mature && !gatePassed(this.channel.login, this.restricted);
        if (this.gated && this.visible && !this.over) {
            this.showGate();
        }
    }

    private setPaused(on: boolean): void {
        this.paused = on;
        toggleClass(this.el, 'bt-pl--paused', on);
        this.drawSpinner();
    }

    private setBuffering(on: boolean): void {
        this.buffering = on;
        this.drawSpinner();
    }

    private drawSpinner(): void {
        toggleClass(this.el, 'bt-pl--loading', this.buffering && !this.paused);
    }

    private pause(): void {
        this.deps.session.pause();
        this.setPaused(true);
    }

    private resume(): void {
        if (this.track) {
            var at = this.track.commit();
            if (at !== null) {
                this.deps.session.seek(at);
                toggleClass(this.el, 'bt-pl--seeking', false);
            }
        }
        this.deps.session.resume();
        this.setPaused(false);
    }

    /** Pause, Play and the media keys; true when code was one */
    private mediaKey(code: number): boolean {
        if (code === PAUSE) {
            this.pause();
        } else if (code === PLAY || code === MEDIA_PLAY) {
            this.resume();
        } else if (code === PLAY_PAUSE) {
            if (this.paused) {
                this.resume();
            } else {
                this.pause();
            }
        } else {
            return false;
        }
        return true;
    }

    /** Left or Right on the knob: the playback pauses and the pending position moves */
    private seekStep(dir: number): void {
        var track = this.track as Track;
        if (track.pending === null) {
            this.pause();
            // Twitch shows no play sign while a position is chosen
            toggleClass(this.el, 'bt-pl--seeking', true);
        }
        track.step(dir, this.deps.session.position(), Date.now());
    }

    // The overlay

    /** A key: the overlay shows, and hides IDLE_MS after the last one (ms after an open) */
    private wake(ms?: number): void {
        this.setIdle(false);
        clearTimeout(this.hideTimer);
        var self = this;
        this.hideTimer = setTimeout(function () {
            self.idleNow();
        }, ms || IDLE_MS) as unknown as number;
    }

    /** Hides the overlay unless a position is being chosen or a box asks */
    private idleNow(): void {
        if ((this.track && this.track.pending !== null) || this.confirm.open) {
            this.wake();
            return;
        }
        if (this.quality.open) {
            this.quality.close();
            this.drawFocus();
        }
        this.setIdle(true);
    }

    private setIdle(on: boolean): void {
        if (on !== this.idle) {
            this.idle = on;
            toggleClass(this.el, 'bt-pl--idle', on);
        }
        this.ticking(!on && this.visible);
    }

    /** The overlay's second tick: running only while the overlay shows */
    private ticking(on: boolean): void {
        if (on === !!this.tickTimer) {
            return;
        }
        clearInterval(this.tickTimer);
        this.tickTimer = 0;
        if (on) {
            this.tick();
            var self = this;
            this.tickTimer = setInterval(function () {
                self.tick();
            }, 1000) as unknown as number;
        }
    }

    /** Every second while the overlay shows: the uptime, the track */
    private tick(): void {
        if (this.kind === 'live') {
            setText(this.metaSecond, uptime(this.startedAt, Date.now()));
        } else if (this.track) {
            var s = this.deps.session;
            this.track.setDuration(s.duration());
            this.track.setPosition(this.started() ? s.position() : this.resumeAt);
        }
    }

    /** The session plays this screen's target */
    private started(): boolean {
        return this.deps.session.owns(this.events);
    }

    /** Keeps where the viewer is in a past broadcast (while its playback is this screen's) */
    private keep(): void {
        if (this.kind !== 'vod' || !this.started()) {
            return;
        }
        var s = this.deps.session;
        var at = this.track && this.track.pending !== null ? this.track.pending : s.position();
        if (at > 0) {
            keepPosition(this.target.id, at, s.duration());
            this.resumeAt = at;
        }
    }

    // Focus

    private usable(id: string): boolean {
        if (id === 'join') {
            return this.chatShown;
        }
        if (id === 'full') {
            return !!this.videoId;
        }
        if (id === 'knob') {
            return !!this.track;
        }
        return id === 'back' || id === 'avatar' || !!this.buttons[id];
    }

    private move(dir: Direction): void {
        var from = this.focus.current;
        if (from === 'join' && dir === 'left') {
            this.focus.set(this.usable(this.beforeJoin) ? this.beforeJoin : 'follow');
        } else if (!this.focus.move(dir)) {
            return;
        }
        if (this.focus.current === 'join') {
            this.beforeJoin = from;
        }
        this.drawFocus();
        this.rest.item(this.focus.current === 'avatar' ? this.channelItem() : null, this.deps.nav.ahead);
    }

    /** The channel's page as its avatar opens it */
    private channelItem(): Item {
        return { kind: 'channel', channel: this.channel, live: this.kind === 'live' };
    }

    private drawFocus(): void {
        var id = this.focus.current;
        this.focusedId = id;
        toggleClass(this.back, 'bt-focused', id === 'back');
        toggleClass(this.el, 'bt-pl--avatar', id === 'avatar');
        if (this.track) {
            this.track.setFocused(id === 'knob');
        }
        // The quality menu open: the focus is in it
        for (var b in this.buttons) {
            toggleClass(this.buttons[b], 'bt-focused', id === b && !this.quality.open);
        }
    }

    /** OK on a control */
    private press(id: string): void {
        var deps = this.deps;
        if (id === 'back') {
            deps.nav.back();
        } else if (id === 'avatar') {
            deps.nav.open(this.channelItem());
        } else if (id === 'follow') {
            this.follow.press();
        } else if (id === 'full') {
            this.watchFull();
        } else if (id === 'options') {
            deps.nav.push(new OptionsPage(this.channel, this.kind === 'vod' ? this.target.id : '', deps.nav));
        } else if (id === 'quality') {
            if (this.quality.usable()) {
                this.quality.show();
                this.drawFocus();
            }
        } else if (id === 'chat') {
            // Remembered for the next live players, as Twitch's TV app does
            setChatHidden(this.chatShown);
            this.setChat(!this.chatShown);
        } else if (id === 'join') {
            deps.nav.push(new QrPage(joinChat(this.channel.login), deps.nav));
        } else if (id === 'knob') {
            if (this.paused || (this.track && this.track.pending !== null)) {
                this.resume();
            } else {
                this.pause();
            }
        }
    }

    /** The chat shown or hidden: instant, the video and the buttons follow; shown the first time, it joins */
    private setChat(on: boolean): void {
        this.chatShown = on;
        toggleClass(this.el, 'bt-pl--chatless', !on);
        if (on) {
            this.joinChat();
        }
        if (this.chat) {
            this.chat.show(on);
        }
        this.placeVideo();
    }

    /** Opens the chat's connection once per visit */
    private joinChat(): void {
        if (this.chat && !this.chatJoined) {
            this.chatJoined = true;
            this.chat.open(this.channel.login);
        }
    }

    /** The app's video under the screen: the box left of the chat, or the whole screen */
    private placeVideo(): void {
        this.deps.session.placeVideo(this.kind === 'live' && this.chatShown ? BESIDE_CHAT : WHOLE);
    }

    // The line

    private drawInfo(): void {
        var c = this.channel;
        setText(this.nameEl, c.displayName);
        setText(this.bubbleName, c.displayName);
        setText(this.bubbleText, 'Go to ' + c.displayName + '\'s profile...');
        setText(this.titleEl, this.title);
        var src = avatarAt(c.avatar, AVATAR_SIZE);
        if (src && this.avatar.getAttribute('src') !== src) {
            this.avatar.src = src;
        }
        setText(this.metaGame, this.game);
        setShown(this.metaGame, !!this.game);
        setShown(this.sep1, !!this.game);
        if (this.kind === 'live') {
            setText(this.metaSecond, uptime(this.startedAt, Date.now()));
            setText(this.metaThird, viewers(this.viewers));
        } else {
            setText(this.metaSecond, ago(this.date));
            setText(this.metaThird, views(this.views));
        }
        var second = !!this.metaSecond.textContent;
        setShown(this.metaSecond, second);
        setShown(this.sep2, second);
    }

    private askLiveInfo(): void {
        if (document.hidden || this.over) {
            return;
        }
        this.liveAskedAt = Date.now();
        var self = this;
        this.deps.liveInfo(this.channel.login).then(function (u: LiveUpdate | null) {
            if (!u) {
                self.streamEnded();
                return;
            }
            self.title = u.title;
            self.viewers = u.viewers;
            if (u.startedAt) {
                self.startedAt = u.startedAt;
            }
            if (u.game) {
                self.game = u.game.displayName;
            }
            self.drawInfo();
        }, function () { return undefined; });
    }

    /** A clip's past broadcast from where the clip was cut, over the clip */
    private watchFull(): void {
        if (!this.videoId) {
            return;
        }
        var video: Video = {
            id: this.videoId, title: '', channel: this.channel, preview: '', lengthSeconds: 0, views: 0, publishedAt: '',
            kind: 'archive'
        };
        this.deps.nav.push(new PlayerView({ kind: 'vod', video: video, startAt: this.videoOffset }, this.deps));
    }

    // Prompts

    /** Twitch's gate before gated content; its labels and kind come with the gate's own query (a restriction it names
     * there holds even when the tile did not say so) */
    private showGate(): void {
        var self = this;
        this.prompt.set(this.gateModel('', []));
        toggleClass(this.el, 'bt-pl--gate', true);
        if (this.kind !== 'clip') {
            this.deps.session.prefetch(this.target);
        }
        this.deps.gateInfo(this.kind, this.target.id).then(function (g: GateInfo) {
            if (!self.gated) {
                return;
            }
            self.restricted = self.restricted || (!!g.gate && g.gate !== 'CONTENT_GATE_NOT_REQUIRED');
            self.prompt.set(self.gateModel(g.gate, g.labels));
        }, function () { return undefined; });
    }

    /** The gate as Twitch's TV app draws it: mature content with Start Watching and Go Home; a restriction as its kind
     * has it (Go Home only while its kind is not known) */
    private gateModel(gate: string, labels: string[]): PromptModel {
        var self = this;
        var r = this.restricted ? RESTRICTIONS[gate] || BLOCKED : null;
        var buttons: PromptButton[] = [];
        if (!r) {
            buttons.push({ label: 'Start Watching', act: function () { self.passGate(); } });
        } else if (r.button === 'signin') {
            buttons.push({ label: 'Sign In', act: function () { self.deps.nav.signIn(); } });
        } else if (r.button === 'watch') {
            buttons.push({ label: 'Watch Anyway', act: function () { self.passGate(); } });
        }
        buttons.push({ label: 'Go Home', plain: true, act: function () { self.deps.nav.home(); } });
        // An account's limits name no channel and no labels
        var main = r && r.main;
        return {
            picture: 'hand', title: r && r.title || 'Just one second...',
            lines: [
                { text: main || this.channel.displayName + '\'s content is intended for certain audiences.', cls: 'bt-pl-prompt-strong' },
                { text: labels.length && !main ? 'It may contain: ' + labels.join(', ') : '' },
                { text: r ? r.bottom : 'This content may not be appropriate for you to watch.' }
            ],
            buttons: buttons
        };
    }

    private passGate(): void {
        acceptGate(this.channel.login);
        this.gated = false;
        toggleClass(this.el, 'bt-pl--gate', false);
        this.prompt.set(null);
        this.start();
        this.wake(OPEN_IDLE_MS);
    }

    /** A prompt over the picture, the quality menu closed (what plays is the caller's to stop) */
    private showOver(model: PromptModel): void {
        this.over = true;
        this.quality.close();
        this.drawFocus();
        this.prompt.set(model);
        toggleClass(this.el, 'bt-pl--over', true);
    }

    private clearOver(): void {
        this.over = false;
        this.prompt.set(null);
        toggleClass(this.el, 'bt-pl--over', false);
    }

    private streamEnded(): void {
        if (this.deps.session.owns(this.events)) {
            this.deps.session.stop();
        }
        var self = this;
        var name = this.channel.displayName;
        this.showOver({
            picture: 'ended', title: 'This stream has ended.', lines: [],
            buttons: [
                { label: 'Go to ' + name + '\'s profile', act: function () { self.openChannel(); } },
                { label: 'Go to home', act: function () { self.deps.nav.home(); } }
            ]
        });
    }

    /** A past broadcast at its end: watch it again, or its channel */
    private watchAgain(): void {
        var self = this;
        this.showOver({
            picture: 'ended', title: 'Watch Again?', lines: [],
            buttons: [
                {
                    label: 'Yes, watch it again', act: function () {
                        self.clearOver();
                        self.deps.session.seek(0);
                        self.deps.session.resume();
                        self.wake();
                    }
                },
                { label: 'No, go back to profile', act: function () { self.openChannel(); } }
            ]
        });
    }

    /** It cannot play: Twitch's words for why */
    private failed(f: Failure): void {
        var self = this;
        var goBack = { label: 'Go Back', act: function () { self.deps.nav.back(); } };
        if (f.kind === 'offline' && this.kind === 'live') {
            this.streamEnded();
        } else if (f.kind === 'offline' || f.kind === 'forbidden') {
            this.showOver({ picture: 'monitor', title: 'Oh bummer…', lines: [{ text: 'This content is not available.' }], buttons: [goBack] });
        } else if (f.kind === 'stream') {
            this.deps.nav.error(this, 'not-playable');
        } else {
            this.showOver({
                picture: 'monitor', title: 'Oh bummer…', lines: [{ text: 'An error occurred while playing this content' }],
                buttons: [
                    {
                        label: 'Reload', act: function () {
                            self.clearOver();
                            self.start();
                            self.wake();
                        }
                    },
                    goBack
                ]
            });
        }
    }

    /** The channel's page (the one under the player when it is that) */
    private openChannel(): void {
        this.deps.nav.open({ kind: 'channel', channel: this.channel, live: false });
    }
}
