// The favorite channels: a list kept on the device (no account needed), in the order they were added; one can be
// moved to the front or to any place. At most MAX_FAVORITES (a guard against a broken store: Twitch is asked about them in batches as the
// viewer gets to them, api/favorites-feed.ts). Each is kept with what draws its tile before Twitch is asked (login, name,
// avatar); listeners hear every change.

import { load, save } from '../../core/store.js';
import { Listeners } from './listeners.js';
import { Channel } from './types.js';

export var MAX_FAVORITES = 1000;
var STORE_KEY = 'twitch.favorites';

export interface Favorite {
    id: string;
    login: string;
    displayName: string;
    /** As Channel.avatar ('' until Twitch was asked) */
    avatar: string;
}

/** What changed: a channel added, removed or moved */
export type FavoriteChange = 'add' | 'remove' | 'move';
export type FavoriteListener = (change: FavoriteChange, id: string) => void;

var list: Favorite[] | null = null;
var listeners = new Listeners<[FavoriteChange, string]>();

function text(v: unknown): v is string {
    return typeof v === 'string' && v !== '';
}

/** The list, read from the store the first time: entries of another shape and repeats are left out */
function kept(): Favorite[] {
    if (!list) {
        var saved = load<Favorite[]>(STORE_KEY);
        var out: Favorite[] = [];
        for (var i = 0; saved && i < saved.length && out.length < MAX_FAVORITES; i++) {
            var f = saved[i];
            if (f && text(f.id) && text(f.login) && indexIn(out, f.id) < 0) {
                out.push({
                    id: f.id, login: f.login, displayName: text(f.displayName) ? f.displayName : f.login, avatar: text(f.avatar) ? f.avatar : ''
                });
            }
        }
        list = out;
    }
    return list;
}

function indexIn(all: Favorite[], id: string): number {
    for (var i = 0; i < all.length; i++) {
        if (all[i].id === id) {
            return i;
        }
    }
    return -1;
}

function changed(change: FavoriteChange, id: string): void {
    save(STORE_KEY, kept());
    listeners.tell(change, id);
}

/** The favorites in their order (a copy) */
export function favorites(): Favorite[] {
    return kept().slice();
}

/** How many favorites there are (no copy: for every key press) */
export function favoriteCount(): number {
    return kept().length;
}

export function isFavorite(id: string): boolean {
    return indexIn(kept(), id) >= 0;
}

/** Adds the channel after the last one. False: the list is full, or the channel has no id or login (one that is a
 * favorite already stays where it is: true) */
export function addFavorite(channel: Channel): boolean {
    var all = kept();
    if (!channel.id || !channel.login) {
        return false;
    }
    if (indexIn(all, channel.id) >= 0) {
        return true;
    }
    if (all.length >= MAX_FAVORITES) {
        return false;
    }
    all.push({ id: channel.id, login: channel.login, displayName: channel.displayName || channel.login, avatar: channel.avatar || '' });
    changed('add', channel.id);
    return true;
}

export function removeFavorite(id: string): void {
    var all = kept();
    var i = indexIn(all, id);
    if (i >= 0) {
        all.splice(i, 1);
        changed('remove', id);
    }
}

/** Moves a favorite before all the others */
export function favoriteToFront(id: string): void {
    moveFavorite(id, 0);
}

/** Moves a favorite to place to in the list (the others after it shift one on); one write */
export function moveFavorite(id: string, to: number): void {
    var all = kept();
    var i = indexIn(all, id);
    var at = Math.max(0, Math.min(to, all.length - 1));
    if (i >= 0 && i !== at) {
        all.splice(at, 0, all.splice(i, 1)[0]);
        changed('move', id);
    }
}

/** Twitch's current login, name and avatar for favorites (a channel renamed, a new picture): kept for the next start,
 * no listener hears it */
export function noteFavorites(channels: Channel[]): void {
    var all = kept();
    var dirty = false;
    for (var i = 0; i < channels.length; i++) {
        var c = channels[i];
        var f = all[indexIn(all, c.id)];
        if (f && c.login && (f.login !== c.login || f.displayName !== c.displayName || f.avatar !== c.avatar)) {
            f.login = c.login;
            f.displayName = c.displayName || c.login;
            f.avatar = c.avatar || '';
            dirty = true;
        }
    }
    if (dirty) {
        save(STORE_KEY, all);
    }
}

/** listener(change, id) after every change; returns the function that stops it */
export function onFavoritesChange(listener: FavoriteListener): () => void {
    return listeners.on(listener);
}

/** Reads the list from the store again (the tests) */
export function forgetFavorites(): void {
    list = null;
}
