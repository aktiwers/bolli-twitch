// The still behind the loading sign while a player starts: its tile's picture (already loaded), then a sharper one
// swapped in once it is in, filling the picture's box. It goes once the video's time moves (the TV's first frame
// stands a moment after 'playing'), with a short fade. Not shown, it is display:none: an opaque layer left at
// opacity 0 over the video stops the TV drawing the video.

import { h, toggleClass } from '../../../core/dom.js';

/** The video's time moves this far past where it began to play before the still goes (s) */
var MOVE_S = 0.15;
/** The still's fade (player.css .bt-pl-still--out) */
var FADE_MS = 300;
/** How often the video's time is read while the still waits for it to move */
var WATCH_MS = 50;
/** Reads before the still goes anyway: a video that says it plays with its time standing this long (10 s, past the
 * TV's slowest first frame) is stuck, and the reads would run on for as long as the player stays open */
var WATCH_READS = 200;

export class Still {
    el: HTMLElement;
    /** Shown, or fading out */
    shown = false;
    /** A still may still show: the player has not had a moving picture since it opened */
    private wanted = false;
    /** The rank of the picture shown (later pictures are sharper), -1 none */
    private rank = -1;
    private loads: HTMLImageElement[] = [];
    private timer = 0;
    private out = false;

    /** position: the video's time; shownChanged: the still shows (true) or starts to go */
    constructor(private position: () => number, private shownChanged: (on: boolean) => void) {
        this.el = h('div', 'bt-pl-still');
        this.el.style.display = 'none';
    }

    /** The player opens with no moving picture: these pictures (best last) show as each comes in */
    open(urls: string[]): void {
        this.wanted = true;
        this.offer(urls);
    }

    /** More pictures for an open still (the video's or clip's page came with one), best last */
    offer(urls: string[]): void {
        if (!this.wanted) {
            return;
        }
        var self = this;
        urls.forEach(function (url: string, rank: number) {
            var img = new Image();
            img.onload = function () {
                img.onload = null;
                if (self.wanted && !self.out && rank > self.rank) {
                    self.rank = rank;
                    self.el.style.backgroundImage = 'url("' + url + '")';
                    if (!self.shown) {
                        self.shown = true;
                        self.el.style.display = '';
                        self.shownChanged(true);
                    }
                }
            };
            img.src = url;
            self.loads.push(img);
        });
    }

    /** The picture moves (true): the still goes once the time moves MOVE_S, counted from the last jump, or after
     * WATCH_READS; it waits again (false: buffering, paused) */
    moving(on: boolean): void {
        if (this.out) {
            return;
        }
        clearInterval(this.timer);
        this.timer = 0;
        if (!on) {
            return;
        }
        if (!this.shown) {
            // Nothing in yet: no still for this start any more
            this.drop();
            return;
        }
        var self = this;
        var from = this.position();
        var last = from;
        var reads = 0;
        this.timer = setInterval(function () {
            var t = self.position();
            if (t < last || t > last + 1) {
                from = t;
            }
            last = t;
            if (t > from + MOVE_S || ++reads >= WATCH_READS) {
                self.fadeOut();
            }
        }, WATCH_MS) as unknown as number;
    }

    /** Gone at once, and its pictures let go */
    drop(): void {
        clearInterval(this.timer);
        clearTimeout(this.timer);
        this.timer = 0;
        this.wanted = false;
        this.rank = -1;
        this.loads.forEach(function (img: HTMLImageElement) {
            img.onload = null;
        });
        this.loads = [];
        var was = this.shown && !this.out;
        this.shown = false;
        this.out = false;
        toggleClass(this.el, 'bt-pl-still--out', false);
        this.el.style.display = 'none';
        this.el.style.backgroundImage = '';
        if (was) {
            this.shownChanged(false);
        }
    }

    private fadeOut(): void {
        clearInterval(this.timer);
        this.out = true;
        this.wanted = false;
        toggleClass(this.el, 'bt-pl-still--out', true);
        this.shownChanged(false);
        var self = this;
        this.timer = setTimeout(function () {
            self.drop();
        }, FADE_MS) as unknown as number;
    }
}
