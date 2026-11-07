// Twitch's rows: a title over a strip of tiles, and a stack of them that keeps the focused row at one place, with the
// keys Home's rows take. As in Twitch's TV app, focus walks right to the last whole column (the 4th stream, the 8th
// category), then the strip slides one tile per step (0.1 s); it walks back left the same way and never wraps. The
// tile cut by the left edge stays in view. Tiles sit at fixed offsets (nothing is measured); a row builds a tile when
// it first nears the view, keeps it, and draws only the ones in view plus one on each side (two ahead on the focused
// row, ready for its slide).

import { h, LAYOUT_HEIGHT, LAYOUT_WIDTH, setText, toggleClass, translate } from '../../core/dom.js';
import { KEY } from '../../core/keys.js';
import { Item, Shelf } from '../api/types.js';
import { ChannelCard, Tile, tileWidth } from './tiles.js';

/** Side margin and the step between rows (72 and 441 px at 1920) */
var MARGIN = 48;
var ROW_STEP = 294;
/** The rows' slide (0.1 s) and a margin: a row drawn below the screen waits for it to end */
var SLIDE_MS = 150;

export class Row {
    el: HTMLElement;
    items: Item[] = [];
    /** The shelf it shows (append() adds tiles after its items) */
    shelf: Shelf;
    /** The focused tile */
    index = 0;
    private titleEl: HTMLElement;
    private strip: HTMLElement;
    private tiles: (Tile | undefined)[] = [];
    /** The tile at the left margin */
    private first = 0;
    /** Tile width (by the row's first item), and whole tiles in view */
    private step = 0;
    private cols = 1;
    private active = false;
    private marked: Tile | null = null;
    /** On screen or about to be; asking its tiles' pictures */
    private drawn = false;
    private wantPictures = false;
    /** Pictures wait (its screen is hidden): texts change, picture addresses follow when it shows */
    private held = false;

    /** card: how it draws offline channels (Twitch's wide card when not given) */
    constructor(shelf: Shelf, private card?: ChannelCard) {
        this.el = h('div', 'bt-row');
        this.titleEl = this.el.appendChild(h('div', 'bt-row-title')) as HTMLElement;
        this.strip = this.el.appendChild(h('div', 'bt-strip')) as HTMLElement;
        this.el.style.display = 'none';
        this.shelf = shelf;
        this.set(shelf);
    }

    get focused(): Item | null {
        return this.items[this.index] || null;
    }

    /** Fresh data: tiles of the same kind are reused; focus stays on the same item when it is still there, else on
     * the same place */
    set(shelf: Shelf): void {
        this.shelf = shelf;
        var was = this.focused;
        var items = shelf.items;
        var step = items.length ? tileWidth(items[0], this.card) : this.step;
        var restep = step !== this.step;
        setText(this.titleEl, shelf.title);
        this.items = items;
        this.step = step;
        this.cols = step ? Math.max(1, Math.floor((LAYOUT_WIDTH - 2 * MARGIN) / step)) : 1;
        for (var i = 0; i < this.tiles.length; i++) {
            var tile = this.tiles[i];
            if (tile && (i >= items.length || !tile.set(items[i]))) {
                this.drop(i);
            }
        }
        this.tiles.length = Math.min(this.tiles.length, items.length);
        var keep = was ? indexOf(items, was) : -1;
        var first = this.first;
        if (keep >= 0) {
            // The same item at the same column where it can be
            first = keep - (this.index - this.first);
            this.index = keep;
        }
        this.index = Math.max(0, Math.min(this.index, items.length - 1));
        if (restep) {
            // A new row, or another kind of tile: the strip is placed by the new step
            this.first = -1;
        }
        this.reveal(first);
    }

    /** More tiles after the last (the row's next page): the tiles there and focus stay as they are */
    append(items: Item[]): void {
        if (items.length) {
            this.items = this.items.concat(items);
            this.update();
        }
    }

    /** The tile after the last whole column (the last one Twitch's TV app draws) is one of the last distance tiles */
    nearEnd(distance: number): boolean {
        return this.first + this.cols >= this.items.length - distance;
    }

    /** Left/Right: false at the ends (nothing happens there) */
    move(delta: number): boolean {
        var to = this.index + delta;
        if (to < 0 || to >= this.items.length) {
            return false;
        }
        this.index = to;
        this.reveal(this.first);
        return true;
    }

    /** Focused row and focus shown (false: no tile shows focus, e.g. the menu has it). Its lifts keep their layers
     * while it is active, so a focus move only moves them */
    setActive(active: boolean): void {
        if (active !== this.active) {
            this.active = active;
            toggleClass(this.el, 'bt-row--active', active);
            this.update();
        }
    }

    /** drawn: on screen or about to be; pictures: asks its tiles' pictures (rows near the focus) */
    setDrawn(drawn: boolean, pictures: boolean): void {
        if (drawn !== this.drawn) {
            this.drawn = drawn;
            this.el.style.display = drawn ? '' : 'none';
        }
        if (pictures !== this.wantPictures || drawn) {
            this.wantPictures = pictures;
            this.update();
        }
    }

