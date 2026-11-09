// The live player's chat panel as Twitch's TV app draws it (themes/chat.css): 320 wide at the right, over "Join the
// conversation"; the rows start at the top and, once they fill the panel, the newest stays at the bottom. Lines are
// queued as they come and made into messages only when drawn, every DRAW_MS (at once when the last draw was longer
// ago). Up to READ_PER_S a second are shown, and bursts up to KEPT at once; when more keep coming than anyone can read,
// the oldest not shown yet are skipped. Hidden, it keeps only what it would show and draws it when shown again.
// The rows' list is a layer of its own that only grows downward and is moved up, by whole device pixels (a layer
// placed between pixels blurs its text), so a draw paints only the rows it adds. Rows past the KEPT newest (above the
// top edge) are taken off SPARE at a time and reused with their pictures, filled while detached and added back in one
// DocumentFragment.
// The live chat settings place it elsewhere (place): the same column at the left; rows over the video, only whole ones
// showing; or along a strip as a band of one-line rows, a ticker, or one message at a time. Each row has the
// message's time and its sender's picture, shown when the settings say (a picture is asked for only then).

import { h, setClass, setShown, setText, translate, uiScale } from '../../core/dom.js';
import { localClock } from '../../core/time.js';
import { badgeOf } from './assets.js';
import { avatarOf } from './avatars.js';
import { emoteFinder } from './emotes.js';
import { IrcLine } from './irc.js';
import { loginOf, messageOf, statusLine } from './parse.js';
import { ChatEvents, KEPT, Message, MessageKind, Part } from './types.js';

/** Rows kept beyond KEPT, then taken off together: one repaint of the list for SPARE messages */
var SPARE = 30;
/** Where the first row starts while the rows don't fill the panel, as in Twitch's app */
var FIRST_ROW = 12;
/** Where the rows end once they fill it: on the Join band's top; elsewhere (no band) this far above its bottom */
var ROWS_END = 652.8;
var OVER_END = 8;
var DRAW_MS = 250;
/** One at a time: each message shows at least this long (meanwhile only the newest waits) */
var ONE_MS = 3000;
/** A ticker's pace (layout units a second), faster by TICKER_CATCH_UP a second per unit still to come, up to
 * TICKER_FASTEST; it takes the next message once less than half its width is still to come */
var TICKER_PACE = 110;
var TICKER_CATCH_UP = 0.05;
var TICKER_FASTEST = 240;
/** The gap after each message on a ticker (layout units; a margin, so a bubble ends before it) */
var TICKER_GAP = 48;
/** Messages a second shown when more come */
var READ_PER_S = 15;
/** Queued beyond what may be drawn now, this many wait for the next draws; older ones are skipped */
var WAITING = 2;
/** An emote's height, as themes/chat.css draws it (a chat over the video may be drawn larger or smaller: Chat Size): a
 * third-party one is as wide as its ratio makes it */
export var EMOTE_PX = 28.8;
var WELCOME = 'Welcome to the chat room!';
var DISCONNECTED = 'You have been disconnected from chat.';
var DELETED = '<message deleted>';
var ROW_CLASS: { [kind in MessageKind]: string } = {
    chat: 'bt-chat-row',
    notice: 'bt-chat-row bt-chat-row--notice',
    status: 'bt-chat-row bt-chat-row--status',
    welcome: 'bt-chat-row bt-chat-row--status bt-chat-row--welcome'
};
/** A phone: the Join button's icon, an outline with its home button */
var PHONE = '<svg class="bt-chat-join-icon" viewBox="0 0 22 30">' +
    '<rect x="2" y="2" width="18" height="26" rx="3.5" fill="none" stroke="currentColor" stroke-width="4"/>' +
    '<rect x="9" y="21.5" width="4" height="6" rx="2" fill="currentColor"/></svg>';

/** One drawn row and the elements it reuses; cut: hidden at the top edge (only whole rows show over the video) */
interface Row {
    el: HTMLElement;
    system: HTMLElement;
    line: HTMLElement;
    time: HTMLElement;
    avatar: HTMLImageElement;
    name: HTMLElement;
    text: HTMLElement;
    badges: HTMLImageElement[];
    emotes: HTMLImageElement[];
    message: Message | null;
    cut: boolean;
    /** Drawn as deleted */
    gone: boolean;
}

