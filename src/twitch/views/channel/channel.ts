// A channel's page as Twitch's TV app lays it out: the header band (round avatar, LIVE NOW or OFFLINE, the name,
// followers, "About <name>:" and the description in at most four lines, Follow and Report), the preview box at the
// right with Watch Live (offline: Watch Latest Video) under it, and the channel's rows below (Twitch's own, in its
// order and words). Focus starts on Follow. In the header Left/Right walk the buttons, Down goes to the first row and
// Up to the menu's Go Back; in the rows Up from the first one goes back to the header button it came from. Focus in
// the rows shrinks the header to the avatar and the three lines (the rest fades out in .25 s, the rows move up after
// .1 s) and keeps the focused row's title at y 300; going back up grows it again in .2 s.
// Unlike Twitch's app the page stays alive under what it opens: Back from a player finds the tile or button that was
// opened, still focused (Twitch's app loads the page anew, focus on Follow), and the preview goes on playing into the
// full-screen player of the same target and back (the session hands it over); under a page that plays nothing it
// pauses. The header draws at once from what the opener knows; a page asked ahead or kept from a visit in the last
// minutes draws whole at once, a fresh copy put in behind it. Every return to the page asks it again (within the
// minute the answer is the one there), and so does the live preview failing, so a stream that ended or started
// shows as it is; a stream gated or gone stops playing in the box.

import { h, setShown, setText, toggleClass, translate } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { ChannelPage } from '../../api/channel.js';
import { GqlError } from '../../api/gql.js';
import { avatarAt } from '../../api/pictures.js';
import { Channel, Item, Shelf } from '../../api/types.js';
import { keyOf, Target } from '../../player/session.js';
import { Confirm } from '../confirm.js';
import { Follow } from '../follow.js';
import { playIcon, reportIcon } from '../icons.js';
import { Navigator, Screen } from '../navigator.js';
import { Backoff } from '../pager.js';
import { QrPage, reportChannel } from '../qr.js';
import { Rest } from '../rest.js';
import { RowStack } from '../rows.js';
import { StateBox } from '../state.js';
import { count, setSource, streamItem, videoItem } from '../tiles.js';
import { askPage, keptPage, PageLoader } from './data.js';
import { Preview, PreviewPlayer } from './preview.js';

/** The focused row's title (450 of 1080), and how much lower the rows sit while the header is whole (684) */
var FOCUS_TOP = 300;
var HEADER_DROP = 156;
var ROW_STEP = 294;

/** What the page needs from the app (the tests give fakes) */
export interface ChannelDeps {
    load: PageLoader;
    player: PreviewPlayer;
}

type ChannelItem = Extract<Item, { kind: 'channel' }>;

interface Button {
    el: HTMLElement;
    label: HTMLElement;
}

export class ChannelView implements Screen {
    el: HTMLElement;
    private channel: Channel;
    private page: ChannelPage | null = null;
    private stack: RowStack;
    private rowsEl: HTMLElement;
    private avatar: HTMLImageElement;
    private status: HTMLElement;
    private name: HTMLElement;
    private followers: HTMLElement;
    private more: HTMLElement;
    private aboutTitle: HTMLElement;
    private about: HTMLElement;
    private follow: Follow;
    private reportButton: Button;
    private watchButton: Button;
    private preview: Preview;
    private state = new StateBox('bt-state--channel');
    private confirm = new Confirm();
    /** Focus: in the header (on buttons()[button]) or in the rows */
    private inRows = false;
    private button = 0;
    private focused = true;
    private shown = false;
    /** Shown before: a show after the first asks the page again */
    private seen = false;
    private gone = false;
    private failed = false;
    private backoff: Backoff;
    /** Focus resting on a tile or Watch: what it opens fetched ahead */
    private rest = new Rest();

