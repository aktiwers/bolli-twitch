// Home as Twitch's TV app lays it out: the hero over rows of stream and category tiles, the focused row always at
// the same place, the row below it under a fade. Unlike Twitch's app it is built once and stays alive behind other
// screens, so Back finds the same row and tile. The first rows draw at once from a copy kept from the last start (one
// per account) while the fresh ones are asked; fresh rows replace them where they are out of sight. A copy older
// than STALE_MS is replaced at once, and until then only the hero and the focused row ask their pictures.

import { h, setShown } from '../../core/dom.js';
import { mark } from '../../core/perf.js';
import { load, save } from '../../core/store.js';
import { savedUser } from '../api/auth.js';
import { signedIn } from '../api/gql.js';
import { ShelfLoader } from '../api/home.js';
import { Item, Shelf, Stream } from '../api/types.js';
import { Hero, heroOf } from './hero.js';
import { Navigator, Screen } from './navigator.js';
import { PagedRows } from './pager.js';
import { Rest } from './rest.js';
import { nearItems, rowsKey } from './rows.js';

/** The focused row's title, at y 540 of 1080 */
var FOCUS_TOP = 360;
/** Focus resting this long fetches the hero pictures around it */
var AHEAD_MS = 200;
/** The kept copy: per account, its first rows with their first tiles; another VERSION is not drawn */
var KEPT_KEY = 'twitch.home.';
var KEPT_VERSION = 1;
var KEPT_ROWS = 4;
var KEPT_ITEMS = 10;
var STALE_MS = 10 * 60 * 1000;
/** Keys idle this long: the kept copy is written */
var IDLE_MS = 3000;

interface Kept {
    v: number;
    /** When its rows were fresh */
    at: number;
    shelves: Shelf[];
}

export class HomeView implements Screen {
    el: HTMLElement;
    hero: Hero;
    rows: PagedRows;
    accountBound = true;
    /** Whose kept copy this is ('' for an account not known yet: none is kept) */
    private account: string;
    private shown = true;
    /** The tile the hero shows */
    private heroItem: Item | null = null;
    /** A key was pressed or the first screen's pictures are in: pictures may be fetched ahead */
    private warm = false;
    /** An old kept copy shows: pictures for the focused row only until the fresh rows are in */
    private waitsFresh = false;
    private unwatch: () => void;
    private aheadTimer = 0;
    /** Focus resting on a tile: what it opens fetched ahead */
    private rest = new Rest();
    /** The first fresh rows, until written to the kept copy */
    private unsaved: Kept | null = null;
    private saveTimer = 0;

    constructor(loader: ShelfLoader, private nav: Navigator) {
        this.el = h('div', 'bt-home');
        this.account = accountKey();
        var self = this;
        // The first page is asked before the kept copy is drawn
        this.rows = new PagedRows(loader, FOCUS_TOP, function (first: boolean, shelves: Shelf[]) {
            self.fresh(first, shelves);
        });
        this.el.appendChild(this.rows.el);
        this.el.appendChild(h('div', 'bt-home-fade'));
        this.hero = new Hero();
        this.el.appendChild(this.hero.el);
        var kept = this.account ? load<Kept>(KEPT_KEY + this.account) : null;
        if (fits(kept)) {
            var stale = Date.now() - kept.at > STALE_MS;
            // The hero's picture first: it is asked before the rows' pictures
            this.heroItem = kept.shelves[0].items[0];
            this.hero.show(heroOf(this.heroItem));
            this.waitsFresh = stale;
            this.rows.stack.setNarrow(stale);
            this.rows.prefill(kept.shelves, stale);
            mark('home-kept');
        }
        // A picture of the first screen came in: once all are, pictures may be fetched ahead
        var check = function () {
            if (self.rows.stack.rows.length && self.rows.stack.loaded() && self.hero.loaded()) {
                self.warmUp();
            }
        };
        this.el.addEventListener('load', check, true);
        this.el.addEventListener('error', check, true);
        this.unwatch = function () {
            self.el.removeEventListener('load', check, true);
            self.el.removeEventListener('error', check, true);
        };
    }

    show(): void {
        this.shown = true;
        setShown(this.el, true);
        this.rows.stack.setNarrow(this.waitsFresh);
        this.rows.stack.setShown(true);
        // Rows that changed meanwhile, and a picture change that waited
        this.heroItem = null;
        this.showHero();
    }

    /** Hidden under another screen: it keeps its pictures, so it shows at once on Back */
    hide(): void {
        this.shown = false;
        setShown(this.el, false);
        this.rows.stack.setShown(false);
        clearTimeout(this.aheadTimer);
        this.rest.cancel();
        this.hero.pause();
        this.saveKept();
    }

    /** Under a player: pictures for the focused row only */
    narrow(): void {
        this.rows.stack.setNarrow(true);
    }

    destroy(): void {
        clearTimeout(this.aheadTimer);
        this.rest.cancel();
        clearTimeout(this.saveTimer);
        this.hero.pause();
        this.unwatch();
        this.rows.destroy();
    }

