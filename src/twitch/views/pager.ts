// Long lists asked a page at a time, with one rule for every screen: no answer (the network, Twitch's servers) is
// asked again later (Backoff: 5 s, doubling up to a minute) and at once on retry() (the network is back, or OK on Try
// Again); Twitch refusing shows the failed state and is asked again only by retry(). Pager does the asking; PagedRows
// pages rows into a RowStack (Home, Following), PagedGrid tiles into a Grid (Browse, a category's channels), each with
// its failed and empty state. A row whose shelf goes on (Following's live and offline rows) asks its own next page as
// focus nears its end, with the same rule and no state of its own.

import { h } from '../../core/dom.js';
import { FollowedShelf } from '../api/following.js';
import { GqlError } from '../api/gql.js';
import { ShelfLoader } from '../api/home.js';
import { Item, Page, Shelf } from '../api/types.js';
import { Grid, GridLayout } from './grid.js';
import { Row, RowStack, itemId } from './rows.js';
import { StateBox } from './state.js';

var FIRST_MS = 5000;
var MAX_MS = 60000;
/** The next page is asked when focus is this many rows from the last one */
var NEAR = 3;
/** Shelves asked per page */
var SHELVES = 6;
/** A row's next page is asked when the last tile it draws is one of its last this many (Twitch's TV app: 3) */
var NEAR_TILES = 3;

/** Asks again later after a failure: 5 s, doubling up to a minute; an answer starts from 5 s again */
export class Backoff {
    private ms = FIRST_MS;
    private timer = 0;

    constructor(private ask: () => void) {
    }

    /** A wait for the next ask is running */
    get waiting(): boolean {
        return this.timer !== 0;
    }

    /** No answer: asks again after the next step */
    later(): void {
        clearTimeout(this.timer);
        var self = this;
        this.timer = setTimeout(function () {
            self.timer = 0;
            self.ask();
        }, this.ms) as unknown as number;
        this.ms = Math.min(MAX_MS, this.ms * 2);
    }

    /** An answer came: the next failure waits the first step */
    reset(): void {
        this.ms = FIRST_MS;
    }

    /** Asks now, from the first step */
    now(): void {
        this.cancel();
        this.reset();
        this.ask();
    }

    cancel(): void {
        clearTimeout(this.timer);
        this.timer = 0;
    }
}

export type PageLoader<T> = (after?: string) => Promise<Page<T>>;

/** A list asked a page at a time */
export class Pager<T> {
    /** Pages taken since the first */
    pages = 0;
    ended = false;
    loading = false;
    private next: string | undefined;
    private refused = false;
    private backoff: Backoff;
    private retryNow = false;
    private gone = false;
    /** Asks made, so an answer to an earlier one (before adopt()) is dropped */
    private asked = 0;

    /** onPage: each page taken (first: the first page, whose items replace what is there); onState: after the
     * loading, failed or ended state changed */
    constructor(private loader: PageLoader<T>, private onPage: (items: T[], first: boolean) => void, private onState: () => void) {
        var self = this;
        this.backoff = new Backoff(function () {
            self.ask();
        });
    }

    /** No answer yet, or Twitch refused: the screen shows Try Again while it has nothing to show */
    get failed(): boolean {
        return this.refused || this.backoff.waiting;
    }

    /** The first page */
    start(): void {
        this.pages = 0;
        this.next = undefined;
        this.ended = false;
        this.ask();
    }

    /** The next page, unless one is being asked, the list ended or a failed one waits */
    more(): void {
        if (this.pages && !this.loading && !this.ended && !this.failed) {
            this.ask();
        }
    }

    /** A first page fetched elsewhere (a refresh) is now the list's: the pages go on after it, and an answer still
     * coming for the old list is dropped */
    adopt(page: Page<T>): void {
        this.backoff.cancel();
        this.refused = false;
        this.loading = false;
        this.asked++;
        this.pages = 1;
        this.next = page.next;
        this.ended = page.next === undefined;
    }

    /** Asks a failed page again now (one being asked: at once if it fails); false when nothing had failed */
    retry(): boolean {
        if (this.gone) {
            return false;
        }
        this.backoff.reset();
        if (this.loading) {
            this.retryNow = true;
            return false;
        }
        if (!this.failed) {
            return false;
        }
        this.ask();
        return true;
    }

    /** Stops asking; late answers are dropped */
    destroy(): void {
        this.gone = true;
        this.backoff.cancel();
    }

    private ask(): void {
        this.backoff.cancel();
        this.refused = false;
        this.loading = true;
        this.retryNow = false;
        var asked = ++this.asked;
        var first = this.pages === 0;
        var self = this;
        this.loader(first ? undefined : this.next).then(function (page: Page<T>) {
            if (self.gone || asked !== self.asked) {
                return;
            }
            self.loading = false;
            self.backoff.reset();
            self.pages++;
            self.next = page.next;
            self.ended = page.next === undefined;
            self.onPage(page.items, first);
            self.onState();
        }, function (e: GqlError) {
            if (self.gone || asked !== self.asked) {
                return;
            }
            self.loading = false;
            if (self.retryNow) {
                self.ask();
                return;
            }
            if (e && (e.kind === 'twitch' || e.kind === 'notfound')) {
                self.refused = true;
            } else {
                self.backoff.later();
            }
            self.onState();
        });
        this.onState();
    }
}

