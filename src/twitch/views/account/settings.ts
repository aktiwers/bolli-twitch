// Settings in the cards of Twitch's TV app, in groups under headings: Your Profile alone at the top, then Playback
// (the remembered quality, Stable Volume on Android, the start dim, the stream request version, the channel page's
// preview, the mature content warning), Chat (live chat's settings page over an example, gift and raid notices, the
// channel points' bonus), Favorites (the tab's two rows and its previews), Twitch (its four QR pages), and last, set a
// little apart, the check for new versions and the version, which also names a newer one that is out. OK changes a
// setting to its next choice (Left/Right step back and forth); it is saved at once and holds from the next start of
// a stream. The QR library loads when Settings first shows, ready for the QR pages.

import { h, setShown } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { android } from '../../../core/platform.js';
import { claimsBonus, setClaimsBonus } from '../../api/points.js';
import { CheckMode, hasVersionCheck, newerVersion, setVersionCheck, updateHint, versionCheck } from '../../api/version-check.js';
import { extraNotices, setExtraNotices } from '../../chat/parse.js';
import { rememberedQuality, rememberQuality, setUsher, usherPref } from '../../player/session.js';
import { keepPreview, setKeepPreview } from '../channel/keep-preview.js';
import { favoritePreviews, setFavoritePreviews } from '../favorites/grid-preview.js';
import { setShowsAllRow, setShowsLiveRow, showsAllRow, showsLiveRow } from '../favorites/rows-shown.js';
import { MenuMode, Navigator, Screen } from '../navigator.js';
import { ChatSettings, chatSummary } from '../player/chat-settings.js';
import { setStartDim, startDim } from '../player/start-dim.js';
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
    /** OK opens a page (no values to step through) */
    page?: boolean;
}

