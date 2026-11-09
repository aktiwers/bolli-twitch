// Bolli Twitch: a copy of Twitch's TV app (its LG and Android TV versions are the same web page) for this LG
// OLED55C7V-Z (webOS 3.9, Chrome 38) and Android TV, built on the Bolli framework: the same screens, layout and keys,
// with the Bolli logo, streams at full quality, and pages kept alive instead of reloaded.
//
// The shell: the top menu over its sections (Home, Following, Browse, Search, Settings, Sign In), each made when first
// shown and then kept, and the pages opened over a section (a category, a channel, the player). Back closes the top
// page, on another section goes to Home, and on Home does nothing, as in Twitch's app. Focus starts on the menu's first
// item; Up from a screen's top lands there and Down gives focus back to the screen. Each screen says how the menu
// stands over it (Screen.menu); a screen with nothing to focus leaves focus on the menu. Pages are let go of after the
// screen under them has painted. After OK navigated (or asked a failed screen again, or a screen said so with
// holdOk), a held OK's repeats are ignored until it is released. Bolli adds number keys 1 to 4 for the sections and
// opens a channel a launch or relaunch names.
// The account changing (a sign-in, a sign-out, a token Twitch refused) keeps the viewer where they are: the screens
// that show the account's things (accountBound: Home, Following, Settings, Sign In) go, and so do pages over them
// from the first such page up (Sign In); the other pages stay open, also over a bound section, which is made anew
// under them (Back leads to the new one; a section the menu no longer has gives way to Home) and they ask their
// account state again. Settings is the exception: a change there (Your Profile) closes it and its pages and ends at
// Home.

import { h, setShown } from '../core/dom.js';
import { digit, initKeys, KEY, setActive } from '../core/keys.js';
import { isOnline, onNetwork, watchNetwork } from '../core/network.js';
import { initPerf, mark } from '../core/perf.js';
import { ignorePointer } from '../core/platform.js';
import { initScreenSaver } from '../core/screensaver.js';
import { initAuth, onAccountChange } from './api/auth.js';
import { forgetCaches } from './api/cache.js';
import { channelPage } from './api/channel.js';
import { clip } from './api/clip.js';
import { forgetFollows } from './api/follow.js';
import { following } from './api/following.js';
import { GqlError, signedIn } from './api/gql.js';
import { homeLoader } from './api/home.js';
import { Item } from './api/types.js';
import { video } from './api/video.js';
import { installChatHook } from './chat/hook.js';
import { hook } from './hook.js';
import { pictureRuns, prefetch } from './player/session.js';
import { ErrorView } from './views/account/errors.js';
import { FollowingView } from './views/account/following.js';
import { SettingsView } from './views/account/settings.js';
import { SignInView } from './views/account/signin.js';
import { BrowseView, prefetchBrowse } from './views/browse/browse.js';
import { CategoryPage, prefetchCategory } from './views/browse/category.js';
import { SearchView } from './views/browse/search.js';
import { ChannelView } from './views/channel/channel.js';
import { askPage, prefetchChannel } from './views/channel/data.js';
import { sessionPlayer } from './views/channel/preview.js';
import { HeldOk } from './views/held-ok.js';
import { HomeView } from './views/home.js';
import { MenuItem, TopMenu } from './views/menu.js';
import { ErrorKind, Navigator, Screen } from './views/navigator.js';
import { initOffline } from './views/offline.js';
import { openPlayer, playAhead, prefetchClip } from './views/player/open.js';
import { startOf } from './views/player/resume.js';
import { setRestMs } from './views/rest.js';
import './player/test-hook.js';

// The version (written in by tools/build_app.mjs), on the page for checks
document.documentElement.setAttribute('data-version', '__BOLLI_VERSION__');

initPerf();
installChatHook();
mark('start');
// The kept account's token, before anything asks Twitch
initAuth();
var root = document.getElementById('app') as HTMLElement;

/** The menu's sections, each made when first shown */
var screens: { [item: string]: (nav: Navigator) => Screen } = {
    home: function (nav: Navigator): Screen {
        return new HomeView(homeLoader(), nav);
    },
    signin: function (): Screen {
        return new SignInView();
    },
    // Home's rows when nothing is followed
    following: function (nav: Navigator): Screen {
        return new FollowingView(nav, following, homeLoader());
    },
    settings: function (nav: Navigator): Screen {
        return new SettingsView(nav);
    },
    browse: function (nav: Navigator): Screen {
        return new BrowseView(nav);
    },
    search: function (nav: Navigator): Screen {
        return new SearchView(nav);
    }
};

