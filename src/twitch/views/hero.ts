// The top half of Home as Twitch's TV app draws it: a picture stretched across the width under a dark gradient, the
// category's box art (a blank box without one), LIVE NOW, a line such as the channel playing the category, and a
// title in at most two lines; lines without text are left out and the rest stay centred on the box art. heroOf says
// what to show for a tile on Home, followingHeroOf on Following (HeroModel). Built once; show() changes texts at
// once and the pictures once focus rests while keys repeat (a screen showing again or its first tiles coming draw
// them at once). Pictures focus can reach next are fetched ahead, so they come from the cache when it moves there.

import { h, setShown, setText, toggleClass } from '../../core/dom.js';
import { previewAt, sized } from '../api/pictures.js';
import { Item, Stream } from '../api/types.js';
import { blankBoxIcon } from './icons.js';
import { ago, setSource } from './tiles.js';

export interface HeroModel {
    /** The big picture and the box art ('' for none: the blank box) */
    picture: string;
    art: string;
    /** LIVE NOW over the lines */
    live: boolean;
    /** OFFLINE over the lines instead (white, semibold); line2 is then a plain line, not a title */
    offline?: boolean;
    /** Under LIVE NOW: who plays what, and the title ('' leaves a line out) */
    line1: string;
    line2: string;
}

/** Twitch asks the hero's picture this wide (it shows it 1920 wide) */
var HERO_WIDTH = 540;

/** A tile with nothing to picture: the blank box and LIVE NOW alone */
var BLANK: HeroModel = { picture: '', art: '', live: true, line1: '', line2: '' };

/** The hero for a tile on Home: a stream's, a category's top stream's (none: the blank box and LIVE NOW alone, as
 * Twitch's Home draws a category without one); also an offline channel's (OFFLINE, its name, when it was last live
 * playing what, over its banner and that category's box art) and a past broadcast's or clip's picture, which Search
 * shows */
export function heroOf(item: Item): HeroModel {
    if (item.kind === 'channel') {
        var c = item.channel;
        return {
            picture: c.banner || '',
            art: item.lastGame ? item.lastGame.boxArt : '',
            live: false,
            offline: true,
            line1: c.displayName,
            // Twitch draws this line only with both
            line2: item.lastLive && item.lastGame ? 'Last live ' + ago(item.lastLive).toLowerCase() + ' playing ' + item.lastGame.displayName : ''
        };
    }
    if (item.kind === 'video' || item.kind === 'clip') {
        var still = item.kind === 'video' ? item.video.preview : item.clip.thumbnail;
        return { picture: still ? sized(still, HERO_WIDTH, Math.round(HERO_WIDTH * 9 / 16)) : '', art: '', live: false, line1: '', line2: '' };
    }
    var s: Stream | undefined = item.kind === 'stream' ? item.stream : item.game.topStream;
    if (!s) {
        return BLANK;
    }
    return {
        picture: previewAt(s.preview, HERO_WIDTH),
        art: s.game ? s.game.boxArt : '',
        live: true,
        // Twitch draws this line only with both the channel and the category
        line1: s.game ? s.channel.displayName + ' playing ' + s.game.displayName : '',
        line2: s.title
    };
}

/** The hero for a tile on Following: Home's, but a followed category without a live stream shows its own box art
 * with no picture and no lines */
export function followingHeroOf(item: Item): HeroModel {
    if (item.kind === 'game' && !item.game.topStream) {
        return { picture: '', art: item.game.boxArt, live: false, line1: '', line2: '' };
    }
    return heroOf(item);
}

/** Pictures fetched ahead, kept so they are not collected before the cache has them */
var AHEAD = 8;
/** A show() this soon after the last one is a repeating key: its pictures wait until focus rests this long */
var REPEAT_MS = 150;
var REST_MS = 200;
/** Fetched-ahead addresses remembered (then forgotten all at once) */
var FETCHED_MAX = 400;

export class Hero {
    el: HTMLElement;
    private pic: HTMLImageElement;
    private shade: HTMLElement;
    private art: HTMLImageElement;
    private artBox: HTMLElement;
    /** LIVE NOW or OFFLINE */
    private top: HTMLElement;
    private line1: HTMLElement;
    private line2: HTMLElement;
    private lastShow = 0;
    private restTimer = 0;
    private ahead: HTMLImageElement[] = [];
    private fetched: { [url: string]: boolean } = {};
    private fetchedCount = 0;

