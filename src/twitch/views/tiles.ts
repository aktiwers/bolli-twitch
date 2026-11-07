// Twitch's tiles as its TV app draws them, in 1280x720 units: a stream (picture with LIVE and viewers, avatar,
// title, channel, category), a category (box art, name, viewers), a past broadcast or clip (picture with views and
// length, the category's box art, title, date, category) and an offline channel (a round avatar, name, last live,
// followers). Twitch draws an offline channel two ways: wide with a 150 avatar and centred text (Search), and in
// Following's offline row narrow with a 120 avatar and text to the left (the row asks for it: ChannelCard). A tile
// is built once; set() gives it another item of its kind, so a row keeps its tiles when fresh data comes. Pictures
// are asked only while the row wants them (pictures()).

import { h, setShown, setText, toggleClass } from '../../core/dom.js';
import { clock } from '../../core/time.js';
import { avatarAt } from '../api/pictures.js';
import { Channel, Game, Item, Stream, Video } from '../api/types.js';

/** What a kind of tile is made of and shows */
interface Kind {
    /** The tile's width, and the step between tiles in a row (444 or 222 px at 1920) */
    width: number;
    cls: string;
    /** On the picture: LIVE, the count at the bottom left, the length at the bottom right */
    live: boolean;
    stat: boolean;
    length: boolean;
    /** The small picture beside the text (its class), or none */
    mark: string;
    /** Lines under the title */
    lines: number;
    /** The title, the lines, then the count and the length where the kind has them */
    texts(item: Item): string[];
    /** The picture and the small one */
    pictures(item: Item): string[];
}

type StreamItem = Extract<Item, { kind: 'stream' }>;
type GameItem = Extract<Item, { kind: 'game' }>;
type ChannelItem = Extract<Item, { kind: 'channel' }>;

var WIDE = 296;

var STREAM: Kind = {
    width: WIDE, cls: 'bt-tile', live: true, stat: true, length: false, mark: 'bt-tile-avatar', lines: 2,
    texts: function (item: Item): string[] {
        var s = (item as StreamItem).stream;
        return [s.title, s.channel.displayName, gameName(s.game), count(s.viewers, 1, 'viewer')];
    },
    pictures: function (item: Item): string[] {
        var s = (item as StreamItem).stream;
        return [s.preview, s.channel.avatar];
    }
};

var GAME: Kind = {
    width: 148, cls: 'bt-tile bt-tile--game', live: false, stat: false, length: false, mark: '', lines: 1,
    texts: function (item: Item): string[] {
        var g = (item as GameItem).game;
        return [g.displayName, g.viewers !== undefined ? count(g.viewers, 0, 'viewer') : ''];
    },
    pictures: function (item: Item): string[] {
        return [(item as GameItem).game.boxArt, ''];
    }
};

/** Past broadcasts and clips: Twitch draws them alike */
var VIDEO: Kind = {
    width: WIDE, cls: 'bt-tile', live: false, stat: true, length: true, mark: 'bt-tile-art', lines: 2,
    texts: function (item: Item): string[] {
        var v = videoOf(item);
        return [v.title, ago(v.at), gameName(v.game), count(v.views, 1, 'view'), clock(v.seconds)];
    },
    pictures: function (item: Item): string[] {
        var v = videoOf(item);
        // Twitch shows the box art 72x96 here: the tile's 138x184 fits
        return [v.picture, v.game ? v.game.boxArt : ''];
    }
};

/** An offline channel: its name, when it was last live and its followers (each line only when known); Twitch asks
 * the avatar 300 wide for both cards */
function channelTexts(item: Item): string[] {
    var c = item as ChannelItem;
    return [cardName(c.channel), c.lastLive ? 'Last live ' + ago(c.lastLive).toLowerCase() : '',
        c.channel.followers !== undefined ? count(c.channel.followers, 1, 'follower') : ''];
}

/** The name on an offline channel's card as Twitch writes it: one with letters beyond ASCII (e.g. Korean) gets the
 * login after it; none: the login */
