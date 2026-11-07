// Settings › Your Profile as Twitch's TV app has it: two cards with a title alone, Sign In (a guest; it opens Sign In
// over this page) or Sign Out (signed in), and Go back. Signing out is at once (the shell then goes Home).

import { h, setShown } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { signOut } from '../../api/auth.js';
import { signedIn } from '../../api/gql.js';
import { Navigator, Screen } from '../navigator.js';
import { CardList } from './cards.js';

/** The first card's top: y 261 of 1080 */
var TOP = 174;

export class ProfileView implements Screen {
    el: HTMLElement;
    private cards: CardList;
    private signedIn = false;

    constructor(private nav: Navigator) {
        this.el = h('div', 'bt-settings');
        this.cards = new CardList(TOP);
        this.cards.add({ title: '' });
        this.cards.add({ title: 'Go back' });
        this.el.appendChild(this.cards.el);
        this.label();
    }

    show(): void {
        setShown(this.el, true);
        this.label();
    }

    hide(): void {
        setShown(this.el, false);
    }

    atTop(): boolean {
        return this.cards.index === 0;
    }

    setFocused(focused: boolean): void {
        this.cards.setFocused(focused);
    }

    onKey(code: number): boolean {
        if (code === KEY.UP || code === KEY.DOWN) {
            // Up from the first card is the shell's (the menu)
            return this.cards.move(code === KEY.UP ? -1 : 1) || code === KEY.DOWN;
        }
        if (code !== KEY.OK) {
            return code === KEY.LEFT || code === KEY.RIGHT;
        }
        if (this.cards.index === 1) {
            this.nav.back();
        } else if (this.signedIn) {
            signOut();
        } else {
            this.nav.signIn();
        }
        return true;
    }

    private label(): void {
        this.signedIn = signedIn();
        this.cards.update(0, this.signedIn ? 'Sign Out' : 'Sign In', '', '');
    }
}
