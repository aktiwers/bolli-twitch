// Live chat settings, a Bolli page: the chat's settings on one page (the live player's options,
// and Settings › Live Chat), see-through and on the side away from the chat, so each change shows behind it at once.
// Up/Down pick a setting (those for where the chat is: shown or hidden as the chat button leaves it, beside the video
// as in Twitch's app or over it, its position for that, its height at a side, a strip's style, the picture beside a
// strip, Move and resize for a box of its own; its size, its background over the video, timestamps, avatars and old
// messages), Left/Right change it in place (OK: the next value, round), Back closes. Choosing Custom takes the focus to
// Move and resize, which OK starts: the arrows move the chat, OK turns them to resizing it (Left/Right its width,
// Up/Down its height, its bottom staying), OK again keeps it; Back puts it back. Over a stream it is the stream's chat
// that changes; over Settings an example: a picture (placed as the video would be) and Twitch-like chat lines made
// here, their senders' pictures drawn here too (themes/chat.css: bt-chatset).

import { h, LAYOUT_WIDTH, setShown, setText, toggleClass } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { knownAvatar } from '../../chat/avatars.js';
import { parseLine } from '../../chat/irc.js';
import { ChatPanel } from '../../chat/panel.js';
import { Box } from '../../player/session.js';
import { chatBox, chatClasses, chatHidden, chatLayout, chatOver, ChatPref, chatPref, ChatValue, fitted, LEAST, setChatBox, setChatHidden,
    setChatOver, setChatPref, WHOLE } from './chat-choice.js';

/** A setting on the page: its values in order, each with its name (none: Move and resize); shown: whether it applies
 * to the chat as set (none: always); extra: an on/off one the summary names only when on */
interface ChatSetting {
    label: string;
    name: ChatPref | 'chatShown' | 'chatOver' | '';
    values: { value: ChatValue; name: string }[];
    shown?: () => boolean;
    extra?: boolean;
}

/** An example line comes this often (ms; the first ones at once) */
var EXAMPLE_MS = 2500;
var EXAMPLES_FIRST = 4;
/** Move and resize: a press moves or resizes by this much (layout units) */
var STEP = 20;
/** Move and resize shines this long as Custom is chosen (two sweeps: themes, bt-chatset-row--shine) */
var SHINE_MS = 2400;
/** Between the keys' words on the page */
var GAP = '   ';

/** Which settings apply, from where the chat is as set (chat-choice.ts) */
var beside = function (): boolean { return !chatOver(); };
var atSide = function (): boolean { return chatLayout().kind === 'side'; };
var ownBox = function (): boolean { return chatLayout().kind === 'own'; };
var asStrip = function (): boolean { return chatLayout().kind === 'strip'; };
var OFF_ON = [{ value: false, name: 'Off' }, { value: true, name: 'On' }];