function cardName(c: Channel): string {
    var name = c.displayName;
    if (!name) {
        return c.login;
    }
    return c.login && /[^\x00-\x7F]/.test(name) ? name + ' (' + c.login + ')' : name;
}

function channelPictures(item: Item): string[] {
    return [avatarAt((item as ChannelItem).channel.avatar, 300), ''];
}

/** Twitch's wide card (24.67 rem: a stream tile's width) */
var CHANNEL: Kind = {
    width: WIDE, cls: 'bt-tile bt-tile--channel', live: false, stat: false, length: false, mark: '', lines: 2,
    texts: channelTexts, pictures: channelPictures
};

/** Twitch's narrow card (12.33 rem, eight to a row: a category tile's width) */
var NARROW_CHANNEL: Kind = {
    width: 148, cls: 'bt-tile bt-tile--channel bt-tile--narrow', live: false, stat: false, length: false, mark: '', lines: 2,
    texts: channelTexts, pictures: channelPictures
};

var KINDS: { [kind: string]: Kind } = { stream: STREAM, game: GAME, video: VIDEO, clip: VIDEO, channel: CHANNEL };

/** Which card a row draws for an offline channel: wide (Search) or narrow (Following's offline row) */
export type ChannelCard = 'wide' | 'narrow';

function kindOf(item: Item, card?: ChannelCard): Kind {
    return card === 'narrow' && item.kind === 'channel' ? NARROW_CHANNEL : KINDS[item.kind];
}

export function streamItem(stream: Stream): Item {
    return { kind: 'stream', stream: stream };
}

export function gameItem(game: Game): Item {
    return { kind: 'game', game: game };
}

export function videoItem(video: Video): Item {
    return { kind: 'video', video: video };
}

/** The width an item's tile takes in a row */
export function tileWidth(item: Item, card?: ChannelCard): number {
    return kindOf(item, card).width;
}

function gameName(game?: Game): string {
    return game ? game.displayName : '';
}

/** A past broadcast's or clip's fields as their tile shows them */
function videoOf(item: Item): { title: string; at: string; game?: Game; views: number; seconds: number; picture: string } {
    if (item.kind === 'video') {
        var v = item.video;
        return { title: v.title, at: v.publishedAt, game: v.game, views: v.views, seconds: v.lengthSeconds, picture: v.preview };
    }
    var c = (item as Extract<Item, { kind: 'clip' }>).clip;
    return { title: c.title, at: c.createdAt, game: c.game, views: c.views, seconds: c.durationSeconds, picture: c.thumbnail };
}

/** Twitch's short counts with their noun: 55.3K viewers, 22K viewers (1 decimal), 16K viewers (none), 1 view */
export function count(n: number, decimals: number, noun: string): string {
    var text = String(n);
    if (n >= 1000) {
        // Millions from where the thousands would round up to 1000K (999.95K with a decimal, 999.5K without)
        var unit = n < (decimals ? 999950 : 999500) ? 1000 : 1000000;
        var scale = decimals ? unit / 10 : unit;
        // From whole numbers: 21950 / 100 rounds to 220, where 21.95 * 10 would round down
        text = String(Math.round(n / scale) / (decimals ? 10 : 1)) + (unit === 1000 ? 'K' : 'M');
    }
    return text + ' ' + noun + (n === 1 ? '' : 's');
}

var UNITS: [number, string][] = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];

/** Twitch's relative dates: 4 hours ago, Yesterday, Last month, Last year, 5 months ago */
export function ago(iso: string, now?: number): string {
    var then = Date.parse(iso);
    if (isNaN(then)) {
        return '';
    }
    var secs = Math.max(0, ((now || Date.now()) - then) / 1000);
    for (var i = 0; i < UNITS.length; i++) {
        var n = Math.floor(secs / UNITS[i][0]);
        var unit = UNITS[i][1];
        if (n > 1) {
            return n + ' ' + unit + 's ago';
        }
        if (n === 1) {
            return unit === 'day' ? 'Yesterday' : unit === 'hour' || unit === 'minute' ? '1 ' + unit + ' ago' : 'Last ' + unit;
        }
    }
    return 'Just now';
}