    constructor(item: ChannelItem, private nav: Navigator, private deps: ChannelDeps) {
        this.channel = item.channel;
        this.el = h('div', 'bt-ch');
        // Under the rows: the preview's lower part, covered while the rows have focus
        this.el.appendChild(h('div', 'bt-ch-veil'));
        this.rowsEl = this.el.appendChild(h('div', 'bt-ch-rows')) as HTMLElement;
        this.stack = new RowStack(FOCUS_TOP);
        this.rowsEl.appendChild(this.stack.el);
        // Over the row under the focused one: it does not slide with the rows (they slide under it)
        this.rowsEl.appendChild(h('div', 'bt-ch-fade')).style.top = FOCUS_TOP + ROW_STEP + 'px';
        this.rowsEl.appendChild(this.state.el);
        // Over the rows: the band the rows above slide under, then the header
        this.el.appendChild(h('div', 'bt-ch-band'));
        var head = this.el.appendChild(h('div', 'bt-ch-head')) as HTMLElement;
        this.avatar = head.appendChild(h('img', 'bt-ch-avatar')) as HTMLImageElement;
        this.status = head.appendChild(h('div', 'bt-ch-status')) as HTMLElement;
        this.name = head.appendChild(h('div', 'bt-ch-name')) as HTMLElement;
        this.followers = head.appendChild(h('div', 'bt-ch-followers')) as HTMLElement;
        this.more = head.appendChild(h('div', 'bt-ch-more')) as HTMLElement;
        this.aboutTitle = this.more.appendChild(h('div', 'bt-ch-about-title')) as HTMLElement;
        this.about = this.more.appendChild(h('div', 'bt-ch-about')) as HTMLElement;
        var buttons = this.more.appendChild(h('div', 'bt-ch-buttons')) as HTMLElement;
        this.follow = new Follow('bt-ch-button', nav, this.confirm);
        buttons.appendChild(this.follow.el);
        this.reportButton = makeButton(buttons, 'Report', reportIcon());
        var self = this;
        this.preview = new Preview(deps.player, function (target: Target) {
            // The stream may have ended: the page as it is now
            if (target.kind === 'live' && !self.gone) {
                self.ask();
            }
        });
        this.more.appendChild(this.preview.el);
        this.watchButton = makeButton(this.more, 'Watch Live', playIcon());
        this.watchButton.el.className += ' bt-ch-watch';
        setShown(this.more, false);
        this.el.appendChild(this.confirm.el);
        this.backoff = new Backoff(function () {
            self.ask();
        });
        this.drawChannel(item.live);
        translate(this.rowsEl, 0, HEADER_DROP);
        this.mark();
        var kept = keptPage(this.channel.login);
        if (kept) {
            this.fill(kept);
        }
        this.ask();
    }

    show(): void {
        this.shown = true;
        setShown(this.el, true);
        this.stack.setNarrow(false);
        this.stack.setShown(true);
        this.preview.start();
        // Back from what it opened (a player that played until the stream ended): asked again
        if (this.seen) {
            this.ask();
        }
        this.seen = true;
    }

    /** Under a player: pictures for the focused row only */
    narrow(): void {
        this.stack.setNarrow(true);
    }

    hide(): void {
        this.shown = false;
        setShown(this.el, false);
        this.stack.setShown(false);
        this.rest.cancel();
        this.preview.leave();
    }

    destroy(): void {
        this.gone = true;
        this.backoff.cancel();
        this.follow.destroy();
        this.rest.cancel();
        this.preview.drop();
        this.stack.clear();
    }

    /** This channel's page (the player's avatar over it goes back to it) */
    shows(item: Item): boolean {
        return item.kind === 'channel' && item.channel.login.toLowerCase() === this.channel.login.toLowerCase();
    }

    atTop(): boolean {
        return !this.inRows && !this.confirm.open;
    }

    setFocused(focused: boolean): void {
        this.focused = focused;
        this.mark();
    }

    /** OK on Try Again (no page at all), or the network back: also a kept copy waiting to be asked again */
    retry(pressed?: boolean): boolean {
        if (this.gone) {
            return false;
        }
        var failed = this.failed;
        if (failed || (!pressed && this.backoff.waiting)) {
            this.backoff.now();
        }
        return failed;
    }

