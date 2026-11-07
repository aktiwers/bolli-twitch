// Twitch's confirmation box (its TV app asks "Unfollow <name>?" this way): a panel over the dimmed screen with a title,
// a line and two buttons, the first (the cancel) focused. Left/Right move between them, OK picks one, Back is the
// cancel. The screen it is on passes it the keys while it is open.

import { h, setShown, setText, toggleClass } from '../../core/dom.js';
import { KEY } from '../../core/keys.js';

export class Confirm {
    el: HTMLElement;
    open = false;
    private title: HTMLElement;
    private text: HTMLElement;
    private buttons: HTMLElement[] = [];
    private index = 0;
    private done: ((yes: boolean) => void) | null = null;

    constructor() {
        this.el = h('div', 'bt-modal');
        var panel = this.el.appendChild(h('div', 'bt-modal-panel')) as HTMLElement;
        this.title = panel.appendChild(h('div', 'bt-modal-title')) as HTMLElement;
        this.text = panel.appendChild(h('div', 'bt-modal-text')) as HTMLElement;
        var row = panel.appendChild(h('div', 'bt-modal-buttons')) as HTMLElement;
        this.buttons.push(row.appendChild(h('div', 'bt-button bt-button--plain')) as HTMLElement);
        this.buttons.push(row.appendChild(h('div', 'bt-button bt-button--plain')) as HTMLElement);
        setShown(this.el, false);
    }

    /** Asks; done(true) for the second button (the confirmation), false for the first or Back */
    ask(title: string, text: string, cancel: string, confirm: string, done: (yes: boolean) => void): void {
        setText(this.title, title);
        setText(this.text, text);
        this.text.style.display = text ? '' : 'none';
        setText(this.buttons[0], cancel);
        setText(this.buttons[1], confirm);
        this.done = done;
        this.index = 0;
        this.mark();
        this.open = true;
        setShown(this.el, true);
    }

    onKey(code: number): boolean {
        if (code === KEY.LEFT || code === KEY.RIGHT) {
            this.index = code === KEY.LEFT ? 0 : 1;
            this.mark();
        } else if (code === KEY.OK) {
            this.close(this.index === 1);
        } else if (code === KEY.BACK) {
            this.close(false);
        }
        return true;
    }

    private close(yes: boolean): void {
        var done = this.done;
        this.done = null;
        this.open = false;
        setShown(this.el, false);
        if (done) {
            done(yes);
        }
    }

    private mark(): void {
        for (var i = 0; i < this.buttons.length; i++) {
            toggleClass(this.buttons[i], 'bt-focused', i === this.index);
        }
    }
}
