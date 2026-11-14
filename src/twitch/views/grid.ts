// Twitch's grids: Browse's categories (8 per row) and a category page's live channels (4 per row), rows a fixed step
// apart, the focused row at the place the layout gives for its index, the grid sliding there by transform (0.1 s, as
// Twitch's). Focus walks within a row without wrapping; Down goes to the same column (or the last tile of a shorter
// last row). Tiles are built when their row first nears the view and then kept; only rows near the focus are drawn
// and ask their pictures, and rows that come into view during a slide are drawn before it, so it never stalls.

import { h, toggleClass, translate } from '../../core/dom.js';
import { KEY } from '../../core/keys.js';
import { Item } from '../api/types.js';
import { itemId } from './rows.js';
import { ChannelCard, Tile } from './tiles.js';

export interface GridLayout {
    cols: number;
    /** Step between tiles in a row and between rows */
    step: number;
    rowStep: number;
    /** Where the focused row's top sits on screen, by the row's index */
    focusTop(row: number): number;
}

/** Rows drawn above and below the focused one, and rows asking their pictures */
var DRAWN_ABOVE = 2;
var DRAWN_BELOW = 2;
var PICTURES_BELOW = 3;

export class Grid {
    el: HTMLElement;
    items: Item[] = [];
    /** The focused tile */
    index = 0;
    /** The cards its tiles are drawn as (the Favorites tab's; Twitch's own when not set) */
    card?: ChannelCard;
    private tiles: (Tile | undefined)[] = [];
    private rowEls: HTMLElement[] = [];
    private drawnRows: boolean[] = [];
    private focused = false;
    private marked: Tile | null = null;
    private activeRow = -1;
    private y = NaN;
    /** The rows the last update drew or asked pictures for: only those and the new ones are looked at */
    private from = 0;
    private to = 0;
    /** Pictures wait (the screen is hidden): texts change, pictures follow when it shows */
    private held = false;
    /** Pictures for the focused row only (a player over the screen) */
    private narrow = false;

    constructor(private layout: GridLayout) {
        this.el = h('div', 'bt-grid');
    }

    get focusedItem(): Item | null {
        return this.items[this.index] || null;
    }

    /** The focused tile, once built */
    get focusedTile(): Tile | null {
        return this.tiles[this.index] || null;
    }

    /** The focused row */
    get row(): number {
        return Math.floor(this.index / this.layout.cols);
    }

    get rowCount(): number {
        return Math.ceil(this.items.length / this.layout.cols);
    }

    /** Fresh items in place of all: tiles are reused, focus stays on the same item when it is still there, else at
     * the same place */
    set(items: Item[]): void {
        var was = this.focusedItem;
        this.items = items;
        for (var i = 0; i < this.tiles.length; i++) {
            var tile = this.tiles[i];
            if (tile && (i >= items.length || !tile.set(items[i]))) {
                this.drop(i);
            }
        }
        this.tiles.length = Math.min(this.tiles.length, items.length);
        while (this.rowEls.length > this.rowCount) {
            this.el.removeChild(this.rowEls.pop() as HTMLElement);
            this.drawnRows.pop();
        }
        var keep = was ? indexOf(items, was) : -1;
        this.index = Math.max(0, Math.min(keep >= 0 ? keep : this.index, items.length - 1));
        this.update();
    }

    /** More items at the end */
    append(items: Item[]): void {
        this.items = this.items.concat(items);
        this.update();
    }

    /** An arrow key: false where focus cannot go (the edges; Up from the first row is the screen's) */
    move(code: number): boolean {
        var cols = this.layout.cols;
        var n = this.items.length;
        var col = this.index % cols;
        var to = -1;
        if (code === KEY.LEFT) {
            to = col > 0 ? this.index - 1 : -1;
        } else if (code === KEY.RIGHT) {
            to = col < cols - 1 && this.index + 1 < n ? this.index + 1 : -1;
        } else if (code === KEY.UP) {
            to = this.index >= cols ? this.index - cols : -1;
        } else if (code === KEY.DOWN && this.row < this.rowCount - 1) {
            to = Math.min(this.index + cols, n - 1);
        }
        if (to < 0) {
            return false;
        }
        this.index = to;
        this.update();
        return true;
    }

    /** The layout's place for the focused row changed (what is above the grid moved): it slides there */
    place(): void {
        this.update();
    }