    /** Pictures wait while held; let go, the tiles near the view ask theirs */
    hold(held: boolean): void {
        if (held !== this.held) {
            this.held = held;
            this.update();
        }
    }

    /** The drawn tiles' pictures are in */
    loaded(): boolean {
        for (var i = 0; i < this.tiles.length; i++) {
            var tile = this.tiles[i];
            if (tile && i >= this.first && i < this.first + this.cols && !tile.loaded()) {
                return false;
            }
        }
        return true;
    }

    /** Keeps the focused tile in view from the tile at the left margin first, with no empty columns after the last
     * tile (a shorter fresh row); the strip moves only when that changes */
    private reveal(first: number): void {
        var to = Math.max(0, Math.min(first, this.index, this.items.length - this.cols), this.index - this.cols + 1);
        if (to !== this.first) {
            this.first = to;
            translate(this.strip, -to * this.step, 0);
        }
        this.update();
    }

    /** Builds, shows and hides the tiles near the view, asks or lets go their pictures, and moves the focus mark */
    private update(): void {
        var n = this.items.length;
        // Drawn: from the tile cut by the left edge to the one cut by the right edge (and the next on the focused row)
        var from = this.drawn ? Math.max(0, this.first - 1) : 0;
        var to = this.drawn ? Math.min(n, this.first + this.cols + (this.active ? 2 : 1)) : 0;
        // Pictures: the drawn tiles; on a row about to come into view, the ones it will show first
        var picFrom = this.drawn ? from : this.first;
        var picTo = !this.wantPictures ? picFrom : this.drawn ? to : Math.min(n, this.first + this.cols + 1);
        for (var i = 0; i < Math.max(this.tiles.length, to, picTo); i++) {
            var shown = i >= from && i < to;
            var pictures = i >= picFrom && i < picTo;
            var tile = shown || pictures ? this.tile(i) : this.tiles[i];
            if (tile) {
                tile.setShown(shown);
                // Held (hidden): no picture is asked, but ones no longer wanted go
                if (!this.held || !pictures) {
                    tile.pictures(pictures);
                }
            }
        }
        var want = this.active ? this.tiles[this.index] || null : null;
        if (want !== this.marked) {
            if (this.marked) {
                this.marked.setFocused(false);
            }
            if (want) {
                want.setFocused(true);
            }
            this.marked = want;
        }
    }

    /** Tile i, built (hidden) on first use */
    private tile(i: number): Tile {
        var tile = this.tiles[i];
        if (!tile) {
            tile = new Tile(this.items[i], this.card);
            tile.el.style.left = i * this.step + 'px';
            tile.el.style.width = tileWidth(this.items[i], this.card) + 'px';
            this.strip.appendChild(tile.el);
            this.tiles[i] = tile;
        }
        return tile;
    }

    private drop(i: number): void {
        var tile = this.tiles[i] as Tile;
        if (tile === this.marked) {
            this.marked = null;
        }
        this.strip.removeChild(tile.el);
        this.tiles[i] = undefined;
    }
}

/** Where an item with the same content id is in items (-1: gone) */
function indexOf(items: Item[], item: Item): number {
    var id = itemId(item);
    for (var i = 0; i < items.length; i++) {
        if (itemId(items[i]) === id) {
            return i;
        }
    }
    return -1;
}

/** A stable id for an item: the channel for a stream (a stream id changes on a restart), else its own */
export function itemId(item: Item): string {
    if (item.kind === 'stream') {
        return 's' + item.stream.channel.id;
    }
    if (item.kind === 'game') {
        return 'g' + item.game.id;
    }
    if (item.kind === 'video') {
        return 'v' + item.video.id;
    }
    if (item.kind === 'clip') {
        return 'c' + item.clip.slug;
    }
    return 'u' + item.channel.id;
}

/** Rows one above the other with the focused one at a fixed place (Twitch: its title at y 540 of 1080). The
 * container slides 0.1 s per row; the row above stays drawn (it slides back in under the hero) and two below (the
 * next is cut by the screen edge, the one after slides up into its place). */
export class RowStack {
    el: HTMLElement;
    rows: Row[] = [];
    index = 0;
    /** The card rows added from now on draw for offline channels (Following: Twitch's narrow one) */
    channelCard: ChannelCard = 'wide';
    private focused = false;
    private shown = true;
    /** Pictures for the focused row only */
    private narrow = false;
    /** Fresh shelves waiting for their row to leave sight, by row */
    private pending: { [row: number]: Shelf } = {};
    private slideTimer = 0;

    /** top: where the focused row's title sits */
    constructor(private top: number) {
        this.el = h('div', 'bt-rows');
    }

    get row(): Row | null {
        return this.rows[this.index] || null;
    }

    /** Appends a row per shelf */
    add(shelves: Shelf[]): void {
        for (var i = 0; i < shelves.length; i++) {
            var row = new Row(shelves[i], this.channelCard);
            row.hold(!this.shown);
            row.el.style.top = this.top + this.rows.length * ROW_STEP + 'px';
            this.el.appendChild(row.el);
            this.rows.push(row);
        }
        this.mark(false);
    }

