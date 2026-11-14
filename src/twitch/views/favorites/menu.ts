// A channel's menu, opened by holding OK on a tile that stands for the channel: in the look of Twitch's question box
// (a panel over the dimmed screen), the channel's name over its choices, one under the other: Add to Favorites (a
// favorite: Remove from Favorites), Go to channel and, on the Favorites tab, Move (on its rows) and Move to the front. The first choice is
// focused; Up/Down move without wrapping, OK picks one and closes the menu, Back closes it. Whoever opened it passes
// it the keys while it is open.

import { h, setShown, setText, toggleClass } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';

export type MenuChoice = 'add' | 'remove' | 'channel' | 'move' | 'front';

/** Every choice in the order the menu lists them */
var ORDER: MenuChoice[] = ['add', 'remove', 'channel', 'move', 'front'];
var LABELS: { [choice: string]: string } = {
    add: 'Add to Favorites', remove: 'Remove from Favorites', channel: 'Go to channel', move: 'Move',
    front: 'Move to the front'
};

export class ChannelMenu {
    el: HTMLElement;
    open = false;
    private title: HTMLElement;
    private items: { [choice: string]: HTMLElement } = {};
    /** The choices offered now, in ORDER */
    private choices: MenuChoice[] = [];
    private index = 0;

    /** pick: OK on a choice (the menu has closed) */
    constructor(private pick: (choice: MenuChoice) => void) {
        this.el = h('div', 'bt-modal bt-hold');
        var panel = this.el.appendChild(h('div', 'bt-modal-panel bt-hold-panel')) as HTMLElement;
        this.title = panel.appendChild(h('div', 'bt-modal-title')) as HTMLElement;
        for (var i = 0; i < ORDER.length; i++) {
            this.items[ORDER[i]] = panel.appendChild(h('div', 'bt-button bt-button--plain bt-hold-item', LABELS[ORDER[i]])) as HTMLElement;
        }
        setShown(this.el, false);
    }

    /** Opens under the channel's name with these choices, the first one focused */
    show(name: string, offered: MenuChoice[]): void {
        setText(this.title, name);
        this.choices = [];
        for (var i = 0; i < ORDER.length; i++) {
            var on = offered.indexOf(ORDER[i]) >= 0;
            this.items[ORDER[i]].style.display = on ? '' : 'none';
            if (on) {
                this.choices.push(ORDER[i]);
            }
        }
        this.index = 0;
        this.mark();
        this.open = true;
        setShown(this.el, true);
    }

    close(): void {
        this.open = false;
        setShown(this.el, false);
    }

    /** A key while it is open (every key is its own) */
    onKey(code: number): void {
        if (code === KEY.UP || code === KEY.DOWN) {
            var to = this.index + (code === KEY.UP ? -1 : 1);
            if (to >= 0 && to < this.choices.length) {
                this.index = to;
                this.mark();
            }
        } else if (code === KEY.OK) {
            var choice = this.choices[this.index];
            this.close();
            this.pick(choice);
        } else if (code === KEY.BACK) {
            this.close();
        }
    }

    private mark(): void {
        for (var i = 0; i < ORDER.length; i++) {
            toggleClass(this.items[ORDER[i]], 'bt-focused', ORDER[i] === this.choices[this.index]);
        }
    }
}
