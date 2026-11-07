// Search. Its top is Twitch's TV app's Search page: the purple magnifier, "Find your favorite category or channel:",
// the field and the Search button. Under it, instead of the TV's own keyboard, Bolli's on-screen keyboard (letters,
// digits, a few signs, Space, Delete, Clear and Search) and beside it Twitch's "Recent Searches:" list, which shows
// Twitch's suggestions while text is typed (asked once typing pauses). OK on a term, Search or a recent search shows
// the results in place, as Twitch's results page draws them: the focused tile's picture across the top, "Showing
// results for:" and the term, and the rows Channels (live ones as stream tiles, offline ones as channel tiles),
// People searching for "x" also watch, Games and Past Videos. OK on a suggested category or channel opens it. Back on
// the results returns to the keyboard with the text still there, and the same term searched again shows its rows as
// they were; the section is kept, so the last search is still there when Search is chosen again. The typed text's
// results are fetched ahead once focus rests on what would search it, and kept a while. OK that changes the page in
// place (results, the list cleared) has its held repeats ignored until it is released, and suggestions arriving
// while focus is in the list leave it on its row.

import { h, setShown, setText, toggleClass } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { Keyboard } from '../../../ui/keyboard.js';
import { Cache } from '../../api/cache.js';
import { addShelf } from '../../api/parse.js';
import { search, SearchResults } from '../../api/search.js';
import { Suggestion, suggestions } from '../../api/suggest.js';
import { Item, Shelf } from '../../api/types.js';
import { holdOk } from '../held-ok.js';
import { Hero, heroOf } from '../hero.js';
import { Navigator, Screen } from '../navigator.js';
import { Rest, REST_LONG_MS } from '../rest.js';
import { nearItems, rowsKey, RowStack } from '../rows.js';
import { StateBox } from '../state.js';
import { gameItem, streamItem, videoItem } from '../tiles.js';
import { browseIcon } from './icons.js';
import { clearSearches, keepSearch, recentSearches } from './recent.js';
import { SearchList } from './search-list.js';

/** The keyboard's lines (special keys by their labels): Space spans 6 keys, Clear and Search 2 */
var LABELS = { space: 'Space', del: 'Delete', clear: 'Clear', enter: 'Search', spaceUnits: 6 };
var LINES = [
    'abcdefghij'.split(''),
    'klmnopqrst'.split(''),
    'uvwxyz\'-_'.split('').concat(['Delete']),
    '1234567890'.split(''),
    ['Space', 'Clear', 'Search']
];
/** Suggestions are asked once typing pauses this long */
var SUGGEST_MS = 250;
/** Suggestions shown under the typed text */
var SUGGESTIONS_MAX = 7;
/** Focus resting this long in the results fetches the top pictures one step away */
var PICTURES_MS = 200;
/** Results kept, and for how long */
var KEPT_MAX = 4;
var KEPT_MS = 2 * 60 * 1000;
/** The results' focused row title at y 540 of 1080 */
var FOCUS_TOP = 360;

/** Where focus is on the keyboard page: the keyboard, the list beside it, the Search button */
type Place = 'keys' | 'list' | 'go';

export interface SearchDeps {
    search(term: string): Promise<SearchResults>;
    suggest(text: string): Promise<Suggestion[]>;
}

var DEPS: SearchDeps = { search: search, suggest: suggestions };

export class SearchView implements Screen {
    el: HTMLElement;
    keyboard: Keyboard;
    list = new SearchList();
    hero = new Hero();
    stack = new RowStack(FOCUS_TOP);
    private input: HTMLElement;
    private results: HTMLElement;
    private field: HTMLElement;
    private fieldText: HTMLElement;
    private go: HTMLElement;
    private head: HTMLElement;
    private termEl: HTMLElement;
    private labelEl: HTMLElement;
    private state = new StateBox('bt-state--search');
    private place: Place = 'keys';
    private focused = false;
    private shown = true;
    /** The term whose results show ('' for the keyboard page) */
    private term = '';
    /** The term the rows were made for (kept after Back) */
    private rowsTerm = '';
    private failed = false;
    /** Suggestions last shown, for the text they answered */
    private suggested: Suggestion[] = [];
    private suggestTimer = 0;
    private restTimer = 0;
    /** Focus resting on what OK would open or search: fetched ahead */
    private rest = new Rest();
    /** Asks made, so a late answer for older text or another term is dropped */
    private suggestAsked = 0;
    private searchAsked = 0;
    private kept = new Cache<SearchResults>(KEPT_MS, KEPT_MS, KEPT_MAX);

