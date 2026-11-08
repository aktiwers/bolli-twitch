// Settings as Twitch's TV app has it: five cards (Your Profile, Need Help?, Terms of Service, Privacy Policy,
// Cookies and Advertising Choices), the first opening Your Profile, the others their QR pages. Under them Bolli's
// own group in the same cards: chat's gift and raid notices, the mature content warning, the stream request version,
// the remembered quality, and the version. OK changes a setting to its next choice (Left/Right step back and forth);
// it is saved at once and holds from the next start of a stream. The QR library loads when Settings first shows,
// ready for the QR pages.

import { h, setShown } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { extraNotices, setExtraNotices } from '../../chat/parse.js';
import { rememberedQuality, rememberQuality, setUsher, usherPref } from '../../player/session.js';
import { MenuMode, Navigator, Screen } from '../navigator.js';
import { setSkipsGate, skipsGate } from '../player/gate.js';
import { canStabilize, setStableVolume, stableVolume } from '../../player/stable-volume.js';
import { loadQr, QrPage, SETTINGS_PAGES } from '../qr.js';
import { Card, CardList } from './cards.js';
import { ProfileView } from './profile.js';

/** The first card's top: y 261 of 1080 */
var TOP = 174;

/** A Bolli setting: its card's icon (art.ts), its choices in order, the stored one, and what each means */
interface Setting {
    icon: string;
    title: string;
    values: string[];
    now(): string;
    set(value: string): void;
    /** The value as the card shows it, and the line under the title */
    label(value: string): string;
    line(value: string): string;
}

var TWITCH: (Card & { id: string })[] = [
    { id: 'profile', icon: 'profile', title: 'Your Profile', line: 'Visit your profile to sign in or out.' },
    { id: 'help', icon: 'help', title: 'Need Help?', line: 'Visit ' + listed('help') + ' for help.' },
    { id: 'terms', icon: 'terms', title: 'Terms of Service', line: 'Visit ' + listed('terms') + ' to view the Terms of Service.' },
    { id: 'privacy', icon: 'privacy', title: 'Privacy Policy', line: 'Visit ' + listed('privacy') + ' to view the Privacy Policy.' },
    { id: 'cookies', icon: 'cookies', title: 'Cookies and Advertising Choices',
        line: 'Visit ' + listed('cookies') + ' to change your Cookies and Advertising Choices.' }
];

/** The address a card names */
function listed(id: string): string {
    var page = SETTINGS_PAGES[id];
    return page.listed || page.url;
}

/** An on/off setting's value as the card shows it */
function onOff(v: string): string {
    return v === 'on' ? 'On' : 'Off';
}

var NOTICES: Setting = {
    icon: 'notices',
    title: 'Gift and Raid Notices',
    values: ['on', 'off'],
    now: function () { return extraNotices() ? 'on' : 'off'; },
    set: function (v) { setExtraNotices(v === 'on'); },
    label: onOff,
    line: function (v) {
        return v === 'on' ? 'Chat shows gift subs and raids too, which Twitch\'s TV app leaves out.' :
            'Chat shows subs and resubs only, as Twitch\'s TV app does.';
    }
};

var GATE: Setting = {
    icon: 'gate',
    title: 'Mature Content Warning',
    values: ['on', 'off'],
    now: function () { return skipsGate() ? 'off' : 'on'; },
    set: function (v) { setSkipsGate(v === 'off'); },
    label: onOff,
    line: function (v) {
        return v === 'on' ? 'Mature content asks "Just one second..." first, once per channel, as Twitch\'s TV app does.' :
            'Mature content plays at once; Twitch\'s age and region restrictions still apply.';
    }
};

var STABLE: Setting = {
    icon: 'volume',
    title: 'Stable Volume',
    values: ['on', 'off'],
    now: function () { return stableVolume() ? 'on' : 'off'; },
    set: function (v) { setStableVolume(v === 'on'); },
    label: onOff,
    line: function (v) {
        return v === 'on' ? 'Quiet streams come up and loud ones down, so streams play at about the same level.' :
            'Streams play as loud as each streamer sends them.';
    }
};