    onKey(code: number): boolean {
        if (this.confirm.open) {
            var used = this.confirm.onKey(code);
            this.mark();
            return used;
        }
        if (this.inRows) {
            return this.rowKey(code);
        }
        var buttons = this.buttons();
        if (code === KEY.LEFT || code === KEY.RIGHT) {
            var to = this.button + (code === KEY.LEFT ? -1 : 1);
            if (to >= 0 && to < buttons.length) {
                this.button = to;
                this.mark();
                this.restSoon();
            }
            return true;
        }
        if (code === KEY.DOWN) {
            if (this.stack.rows.length) {
                this.setRows(true);
            }
            return true;
        }
        if (code === KEY.OK) {
            this.press(buttons[this.button]);
            // Unfollow's question may have opened: no button shows focus under it
            this.mark();
            return true;
        }
        return false;
    }

    /** The account changed: its follow state is asked again with the page */
    accountChanged(): void {
        this.ask();
    }

    private rowKey(code: number): boolean {
        var stack = this.stack;
        var row = stack.row;
        if (!row) {
            return false;
        }
        if (code === KEY.UP || code === KEY.DOWN) {
            if (code === KEY.UP && stack.index === 0) {
                this.setRows(false);
            } else if (stack.move(code === KEY.UP ? -1 : 1)) {
                this.restSoon();
            }
            return true;
        }
        if (code === KEY.LEFT || code === KEY.RIGHT) {
            if (row.move(code === KEY.LEFT ? -1 : 1)) {
                this.restSoon();
            }
            return true;
        }
        if (code === KEY.OK && row.focused) {
            this.nav.open(row.focused);
            return true;
        }
        return false;
    }

    /** The header's buttons focus walks: Follow, Report and Watch once the page is in */
    private buttons(): HTMLElement[] {
        if (!this.page) {
            return [this.follow.el];
        }
        var list = [this.follow.el, this.reportButton.el];
        if (this.page.stream || this.page.latest) {
            list.push(this.watchButton.el);
        }
        return list;
    }

    private press(button: HTMLElement): void {
        var page = this.page;
        if (!page) {
            return;
        }
        if (button === this.follow.el) {
            this.follow.press();
        } else if (button === this.reportButton.el) {
            this.nav.push(new QrPage(reportChannel(page.channel.login), this.nav));
        } else if (page.stream) {
            this.nav.open(streamItem(page.stream));
        } else if (page.latest) {
            this.nav.open(videoItem(page.latest));
        }
    }

    /** Focus into the rows (the header shrinks) or back up to the header */
    private setRows(on: boolean): void {
        this.inRows = on;
        toggleClass(this.el, 'bt-ch--rows', on);
        translate(this.rowsEl, 0, on ? 0 : HEADER_DROP);
        this.mark();
        this.restSoon();
    }

    private mark(): void {
        // No page at all: focus is on Try Again (OK asks again: the shell calls retry())
        var lost = this.failed && !this.page;
        var open = this.confirm.open;
        var at = this.focused && !this.inRows && !open && !lost ? this.buttons()[this.button] : null;
        var all = [this.follow.el, this.reportButton.el, this.watchButton.el];
        for (var i = 0; i < all.length; i++) {
            toggleClass(all[i], 'bt-focused', all[i] === at);
        }
        this.stack.setFocused(this.focused && this.inRows && !open);
        this.state.setFocused(this.focused && lost);
    }

    /** Once focus rests: what the tile it rests on opens (or Watch, with something else in the box) is fetched
     * ahead, so OK starts it sooner */
    private restSoon(): void {
        var item: Item | null = null;
        if (this.inRows) {
            var row = this.stack.row;
            item = row ? row.focused : null;
        } else if (this.page && this.buttons()[this.button] === this.watchButton.el) {
            var watch = this.page.stream ? streamItem(this.page.stream) : this.page.latest ? videoItem(this.page.latest) : null;
            item = watch && this.deps.player.playingKey() !== itemKey(watch) ? watch : null;
        }
        this.rest.item(item, this.nav.ahead);
    }