    constructor(private nav: Navigator, private deps: SearchDeps = DEPS) {
        var self = this;
        this.el = h('div', 'bt-search');
        this.input = this.el.appendChild(h('div', 'bt-search-input')) as HTMLElement;
        this.input.appendChild(browseIcon('searchPage', 'bt-search-icon'));
        this.input.appendChild(h('div', 'bt-search-heading', 'Find your favorite category or channel:'));
        this.field = this.input.appendChild(h('div', 'bt-search-field')) as HTMLElement;
        this.fieldText = this.field.appendChild(h('span', 'bt-search-text')) as HTMLElement;
        this.go = this.input.appendChild(h('div', 'bt-button bt-search-go', 'Search')) as HTMLElement;
        this.keyboard = new Keyboard(LABELS, function (text: string) {
            self.changed(text);
        }, LINES);
        this.keyboard.onEnter = function () {
            self.submit(self.keyboard.text);
        };
        var del = this.keyboard.keyEl('Delete') as HTMLElement;
        // Delete shows Twitch's erase arrow (its label stays for the keyboard)
        del.style.fontSize = '0';
        del.appendChild(browseIcon('erase', 'bt-key-icon'));
        var keys = this.input.appendChild(h('div', 'bt-search-keys')) as HTMLElement;
        keys.appendChild(this.keyboard.el);
        this.input.appendChild(this.list.el);

        this.results = this.el.appendChild(h('div', 'bt-results')) as HTMLElement;
        this.results.appendChild(this.stack.el);
        this.results.appendChild(h('div', 'bt-home-fade'));
        this.results.appendChild(this.hero.el);
        this.head = this.results.appendChild(h('div', 'bt-results-head')) as HTMLElement;
        this.labelEl = this.head.appendChild(h('div', 'bt-results-label')) as HTMLElement;
        this.termEl = this.head.appendChild(h('div', 'bt-results-term')) as HTMLElement;
        this.results.appendChild(this.state.el);
        setShown(this.results, false);
        this.stack.setShown(false);
        this.showText('');
        this.showList();
    }

    show(): void {
        this.shown = true;
        setShown(this.el, true);
        this.stack.setNarrow(false);
        this.stack.setShown(!!this.term);
        if (this.term) {
            // A picture change still waiting when it hid is dropped: the focused tile's now
            this.showHero(true);
        } else if (!this.keyboard.text) {
            this.showList();
        }
        this.mark();
    }

    hide(): void {
        this.shown = false;
        clearTimeout(this.restTimer);
        this.rest.cancel();
        this.hero.pause();
        setShown(this.el, false);
        this.stack.setShown(false);
    }

    /** Under a player: pictures for the focused row only */
    narrow(): void {
        this.stack.setNarrow(true);
    }

    destroy(): void {
        clearTimeout(this.restTimer);
        this.rest.cancel();
        clearTimeout(this.suggestTimer);
        this.suggestAsked++;
        this.searchAsked++;
        this.hero.pause();
        this.stack.clear();
        this.kept.dispose();
    }

    atTop(): boolean {
        return this.term ? this.stack.index === 0 : this.place === 'go';
    }

    setFocused(focused: boolean): void {
        this.focused = focused;
        if (!focused) {
            clearTimeout(this.restTimer);
            this.rest.cancel();
        }
        this.mark();
    }

    /** OK on Try Again: the results asked again */
    retry(): boolean {
        if (!this.term || !this.failed) {
            return false;
        }
        this.ask(this.term);
        return true;
    }

    onKey(code: number): boolean {
        var used = this.term ? this.resultsKey(code) : this.inputKey(code);
        this.restSoon();
        return used;
    }

    /** The keyboard page's keys: the keyboard, the list beside it and the Search button over them */
    private inputKey(code: number): boolean {
        if (this.keyboard.typeDigit(code)) {
            return true;
        }
        var place = this.place;
        if (place === 'go') {
            if (code === KEY.DOWN) {
                this.to('keys');
            } else if (code === KEY.OK) {
                this.submit(this.keyboard.text);
            } else {
                return code === KEY.LEFT || code === KEY.RIGHT;
            }
            return true;
        }
        if (place === 'list') {
            if (code === KEY.UP || code === KEY.DOWN) {
                if (!this.list.move(code === KEY.UP ? -1 : 1) && code === KEY.UP) {
                    this.to('go');
                }
            } else if (code === KEY.LEFT) {
                this.to('keys');
            } else if (code === KEY.OK) {
                this.pick(this.list.focusedRow);
            } else {
                return code === KEY.RIGHT;
            }
            return true;
        }
        var kb = this.keyboard;
        if (code === KEY.LEFT && kb.atLeftEdge) {
            return true;
        }
        if (code === KEY.RIGHT && atRightEdge(kb.focusedLabel)) {
            if (this.list.rows.length) {
                this.to('list');
            }
            return true;
        }
        if (kb.onKey(code)) {
            return true;
        }
        if (code === KEY.UP) {
            this.to('go');
        }
        return code === KEY.UP || code === KEY.DOWN;
    }

