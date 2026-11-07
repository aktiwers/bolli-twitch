// The live player's chat panel as Twitch's TV app draws it (themes/chat.css): 320 wide at the right, over "Join the
// conversation"; the rows start at the top and, once they fill the panel, the newest stays at the bottom. Lines are
// queued as they come and made into messages only when drawn, every DRAW_MS (at once when the last draw was longer
// ago). Up to READ_PER_S a second are shown, and bursts up to KEPT at once; when more keep coming than anyone can read,
// the oldest not shown yet are skipped. Hidden, it keeps only what it would show and draws it when shown again.
// The rows' list is a layer of its own that only grows downward and is moved up, by whole device pixels (a layer
// placed between pixels blurs its text), so a draw paints only the rows it adds. Rows past the KEPT newest (above the
// top edge) are taken off SPARE at a time and reused with their pictures, filled while detached and added back in one
// DocumentFragment.

import { h, setClass, setText, translate, uiScale } from '../../core/dom.js';
import { badgeOf } from './assets.js';
import { IrcLine } from './irc.js';
import { loginOf, messageOf, statusLine } from './parse.js';
import { ChatEvents, KEPT, Message, MessageKind, Part } from './types.js';

/** Rows kept beyond KEPT, then taken off together: one repaint of the list for SPARE messages */
var SPARE = 30;
/** Where the first row starts while the rows don't fill the panel, as in Twitch's app */
var FIRST_ROW = 12;
/** Where the rows end once they fill it: on the Join band's top */
var ROWS_END = 652.8;
var DRAW_MS = 250;
/** Messages a second shown when more come */
var READ_PER_S = 15;
/** Queued beyond what may be drawn now, this many wait for the next draws; older ones are skipped */
var WAITING = 2;
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

/** One drawn row and the elements it reuses */
interface Row {
    el: HTMLElement;
    system: HTMLElement;
    line: HTMLElement;
    name: HTMLElement;
    text: HTMLElement;
    badges: HTMLImageElement[];
    emotes: HTMLImageElement[];
    message: Message | null;
}

/** A line not yet drawn, or a status line the panel made */
type Queued = IrcLine | Message;

export class ChatPanel implements ChatEvents {
    el: HTMLElement;
    /** "Join the conversation": the player moves the focus onto it (class bt-focused) */
    join: HTMLElement;
    private list: HTMLElement;
    private listStyle: CSSStyleDeclaration | null = null;
    /** Rows in the list, oldest first */
    private rows: Row[] = [];
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

    constructor(parent: HTMLElement) {
        this.el = parent.appendChild(h('div', 'bt-chat')) as HTMLElement;
        var rows = this.el.appendChild(h('div', 'bt-chat-rows')) as HTMLElement;
        this.list = rows.appendChild(h('div', 'bt-chat-list')) as HTMLElement;
        this.el.appendChild(h('div', 'bt-chat-fade'));
        var foot = this.el.appendChild(h('div', 'bt-chat-foot')) as HTMLElement;
        this.join = foot.appendChild(h('div', 'bt-chat-join')) as HTMLElement;
        this.join.innerHTML = PHONE;
        this.join.appendChild(h('div', 'bt-chat-join-label', 'Join the conversation'));
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
            this.draw();
        }
    }

    /** Empties it: the connection moved to another channel */
    reset(): void {
        this.restart();
        this.queue = [];
        empty(this.list);
        for (var i = 0; i < this.rows.length; i++) {
            this.rows[i].message = null;
            this.spare.push(this.rows[i]);
        }
        this.rows = [];
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
        for (var i = 0; i < this.rows.length; i++) {
            var m = this.rows[i].message;
            if (m && (m.kind === 'chat' || m.kind === 'notice' && m.parts.length > 0) && removes(ids, login, m.id, m.login)) {
                deleted(this.rows[i]);
            }
        }
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

    /** Draws now when the last draw was DRAW_MS ago, else at that time */
    private drawSoon(): void {
        var self = this;
        if (this.timer) {
            return;
        }
        var wait = Math.max(0, this.lastDraw + DRAW_MS - Date.now());
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
        var now = Date.now();
        this.budget = Math.min(KEPT, this.budget + (now - this.lastDraw) * READ_PER_S / 1000);
        this.lastDraw = now;
        var count = Math.floor(this.budget);
        this.skip(count + WAITING);
        var added = document.createDocumentFragment();
        var made = 0;
        var taken = 0;
        while (made < count && taken < this.queue.length) {
            var q = this.queue[taken++];
            var m = isLine(q) ? messageOf(q, badgeOf) : q;
            if (m) {
                var row = this.nextRow();
                fill(row, m);
                added.appendChild(row.el);
                this.rows.push(row);
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

    /** Moves the list so its rows start at FIRST_ROW, or once they fill the panel end at ROWS_END (above its top
     * padding); by whole device pixels, with one layout read per draw */
    private lift(): void {
        var style = this.listStyle || (this.listStyle = window.getComputedStyle(this.list));
        var y = Math.min(FIRST_ROW, ROWS_END - parseFloat(style.height)) - parseFloat(style.paddingTop);
        var scale = uiScale() * (window.devicePixelRatio || 1);
        translate(this.list, 0, Math.round(y * scale) / scale);
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
                old[i].message = null;
                this.spare.push(old[i]);
            }
        }
        return this.spare.pop() as Row;
    }
}

function isLine(q: Queued): q is IrcLine {
    return (q as IrcLine).command !== undefined;
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
    var name = line.appendChild(h('span', 'bt-chat-name')) as HTMLElement;
    var text = line.appendChild(h('span', 'bt-chat-text')) as HTMLElement;
    return { el: el, system: system, line: line, name: name, text: text, badges: [], emotes: [], message: null };
}

/** Puts m into row, reusing its elements */
function fill(row: Row, m: Message): void {
    row.message = m;
    setClass(row.el, ROW_CLASS[m.kind] + (m.kind === 'notice' && !m.parts.length ? ' bt-chat-row--bare' : ''));
    empty(row.system);
    var emote = m.notice ? drawParts(row.system, m.notice, row.emotes, 0) : 0;
    setBadges(row, m.badges);
    // The name ends with its colon and the space before the message, as Twitch's app writes it
    setText(row.name, m.name ? m.name + (m.action ? ' ' : ': ') : '');
    row.name.style.color = m.color;
    empty(row.text);
    setClass(row.text, 'bt-chat-text');
    row.text.style.color = m.action || '';
    drawParts(row.text, m.parts, row.emotes, emote);
}

/** Draws parts into el: text, links and highlights in the link colour, emotes as the row's pictures from emote on
 * (an unchanged address loads nothing); the next free picture's number */
function drawParts(el: HTMLElement, parts: Part[], emotes: HTMLImageElement[], emote: number): number {
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part.kind === 'text') {
            el.appendChild(document.createTextNode(part.text));
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
            el.appendChild(img);
        } else {
            el.appendChild(h('span', 'bt-chat-link', part.text));
        }
    }
    return emote;
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
