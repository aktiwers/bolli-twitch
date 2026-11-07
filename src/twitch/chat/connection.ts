// A channel's chat over Twitch's IRC WebSocket, connected the way Twitch's TV app connects: CAP tags and commands, a
// dummy PASS, NICK justinfan<n> and USER for a guest (the account's login and token when signed in), JOIN after the
// welcome. PING answered; our own PING every ~5 minutes and when the network is back, no PONG within 10 s: connected
// again, as after a drop or a RECONNECT, after 1 s + 2 s per attempt (at most 30 s) plus a jitter; while offline, once
// the network is back. A token the chat server refuses: a guest until the account changes. A change of account joins
// again with it. Lines the panel would not draw are dropped here. open() for the channel it has keeps it (and the
// messages since); another channel moves it there.

import { isOnline, onNetwork } from '../../core/network.js';
import { chatAccount, currentUser, onAccountChange } from '../api/auth.js';
import { badgesReady, loadBadges } from './assets.js';
import { IrcLine, parseLine } from './irc.js';
import { drawable, removalOf } from './parse.js';
import { ChatEvents, KEPT } from './types.js';

var SERVER = 'wss://irc-ws.chat.twitch.tv/';
/** Lines held for the badge lists at most this long, then handed over without the badges still missing */
var BADGE_WAIT_MS = 3000;
var PING_MS = 300000;
var PING_JITTER_MS = 10000;
var PONG_MS = 10000;
var RETRY_MS = 1000;
var RETRY_STEP_MS = 2000;
var RETRY_MAX_MS = 30000;
var RETRY_JITTER_MS = 5000;
/** No welcome this long after opening the socket: tried again */
var CONNECT_MS = 15000;
/** The chat server's answers to a token it does not take, before the welcome */
var AUTH_REFUSED: { [text: string]: boolean } = { 'Login authentication failed': true, 'Improperly formatted auth': true };

/** A closed connection's events: it tells nothing, and holds nothing of the panel it had */
var NO_EVENTS: ChatEvents = {
    lines: function () { /* closed */ },
    removed: function () { /* closed */ },
    connected: function () { /* closed */ },
    reset: function () { /* closed */ }
};

/** Connections with a channel */
var live: ChatConnection[] = [];
/** The chat server refused the account's token: guests until the account changes */
var refused = false;

onNetwork(function (online) {
    if (online) {
        for (var i = 0; i < live.length; i++) {
            live[i].networkBack();
        }
    }
});

onAccountChange(function () {
    refused = false;
    if (!live.length) {
        return;
    }
    // The account's login comes with its user (asked once after a sign-in)
    var rejoin = function () {
        for (var i = 0; i < live.length; i++) {
            live[i].rejoin();
        }
    };
    currentUser().then(rejoin, rejoin);
});

export class ChatConnection {
    private events: ChatEvents = NO_EVENTS;
    private socket: WebSocket | null = null;
    private login = '';
    private joined = false;
    /** The socket logged in with the account's token */
    private withAccount = false;
    /** The socket went while offline: connects once the network is back */
    private waiting = false;
    private attempts = 0;
    private jitter = Math.round(RETRY_JITTER_MS * Math.random());
    private retryTimer = 0;
    private pingTimer = 0;
    private pongTimer = 0;
    private connectTimer = 0;
    /** Lines waiting for the badge lists, at most KEPT (older ones could not be drawn anyway) */
    private held: IrcLine[] = [];
    private holdTimer = 0;
    private holding = false;
    /** Lines handed over together per socket frame */
    private out: IrcLine[] = [];

    /** Joins login's chat and tells events what comes; the same channel again keeps what it has */
    open(login: string, events: ChatEvents): void {
        this.events = events;
        login = login.toLowerCase();
        if (login === this.login) {
            return;
        }
        this.leave();
        this.login = login;
        live.push(this);
        events.reset();
        this.hold();
        this.start();
    }

    /** Leaves the chat, closes the socket and lets go of its events */
    close(): void {
        this.leave();
        this.events = NO_EVENTS;
    }

    /** The network is back: a connection that waited for it connects now; a joined socket that never closed may be
     * dead, so it is pinged now */
    networkBack(): void {
        if (this.waiting) {
            this.start();
        } else if (this.joined) {
            this.ping();
        }
    }

    /** The account changed: joins again with it */
    rejoin(): void {
        if (this.login) {
            this.attempts = 0;
            this.start();
        }
    }

    private leave(): void {
        var at = live.indexOf(this);
        if (at >= 0) {
            live.splice(at, 1);
        }
        this.login = '';
        this.attempts = 0;
        this.held = [];
        this.holding = false;
        clearTimeout(this.holdTimer);
        clearTimeout(this.retryTimer);
        this.retryTimer = 0;
        this.waiting = false;
        this.drop();
    }

    /** Lines are held until the badge lists are here (at most BADGE_WAIT_MS) */
    private hold(): void {
        var self = this;
        var login = this.login;
        if (badgesReady(login)) {
            return;
        }
        this.holding = true;
        var release = function () {
            if (self.login !== login || !self.holding) {
                return;
            }
            self.holding = false;
            clearTimeout(self.holdTimer);
            var lines = self.held;
            self.held = [];
            for (var i = 0; i < lines.length; i++) {
                self.handle(lines[i]);
            }
            self.flush();
        };
        this.holdTimer = setTimeout(release, BADGE_WAIT_MS) as unknown as number;
        loadBadges(login).then(release);
    }