/** What OK on a tile opens, by the tile's kind */
var openers: { [kind: string]: (item: Item, nav: Navigator) => Screen | null } = {
    /** The channel page: an offline channel's tile, the player's avatar */
    channel: function (item: Item, nav: Navigator): Screen | null {
        return item.kind === 'channel' ? new ChannelView(item, nav, { load: channelPage, player: sessionPlayer }) : null;
    },
    game: function (item: Item, nav: Navigator): Screen | null {
        return item.kind === 'game' ? new CategoryPage(item.game, nav) : null;
    },
    /** The players: a live stream, a past broadcast, a clip */
    stream: openPlayer,
    video: openPlayer,
    clip: openPlayer
};

/** What focus resting on a tile fetches ahead, by the tile's kind: what its opener draws or plays first (a stream or
 * video: its playback too, out of sight, which takes the stream fetched here) */
var aheads: { [kind: string]: (item: Item) => Promise<unknown> } = {
    stream: function (item: Item): Promise<unknown> {
        var fetched = prefetch({ kind: 'live', id: (item as Extract<Item, { kind: 'stream' }>).stream.channel.login });
        playAhead(item);
        return fetched;
    },
    video: function (item: Item): Promise<unknown> {
        var v = (item as Extract<Item, { kind: 'video' }>).video;
        var fetched = prefetch({ kind: 'vod', id: v.id, startAt: startOf(v) });
        playAhead(item);
        return fetched;
    },
    channel: function (item: Item): Promise<unknown> {
        return prefetchChannel((item as Extract<Item, { kind: 'channel' }>).channel.login);
    },
    clip: function (item: Item): Promise<unknown> {
        return prefetchClip((item as Extract<Item, { kind: 'clip' }>).clip.slug);
    },
    game: function (item: Item): Promise<unknown> {
        return prefetchCategory((item as Extract<Item, { kind: 'game' }>).game);
    }
};

var nav: Navigator = {
    open: open,
    push: function (view: Screen): void {
        push(view);
        settle(false);
    },
    back: back,
    signIn: function (): void {
        push(new SignInView());
        settle(false);
    },
    home: function (): void {
        showSection('home');
        settle(false);
    },
    error: function (from: Screen, kind: ErrorKind): void {
        replace(from, new ErrorView(kind, nav));
        settle(false);
    },
    ahead: function (item: Item): Promise<unknown> | void {
        var fetch = aheads[item.kind];
        return fetch ? fetch(item) : undefined;
    }
};
var stage = root.appendChild(h('div', 'bt-stage')) as HTMLElement;
var menu = new TopMenu(pick, back, function (item: MenuItem) {
    // Focus resting on Browse in the menu: its first categories, so its first visit draws at once
    if (item === 'browse' && !sections.browse && !top().plays) {
        prefetchBrowse();
    }
});
root.appendChild(menu.el);
var sections: { [item: string]: Screen } = {};
var current: MenuItem = 'home';
/** The pages over the current section, the top one last */
var stack: Screen[] = [];
var heldOk = new HeldOk();

function top(): Screen {
    return stack.length ? stack[stack.length - 1] : section(current);
}

/** Section item, made the first time (under any page) */
function section(item: MenuItem): Screen {
    if (!sections[item]) {
        sections[item] = screens[item](nav);
        stage.insertBefore(sections[item].el, stage.firstChild);
    }
    return sections[item];
}

/** Focus after a navigation: on the menu or on the screen on top, never both, as the screen asks */
function settle(toMenu: boolean): void {
    var view = top();
    var mode = view.menu || 'items';
    var inMenu = (toMenu || !!view.menuFocus) && mode !== 'none';
    setShown(menu.el, mode !== 'none');
    menu.setMode(mode, stack.length > 0);
    menu.setFocused(inMenu);
    if (view.setFocused) {
        view.setFocused(!inMenu);
    }
    menu.setCurrent(stack.length ? null : current);
}

/** Opens a page over the screen on top; under a player the others keep pictures for their focused row only */
function push(view: Screen): void {
    top().hide();
    stack.push(view);
    stage.appendChild(view.el);
    view.show();
    if (view.plays) {
        var hidden: Screen[] = stack.slice(0, stack.length - 1);
        for (var id in sections) {
            hidden.push(sections[id]);
        }
        for (var i = 0; i < hidden.length; i++) {
            if (hidden[i].narrow) {
                (hidden[i].narrow as () => void)();
            }
        }
    }
}

/** Puts view in the place of the page old (shown when old was on top) */
function replace(old: Screen, view: Screen): void {
    var i = stack.indexOf(old);
    if (i < 0) {
        return;
    }
    var onTop = i === stack.length - 1;
    if (onTop) {
        old.hide();
    }
    stack[i] = view;
    stage.insertBefore(view.el, old.el);
    if (onTop) {
        view.show();
    } else {
        view.hide();
    }
    letGo([old]);
}