/** Twitch's cards, each opening its page: Your Profile, and the QR pages */
var PROFILE: Card = { icon: 'profile', title: 'Your Profile', line: 'Visit your profile to sign in or out.' };
var TWITCH: (Card & { id: string })[] = [
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

/** A setting that is on or off: get and set it, and the line under the title for each */
function onOffCard(icon: string, title: string, get: () => boolean, set: (on: boolean) => void, onLine: string, offLine: string): Setting {
    return {
        icon: icon,
        title: title,
        values: ['on', 'off'],
        now: function () { return get() ? 'on' : 'off'; },
        set: function (v) { set(v === 'on'); },
        label: onOff,
        line: function (v) { return v === 'on' ? onLine : offLine; }
    };
}

var NOTICES = onOffCard('notices', 'Gift and Raid Notices', extraNotices, setExtraNotices,
    'Chat shows gift subs and raids too, which Twitch\'s TV app leaves out.', 'Chat shows subs and resubs only, as Twitch\'s TV app does.');

/** The live chat settings page (chat-settings.ts): its values in the card's line, OK opens it over Settings */
var CHAT: Setting = {
    icon: 'layout',
    title: 'Live Chat',
    values: [],
    now: function () { return ''; },
    set: function () { return undefined; },
    label: function () { return ''; },
    line: function () { return chatSummary() + '. OK changes it, with an example behind it.'; },
    page: true
};

var DIM = onOffCard('dim', 'Start Dim', startDim, setStartDim,
    'A player opens with its info over a dimmed picture for a moment, as in Twitch\'s TV app.',
    'A player opens on a clear picture; keys act at once and show its info.');

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

var STABLE = onOffCard('volume', 'Stable Volume', stableVolume, setStableVolume,
    'Quiet streams come up and loud ones down, so streams play at about the same level.', 'Streams play as loud as each streamer sends them.');

var POINTS = onOffCard('points', 'Channel Points Bonus', claimsBonus, setClaimsBonus,
    'Signed in, the bonus Twitch offers as you watch a live stream is claimed for you.', 'The bonus is left unclaimed, as in Twitch\'s TV app.');

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

/** The channel page's preview while focus is in its rows: kept in view, or covered by the shrinking header as in
 * Twitch's TV app (its sound goes on) */
var PREVIEW = onOffCard('pip', 'Keep Preview on Channel Page', keepPreview, setKeepPreview,
    'On a channel\'s page, its live preview stays in view beside the header while you browse its videos.',
    'On a channel\'s page, the header covers its live preview while you browse its videos, as in Twitch\'s TV app.');

/** The Favorites tab's rows above Latest Broadcasts; with both off the grid is the whole tab */
var LIVE_ROW = onOffCard('rowlive', 'Live Now Row', showsLiveRow, setShowsLiveRow,
    'Favorites shows the favorites that are live in a row of their own.', 'Favorites leaves the Live Now row out.');

var ALL_ROW = onOffCard('rowall', 'All Favorites Row', showsAllRow, setShowsAllRow,
    'Favorites shows every favorite in a row, live or not.',
    'Favorites leaves the All Favorites row out; hold OK on a broadcast to manage its channel.');

var FAV_PREVIEWS = onOffCard('pip', 'Favorites Previews', favoritePreviews, setFavoritePreviews,
    'On Favorites, a past broadcast plays in its tile, with sound, once focus rests on it.',
    'Favorites shows pictures only; OK still starts a past broadcast at once.');

/** The check for new versions (api/version-check.ts), over the Version card: asked and told, or neither; the first
 * choice's line says all a check sends */
var CHECK: Setting = {
    icon: 'update',
    title: 'Check for New Versions',
    values: ['notify', 'off'],
    now: versionCheck,
    set: function (v) { setVersionCheck(v as CheckMode); },
    label: function (v) { return v === 'notify' ? 'Notify Me' : 'Off'; },
    line: function (v) {
        return v === 'notify' ? 'Sent once a day: its version, the ' + (android() ? 'Android' : 'webOS') +
            ' version, the days since it last asked. Nothing about you or your TV.' : 'The app asks nothing.';
    }
};

/** The remembered quality as Twitch names it (1080p60, 720p), or '' for none */
function remembered(): string {
    var q = rememberedQuality();
    return q ? q.height + 'p' + (q.fps > 30 ? Math.round(q.fps) : '') : '';
}

/** A card on the page and what OK does on it: step a setting, open a Twitch page ('profile' or a QR page's id), or
 * forget the remembered quality */
interface Entry {
    setting?: Setting;
    open?: string;
    quality?: boolean;
}

export class SettingsView implements Screen {
    el: HTMLElement;
    /** Signing in or out from Your Profile ends at Home: the shell closes Settings and its pages */
    accountBound = true;
    /** Twitch shows only Go Back over it (no menu items) */
    menu: MenuMode = 'back';
    private cards: CardList;
    /** Each card's entry, in the page's order */
    private entries: Entry[] = [];
    /** The Remembered Quality card and the Version card */
    private quality = -1;
    private version = -1;
    /** The live chat settings page, once opened */
    private chatPage: ChatSettings | null = null;

    constructor(private nav: Navigator) {
        this.el = h('div', 'bt-settings');
        this.cards = new CardList(TOP);
        this.add(PROFILE, { open: 'profile' });
        this.quality = this.cards.length;
        this.add({ icon: 'quality', title: 'Remembered Quality', line: '', heading: 'Playback' }, { quality: true });
        // Stable Volume only where it works (the Android app; the LG TV's own Auto Volume does it there)
        this.group(null, canStabilize() ? [STABLE, DIM, USHER, PREVIEW, GATE] : [DIM, USHER, PREVIEW, GATE]);
        this.group('Chat', [CHAT, NOTICES, POINTS]);
        this.group('Favorites', [LIVE_ROW, ALL_ROW, FAV_PREVIEWS]);
        for (var i = 0; i < TWITCH.length; i++) {
            var card = TWITCH[i];
            this.add({ icon: card.icon, title: card.title, line: card.line, heading: i === 0 ? 'Twitch' : undefined }, { open: card.id });
        }
        // The app's own two cards, after a blank heading's room so they do not read as Twitch's
        var apart = ' ';
        if (hasVersionCheck()) {
            this.group(apart, [CHECK]);
            apart = '';
        }
        this.version = this.cards.length;
        this.add({ icon: 'version', title: 'Version', line: '', heading: apart || undefined }, {});
        this.el.appendChild(this.cards.el);
        this.el.appendChild(h('div', 'bt-set-cover'));
        setShown(this.el, false);
        this.label();
    }

    show(): void {
        setShown(this.el, true);
        // The player may have remembered a quality meanwhile, the day's check named a newer version
        this.label();
        loadQr().then(null, function () { /* tried again by the QR page */ });
    }

    hide(): void {
        if (this.chatPage) {
            this.chatPage.close();
        }
        setShown(this.el, false);
    }

    atTop(): boolean {
        return this.cards.index === 0 && !(this.chatPage && this.chatPage.shown);
    }

    setFocused(focused: boolean): void {
        this.cards.setFocused(focused);
    }

    onKey(code: number): boolean {
        if (this.chatPage && this.chatPage.shown) {
            this.chatPage.onKey(code);
            if (!this.chatPage.shown) {
                this.label();
            }
            return true;
        }
        if (code === KEY.UP || code === KEY.DOWN) {
            // Up from the first card is the shell's (the menu)
            return this.cards.move(code === KEY.UP ? -1 : 1) || code === KEY.DOWN;
        }
        var entry = this.entries[this.cards.index];
        var setting = entry.setting;
        if (setting && setting.page) {
            if (code === KEY.OK) {
                this.chatPage = this.chatPage || new ChatSettings(this.el);
                this.chatPage.open();
            }
            return code === KEY.OK || code === KEY.LEFT || code === KEY.RIGHT;
        }
        if (code === KEY.LEFT || code === KEY.RIGHT) {
            if (setting) {
                this.step(setting, code === KEY.LEFT ? -1 : 1);
            }
            return true;
        }
        if (code !== KEY.OK) {
            return false;
        }
        if (entry.open) {
            this.nav.push(entry.open === 'profile' ? new ProfileView(this.nav) : new QrPage(SETTINGS_PAGES[entry.open], this.nav));
        } else if (setting) {
            this.step(setting, 1);
        } else if (entry.quality && remembered()) {
            rememberQuality(null);
            this.label();
        }
        return true;
    }

    /** A card and its entry */
    private add(card: Card, entry: Entry): void {
        this.cards.add(card);
        this.entries.push(entry);
    }

    /** Settings' cards, the first under a heading (null: none) */
    private group(heading: string | null, settings: Setting[]): void {
        for (var k = 0; k < settings.length; k++) {
            this.add({ icon: settings[k].icon, title: settings[k].title, line: '', heading: k === 0 && heading ? heading : undefined },
                { setting: settings[k] });
        }
    }

    /** The setting's next choice (delta 1) or the one before (-1), round */
    private step(setting: Setting, delta: number): void {
        var values = setting.values;
        setting.set(values[(values.indexOf(setting.now()) + delta + values.length) % values.length]);
        this.label();
    }

    /** The settings' values and lines as stored now; the Version card names a newer version that is out, and on webOS
     * where it is updated */
    private label(): void {
        for (var k = 0; k < this.entries.length; k++) {
            var s = this.entries[k].setting;
            if (s) {
                var v = s.now();
                this.cards.update(k, s.title, s.line(v), s.label(v));
            }
        }
        var q = remembered();
        this.cards.update(this.quality, 'Remembered Quality', q ? 'New streams start at ' + q + '. OK forgets it: they start at Auto.' :
            'New streams start at Auto: no quality is remembered.', q || 'Auto');
        var newer = newerVersion();
        this.cards.update(this.version, 'Version', 'Bolli Twitch ' + (document.documentElement.getAttribute('data-version') || '') +
            (newer ? '. Version ' + newer + ' is out.' + updateHint() : ''), '');
    }
}
