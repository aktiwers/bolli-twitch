// Sign In as Twitch's TV app draws it: the left half purple at the top ("Join the Twitch community!", the QR prompt)
// and dark below (the activate address and the code, large), the "OR" circle between them, and the light right half
// with the QR code that opens the activate page with the code filled in. The token is asked for while the page is
// shown; leaving the page (or hiding the app) stops that, and coming back goes on
// with the same code while it lasts. A code that ran out or was refused is replaced by a new one. While no code is
// there (the first, one asked again, or no answer) Twitch's page spinner shows alone, never an old code. On success
// the shell's account change takes over (the menu, then Home). The code is only drawn, never logged.

import { h, setShown, setText, toggleClass } from '../../../core/dom.js';
import { RESUME_MS, SignIn, startSignIn } from '../../api/auth.js';
import { MenuMode, Screen } from '../navigator.js';
import { loadQr, qrSvg } from '../qr.js';

var ACTIVATE = 'https://www.twitch.tv/activate';
/** No code came (no answer): asked again after this, doubling up to RETRY_MAX_MS */
var RETRY_MS = 5000;
var RETRY_MAX_MS = 60000;

export class SignInView implements Screen {
    el: HTMLElement;
    /** Signed in, it closes (a section: it leaves the menu) */
    accountBound = true;
    /** Twitch shows the menu's Go Back alone over it, focused (nothing on it takes focus) */
    menu: MenuMode = 'back';
    menuFocus = true;
    private uri: HTMLElement;
    private code: HTMLElement;
    private qr: HTMLElement;
    /** The address the QR code shows ('' none) */
    private drawnQr = '';
    /** When the code drawn runs out (0: none drawn) */
    private ends = 0;
    private shown = false;
    /** Raised by every ask and stop: answers of an older one are dropped */
    private asking = 0;
    private signIn: SignIn | null = null;
    private failed = false;
    private retryMs = RETRY_MS;
    private retryTimer = 0;
    private onVisible: () => void;

    /** start: where codes come from (the tests give their own) */
    constructor(private start: () => Promise<SignIn> = startSignIn) {
        this.el = h('div', 'bt-sign bt-sign--loading');
        var left = this.el.appendChild(h('div', 'bt-sign-left')) as HTMLElement;
        var top = left.appendChild(h('div', 'bt-sign-top')) as HTMLElement;
        top.appendChild(h('div', 'bt-sign-join', 'Join the Twitch community!'));
        top.appendChild(h('div', 'bt-sign-scan', 'Scan the QR code on the right with your mobile device...'));
        left.appendChild(h('div', 'bt-sign-or', 'OR'));
        var visit = left.appendChild(h('div', 'bt-sign-visit')) as HTMLElement;
        visit.appendChild(h('div', '', 'visit'));
        this.uri = visit.appendChild(h('div', '', ACTIVATE)) as HTMLElement;
        visit.appendChild(h('div', '', 'and enter this 8 digit code'));
        this.code = left.appendChild(h('div', 'bt-sign-code')) as HTMLElement;
        this.qr = this.el.appendChild(h('div', 'bt-sign-panel')).appendChild(h('div', 'bt-sign-qr')) as HTMLElement;
        this.el.appendChild(h('div', 'bt-sign-spin'));
        setShown(this.el, false);
        var self = this;
        this.onVisible = function () {
            if (!document.hidden && self.shown && !self.signIn) {
                self.resume();
            }
        };
        // The QR library loads while the code is asked
        loadQr().then(null, function () { /* tried again when the code is drawn */ });
    }

    show(): void {
        if (this.shown) {
            return;
        }
        this.shown = true;
        setShown(this.el, true);
        document.addEventListener('visibilitychange', this.onVisible, false);
        this.resume();
    }

    hide(): void {
        this.shown = false;
        setShown(this.el, false);
        document.removeEventListener('visibilitychange', this.onVisible, false);
        this.stop();
    }

    destroy(): void {
        this.hide();
    }

    atTop(): boolean {
        return true;
    }

    onKey(): boolean {
        return false;
    }

    /** The network is back: a code that did not come is asked at once */
    retry(): boolean {
        if (this.failed && this.shown) {
            this.retryMs = RETRY_MS;
            this.ask();
        }
        return false;
    }

    /** Back on the page: the code drawn goes on while api/auth.ts would resume it; one with less left (or none) goes
     * from the screen while a new one is asked */
    private resume(): void {
        if (this.ends - Date.now() <= RESUME_MS) {
            this.clear();
        }
        this.ask();
    }

    /** A code (the same one while it lasts), then its end: run out or refused, a new one */
    private ask(): void {
        this.stop();
        var call = this.asking;
        var self = this;
        this.start().then(function (signIn) {
            if (call !== self.asking) {
                signIn.cancel();
                return;
            }
            self.failed = false;
            self.retryMs = RETRY_MS;
            self.signIn = signIn;
            self.draw(signIn);
            signIn.done.then(function (ok) {
                if (call !== self.asking) {
                    return;
                }
                self.signIn = null;
                // Hidden app: asked again when it shows (onVisible); signed in: the shell takes over
                if (!ok && self.shown && !document.hidden) {
                    self.clear();
                    self.ask();
                }
            });
        }, function () {
            if (call !== self.asking) {
                return;
            }
            // No new code: the old one (run out, or about to) is not polled
            self.clear();
            self.failed = true;
            self.retryTimer = setTimeout(function () {
                self.ask();
            }, self.retryMs) as unknown as number;
            self.retryMs = Math.min(RETRY_MAX_MS, self.retryMs * 2);
        });
    }

    /** Stops asking: the code stays with api/auth.ts for a return */
    private stop(): void {
        this.asking++;
        clearTimeout(this.retryTimer);
        if (this.signIn) {
            this.signIn.cancel();
            this.signIn = null;
        }
    }

    /** No code to show (it ended, or none came): the spinner until the next one comes */
    private clear(): void {
        setText(this.code, '');
        this.qr.innerHTML = '';
        this.drawnQr = '';
        this.ends = 0;
        toggleClass(this.el, 'bt-sign--loading', true);
    }

    /** The code and its QR code (the same address again: left as it is) */
    private draw(signIn: SignIn): void {
        this.ends = Date.now() + signIn.expiresIn * 1000;
        toggleClass(this.el, 'bt-sign--loading', false);
        setText(this.uri, signIn.uri || ACTIVATE);
        setText(this.code, signIn.code);
        if (signIn.qr === this.drawnQr) {
            return;
        }
        var call = this.asking;
        var self = this;
        qrSvg(signIn.qr).then(function (svg) {
            if (call === self.asking) {
                self.qr.innerHTML = svg;
                self.drawnQr = signIn.qr;
            }
        }, function () { /* the library did not load: the code beside it still works */ });
    }
}
