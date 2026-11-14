// Bolli's Favorites tab, between Home and Following: the channels kept as favorites on the device (api/favorites.ts)
// in rows as Home's, right under the menu with the next row whole below: Live Now (the favorites that are live, as
// stream tiles) and All Favorites (every one as a round avatar: in a red ring with LIVE while live, grey with when it
// was last live when not; OK opens its page). Under them Latest Broadcasts, their past broadcasts merged, the newest
// first (api/favorites-latest.ts), as a grid of four a row that goes down as far as the viewer does: Down from the
// last row enters it, Up from its first row goes back to the rows, and with focus in it the rows slide away above.
// More past broadcasts are asked when focus comes within NEAR_ROWS rows of its end, until Twitch has no more; pictures
// are asked for the rows near the focus only (grid.ts). With no favorites the tab says how to add one and focus stays
// on the menu. Settings can leave Live Now or All Favorites out (rows-shown.ts): the tab then lays out without them,
// and with both out the grid is the whole tab, focus in it and Up from its first row going to the menu. A change
// shows when the tab shows next, focus back at its top. Focus resting on a past broadcast in the grid plays it in its
// tile (grid-preview.ts) when Settings' Favorites Previews is on.
// Past the first 100 favorites Twitch is asked about the next batch only as the viewer's keys get near the end of what
// is loaded: focus within a screen of tiles of All Favorites' last loaded one, Right onto or at Live Now's last tiles,
// or Latest Broadcasts out of past broadcasts (that batch's channels then follow in it). One key asks one batch at
// most: an answer drawn never asks the next by itself. All Favorites has every favorite from the start: one not loaded
// yet draws from the list (offline, no line) until its batch comes.
// It draws at once from the last answer kept (api/favorites-feed.ts) and asks Twitch again when that is older than a
// minute: when it is built (focus resting on its menu item builds it ahead, out of sight, pictures and all), each time
// it shows and when the app comes back in front. A new answer goes in place at once while the tab is out of sight;
// in sight, a row takes it once it leaves sight, but at once when what shows is older than IN_SIGHT_MS, was drawn
// before Twitch answered for a favorite, or has other rows. A change of the list itself (added, removed, moved) shows
// at once. Built once and kept, so Back finds the same row and tile; focus resting on a tile fetches
// ahead what it opens, as on Home.
// Move (the channel's menu on a tile of Live Now or All Favorites) lifts the tile above the others: Left/Right carry it
// along the row (a held key repeats), OK sets it down there and the list takes that order (one write), Back puts it
// back. Up/Down do nothing meanwhile, and a line under the menu says the keys. In Live Now every favorite then stands
// in the row in the list's order, the ones not live as greyed ghosts, so the tile can go next to an offline one; once
// it is set down only the live ones are left. During a move nothing is asked of Twitch or fetched ahead, and a new
// answer waits until it ends.

import { h, setShown, translate } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { favorites, moveFavorite, onFavoritesChange } from '../../api/favorites.js';
import { answerAge, favoritesAnswered, favoritesAt, favoritesHaveMore, favoritesLoaded, favoriteShelves, favoriteStates,
    liveWithGhosts, moreFavorites, onFavoriteStates, refreshFavorites } from '../../api/favorites-feed.js';
import { latest, latestHasMore, latestJoin, moreLatest, onLatest, seedLatest } from '../../api/favorites-latest.js';
import { Item, Shelf } from '../../api/types.js';
import { Grid } from '../grid.js';
import { holdOk } from '../held-ok.js';
import { Navigator, Screen } from '../navigator.js';
import { Rest } from '../rest.js';
import { itemId, Row, ROW_STEP, rowsKey, RowStack } from '../rows.js';
import { StateBox } from '../state.js';
import { videoItem } from '../tiles.js';
import { PreviewPlayer, sessionPlayer } from '../channel/preview.js';
import { favoritePreviews, GridPreview, pictureBox } from './grid-preview.js';
import { showsAllRow, showsLiveRow } from './rows-shown.js';

/** The focused row's title, under the menu */
var FOCUS_TOP = 132;
/** Rows in sight older than this change at once when a new answer comes */
var IN_SIGHT_MS = 10 * 60 * 1000;
/** Latest Broadcasts' grid: four past broadcasts a row and its rows this far apart, as a category's page has its
 * channels; its tiles this far under its title, as a row's are */
