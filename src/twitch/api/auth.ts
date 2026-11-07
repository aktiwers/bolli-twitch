// Sign-in as Twitch's TV app does it: the device-code flow on id.twitch.tv with the TV app's client id and scopes.
// The TV shows a code (and a QR code) for twitch.tv/activate and asks every few seconds until the account allows
// it; the code ends after 30 minutes and the page then asks a new one. Leaving Sign In or hiding the app stops the
// asking; a return to Sign In while more than 2 minutes of the code are left goes on with the same code. Only the
// access token is kept (Twitch's TV app keeps no refresh token either); Twitch refusing it later signs out. The
// account's details (login, avatar) are asked right after a sign-in, and at start when none are kept: chat signs in
// with the login and Home keeps its copy by the account's id. Codes and tokens are never logged.

import { HttpError, errorBody, postForm } from '../../core/http.js';
import { load, save } from '../../core/store.js';
import { CLIENT_ID, gql, onAuthFailed, setAuthToken, signedIn } from './gql.js';
import { Channel } from './types.js';
import { Raw, USER_FIELDS, toChannel } from './parse.js';

var DEVICE_URL = 'https://id.twitch.tv/oauth2/device';
var TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
var REVOKE_URL = 'https://id.twitch.tv/oauth2/revoke';
var SCOPES = 'channel_read chat:read user_blocks_edit user_blocks_read user_follows_edit user_read';
var GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
var KEY = 'twitch.account';
/** A return to Sign In shows the last code again while more than this is left of it */
export var RESUME_MS = 120000;
/** A failed ask of the account's details is tried again after this, doubling up to USER_RETRY_MAX_MS */
var USER_RETRY_MS = 10000;
var USER_RETRY_MAX_MS = 120000;

interface Saved {
    token: string;
    /** The account as last seen, for drawing the menu at once on the next start */
    user?: Channel;
}

export interface SignIn {
    /** The code to type at the address, as Twitch's TV app shows it: XXXX-XXXX */
    code: string;
    /** The address shown beside the code: https://www.twitch.tv/activate */
    uri: string;
    /** The address for the QR code: the activate page with the code filled in */
    qr: string;
    /** Seconds the code has left */
    expiresIn: number;
    /** True once the account allowed it (the token is kept and in use). False when the code ran out or Twitch
     * refused it (the page then asks a new code, as Twitch's TV app does), or when the page cancelled or the app
     * was hidden (a return to Sign In goes on with the same code while it lasts) */
    done: Promise<boolean>;
    /** Stops asking (the page left); the code stays for a return */
    cancel(): void;
}

/** Twitch's device reply; its verification_uri already carries public=true&device-code=<user code> */
interface DeviceReply {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
}

/** A token request Twitch refused: its message (authorization_pending, slow_down, invalid device code, ...) and the
 * HTTP status (0: no answer) */
export interface PollError {
    message: string;
    status: number;
}

var saved: Saved | null = null;
var userAsk: Promise<Channel | null> | null = null;
var userTimer = 0;
var userRetryMs = USER_RETRY_MS;
var active: SignIn | null = null;
/** startSignIn() calls so far: a device reply for an older one is dropped */
var signInCalls = 0;
/** The last code Twitch gave and when it runs out, until it is used up */
var lastCode: { reply: DeviceReply; ends: number } | null = null;
var listeners: ((signedIn: boolean) => void)[] = [];

/** At start: the kept token goes to every query; Twitch refusing it later forgets it */
export function initAuth(): void {
    saved = load<Saved>(KEY);
    setAuthToken(saved && saved.token ? saved.token : '');
    onAuthFailed(forget);
    clearTimeout(userTimer);
    userRetryMs = USER_RETRY_MS;
    if (saved && saved.token && !saved.user) {
        loadUser();
    }
}

/** listener(signedIn) after each sign-in, sign-out and token Twitch refused */
export function onAccountChange(listener: (signedIn: boolean) => void): void {
    listeners.push(listener);
}

function changed(): void {
    var now = signedIn();
    var all = listeners.slice();
    for (var i = 0; i < all.length; i++) {
        all[i](now);
    }
}