/** A line not yet drawn, or a status line the panel made */
type Queued = IrcLine | Message;

/** A place on the screen, in layout units */
export interface Place {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** How the panel shows its messages: column: rows in Twitch's panel over its Join band; rows: rows to its bottom;
 * band: one-line rows along a strip; ticker: running across a strip; one: the newest alone, each a while at least */
export type ChatMode = 'column' | 'rows' | 'band' | 'ticker' | 'one';

/** The panel's place (null: the stylesheet's, Twitch's column at the right), how it shows its messages, an emote's
 * height as the stylesheet draws it there, whether senders' pictures show, and the look's classes on a parent (its
 * rows' sizes change with them) */
export interface PanelLayout {
    place: Place | null;
    mode: ChatMode;
    emotePx: number;
    avatars: boolean;
    look: string;
}

export class ChatPanel implements ChatEvents {
    el: HTMLElement;
    /** "Join the conversation": the player moves the focus onto it (class bt-focused) */
    join: HTMLElement;
    private list: HTMLElement;
    private listStyle: CSSStyleDeclaration | null = null;
    private rowsEl: HTMLElement;
    private fadeEl: HTMLElement;
    private foot: HTMLElement;
    private mode: ChatMode = 'column';
    private avatars = false;
    private look = '';
    /** Its place as last laid out (null: the stylesheet's) */
    private placed: Place | null = null;
    /** Where the rows end once they fill it */
    private rowsEnd = ROWS_END;
    private ticker: Ticker;
    /** One at a time: its place, its row and when the message in it came */
    private oneEl: HTMLElement;
    private oneRow: Row | null = null;
    private oneAt = 0;
    /** Rows in the list, oldest first */
    private rows: Row[] = [];
    /** The messages drawn last (as many as the list keeps rows), drawn again when it shows them another way */
    private recent: Message[] = [];
    /** Senders' pictures came: the rows waiting for one get it */
    private avatarsCame: () => void;
    /** A row taken off, for the next messages */
    private spared: (row: Row) => void;
    /** Rows taken off the list, for the next messages */
    private spare: Row[] = [];
    private queue: Queued[] = [];
    private timer = 0;
    private lastDraw = 0;
    /** Messages that may be drawn now: READ_PER_S added a second, at most KEPT */
    private budget = KEPT;
    private shown = true;
    /** Messages drawn and skipped so far (measurements) */
    drawn = 0;
    skipped = 0;

    /** emotePx: an emote's height as the stylesheet draws it (a larger or smaller chat) */
    constructor(parent: HTMLElement, private emotePx: number = EMOTE_PX) {
        var self = this;
        this.el = parent.appendChild(h('div', 'bt-chat')) as HTMLElement;
        this.rowsEl = this.el.appendChild(h('div', 'bt-chat-rows')) as HTMLElement;
        this.list = this.rowsEl.appendChild(h('div', 'bt-chat-list')) as HTMLElement;
        this.fadeEl = this.el.appendChild(h('div', 'bt-chat-fade')) as HTMLElement;
        var foot = this.foot = this.el.appendChild(h('div', 'bt-chat-foot')) as HTMLElement;
        this.join = foot.appendChild(h('div', 'bt-chat-join')) as HTMLElement;
        this.join.innerHTML = PHONE;
        this.join.appendChild(h('div', 'bt-chat-join-label', 'Join the conversation'));
        this.spared = function (row: Row): void {
            row.message = null;
            row.el.style.marginLeft = '';
            row.el.style.marginRight = '';
            self.spare.push(row);
        };
        this.ticker = new Ticker(this.el, this.spared);
        this.oneEl = this.el.appendChild(h('div', 'bt-chat-one')) as HTMLElement;
        this.avatarsCame = function (): void {
            self.eachRow(function (row) {
                if (row.message && row.avatar.style.visibility === 'hidden') {
                    self.setAvatar(row, row.message);
                }
            });
        };
    }