export class Tile {
    el: HTMLElement;
    item: Item;
    private kind: Kind;
    private card: ChannelCard | undefined;
    private img: HTMLImageElement;
    /** The small picture beside the text: an avatar, or a category's box art (videos, clips) */
    private mark: HTMLImageElement | null = null;
    /** The title, the lines, the count and the length, in the order of Kind.texts */
    private texts: HTMLElement[] = [];
    private wanted = false;
    /** The item changed since its pictures were set */
    private stale = false;
    private shown = true;

    /** card: the card for an offline channel (wide when not given) */
    constructor(item: Item, card?: ChannelCard) {
        var kind = this.kind = kindOf(item, card);
        this.card = card;
        this.item = item;
        this.el = h('div', kind.cls);
        var lift = this.el.appendChild(h('div', 'bt-tile-lift')) as HTMLElement;
        this.img = lift.appendChild(h('img', 'bt-tile-img')) as HTMLImageElement;
        if (kind.live) {
            lift.appendChild(h('div', 'bt-live', 'Live'));
        }
        if (kind.mark) {
            this.mark = this.el.appendChild(h('img', kind.mark)) as HTMLImageElement;
        }
        var text = this.el.appendChild(h('div', 'bt-tile-text')) as HTMLElement;
        this.texts.push(text.appendChild(h('div', 'bt-tile-title')) as HTMLElement);
        for (var i = 0; i < kind.lines; i++) {
            this.texts.push(text.appendChild(h('div', 'bt-tile-line')) as HTMLElement);
        }
        if (kind.stat) {
            this.texts.push(lift.appendChild(h('div', 'bt-stat')) as HTMLElement);
        }
        if (kind.length) {
            this.texts.push(lift.appendChild(h('div', 'bt-stat bt-stat--end')) as HTMLElement);
        }
        this.fill();
    }

    /** Shows another item of the same kind, its texts at once; its pictures with the next pictures(true) (false:
     * another kind, build a new tile) */
    set(item: Item): boolean {
        if (kindOf(item, this.card) !== this.kind) {
            return false;
        }
        this.item = item;
        this.stale = true;
        this.fill();
        return true;
    }

    /** Asks the pictures (true) or lets them go (false; they come back from the cache) */
    pictures(on: boolean): void {
        if (on === this.wanted && !(on && this.stale)) {
            return;
        }
        this.wanted = on;
        this.stale = false;
        var p = on ? this.kind.pictures(this.item) : ['', ''];
        setSource(this.img, p[0]);
        if (this.mark) {
            setSource(this.mark, p[1]);
        }
    }

    /** Its pictures are in: none asked, or every one asked has loaded (or failed) */
    loaded(): boolean {
        return done(this.img) && (!this.mark || done(this.mark));
    }

    /** Drawn (false: display none, the TV paints no layer for it) */
    setShown(on: boolean): void {
        if (on !== this.shown) {
            this.shown = on;
            this.el.style.display = on ? '' : 'none';
        }
    }

    setFocused(on: boolean): void {
        toggleClass(this.el, 'bt-tile--focused', on);
    }

    private fill(): void {
        var texts = this.kind.texts(this.item);
        for (var i = 0; i < this.texts.length; i++) {
            setText(this.texts[i], texts[i] || '');
        }
    }
}

/** An image without a source, or one done loading */
function done(img: HTMLImageElement): boolean {
    return !img.getAttribute('src') || img.complete;
}

/** Sets an image's source when it changes; none removes it and hides the image (else the browser draws its broken
 * picture sign) */
export function setSource(img: HTMLImageElement, src: string): void {
    if (src) {
        if (img.getAttribute('src') !== src) {
            img.src = src;
            setShown(img, true);
        }
    } else if (img.hasAttribute('src')) {
        img.removeAttribute('src');
        setShown(img, false);
    }
}
