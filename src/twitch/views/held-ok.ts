// A held OK repeats its keydown (core/keys.ts passes one every 80 ms or more), so after OK opened a screen or moved
// focus into one, the repeats would act on what is focused there (open a tile). The shell latches OK after such a
// navigation and ignores it until OK is released: its keyup (Android: bolliKey's release), another key, the app
// hidden, or a pause longer than a remote waits before its first repeat (a release that never came). A screen whose
// OK changed things in place (a follow, results in place of the keyboard) asks the same with holdOk().

import { KEY } from '../../core/keys.js';

/** Longer than a remote's delay before its first repeat (about 500 ms on webOS and Android) */
var GAP_MS = 700;

/** The shell's (the one watching the keys): what holdOk() latches */
var shell: HeldOk | null = null;

/** A screen's OK press changed what the next OK does there (Follow became Unfollow, the results replaced the
 * keyboard): the press's repeats are ignored until OK is released. Does nothing outside an OK press (Back, a reply) */
export function holdOk(): void {
    if (shell && shell.pressing === KEY.OK) {
        shell.latch(Date.now());
    }
}

export class HeldOk {
    /** The key being handled now (0 between keys) */
    pressing = 0;
    private latched = false;
    private last = 0;

    /** OK did a navigation at now: its repeats are ignored until it is released */
    latch(now: number): void {
        this.latched = true;
        this.last = now;
    }

    /** OK was released */
    release(): void {
        this.latched = false;
    }

    /** A key at now: true for a held OK's repeat (ignored); any other key releases OK */
    ignore(code: number, now: number): boolean {
        if (code !== KEY.OK || now - this.last >= GAP_MS) {
            this.latched = false;
        }
        if (!this.latched) {
            return false;
        }
        this.last = now;
        return true;
    }

    /** handle() for the key code: holdOk() inside it latches when the key is OK */
    during(code: number, handle: () => boolean): boolean {
        this.pressing = code;
        try {
            return handle();
        } finally {
            this.pressing = 0;
        }
    }

    /** Releases OK on its keyup, on the Android app's release (after initKeys(), which sets bolliKey) and when the
     * app is hidden; holdOk() latches this one from now on */
    watch(): void {
        var self = this;
        shell = this;
        var release = function (): void {
            self.release();
        };
        document.addEventListener('keyup', function (e: KeyboardEvent) {
            if (e.keyCode === KEY.OK) {
                release();
            }
        }, true);
        document.addEventListener('visibilitychange', release, false);
        var page = window as unknown as { bolliKey?: (code: number, isUp?: boolean) => void };
        var pass = page.bolliKey;
        if (pass) {
            page.bolliKey = function (code: number, isUp?: boolean): void {
                if (isUp && code === KEY.OK) {
                    release();
                }
                (pass as (code: number, isUp?: boolean) => void)(code, isUp);
            };
        }
    }
}