var GRID_COLS = 4;
/** The grid's left edge (browse.css) */
var GRID_LEFT = 48;
var GRID_STEP = 296;
var GRID_ROW_STEP = 276;
var TILES_TOP = 48;
/** More past broadcasts are asked when focus is this many rows from the last one */
var NEAR_ROWS = 2;

export class FavoritesView implements Screen {
    el: HTMLElement;
    stack: RowStack;
    /** Latest Broadcasts, under the rows */
    grid: Grid;
    /** Focus is in the grid (else on the rows) */
    inGrid = false;
    private rowsBox: HTMLElement;
    private gridTitle: HTMLElement;
    /** The grid waits for another list than it shows (focus is in it): taken once focus leaves it or the tab hides */
    private gridStale = false;
    /** The tab is hidden: the grid asks no pictures */
    private gridHeld = false;
    private state = new StateBox('bt-state--page');
    /** The rows as drawn, or as they will be once out of sight */
    private shelves: Shelf[] = [];
    /** When the answer they were made from came, and whether a favorite waits for Twitch's first answer about it */
    private drawnAt = 0;
    private partial = false;
    /** How many favorites were loaded when drawn: a batch more goes in at once */
    private drawnLoaded = 0;
    private shown = false;
    private focused = false;
    /** A key moved or opened something here: from then on focus is the viewer's and stays on its row and tile */
    private touched = false;
    /** The rows Settings let it show, as last drawn */
    private rowsShown = '';
    /** Focus resting on a tile: what it opens fetched ahead */
    private rest = new Rest();
    /** The focused past broadcast playing in its tile */
    private preview: GridPreview;
    private unlisten: (() => void)[] = [];
    private onVisible: () => void;
    /** A favorite being moved (Move): its channel, the row (by place) and the tile it started at; null: none */
    private moving: { id: string; row: number; from: number } | null = null;
    /** A new answer came during the move: drawn once it ends */
    private drawLater = false;
    /** The past broadcasts a key asked for near the grid's end are coming: when they leave the grid out of them, that
     * key's one batch of favorites follows */
    private mayGrow = false;
    /** The key being handled */
    private key = 0;
    /** The keys while moving, under the menu at the focused row's title */
    private hint: HTMLElement;

    constructor(private nav: Navigator, player?: PreviewPlayer) {
        this.preview = new GridPreview(player || sessionPlayer);
        this.el = h('div', 'bt-fav');
        this.stack = new RowStack(FOCUS_TOP);
        this.stack.channelCard = 'favorite';
        this.rowsBox = this.el.appendChild(h('div', 'bt-fav-rows')) as HTMLElement;
        this.rowsBox.appendChild(this.stack.el);
        var self = this;
        this.grid = new Grid({ cols: GRID_COLS, step: GRID_STEP, rowStep: GRID_ROW_STEP, focusTop: function (row: number): number {
            return self.gridTop() + row * GRID_ROW_STEP;
        } });
        this.grid.card = 'favorite';
        this.gridTitle = h('div', 'bt-row-title bt-fav-latest', 'Latest Broadcasts');
        this.el.appendChild(this.grid.el);
        // Over the rows that slid up behind the menu
        this.el.appendChild(h('div', 'bt-fav-band'));
        this.el.appendChild(this.state.el);
        this.hint = this.el.appendChild(h('div', 'bt-fav-hint', 'Left and Right to move \u00b7 OK to place \u00b7 Back to cancel')) as HTMLElement;
        setShown(this.hint, false);
        setShown(this.el, false);
        this.unlisten.push(onFavoritesChange(function () {
            // (the list changed under a move: it ends where it began)
            self.endMove(false);
            self.draw(true);
        }));
        this.unlisten.push(onLatest(function () {
            self.fill(false);
        }));
        this.unlisten.push(onFavoriteStates(function () {
            self.draw(!self.shown || self.partial || favoritesLoaded() !== self.drawnLoaded || answerAge(self.drawnAt) > IN_SIGHT_MS);
        }));
        this.onVisible = function () {
            if (!document.hidden && self.shown) {
                refreshFavorites();
            }
        };
        document.addEventListener('visibilitychange', this.onVisible, false);
        this.draw(true);
        refreshFavorites();
    }