/** The page's settings in order */
function chatSettings(): ChatSetting[] {
    return [
        { label: 'Chat', name: 'chatShown', values: [{ value: true, name: 'On' }, { value: false, name: 'Off' }] },
        { label: 'Mode', name: 'chatOver', values: [{ value: false, name: 'Beside the video' }, { value: true, name: 'Over the video' }] },
        { label: 'Position', name: 'chatPosition', values: [{ value: 'right', name: 'Right' }, { value: 'left', name: 'Left' },
            { value: 'bottom', name: 'Bottom' }, { value: 'custom', name: 'Custom' }], shown: chatOver },
        { label: 'Position', name: 'chatSide', values: [{ value: 'right', name: 'Right' }, { value: 'left', name: 'Left' },
            { value: 'bottom', name: 'Bottom' }, { value: 'top', name: 'Top' }], shown: beside },
        { label: 'Height', name: 'chatHeight', values: [{ value: 'full', name: 'Full' }, { value: 'tall', name: 'Tall' },
            { value: 'half', name: 'Half' }], shown: atSide },
        { label: 'Bottom style', name: 'chatBottom', values: [{ value: 'ticker', name: 'Ticker' }, { value: 'band', name: 'Band' },
            { value: 'one', name: 'One at a time' }], shown: asStrip },
        { label: 'Picture', name: 'chatPicture', values: [{ value: 'fit', name: 'Fit' }, { value: 'fill', name: 'Fill' }],
            shown: function () { var at = chatLayout(); return beside() && at.kind === 'strip' && at.mode !== 'band'; } },
        { label: 'Move and resize', name: '', values: [], shown: function () { return ownBox() && !chatHidden(); } },
        { label: 'Size', name: 'chatSize', values: [{ value: 'tiny', name: 'Very small' }, { value: 'small', name: 'Small' },
            { value: 'medium', name: 'Medium' }, { value: 'large', name: 'Large' }] },
        { label: 'Background', name: 'chatBackground', values: [{ value: 'panel', name: 'One panel' }, { value: 'bubbles', name: 'Bubbles' },
            { value: 'none', name: 'Text only' }], shown: chatOver },
        { label: 'Timestamps', name: 'chatTimes', values: OFF_ON, extra: true },
        { label: 'Avatars', name: 'chatAvatars', values: OFF_ON, extra: true },
        { label: 'Old messages', name: 'chatFade', values: [{ value: 0, name: 'Stay' }, { value: 15, name: 'Fade after 15 s' },
            { value: 30, name: 'Fade after 30 s' }, { value: 60, name: 'Fade after 1 min' }] }
    ];
}

function valueOf(s: ChatSetting): ChatValue | null {
    return s.name === 'chatShown' ? !chatHidden() : s.name === 'chatOver' ? chatOver() : s.name ? chatPref(s.name) : null;
}

/** Where a setting's value is among its values (one not among them: the first) */
function valueAt(s: ChatSetting): number {
    var now = valueOf(s);
    for (var i = 0; i < s.values.length; i++) {
        if (s.values[i].value === now) {
            return i;
        }
    }
    return 0;
}

function applies(s: ChatSetting): boolean {
    return !s.shown || s.shown();
}

/** The settings' values in a line ("On · Beside the video · Right · Medium · Timestamps · Stay": Settings' card; an
 * on/off extra by its name when on) */
export function chatSummary(): string {
    return chatSettings().filter(function (s) { return s.values.length && applies(s) && (!s.extra || valueOf(s) === true); }).map(function (s) {
        return s.extra ? s.label : s.values[valueAt(s)].name;
    }).join(' · ');
}

/** The example's senders, as Twitch's chat sends them (made up: names, colours, a Kappa), and the colours of their
 * drawn pictures */
var EXAMPLES = [
    ['Mia', '#ff7f50', 'hello from the sofa!', '#9147ff'],
    ['nightowl_88', '#1e90ff', 'that play was clean Kappa', '#00897b'],
    ['Jonas', '#9acd32', 'first time catching this live', '#e65100'],
    ['aurora', '#daa520', 'the picture is so sharp tonight', '#3949ab'],
    ['Sam', '#ff69b4', 'GG everyone', '#c2185b']
];

function exampleLine(n: number): ReturnType<typeof parseLine> {
    var at = n % EXAMPLES.length;
    var e = EXAMPLES[at];
    var text = e[2];
    var kappa = text.indexOf('Kappa');
    var emotes = kappa >= 0 ? '25:' + kappa + '-' + (kappa + 4) : '';
    var login = e[0].toLowerCase();
    return parseLine('@badges=;color=' + e[1] + ';display-name=' + e[0] + ';emotes=' + emotes + ';id=example' + n + ';tmi-sent-ts=' + Date.now() +
        ';user-id=example' + at + ' :' + login + '!' + login + '@' + login + '.tmi.twitch.tv PRIVMSG #example :' + text);
}

