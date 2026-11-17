// Watch History's tiles (api/history.ts) and its page. Each thing watched is a tile of a kind the app has already: a
// past broadcast part watched (watched to its end, or barely begun, it has none: its position is not kept) with its
// watched bar, resuming where it stopped; a channel watched live as its stream while it is live; once the stream
// ended, the broadcast's recording, at the place the viewer left the stream (the player keeps it as the recording's
// position); without a recording, or with nothing left of it, the offline card Favorites draws while one is moved
// (its avatar in the picture's place, when it was last live). Whether a channel is live comes from Twitch's answer
// about the history, else Favorites' about it. A tile shows once, where it was watched last (a recording also watched
// as a past broadcast). The Continue Watching row (at the top of Favorites) has them all, the newest first; the History
// page (in the menu, with Watch History on Own Page) has them in rows by day (Today, Yesterday, This Week, Earlier),
// then Recently Watched Channels: every channel watched, the newest first, as Favorites' round cards (a red ring while
// live; OK opens its page). The page is drawn from the list at once and again, at once also in sight, when the list or
// Twitch's answer changes: in place when its rows stay the same, else anew.

import { h, setShown } from '../../core/dom.js';
import { favoriteItem, favoriteStates, onFavoriteStates } from '../api/favorites-feed.js';
import { historyState, historyVideo, onHistory, refreshHistory, Watched, watched } from '../api/history.js';
import { Item, Shelf } from '../api/types.js';
import { Navigator, Screen } from './navigator.js';
import { resumeIdsVersion, watchedPart } from './player/resume.js';
import { Rest } from './rest.js';
import { rowsKey, RowStack } from './rows.js';
import { StateBox } from './state.js';

/** The focused row's title, under the menu (as Favorites) */
var FOCUS_TOP = 132;
/** Tiles in the Continue Watching row and in Recently Watched Channels */
var ROW_MAX = 20;
var CHANNELS_MAX = 30;
var DAY_MS = 24 * 3600 * 1000;

type ChannelItem = Extract<Item, { kind: 'channel' }>;

/** The start of the day of a time (ms) */
function dayOf(time: number): number {
    var day = new Date(time);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
}

/** One thing watched as its tile, or null (a past broadcast with nothing left to continue) */
export function historyItem(w: Watched): Item | null {
    if (w.video) {
        return watchedPart(w.video) > 0 ? { kind: 'video', video: w.video } : null;
    }
    var state = historyState(w.channel.id) || favoriteStates()[w.channel.id];
    if (state && state.stream) {
        return { kind: 'stream', stream: state.stream };
    }
    var recording = w.recording ? historyVideo(w.recording.id) : undefined;
    if (recording && watchedPart(recording) > 0) {
        return { kind: 'video', video: recording };
    }
    var ghost = favoriteItem(w.channel, state) as ChannelItem;
    ghost.ghost = true;
    return ghost;
}

/** On a row of Watch History's entries, the entry the tile stands for (none elsewhere) */
export function forgetKey(shelf: Shelf, item: Item): string {
    return shelf.forget ? historyKeyOf(item) : '';
}

/** The Watch History entry a tile stands for (api/history.ts keyOf) */
function historyKeyOf(item: Item): string {
    return item.kind === 'video' ? 'v' + item.video.id : item.kind === 'stream' ? 'c' + item.stream.channel.id :
        item.kind === 'channel' ? 'c' + item.channel.id : '';
}

/** Each thing watched as its tile, the newest first, each tile once (null: none for it, or shown already) */
function tiles(): (Item | null)[] {
    var seen: { [key: string]: boolean } = {};
    return watched().map(function (w: Watched) {
        var item = historyItem(w);
        var key = item ? historyKeyOf(item) : '';
        if (!item || seen[key]) {
            return null;
        }
        seen[key] = true;
        return item;
    });
}

/** Favorites' Continue Watching row, or null when nothing is there to continue */
export function continueRow(): Shelf | null {
    var items: Item[] = [];
    var all = tiles();
    for (var i = 0; i < all.length && items.length < ROW_MAX; i++) {
        if (all[i]) {
            items.push(all[i] as Item);
        }
    }
    return items.length ? { id: 'history', title: 'Continue Watching', items: items, forget: true } : null;
}

/** The History page's rows by day, each only when it has tiles */
export function historyDays(now: number): Shelf[] {
    var start = dayOf(now);
    var days: { id: string; title: string; from: number; items: Item[] }[] = [
        { id: 'history-today', title: 'Today', from: start, items: [] },
        { id: 'history-yesterday', title: 'Yesterday', from: start - DAY_MS, items: [] },
        { id: 'history-week', title: 'This Week', from: start - 6 * DAY_MS, items: [] },
        { id: 'history-earlier', title: 'Earlier', from: -Infinity, items: [] }
    ];
    var list = watched();
    var all = tiles();
    for (var i = 0; i < list.length; i++) {
        var item = all[i];
        for (var d = 0; item && d < days.length; d++) {
            if (list[i].at >= days[d].from) {
                days[d].items.push(item);
                break;
            }
        }
    }
    var shelves: Shelf[] = [];
    for (var k = 0; k < days.length; k++) {
        if (days[k].items.length) {
            shelves.push({ id: days[k].id, title: days[k].title, items: days[k].items, forget: true });
        }
    }
    return shelves;
}