    /** The page from Twitch: asked now (or taken from an ask in the last minute); no answer: asked again later */
    private ask(): void {
        this.backoff.cancel();
        var self = this;
        askPage(this.channel.login, this.deps.load).then(function (page) {
            if (!self.gone) {
                self.failed = false;
                self.backoff.reset();
                self.fill(page);
            }
        }, function (e: GqlError) {
            if (self.gone) {
                return;
            }
            if (e && e.kind === 'notfound') {
                self.nav.error(self, 'not-found');
                return;
            }
            if (e && e.kind === 'network') {
                self.backoff.later();
            }
            if (!self.page) {
                self.failed = true;
                self.showState();
            }
        });
    }

    /** Draws the page: the header, the preview, the rows (rows in sight get fresh tiles once out of sight); the same
     * page again (asked within the minute) is left as it is */
    private fill(page: ChannelPage): void {
        if (page === this.page) {
            return;
        }
        this.page = page;
        this.channel = page.channel;
        this.drawChannel(!!page.stream);
        var c = page.channel;
        var about = !!c.description;
        toggleClass(this.more, 'bt-ch-more--plain', !about);
        setText(this.aboutTitle, about ? 'About ' + c.displayName + ':' : '');
        setText(this.about, c.description || '');
        setText(this.watchButton.label, page.stream ? 'Watch Live' : 'Watch Latest Video');
        setShown(this.watchButton.el, !!(page.stream || page.latest));
        setShown(this.more, true);
        if (this.preview.set(page)) {
            if (!this.preview.key()) {
                // Gated or gone now: what the box still plays stops (not a player's that took it over)
                this.preview.drop();
            } else if (this.shown) {
                this.preview.start();
            }
        }
        this.drawRows(page.shelves);
        this.button = Math.min(this.button, this.buttons().length - 1);
        this.mark();
    }

    /** The header's top lines and Follow: from the opener's channel at once, then from the page */
    private drawChannel(live: boolean): void {
        var c = this.channel;
        this.follow.set({ kind: 'channel', id: c.id, name: c.displayName });
        setSource(this.avatar, avatarAt(c.avatar, 150));
        setText(this.status, live ? 'LIVE NOW' : 'OFFLINE');
        toggleClass(this.status, 'bt-ch-status--live', live);
        setText(this.name, c.displayName);
        setText(this.followers, c.followers !== undefined ? count(c.followers, 1, 'follower') : '');
    }

    private drawRows(shelves: Shelf[]): void {
        var stack = this.stack;
        var had = stack.rows.length;
        for (var i = 0; i < had && i < shelves.length; i++) {
            stack.replace(i, shelves[i]);
        }
        if (shelves.length > had) {
            stack.add(shelves.slice(had));
        } else if (shelves.length < had) {
            stack.cut(shelves.length);
            if (!shelves.length && this.inRows) {
                this.setRows(false);
            }
        }
        this.showState();
    }

    /** No rows: Twitch's empty words, or (no page at all) the failed state with Try Again */
    private showState(): void {
        if (this.stack.rows.length || (!this.failed && !this.page)) {
            this.state.hide();
        } else if (this.page) {
            this.state.show('Nothing to see here…', 'This creator has no content.', false);
        } else {
            this.state.show('Something went wrong', '', true);
        }
        this.mark();
    }
}

/** A button with its icon and label */
function makeButton(parent: HTMLElement, label: string, icon: Node): Button {
    var el = parent.appendChild(h('div', 'bt-button bt-icon-button bt-ch-button')) as HTMLElement;
    el.appendChild(h('span', 'bt-button-icon')).appendChild(icon);
    return { el: el, label: el.appendChild(h('span', '', label)) as HTMLElement };
}

/** The target an item plays, as the session names it ('' for one the preview does not play) */
function itemKey(item: Item): string {
    if (item.kind === 'stream') {
        return keyOf({ kind: 'live', id: item.stream.channel.login });
    }
    if (item.kind === 'video') {
        return keyOf({ kind: 'vod', id: item.video.id });
    }
    return '';
}