/** The account's login and token for Twitch's chat; null for a guest, and until the account's login is known */
export function chatAccount(): { login: string; token: string } | null {
    return saved && saved.token && saved.user ? { login: saved.user.login, token: saved.token } : null;
}

/** The account as kept from the last start (instant menu), or null for a guest */
export function savedUser(): Channel | null {
    return saved && saved.token && saved.user ? saved.user : null;
}

/** The code to show, polling at once: the last one again while more than 2 minutes of it are left, else a new one.
 * A call made again before its code came rejects with the message 'replaced' (the newer call's code is the one
 * polled) */
export function startSignIn(): Promise<SignIn> {
    var call = ++signInCalls;
    if (active) {
        active.cancel();
    }
    if (lastCode && lastCode.ends - Date.now() > RESUME_MS) {
        return Promise.resolve(toSignIn(lastCode.reply, poll));
    }
    return postForm<DeviceReply>(DEVICE_URL, { client_id: CLIENT_ID, scopes: SCOPES }).then(function (reply) {
        if (call !== signInCalls) {
            throw { message: 'replaced', status: 0 } as PollError;
        }
        return toSignIn(reply, poll);
    });
}

/** The page's view of a device reply, with a poller that asks for the token until it comes, the code runs out or
 * Twitch refuses it (the code is then used up), or the page cancels or the app is hidden (the code stays) */
export function toSignIn(reply: DeviceReply, ask: (deviceCode: string) => Promise<string>): SignIn {
    var deviceCode = reply.device_code;
    var ends = lastCode && lastCode.reply === reply ? lastCode.ends : Date.now() + reply.expires_in * 1000;
    var every = Math.max(reply.interval || 5, 1) * 1000;
    var stopped = false;
    var timer = 0;
    var resolve: (ok: boolean) => void = function () { /* set below */ };
    lastCode = { reply: reply, ends: ends };
    var signIn: SignIn = {
        code: formatCode(reply.user_code),
        uri: activatePage(reply.verification_uri),
        qr: qrAddress(reply.verification_uri, reply.user_code),
        expiresIn: Math.max(0, Math.round((ends - Date.now()) / 1000)),
        done: new Promise<boolean>(function (r) { resolve = r; }),
        cancel: function () { finish(false, false); }
    };
    /** Ends this sign-in; usedUp: the code is spent (allowed, ran out or refused), a return asks a new one */
    function finish(ok: boolean, usedUp: boolean): void {
        if (usedUp && lastCode && lastCode.reply.device_code === deviceCode) {
            lastCode = null;
        }
        if (stopped) {
            return;
        }
        stopped = true;
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', hidden, false);
        if (active === signIn) {
            active = null;
        }
        resolve(ok);
    }
    function hidden(): void {
        if (document.hidden) {
            finish(false, false);
        }
    }
    function next(): void {
        if (Date.now() >= ends) {
            finish(false, true);
            return;
        }
        timer = setTimeout(function () {
            ask(deviceCode).then(function (token) {
                // The account allowed it: signed in even when the page left meanwhile, as the code is spent; a
                // newer sign-in still asking is no longer needed
                finish(true, true);
                if (active) {
                    active.cancel();
                }
                signedInWith(token);
            }, function (e: PollError) {
                if (stopped) {
                    return;
                }
                if (e.message === 'slow_down') {
                    every += 5000;
                }
                if (e.message === 'authorization_pending' || e.message === 'slow_down' || e.status === 0 || e.status >= 500) {
                    next();
                } else {
                    finish(false, true);
                }
            });
        }, every);
    }
    if (active) {
        active.cancel();
    }
    active = signIn;
    document.addEventListener('visibilitychange', hidden, false);
    // The code came while the app is hidden: stopped as hiding stops it, the code kept for a return
    if (document.hidden) {
        hidden();
    } else {
        next();
    }
    return signIn;
}

