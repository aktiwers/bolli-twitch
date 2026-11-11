// What a screen shows where its list has nothing, in the look of Twitch's TV app's own empty states: a heading and a
// line under it, centred across the screen (a category's single line in its bigger text). A list that could not be
// asked shows Try Again under it, focused while the screen has focus; OK there asks again (the screen's retry()).

import { h, setShown, setText, toggleClass } from '../../core/dom.js';
import { isOnline } from '../../core/network.js';
import { oldEngine } from '../../core/platform.js';

/** webOS TV 1.x-2.x's old engine connects with TLS 1.0 only, which every Twitch server refuses: nothing can be asked
 * there, so a list that could not be asked while the TV is online says why */
var OLD_ENGINE_LINE = 'This TV\'s software (webOS TV 1-2) cannot make the secure connection Twitch requires.';

export class StateBox {
    el: HTMLElement;
    /** Showing, with Try Again */
    failed = false;
    private title: HTMLElement;
    private line: HTMLElement;
    private button: HTMLElement;
    private shown = false;

    /** cls: the screen's own class for its place */
    constructor(cls: string) {
        this.el = h('div', 'bt-state ' + cls);
        this.title = this.el.appendChild(h('div', 'bt-state-title')) as HTMLElement;
        this.line = this.el.appendChild(h('div', 'bt-state-line')) as HTMLElement;
        this.button = this.el.appendChild(h('div', 'bt-button', 'Try Again')) as HTMLElement;
        setShown(this.el, false);
    }

    get visible(): boolean {
        return this.shown;
    }

    /** Shows title and line ('' leaves one out); failed: with Try Again */
    show(title: string, line: string, failed: boolean): void {
        this.shown = true;
        this.failed = failed;
        setText(this.title, title);
        this.title.style.display = title ? '' : 'none';
        if (failed && oldEngine() && isOnline()) {
            line = OLD_ENGINE_LINE;
        }
        setText(this.line, line);
        this.line.style.display = line ? '' : 'none';
        this.button.style.display = failed ? '' : 'none';
        setShown(this.el, true);
    }

    hide(): void {
        if (this.shown) {
            this.shown = false;
            this.failed = false;
            setShown(this.el, false);
        }
    }

    setFocused(focused: boolean): void {
        toggleClass(this.button, 'bt-focused', focused);
    }
}