    constructor() {
        this.el = h('div', 'bt-hero');
        this.pic = this.el.appendChild(h('img', 'bt-hero-pic')) as HTMLImageElement;
        // No picture yet: hidden (an image without one draws a frame)
        setShown(this.pic, false);
        this.shade = this.el.appendChild(h('div', 'bt-hero-shade')) as HTMLElement;
        this.artBox = this.el.appendChild(h('div', 'bt-hero-art')) as HTMLElement;
        this.art = this.artBox.appendChild(h('img')) as HTMLImageElement;
        this.artBox.appendChild(h('div', 'bt-hero-art-blank')).appendChild(blankBoxIcon());
        var text = this.el.appendChild(h('div', 'bt-hero-text')) as HTMLElement;
        this.top = text.appendChild(h('div', 'bt-hero-live', 'LIVE NOW')) as HTMLElement;
        this.line1 = text.appendChild(h('div', 'bt-hero-who')) as HTMLElement;
        this.line2 = text.appendChild(h('div', 'bt-hero-title')) as HTMLElement;
        setShown(this.el, false);
    }

    /** atOnce: not a key (the screen shows again, its first tiles came): the pictures now, and the next show is not
     * taken for a repeat */
    show(m: HeroModel, atOnce?: boolean): void {
        setShown(this.el, true);
        var offline = !!m.offline;
        setText(this.top, offline ? 'OFFLINE' : 'LIVE NOW');
        toggleClass(this.el, 'bt-hero--offline', offline);
        showLine(this.top, m.live || offline);
        setText(this.line1, m.line1);
        showLine(this.line1, !!m.line1);
        setText(this.line2, m.line2);
        showLine(this.line2, !!m.line2);
        var now = Date.now();
        var repeating = !atOnce && now - this.lastShow < REPEAT_MS;
        this.lastShow = atOnce ? 0 : now;
        clearTimeout(this.restTimer);
        if (repeating) {
            var self = this;
            this.restTimer = setTimeout(function () {
                self.pictures(m);
            }, REST_MS) as unknown as number;
        } else {
            this.pictures(m);
        }
    }

    /** Its pictures are in (loaded or failed) */
    loaded(): boolean {
        return (!this.pic.getAttribute('src') || this.pic.complete) && (!this.art.getAttribute('src') || this.art.complete);
    }

    /** Fetches these heroes' pictures ahead (the ones focus can reach in one step); each address once */
    prefetch(models: HeroModel[]): void {
        for (var i = 0; i < models.length; i++) {
            this.fetchAhead(models[i].picture);
            this.fetchAhead(models[i].art);
        }
    }

    /** Stops a picture change still waiting (the screen is hidden) */
    pause(): void {
        clearTimeout(this.restTimer);
    }

    /** Gone until the next show() (no tile to show) */
    hide(): void {
        this.pause();
        setShown(this.el, false);
    }

    private pictures(m: HeroModel): void {
        setSource(this.pic, m.picture);
        // A banner keeps its own shape (Twitch draws it 1280 wide from the top); previews are 16:9
        toggleClass(this.pic, 'bt-hero-pic--banner', !!m.offline);
        // Without a picture the page colour shows, as in Twitch's app
        setShown(this.shade, !!m.picture);
        setSource(this.art, m.art);
        toggleClass(this.artBox, 'bt-hero-art--blank', !m.art);
    }

    private fetchAhead(url: string): void {
        if (!url || this.fetched[url] || url === this.pic.getAttribute('src')) {
            return;
        }
        if (this.fetchedCount >= FETCHED_MAX) {
            this.fetched = {};
            this.fetchedCount = 0;
        }
        this.fetched[url] = true;
        this.fetchedCount++;
        var img = this.ahead.length >= AHEAD ? this.ahead.shift() as HTMLImageElement : new Image();
        img.src = url;
        this.ahead.push(img);
    }
}

/** A hero line in the column (true) or left out, so the lines left stay centred on the box art */
function showLine(el: HTMLElement, on: boolean): void {
    el.style.display = on ? '' : 'none';
}