    /** The results' keys: rows as on Home; Back returns to the keyboard page */
    private resultsKey(code: number): boolean {
        if (code === KEY.BACK) {
            this.closeResults();
            return true;
        }
        var self = this;
        return rowsKey(this.stack, code, function () {
            self.showHero();
        }, function (item: Item) {
            self.nav.open(item);
        }) || (!this.stack.row && code !== KEY.UP);
    }

    private to(place: Place): void {
        this.place = place;
        this.mark();
    }

    /** OK on a row of the list */
    private pick(row: Suggestion | null): void {
        if (!row) {
            return;
        }
        var opens = listItem(row);
        if (row.kind === 'clear') {
            // Focus goes to the keyboard, where a repeat would type
            holdOk();
            clearSearches();
            this.showList();
            this.to('keys');
        } else if (opens) {
            this.nav.open(opens);
        } else {
            this.submit(row.text);
        }
    }

    /** The text changed: the field, then the list (old suggestions that still fit at once, Twitch's once typing
     * pauses) */
    private changed(text: string): void {
        this.showText(text);
        clearTimeout(this.suggestTimer);
        var asked = ++this.suggestAsked;
        var typed = text.trim();
        if (!typed) {
            this.suggested = [];
            this.showList();
            return;
        }
        this.showSuggestions(typed, this.suggested, false);
        var self = this;
        this.suggestTimer = setTimeout(function () {
            self.deps.suggest(typed).then(function (list: Suggestion[]) {
                if (asked === self.suggestAsked) {
                    self.suggested = list;
                    self.showSuggestions(typed, list, true);
                }
            }, function () {
                return undefined;
            });
        }, SUGGEST_MS) as unknown as number;
    }

    /** The field: the text with the caret after it (its end kept in view by the field's CSS), or Twitch's
     * placeholder */
    private showText(text: string): void {
        setText(this.fieldText, text || 'Search Twitch...');
        toggleClass(this.field, 'bt-search-field--empty', !text);
    }

    /** Nothing typed: Twitch's recent searches, with Clear Recent Searches after them */
    private showList(): void {
        var recent = recentSearches();
        var rows: Suggestion[] = recent.map(function (term: string): Suggestion {
            return { kind: 'recent', text: term, start: 0, end: 0, picture: '' };
        });
        if (rows.length) {
            rows.push({ kind: 'clear', text: 'Clear Recent Searches', start: 0, end: 0, picture: '' });
        }
        this.list.set(rows.length ? 'Recent Searches:' : '', rows, this.place === 'list');
        this.leaveEmptyList();
    }

    /** The typed text first, then the suggestions (a term the same as the typed text shows once). fresh: Twitch's
     * answer for this text, marked as Twitch marks it; else an older answer, of which only what still holds the
     * typed text shows, marked anew */
    private showSuggestions(typed: string, list: Suggestion[], fresh: boolean): void {
        var low = typed.toLowerCase();
        var rows: Suggestion[] = [{ kind: 'term', text: typed, start: 0, end: typed.length, picture: '' }];
        for (var i = 0; i < list.length && rows.length <= SUGGESTIONS_MAX; i++) {
            var s = list[i];
            var at = s.text.toLowerCase().indexOf(low);
            if ((s.kind === 'term' && s.text.toLowerCase() === low) || (!fresh && at < 0)) {
                continue;
            }
            rows.push(fresh ? s : {
                kind: s.kind, text: s.text, start: at, end: at + typed.length, picture: s.picture, game: s.game, channel: s.channel, live: s.live
            });
        }
        this.list.set('', rows, this.place === 'list');
        this.leaveEmptyList();
    }

    /** Focus on a list that went empty goes to the keyboard */
    private leaveEmptyList(): void {
        if (this.place === 'list' && !this.list.rows.length) {
            this.place = 'keys';
        }
        this.mark();
    }

    /** OK on what searches: the term's results in place of the keyboard page (the same term's rows as they were
     * while its answer is kept) */
    private submit(text: string): void {
        var term = text.trim();
        if (!term) {
            return;
        }
        // The results take the keyboard's place: a repeat would open their first tile
        holdOk();
        keepSearch(term);
        this.term = term;
        setShown(this.input, false);
        setShown(this.results, true);
        setText(this.labelEl, 'Showing results for: ' + term);
        setText(this.termEl, term);
        var same = term.toLowerCase() === this.rowsTerm.toLowerCase() && this.stack.rows.length > 0 &&
            this.kept.kept(term.toLowerCase()) !== undefined;
        if (same) {
            this.stack.setShown(this.shown);
            this.showHero();
        } else {
            this.rowsTerm = term;
            this.stack.clear();
            this.stack.setShown(this.shown);
            this.hero.hide();
            this.ask(term);
        }
        this.mark();
    }