    /** Laid out as the live chat settings say (Twitch's column at the right: place null; nothing done when nothing
     * changed); the messages made again only to or from a ticker or one at a time (the rows' ways share their rows), at
     * another emote size, or on a ticker whose messages' widths changed; else pictures switched in their rows and the
     * rows lifted again (the look may have changed their heights). Another way of showing them draws what waits at once */
    place(layout: PanelLayout): void {
        var place = layout.place;
        var mode = layout.mode;
        var restyled = layout.look !== this.look || layout.avatars !== this.avatars;
        if (mode === this.mode && layout.emotePx === this.emotePx && !restyled && samePlace(place, this.placed)) {
            return;
        }
        var again = mode !== this.mode && (running(mode) || running(this.mode)) || layout.emotePx !== this.emotePx || mode === 'ticker' && restyled;
        var pictures = layout.avatars !== this.avatars;
        var moved = mode !== this.mode;
        this.mode = mode;
        this.emotePx = layout.emotePx;
        this.avatars = layout.avatars;
        this.look = layout.look;
        this.placed = place;
        if (moved) {
            clearTimeout(this.timer);
            this.timer = 0;
        }
        setClass(this.el, 'bt-chat' + (mode === 'column' ? '' : ' bt-chat--' + mode));
        var s = this.el.style;
        s.left = place ? place.left + 'px' : '';
        s.top = place ? place.top + 'px' : '';
        s.width = place ? place.width + 'px' : '';
        s.height = place ? place.height + 'px' : '';
        // Twitch's column has its fade at the top and its Join band; elsewhere the rows end near its bottom
        var column = mode === 'column';
        this.rowsEnd = place && !column ? place.height - OVER_END : ROWS_END;
        this.rowsEl.style.width = place ? place.width + 'px' : '';
        this.rowsEl.style.height = place && !column ? this.rowsEnd + 'px' : '';
        this.fadeEl.style.display = column ? '' : 'none';
        this.foot.style.display = column ? '' : 'none';
        this.ticker.width = mode === 'ticker' && place ? place.width : 0;
        if (again) {
            this.redraw();
        } else {
            if (pictures) {
                var self = this;
                this.eachRow(function (row) {
                    if (row.message) {
                        self.setAvatar(row, row.message);
                    }
                });
            }
            this.lift();
        }
        if (moved && this.shown && this.queue.length) {
            this.drawSoon();
        }
    }

    /** Shown or hidden (the player's chat toggle): instant, as in Twitch's app; what came while hidden shows at once */
    show(on: boolean): void {
        if (on === this.shown) {
            return;
        }
        this.shown = on;
        this.el.style.display = on ? '' : 'none';
        if (on) {
            this.restart();
            // A ticker stopped while hidden (no transition runs then): it starts again empty
            this.ticker.clear();
            // (a draw of what waited lifts the rows itself)
            if (!this.queue.length) {
                this.lift();
            }
            this.draw();
        }
    }

    /** Empties it: the connection moved to another channel */
    reset(): void {
        this.restart();
        this.queue = [];
        this.recent = [];
        this.oneAt = 0;
        this.clear();
    }

    lines(list: IrcLine[]): void {
        for (var i = 0; i < list.length; i++) {
            this.queue.push(list[i]);
        }
        this.queued();
    }

    /** Lines with the sender's text (chats, and notices such as a resub's) go from the queue and say so in their rows;
     * a notice without it stays, as in Twitch's app */
    removed(ids: string[] | null, login?: string): void {
        this.queue = this.queue.filter(function (q) {
            return !isLine(q) || !withText(q) || !removes(ids, login, q.tags.id || '', loginOf(q));
        });
        var takes = function (m: Message): boolean {
            return (m.kind === 'chat' || m.kind === 'notice' && m.parts.length > 0) && removes(ids, login, m.id, m.login);
        };
        this.recent.forEach(function (m) {
            if (!m.deleted && takes(m)) {
                m.deleted = true;
            }
        });
        // (a row's message marked just now, or one drawn but no longer among the recent)
        this.eachRow(function (row) {
            var m = row.message;
            if (m && (m.deleted || takes(m)) && !row.gone) {
                m.deleted = true;
                row.gone = true;
                deleted(row);
            }
        });
    }

    connected(on: boolean): void {
        // Each connection greets as Twitch's does; a drop says so
        this.queue.push(on ? statusLine('welcome', WELCOME) : statusLine('status', DISCONNECTED));
        this.queued();
    }

