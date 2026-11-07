// Twitch's Settings cards: wide cards one under the other (an icon, a title and a line, or a title alone), the
// focused one light with the purple ring. Up/Down walk them without wrapping. A list longer than the screen slides
// (0.1 s) only as far as keeps the focused card in view (with a group's heading when its first card has focus),
// always to the start of a card or heading. Positions are fixed sums (nothing is measured).

import { h, LAYOUT_HEIGHT, setText, toggleClass, translate } from '../../../core/dom.js';
import { cardIcon } from '../art.js';

export interface Card {
    title: string;
    /** The line under the title (none: the title alone, centred) */
    line?: string;
    /** Its icon (art.ts cardIcon) */
    icon?: string;
    /** A setting's value, at the right */
    value?: string;
    /** A heading over the card: it begins a group */
    heading?: string;
}

/** A card and the gap to the next (152 px at 1920), and a group's heading */
var CARD_STEP = 101.33;
var HEADING = 54;
/** Room kept under the focused card */
var BOTTOM_ROOM = 24;

/** n to the hundredth of a pixel, so sums of the steps stay exact */
function hundredths(n: number): number {
    return Math.round(n * 100) / 100;
}

interface Drawn {
    el: HTMLElement;
    title: HTMLElement;
    line: HTMLElement | null;
    value: HTMLElement;
}

export class CardList {
    el: HTMLElement;
    index = 0;
    private cards: Drawn[] = [];
    /** Each card's top in the list, and the heading over it */
    private tops: number[] = [];
    private headings: number[] = [];
    private height = 0;
    private scroll = 0;
    private focused = true;

    /** top: where the first card is on screen */
    constructor(private top: number) {
        this.el = h('div', 'bt-set-list');
        this.el.style.top = top + 'px';
    }

    get length(): number {
        return this.cards.length;
    }

    add(card: Card): void {
        var heading = 0;
        if (card.heading) {
            var head = this.el.appendChild(h('div', 'bt-set-heading', card.heading)) as HTMLElement;
            head.style.top = this.height + 'px';
            heading = HEADING;
            this.height = hundredths(this.height + HEADING);
        }
        var el = this.el.appendChild(h('div', card.line === undefined ? 'bt-set-card bt-set-card--plain' : 'bt-set-card')) as HTMLElement;
        el.style.top = this.height + 'px';
        var box = el.appendChild(h('div', 'bt-set-box')) as HTMLElement;
        if (card.icon) {
            box.appendChild(h('div', 'bt-set-icon')).appendChild(cardIcon(card.icon));
        }
        var title = box.appendChild(h('div', 'bt-set-title', card.title)) as HTMLElement;
        var line = card.line === undefined ? null : box.appendChild(h('div', 'bt-set-line', card.line)) as HTMLElement;
        var value = box.appendChild(h('div', 'bt-set-value', card.value || '')) as HTMLElement;
        this.cards.push({ el: el, title: title, line: line, value: value });
        this.tops.push(this.height);
        this.headings.push(heading);
        this.height = hundredths(this.height + CARD_STEP);
        this.mark();
    }

    /** New words on card i */
    update(i: number, title: string, line: string, value: string): void {
        var card = this.cards[i];
        setText(card.title, title);
        if (card.line) {
            setText(card.line, line);
        }
        setText(card.value, value);
    }

    /** Up/Down: false past the first or last card */
    move(delta: number): boolean {
        var to = this.index + delta;
        if (to < 0 || to >= this.cards.length) {
            return false;
        }
        this.index = to;
        this.mark();
        return true;
    }

    setFocused(focused: boolean): void {
        this.focused = focused;
        this.mark();
    }

    private mark(): void {
        for (var i = 0; i < this.cards.length; i++) {
            toggleClass(this.cards[i].el, 'bt-set-card--focused', this.focused && i === this.index);
        }
        if (!this.cards.length) {
            return;
        }
        var top = this.tops[this.index];
        var view = LAYOUT_HEIGHT - this.top - BOTTOM_ROOM;
        var scroll = this.scroll;
        if (top - this.headings[this.index] < scroll) {
            scroll = top - this.headings[this.index];
        } else if (top + CARD_STEP > scroll + view) {
            scroll = top + CARD_STEP - view;
            // From the start of a heading or card, so none shows cut under the top
            for (var k = 0; k < this.tops.length; k++) {
                var start = this.tops[k] - this.headings[k];
                if (start >= scroll || this.tops[k] >= scroll) {
                    scroll = start >= scroll ? start : this.tops[k];
                    break;
                }
            }
        }
        scroll = hundredths(scroll);
        if (scroll !== this.scroll) {
            this.scroll = scroll;
            translate(this.el, 0, -scroll);
        }
    }
}
