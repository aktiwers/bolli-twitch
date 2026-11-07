// window.__bolli.chat, for side-by-side checks and measurements from DevTools: open(login) shows a channel's chat on
// its own at its place in the live player (x 960) over a dark page; feed(perSecond, seconds) runs made-up chat lines
// into it instead (no network); stats() counts what was drawn and skipped; close() takes it away. Nothing is made
// until open() or feed().

import { hook } from '../hook.js';
import { loadBadges } from './assets.js';
import { ChatConnection } from './connection.js';
import { IrcLine, parseLine } from './irc.js';
import { ChatPanel } from './panel.js';

var page: HTMLElement | null = null;
var panel: ChatPanel | null = null;
var connection: ChatConnection | null = null;
var feedTimer = 0;
/** Counts stopFeed() calls: a feed whose badges come after one does not start */
var feedRun = 0;

/** Puts window.__bolli.chat up (after core/perf.ts has made window.__bolli) */
export function installChatHook(): void {
    hook('chat', { open: open, close: close, feed: feed, stats: stats });
}

function make(): ChatPanel {
    if (!page || !panel) {
        page = document.createElement('div');
        page.style.cssText = 'position:absolute;left:0;top:0;width:1280px;height:720px;background:#0e0e10;z-index:50';
        document.body.appendChild(page);
        panel = new ChatPanel(page);
    }
    return panel;
}

function open(login: string): void {
    var p = make();
    stopFeed();
    if (!connection) {
        connection = new ChatConnection();
    }
    connection.open(login, p);
}

function close(): void {
    stopFeed();
    if (connection) {
        connection.close();
    }
    if (page) {
        document.body.removeChild(page);
    }
    page = null;
    panel = null;
}

var COLORS = ['#FF0000', '#0000FF', '#008000', '#B22222', '#FF7F50', '#9ACD32', '#FF4500', '#2E8B57', '#DAA520', '#D2691E',
    '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F', ''];
var WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliett', 'kilo', 'lima'];
var BADGES = ['premium/1', 'turbo/1', 'glhf-pledge/1', 'no_audio/1', 'partner/1'];
/** Twitch's global emotes by id */
var EMOTES = [['25', 'Kappa'], ['354', '4Head'], ['88', 'PogChamp'], ['1902', 'Keepo']];

/** Made-up chat line n in channel, as Twitch sends it: a sender, 0-2 badges, a few words, now and then an emote, a
 * long one, a resub notice */
function madeUp(n: number, channel: string): IrcLine {
    var words: string[] = [];
    var count = 1 + (n * 7) % (n % 9 === 0 ? 24 : 6);
    for (var i = 0; i < count; i++) {
        words.push(WORDS[(n + i * 5) % WORDS.length]);
    }
    var text = words.join(' ');
    var emotes = '';
    if (n % 4 === 0) {
        var e = EMOTES[n % EMOTES.length];
        emotes = e[0] + ':' + (text.length + 1) + '-' + (text.length + e[1].length);
        text += ' ' + e[1];
    }
    var badges: string[] = [];
    for (var b = 0; b < n % 3; b++) {
        badges.push(BADGES[(n + b) % BADGES.length]);
    }
    var name = 'viewer' + (n % 97);
    var notice = n % 50 === 7;
    var tags = '@badges=' + badges.join(',') + ';color=' + COLORS[n % COLORS.length] + ';display-name=' + name + ';emotes=' + emotes +
        ';id=made-up-' + n + (notice ? ';login=' + name + ';msg-id=resub;msg-param-cumulative-months=' + (n % 30 + 2) : '');
    return parseLine(tags + ' :' + name + '!' + name + '@' + name + '.tmi.twitch.tv ' + (notice ? 'USERNOTICE' : 'PRIVMSG') +
        ' #' + channel + ' :' + text) as IrcLine;
}

/** Made-up lines at perSecond for seconds into the panel (badges from the global list, asked once if not kept) */
function feed(perSecond: number, seconds: number): void {
    var p = make();
    stopFeed();
    if (connection) {
        connection.close();
    }
    var channel = 'bolli';
    var run = feedRun;
    loadBadges(channel).then(function () {
        if (run !== feedRun) {
            return;
        }
        var n = 0;
        var every = 1000 / perSecond;
        var started = Date.now();
        // Lines come in bursts per socket frame in real chats; here one per tick
        var tick = function () {
            var due = Math.floor((Date.now() - started) / every);
            var list: IrcLine[] = [];
            while (n < due) {
                list.push(madeUp(n++, channel));
            }
            if (list.length) {
                p.lines(list);
            }
            if (Date.now() - started < seconds * 1000) {
                feedTimer = setTimeout(tick, Math.max(10, every)) as unknown as number;
            }
        };
        tick();
    });
}

function stopFeed(): void {
    clearTimeout(feedTimer);
    feedTimer = 0;
    feedRun++;
}

function stats(): { drawn: number; skipped: number; rows: number } {
    return panel ? { drawn: panel.drawn, skipped: panel.skipped, rows: panel.el.getElementsByClassName('bt-chat-row').length } : { drawn: 0, skipped: 0, rows: 0 };
}
