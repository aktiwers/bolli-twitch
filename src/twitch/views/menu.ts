// The top menu of every page, as Twitch's TV app has it: the logo at the left (the Bolli logo here, not focusable),
// the items centred (a guest: Sign In, Home, Browse, Search; signed in: Home, Following, Browse, Search) and the gear
// (Settings) at the right. The current page's item is lit; focus is the light box with the purple ring. Left/Right
// walk the items without wrapping; OK picks one; Down leaves the menu (the shell gives focus back to the page).
// On a page opened over a section, Go Back stands in place of the logo as the first item focus reaches (Up from
// the page lands on it); a page such as Settings shows Go Back alone, without the items (MenuMode). Focus resting on
// an item is told (the shell fetches Browse ahead).

import { h, toggleClass } from '../../core/dom.js';
import { KEY } from '../../core/keys.js';
import { chevronIcon, gearIcon } from './icons.js';
import { MenuMode } from './navigator.js';
import { REST_LONG_MS } from './rest.js';

export type MenuItem = 'signin' | 'home' | 'following' | 'browse' | 'search' | 'settings';
/** What focus walks: Go Back, then the items */
type Entry = MenuItem | 'back';

var LABELS: { [name: string]: string } = { signin: 'Sign In', home: 'Home', following: 'Following', browse: 'Browse', search: 'Search' };
var GUEST: MenuItem[] = ['signin', 'home', 'browse', 'search', 'settings'];
var SIGNED_IN: MenuItem[] = ['home', 'following', 'browse', 'search', 'settings'];

export class TopMenu {
    el: HTMLElement;
    private els: { [name: string]: HTMLElement } = {};
    private logo: HTMLElement;
    private items: HTMLElement;
    private signedIn = false;
    /** Go Back shown, and shown without the items */
    private back = false;
    private alone = false;
    /** Where focus is in entries() */
    private index = 0;
    private focused = false;
    private restTimer = 0;

    /** pick: OK on an item; goBack: OK on Go Back; rested: focus rested on an item */
    constructor(private pick: (item: MenuItem) => void, private goBack: () => void, private rested?: (item: MenuItem) => void) {
        this.el = h('div', 'bt-menu');
        this.logo = this.el.appendChild(h('div', 'bt-menu-logo')) as HTMLElement;
        var back = this.el.appendChild(h('div', 'bt-menu-item bt-menu-back bt-back')) as HTMLElement;
        back.appendChild(h('span', 'bt-button-icon')).appendChild(chevronIcon());
        back.appendChild(h('span', '', 'Go Back'));
        back.style.display = 'none';
        this.els.back = back;
        var items = this.items = this.el.appendChild(h('div', 'bt-menu-items')) as HTMLElement;
        for (var name in LABELS) {
            this.els[name] = items.appendChild(h('div', 'bt-menu-item', LABELS[name])) as HTMLElement;
        }
        var gear = this.el.appendChild(h('div', 'bt-menu-item bt-menu-gear')) as HTMLElement;
        gear.appendChild(gearIcon());
        this.els.settings = gear;
        this.setSignedIn(false);
        this.setCurrent('home');
    }

    /** The items in order (focus walks them) */
    get order(): MenuItem[] {
        return this.signedIn ? SIGNED_IN : GUEST;
    }

    get hasFocus(): boolean {
        return this.focused;
    }

    /** Signed in: Following instead of Sign In. Focus stays on its item; on Sign In or Following, which go, it
     * stays at its place */
    setSignedIn(signedIn: boolean): void {
        var at = this.entries()[this.index];
        this.signedIn = signedIn;
        this.els.signin.style.display = signedIn ? 'none' : '';
        this.els.following.style.display = signedIn ? '' : 'none';
        this.keep(at);
    }

    /** How the menu stands over the screen on top, and whether that is a page over a section. Focus stays on its
     * entry where it can */
    setMode(mode: MenuMode, overPage: boolean): void {
        var alone = mode === 'back';
        var on = alone || (mode === 'items' && overPage);
        if (on === this.back && alone === this.alone) {
            return;
        }
        var at = this.entries()[this.index];
        this.back = on;
        this.alone = alone;
        this.els.back.style.display = on ? '' : 'none';
        this.logo.style.display = on ? 'none' : '';
        this.items.style.display = this.els.settings.style.display = alone ? 'none' : '';
        this.keep(at);
    }

    /** The page shown: its item is lit (null: none) */
    setCurrent(item: MenuItem | null): void {
        for (var name in this.els) {
            toggleClass(this.els[name], 'bt-current', name === item);
        }
    }

    /** Focus on the first entry, Go Back where it shows (Up from a page lands there), or off */
    setFocused(focused: boolean): void {
        if (focused && !this.focused) {
            this.index = 0;
        }
        this.focused = focused;
        this.mark();
    }

    onKey(code: number): boolean {
        var entries = this.entries();
        if (code === KEY.LEFT || code === KEY.RIGHT) {
            var to = this.index + (code === KEY.LEFT ? -1 : 1);
            if (to >= 0 && to < entries.length) {
                this.index = to;
                this.mark();
            }
            return true;
        }
        if (code === KEY.OK) {
            var at = entries[this.index];
            if (at === 'back') {
                this.goBack();
            } else {
                this.pick(at);
            }
            return true;
        }
        return false;
    }

    /** What focus walks, in order */
    private entries(): Entry[] {
        var items: Entry[] = this.alone ? [] : this.order;
        return this.back ? (['back'] as Entry[]).concat(items) : items;
    }

    /** Focus back on entry at after the entries changed; where it went, at its place */
    private keep(at: Entry): void {
        var entries = this.entries();
        var to = entries.indexOf(at);
        this.index = to >= 0 ? to : Math.max(0, Math.min(this.index, entries.length - 1));
        this.mark();
    }

    private mark(): void {
        var at = this.focused ? this.entries()[this.index] : '';
        for (var name in this.els) {
            toggleClass(this.els[name], 'bt-focused', name === at);
        }
        clearTimeout(this.restTimer);
        var rested = this.rested;
        if (at && at !== 'back' && rested) {
            this.restTimer = setTimeout(function () {
                (rested as (item: MenuItem) => void)(at as MenuItem);
            }, REST_LONG_MS) as unknown as number;
        }
    }
}