/** XXXXXXXX as XXXX-XXXX (groups of four, as Twitch's TV app shows it) */
export function formatCode(code: string): string {
    var groups: string[] = [];
    for (var i = 0; i < code.length; i += 4) {
        groups.push(code.slice(i, i + 4));
    }
    return groups.join('-');
}

/** The activate page without the reply's query, as the screen shows it */
function activatePage(uri: string): string {
    var q = uri.indexOf('?');
    return q >= 0 ? uri.slice(0, q) : uri;
}

/** The QR code's address as Twitch's TV app makes it: the reply's address with device-code set (once) and
 * device-metadata=qr_code */
function qrAddress(uri: string, userCode: string): string {
    var q = uri.indexOf('?');
    var params = q >= 0 ? uri.slice(q + 1).split('&') : [];
    var keep: string[] = [];
    for (var i = 0; i < params.length; i++) {
        if (params[i] && !/^device-(code|metadata)=/.test(params[i])) {
            keep.push(params[i]);
        }
    }
    keep.push('device-code=' + encodeURIComponent(userCode), 'device-metadata=qr_code');
    return activatePage(uri) + '?' + keep.join('&');
}

/** One token request: the access token, or rejects with a PollError */
function poll(deviceCode: string): Promise<string> {
    return postForm<{ access_token?: string }>(TOKEN_URL, { client_id: CLIENT_ID, device_code: deviceCode, grant_type: GRANT }).then(function (reply) {
        if (!reply || !reply.access_token) {
            throw { message: 'no token', status: 200 } as PollError;
        }
        return reply.access_token;
    }, function (e: HttpError) {
        var body = errorBody<{ message?: string }>(e);
        throw { message: (body && body.message) || e.message, status: e.status } as PollError;
    });
}

function signedInWith(token: string): void {
    saved = { token: token };
    save(KEY, saved);
    setAuthToken(token);
    userAsk = null;
    userRetryMs = USER_RETRY_MS;
    loadUser();
    changed();
}

/** Asks the account's details for chat and Home; a failure is tried again later while the same token has none */
function loadUser(): void {
    clearTimeout(userTimer);
    userTimer = 0;
    var token = saved ? saved.token : '';
    currentUser().then(function () {
        userRetryMs = USER_RETRY_MS;
    }, function () {
        if (saved && saved.token === token && !saved.user) {
            userTimer = setTimeout(loadUser, userRetryMs) as unknown as number;
            userRetryMs = Math.min(USER_RETRY_MAX_MS, userRetryMs * 2);
        }
    });
}

/** Signs out on this TV and asks Twitch to end the token (Twitch's TV app only forgets it) */
export function signOut(): void {
    var token = saved && saved.token;
    forget();
    if (token) {
        postForm(REVOKE_URL, { client_id: CLIENT_ID, token: token }).then(null, function () { /* forgotten here anyway */ });
    }
}

function forget(): void {
    var had = !!(saved && saved.token);
    saved = null;
    save(KEY, null);
    setAuthToken('');
    userAsk = null;
    clearTimeout(userTimer);
    userTimer = 0;
    if (had) {
        changed();
    }
}

/** The signed-in account (name, avatar), asked once per start; null for a guest. Kept for the next start only
 * when its name or avatar changed, and only for the token it was asked with (not after a sign-out or another
 * sign-in meanwhile) */
export function currentUser(): Promise<Channel | null> {
    if (!signedIn()) {
        return Promise.resolve(null);
    }
    if (!userAsk) {
        var token = saved ? saved.token : '';
        var ask: Promise<Channel | null> = gql<Raw>('query { currentUser { ' + USER_FIELDS + ' } }').then(function (data: Raw) {
            var user = toChannel(data && data.currentUser);
            var old = saved && saved.user;
            if (user && saved && saved.token === token &&
                (!old || old.login !== user.login || old.displayName !== user.displayName || old.avatar !== user.avatar)) {
                saved.user = user;
                save(KEY, saved);
            }
            return user;
        }, function (e: unknown) {
            if (userAsk === ask) {
                userAsk = null;
            }
            throw e;
        });
        userAsk = ask;
    }
    return userAsk;
}