    /** Nothing to focus (no favorites, or no rows shown and the grid still empty): focus stays on the menu */
    get menuFocus(): boolean {
        return !this.stack.rows.length && !this.grid.items.length;
    }

    show(): void {
        this.shown = true;
        setShown(this.el, true);
        this.stack.setNarrow(false);
        this.stack.setShown(true);
        this.grid.setNarrow(false);
        this.gridHeld = false;
        if (rowsShown() !== this.rowsShown) {
            this.toTop();
        }
        this.holdGrid();
        refreshFavorites();
    }

    /** Settings changed the rows shown: drawn anew, focus on the first row (or the grid's first tile without rows) */
    private toTop(): void {
        this.inGrid = false;
        this.grid.index = 0;
        this.draw(true);
        if (this.stack.index) {
            this.stack.move(-this.stack.index);
        }
        this.mark();
        this.place();
    }

    /** Hidden under another screen: it keeps its pictures, so it shows at once on Back */
    hide(): void {
        this.endMove(false);
        this.shown = false;
        setShown(this.el, false);
        this.stack.setShown(false);
        this.gridHeld = true;
        this.holdGrid();
        if (this.gridStale) {
            this.fill(true);
        }
        this.rest.cancel();
        this.preview.leave();
    }

    /** Under a player: pictures for the focused row only */
    narrow(): void {
        this.stack.setNarrow(true);
        this.grid.setNarrow(true);
    }

    destroy(): void {
        for (var i = 0; i < this.unlisten.length; i++) {
            this.unlisten[i]();
        }
        document.removeEventListener('visibilitychange', this.onVisible, false);
        this.rest.cancel();
        this.preview.stop();
        this.stack.clear();
    }

    atTop(): boolean {
        return this.inGrid ? !this.stack.rows.length && this.grid.row === 0 : this.stack.index === 0;
    }

    /** Focus on the rows or the grid (also back from a player): the focused tile rests again, and near the end more
     * past broadcasts are asked; on the menu: nothing rests */
    setFocused(focused: boolean): void {
        if (!focused) {
            this.endMove(false);
        }
        this.focused = focused;
        this.mark();
        if (focused) {
            this.restSoon();
            this.askMore(false);
        } else {
            this.rest.cancel();
            this.preview.stop();
        }
    }

    /** The network is back: an answer that failed is asked again (nothing here waits on OK) */
    retry(pressed?: boolean): boolean {
        if (!pressed) {
            refreshFavorites();
        }
        return false;
    }

    onKey(code: number): boolean {
        var self = this;
        var used: boolean;
        this.key = code;
        if (this.moving) {
            return this.moveKey(code);
        }
        if (this.inGrid) {
            used = this.gridKey(code);
        } else if (code === KEY.DOWN && this.stack.index === this.stack.rows.length - 1 && this.grid.items.length) {
            this.enter(true);
            used = true;
        } else {
            used = rowsKey(this.stack, code, function () {
                self.moved();
            }, function (item: Item) {
                self.nav.open(item);
            });
            if (code === KEY.RIGHT) {
                this.liveEnd();
            }
        }
        this.touched = this.touched || used;
        return used;
    }

    /** Move can start on this favorite: focus is on its tile in Live Now or All Favorites, and there is another to
     * move it past */
    canMove(id: string): boolean {
        var row = this.stack.row;
        var item = row && !this.inGrid && this.focused && !this.moving ? row.focused : null;
        var on = item ? (item.kind === 'stream' ? item.stream.channel.id : item.kind === 'channel' ? item.channel.id : '') : '';
        return on === id && favorites().length > 1 && !!row && (row.shelf.id === 'favorites-live' || row.shelf.id === 'favorites-all');
    }

