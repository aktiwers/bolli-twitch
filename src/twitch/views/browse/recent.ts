// The recent searches, kept on this TV as Twitch's TV app keeps them: the last 10 terms, the newest first, a term
// searched again moved to the front.

import { load, save } from '../../../core/store.js';

var STORE_KEY = 'twitch.search.recent';
var MAX = 10;

export function recentSearches(): string[] {
    var list = load<string[]>(STORE_KEY);
    var out: string[] = [];
    for (var i = 0; list && Array.isArray(list) && i < list.length && out.length < MAX; i++) {
        if (typeof list[i] === 'string' && list[i]) {
            out.push(list[i]);
        }
    }
    return out;
}

export function keepSearch(term: string): void {
    var list = recentSearches().filter(function (t) { return t !== term; });
    list.unshift(term);
    save(STORE_KEY, list.slice(0, MAX));
}

export function clearSearches(): void {
    save(STORE_KEY, []);
}
