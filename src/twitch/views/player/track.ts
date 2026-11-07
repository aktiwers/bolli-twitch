// The progress track of past broadcasts and clips as Twitch's TV app draws it: the bar with its purple part, the white
// knob (the focus lands on it) with the time under it, and the length at the bar's end. Seeking is Twitch's: Left and
// Right pause and move a pending position STEP_S per press, faster the longer the key is held, never past the start
// or the end; OK commits it. Everything moves by transforms (no layout while seeking or playing).

import { h, setText, toggleClass } from '../../../core/dom.js';
import { clock } from '../../../core/time.js';

var STEP_S = 10;
/** Presses closer than this are one held key */
var HELD_GAP_MS = 300;
/** A held key speeds up after this, doubling the step every DOUBLE_MS */
var SPEED_UP_MS = 400;
var DOUBLE_MS = 300;

export class Track {
    el: HTMLElement;
    knob: HTMLElement;
    /** The position being chosen (s), null when none */
    pending: number | null = null;
    private fill: HTMLElement;
    private mover: HTMLElement;
    private elapsed: HTMLElement;
    private total: HTMLElement;
    private duration = 0;
    private lastStep = 0;
    private heldSince = 0;
    private heldDir = 0;

    constructor() {
        this.el = h('div', 'bt-pl-track');
        var bar = this.el.appendChild(h('div', 'bt-pl-bar')) as HTMLElement;
        this.fill = bar.appendChild(h('div', 'bt-pl-fill')) as HTMLElement;
        this.mover = bar.appendChild(h('div', 'bt-pl-mover')) as HTMLElement;
        this.knob = this.mover.appendChild(h('div', 'bt-pl-knob')) as HTMLElement;
        this.elapsed = this.mover.appendChild(h('div', 'bt-pl-elapsed')) as HTMLElement;
        this.total = this.el.appendChild(h('div', 'bt-pl-total')) as HTMLElement;
        this.draw(0);
    }

    /** The video's length (s); 0 while not known */
    setDuration(seconds: number): void {
        if (seconds > 0 && Math.round(seconds) !== Math.round(this.duration)) {
            this.duration = seconds;
            setText(this.total, clock(seconds));
        }
    }

    /** Where it plays (s): drawn unless a position is being chosen */
    setPosition(seconds: number): void {
        if (this.pending === null) {
            this.draw(seconds);
        }
    }

    setFocused(on: boolean): void {
        toggleClass(this.knob, 'bt-focused', on);
    }

    /** A Left (-1) or Right (1) press at now from position (s): the pending position, moved */
    step(dir: number, position: number, now: number): number {
        if (dir !== this.heldDir || now - this.lastStep > HELD_GAP_MS) {
            this.heldSince = now;
            this.heldDir = dir;
        }
        this.lastStep = now;
        var held = now - this.heldSince;
        var max = Math.max(3 * STEP_S, this.duration / 20);
        var step = held <= SPEED_UP_MS ? STEP_S : Math.min(max, STEP_S * Math.pow(2, (held - SPEED_UP_MS) / DOUBLE_MS));
        var from = this.pending === null ? position : this.pending;
        var to = Math.max(0, from + dir * step);
        if (this.duration > 0) {
            to = Math.min(to, this.duration);
        }
        this.pending = to;
        this.draw(to);
        return to;
    }

    /** The pending position, now no longer pending (null when there was none) */
    commit(): number | null {
        var at = this.pending;
        this.pending = null;
        this.heldDir = 0;
        return at;
    }

    private draw(seconds: number): void {
        var f = this.duration > 0 ? Math.max(0, Math.min(1, seconds / this.duration)) : 0;
        this.fill.style.webkitTransform = 'scaleX(' + f + ')';
        this.mover.style.webkitTransform = 'translate3d(' + f * 100 + '%,0,0)';
        setText(this.elapsed, clock(seconds));
    }
}
