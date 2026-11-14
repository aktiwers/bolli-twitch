// Twitch's Follow button (the heart with Follow, or Unfollow once followed) and what pressing it does, the same on the
// player, a channel's page and a category's page: a guest goes to Sign In; signed in it changes at once and Twitch is
// told (a refusal puts it back with Twitch's words); a followed channel asks "Unfollow <name>?" first, as Twitch's TV
// app does (a category unfollows at once). The state is the follow store's, so every button shows the latest one
// (the account changed: the new account's, Follow until it is known). A press is one change: a held OK's repeats wait
// for its release (holdOk).

import { h, setText } from '../../core/dom.js';
import { toast } from '../../ui/toast.js';
import { follow, FollowKind, followState, noteFollow, onFollowChange } from '../api/follow.js';
import { signedIn } from '../api/gql.js';
import { Confirm } from './confirm.js';
import { holdOk } from './held-ok.js';
import { heartIcon } from './icons.js';
import { Navigator } from './navigator.js';

var UNFOLLOW_TEXT = 'You will no longer receive notifications, have access to their Follower Emotes or see them in your followed ' +
    'channels list.';

export interface FollowTarget {
    kind: FollowKind;
    id: string;
    /** The name the Unfollow question shows */
    name: string;
}

/** A button of Follow's look: an icon and a word, both by its state (Follow's heart, Favorite's star) */
export class StateButton {
    el: HTMLElement;
    private icon: HTMLElement;
    private label: HTMLElement;
    private drawn: boolean | null = null;

    /** cls: the screen's own class for its place; iconOf, off and on: its icon and word by its state */
    constructor(cls: string, private iconOf: (on: boolean) => Node, private off: string, private on: string) {
        this.el = h('div', 'bt-button bt-icon-button ' + cls);
        this.icon = this.el.appendChild(h('span', 'bt-button-icon')) as HTMLElement;
        this.label = this.el.appendChild(h('span')) as HTMLElement;
        this.draw(false);
    }

    draw(on: boolean): void {
        if (on === this.drawn) {
            return;
        }
        this.drawn = on;
        this.icon.textContent = '';
        this.icon.appendChild(this.iconOf(on));
        setText(this.label, on ? this.on : this.off);
    }
}

export class Follow {
    /** Unfollow with the filled heart once followed, else Follow */
    button: StateButton;
    private target: FollowTarget | null = null;
    /** A follow or unfollow asked and not answered: presses wait for it */
    private busy = false;
    private unlisten: () => void;

    /** confirm: the screen's question box (a channel's Unfollow question) */
    constructor(cls: string, private nav: Navigator, private confirm: Confirm | null) {
        this.button = new StateButton(cls, heartIcon, 'Follow', 'Unfollow');
        var self = this;
        this.unlisten = onFollowChange(function (kind: FollowKind | null, id: string) {
            var t = self.target;
            if (!kind || (t && t.kind === kind && t.id === id)) {
                self.draw();
            }
        });
    }

    get el(): HTMLElement {
        return this.button.el;
    }

    /** What it follows (a channel from the opener at once, from its page once that came) */
    set(target: FollowTarget): void {
        this.target = target;
        this.draw();
    }

    /** OK on the button */
    press(): void {
        var t = this.target;
        holdOk();
        if (!signedIn()) {
            this.nav.signIn();
            return;
        }
        if (!t || !t.id || this.busy) {
            return;
        }
        if (!followState(t.kind, t.id)) {
            this.change(t, true);
        } else if (t.kind === 'game' || !this.confirm) {
            this.change(t, false);
        } else {
            var self = this;
            this.confirm.ask('Unfollow ' + t.name + '?', UNFOLLOW_TEXT, 'No, cancel', 'Yes, unfollow', function (yes: boolean) {
                // Answered with OK: focus is back on the button
                holdOk();
                if (yes) {
                    self.change(t as FollowTarget, false);
                }
            });
        }
    }

    /** Stops listening to the follow state (the screen went) */
    destroy(): void {
        this.unlisten();
    }

    private change(t: FollowTarget, on: boolean): void {
        var was = !!followState(t.kind, t.id);
        var self = this;
        this.busy = true;
        noteFollow(t.kind, t.id, on);
        follow(t.kind, t.id, on).then(function (now: boolean) {
            self.busy = false;
            if (now !== on) {
                toast(on ? 'Failed to follow. Please try again.' : 'Failed to unfollow. Please try again.');
            }
        }, function () {
            self.busy = false;
            noteFollow(t.kind, t.id, was);
            toast(on ? 'Failed to follow. Please try again.' : 'Failed to unfollow. Please try again.');
        });
    }

    private draw(): void {
        var t = this.target;
        this.button.draw(!!(t && t.id && followState(t.kind, t.id)));
    }
}