/** An example sender's picture: a coloured circle with the name's first letter (an SVG in the page: nothing loaded) */
function drawnAvatar(n: number): string {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="32" fill="' +
        EXAMPLES[n][3] + '"/><text x="32" y="43" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600" fill="#fff" text-anchor="middle">' +
        EXAMPLES[n][0].charAt(0).toUpperCase() + '</text></svg>');
}

/** A box placed as the video would be (the example's picture) */
function placeBox(el: HTMLElement, b: Box): void {
    el.style.left = b.left + 'px';
    el.style.top = b.top + 'px';
    el.style.width = b.width + 'px';
    el.style.height = b.height + 'px';
}

export class ChatSettings {
    el: HTMLElement;
    shown = false;
    private panel: HTMLElement;
    private hintText: HTMLElement;
    private settings: ChatSetting[];
    private rows: { el: HTMLElement; name: HTMLElement; less: HTMLElement; more: HTMLElement }[] = [];
    private at = 0;
    /** Over Settings: the example's scene, its picture, its chat and the next example line with its timer */
    private scene: HTMLElement | null = null;
    private picture: HTMLElement | null = null;
    private chat: ChatPanel | null = null;
    private sent = 0;
    private exampleTimer = 0;
    /** Move and resize: what the arrows do now ('' not moving it), and the box as moved so far (kept on OK; Back: as
     * stored) */
    private arranging: '' | 'move' | 'resize' = '';
    private box: Box | null = null;
    private shining: HTMLElement | null = null;
    private shineTimer = 0;

    /** In parent: over the live player (changed: lay its chat out as now set, a box being moved given), or, with no
     * changed, over Settings with an example of its own */
    constructor(parent: HTMLElement, private changed?: (box?: Box) => void) {
        var self = this;
        this.settings = chatSettings();
        this.el = h('div', 'bt-chatset');
        if (!changed) {
            this.scene = this.el.appendChild(h('div', 'bt-chatset-scene')) as HTMLElement;
            this.picture = this.scene.appendChild(h('div', 'bt-chatset-picture')) as HTMLElement;
            this.chat = new ChatPanel(this.scene);
            this.scene.appendChild(h('div', 'bt-chatset-note', 'Example messages'));
            for (var i = 0; i < EXAMPLES.length; i++) {
                knownAvatar('example' + i, drawnAvatar(i));
            }
        }
        this.panel = this.el.appendChild(h('div', 'bt-chatset-panel')) as HTMLElement;
        this.panel.appendChild(h('div', 'bt-chatset-title', 'Live Chat Settings'));
        this.settings.forEach(function (s) {
            var el = self.panel.appendChild(h('div', 'bt-chatset-row')) as HTMLElement;
            el.appendChild(h('span', 'bt-chatset-label', s.label));
            var value = el.appendChild(h('span', 'bt-chatset-value')) as HTMLElement;
            var less = value.appendChild(h('span', 'bt-chatset-arrow', '‹')) as HTMLElement;
            var name = value.appendChild(h('span', 'bt-chatset-name')) as HTMLElement;
            var more = value.appendChild(h('span', 'bt-chatset-arrow', '›')) as HTMLElement;
            self.rows.push({ el: el, name: name, less: less, more: more });
        });
        this.panel.appendChild(h('div', 'bt-chatset-keys', ['Up / Down choose', 'Left / Right change', 'Back close'].join(GAP)));
        var hint = this.el.appendChild(h('div', 'bt-chatset-hint')) as HTMLElement;
        this.hintText = hint.appendChild(h('span', 'bt-chatset-hint-text')) as HTMLElement;
        setShown(this.el, false);
        parent.appendChild(this.el);
    }

    /** Shows the page at its first setting (over Settings: the example lines start) */
    open(): void {
        this.shown = true;
        this.at = 0;
        this.arranging = '';
        this.apply();
        setShown(this.el, true);
        if (this.chat) {
            for (var i = 0; i < EXAMPLES_FIRST; i++) {
                this.sendExample();
            }
        }
    }