/** Every channel watched, the newest first, as Favorites' round cards (none: no row) */
export function watchedChannels(): Shelf | null {
    var items: Item[] = [];
    var seen: { [id: string]: boolean } = {};
    var list = watched();
    for (var i = 0; i < list.length && items.length < CHANNELS_MAX; i++) {
        var id = list[i].channel.id;
        if (seen[id]) {
            continue;
        }
        seen[id] = true;
        var item = favoriteItem(list[i].channel, historyState(id) || favoriteStates()[id]);
        items.push(item);
    }
    return items.length ? { id: 'history-channels', title: 'Recently Watched Channels', items: items } : null;
}

export class HistoryView implements Screen {
    el: HTMLElement;
    stack: RowStack;
    private state = new StateBox('bt-state--page');
    private shown = false;
    private focused = false;
    private rest = new Rest();
    private ids = '';
    /** What the rows were drawn with: the videos kept (resumeIdsVersion), the day; the history or Favorites' answer
     * changed out of sight since (stale) */
    private drawnResume = -1;
    private drawnDay = 0;
    private stale = false;
    private unlisten: (() => void)[];

    constructor(private nav: Navigator) {
        this.el = h('div', 'bt-hist');
        this.stack = new RowStack(FOCUS_TOP);
        this.stack.channelCard = 'favorite';
        this.el.appendChild(h('div', 'bt-fav-rows')).appendChild(this.stack.el);
        this.el.appendChild(h('div', 'bt-fav-band'));
        this.el.appendChild(this.state.el);
        setShown(this.el, false);
        var self = this;
        // (out of sight, under a player: drawn as it shows)
        this.unlisten = [onHistory(function () {
            if (self.shown) {
                self.draw();
            } else {
                self.stale = true;
            }
        }), onFavoriteStates(function () {
            // (a channel's live state when the history's answer has none: drawn when the page shows next)
            self.stale = true;
        })];
        this.draw();
    }

    /** Nothing watched yet: focus stays on the menu */
    get menuFocus(): boolean {
        return !this.stack.rows.length;
    }

    show(): void {
        // Still out of sight, so the rows take it at once: a past broadcast watched meanwhile may have nothing left to
        // continue, a day may have passed. Only then: a draw costs ~90 ms on the TV
        if (this.stale || resumeIdsVersion() !== this.drawnResume || dayOf(Date.now()) !== this.drawnDay) {
            this.draw();
        }
        this.shown = true;
        setShown(this.el, true);
        this.stack.setNarrow(false);
        this.stack.setShown(true);
        refreshHistory();
    }

    hide(): void {
        this.shown = false;
        setShown(this.el, false);
        this.stack.setShown(false);
        this.rest.cancel();
    }

    /** Under a player: pictures for the focused row only */
    narrow(): void {
        this.stack.setNarrow(true);
    }

    destroy(): void {
        this.unlisten.forEach(function (off) { off(); });
        this.rest.cancel();
        this.stack.clear();
    }

    atTop(): boolean {
        return this.stack.index === 0;
    }

    setFocused(focused: boolean): void {
        this.focused = focused;
        this.stack.setFocused(focused);
        if (focused) {
            this.restSoon();
        } else {
            this.rest.cancel();
        }
    }

    retry(pressed?: boolean): boolean {
        // (back online: asked only for the page in sight; one out of sight asks as it shows)
        if (!pressed && this.shown) {
            refreshHistory();
        }
        return false;
    }

    /** Remove from History on the days' tiles (Recently Watched Channels has the channels of them all: none there) */
    historyKey(item: Item): string {
        var row = this.stack.row;
        return row ? forgetKey(row.shelf, item) : '';
    }

    onKey(code: number): boolean {
        var self = this;
        return rowsKey(this.stack, code, function () {
            self.restSoon();
        }, function (item: Item) {
            self.nav.open(item);
        });
    }

    /** The rows as the list has them: the same rows take their new tiles in place, other rows are built anew (focus
     * back on the first) */
    private draw(): void {
        var now = Date.now();
        this.stale = false;
        this.drawnResume = resumeIdsVersion();
        this.drawnDay = dayOf(now);
        var shelves = historyDays(now);
        var channels = watchedChannels();
        if (channels) {
            shelves.push(channels);
        }
        var ids = shelves.map(function (s) { return s.id; }).join(',');
        if (ids === this.ids) {
            for (var i = 0; i < shelves.length; i++) {
                this.stack.replace(i, shelves[i], true);
            }
        } else {
            this.ids = ids;
            this.stack.clear();
            this.stack.add(shelves);
            this.stack.setFocused(this.focused);
        }
        if (shelves.length) {
            this.state.hide();
        } else {
            this.state.show('Nothing watched yet', 'Streams and past broadcasts you watch show here, newest first.', false);
        }
        if (this.shown && this.focused) {
            this.restSoon();
        }
    }

    /** Once focus rests on a tile: what it opens, fetched ahead */
    private restSoon(): void {
        var row = this.stack.row;
        this.rest.item(row ? row.focused : null, this.nav.ahead);
    }
}
