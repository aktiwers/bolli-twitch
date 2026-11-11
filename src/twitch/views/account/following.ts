// Following (signed in) as Twitch's TV app shows it: with follows, Home's look (the hero over rows) with the followed
// rows (Live Followed Channels, Followed Categories, Followed Offline Channels, the last in Twitch's narrow channel
// cards, eight to a row); with none, the "Follow your favorites!" card over Home's rows. Built once and kept, so Back
// finds the same row and tile; shown again after STALE_MS (Back to it, or the app back in front) it asks the followed
// rows again and puts them in place (in sight once they leave sight; at once when older than IN_SIGHT_MS). The live and offline rows go on a page at a time as focus nears their end
// (views/pager.ts). For an account that followed nothing when last asked (kept on the TV), Home's rows are asked at
// the same time as the followed ones.

import { h, setShown, toggleClass } from '../../../core/dom.js';
import { load, save } from '../../../core/store.js';
import { savedUser } from '../../api/auth.js';
import { ShelfLoader } from '../../api/home.js';
import { Item, Page, Shelf } from '../../api/types.js';
import { picture } from '../art.js';
import { Hero, followingHeroOf } from '../hero.js';
import { Navigator, Screen } from '../navigator.js';
import { PagedRows } from '../pager.js';
import { Rest } from '../rest.js';
import { nearItems, rowsKey } from '../rows.js';

/** The focused row's title: y 540 of 1080 under the hero; under the card the rows sit higher (y 437) */
var FOCUS_TOP = 360;
var CARD_SHIFT = -68.67;
/** Focus resting this long fetches the hero pictures around it */
var AHEAD_MS = 200;
/** Shown again after this long: the followed rows are asked again; older than IN_SIGHT_MS, also those in sight */
var STALE_MS = 60000;
var IN_SIGHT_MS = 10 * 60 * 1000;
/** The account that followed nothing when last asked */
var NONE_KEY = 'twitch.following.none';

export class FollowingView implements Screen {
    el: HTMLElement;
    hero: Hero;
    rows: PagedRows;
    accountBound = true;
    /** Null until the first answer: whether the account follows nothing (the card and Home's rows) */
    private empty: boolean | null = null;
    private card: HTMLElement;
    private shown = false;
    private focused = false;
    private heroItem: Item | null = null;
    private loadedAt = 0;
    private refreshing = false;
    private aheadTimer = 0;
    /** Focus resting on a tile: what it opens fetched ahead */
    private rest = new Rest();
    private gone = false;
    private onVisible: () => void;

    /** followed: the followed rows (none: the account follows nothing); suggestions: Home's rows */
    constructor(private nav: Navigator, private followed: () => Promise<Shelf[]>, private suggestions: ShelfLoader) {
        this.el = h('div', 'bt-home bt-fol');
        this.el.appendChild(h('div', 'bt-home-fade'));
        this.hero = new Hero();
        this.el.appendChild(this.hero.el);
        this.card = this.el.appendChild(h('div', 'bt-fol-head')) as HTMLElement;
        var box = this.card.appendChild(h('div', 'bt-fol-card')) as HTMLElement;
        box.appendChild(h('div', 'bt-fol-pic')).appendChild(picture('hearts'));
        box.appendChild(h('div', 'bt-fol-title', 'Follow your favorites!'));
        box.appendChild(h('div', 'bt-fol-line', 'They\'ll show up here for easy access! Until then, here\'s some things to get you started'));
        setShown(this.card, false);
        this.rows = this.makeRows(null);
        setShown(this.el, false);
        var self = this;
        this.onVisible = function () {
            if (!document.hidden && self.shown) {
                self.refreshIfOld();
            }
        };
        document.addEventListener('visibilitychange', this.onVisible, false);
    }

    show(): void {
        this.shown = true;
        setShown(this.el, true);
        this.rows.stack.setNarrow(false);
        this.rows.stack.setShown(true);
        this.heroItem = null;
        this.showHero();
        this.refreshIfOld();
    }

    private refreshIfOld(): void {
        if (this.loadedAt && Date.now() - this.loadedAt > STALE_MS) {
            this.refresh();
        }
    }

    hide(): void {
        this.shown = false;
        setShown(this.el, false);
        this.rows.stack.setShown(false);
        clearTimeout(this.aheadTimer);
        this.rest.cancel();
        this.hero.pause();
    }

    /** Under a player: pictures for the focused row only */
    narrow(): void {
        this.rows.stack.setNarrow(true);
    }

    destroy(): void {
        this.gone = true;
        document.removeEventListener('visibilitychange', this.onVisible, false);
        clearTimeout(this.aheadTimer);
        this.rest.cancel();
        this.hero.pause();
        this.rows.destroy();
    }

