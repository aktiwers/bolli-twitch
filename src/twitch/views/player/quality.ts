// The quality menu over the gear, as Twitch's TV app draws it: a dark panel with Auto and each quality, best first.
// Better than Twitch's: Auto names the quality playing ("Auto (720p60)"), the menu opens on the current choice and a
// check marks it. Up/Down move, OK picks (the player switches without a restart), Back closes it; Left and Right close
// it and move on from the gear.

import { h, setShown, setText, toggleClass } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { icon } from './icons.js';

export class QualityMenu {
    el: HTMLElement;
    open = false;
    private items: HTMLElement[] = [];
    private labels: HTMLElement[] = [];
    private names: string[] = [];
    /** The choice: an index in names, -1 for Auto */
    private picked = -1;
    /** The focused item: 0 Auto, then the qualities */
    private index = 0;

    constructor(private choose: (index: number) => void) {
        this.el = h('div', 'bt-pl-quality');
        setShown(this.el, false);
        this.build();
    }

    /** What plays: the qualities' names (best first), the choice (-1 Auto) and the quality playing (-1 not known) */
    set(names: string[], picked: number, playing: number): void {
        if (names.join() !== this.names.join()) {
            this.names = names.slice();
            this.build();
        }
        this.picked = picked;
        var auto = 'Auto' + (picked < 0 && names[playing] ? ' (' + names[playing] + ')' : '');
        setText(this.labels[0], auto);
        for (var i = 0; i < this.items.length; i++) {
            toggleClass(this.items[i], 'bt-pl-quality-item--picked', i === picked + 1);
        }
    }

    /** The menu has qualities to offer */
    usable(): boolean {
        return this.names.length > 0;
    }

    show(): void {
        this.open = true;
        this.index = this.picked + 1;
        this.mark();
        setShown(this.el, true);
    }

    close(): void {
        this.open = false;
        setShown(this.el, false);
    }

    /** Keys while it is open: false for Left and Right (it closed; the player moves on from the gear) */
    onKey(code: number): boolean {
        if (code === KEY.UP && this.index > 0) {
            this.index--;
            this.mark();
        } else if (code === KEY.DOWN && this.index < this.items.length - 1) {
            this.index++;
            this.mark();
        } else if (code === KEY.OK) {
            this.close();
            this.choose(this.index - 1);
        } else if (code === KEY.BACK) {
            this.close();
        } else if (code === KEY.LEFT || code === KEY.RIGHT) {
            this.close();
            return false;
        }
        return true;
    }

    private build(): void {
        this.el.textContent = '';
        this.items = [];
        this.labels = [];
        var all = ['Auto'].concat(this.names);
        for (var i = 0; i < all.length; i++) {
            var item = this.el.appendChild(h('div', 'bt-pl-quality-item')) as HTMLElement;
            item.appendChild(h('span', 'bt-pl-quality-check')).appendChild(icon('check'));
            this.labels.push(item.appendChild(h('span', '', all[i])) as HTMLElement);
            this.items.push(item);
        }
    }

    private mark(): void {
        for (var i = 0; i < this.items.length; i++) {
            toggleClass(this.items[i], 'bt-focused', i === this.index);
        }
    }
}