/** Closes the pages from depth up: the top one hides and the screen under them shows */
function closePages(depth: number): void {
    var gone = stack.splice(depth, stack.length - depth);
    if (gone.length) {
        gone[gone.length - 1].hide();
        top().show();
        letGo(gone);
    }
}

/** Puts section item on top: the pages over the current one close */
function showSection(item: MenuItem): void {
    var was = top();
    var gone = stack.splice(0, stack.length);
    current = item;
    var now = section(item);
    if (now !== was) {
        was.hide();
        now.show();
    }
    letGo(gone);
}

/** Screens taken away: removed and destroyed once the screen now on top has painted */
function letGo(gone: Screen[]): void {
    if (!gone.length) {
        return;
    }
    requestAnimationFrame(function () {
        setTimeout(function () {
            for (var i = gone.length - 1; i >= 0; i--) {
                var view = gone[i];
                stage.removeChild(view.el);
                if (view.destroy) {
                    view.destroy();
                }
            }
        }, 0);
    });
}

/** OK on a tile: what it opens; the screen right under the top one when that shows the same (the player's avatar
 * over its channel's page goes back to it) */
function open(item: Item): void {
    var under = stack.length > 1 ? stack[stack.length - 2] : stack.length ? section(current) : null;
    if (under && under.shows && under.shows(item)) {
        back();
        return;
    }
    var opener = openers[item.kind];
    var view = opener ? opener(item, nav) : null;
    if (view) {
        push(view);
        settle(false);
    }
}

/** Back: the top page closes; on another section, Home; on Home nothing, as in Twitch's app */
function back(): void {
    if (stack.length) {
        closePages(stack.length - 1);
    } else if (current !== 'home') {
        showSection('home');
    } else {
        return;
    }
    settle(false);
}

/** OK on a menu item: its section, with focus on it */
function pick(item: MenuItem): void {
    showSection(item);
    settle(false);
}

/** Signed in or out, or the token refused (the header's rule): the answers and follow states kept for the last
 * account go, the bound screens go and the pages that stay ask their account state again; Home and the section under
 * the pages are made at once (Back leads there), hidden under the top screen; the menu follows. Focus stays where it
 * was, except on the menu where a page that closed (Sign In over a page) kept it: then on the screen now on top (the
 * menu's first entry there is Go Back) */
onAccountChange(function (on: boolean) {
    forgetCaches();
    forgetFollows();
    menu.setSignedIn(on);
    var settings = current === 'settings';
    var depth = 0;
    while (!settings && depth < stack.length && !stack[depth].accountBound) {
        depth++;
    }
    var was = top();
    var heldMenu = stack.length > 0 && !!was.menuFocus;
    var gone = stack.splice(depth, stack.length - depth);
    for (var id in sections) {
        if (sections[id].accountBound || menu.order.indexOf(id as MenuItem) < 0) {
            gone.unshift(sections[id]);
            delete sections[id];
        }
    }
    if (settings || menu.order.indexOf(current) < 0) {
        current = 'home';
    }
    var made: Screen[] = [];
    if (!sections.home) {
        made.push(section('home'));
    }
    if (!sections[current]) {
        made.push(section(current));
    }
    var now = top();
    for (var m = 0; m < made.length; m++) {
        if (made[m] !== now) {
            made[m].hide();
        }
    }
    if (now !== was) {
        was.hide();
        now.show();
    }
    letGo(gone);
    var kept: Screen[] = stack.slice();
    for (var s in sections) {
        kept.push(sections[s]);
    }
    for (var i = 0; i < kept.length; i++) {
        if (kept[i].accountChanged) {
            (kept[i].accountChanged as () => void)();
        }
    }
    settle(menu.hasFocus && (now === was || !heldMenu));
});

/** window.__bolli.open(kind, id), for checks over remote DevTools: what a tile of that kind opens, from its id ('live'
 * a channel's stream by its login, an offline one too to see the player's prompts; 'vod' a past broadcast; 'clip' a
 * slug; 'channel' a channel's page by its login; 'game' a category's page by its name). No such item: Twitch's
 * not-found page */
/** window.__bolli.restMs(ms): the wait on a tile before its stream starts ahead, for this run (checks over remote
 * DevTools; 0 the default) */
hook('restMs', setRestMs);