var USHER: Setting = {
    icon: 'usher',
    title: 'Stream Requests',
    values: ['', 'v1', 'v2'],
    now: usherPref,
    set: function (v) { setUsher(v as 'v1' | 'v2' | ''); },
    label: function (v) { return v || 'Auto'; },
    line: function (v) {
        return v ? 'Streams are asked from Twitch\'s usher ' + v + '.' : 'Streams are asked from usher v1, and from v2 when v1 fails.';
    }
};

/** Stable Volume only where it works (the Android app; the LG TV's own Auto Volume does it there) */
var SETTINGS = canStabilize() ? [NOTICES, GATE, STABLE, USHER] : [NOTICES, GATE, USHER];

/** The remembered quality as Twitch names it (1080p60, 720p), or '' for none */
function remembered(): string {
    var q = rememberedQuality();
    return q ? q.height + 'p' + (q.fps > 30 ? Math.round(q.fps) : '') : '';
}

export class SettingsView implements Screen {
    el: HTMLElement;
    /** Signing in or out from Your Profile ends at Home: the shell closes Settings and its pages */
    accountBound = true;
    /** Twitch shows only Go Back over it (no menu items) */
    menu: MenuMode = 'back';
    private cards: CardList;
    /** The first Bolli card */
    private bolli: number;

    constructor(private nav: Navigator) {
        this.el = h('div', 'bt-settings');
        this.cards = new CardList(TOP);
        for (var i = 0; i < TWITCH.length; i++) {
            this.cards.add(TWITCH[i]);
        }
        this.bolli = this.cards.length;
        for (var k = 0; k < SETTINGS.length; k++) {
            this.cards.add({ icon: SETTINGS[k].icon, title: SETTINGS[k].title, line: '', heading: k === 0 ? 'Bolli Twitch' : undefined });
        }
        this.cards.add({ icon: 'quality', title: 'Remembered Quality', line: '' });
        this.cards.add({ icon: 'version', title: 'Version', line: 'Bolli Twitch ' + (document.documentElement.getAttribute('data-version') || '') });
        this.el.appendChild(this.cards.el);
        this.el.appendChild(h('div', 'bt-set-cover'));
        setShown(this.el, false);
        this.label();
    }

    show(): void {
        setShown(this.el, true);
        // The player may have remembered a quality meanwhile
        this.label();
        loadQr().then(null, function () { /* tried again by the QR page */ });
    }

    hide(): void {
        setShown(this.el, false);
    }

    atTop(): boolean {
        return this.cards.index === 0;
    }

    setFocused(focused: boolean): void {
        this.cards.setFocused(focused);
    }

    onKey(code: number): boolean {
        var i = this.cards.index;
        if (code === KEY.UP || code === KEY.DOWN) {
            // Up from the first card is the shell's (the menu)
            return this.cards.move(code === KEY.UP ? -1 : 1) || code === KEY.DOWN;
        }
        var setting = SETTINGS[i - this.bolli];
        if (code === KEY.LEFT || code === KEY.RIGHT) {
            if (setting) {
                this.step(setting, code === KEY.LEFT ? -1 : 1);
            }
            return true;
        }
        if (code !== KEY.OK) {
            return false;
        }
        if (i < TWITCH.length) {
            var id = TWITCH[i].id;
            this.nav.push(id === 'profile' ? new ProfileView(this.nav) : new QrPage(SETTINGS_PAGES[id], this.nav));
        } else if (setting) {
            this.step(setting, 1);
        } else if (i === this.bolli + SETTINGS.length && remembered()) {
            rememberQuality(null);
            this.label();
        }
        return true;
    }

    /** The setting's next choice (delta 1) or the one before (-1), round */
    private step(setting: Setting, delta: number): void {
        var values = setting.values;
        setting.set(values[(values.indexOf(setting.now()) + delta + values.length) % values.length]);
        this.label();
    }

    /** The Bolli cards' values and lines as stored now */
    private label(): void {
        for (var k = 0; k < SETTINGS.length; k++) {
            var s = SETTINGS[k];
            var v = s.now();
            this.cards.update(this.bolli + k, s.title, s.line(v), s.label(v));
        }
        var q = remembered();
        this.cards.update(this.bolli + SETTINGS.length, 'Remembered Quality', q ? 'New streams start at ' + q + '. OK forgets it: they start at Auto.' :
            'New streams start at Auto: no quality is remembered.', q || 'Auto');
    }
}