    /** A draw soon, or while hidden only the newest KEPT kept */
    private queued(): void {
        if (this.shown) {
            this.drawSoon();
        } else {
            this.skip(KEPT);
        }
    }

    /** No draw pending, a full budget */
    private restart(): void {
        clearTimeout(this.timer);
        this.timer = 0;
        this.budget = KEPT;
    }

    /** Draws now when the last draw was DRAW_MS ago, else at that time (or in ms) */
    private drawSoon(ms?: number): void {
        var self = this;
        if (this.timer) {
            return;
        }
        var wait = ms !== undefined ? ms : Math.max(0, this.lastDraw + DRAW_MS - Date.now());
        this.timer = setTimeout(function () {
            self.timer = 0;
            self.draw();
        }, wait) as unknown as number;
    }

    /** Drops the oldest queued lines beyond max */
    private skip(max: number): void {
        if (this.queue.length > max) {
            this.skipped += this.queue.length - max;
            this.queue.splice(0, this.queue.length - max);
        }
    }

    /** Draws what the budget allows; the rest waits, up to WAITING more, and older ones beyond are skipped */
    private draw(): void {
        if (!this.shown || !this.queue.length) {
            return;
        }
        if (this.mode === 'ticker' || this.mode === 'one') {
            this.drawStrip();
            return;
        }
        var now = Date.now();
        this.budget = Math.min(KEPT, this.budget + (now - this.lastDraw) * READ_PER_S / 1000);
        this.lastDraw = now;
        var count = Math.floor(this.budget);
        this.skip(count + WAITING);
        var added = document.createDocumentFragment();
        var made = 0;
        var taken = 0;
        while (made < count && taken < this.queue.length) {
            var m = toMessage(this.queue[taken++]);
            if (m) {
                this.addRow(m, added);
                this.remember(m);
                made++;
            }
        }
        this.queue.splice(0, taken);
        this.list.appendChild(added);
        this.lift();
        this.budget -= made;
        this.drawn += made;
        if (this.queue.length) {
            this.drawSoon();
        }
    }

    /** A ticker or one at a time: the next message (the ticker's once less than half its width is still to come;
     * one at a time the newest, once the one in its place has shown ONE_MS); meanwhile only the newest wait, and the
     * next draw is when it is due */
    private drawStrip(): void {
        var one = this.mode === 'one';
        if (one) {
            this.skip(1);
        }
        var wait = one ? this.oneAt + ONE_MS - Date.now() : this.ticker.wait();
        if (wait <= 0) {
            var m: Message | null = null;
            while (!m && this.queue.length) {
                m = toMessage(this.queue.shift() as Queued);
            }
            if (m) {
                this.drawn++;
                this.remember(m);
                this.stripShows(m);
                wait = one ? ONE_MS : this.ticker.wait();
            }
        }
        if (!one) {
            this.skip(WAITING);
        }
        if (this.queue.length) {
            this.drawSoon(Math.max(0, wait));
        }
    }

    /** m onto the ticker, or in the one's place (added again: its entrance and fading from the start) */
    private stripShows(m: Message): void {
        if (this.mode !== 'one') {
            var row = this.nextRow();
            this.fill(row, m);
            this.ticker.add(row);
            return;
        }
        var one = this.oneRow || (this.oneRow = this.nextRow());
        this.fill(one, m);
        if (one.el.parentNode) {
            this.oneEl.removeChild(one.el);
        }
        this.oneEl.appendChild(one.el);
        this.oneAt = Date.now();
    }

    /** m drawn in a row at the list's end (into added, then added to the list) */
    private addRow(m: Message, added: DocumentFragment): void {
        var row = this.nextRow();
        this.fill(row, m);
        added.appendChild(row.el);
        this.rows.push(row);
    }

    /** One of the last messages drawn, as many as the list keeps rows */
    private remember(m: Message): void {
        this.recent.push(m);
        if (this.recent.length > KEPT + SPARE) {
            this.recent.shift();
        }
    }

