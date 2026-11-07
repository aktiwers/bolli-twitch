// Twitch's Not Interested, the same for a channel (the player's options) and a category (its page): a guest goes to
// Sign In; signed in, Twitch's "Are you sure?" page as its TV app draws it, the sparkles at the left and at the right
// the question, what will no longer be recommended, Go Back (focused first) and Yes, I'm sure (red once focused). Yes
// tells Twitch and goes Home at once; Twitch refusing shows its toast.

import { h, setShown, toggleClass } from '../../core/dom.js';
import { KEY } from '../../core/keys.js';
import { toast } from '../../ui/toast.js';
import { notInterested } from '../api/follow.js';
import { signedIn } from '../api/gql.js';
import { Channel, Game } from '../api/types.js';
import { picture } from './art.js';
import { MenuMode, Navigator, Screen } from './navigator.js';

export type NotInterestedTarget = { kind: 'channel'; channel: Channel } | { kind: 'game'; game: Game };

/** OK on Not Interested */
export function askNotInterested(target: NotInterestedTarget, nav: Navigator): void {
    if (signedIn()) {
        nav.push(new NotInterestedPage(target, nav));
    } else {
        nav.signIn();
    }
}

export class NotInterestedPage implements Screen {
    el: HTMLElement;
    /** Twitch shows its logo and items over it, no Go Back */
    menu: MenuMode = 'nav';
    private buttons: HTMLElement[] = [];
    private index = 0;
    private focused = true;

    constructor(private target: NotInterestedTarget, private nav: Navigator) {
        this.el = h('div', 'bt-ni');
        var box = this.el.appendChild(h('div', 'bt-ni-box')) as HTMLElement;
        box.appendChild(h('div', 'bt-ni-pic')).appendChild(picture('sparkles'));
        var text = box.appendChild(h('div', 'bt-ni-text')) as HTMLElement;
        text.appendChild(h('div', 'bt-ni-title', 'Are you sure?'));
        text.appendChild(h('div', 'bt-ni-line', target.kind === 'channel' ? 'We will no longer recommend content by ' +
            target.channel.displayName + ' to you.' : 'We will no longer recommend ' + target.game.name + ' to you.'));
        var row = text.appendChild(h('div', 'bt-ni-buttons')) as HTMLElement;
        this.buttons.push(row.appendChild(h('div', 'bt-button bt-button--plain', 'Go Back')) as HTMLElement);
        this.buttons.push(row.appendChild(h('div', 'bt-button bt-button--plain bt-button--destructive', 'Yes, I\'m sure')) as HTMLElement);
        setShown(this.el, false);
        this.mark();
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
        this.focused = focused;
        this.mark();
    }

    onKey(code: number): boolean {
        if (code === KEY.LEFT || code === KEY.RIGHT) {
            this.index = code === KEY.LEFT ? 0 : 1;
            this.mark();
            return true;
        }
        if (code === KEY.OK) {
            if (this.index === 0) {
                this.nav.back();
            } else {
                this.send();
            }
            return true;
        }
        return code === KEY.DOWN;
    }

    private send(): void {
        var t = this.target;
        notInterested(t.kind === 'channel' ? 'CHANNEL' : 'CATEGORY', t.kind === 'channel' ? t.channel.id : t.game.id).then(null, function () {
            toast('Failed to remove interest. Please try again.');
        });
        this.nav.home();
    }

    private mark(): void {
        for (var i = 0; i < this.buttons.length; i++) {
            toggleClass(this.buttons[i], 'bt-focused', this.focused && i === this.index);
        }
    }
}
