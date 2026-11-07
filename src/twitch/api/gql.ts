// Twitch's GraphQL API, asked the way Twitch's TV app asks it: plain queries (no persisted hashes, no bot check)
// with the TV app's client id, a device id kept on this TV and the TV app's platform name. Signed in, the account's
// token goes along (api/auth.ts sets it); the token and the device id are never logged or shown.

import { postJson, HttpError } from '../../core/http.js';
import { android } from '../../core/platform.js';
import { load, save } from '../../core/store.js';

/** Twitch's TV app's client id: a sign-in token only works with the id it was made for */
export var CLIENT_ID = 'ue6666qo983tsx6so1t0vnawi233wa';
var GQL_URL = 'https://gql.twitch.tv/gql';
var DEVICE_KEY = 'twitch.device';
/** A query that declares $me is told whether the account's token goes along */
var DECLARES_ME = /\$me\s*:/;

/** The platform name Twitch's TV app sends on this device: its replies (rows, tokens) are made for it */
export function platform(): string {
    return android() ? 'androidtv_web_tv' : 'lg_web_tv';
}

var authToken = '';
var deviceId = '';
var authFailed: (() => void) | null = null;

/** The account's token, or '' for a guest (api/auth.ts) */
export function setAuthToken(token: string): void {
    authToken = token;
}

export function signedIn(): boolean {
    return authToken !== '';
}

/** Called once when Twitch refuses the account's token (signed out elsewhere, or revoked): api/auth.ts forgets it */
export function onAuthFailed(handler: () => void): void {
    authFailed = handler;
}

/** 32 random letters and digits, made once per TV like Twitch's own device id: Home's rows need one */
export function device(): string {
    if (!deviceId) {
        deviceId = load<string>(DEVICE_KEY) || '';
        if (!/^[0-9a-z]{32}$/.test(deviceId)) {
            deviceId = randomId(32);
            save(DEVICE_KEY, deviceId);
        }
    }
    return deviceId;
}

/** n random characters of chars (letters and digits unless given; also the requestID of a Home load) */
export function randomId(n: number, chars?: string): string {
    chars = chars || 'abcdefghijklmnopqrstuvwxyz0123456789';
    var out = '';
    for (var i = 0; i < n; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
}

/** Why a query failed: no answer or Twitch's servers failing (network: worth asking again later), the token
 * refused (auth), Twitch's own errors or a reply that is not one (twitch), no such item (notfound) */
export type GqlErrorKind = 'network' | 'auth' | 'twitch' | 'notfound';

export interface GqlError {
    kind: GqlErrorKind;
    /** Twitch's error messages (e.g. "service error"), or the HTTP failure's */
    errors: string[];
    /** Where each of Twitch's errors points: its path joined with dots, '' for none */
    paths: string[];
    status: number;
}

interface Reply {
    data?: { [field: string]: unknown } | null;
    errors?: { message: string; path?: (string | number)[] }[];
}

/** The rejection for an item Twitch does not have (a category, channel, clip or video) */
export function notFound(): GqlError {
    return { kind: 'notfound', errors: ['not found'], paths: [], status: 200 };
}

/** One query; its data, or a GqlError. A field that only an account may see comes back null with an
 * "unauthenticated" error beside the data: that is a reply, not a failure. No data at all, or a root field that
 * is null with an error on it, is a failure */
export function gql<T>(query: string, variables?: { [name: string]: unknown }): Promise<T> {
    var headers: { [name: string]: string } = { 'Client-ID': CLIENT_ID, 'Device-Id': device(), 'Content-Type': 'text/plain;charset=UTF-8' };
    var sentWith = authToken;
    if (sentWith) {
        headers.Authorization = 'OAuth ' + sentWith;
    }
    var vars = variables || {};
    if (DECLARES_ME.test(query)) {
        vars.me = sentWith !== '';
    }
    return postJson<Reply>(GQL_URL, { query: query, variables: vars }, headers).then(function (reply) {
        var errors = (reply && reply.errors) || [];
        var data = reply && reply.data;
        var failed = !data;
        for (var i = 0; data && !failed && i < errors.length; i++) {
            var root = errors[i].path ? errors[i].path![0] : undefined;
            failed = root !== undefined && data[root] === null;
        }
        if (failed) {
            throw {
                kind: 'twitch',
                errors: errors.length ? errors.map(function (e) { return e.message; }) : ['no data'],
                paths: errors.map(function (e) { return e.path ? e.path.join('.') : ''; }),
                status: 200
            } as GqlError;
        }
        return data as unknown as T;
    }, function (e: HttpError) {
        if (e.status === 401 && sentWith && sentWith === authToken) {
            authToken = '';
            if (authFailed) {
                authFailed();
            }
        }
        var kind: GqlErrorKind = e.status === 0 || e.status >= 500 ? 'network' : e.status === 401 ? 'auth' : 'twitch';
        throw { kind: kind, errors: [e.message], paths: [], status: e.status } as GqlError;
    });
}
