// OK held on a tile that stands for a channel (a live stream, a channel, a past broadcast, a clip) opens the channel's
// menu (menu.ts), anywhere but in a player and on that channel's own page (its star is there). So on such a tile OK
// acts on its release: the shell hands the tile here when its screen asks to open it during OK's keydown (down()).
// Released within the hold time it opens as ever; what it opens is asked for while OK is still down, as focus resting
// on the tile asks it, so the press costs the start nothing. Held, the menu opens instead and the rest of the press
// is ignored. The press is timed from OK's first keydown (webOS and the Android app both send it, then repeats while
// it is held, then the release: the repeats are not looked at). A timer that runs late had the page busy, so the
// release may have come in time and wait behind it: it gets a moment more to be heard first. Another key while OK is
// down, or the app hiding, drops the press. The menu's choices change the favorites at once and say so (star.ts); Go
// to channel opens the channel's page; Move hands the tile to the Favorites tab to carry it along its row. The menu belongs to the screen it opened over: another screen taking the top
// without a key (a relaunch naming a channel, the account changing) closes it (settled).

import { KEY } from '../../../core/keys.js';
import { favorites, favoriteToFront, isFavorite } from '../../api/favorites.js';
import { Channel, Item } from '../../api/types.js';
import { holdOk, okHeld, OkWatcher } from '../held-ok.js';
import { Screen } from '../navigator.js';
import { ChannelMenu, MenuChoice } from './menu.js';
import { setFavorite } from './star.js';

/** OK down this long is held (the remotes' own delay before the first repeat is about the same) */
export var HOLD_MS = 500;
/** A timer run later than this had the page busy; also how long a release that waits behind it is then given */
export var LATE_MS = 50;
/** How many times running late gives a waiting release that chance, before held counts anyway */
var LATE_TRIES = 3;

/** What the shell gives it */
export interface HoldDeps {
    /** The screen on top */
    top(): Screen;
    /** Opens what OK on the tile opens, now */
    open(item: Item): void;
    /** Asks ahead what the tile opens */
    ahead(item: Item): Promise<unknown> | void;
    /** Focus where the screen on top asks for it (a list that emptied has nothing to focus) */
    settle(): void;
    /** The Favorites tab is the screen on top: its menu also moves a favorite to the front */
    onFavorites(): boolean;
    /** The Favorites tab can carry this favorite's tile along its row (focus on it in Live Now or All Favorites) */
    canMove(id: string): boolean;
    /** Starts that */
    move(id: string): void;
}

/** The channel a tile stands for; null for a category and for a channel without its id or login */
export function channelOf(item: Item): Channel | null {
    var c = item.kind === 'stream' ? item.stream.channel : item.kind === 'channel' ? item.channel :
        item.kind === 'video' ? item.video.channel : item.kind === 'clip' ? item.clip.channel : null;
    return c && c.id && c.login ? c : null;
}

export class TileHold implements OkWatcher {
    private menu: ChannelMenu;
    /** The tile OK is down on, neither released nor held yet (null: none), the screen it is on, and the hold's timer */
    private pressed: Item | null = null;
    private from: Screen | null = null;
    private timer = 0;
    /** What the menu is open for: the channel, whether its tile said it is live, and the screen under the menu */
    private channel: Channel | null = null;
    private live = false;
    private over: Screen | null = null;

    constructor(private deps: HoldDeps) {
        var self = this;
        this.menu = new ChannelMenu(function (choice: MenuChoice) {
            self.pick(choice);
        });
    }

    /** The menu's layer, over every screen and the top menu */
    get el(): HTMLElement {
        return this.menu.el;
    }

    /** A screen asks to open item during OK's keydown. True: the tile stands for a channel, so it opens on OK's
     * release, or OK still down after HOLD_MS opens the channel's menu */
    down(item: Item): boolean {
        var deps = this.deps;
        var view = deps.top();
        var channel = channelOf(item);
        if (!channel || view.plays || (view.shows && view.shows({ kind: 'channel', channel: channel, live: false }))) {
            return false;
        }
        var asked = deps.ahead(item);
        if (asked) {
            asked.then(null, function () { return undefined; });
        }
        this.cancel();
        this.pressed = item;
        this.from = view;
        this.wait(HOLD_MS);
        return true;
    }

    /** A key, before the screens get it. True: it is the open menu's, or a repeat of the OK that is down */
    onKey(code: number): boolean {
        if (this.pressed) {
            if (code === KEY.OK) {
                return true;
            }
            this.cancel();
        }
        if (!this.menu.open) {
            return false;
        }
        this.menu.onKey(code);
        if (code === KEY.OK) {
            // The menu closed: the press's repeats are not for the tile under it
            holdOk();
        }
        return true;
    }

    /** The shell settled on a screen, as after every navigation: a menu open over another screen goes with that one */
    settled(): void {
        if (this.menu.open && this.deps.top() !== this.over) {
            this.menu.close();
        }
    }

    /** OK was released: the tile opens, when OK was not yet held and its screen is still on top */
    up(): void {
        var item = this.pressed;
        var onTop = this.deps.top() === this.from;
        this.cancel();
        if (item && onTop) {
            this.deps.open(item);
        }
    }

    /** Neither an open nor the menu comes of the OK that is down (another key came, or the app hid: no release will) */
    cancel(): void {
        clearTimeout(this.timer);
        this.pressed = null;
        this.from = null;
    }

    /** OK still down in ms is held. Run late, the timer waits once more, so a release in the queue comes first; at most
     * LATE_TRIES times (on a page that stays busy the menu would else never open) */
    private wait(ms: number, tries?: number): void {
        var self = this;
        var due = Date.now() + ms;
        var n = tries || 0;
        this.timer = setTimeout(function () {
            if (n < LATE_TRIES && Date.now() - due > LATE_MS) {
                self.wait(LATE_MS, n + 1);
            } else {
                self.held();
            }
        }, ms) as unknown as number;
    }

    /** OK was held on the tile: the channel's menu, when the tile's screen is still on top */
    private held(): void {
        var item = this.pressed as Item;
        var view = this.from as Screen;
        this.cancel();
        // (whatever is on top by now, the repeats of this OK are not for it)
        okHeld();
        if (this.deps.top() === view) {
            this.show(channelOf(item) as Channel, item, view);
        }
    }

    private show(channel: Channel, item: Item, over: Screen): void {
        this.channel = channel;
        this.live = item.kind === 'stream' || (item.kind === 'channel' && item.live);
        this.over = over;
        var offered: MenuChoice[] = ['add', 'channel'];
        if (isFavorite(channel.id)) {
            offered = ['remove', 'channel'];
            if (this.deps.canMove(channel.id)) {
                offered.push('move');
            }
            if (this.deps.onFavorites() && favorites()[0].id !== channel.id) {
                offered.push('front');
            }
        }
        this.menu.show(channel.displayName, offered);
    }

    private pick(choice: MenuChoice): void {
        var channel = this.channel as Channel;
        if (choice === 'channel') {
            this.deps.open({ kind: 'channel', channel: channel, live: this.live });
            return;
        }
        if (choice === 'move') {
            this.deps.move(channel.id);
            return;
        }
        if (choice === 'front') {
            favoriteToFront(channel.id);
        } else {
            setFavorite(channel, choice === 'add');
        }
        this.deps.settle();
    }
}