    /** The messages drawn again as it shows them now: the last ones drawn in rows, or one at a time the newest (a
     * ticker fills with the next) */
    private redraw(): void {
        this.clear();
        var recent = this.recent;
        if (this.mode === 'one' && recent.length) {
            this.stripShows(recent[recent.length - 1]);
        } else if (this.mode !== 'ticker' && recent.length) {
            var added = document.createDocumentFragment();
            for (var i = 0; i < recent.length; i++) {
                this.addRow(recent[i], added);
            }
            this.list.appendChild(added);
            this.lift();
        }
    }

    /** Every row taken off, kept for the next messages */
    private clear(): void {
        empty(this.list);
        this.rows.forEach(this.spared);
        this.rows = [];
        this.ticker.clear();
        if (this.oneRow) {
            empty(this.oneEl);
            this.spared(this.oneRow);
            this.oneRow = null;
        }
    }

    /** Each row drawn: in the list, on the ticker, in the one's place */
    private eachRow(f: (row: Row) => void): void {
        this.rows.forEach(f);
        this.ticker.rows.forEach(f);
        if (this.oneRow) {
            f(this.oneRow);
        }
    }

    /** Moves the list so its rows start at FIRST_ROW, or once they fill the panel end where the rows end (above its top
     * padding); by whole device pixels, with one layout read per draw (the rows read before the list moves). Not in
     * Twitch's column (which fades them under its top) only whole rows show: the one the top edge cuts and those above
     * it are hidden */
    private lift(): void {
        if (!this.shown || !this.rows.length) {
            return;
        }
        var style = this.listStyle || (this.listStyle = window.getComputedStyle(this.list));
        var y = Math.min(FIRST_ROW, this.rowsEnd - parseFloat(style.height)) - parseFloat(style.paddingTop);
        var column = this.mode === 'column';
        var cut = false;
        for (var i = this.rows.length - 1; i >= 0; i--) {
            var row = this.rows[i];
            cut = !column && (cut || row.el.offsetTop + y < 0);
            if (cut && row.cut) {
                // (those above it were cut before)
                break;
            }
            if (cut !== row.cut) {
                row.cut = cut;
                setShown(row.el, !cut);
            }
        }
        var scale = uiScale() * (window.devicePixelRatio || 1);
        translate(this.list, 0, Math.round(y * scale) / scale);
    }

    /** Puts m into row, reusing its elements */
    private fill(row: Row, m: Message): void {
        row.message = m;
        if (row.cut) {
            row.cut = false;
            setShown(row.el, true);
        }
        setClass(row.el, ROW_CLASS[m.kind] + (m.kind === 'notice' && !m.parts.length ? ' bt-chat-row--bare' : ''));
        empty(row.system);
        var emote = m.notice ? drawParts(row.system, m.notice, row.emotes, 0, this.emotePx) : 0;
        setText(row.time, m.at ? clockAt(m.at) : '');
        this.setAvatar(row, m);
        setBadges(row, m.badges);
        // The name ends with its colon and the space before the message, as Twitch's app writes it
        setText(row.name, m.name ? m.name + (m.action ? ' ' : ': ') : '');
        row.name.style.color = m.color;
        empty(row.text);
        setClass(row.text, 'bt-chat-text');
        row.text.style.color = m.action || '';
        row.gone = !!m.deleted;
        if (m.deleted) {
            deleted(row);
        } else {
            drawParts(row.text, m.parts, row.emotes, emote, this.emotePx);
        }
    }

    /** The sender's picture while the settings show them: its place kept, the picture in it once known (asked for,
     * then avatarsCame), so it comes without moving the text */
    private setAvatar(row: Row, m: Message): void {
        var on = this.avatars && !!m.userId;
        var url = on ? avatarOf(m.userId as string, this.avatarsCame) : '';
        if (url && row.avatar.getAttribute('src') !== url) {
            row.avatar.src = url;
        }
        shown(row.avatar, on);
        setShown(row.avatar, !!url);
    }