    private ask(term: string): void {
        var asked = ++this.searchAsked;
        this.failed = false;
        this.showState('', false);
        var self = this;
        this.answer(term).then(function (r: SearchResults) {
            if (asked === self.searchAsked) {
                self.showResults(term, r);
            }
        }, function () {
            if (asked === self.searchAsked) {
                self.failed = true;
                self.showState('Something went wrong', true);
            }
        });
    }

    private showResults(term: string, r: SearchResults): void {
        var shelves: Shelf[] = [];
        addShelf(shelves, 'channels', 'Channels', r.channels);
        addShelf(shelves, 'related', 'People searching for "' + term + '" also watch', r.related.map(streamItem));
        addShelf(shelves, 'games', 'Games', r.games.map(gameItem));
        addShelf(shelves, 'videos', 'Past Videos', r.videos.map(videoItem));
        this.stack.add(shelves);
        if (!shelves.length) {
            this.showState('No results found for: ' + term + '.', false);
        }
        this.showHero();
        this.mark();
    }

    /** Twitch's heading in place of the results' head ('' for none: the head) */
    private showState(title: string, failed: boolean): void {
        if (title) {
            this.state.show(title, '', failed);
        } else {
            this.state.hide();
        }
        setShown(this.head, !title);
        this.mark();
    }

    /** Back on the results: the keyboard page as it was (the rows kept for the same term) */
    private closeResults(): void {
        this.searchAsked++;
        this.term = '';
        this.failed = false;
        this.hero.hide();
        this.stack.setShown(false);
        setShown(this.results, false);
        this.state.hide();
        setShown(this.input, true);
        if (!this.keyboard.text) {
            this.showList();
        }
        this.mark();
    }

    private showHero(atOnce?: boolean): void {
        var row = this.stack.row;
        var item = row ? row.focused : null;
        if (item) {
            this.hero.show(heroOf(item), atOnce);
        } else {
            this.hero.hide();
        }
    }

    /** A term's results: kept ones while fresh, else asked (and kept; a failed answer is not) */
    private answer(term: string): Promise<SearchResults> {
        var deps = this.deps;
        return this.kept.get(term.toLowerCase(), function () {
            return deps.search(term);
        });
    }

    /** Once focus rests: in the results the top pictures one step away and what the tile opens; on the keyboard
     * page a suggested category's or channel's page, or the typed text's results where OK would search it */
    private restSoon(): void {
        clearTimeout(this.restTimer);
        if (!this.shown || !this.focused) {
            this.rest.cancel();
            return;
        }
        var self = this;
        if (this.term) {
            this.restTimer = setTimeout(function () {
                self.hero.prefetch(nearItems(self.stack).map(heroOf));
            }, PICTURES_MS) as unknown as number;
            var row = this.stack.row;
            this.rest.item(row ? row.focused : null, this.nav.ahead);
            return;
        }
        var picked = this.place === 'list' ? this.list.focusedRow : null;
        var opens = picked ? listItem(picked) : null;
        var text = this.keyboard.text.trim();
        var searches = this.place === 'go' || (this.place === 'keys' && this.keyboard.focusedLabel === LABELS.enter) ||
            (!!picked && picked.kind === 'term' && this.list.index === 0);
        if (opens) {
            this.rest.item(opens, this.nav.ahead);
        } else if (searches && text) {
            this.rest.after(REST_LONG_MS, function () {
                return self.answer(text).then(null, function () {
                    return undefined;
                });
            });
        } else {
            this.rest.cancel();
        }
    }

    private mark(): void {
        var on = this.focused;
        var place = this.term ? 'rows' : this.place;
        this.keyboard.setFocused(on && place === 'keys');
        this.list.setFocused(on && place === 'list');
        toggleClass(this.go, 'bt-focused', on && place === 'go');
        toggleClass(this.field, 'bt-search-field--typing', on && place === 'keys');
        this.stack.setFocused(on && place === 'rows');
        this.state.setFocused(on && place === 'rows');
    }
}

/** The key is the last of its line (Right would wrap to the first) */
function atRightEdge(label: string): boolean {
    for (var i = 0; i < LINES.length; i++) {
        if (LINES[i][LINES[i].length - 1] === label) {
            return true;
        }
    }
    return false;
}

/** What OK on a suggested category or channel opens (null for the rest) */
function listItem(row: Suggestion): Item | null {
    if (row.kind === 'game' && row.game) {
        return { kind: 'game', game: row.game };
    }
    if (row.kind === 'channel' && row.channel) {
        return { kind: 'channel', channel: row.channel, live: !!row.live };
    }
    return null;
}