    close(): void {
        if (!this.shown) {
            return;
        }
        if (this.arranging) {
            this.endArrange(false);
        }
        this.shine(null);
        this.shown = false;
        setShown(this.el, false);
        clearTimeout(this.exampleTimer);
        if (this.chat) {
            this.chat.reset();
        }
    }

    onKey(code: number): boolean {
        if (this.arranging) {
            this.arrangeKey(code);
            return true;
        }
        switch (code) {
            case KEY.UP:
            case KEY.DOWN:
                this.at = this.next(code === KEY.UP ? -1 : 1);
                this.draw();
                break;
            case KEY.LEFT:
            case KEY.RIGHT:
                this.step(code === KEY.LEFT ? -1 : 1, false);
                break;
            case KEY.OK:
                this.step(1, true);
                break;
            case KEY.BACK:
                this.close();
                break;
        }
        return true;
    }

    /** The setting by from the focused one that applies (stopping at the ends) */
    private next(by: number): number {
        for (var i = this.at + by; i >= 0 && i < this.settings.length; i += by) {
            if (applies(this.settings[i])) {
                return i;
            }
        }
        return this.at;
    }

    /** The focused setting's value moved by one, stopping at its ends (round: after the last the first); Move and
     * resize: OK starts it (not Right, which may still be held from choosing Custom) */
    private step(by: number, round: boolean): void {
        var s = this.settings[this.at];
        if (!s.name) {
            if (round) {
                this.startArrange();
            }
            return;
        }
        var count = s.values.length;
        var to = valueAt(s) + by;
        to = round ? (to + count) % count : Math.max(0, Math.min(count - 1, to));
        var value = s.values[to].value;
        if (value === valueOf(s)) {
            return;
        }
        if (s.name === 'chatShown') {
            setChatHidden(!value);
        } else if (s.name === 'chatOver') {
            setChatOver(value as boolean);
        } else {
            // A box of its own starts where the chat is now at a side over the video (else at the right)
            var now = chatLayout();
            if (value === 'custom' && !chatBox() && now.kind === 'side' && now.place) {
                setChatBox(now.place);
            }
            setChatPref(s.name, value);
        }
        this.apply();
        // Custom: on to Move and resize (the next setting), which shines a moment, so OK starts it
        if (value === 'custom') {
            this.at = this.next(1);
            this.shine(this.rows[this.at].el);
            this.draw();
        }
    }

    /** The chat laid out as now set (the player's, or the example's with its picture), the page drawn */
    private apply(box?: Box): void {
        if (this.changed) {
            this.changed(box);
        } else if (this.scene && this.picture && this.chat) {
            var at = chatLayout(box);
            var on = !chatHidden();
            this.scene.className = 'bt-chatset-scene ' + chatClasses();
            this.chat.place(at);
            this.chat.show(on);
            placeBox(this.picture, on ? at.video : WHOLE);
        }
        this.draw();
    }