    /** Focus shown on a tile (false: elsewhere on the screen, or the menu has it) */
    setFocused(focused: boolean): void {
        if (focused !== this.focused) {
            this.focused = focused;
            this.update();
        }
    }

    /** Pictures for the focused row only (true), or for the rows near it */
    setNarrow(narrow: boolean): void {
        if (narrow !== this.narrow) {
            this.narrow = narrow;
            this.update();
        }
    }

    /** Hidden: pictures wait; shown: the tiles near the view ask theirs */
    hold(held: boolean): void {
        if (held !== this.held) {
            this.held = held;
            this.update();
        }
    }

    /** The pictures of the rows in view are in */
    loaded(): boolean {
        var cols = this.layout.cols;
        for (var r = Math.max(0, this.row - 1); r <= this.row + 1; r++) {
            for (var i = r * cols; i < (r + 1) * cols && i < this.tiles.length; i++) {
                var tile = this.tiles[i];
                if (tile && !tile.loaded()) {
                    return false;
                }
            }
        }
        return true;
    }

    /** Slides to the focused row, draws the rows near it, asks or lets go of pictures, and moves the focus mark */
    private update(): void {
        var layout = this.layout;
        var focusRow = this.row;
        var y = this.items.length ? layout.focusTop(focusRow) - focusRow * layout.rowStep : layout.focusTop(0);
        if (y !== this.y) {
            this.y = y;
            translate(this.el, 0, y);
        }
        var rows = this.rowCount;
        var from = Math.max(0, focusRow - DRAWN_ABOVE);
        var to = Math.min(rows, focusRow + PICTURES_BELOW + 1);
        var last = Math.min(Math.max(to, this.to), this.rowEls.length);
        for (var r = Math.min(from, this.from); r < Math.max(to, last); r++) {
            var d = r - focusRow;
            var drawn = r < rows && d >= -DRAWN_ABOVE && d <= DRAWN_BELOW;
            var pictures = this.narrow ? d === 0 && r < rows : r >= from && r < to;
            if (drawn || pictures || this.rowEls[r]) {
                this.updateRow(r, drawn, pictures);
            }
        }
        this.from = from;
        this.to = to;
        var active = this.focused && this.items.length ? focusRow : -1;
        if (active !== this.activeRow) {
            if (this.rowEls[this.activeRow]) {
                toggleClass(this.rowEls[this.activeRow], 'bt-row--active', false);
            }
            if (this.rowEls[active]) {
                toggleClass(this.rowEls[active], 'bt-row--active', true);
            }
            this.activeRow = active;
        }
        var want = this.focused ? this.tiles[this.index] || null : null;
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

    /** Row r drawn or not, its tiles built when it first nears the view, its pictures asked or let go */
    private updateRow(r: number, drawn: boolean, pictures: boolean): void {
        var el = this.rowEl(r);
        if (drawn !== this.drawnRows[r]) {
            this.drawnRows[r] = drawn;
            el.style.display = drawn ? '' : 'none';
        }
        var cols = this.layout.cols;
        for (var i = r * cols; i < (r + 1) * cols && i < Math.max(this.items.length, this.tiles.length); i++) {
            var tile = i < this.items.length && (drawn || pictures) ? this.tile(i, el) : this.tiles[i];
            // Held (hidden): no picture is asked, but ones no longer wanted go
            if (tile && (!this.held || !pictures)) {
                tile.pictures(pictures);
            }
        }
    }

    private rowEl(r: number): HTMLElement {
        while (this.rowEls.length <= r) {
            var el = h('div', 'bt-grid-row');
            el.style.top = this.rowEls.length * this.layout.rowStep + 'px';
            el.style.display = 'none';
            this.el.appendChild(el);
            this.rowEls.push(el);
            this.drawnRows.push(false);
        }
        return this.rowEls[r];
    }

    /** Tile i, built on first use in its row */
    private tile(i: number, rowEl: HTMLElement): Tile {
        var tile = this.tiles[i];
        if (!tile) {
            tile = new Tile(this.items[i], this.card);
            tile.el.style.left = (i % this.layout.cols) * this.layout.step + 'px';
            tile.el.style.width = this.layout.step + 'px';
            rowEl.appendChild(tile.el);
            this.tiles[i] = tile;
        }
        return tile;
    }

    private drop(i: number): void {
        var tile = this.tiles[i] as Tile;
        if (tile === this.marked) {
            this.marked = null;
        }
        if (tile.el.parentNode) {
            tile.el.parentNode.removeChild(tile.el);
        }
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