    /** Row i gets fresh data: at once when it is out of sight, the screen is hidden or atOnce, else once it leaves
     * sight */
    replace(i: number, shelf: Shelf, atOnce?: boolean): void {
        if (atOnce || !this.shown || !this.inSight(i)) {
            delete this.pending[i];
            this.rows[i].set(shelf);
        } else {
            this.pending[i] = shelf;
        }
    }

    /** Takes away the rows from n on; focus on one of them moves to the last row left */
    cut(n: number): void {
        while (this.rows.length > n) {
            this.el.removeChild((this.rows.pop() as Row).el);
            delete this.pending[this.rows.length];
        }
        var to = Math.max(0, Math.min(this.index, this.rows.length - 1));
        if (to !== this.index) {
            this.index = to;
            translate(this.el, 0, -to * ROW_STEP);
        }
        this.mark(false);
    }

    /** No rows */
    clear(): void {
        clearTimeout(this.slideTimer);
        this.el.innerHTML = '';
        this.rows = [];
        this.pending = {};
        this.index = 0;
        translate(this.el, 0, 0);
    }

    /** Up/Down: false past the first or last row */
    move(delta: number): boolean {
        var to = this.index + delta;
        if (to < 0 || to >= this.rows.length) {
            return false;
        }
        this.index = to;
        translate(this.el, 0, -to * ROW_STEP);
        this.mark(true);
        return true;
    }

    setFocused(focused: boolean): void {
        if (focused !== this.focused) {
            this.focused = focused;
            this.mark(false);
        }
    }

    /** Hidden: fresh rows waiting are taken (texts only) and pictures wait; shown: their pictures are asked */
    setShown(shown: boolean): void {
        this.shown = shown;
        for (var i = 0; i < this.rows.length; i++) {
            this.rows[i].hold(!shown);
        }
        for (var key in this.pending) {
            this.replace(+key, this.pending[key]);
        }
    }

    /** Pictures for the focused row only (true), or for the rows near it */
    setNarrow(narrow: boolean): void {
        if (narrow !== this.narrow) {
            this.narrow = narrow;
            this.mark(false);
        }
    }

    /** In sight: the focused row and the one below it (the row above is under the hero) */
    inSight(i: number): boolean {
        var d = i - this.index;
        return d === 0 || d === 1;
    }

    /** The pictures of the rows in sight are in */
    loaded(): boolean {
        for (var i = this.index; i < this.index + 2 && i < this.rows.length; i++) {
            if (!this.rows[i].loaded()) {
                return false;
            }
        }
        return true;
    }

    /** Draws the rows near the focus, asks pictures a little further, lets far ones go, and gives rows that left
     * sight their fresh data. sliding: rows that become drawn below the screen wait for the slide to end (painting
     * them would stall it); they ask their pictures now */
    private mark(sliding: boolean): void {
        var waits = false;
        for (var i = 0; i < this.rows.length; i++) {
            var d = i - this.index;
            var row = this.rows[i];
            var drawn = d >= -1 && d <= 2;
            var wait = sliding && drawn && row.el.style.display === 'none' && this.top + d * ROW_STEP >= LAYOUT_HEIGHT;
            waits = waits || wait;
            row.setActive(d === 0 && this.focused);
            row.setDrawn(drawn && !wait, this.narrow ? d === 0 : d >= -2 && d <= 3);
            if (this.pending[i] && !this.inSight(i)) {
                this.replace(i, this.pending[i]);
            }
        }
        clearTimeout(this.slideTimer);
        if (waits) {
            var self = this;
            this.slideTimer = setTimeout(function () {
                self.mark(false);
            }, SLIDE_MS) as unknown as number;
        }
    }
}

/** Arrows and OK on rows as Home has them: Up/Down between rows (Up from the first row is the shell's: false), Left/Right
 * along the row, OK opens the focused tile; moved() after focus moved */
export function rowsKey(stack: RowStack, code: number, moved: () => void, open: (item: Item) => void): boolean {
    var row = stack.row;
    if (!row) {
        return false;
    }
    if (code === KEY.UP || code === KEY.DOWN) {
        if (stack.move(code === KEY.UP ? -1 : 1)) {
            moved();
            return true;
        }
        return code === KEY.DOWN;
    }
    if (code === KEY.LEFT || code === KEY.RIGHT) {
        if (row.move(code === KEY.LEFT ? -1 : 1)) {
            moved();
        }
        return true;
    }
    if (code === KEY.OK && row.focused) {
        open(row.focused);
        return true;
    }
    return false;
}

/** The tiles one step from the focused one: left, right, and the focused tiles of the rows above and below */
export function nearItems(stack: RowStack): Item[] {
    var row = stack.row;
    if (!row) {
        return [];
    }
    var above = stack.rows[stack.index - 1];
    var below = stack.rows[stack.index + 1];
    var near = [row.items[row.index - 1], row.items[row.index + 1], above && above.focused, below && below.focused];
    var out: Item[] = [];
    for (var i = 0; i < near.length; i++) {
        if (near[i]) {
            out.push(near[i] as Item);
        }
    }
    return out;
}
