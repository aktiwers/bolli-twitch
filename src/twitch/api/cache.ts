// A small keyed cache of answers: an answer asked within `fresh` is taken as it is (also while it is still coming),
// the last one that came stays drawable for `keep` (a screen shows it at once while a fresh one is asked), a failed
// ask is forgotten, and at most `max` keys are kept (the one asked longest ago goes first). Entries past both times
// are pruned on every ask. Every cache is emptied by forgetCaches() (the shell calls it when the account changes:
// answers can hold the account's follow state and history).

interface Entry<T> {
    /** When it was asked (0: its ask failed, the next one asks again) */
    at: number;
    answer: Promise<T>;
    /** The last answer that came, and when */
    value: T | undefined;
    valueAt: number;
}

var all: Cache<unknown>[] = [];

export class Cache<T> {
    private entries: { [key: string]: Entry<T> } = {};
    /** Keys, the one asked last at the end */
    private order: string[] = [];

    constructor(private fresh: number, private keep: number, private max: number) {
        all.push(this as Cache<unknown>);
    }

    /** The answer for key: the one asked within `fresh`, else ask() now */
    get(key: string, ask: () => Promise<T>): Promise<T> {
        var now = Date.now();
        this.prune(now);
        var had = this.entries[key];
        if (had && had.at && now - had.at < this.fresh) {
            return had.answer;
        }
        var entry: Entry<T> = { at: now, answer: ask(), value: had ? had.value : undefined, valueAt: had ? had.valueAt : 0 };
        this.entries[key] = entry;
        this.touch(key);
        var self = this;
        entry.answer.then(function (value: T) {
            entry.value = value;
            entry.valueAt = Date.now();
        }, function () {
            if (self.entries[key] === entry) {
                entry.at = 0;
            }
        });
        return entry.answer;
    }

    /** Asks ahead; a failure is only forgotten */
    prefetch(key: string, ask: () => Promise<T>): Promise<unknown> {
        return this.get(key, ask).then(null, function () {
            return undefined;
        });
    }

    /** The last answer that came for key within `keep` */
    kept(key: string): T | undefined {
        var had = this.entries[key];
        return had && had.valueAt && Date.now() - had.valueAt < this.keep ? had.value : undefined;
    }

    clear(): void {
        this.entries = {};
        this.order = [];
    }

    /** Leaves forgetCaches() (a cache that went with its screen) */
    dispose(): void {
        this.clear();
        var i = all.indexOf(this as Cache<unknown>);
        if (i >= 0) {
            all.splice(i, 1);
        }
    }

    private touch(key: string): void {
        var i = this.order.indexOf(key);
        if (i >= 0) {
            this.order.splice(i, 1);
        }
        this.order.push(key);
        while (this.order.length > this.max) {
            delete this.entries[this.order.shift() as string];
        }
    }

    /** Drops entries neither fresh nor kept any more */
    private prune(now: number): void {
        for (var i = this.order.length - 1; i >= 0; i--) {
            var key = this.order[i];
            var e = this.entries[key];
            if (now - e.at >= this.fresh && now - e.valueAt >= this.keep) {
                delete this.entries[key];
                this.order.splice(i, 1);
            }
        }
    }
}

/** Empties every cache */
export function forgetCaches(): void {
    for (var i = 0; i < all.length; i++) {
        all[i].clear();
    }
}