    atTop(): boolean {
        return this.rows.stack.index === 0;
    }

    /** Focus on the rows (also back from a player): the focused tile rests again; on the menu: nothing rests */
    setFocused(focused: boolean): void {
        this.rows.setFocused(focused);
        if (focused) {
            this.fetchAheadSoon();
        } else {
            this.rest.cancel();
        }
    }

    retry(): boolean {
        return this.rows.retry();
    }

    onKey(code: number): boolean {
        this.warmUp();
        if (this.unsaved) {
            this.saveSoon();
        }
        var self = this;
        return rowsKey(this.rows.stack, code, function () {
            self.moved();
        }, function (item: Item) {
            self.nav.open(item);
        });
    }

    /** After focus moved: the hero, the pictures around it, the next page */
    private moved(): void {
        this.showHero();
        this.fetchAheadSoon();
        this.rows.moved();
    }

    /** The focused tile in the hero, when it changed; no rows (the empty or failed state): no hero over them */
    private showHero(): void {
        var row = this.rows.stack.row;
        var item = row ? row.focused : null;
        if (!item) {
            this.heroItem = null;
            this.hero.hide();
        } else if (item !== this.heroItem) {
            this.heroItem = item;
            this.hero.show(heroOf(item));
        }
    }

    /** A fresh page is in: the hero when the focused tile changed (not while hidden); the first is kept */
    private fresh(first: boolean, shelves: Shelf[]): void {
        if (first) {
            mark('home-fresh');
            this.waitsFresh = false;
            if (this.shown) {
                this.rows.stack.setNarrow(false);
            }
            this.unsaved = { v: KEPT_VERSION, at: Date.now(), shelves: shelves.slice(0, KEPT_ROWS) };
            this.saveSoon();
        }
        if (this.shown) {
            this.showHero();
        }
    }

    /** The first key, or the first screen's pictures are in */
    private warmUp(): void {
        if (!this.warm) {
            this.warm = true;
            this.unwatch();
            this.fetchAheadSoon();
        }
    }

    /** Once focus rests: the hero pictures one step away (a held key passes many tiles), and what the tile opens */
    private fetchAheadSoon(): void {
        clearTimeout(this.aheadTimer);
        if (!this.warm || !this.shown) {
            return;
        }
        var self = this;
        this.aheadTimer = setTimeout(function () {
            self.hero.prefetch(nearItems(self.rows.stack).map(heroOf));
        }, AHEAD_MS) as unknown as number;
        var row = this.rows.stack.row;
        this.rest.item(row ? row.focused : null, this.nav.ahead);
    }

    private saveSoon(): void {
        clearTimeout(this.saveTimer);
        var self = this;
        this.saveTimer = setTimeout(function () {
            self.saveKept();
        }, IDLE_MS) as unknown as number;
    }

    /** Writes the kept copy (once per fresh start) */
    private saveKept(): void {
        clearTimeout(this.saveTimer);
        if (!this.account) {
            // Made right after a sign-in, before the account's details came: its id once they are in
            var user = savedUser();
            this.account = user ? user.id : '';
        }
        var kept = this.unsaved;
        if (kept && this.account) {
            kept.shelves = kept.shelves.map(function (s) {
                return { id: s.id, title: s.title, items: s.items.slice(0, KEPT_ITEMS) };
            });
            save(KEPT_KEY + this.account, kept);
        }
        this.unsaved = null;
    }
}

/** The kept copy's account: the signed-in one's id, or guest */
function accountKey(): string {
    var user = savedUser();
    return user ? user.id : signedIn() ? '' : 'guest';
}

/** A kept copy this build can draw: its version, and every row and tile of the shape drawn here */
function fits(kept: Kept | null): kept is Kept {
    if (!kept || kept.v !== KEPT_VERSION || typeof kept.at !== 'number' || !Array.isArray(kept.shelves) || !kept.shelves.length) {
        return false;
    }
    for (var i = 0; i < kept.shelves.length; i++) {
        var s = kept.shelves[i];
        if (!s || !text(s.id) || !text(s.title) || !Array.isArray(s.items) || !s.items.length) {
            return false;
        }
        for (var k = 0; k < s.items.length; k++) {
            var item = s.items[k];
            var ok = !!item && (item.kind === 'stream' ? stream(item.stream) : item.kind === 'game' && game(item.game) &&
                (item.game.topStream === undefined || stream(item.game.topStream)));
            if (!ok) {
                return false;
            }
        }
    }
    return true;
}

function stream(s: Stream): boolean {
    return !!s && text(s.id) && text(s.title) && typeof s.viewers === 'number' && text(s.preview) && !!s.channel &&
        text(s.channel.id) && text(s.channel.displayName) && text(s.channel.avatar) && (s.game === undefined || game(s.game));
}

function game(g: Stream['game']): boolean {
    return !!g && text(g.id) && text(g.displayName) && text(g.boxArt);
}

function text(v: unknown): boolean {
    return typeof v === 'string';
}