/** One row's later pages: the tiles it does not have yet go to onPage */
class TilePager {
    pager: Pager<Item>;
    /** The row's items by itemId: one a later page repeats (the order changed meanwhile) is left out */
    private seen: { [id: string]: boolean } = {};

    /** shelf: with its next cursor and more; made: the first page it came with (PagedRows' count) */
    constructor(public shelf: FollowedShelf, public made: number, onPage: (pager: TilePager, items: Item[]) => void) {
        for (var i = 0; i < shelf.items.length; i++) {
            this.seen[itemId(shelf.items[i])] = true;
        }
        var self = this;
        var more = shelf.more as (after: string) => Promise<Page<Item>>;
        this.pager = new Pager<Item>(function (after?: string) {
            return more(after as string);
        }, function (items: Item[]) {
            onPage(self, self.fresh(items));
        }, function () { /* a row shows no state of its own */ });
        this.pager.adopt({ items: shelf.items, next: shelf.next });
    }

    private fresh(items: Item[]): Item[] {
        var out: Item[] = [];
        for (var i = 0; i < items.length; i++) {
            var id = itemId(items[i]);
            if (!this.seen[id]) {
                this.seen[id] = true;
                out.push(items[i]);
            }
        }
        return out;
    }
}

/** Rows paged from a loader into a RowStack, the next page as focus nears the end. Rows already there (a kept copy)
 * get the fresh shelves in their place. With no rows: the failed state, or at the end the empty one. A shelf with a
 * next cursor (api/following.ts) gets its next page when the row in sight nears its end */
export class PagedRows {
    el: HTMLElement;
    stack: RowStack;
    pager: Pager<Shelf>;
    state = new StateBox('bt-state--page');
    /** Fresh shelves taken so far (rows past them are the kept copy's) */
    private taken = 0;
    /** The first page replaces the rows there at once, in sight too */
    private atOnce = false;
    /** The rows that go on, by their shelf */
    private tilePagers: TilePager[] = [];
    /** First pages taken: a row's pager from an earlier one stays only while the row still shows its shelf */
    private firsts = 0;
    /** The first page asked again (reload), and destroyed (a late answer is dropped) */
    private reloading = false;
    private gone = false;

    /** onPage: after each fresh page is in (first: the first one) */
    constructor(private loader: ShelfLoader, top: number, private onPage: (first: boolean, shelves: Shelf[]) => void) {
        this.el = h('div', 'bt-paged');
        this.stack = new RowStack(top);
        this.el.appendChild(this.stack.el);
        this.el.appendChild(this.state.el);
        var self = this;
        this.pager = new Pager<Shelf>(function (after?: string) {
            return loader(SHELVES, after);
        }, function (shelves: Shelf[], first: boolean) {
            self.take(shelves, first);
        }, function () {
            self.showState();
        });
        this.pager.start();
    }

    /** Rows shown until the first page comes; atOnce: it replaces them even in sight */
    prefill(shelves: Shelf[], atOnce: boolean): void {
        this.atOnce = atOnce;
        this.stack.add(shelves);
    }

    /** After focus moved: the next page when focus nears the end, and a row's next page when it nears its end */
    moved(): void {
        if (this.stack.index >= this.stack.rows.length - NEAR) {
            this.pager.more();
        }
        if (this.tilePagers.length) {
            this.prune();
            this.moreTiles();
        }
    }

    /** A first page asked again elsewhere (a refresh) in place of the rows: rows there get their shelf (in sight: once
     * out of sight, or at once with atOnce), the rest are added or cut, and the pages go on from it */
    refresh(page: Page<Shelf>, atOnce?: boolean): void {
        this.pager.adopt(page);
        this.taken = 0;
        this.atOnce = !!atOnce;
        this.take(page.items, true);
        this.showState();
    }

    /** The first page asked again from the loader, then in place of the rows as refresh() puts it (one ask at a time;
     * a failed one leaves the rows as they are) */
    reload(atOnce: boolean): void {
        if (this.reloading || this.pager.loading) {
            return;
        }
        this.reloading = true;
        var self = this;
        this.loader(SHELVES).then(function (page: Page<Shelf>) {
            self.reloading = false;
            if (!self.gone) {
                self.refresh(page, atOnce);
            }
        }, function () {
            self.reloading = false;
        });
    }

    /** OK on Try Again (or the network back): true when the failed state showed. A row's failed page is asked again
     * too */
    retry(): boolean {
        var shown = !this.stack.rows.length;
        for (var i = 0; i < this.tilePagers.length; i++) {
            this.tilePagers[i].pager.retry();
        }
        return this.pager.retry() && shown;
    }

    setFocused(focused: boolean): void {
        this.stack.setFocused(focused);
        this.state.setFocused(focused);
    }

