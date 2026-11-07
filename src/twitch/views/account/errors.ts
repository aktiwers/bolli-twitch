// Twitch's error pages (the shell opens them in the place of a page: nav.error): page not found ("Sorry, that page is
// in another castle!" over Home, without the menu), a channel not playable on this device (its picture, the menu's Go
// Back alone and focused), and parental controls (its picture and the reason, nothing to press). Back leaves each.

import { h, setShown, toggleClass } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { picture } from '../art.js';
import { ErrorKind, MenuMode, Navigator, Screen } from '../navigator.js';

export class ErrorView implements Screen {
    el: HTMLElement;
    menu: MenuMode;
    menuFocus: boolean;
    private button: HTMLElement | null = null;

    constructor(kind: ErrorKind, private nav: Navigator) {
        this.el = h('div', 'bt-err bt-err--' + kind);
        this.menu = kind === 'not-playable' ? 'back' : 'none';
        this.menuFocus = kind === 'not-playable';
        if (kind === 'not-found') {
            this.el.appendChild(h('div', 'bt-err-title', 'Sorry, that page is in another castle!'));
            this.button = this.el.appendChild(h('div', 'bt-button bt-focused', 'Home')) as HTMLElement;
        } else if (kind === 'not-playable') {
            this.el.appendChild(h('div', 'bt-err-pic')).appendChild(picture('screen'));
            this.el.appendChild(h('div', 'bt-err-text', 'This channel is not playable on this device at this time.'));
        } else {
            this.el.appendChild(h('div', 'bt-err-pic')).appendChild(picture('shield'));
            var text = this.el.appendChild(h('div', 'bt-err-text')) as HTMLElement;
            text.appendChild(h('div', 'bt-err-title', 'Parental Controls'));
            text.appendChild(h('div', 'bt-err-line', 'Looks like the parental controls settings on your device restrict access to User Generated ' +
                'Content, please review your settings and relaunch Twitch.'));
        }
    }

    show(): void {
        setShown(this.el, true);
    }

    hide(): void {
        setShown(this.el, false);
    }

    atTop(): boolean {
        return true;
    }

    setFocused(focused: boolean): void {
        if (this.button) {
            toggleClass(this.button, 'bt-focused', focused);
        }
    }

    /** OK on Home */
    onKey(code: number): boolean {
        if (code === KEY.OK && this.button) {
            this.nav.home();
            return true;
        }
        return false;
    }
}
