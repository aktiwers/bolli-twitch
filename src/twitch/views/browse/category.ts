// A category's page as Twitch's TV app draws it: the focused channel's picture across the top under the dark gradient,
// the box art, the name, "16K viewers • 6.8K followers", Follow and Not Interested, and under them the live channels
// 4 per row, the focused row always at y 558 of 1080 (the grid slides 414 px per row, the rows above go under the
// picture). Focus starts on the first channel; Up from the first row goes to Follow, Up from there to the menu.
// Twitch asks 24 channels and at once 16 more; the next 16 come when focus is three rows from the end. The header
// draws at once from the tile that opened the page; its first channels may already be in from focus resting on that
// tile (prefetchCategory).

import { h, setShown, setText, toggleClass } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { Cache } from '../../api/cache.js';
import { gameStreams } from '../../api/category.js';
import { Game, Item, Page, Stream } from '../../api/types.js';
import { Follow } from '../follow.js';
import { Grid } from '../grid.js';
import { Hero, HeroModel, heroOf } from '../hero.js';
import { GqlError } from '../../api/gql.js';
import { Navigator, Screen } from '../navigator.js';
import { askNotInterested } from '../not-interested.js';
import { PagedGrid } from '../pager.js';
import { Rest } from '../rest.js';
import { count, streamItem } from '../tiles.js';

/** 4 channels 444 px apart, rows 414 apart, the focused row's top at 558 (1920 px) */
var LAYOUT = { cols: 4, step: 296, rowStep: 276, focusTop: function (): number { return 372; } };
/** Focus resting this long fetches the top pictures one step away */
var AHEAD_MS = 200;
/** A first page asked ahead is taken this long after; at most FIRST_MAX are kept */
var FIRST_MS = 60 * 1000;
var FIRST_MAX = 4;

export interface CategoryAnswer {
    game: Game;
    streams: Page<Stream>;
}

/** A category's first channels (no cursor) or the ones after a cursor */
export type CategoryLoader = (name: string, after?: string) => Promise<CategoryAnswer>;

var firstPages = new Cache<CategoryAnswer>(FIRST_MS, FIRST_MS, FIRST_MAX);

/** Fetches a category's first channels before its page opens (focus resting on its tile) */
export function prefetchCategory(game: Game): Promise<unknown> {
    return firstPages.prefetch(game.name.toLowerCase(), function () {
        return gameStreams(game.name);
    });
}

type Place = 'grid' | 'follow' | 'skip';

export class CategoryPage implements Screen {
    el: HTMLElement;
    hero = new Hero();
    paged: PagedGrid;
    private place: Place = 'grid';
    private focused = true;
    private nameEl: HTMLElement;
    private statsEl: HTMLElement;
    private follow: Follow;
    private skipBtn: HTMLElement;
    private aheadTimer = 0;
    /** Focus resting on a channel: its stream resolved ahead */
    private rest = new Rest();

    /** game: the tile's category (name, box art, viewers draw at once) */
    constructor(private game: Game, private nav: Navigator, private load: CategoryLoader = gameStreams) {
        this.el = h('div', 'bt-category');
        var self = this;
        var name = game.name;
        this.paged = new PagedGrid(LAYOUT, function (after?: string) {
            var answer = after ? load(name, after) : firstPages.get(name.toLowerCase(), function () {
                return load(name);
            });
            return answer.then(function (a: CategoryAnswer) {
                if (!after) {
                    self.header(a.game);
                }
                return { items: a.streams.items.map(streamItem), next: a.streams.next };
            }, function (e: GqlError) {
                if (e && e.kind === 'notfound' && !after) {
                    self.nav.error(self, 'not-found');
                }
                throw e;
            });
        }, 'bt-state--category', { title: '', line: 'It doesn\'t look like there is any content for this category.' }, function (first: boolean) {
            // The first channels may come right after the header's hero (asked ahead): not a held key
            self.showHero(first);
            self.mark();
        });
        this.el.appendChild(this.paged.grid.el);
        this.el.appendChild(h('div', 'bt-category-fade'));
        this.el.appendChild(this.hero.el);
        var head = this.el.appendChild(h('div', 'bt-category-head')) as HTMLElement;
        this.nameEl = head.appendChild(h('div', 'bt-category-name')) as HTMLElement;
        this.statsEl = head.appendChild(h('div', 'bt-category-stats')) as HTMLElement;
        var buttons = head.appendChild(h('div', 'bt-category-buttons')) as HTMLElement;
        this.follow = new Follow('bt-category-follow', nav, null);
        buttons.appendChild(this.follow.el);
        this.skipBtn = buttons.appendChild(h('div', 'bt-button', 'Not Interested')) as HTMLElement;
        this.el.appendChild(this.paged.state.el);
        this.header(game);
        this.showHero();
        this.mark();
    }

    get grid(): Grid {
        return this.paged.grid;
    }