    /** A new socket now, or once the network is back */
    private start(): void {
        clearTimeout(this.retryTimer);
        this.retryTimer = 0;
        this.drop();
        this.waiting = !isOnline();
        if (!this.waiting) {
            this.connect();
        }
    }

    private connect(): void {
        var self = this;
        var socket: WebSocket;
        try {
            socket = new WebSocket(SERVER);
        } catch (e) {
            this.retry();
            return;
        }
        this.socket = socket;
        this.connectTimer = setTimeout(function () {
            if (self.socket === socket && !self.joined) {
                self.retry();
            }
        }, CONNECT_MS) as unknown as number;
        socket.onopen = function () {
            var account = refused ? null : chatAccount();
            self.withAccount = !!account;
            var nick = account ? account.login : 'justinfan' + Math.floor(80000 * Math.random() + 1000);
            socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
            socket.send('PASS ' + (account ? 'oauth:' + account.token : 'SCHMOOPIIE'));
            socket.send('NICK ' + nick);
            socket.send('USER ' + nick + ' 8 * :' + nick);
        };
        socket.onmessage = function (e: MessageEvent) {
            if (self.socket !== socket) {
                return;
            }
            var data = String(e.data);
            var start = 0;
            // One frame can carry several lines, each ended by CR LF (a RECONNECT among them ends this socket)
            while (start < data.length && self.socket === socket) {
                var end = data.indexOf('\r\n', start);
                if (end === -1) {
                    end = data.length;
                }
                if (end > start) {
                    var line = parseLine(data.slice(start, end));
                    if (line) {
                        self.received(line);
                    }
                }
                start = end + 2;
            }
            self.flush();
        };
        socket.onclose = socket.onerror = function () {
            if (self.socket === socket) {
                self.retry();
            }
        };
    }

    private received(line: IrcLine): void {
        var socket = this.socket as WebSocket;
        switch (line.command) {
            case 'PING':
                socket.send('PONG :' + (line.params[0] || 'tmi.twitch.tv'));
                return;
            case 'PONG':
                clearTimeout(this.pongTimer);
                this.pongTimer = 0;
                this.pingLater();
                return;
            case '376':
                socket.send('JOIN #' + this.login);
                return;
            case 'JOIN':
                if (!this.joined) {
                    this.joined = true;
                    this.attempts = 0;
                    clearTimeout(this.connectTimer);
                    this.pingLater();
                    this.events.connected(true);
                }
                return;
            case 'RECONNECT':
                // The lines before it in this frame are handed over before the socket goes
                this.flush();
                this.retry();
                return;
            case 'NOTICE':
                // A refused token: as a guest at once (a guest refused, which should not happen: after the backoff)
                if (!this.joined && AUTH_REFUSED.hasOwnProperty(line.params[1] || '')) {
                    if (this.withAccount) {
                        refused = true;
                        this.start();
                    } else {
                        this.retry();
                    }
                }
                return;
            case 'PRIVMSG':
            case 'USERNOTICE':
            case 'CLEARCHAT':
            case 'CLEARMSG':
                // Only lines that draw count towards what is held and what the panel keeps (removals always go on)
                if ((line.command === 'PRIVMSG' || line.command === 'USERNOTICE') && !drawable(line)) {
                    return;
                }
                if (!this.holding) {
                    this.handle(line);
                } else if (this.held.push(line) > KEPT) {
                    this.held.shift();
                }
                return;
        }
    }

    /** A removal is told at once (after the lines before it); a timeout's or ban's line goes on for its status line */
    private handle(line: IrcLine): void {
        var removal = removalOf(line);
        if (!removal) {
            this.out.push(line);
            return;
        }
        this.flush();
        this.events.removed(removal.ids, removal.login);
        if (removal.login) {
            this.out.push(line);
        }
    }

    private flush(): void {
        if (this.out.length) {
            var list = this.out;
            this.out = [];
            this.events.lines(list);
        }
    }

    /** Our own PING in ~5 minutes */
    private pingLater(): void {
        var self = this;
        clearTimeout(this.pingTimer);
        this.pingTimer = setTimeout(function () {
            self.ping();
        }, PING_MS + Math.round(PING_JITTER_MS * Math.random())) as unknown as number;
    }

    /** Our PING now (unless one is out already); no PONG within PONG_MS: connected again */
    private ping(): void {
        var self = this;
        if (!this.socket || this.pongTimer) {
            return;
        }
        clearTimeout(this.pingTimer);
        this.socket.send('PING');
        this.pongTimer = setTimeout(function () {
            self.pongTimer = 0;
            self.retry();
        }, PONG_MS) as unknown as number;
    }

    /** The socket gone: tells the panel once, connects again after the backoff (offline: once the network is back) */
    private retry(): void {
        var was = this.joined;
        this.drop();
        if (was) {
            this.events.connected(false);
        }
        if (!this.login || this.retryTimer) {
            return;
        }
        if (!isOnline()) {
            this.waiting = true;
        } else {
            var self = this;
            this.attempts++;
            this.retryTimer = setTimeout(function () {
                self.start();
            }, Math.min(RETRY_MS + RETRY_STEP_MS * this.attempts, RETRY_MAX_MS) + this.jitter) as unknown as number;
        }
    }

    private drop(): void {
        clearTimeout(this.pingTimer);
        clearTimeout(this.pongTimer);
        this.pongTimer = 0;
        clearTimeout(this.connectTimer);
        this.joined = false;
        this.out = [];
        var socket = this.socket;
        this.socket = null;
        if (socket) {
            socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
            try {
                socket.close();
            } catch (e) {
                // already closed
            }
        }
    }
}