    /** A detached row for the next message: a spare one, or a new one until KEPT + SPARE exist; then the oldest SPARE
     * rows (all above the top edge) are taken off together */
    private nextRow(): Row {
        if (!this.spare.length) {
            if (this.rows.length < KEPT + SPARE) {
                return makeRow();
            }
            var old = this.rows.splice(0, SPARE);
            for (var i = 0; i < old.length; i++) {
                this.list.removeChild(old[i].el);
                this.spared(old[i]);
            }
        }
        return this.spare.pop() as Row;
    }
}

function isLine(q: Queued): q is IrcLine {
    return (q as IrcLine).command !== undefined;
}

/** A queued line made into the message drawn for it (null: none), or the panel's own status line */
function toMessage(q: Queued): Message | null {
    return isLine(q) ? messageOf(q, badgeOf, emoteFinder) : q;
}

/** Whether a mode runs its messages along a strip (a ticker, one at a time) instead of in rows */
function running(mode: ChatMode): boolean {
    return mode === 'ticker' || mode === 'one';
}

function samePlace(a: Place | null, b: Place | null): boolean {
    return a === b || !!a && !!b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

/** A message's time as the clock shows it, made once a minute (not per message) */
var clockMinute = -1;
var clockText = '';
function clockAt(at: number): string {
    var minute = Math.floor(at / 60000);
    if (minute !== clockMinute) {
        clockMinute = minute;
        clockText = localClock(at);
    }
    return clockText;
}

/** A chat line, or a notice with the sender's text */
function withText(q: IrcLine): boolean {
    return q.command === 'PRIVMSG' || q.command === 'USERNOTICE' && !!q.params[1];
}

/** Whether a removal (these ids, or a login's messages, or all: neither) takes message id from sender */
function removes(ids: string[] | null, login: string | undefined, id: string, sender: string): boolean {
    return ids ? ids.indexOf(id) >= 0 : !login || sender === login;
}

function makeRow(): Row {
    var el = h('div', 'bt-chat-row');
    var system = el.appendChild(h('div', 'bt-chat-system')) as HTMLElement;
    var line = el.appendChild(h('div', 'bt-chat-line')) as HTMLElement;
    var time = line.appendChild(h('span', 'bt-chat-time')) as HTMLElement;
    var avatar = line.appendChild(h('img', 'bt-chat-avatar')) as HTMLImageElement;
    avatar.alt = '';
    var name = line.appendChild(h('span', 'bt-chat-name')) as HTMLElement;
    var text = line.appendChild(h('span', 'bt-chat-text')) as HTMLElement;
    return { el: el, system: system, line: line, time: time, avatar: avatar, name: name, text: text, badges: [], emotes: [], message: null, cut: false,
        gone: false };
}

/** Draws parts into el: text, links and highlights in the link colour, emotes as the row's pictures from emote on
 * (an unchanged address loads nothing); the next free picture's number */
function drawParts(el: HTMLElement, parts: Part[], emotes: HTMLImageElement[], emote: number, emotePx: number): number {
    /** The width of the emote just drawn (0: the part before was not one) */
    var before = 0;
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part.kind === 'text') {
            el.appendChild(document.createTextNode(part.text));
            before = 0;
        } else if (part.kind === 'emote') {
            var img = emotes[emote];
            if (!img) {
                img = emotes[emote] = h('img', 'bt-chat-emote') as HTMLImageElement;
            }
            emote++;
            if (img.getAttribute('src') !== part.url) {
                img.src = part.url;
            }
            img.alt = part.name;
            var width = emotePx * (part.ratio || 1);
            setStyle(img, 'width', part.ratio ? px(width) : '');
            // Over the emote before it: centred on it, taking no room of its own
            var over = part.over && before > 0;
            setStyle(img, 'marginLeft', over ? px(-(before + width) / 2) : '');
            setStyle(img, 'marginRight', over ? px((before - width) / 2) : '');
            before = over ? before : width;
            el.appendChild(img);
        } else {
            el.appendChild(h('span', 'bt-chat-link', part.text));
            before = 0;
        }
    }
    return emote;
}

/** A length in hundredths of a pixel, as the style reads it back (so an unchanged one is not written again) */
function px(n: number): string {
    return Math.round(n * 100) / 100 + 'px';
}

/** A reused picture's style property, written only when it changes */
function setStyle(img: HTMLImageElement, name: 'width' | 'marginLeft' | 'marginRight', value: string): void {
    if (img.style[name] !== value) {
        img.style[name] = value;
    }
}

function deleted(row: Row): void {
    empty(row.text);
    setClass(row.text, 'bt-chat-text bt-chat-deleted');
    row.text.style.color = '';
    row.text.appendChild(document.createTextNode(DELETED));
}