    /** Move: the focused tile lifted; in Live Now the favorites that are not live come in as ghosts. Nothing rests
     * meanwhile (no fetch ahead, no preview) */
    startMove(id: string): void {
        if (!this.canMove(id)) {
            return;
        }
        var stack = this.stack;
        var row = stack.row as Row;
        this.rest.cancel();
        this.preview.stop();
        if (row.shelf.id === 'favorites-live') {
            stack.replace(stack.index, { id: row.shelf.id, title: row.shelf.title, items: liveWithGhosts(favorites(), favoriteStates()) }, true);
        }
        this.moving = { id: id, row: stack.index, from: row.index };
        row.lift(true);
        setShown(this.hint, true);
    }

    /** A key while moving: Left/Right carry the tile, OK sets it down, Back puts it back; Up/Down do nothing */
    private moveKey(code: number): boolean {
        var row = this.stack.rows[(this.moving as { row: number }).row];
        if (code === KEY.LEFT || code === KEY.RIGHT) {
            row.shift(code === KEY.LEFT ? -1 : 1);
        } else if (code === KEY.OK) {
            this.endMove(true);
            // (its repeats are not for the tile set down)
            holdOk();
        } else if (code === KEY.BACK) {
            this.endMove(false);
        } else {
            return code === KEY.UP || code === KEY.DOWN;
        }
        return true;
    }

    /** Ends a move: keep, the tile is set down where it is now and the list takes that order (its listeners draw the
     * rows); else it goes back where it was. Then what waited is drawn, and the tile focus is on rests */
    private endMove(keep: boolean): void {
        var m = this.moving;
        if (!m) {
            return;
        }
        this.moving = null;
        setShown(this.hint, false);
        var row = this.stack.rows[m.row];
        row.lift(false);
        // Live Now with ghosts and All Favorites both have every favorite, in the order the tiles now stand
        var to = row.index;
        if (keep && to !== m.from) {
            this.drawLater = false;
            moveFavorite(m.id, to);
        } else {
            this.stack.replace(m.row, this.shelves[m.row], true);
        }
        if (this.drawLater) {
            this.drawLater = false;
            this.draw(true);
        }
        if (this.shown && this.focused) {
            this.restSoon();
        }
    }

    /** A key with focus in the grid: the arrows move in it without wrapping (Up from its first row: back to the rows),
     * OK plays the past broadcast */
    private gridKey(code: number): boolean {
        if (code === KEY.OK) {
            var item = this.grid.focusedItem;
            if (item) {
                this.nav.open(item);
            }
            return !!item;
        }
        if (code !== KEY.UP && code !== KEY.DOWN && code !== KEY.LEFT && code !== KEY.RIGHT) {
            return false;
        }
        if (this.grid.move(code)) {
            this.moved();
        } else if (code === KEY.UP) {
            // Without rows above, Up from the first row is the shell's (the menu)
            if (!this.stack.rows.length) {
                return false;
            }
            this.enter(false);
        }
        return true;
    }

    /** Focus into the grid (the tile it had there) or back to the row above it */
    private enter(inGrid: boolean): void {
        this.inGrid = inGrid;
        if (!inGrid && this.gridStale) {
            this.fill(true);
        }
        this.mark();
        this.moved();
    }

    /** Focus shows on the rows or in the grid, where it is */
    private mark(): void {
        this.stack.setFocused(this.focused && !this.inGrid);
        this.grid.setFocused(this.focused && this.inGrid);
    }

    /** After focus moved: the rows and the grid slide to their places, the focused tile rests, and near the end more
     * past broadcasts are asked */
    private moved(): void {
        this.place();
        this.restSoon();
        this.askMore(true);
    }

    /** Right onto or at one of Live Now's last two tiles: the next batch of favorites, whose live ones follow there */
    private liveEnd(): void {
        var row = this.stack.row;
        if (row && row.shelf.id === 'favorites-live' && row.index >= row.items.length - 2 && this.shown && this.focused &&
            favoritesHaveMore()) {
            moreFavorites();
        }
    }

    /** Where the grid's first row is on screen. Focus on the rows: under its title, which stands where the row after
     * the last would have its own. Focus in the grid: its focused row has the focused row's place */
    private gridTop(): number {
        var up = this.inGrid ? -this.grid.row * GRID_ROW_STEP : (this.stack.rows.length - this.stack.index) * ROW_STEP;
        return FOCUS_TOP + TILES_TOP + up;
    }

