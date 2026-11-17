// The commercial break's card over the picture: shown only when every player type has the channel's break (the
// session finds no stream without it). The stream's last picture stays; the card says how long until it is back, as
// Twitch's ad markers tell it, with a bar. Back and the chat work as always.

import { h, setShown, setText } from '../../../core/dom.js';
import { BreakLeft } from '../../player/session.js';

/** The countdown's step (ms): it runs only while the card shows */
var TICK_MS = 1000;

export class BreakBadge {
    el: HTMLElement;
    private line: HTMLElement;
    private fill: HTMLElement;
    private timer = 0;
    private left: BreakLeft | null = null;
    /** The break's length as first told (ms): the bar's whole */
    private whole = 0;

    constructor() {
        this.el = h('div', 'bt-pl-break');
        this.el.appendChild(h('div', 'bt-pl-break-title', 'Commercial break'));
        this.line = this.el.appendChild(h('div', 'bt-pl-break-line')) as HTMLElement;
        var bar = this.el.appendChild(h('div', 'bt-pl-break-bar')) as HTMLElement;
        this.fill = bar.appendChild(h('div', 'bt-pl-break-fill')) as HTMLElement;
        setShown(this.el, false);
    }

    /** Shows the card, or tells it anew what is left (none: not told) */
    show(left?: BreakLeft): void {
        if (left) {
            var ms = left.endsAt - Date.now();
            if (!this.left || ms > this.whole) {
                this.whole = Math.max(ms, 1);
            }
            this.left = left;
        }
        if (!this.timer) {
            setShown(this.el, true);
            var self = this;
            this.timer = setInterval(function () { self.tick(); }, TICK_MS) as unknown as number;
        }
        this.tick();
    }

    hide(): void {
        clearInterval(this.timer);
        this.timer = 0;
        this.left = null;
        this.whole = 0;
        setShown(this.el, false);
    }

    private tick(): void {
        var left = this.left;
        var ms = left ? left.endsAt - Date.now() : 0;
        var s = Math.ceil(ms / 1000);
        setText(this.line, s > 0 ? 'Back in ' + Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60) : 'Back in a moment');
        var done = left ? 1 - Math.max(0, ms) / this.whole : 0;
        this.fill.style.webkitTransform = this.fill.style.transform = 'scaleX(' + Math.min(1, Math.max(0, done)).toFixed(3) + ')';
    }
}