function empty(el: HTMLElement): void {
    while (el.lastChild) {
        el.removeChild(el.lastChild);
    }
}

/** The row's badge pictures for list: its pictures reused (an unchanged address loads nothing), spare ones hidden */
function setBadges(row: Row, list: string[]): void {
    for (var i = 0; i < list.length; i++) {
        var img = row.badges[i];
        if (!img) {
            img = row.badges[i] = h('img', 'bt-chat-badge') as HTMLImageElement;
            // A badge that fails to load shows nothing (no broken-picture sign)
            img.alt = '';
            row.line.insertBefore(img, row.name);
        }
        if (img.getAttribute('src') !== list[i]) {
            img.src = list[i];
        }
        shown(img, true);
    }
    for (var j = list.length; j < row.badges.length; j++) {
        shown(row.badges[j], false);
    }
}

/** Shows or hides a spare picture (a style write only when it changes) */
function shown(img: HTMLImageElement, on: boolean): void {
    var display = on ? '' : 'none';
    if (img.style.display !== display) {
        img.style.display = display;
    }
}

/** A strip's ticker: the messages run across it from right to left at an even pace (a CSS transition: the TV's
 * compositor moves it, no timer per frame), each new one joining the end and entering at the right edge when nothing
 * else is coming; what is still to come speeds it up; gone past the left edge, their rows go to gone. Where it is is
 * worked out from its run (where it started, when, its pace), never read from the page */
class Ticker {
    el: HTMLElement;
    /** Its width as laid out (layout units) */
    width = 0;
    /** Its rows in order, and their widths with the gaps around them */
    rows: Row[] = [];
    private widths: number[] = [];
    private length = 0;
    private from = 0;
    private at = 0;
    private pace = TICKER_PACE;

    constructor(parent: HTMLElement, private gone: (row: Row) => void) {
        this.el = parent.appendChild(h('div', 'bt-chat-ticker')) as HTMLElement;
    }

    /** How long until it takes the next message (ms; none or less: now): once less than half its width is still to
     * come past its right edge */
    wait(): number {
        return this.rows.length ? (this.position() + this.length - 1.5 * this.width) / this.pace * 1000 : 0;
    }

    /** row joins the end; rows gone past the left edge go */
    add(row: Row): void {
        var x = this.position();
        while (this.rows.length && x + this.widths[0] < 0) {
            var width = this.widths.shift() as number;
            x += width;
            this.length -= width;
            var old = this.rows.shift() as Row;
            this.el.removeChild(old.el);
            this.gone(old);
        }
        if (!this.rows.length) {
            x = this.width;
        }
        // Nothing still coming: it enters at the right edge
        var gap = Math.max(0, this.width - (x + this.length));
        row.el.style.marginLeft = gap ? gap + 'px' : '';
        row.el.style.marginRight = TICKER_GAP + 'px';
        // At x at once (no transition), with the row in: one layout, reading its width, for both
        var s = this.el.style;
        s.webkitTransition = 'none';
        translate(this.el, x, 0);
        this.el.appendChild(row.el);
        this.rows.push(row);
        this.widths.push(gap + row.el.offsetWidth + TICKER_GAP);
        this.length += this.widths[this.widths.length - 1];
        // Then on until all of it is past the left edge
        this.pace = Math.min(TICKER_FASTEST, TICKER_PACE + Math.max(0, x + this.length - this.width) * TICKER_CATCH_UP);
        this.from = x;
        this.at = Date.now();
        s.webkitTransition = '-webkit-transform ' + ((x + this.length) / this.pace).toFixed(2) + 's linear';
        translate(this.el, -this.length, 0);
    }

    /** Every row gone, the ticker still and empty */
    clear(): void {
        var self = this;
        this.rows.forEach(function (row) {
            self.el.removeChild(row.el);
            self.gone(row);
        });
        this.rows = [];
        this.widths = [];
        this.length = 0;
        this.el.style.webkitTransition = 'none';
        this.el.style.webkitTransform = '';
    }

    /** Where it is now along its run (layout units), until all of it is past the left edge */
    private position(): number {
        return this.rows.length ? Math.max(-this.length, this.from - (Date.now() - this.at) * this.pace / 1000) : 0;
    }
}
