// A store's listeners (the follow states, the favorites, Twitch's answer about them): on() adds one and gives back the
// function that takes it off again, tell() calls each with what changed.

export class Listeners<A extends unknown[]> {
    private all: ((...args: A) => void)[] = [];

    /** How many listen */
    get count(): number {
        return this.all.length;
    }

    on(listener: (...args: A) => void): () => void {
        var all = this.all;
        all.push(listener);
        return function (): void {
            var i = all.indexOf(listener);
            if (i >= 0) {
                all.splice(i, 1);
            }
        };
    }

    /** Every listener there is now, also one that another takes off meanwhile */
    tell(...args: A): void {
        var all = this.all.slice();
        for (var i = 0; i < all.length; i++) {
            all[i].apply(null, args);
        }
    }
}