    /** The values, the settings that apply (the focused one; its arrows dimmed at an end), the page on the side away
     * from the chat (below a strip at the top); moving it: the hint instead */
    private draw(): void {
        var self = this;
        if (!applies(this.settings[this.at])) {
            this.at = this.next(-1);
        }
        this.settings.forEach(function (s, i) {
            var row = self.rows[i];
            var at = valueAt(s);
            toggleClass(row.el, 'bt-chatset-row--hidden', !applies(s));
            toggleClass(row.el, 'bt-chatset-row--action', !s.name);
            setText(row.name, s.name ? s.values[at].name : 'Press OK');
            toggleClass(row.el, 'bt-chatset-row--focused', i === self.at);
            toggleClass(row.less, 'bt-chatset-arrow--end', !s.name || at === 0);
            toggleClass(row.more, 'bt-chatset-arrow--end', !!s.name && at === s.values.length - 1);
        });
        var at = chatLayout(this.arranging && this.box ? this.box : undefined);
        var place = at.place;
        // Twitch's column at the right has no place of its own (the stylesheet's)
        toggleClass(this.el, 'bt-chatset--right', !!place && place.left + place.width / 2 < LAYOUT_WIDTH / 2);
        toggleClass(this.el, 'bt-chatset--low', at.room.top > 0);
        toggleClass(this.el, 'bt-chatset--arranging', !!this.arranging);
        if (this.arranging && place) {
            setText(this.hintText, this.arranging === 'move' ? ['Move the chat', 'Arrows move', 'OK resize', 'Back cancel'].join(GAP) :
                ['Resize the chat ' + place.width + ' × ' + place.height, 'Left / Right width', 'Up / Down height', 'OK done', 'Back cancel'].join(GAP));
        }
    }

    /** row shines for SHINE_MS (null: none) */
    private shine(row: HTMLElement | null): void {
        var self = this;
        clearTimeout(this.shineTimer);
        if (this.shining) {
            toggleClass(this.shining, 'bt-chatset-row--shine', false);
        }
        this.shining = row;
        if (row) {
            // (its animation from the start)
            void row.offsetWidth;
            toggleClass(row, 'bt-chatset-row--shine', true);
            this.shineTimer = setTimeout(function () { self.shine(null); }, SHINE_MS) as unknown as number;
        }
    }

    /** Move and resize: the arrows move the chat (outlined), the page out of the way */
    private startArrange(): void {
        this.box = chatLayout().place;
        this.arranging = 'move';
        toggleClass(this.el.parentNode as HTMLElement, 'bt-chat-arranging', true);
        this.apply(this.box || undefined);
    }

    /** Moving or resizing by STEP (resizing: wider to the right, taller upwards with its bottom staying, as the newest
     * line is there), kept on the screen, shown as it goes; OK from moving to resizing, then done; Back puts it back */
    private arrangeKey(code: number): void {
        var b = this.box as Box;
        var next = { left: b.left, top: b.top, width: b.width, height: b.height };
        var resize = this.arranging === 'resize';
        switch (code) {
            case KEY.OK:
                if (resize) {
                    this.endArrange(true);
                } else {
                    this.arranging = 'resize';
                    this.draw();
                }
                return;
            case KEY.BACK:
                this.endArrange(false);
                return;
            case KEY.LEFT:
            case KEY.RIGHT:
                var by = code === KEY.LEFT ? -STEP : STEP;
                if (resize) {
                    next.width = Math.max(LEAST.width, next.width + by);
                } else {
                    next.left += by;
                }
                break;
            case KEY.UP:
            case KEY.DOWN:
                var down = code === KEY.DOWN ? STEP : -STEP;
                if (resize) {
                    var bottom = next.top + next.height;
                    next.height = Math.max(LEAST.height, next.height - down);
                    next.top = bottom - next.height;
                } else {
                    next.top += down;
                }
                break;
            default:
                return;
        }
        this.box = fitted(next);
        this.apply(this.box);
    }

    /** Done moving it (keep: the box stored; else as it was); the page again */
    private endArrange(keep: boolean): void {
        if (keep && this.box) {
            setChatBox(this.box);
        }
        this.arranging = '';
        this.box = null;
        toggleClass(this.el.parentNode as HTMLElement, 'bt-chat-arranging', false);
        this.apply();
    }

    /** The next example line; the one after it in EXAMPLE_MS while open */
    private sendExample(): void {
        var self = this;
        var line = exampleLine(this.sent++);
        if (this.chat && line) {
            this.chat.lines([line]);
        }
        clearTimeout(this.exampleTimer);
        this.exampleTimer = setTimeout(function () {
            if (self.shown) {
                self.sendExample();
            }
        }, EXAMPLE_MS) as unknown as number;
    }
}