    /** The grid slides to its place; with focus in it the rows slide up as far as it did */
    private place(): void {
        var up = this.inGrid ? (this.stack.rows.length - this.stack.index) * ROW_STEP + this.grid.row * GRID_ROW_STEP : 0;
        translate(this.rowsBox, 0, -up);
        this.holdGrid();
        this.grid.place();
    }

    /** The grid's pictures wait while the tab is hidden, and while focus is on a row above the last one: the grid is
     * below the screen then */
    private holdGrid(): void {
        this.grid.hold(this.gridHeld || (!this.inGrid && this.stack.index < this.stack.rows.length - 1));
    }

    /** More past broadcasts, when focus is within NEAR_ROWS rows of the last one and Twitch has more (when the loaded
     * channels have no more, the next batch of favorites, whose channels then follow in the grid); not while the grid
     * waits to take a changed list (it would count from rows it no longer matches and ask for pages it never shows),
     * nor during a move. The next batch also when a key brought focus near All Favorites' last loaded tile.
     * byKey: a key moved focus. The next batch only for a key toward the end (in the grid, or Down), or for the past
     * broadcasts one asked for, once in: a redraw with focus still near the end asks none */
    private askMore(byKey: boolean): void {
        var may = byKey ? this.inGrid || this.key === KEY.DOWN : this.mayGrow;
        this.mayGrow = false;
        if (!this.shown || !this.focused || this.moving) {
            return;
        }
        var row = this.stack.row;
        if (byKey && !this.inGrid && row && row.shelf.id === 'favorites-all' && row.nearEnd(row.columns, favoritesLoaded()) &&
            favoritesHaveMore()) {
            moreFavorites();
        }
        if (this.gridStale) {
            return;
        }
        var left = this.inGrid ? this.grid.rowCount - 1 - this.grid.row : this.stack.rows.length - 1 - this.stack.index + this.grid.rowCount;
        if (this.stack.rows.length && left <= NEAR_ROWS) {
            if (latestHasMore()) {
                moreLatest();
                this.mayGrow = may;
            } else if (may && favoritesHaveMore()) {
                latestJoin();
                moreFavorites();
            }
        }
    }

    /** Latest Broadcasts as the list has them now. More at its end goes in at once. Another list (new ones on top, a
     * channel gone) too, but with focus in the grid it would move the tiles under the viewer: unless atOnce, it then
     * waits until focus leaves the grid or the tab hides */
    private fill(atOnce: boolean): void {
        var grid = this.grid;
        var items = latest().videos.map(videoItem);
        // Held first, so a grid below the screen asks no pictures
        this.holdGrid();
        var grown = items.length >= grid.items.length;
        for (var i = 0; grown && i < grid.items.length; i++) {
            grown = itemId(items[i]) === itemId(grid.items[i]);
        }
        if (grown && this.shown && !atOnce) {
            grid.append(items.slice(grid.items.length));
        } else if (atOnce || !this.shown || !this.inGrid) {
            grid.set(items);
        } else {
            this.gridStale = true;
            this.place();
            return;
        }
        this.gridStale = false;
        if (items.length && !this.gridTitle.parentNode) {
            grid.el.appendChild(this.gridTitle);
        } else if (!items.length && this.gridTitle.parentNode) {
            grid.el.removeChild(this.gridTitle);
        }
        // Without rows the grid has focus; an empty grid has none
        var inGrid = !!items.length && (this.inGrid || !this.stack.rows.length);
        if (inGrid !== this.inGrid) {
            this.inGrid = inGrid;
            this.mark();
        }
        this.place();
        this.askMore(false);
    }

