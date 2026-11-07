// QR codes and Twitch's QR pages, where the TV hands a task to the phone: Settings' Need Help?, Terms of Service,
// Privacy Policy and Cookies and Advertising Choices, Report Channel and Report Video, and the live player's "Join
// the conversation!". A page is Twitch's dark left half (a picture, the title, what to do, the address for the
// reports) beside the light right half with the code. The code opens Twitch's page with the referral tags Twitch's TV
// app adds. Codes are drawn as Twitch draws them: dark modules on the light panel, error correction L, no margin of
// their own, one SVG path (sharp at any size), each address once. The library is qrcode-generator (Kazuhiko Arase,
// MIT; vendor/qrcode.js), loaded when the first code is needed.

import { h, setShown, toggleClass } from '../../core/dom.js';
import { KEY } from '../../core/keys.js';
import { platform } from '../api/gql.js';
import { picture } from './art.js';
import { MenuMode, Navigator, Screen } from './navigator.js';

interface QrCode {
    addData(data: string): void;
    make(): void;
    getModuleCount(): number;
    isDark(row: number, col: number): boolean;
}

type QrFactory = (typeNumber: number, level: string) => QrCode;

var DARK = '#1f1f23';
/** The code's side on its panel: 1008 of 1080 px */
export var QR_SIZE = 672;
/** Codes drawn, kept for the pages that show them again */
var DRAWN_MAX = 12;

var loading: Promise<QrFactory> | null = null;
var drawn: { [text: string]: string } = {};
var drawnKeys: string[] = [];

/** The library, loaded once (a failed load is tried again on the next call) */
export function loadQr(): Promise<QrFactory> {
    var loaded = (window as unknown as { qrcode?: QrFactory }).qrcode;
    if (loaded) {
        return Promise.resolve(loaded);
    }
    if (!loading) {
        loading = new Promise<QrFactory>(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = 'vendor/qrcode.js';
            script.onload = function () {
                resolve((window as unknown as { qrcode: QrFactory }).qrcode);
            };
            script.onerror = function () {
                loading = null;
                reject();
            };
            document.head.appendChild(script);
        });
    }
    return loading;
}

/** The SVG of text's QR code, QR_SIZE square */
export function qrSvg(text: string): Promise<string> {
    if (drawn[text]) {
        return Promise.resolve(drawn[text]);
    }
    return loadQr().then(function (qrcode) {
        var qr = qrcode(0, 'L');
        qr.addData(text);
        qr.make();
        var n = qr.getModuleCount();
        // One run of dark modules per piece of the path
        var d = '';
        for (var row = 0; row < n; row++) {
            var col = 0;
            while (col < n) {
                if (!qr.isDark(row, col)) {
                    col++;
                    continue;
                }
                var start = col;
                while (col < n && qr.isDark(row, col)) {
                    col++;
                }
                d += 'M' + start + ' ' + row + 'h' + (col - start) + 'v1h' + (start - col) + 'z';
            }
        }
        var svg = '<svg viewBox="0 0 ' + n + ' ' + n + '" width="' + QR_SIZE + '" height="' + QR_SIZE + '" shape-rendering="crispEdges">' +
            '<path fill="' + DARK + '" d="' + d + '"/></svg>';
        if (drawnKeys.length >= DRAWN_MAX) {
            delete drawn[drawnKeys.shift() as string];
        }
        drawn[text] = svg;
        drawnKeys.push(text);
        return svg;
    });
}

/** The address a code opens: Twitch's page with the referral tags its TV app adds (content: the page's own name) */
export function qrAddress(url: string, content: string): string {
    return url + (url.indexOf('/', 8) < 0 ? '/' : '') + '?tt_content=' + content + '&tt_medium=starshot_' + platform();
}

export interface QrInfo {
    title: string;
    text: string;
    /** The page the code opens, and Twitch's name for the page that shows it (tt_content) */
    url: string;
    content: string;
    /** Its picture (art.ts) */
    picture: string;
    /** Shown under the text (the report pages) */
    address?: string;
    /** tall: Cookies' bigger picture; join: the live player's chat page, with its own Go Back */
    look?: 'tall' | 'join';
}

