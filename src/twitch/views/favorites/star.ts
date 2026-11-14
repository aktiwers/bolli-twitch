// Bolli's Favorite button on a channel's page, beside Follow and in its look: the star with Favorite, filled with
// Favorited once the channel is a favorite. OK adds or removes it at once (the list is the device's: no account, no
// request to wait for); the button shows the list's state, also when it changed elsewhere (the channel's menu). A
// press is one change: a held OK's repeats wait for its release (holdOk).

import { toast } from '../../../ui/toast.js';
import { addFavorite, isFavorite, MAX_FAVORITES, onFavoritesChange, removeFavorite } from '../../api/favorites.js';
import { Channel } from '../../api/types.js';
import { StateButton } from '../follow.js';
import { holdOk } from '../held-ok.js';
import { starIcon } from '../icons.js';

/** Makes the channel (one with its id and login) a favorite or takes it off the list, and says so; a full list says
 * that instead */
export function setFavorite(channel: Channel, on: boolean): void {
    if (!on) {
        removeFavorite(channel.id);
        toast('Removed from Favorites');
    } else if (addFavorite(channel)) {
        toast('Added to Favorites');
    } else {
        toast('Favorites is full (' + MAX_FAVORITES + '). Remove a channel to add another.');
    }
}

export class FavoriteStar {
    private button: StateButton;
    private channel: Channel | null = null;
    private unlisten: () => void;

    /** cls: the screen's own class for its place */
    constructor(cls: string) {
        this.button = new StateButton(cls, starIcon, 'Favorite', 'Favorited');
        var self = this;
        this.unlisten = onFavoritesChange(function () {
            self.draw();
        });
    }

    get el(): HTMLElement {
        return this.button.el;
    }

    /** The channel it stands for (from the opener at once, from its page once that came) */
    set(channel: Channel): void {
        this.channel = channel;
        this.draw();
    }

    /** OK on the button */
    press(): void {
        var c = this.channel;
        holdOk();
        if (c && c.id) {
            setFavorite(c, !isFavorite(c.id));
        }
    }

    /** Stops listening to the list (the screen went) */
    destroy(): void {
        this.unlisten();
    }

    private draw(): void {
        this.button.draw(!!this.channel && isFavorite(this.channel.id));
    }
}