    /** The rows from the list and the last answer. atOnce: in place now, also in sight; else a row in sight waits
     * until it is out of sight, unless the rows are no longer the same ones */
    private draw(atOnce: boolean): void {
        if (this.moving) {
            this.drawLater = true;
            return;
        }
        this.rowsShown = rowsShown();
        var shelves = favoriteShelves(favorites(), favoriteStates()).filter(function (s) {
            return s.id === 'favorites-live' ? showsLiveRow() : s.id === 'favorites-all' ? showsAllRow() : true;
        });
        if (atOnce || !sameRows(shelves, this.shelves)) {
            this.rebuild(shelves);
        } else {
            for (var i = 0; i < shelves.length; i++) {
                this.stack.replace(i, shelves[i]);
            }
        }
        this.shelves = shelves;
        this.drawnAt = favoritesAt();
        this.drawnLoaded = favoritesLoaded();
        this.partial = !favoritesAnswered();
        seedLatest(favorites(), favoriteStates());
        this.fill(atOnce);
        if (favorites().length) {
            this.state.hide();
        } else {
            this.state.show('No favorites yet', 'Hold OK on a channel, or use the star on its page.', false);
        }
        // The focused tile may be another now (never while hidden: what rests then is another screen's)
        if (this.shown && this.focused) {
            this.restSoon();
        }
    }

    /** The rows in place at once. Focus stays on its row (by the row's id: a row may have come or gone above it), and
     * every row keeps its own focused tile, or that tile's place where it is gone (rows are reused by their place, so
     * each is told by its id); a row that is new starts at its first tile. Before the viewer touched the tab focus
     * stays on the first row (Live Now coming with Twitch's answer is where focus starts) */
    private rebuild(shelves: Shelf[]): void {
        var stack = this.stack;
        var rowId = this.touched && stack.row ? stack.row.shelf.id : '';
        var was: { [id: string]: { tile: string; index: number } } = {};
        var had = stack.rows.length;
        for (var i = 0; i < had; i++) {
            var old = stack.rows[i];
            was[old.shelf.id] = { tile: old.focused ? itemId(old.focused) : '', index: old.index };
            if (i < shelves.length) {
                stack.replace(i, shelves[i], true);
            }
        }
        if (shelves.length > had) {
            stack.add(shelves.slice(had));
        } else {
            stack.cut(shelves.length);
        }
        for (var n = 0; n < shelves.length; n++) {
            var row = stack.rows[n];
            var before = was[shelves[n].id];
            var tile = before ? placeOf(row.items, before.tile, before.index) : 0;
            if (tile !== row.index) {
                row.move(tile - row.index);
            }
        }
        var to = indexOfId(shelves, rowId);
        if (to >= 0 && to !== stack.index) {
            stack.move(to - stack.index);
        }
    }

    /** Once focus rests on a tile: what it opens, fetched ahead; a past broadcast in the grid then plays in its tile.
     * A preview of another tile stops at once */
    private restSoon(): void {
        var row = this.stack.row;
        var item = this.inGrid ? this.grid.focusedItem : row ? row.focused : null;
        this.preview.want(this.inGrid && this.shown && this.focused ? item : null);
        if (!this.inGrid || !favoritePreviews()) {
            this.rest.item(item, this.nav.ahead);
            return;
        }
        var self = this;
        this.rest.item(item, function (rested: Item): Promise<unknown> | void {
            var fetched = self.nav.ahead(rested);
            var tile = self.grid.focusedTile;
            if (self.inGrid && self.shown && self.focused && self.grid.focusedItem === rested && tile) {
                self.preview.start(rested, tile, pictureBox(GRID_LEFT + (self.grid.index % GRID_COLS) * GRID_STEP,
                    self.gridTop() + self.grid.row * GRID_ROW_STEP, GRID_STEP));
            }
            return fetched;
        });
    }
}

/** The rows Settings let the tab show, told apart */
function rowsShown(): string {
    return (showsLiveRow() ? 'L' : '') + (showsAllRow() ? 'A' : '');
}

/** Where the tile with this id is in items; gone: the place it had, or the last tile */
function placeOf(items: Item[], id: string, index: number): number {
    for (var i = 0; i < items.length; i++) {
        if (itemId(items[i]) === id) {
            return i;
        }
    }
    return Math.max(0, Math.min(index, items.length - 1));
}

function indexOfId(shelves: Shelf[], id: string): number {
    for (var i = 0; i < shelves.length; i++) {
        if (shelves[i].id === id) {
            return i;
        }
    }
    return -1;
}

/** The same rows in the same order (their tiles may differ) */
function sameRows(a: Shelf[], b: Shelf[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (var i = 0; i < a.length; i++) {
        if (a[i].id !== b[i].id) {
            return false;
        }
    }
    return true;
}
