// Browse as Twitch's TV app has it: no tabs, one grid of categories in Twitch's order, 8 per row, the first row at
// y 234 of 1080 and every row after it at y 648 once focus goes down (the grid slides 414 px per row under a band in
// the page colour behind the menu), focus starting on the first category. Twitch asks 24 categories and at once 16
// more; the next 16 are asked when focus is three rows from the end. Unlike Twitch's app it is built once and kept,
// so coming back finds the same category; categories older than STALE_MS are asked again a few seconds after Browse
// went out of sight (never in sight) when focus is still in the first page, and put in place only if Browse did not
// show meanwhile and focus is still there. Focus resting on a category fetches its page ahead.

import { h, setShown } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { browseGames } from '../../api/browse.js';
import { Cache } from '../../api/cache.js';
import { Game, Item, Page } from '../../api/types.js';
import { Grid } from '../grid.js';
import { Navigator, Screen } from '../navigator.js';
import { PagedGrid, PageLoader } from '../pager.js';
import { Rest } from '../rest.js';
import { gameItem } from '../tiles.js';

/** 8 categories 222 px apart, rows 414 apart; the first row's top at 234 and the focused one's at 648 (1920 px) */
var LAYOUT = { cols: 8, step: 148, rowStep: 276, focusTop: function (row: number): number { return row ? 432 : 156; } };
var STALE_MS = 10 * 60 * 1000;
/** A stale first page is asked again this long after Browse went out of sight (a quick return asks nothing) */
var REFRESH_AFTER_MS = 3000;
/** Categories on Twitch's first page: a refresh keeps focus when it is among them */
var FIRST_PAGE = 24;

/** The first page, asked ahead before Browse first shows and taken while fresh */
var firstPages = new Cache<Page<Game>>(STALE_MS, STALE_MS, 1);

/** Asks Browse's first categories before it is first shown (their texts only: pictures come when it shows) */
export function prefetchBrowse(): Promise<unknown> {
    return firstPages.prefetch('', browseGames);
}

/** Browse's pages as tiles: the first one fetched ahead when still fresh, else asked now */
function browsePage(after?: string): Promise<Page<Item>> {
    var answer = after ? browseGames(after) : firstPages.get('', browseGames);
    return answer.then(function (page: Page<Game>) {
        return { items: page.items.map(gameItem), next: page.next };
    });
}

export class BrowseView implements Screen {
    el: HTMLElement;
    paged: PagedGrid;
    /** When the first page came */
    private freshAt = 0;
    private rest = new Rest();
    private refreshTimer = 0;
    private refreshing = false;
    /** Raised by every show(): a refresh asked before it is dropped */
    private showings = 0;
    private gone = false;

    /** loader: the pages of categories */
    constructor(private nav: Navigator, private loader: PageLoader<Item> = browsePage) {
        this.el = h('div', 'bt-browse');
        var self = this;
        this.paged = new PagedGrid(LAYOUT, loader, 'bt-state--page', { title: 'Nothing here right now', line: '' }, function (first: boolean) {
            if (first) {
                self.freshAt = Date.now();
            }
        });
        this.el.appendChild(this.paged.grid.el);
        this.el.appendChild(h('div', 'bt-browse-fade'));
        this.el.appendChild(h('div', 'bt-browse-band'));
        this.el.appendChild(this.paged.state.el);
    }

    get grid(): Grid {
        return this.paged.grid;
    }

    show(): void {
        this.showings++;
        clearTimeout(this.refreshTimer);
        setShown(this.el, true);
        this.grid.setNarrow(false);
        this.grid.hold(false);
    }

    /** Out of sight: pictures wait, and categories gone stale are asked again a little later */
    hide(): void {
        this.rest.cancel();
        setShown(this.el, false);
        this.grid.hold(true);
        clearTimeout(this.refreshTimer);
        if (this.freshAt && Date.now() - this.freshAt > STALE_MS && this.grid.index < FIRST_PAGE) {
            var self = this;
            this.refreshTimer = setTimeout(function () {
                self.refresh();
            }, REFRESH_AFTER_MS) as unknown as number;
        }
    }

    /** Under a player: pictures for the focused row only */
    narrow(): void {
        this.grid.setNarrow(true);
    }

    destroy(): void {
        this.gone = true;
        this.rest.cancel();
        clearTimeout(this.refreshTimer);
        this.paged.destroy();
    }

    atTop(): boolean {
        return this.grid.row === 0;
    }

    /** Focus on it (also back from a player): the focused tile rests again; on the menu: nothing rests */
    setFocused(focused: boolean): void {
        this.paged.setFocused(focused);
        if (focused) {
            this.rest.item(this.grid.focusedItem, this.nav.ahead);
        } else {
            this.rest.cancel();
        }
    }

    retry(): boolean {
        return this.paged.retry();
    }

    onKey(code: number): boolean {
        var grid = this.grid;
        if (code === KEY.OK) {
            var item = grid.focusedItem;
            if (item) {
                this.nav.open(item);
            }
            return !!item;
        }
        if (code === KEY.UP || code === KEY.DOWN || code === KEY.LEFT || code === KEY.RIGHT) {
            if (grid.move(code)) {
                this.paged.moved();
                this.rest.item(grid.focusedItem, this.nav.ahead);
                return true;
            }
            // Up from the first row is the shell's (the menu)
            return code !== KEY.UP;
        }
        return false;
    }

    /** The first page again, put in place only if Browse stayed out of sight and focus is still in the first page
     * (else asked again the next time) */
    private refresh(): void {
        if (this.refreshing || this.paged.pager.loading) {
            return;
        }
        this.refreshing = true;
        var showings = this.showings;
        var self = this;
        this.loader().then(function (page: Page<Item>) {
            self.refreshing = false;
            if (!self.gone && showings === self.showings && self.grid.index < FIRST_PAGE) {
                self.paged.refresh(page);
            }
        }, function () {
            self.refreshing = false;
        });
    }
}
