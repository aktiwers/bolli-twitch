// A past broadcast's chat played along with it: its messages (api/comments.ts) go to the panel as the video reaches
// the second each was sent at, as if live. It runs only while the video plays with the chat in sight: every TICK_MS
// it hands over what is due, and asks for the next page once fewer than AHEAD_S of messages are held, so a page is in
// before it is needed. A jump (a seek: the position more than JUMP_S back, or more than JUMP_S ahead of where playing on
// since the last look would have taken it; a position that stands still is none) starts again
// from there: the panel emptied, the page from a little before it asked, and the messages of the last BEFORE_S shown
// at once, as a chat joined there would have them. A request that fails is asked again after RETRY_MS, twice, then not
// until the next jump. A recording that still goes on (a live stream rewound) has more chat than its last page said:
// once the video is past the last message held, it is asked again from there, every GROWING_MS at most.

import { CommentPage, Comment } from '../api/comments.js';
import { loadBadges } from './assets.js';
import { IrcLine } from './irc.js';
import { ChatEvents } from './types.js';

var TICK_MS = 500;
/** Seconds of messages held ahead of the video before the next page is asked */
var AHEAD_S = 15;
/** Seconds before a jump's place whose messages show at once */
var BEFORE_S = 20;
/** The position this far back, or this far past where playing on would have taken it: a jump */
var JUMP_S = 5;
var RETRY_MS = 5000;
var GROWING_MS = 10000;
var TRIES = 3;

/** Asks a page: from a second of the video, or after a cursor */
export type AskComments = (from: { offset?: number; cursor?: string }) => Promise<CommentPage>;

export class ChatReplay {
    /** Messages held, in the video's order, and the next one to hand over */
    private held: Comment[] = [];
    private index = 0;
    /** The first page since the last start came; the following page's cursor ('' none: the chat's end, or none asked
     * yet); the position at the last look (-1: none since it stopped) */
    private started = false;
    private next = '';
    private lastAt = -1;
    /** The second handed over up to; the second the first page since the last start was asked for (-1: none yet);
     * when the last look was */
    private handedTo = 0;
    private aim = -1;
    private lookedAt = 0;
    /** Whether held reaches the chat's end (else: up to its last message) */
    private complete = false;
    /** A request is out (answers of an earlier start are dropped: run counts the starts) */
    private asking = false;
    private run = 0;
    private fails = 0;
    private retryAt = 0;
    private timer = 0;
    private login = '';
    private ask: AskComments | null = null;
    /** The video still records: its chat's end is only the end so far; when it may be asked again */
    private growing = false;
    private againAt = 0;

    constructor(private events: ChatEvents, private position: () => number) {
    }

    /** The video's chat, from wherever the video is when it runs; growing: the video still records */
    open(login: string, ask: AskComments, growing?: boolean): void {
        this.login = login.toLowerCase();
        this.ask = ask;
        this.growing = !!growing;
        this.drop();
        loadBadges(this.login);
    }

    /** Runs while the video plays with the chat in sight; stopped, it holds what it has */
    running(on: boolean): void {
        if (on === !!this.timer || !this.ask) {
            return;
        }
        clearInterval(this.timer);
        this.timer = 0;
        this.lastAt = -1;
        if (on) {
            var self = this;
            this.timer = setInterval(function () {
                self.tick();
            }, TICK_MS) as unknown as number;
            this.tick();
        }
    }

    close(): void {
        this.running(false);
        this.ask = null;
        this.run++;
    }

    /** Hands over what is due, starts again after a jump, asks ahead */
    tick(): void {
        var at = this.position();
        var now = Date.now();
        // (since it stopped, the position may have moved anyway: looked at against the messages handed over, or before
        // the first page against where that was asked for; nothing asked yet, nothing to jump from)
        var was = this.lastAt >= 0 ? this.lastAt : this.started ? this.handedTo : this.aim;
        var played = this.lastAt >= 0 ? (now - this.lookedAt) / 1000 : 0;
        if (was >= 0 && (at < was - JUMP_S || at > was + played + JUMP_S)) {
            this.drop();
        }
        this.lastAt = at;
        this.lookedAt = now;
        var end = this.held.length ? this.held[this.held.length - 1].at : -1;
        if (!this.started) {
            if (!this.asking && this.mayAsk()) {
                this.fetch({ offset: Math.max(0, at - BEFORE_S) }, at);
            }
            return;
        }
        this.handOver(at);
        if (!this.complete && !this.asking && this.next && end - at < AHEAD_S && this.mayAsk()) {
            this.fetch({ cursor: this.next }, -1);
        } else if (this.complete && this.growing && !this.asking && at > end && now >= this.againAt && this.mayAsk()) {
            this.againAt = now + GROWING_MS;
            // (from the last message held, never further back than a start shows: none held, from there)
            this.fetch({ offset: Math.max(0, end, at - BEFORE_S) }, -1);
        }
    }

    /** The panel emptied and everything held let go: started again from the next tick's position */
    private drop(): void {
        this.run++;
        this.held = [];
        this.index = 0;
        this.started = false;
        this.handedTo = 0;
        this.aim = -1;
        this.next = '';
        this.complete = false;
        this.asking = false;
        this.fails = 0;
        this.retryAt = 0;
        this.againAt = 0;
        this.events.reset(this.login);
    }

    private mayAsk(): boolean {
        return this.fails < TRIES && Date.now() >= this.retryAt;
    }

    /** One page; from: the second it started at (a new start: those up to there show at once), else -1 */
    private fetch(where: { offset?: number; cursor?: string }, from: number): void {
        var self = this;
        var run = this.run;
        this.asking = true;
        if (from >= 0) {
            this.aim = from;
        }
        (this.ask as AskComments)(where).then(function (page: CommentPage) {
            if (run !== self.run) {
                return;
            }
            self.asking = false;
            self.fails = 0;
            self.take(page, from);
        }, function () {
            if (run !== self.run) {
                return;
            }
            self.asking = false;
            self.fails++;
            self.retryAt = Date.now() + RETRY_MS;
        });
    }

    private take(page: CommentPage, from: number): void {
        var last = this.held.length ? this.held[this.held.length - 1].at : -Infinity;
        // (a page asked from a second starts a little before it: nothing held twice; the newest held have their ids)
        var had: { [id: string]: boolean } = {};
        for (var k = this.held.length - 1; k >= 0 && this.held[k].at === last; k--) {
            had[this.held[k].line.tags.id] = true;
        }
        for (var i = 0; i < page.comments.length; i++) {
            var c = page.comments[i];
            if (c.at > last || c.at === last && !had[c.line.tags.id]) {
                this.held.push(c);
            }
        }
        this.next = page.next;
        this.complete = !page.next;
        if (from >= 0) {
            // Those before the start that is now are history: skipped over, only the last BEFORE_S shown
            while (this.index < this.held.length && this.held[this.index].at < from - BEFORE_S) {
                this.index++;
            }
            this.started = true;
            this.handOver(Math.max(from, this.position()));
        }
    }

    /** The messages up to second at, to the panel in one go */
    private handOver(at: number): void {
        var due: IrcLine[] = [];
        while (this.index < this.held.length && this.held[this.index].at <= at) {
            due.push(this.held[this.index].line);
            this.index++;
        }
        this.handedTo = at;
        // What was handed over is not needed again (the newest kept: where the messages held end)
        if (this.index > 200) {
            var cut = Math.min(this.index, this.held.length - 1);
            this.held = this.held.slice(cut);
            this.index -= cut;
        }
        if (due.length) {
            this.events.lines(due);
        }
    }
}