/** Settings' QR pages; listed: the address Settings' card names where Twitch words it otherwise */
export var SETTINGS_PAGES: { [id: string]: QrInfo & { listed?: string } } = {
    help: settingsPage('Need Help?', 'https://help.twitch.tv', 'help_page', 'hearts'),
    terms: settingsPage('Terms Of Service', 'https://www.twitch.tv/legal/terms-of-service', 'tos_page', 'pencil'),
    privacy: settingsPage('Privacy Policy', 'https://www.twitch.tv/p/legal/privacy-notice', 'privacy_page', 'lock'),
    cookies: settingsPage('Cookies and Advertising Choices', 'https://www.twitch.tv/settings/security', 'security_page', 'cookie')
};
SETTINGS_PAGES.terms.listed = 'https://www.twitch.tv/p/legal/terms-of-service';
SETTINGS_PAGES.cookies.look = 'tall';

function settingsPage(title: string, url: string, content: string, pic: string): QrInfo {
    return { title: title, text: 'Scan the QR code to open ' + url + ' on your mobile device', url: url, content: content, picture: pic };
}

export function reportChannel(login: string): QrInfo {
    var url = 'https://www.twitch.tv/' + login + '/report';
    return { title: 'Report Channel?', text: 'Scan the QR code to open the reporting flow on your mobile device', url: url,
        content: 'report_channel_page', picture: 'knight', address: url };
}

export function reportVideo(id: string): QrInfo {
    var url = 'https://www.twitch.tv/videos/' + id;
    return { title: 'Report Video?', text: 'Scan the QR code to report this video using the Twitch mobile app, or visit the URL in your ' +
        'desktop browser', url: url, content: 'report_vod_page', picture: 'knight', address: url };
}

export function joinChat(login: string): QrInfo {
    return { title: 'Join the conversation!', text: 'Scan the QR code on the right with your mobile device to start chatting...',
        url: 'https://www.twitch.tv/' + login + '/chat', content: 'join_conversation_modal', picture: 'knight', look: 'join' };
}

/** A QR page. The top menu's Go Back alone stands over it (focused: nothing else is), except on the chat page, which
 * has its own Go Back; OK on it and Back close the page */
export class QrPage implements Screen {
    el: HTMLElement;
    menu: MenuMode = 'back';
    menuFocus = true;
    private back: HTMLElement | null = null;
    private drawn = false;
    private code: HTMLElement;

    constructor(private info: QrInfo, private nav: Navigator) {
        this.el = h('div', 'bt-qr' + (info.look ? ' bt-qr--' + info.look : ''));
        var side = this.el.appendChild(h('div', 'bt-qr-side')) as HTMLElement;
        if (info.look === 'join') {
            this.back = side.appendChild(h('div', 'bt-button bt-button--plain bt-focused bt-qr-back', 'Go Back')) as HTMLElement;
            this.menu = 'none';
            this.menuFocus = false;
        }
        side.appendChild(h('div', 'bt-qr-pic')).appendChild(picture(info.picture));
        side.appendChild(h('div', 'bt-qr-title', info.title));
        var text = side.appendChild(h('div', 'bt-qr-text', info.text)) as HTMLElement;
        if (info.address) {
            text.appendChild(h('div', 'bt-qr-address', info.address));
        }
        this.code = this.el.appendChild(h('div', 'bt-qr-panel')).appendChild(h('div', 'bt-qr-code')) as HTMLElement;
        setShown(this.el, false);
    }

    show(): void {
        setShown(this.el, true);
        if (this.drawn) {
            return;
        }
        this.drawn = true;
        var self = this;
        qrSvg(qrAddress(this.info.url, this.info.content)).then(function (svg: string) {
            self.code.innerHTML = svg;
        }, function () {
            // The library did not load: asked again the next time the page shows
            self.drawn = false;
        });
    }

    hide(): void {
        setShown(this.el, false);
    }

    atTop(): boolean {
        return true;
    }

    setFocused(focused: boolean): void {
        if (this.back) {
            toggleClass(this.back, 'bt-focused', focused);
        }
    }

    onKey(code: number): boolean {
        if (this.back && code === KEY.OK) {
            this.nav.back();
            return true;
        }
        return false;
    }
}