    atTop(): boolean {
        return this.rows.stack.index === 0;
    }

    /** Focus on it (also back from a player): the focused tile rests again; on the menu: nothing rests */
    setFocused(focused: boolean): void {
        this.focused = focused;
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
        var self = this;
        return rowsKey(this.rows.stack, code, function () {
            self.moved();
        }, function (item: Item) {
            self.nav.open(item);
        });
    }

    /** Rows from the first page on; known: the followed rows already asked (a refresh that changed the page) */
    private makeRows(known: Shelf[] | null): PagedRows {
        var self = this;
        // The first page is asked at once (in the constructor) with known; a page asked again asks Twitch
        var rows = new PagedRows(function (count: number, after?: string) {
            var given = known;
            known = null;
            return self.load(count, after, given);
        }, FOCUS_TOP, function (first: boolean) {
            if (first) {
                self.layout();
            }
            if (self.shown) {
                self.showHero();
            }
        });
        // Before the first answer adds a row (it comes later, from a promise)
        rows.stack.channelCard = 'narrow';
        this.el.insertBefore(rows.el, this.el.firstChild);
        return rows;
    }

    /** The followed rows (one page of rows, each row paging its own tiles); none: Home's rows, asked at once beside
     * them when the account followed nothing last time */
    private load(count: number, after: string | undefined, known: Shelf[] | null): Promise<Page<Shelf>> {
        if (after !== undefined) {
            return this.suggestions(count, after);
        }
        var self = this;
        var user = savedUser();
        var none = !!user && load<string>(NONE_KEY) === user.id;
        var early = !known && (this.empty === null ? none : this.empty) ? this.suggestions(count) : null;
        if (early) {
            early.then(null, function () { /* asked again below if needed */ });
        }
        return (known ? Promise.resolve(known) : this.followed()).then(function (shelves) {
            self.loadedAt = Date.now();
            self.empty = !shelves.length;
            if (user && self.empty !== none) {
                save(NONE_KEY, self.empty ? user.id : null);
            }
            if (shelves.length) {
                return { items: shelves };
            }
            return early ? early.then(null, function () { return self.suggestions(count); }) : self.suggestions(count);
        });
    }

    /** The card and Home's rows under it, or the hero over the followed rows */
    private layout(): void {
        var empty = !!this.empty;
        toggleClass(this.el, 'bt-fol--empty', empty);
        setShown(this.card, empty);
        this.rows.stack.el.style.top = empty ? CARD_SHIFT + 'px' : '';
        this.showHero();
    }

    /** Shown again later: the followed rows again. The same kind of page: in place, each row going on from its fresh
     * first page; the other kind: built anew */
    private refresh(): void {
        if (this.refreshing) {
            return;
        }
        this.refreshing = true;
        var atOnce = Date.now() - this.loadedAt > IN_SIGHT_MS;
        var self = this;
        this.followed().then(function (shelves) {
            self.refreshing = false;
            if (self.gone) {
                return;
            }
            self.loadedAt = Date.now();
            if (!shelves.length !== self.empty) {
                self.rows.destroy();
                self.el.removeChild(self.rows.el);
                self.rows = self.makeRows(shelves);
                self.rows.stack.setShown(self.shown);
                self.rows.setFocused(self.focused);
            } else if (shelves.length) {
                self.rows.refresh({ items: shelves }, atOnce);
            }
            if (self.shown) {
                self.showHero();
            }
        }, function () {
            // No answer: asked again the next time it shows
            self.refreshing = false;
        });
    }

    private moved(): void {
        this.showHero();
        this.fetchAheadSoon();
        this.rows.moved();
    }

    /** The focused tile in the hero; under the card, no hero */
    private showHero(): void {
        var row = this.rows.stack.row;
        var item = row && this.empty === false ? row.focused : null;
        if (!item) {
            this.heroItem = null;
            this.hero.hide();
        } else if (item !== this.heroItem) {
            this.heroItem = item;
            this.hero.show(followingHeroOf(item));
        }
    }

    /** Once focus rests: the hero pictures one step away, and what the tile opens */
    private fetchAheadSoon(): void {
        clearTimeout(this.aheadTimer);
        if (this.empty === null || !this.shown) {
            return;
        }
        var self = this;
        if (this.empty === false) {
            this.aheadTimer = setTimeout(function () {
                self.hero.prefetch(nearItems(self.rows.stack).map(followingHeroOf));
            }, AHEAD_MS) as unknown as number;
        }
        var row = this.rows.stack.row;
        this.rest.item(row ? row.focused : null, this.nav.ahead);
    }
}