hook('open', function (kind: string, id: string): Promise<boolean> {
    var item: Promise<Item>;
    if (kind === 'vod') {
        item = video(id).then(function (v): Item { return { kind: 'video', video: v }; });
    } else if (kind === 'clip') {
        item = clip(id).then(function (c): Item { return { kind: 'clip', clip: c.clip }; });
    } else if (kind === 'live') {
        item = channelPage(id).then(function (p): Item {
            return { kind: 'stream', stream: p.stream || { id: '', channel: p.channel, title: '', viewers: 0, preview: '' } };
        });
    } else if (kind === 'game') {
        item = Promise.resolve<Item>({ kind: 'game', game: { id: '', name: id, displayName: id, boxArt: '' } });
    } else {
        item = Promise.resolve<Item>({ kind: 'channel', channel: { id: '', login: id, displayName: id, avatar: '' }, live: false });
    }
    return item.then(function (it: Item) {
        open(it);
        return true;
    }, function (e: GqlError) {
        if (e && e.kind === 'notfound') {
            push(new ErrorView('not-found', nav));
            settle(false);
        }
        return false;
    });
});

/** The launch's parameters (webOS keeps them as JSON), or null */
function launchParams(): unknown {
    var w = window as unknown as { PalmSystem?: { launchParams?: string } };
    try {
        return JSON.parse((w.PalmSystem && w.PalmSystem.launchParams) || 'null');
    } catch (e) {
        return null;
    }
}

/** A launch or relaunch naming a channel (parameters { channel: login }, as other webOS Twitch apps take them): its
 * stream when it is live (resolved meanwhile), else its page; nothing when it shows already */
function launchChannel(params: unknown): void {
    var login = params && typeof params === 'object' && (params as { channel?: unknown }).channel;
    if (typeof login !== 'string' || !/^\w{1,25}$/.test(login)) {
        return;
    }
    var name = login.toLowerCase();
    prefetch({ kind: 'live', id: name });
    askPage(name).then(function (p) {
        var item: Item = p.stream ? { kind: 'stream', stream: p.stream } : { kind: 'channel', channel: p.channel, live: false };
        var view = top();
        if (!view.shows || !view.shows(item)) {
            open(item);
        }
    }, function () { return undefined; });
}

/** The network is back: what failed or waits tries again at once, on every screen kept */
function retryAll(): void {
    var views: Screen[] = stack.slice();
    for (var id in sections) {
        views.push(sections[id]);
    }
    for (var i = 0; i < views.length; i++) {
        var view = views[i];
        if (view.retry) {
            view.retry(false);
        }
    }
}

/** Bolli's shortcuts (Twitch's TV app has none): number keys 1 to 4 open Home, Following, Browse and Search, where the
 * menu has them (a guest's has no Following), unless the screen types digits (Search's keyboard) */
var SHORTCUTS: MenuItem[] = ['home', 'following', 'browse', 'search'];

/** A key for the menu or the screen on top */
function onKey(code: number): boolean {
    // No internet: the offline screen is over the app and keys wait
    if (!isOnline()) {
        return true;
    }
    var view = top();
    var shortcut = SHORTCUTS[digit(code) - 1];
    if (shortcut && menu.order.indexOf(shortcut) >= 0 && (menu.hasFocus || !view.takesDigits || !view.takesDigits())) {
        pick(shortcut);
        return true;
    }
    if (menu.hasFocus) {
        if (code === KEY.DOWN) {
            settle(false);
            return true;
        }
        if (menu.onKey(code)) {
            return true;
        }
    } else {
        // A screen showing that its content failed: OK asks again (once per press)
        if (code === KEY.OK && view.retry && view.retry(true)) {
            heldOk.latch(Date.now());
            return true;
        }
        if (view.onKey(code)) {
            return true;
        }
        if (code === KEY.UP && view.atTop && view.atTop() && view.menu !== 'none') {
            settle(true);
            return true;
        }
    }
    if (code === KEY.BACK) {
        back();
        return true;
    }
    return false;
}

setActive({
    onKey: function (code: number): boolean {
        var now = Date.now();
        if (heldOk.ignore(code, now)) {
            return true;
        }
        var view = top();
        var inMenu = menu.hasFocus;
        var used = heldOk.during(code, function () {
            return onKey(code);
        });
        // OK opened a screen or moved focus into one: its repeats are not for what is focused there
        if (code === KEY.OK && (top() !== view || menu.hasFocus !== inMenu)) {
            heldOk.latch(now);
        }
        return used;
    }
});

menu.setSignedIn(signedIn());
// As in Twitch's app, focus starts on the menu's first item
settle(true);
initOffline(root);
onNetwork(function (online: boolean) {
    if (online) {
        retryAll();
    }
});
ignorePointer();
initKeys();
heldOk.watch();
// The connection's state: the offline screen, retries, and chat reconnecting at once
watchNetwork();
launchChannel(launchParams());
document.addEventListener('webOSRelaunch', function (e) {
    launchChannel((e as CustomEvent).detail);
});
// No screensaver while a picture plays in sight (the player, a channel page's preview); one loaded ahead out of sight
// does not count
initScreenSaver(pictureRuns);
