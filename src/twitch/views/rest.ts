// Focus resting on something a screen could open next: after a wait (a held key passes many tiles without one), what
// opening it needs is fetched ahead, so OK draws or plays at once. One fetch per screen at a time: a newer one waits
// for the one in flight, and an older one still waiting is dropped. A playback started ahead for a tile stops when
// focus leaves it or its screen hides, unless OK claimed it.

import { Item } from '../api/types.js';
import { unready } from '../player/session.js';

/** The wait before a stream, video or channel is fetched; a category's page and a search ask more and wait longer */
export var REST_MS = 600;
export var REST_LONG_MS = 900;
var restMs = REST_MS;

/** The test hook's: the wait before a stream, video or channel is fetched, for this run (0: the default) */
export function setRestMs(ms: number): void {
    restMs = ms > 0 ? ms : REST_MS;
}

/** What fetches an item's screen ahead (a stream's playback, a channel's page, a category's first channels) */
export type Ahead = (item: Item) => Promise<unknown> | void;

export class Rest {
    private timer = 0;
    private flying = false;
    private queued: (() => Promise<unknown> | void) | null = null;
    private focused: Item | null = null;

    /** After ms with no other call, fetch(): something that is not a tile (focus left the one it was on) */
    after(ms: number, fetch: () => Promise<unknown> | void): void {
        this.focus(null);
        this.wait(ms, fetch);
    }

    private wait(ms: number, fetch: () => Promise<unknown> | void): void {
        clearTimeout(this.timer);
        var self = this;
        this.timer = setTimeout(function () {
            self.timer = 0;
            self.run(fetch);
        }, ms) as unknown as number;
    }

    /** Focus rests on item: ahead(item) after its kind's wait */
    item(item: Item | null, ahead: Ahead): void {
        this.focus(item);
        if (!item) {
            this.cancel();
            return;
        }
        this.wait(item.kind === 'game' ? REST_LONG_MS : restMs, function () {
            return ahead(item);
        });
    }

    /** Focus moved to item (null: off the tiles): what waits for the last one is dropped, its playback ahead stops */
    private focus(item: Item | null): void {
        if (item !== this.focused) {
            this.focused = item;
            this.queued = null;
            unready();
        }
    }

    /** Nothing waits any more (focus left, the screen hid) */
    cancel(): void {
        clearTimeout(this.timer);
        this.timer = 0;
        this.queued = null;
        this.focused = null;
        unready();
    }

    private run(fetch: () => Promise<unknown> | void): void {
        if (this.flying) {
            this.queued = fetch;
            return;
        }
        var answer = fetch();
        if (!answer || typeof answer.then !== 'function') {
            return;
        }
        this.flying = true;
        var self = this;
        var landed = function (): void {
            self.flying = false;
            var next = self.queued;
            self.queued = null;
            if (next) {
                self.run(next);
            }
        };
        answer.then(landed, landed);
    }
}