    show(): void {
        setShown(this.el, true);
        this.grid.setNarrow(false);
        this.grid.hold(false);
        // A picture change still waiting when it hid is dropped: the focused tile's now
        this.showHero(true);
    }

    /** Under a player: pictures for the focused row only */
    narrow(): void {
        this.grid.setNarrow(true);
    }

    hide(): void {
        clearTimeout(this.aheadTimer);
        this.rest.cancel();
        this.hero.pause();
        setShown(this.el, false);
        this.grid.hold(true);
    }

    destroy(): void {
        clearTimeout(this.aheadTimer);
        this.rest.cancel();
        this.hero.pause();
        this.follow.destroy();
        this.paged.destroy();
    }

    /** On Follow or Not Interested: Up goes to the menu */
    atTop(): boolean {
        return this.place !== 'grid';
    }

    /** Focus on it (also back from a player): the focused tile rests again; on the menu: nothing rests */
    setFocused(focused: boolean): void {
        this.focused = focused;
        this.mark();
        if (focused && this.place === 'grid') {
            this.rest.item(this.grid.focusedItem, this.nav.ahead);
        } else if (!focused) {
            this.rest.cancel();
        }
    }

    /** Signed in or out: the header again, with the account's Follow state */
    accountChanged(): void {
        var self = this;
        this.load(this.game.name).then(function (a: CategoryAnswer) {
            self.header(a.game);
        }, function () { return undefined; });
    }

    /** OK on Try Again (focus under the buttons; OK on the buttons asks nothing), or the network back */
    retry(pressed?: boolean): boolean {
        if (pressed && this.place !== 'grid') {
            return false;
        }
        return this.paged.retry();
    }

    onKey(code: number): boolean {
        if (this.place === 'grid') {
            return this.gridKey(code);
        }
        if (code === KEY.LEFT || code === KEY.RIGHT) {
            this.place = code === KEY.LEFT ? 'follow' : 'skip';
        } else if (code === KEY.DOWN) {
            // To the channels, or to Try Again where they failed
            if (this.grid.items.length || this.paged.state.failed) {
                this.place = 'grid';
            }
        } else if (code === KEY.OK) {
            if (this.place === 'follow') {
                this.follow.press();
            } else {
                askNotInterested({ kind: 'game', game: this.game }, this.nav);
            }
        } else {
            // Up is the shell's (the menu)
            return false;
        }
        this.mark();
        return true;
    }

    private gridKey(code: number): boolean {
        var grid = this.grid;
        if (code === KEY.OK) {
            var item = grid.focusedItem;
            if (item) {
                this.nav.open(item);
            }
            return !!item;
        }
        if (code !== KEY.UP && code !== KEY.DOWN && code !== KEY.LEFT && code !== KEY.RIGHT) {
            return false;
        }
        if (grid.move(code)) {
            this.paged.moved();
            this.showHero();
            this.fetchAheadSoon();
            this.rest.item(grid.focusedItem, this.nav.ahead);
        } else if (code === KEY.UP) {
            this.place = 'follow';
            this.rest.cancel();
            this.mark();
        }
        return true;
    }

    /** The header from the category's details (the tile's at first, then the page's own) */
    private header(game: Game): void {
        this.game = game;
        setText(this.nameEl, game.displayName);
        var stats = game.viewers !== undefined ? count(game.viewers, 0, 'viewer') : '';
        if (game.followers !== undefined) {
            stats += (stats ? ' • ' : '') + count(game.followers, 1, 'follower');
        }
        setText(this.statsEl, stats);
        this.follow.set({ kind: 'game', id: game.id, name: game.displayName });
    }

    private showHero(atOnce?: boolean): void {
        this.hero.show(this.heroFor(this.grid.focusedItem), atOnce);
    }

    /** Once focus rests: the top pictures one step away */
    private fetchAheadSoon(): void {
        clearTimeout(this.aheadTimer);
        var self = this;
        this.aheadTimer = setTimeout(function () {
            var grid = self.grid;
            var i = grid.index;
            var cols = LAYOUT.cols;
            var col = i % cols;
            var near = [col > 0 ? grid.items[i - 1] : null, col < cols - 1 ? grid.items[i + 1] : null, grid.items[i - cols], grid.items[i + cols]];
            var models: HeroModel[] = [];
            for (var k = 0; k < near.length; k++) {
                if (near[k]) {
                    models.push(self.heroFor(near[k]));
                }
            }
            self.hero.prefetch(models);
        }, AHEAD_MS) as unknown as number;
    }

    /** The top picture: the focused channel's beside the category's box art */
    private heroFor(item: Item | null | undefined): HeroModel {
        return { picture: item ? heroOf(item).picture : '', art: this.game.boxArt, live: false, line1: '', line2: '' };
    }

    private mark(): void {
        var on = this.focused;
        this.paged.setFocused(on && this.place === 'grid');
        toggleClass(this.follow.el, 'bt-focused', on && this.place === 'follow');
        toggleClass(this.skipBtn, 'bt-focused', on && this.place === 'skip');
    }
}