    /** Stops asking; late replies are dropped */
    destroy(): void {
        this.gone = true;
        this.pager.destroy();
        for (var i = 0; i < this.tilePagers.length; i++) {
            this.tilePagers[i].pager.destroy();
        }
        this.tilePagers = [];
        this.stack.clear();
    }

    /** A fresh page: rows there get their shelf (in sight: once out of sight), the rest are added */
    private take(shelves: Shelf[], first: boolean): void {
        if (first) {
            this.firsts++;
        }
        var rows = this.stack.rows.length;
        for (var k = 0; k < shelves.length && this.taken + k < rows; k++) {
            this.stack.replace(this.taken + k, shelves[k], this.atOnce);
        }
        this.stack.add(shelves.slice(k));
        this.taken += shelves.length;
        this.atOnce = false;
        if (this.pager.ended) {
            this.stack.cut(this.taken);
        }
        this.pageTiles(shelves);
        this.onPage(first, shelves);
        this.moved();
    }

    /** A pager for each shelf that goes on */
    private pageTiles(shelves: Shelf[]): void {
        var self = this;
        for (var i = 0; i < shelves.length; i++) {
            var shelf = shelves[i] as FollowedShelf;
            if (shelf.more && shelf.next !== undefined) {
                this.tilePagers.push(new TilePager(shelf, this.firsts, function (pager: TilePager, items: Item[]) {
                    var row = self.rowOf(pager.shelf);
                    if (row) {
                        row.append(items);
                    }
                    self.moreTiles();
                }));
            }
        }
    }

    /** Drops the pagers of an earlier first page whose shelf no row shows any more */
    private prune(): void {
        var kept: TilePager[] = [];
        for (var i = 0; i < this.tilePagers.length; i++) {
            var p = this.tilePagers[i];
            if (p.made === this.firsts || this.rowOf(p.shelf)) {
                kept.push(p);
            } else {
                p.pager.destroy();
            }
        }
        this.tilePagers = kept;
    }

    /** The next page of each row in sight whose last drawn tile nears its end (one page at a time per row) */
    private moreTiles(): void {
        var stack = this.stack;
        for (var i = stack.index; i < stack.index + 2 && i < stack.rows.length; i++) {
            var row = stack.rows[i];
            if (row.nearEnd(NEAR_TILES)) {
                for (var k = 0; k < this.tilePagers.length; k++) {
                    if (this.tilePagers[k].shelf === row.shelf) {
                        this.tilePagers[k].pager.more();
                    }
                }
            }
        }
    }

    private rowOf(shelf: Shelf): Row | null {
        var rows = this.stack.rows;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].shelf === shelf) {
                return rows[i];
            }
        }
        return null;
    }

    /** With no rows: the failed state (Try Again) or, at the end, the empty one */
    private showState(): void {
        var failed = this.pager.failed;
        if (!this.stack.rows.length && (failed || this.pager.ended)) {
            this.state.show(failed ? 'Something went wrong' : 'Nothing here right now', '', failed);
        } else {
            this.state.hide();
        }
    }
}

/** Tiles paged from a loader into a Grid: the first page replaces the grid and the next is asked at once (Twitch: 24,
 * then 16), the next pages as focus nears the end. With nothing in: the failed state, or at the end the empty one */
export class PagedGrid {
    grid: Grid;
    pager: Pager<Item>;
    state: StateBox;

    /** stateCls: the state box's place; empty: its heading and line; onPage: after each page is in (first: the first) */
    constructor(layout: GridLayout, loader: PageLoader<Item>, stateCls: string, private empty: { title: string; line: string },
                private onPage?: (first: boolean) => void) {
        this.grid = new Grid(layout);
        this.state = new StateBox(stateCls);
        var self = this;
        this.pager = new Pager<Item>(loader, function (items: Item[], first: boolean) {
            self.take(items, first);
        }, function () {
            self.showState();
        });
        this.pager.start();
    }

    /** After focus moved: the next page when focus nears the end */
    moved(): void {
        if (this.grid.row >= this.grid.rowCount - NEAR) {
            this.pager.more();
        }
    }

    /** A first page asked again elsewhere (a refresh) in place of the list */
    refresh(page: Page<Item>): void {
        this.pager.adopt(page);
        this.take(page.items, true);
        this.showState();
    }

    /** OK on Try Again (or the network back): true when the failed state showed */
    retry(): boolean {
        var shown = !this.grid.items.length;
        return this.pager.retry() && shown;
    }

    setFocused(focused: boolean): void {
        this.grid.setFocused(focused);
        this.state.setFocused(focused);
    }

    destroy(): void {
        this.pager.destroy();
    }

    private take(items: Item[], first: boolean): void {
        if (first) {
            this.grid.set(items);
            this.pager.more();
        } else {
            this.grid.append(items);
        }
        this.moved();
        if (this.onPage) {
            this.onPage(first);
        }
    }

    private showState(): void {
        var failed = this.pager.failed;
        if (!this.grid.items.length && (failed || this.pager.ended)) {
            this.state.show(failed ? 'Something went wrong' : this.empty.title, failed ? '' : this.empty.line, failed);
        } else {
            this.state.hide();
        }
    }
}
