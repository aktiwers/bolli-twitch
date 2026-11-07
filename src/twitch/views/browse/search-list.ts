// The list beside Search's keyboard, in the look of Twitch's TV app's "Recent Searches:" list: rows 65 px tall at
// 83 px steps (1920 px), an icon then the text, focus the light box with the purple ring. Nothing typed, it holds the
// recent searches and Clear Recent Searches under Twitch's heading; while typing, the typed text and Twitch's
// suggestions (terms, categories with their box art, channels with their avatar), the typed part of each set apart as
// on Twitch's website, a category's or channel's kind (or LIVE) at the right. At most VISIBLE rows show; the list
// slides one row at a time to keep focus in view. Row elements are built once and rewritten; new rows arriving under
// the focus (Twitch's suggestions) can leave it on the same row.

import { h, setShown, setText, toggleClass, translate } from '../../../core/dom.js';
import { Suggestion } from '../../api/suggest.js';
import { setSource } from '../tiles.js';
import { browseIcon } from './icons.js';

/** Rows in view, and the step between rows (83 px at 1920) */
var VISIBLE = 5;
var STEP = 55.33;
var ICONS: { [kind: string]: string } = { recent: 'recent', clear: 'trash', term: 'find' };

interface RowEl {
    el: HTMLElement;
    icon: HTMLElement;
    img: HTMLImageElement;
    /** The text before the typed part, the typed part, and after it */
    pre: HTMLElement;
    match: HTMLElement;
    post: HTMLElement;
    side: HTMLElement;
    live: HTMLElement;
    /** The icon drawn now ('' for a picture) */
    drawn: string;
}

export class SearchList {
    el: HTMLElement;
    rows: Suggestion[] = [];
    index = 0;
    private heading: HTMLElement;
    private strip: HTMLElement;
    private els: RowEl[] = [];
    private first = 0;
    private focused = false;

    constructor() {
        this.el = h('div', 'bt-list');
        this.heading = this.el.appendChild(h('div', 'bt-list-heading')) as HTMLElement;
        var box = this.el.appendChild(h('div', 'bt-list-box')) as HTMLElement;
        this.strip = box.appendChild(h('div', 'bt-list-strip')) as HTMLElement;
    }

    get focusedRow(): Suggestion | null {
        return this.rows[this.index] || null;
    }

    /** New rows under a heading ('' for none); focus back on the first, or (keep) on the same row where it is among
     * them, else at the nearest place */
    set(heading: string, rows: Suggestion[], keep?: boolean): void {
        var was = keep ? this.focusedRow : null;
        setText(this.heading, heading);
        this.rows = rows;
        for (var i = 0; i < rows.length; i++) {
            this.fill(this.rowEl(i), rows[i]);
        }
        for (var k = 0; k < this.els.length; k++) {
            this.els[k].el.style.display = k < rows.length ? '' : 'none';
        }
        this.index = was ? sameRow(rows, was, this.index) : 0;
        this.reveal();
    }

    /** Up/Down: false past the ends */
    move(delta: number): boolean {
        var to = this.index + delta;
        if (to < 0 || to >= this.rows.length) {
            return false;
        }
        this.index = to;
        this.reveal();
        return true;
    }

    setFocused(focused: boolean): void {
        this.focused = focused;
        this.mark();
    }

    /** Slides so the focused row is in view */
    private reveal(): void {
        var first = Math.max(0, Math.min(this.first, this.index, this.rows.length - VISIBLE), this.index - VISIBLE + 1);
        if (first !== this.first) {
            this.first = first;
            translate(this.strip, 0, -first * STEP);
        }
        this.mark();
    }

    private mark(): void {
        for (var i = 0; i < this.els.length; i++) {
            toggleClass(this.els[i].el, 'bt-focused', this.focused && i === this.index);
        }
    }

    private rowEl(i: number): RowEl {
        while (this.els.length <= i) {
            var el = this.strip.appendChild(h('div', 'bt-list-row')) as HTMLElement;
            el.style.top = this.els.length * STEP + 'px';
            var icon = el.appendChild(h('div', 'bt-list-icon')) as HTMLElement;
            var img = icon.appendChild(h('img', 'bt-list-pic')) as HTMLImageElement;
            setShown(img, false);
            var text = el.appendChild(h('div', 'bt-list-text')) as HTMLElement;
            var pre = text.appendChild(h('span', 'bt-list-rest')) as HTMLElement;
            var match = text.appendChild(h('span', 'bt-list-match')) as HTMLElement;
            var post = text.appendChild(h('span', 'bt-list-rest')) as HTMLElement;
            var side = el.appendChild(h('div', 'bt-list-side')) as HTMLElement;
            var live = el.appendChild(h('div', 'bt-live bt-list-live', 'Live')) as HTMLElement;
            this.els.push({ el: el, icon: icon, img: img, pre: pre, match: match, post: post, side: side, live: live, drawn: '' });
        }
        return this.els[i];
    }

    private fill(r: RowEl, row: Suggestion): void {
        var icon = ICONS[row.kind] || '';
        if (icon !== r.drawn) {
            var old = r.icon.lastChild;
            if (old && old !== r.img) {
                r.icon.removeChild(old);
            }
            if (icon) {
                r.icon.appendChild(browseIcon(icon, 'bt-list-svg'));
            }
            r.drawn = icon;
        }
        setSource(r.img, icon ? '' : row.picture);
        toggleClass(r.icon, 'bt-list-icon--art', row.kind === 'game');
        toggleClass(r.icon, 'bt-list-icon--avatar', row.kind === 'channel');
        // Recent searches and Clear are Twitch's plain rows; the rest set the typed part apart
        var plain = row.kind === 'recent' || row.kind === 'clear';
        setText(r.pre, plain ? '' : row.text.slice(0, row.start));
        setText(r.match, plain ? row.text : row.text.slice(row.start, row.end));
        setText(r.post, plain ? '' : row.text.slice(row.end));
        toggleClass(r.el, 'bt-list-row--plain', plain);
        setText(r.side, row.kind === 'game' ? 'Category' : row.kind === 'channel' && !row.live ? 'Channel' : '');
        setShown(r.live, row.kind === 'channel' && !!row.live);
    }
}

/** Where row is among rows (the same kind and text), else index within them */
function sameRow(rows: Suggestion[], row: Suggestion, index: number): number {
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].kind === row.kind && rows[i].text === row.text) {
            return i;
        }
    }
    return Math.max(0, Math.min(index, rows.length - 1));
}
