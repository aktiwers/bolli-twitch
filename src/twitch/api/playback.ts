// Playback tokens and stream list addresses (Twitch's usher). A token is asked as one of PLAYER_TYPES: popout first,
// then embed, frontpage and mobile_web (Twitch's own types, site on the website and pulsar in its TV app, carry
// segments Twitch stitches in). The stream list is asked through usher v1 as Twitch's TV app asks it, or through v2
// with the website's parameters; the caller picks the version, and the token remembers the one it was made for.
// Tokens, signatures and stream addresses are never logged or shown.

import { gql, platform, randomId } from './gql.js';

/** The player types tokens are asked as, in the order they are tried */
export var PLAYER_TYPES = ['popout', 'embed', 'frontpage', 'mobile_web'];

export type UsherVersion = 'v1' | 'v2';
/** A live channel (by its login) or a past broadcast (by its video id) */
export type StreamKind = 'live' | 'vod';

export interface Token {
    value: string;
    signature: string;
    playerType: string;
    /** The usher version the token was asked for */
    usher: UsherVersion;
}

/** Why a token cannot be had: no broadcast or no such video (offline), refused to this viewer (forbidden) */
export interface TokenRefusal {
    kind: 'offline' | 'forbidden';
    detail: string;
}

var USHER = 'https://usher.ttvnw.net';

/** Per kind: the token's field and its id argument, usher's paths per version, the names v1 gives the token and its
 * signature, and the website's page of the stream (v2) */
var KINDS: { [kind: string]: { field: string; arg: string; idType: string; v1: string; v2: string; auth: string[]; page: string } } = {
    live: {
        field: 'streamPlaybackAccessToken', arg: 'channelName', idType: 'String!',
        v1: '/api/channel/hls/', v2: '/api/v2/channel/hls/', auth: ['token', 'sig'], page: 'https://www.twitch.tv/'
    },
    vod: {
        field: 'videoPlaybackAccessToken', arg: 'id', idType: 'ID!',
        v1: '/vod/', v2: '/vod/v2/', auth: ['nauth', 'nauthsig'], page: 'https://www.twitch.tv/videos/'
    }
};

/** Usher v2 as the website asks it: the token's params, and its player version and build id in the stream list */
var WEB = {
    tokenParams: '{platform: "web", playerBackend: "mediaplayer", playerType: $playerType}',
    playerVersion: '1.58.0-rc.2',
    appVersion: '08fc75f1-8a5e-4702-9287-f6515d9f6a59'
};

interface TokenReply {
    value: string;
    signature: string;
    authorization?: { isForbidden: boolean };
}

/** The token query: the TV app's params with this device's platform name (v1), or the website's (v2) */
function tokenQuery(kind: StreamKind, version: UsherVersion): string {
    var k = KINDS[kind];
    var v1 = version === 'v1';
    return 'query($id: ' + k.idType + (v1 ? ', $platform: String!' : '') + ', $playerType: String!) { ' +
        k.field + '(' + k.arg + ': $id, params: ' + (v1 ? '{platform: $platform, playerType: $playerType}' : WEB.tokenParams) +
        ') { value signature authorization { isForbidden } } }';
}

function refusal(kind: 'offline' | 'forbidden'): TokenRefusal {
    return { kind: kind, detail: 'token: ' + kind };
}

/** A token for a live channel or a past broadcast (also a highlight or upload) as playerType, for usher version.
 * Asked as a guest unless withAccount: with a signed-in viewer's token Twitch stitched its segments into these player
 * types too (seen on the TV), with a guest's it did not; the account is for what a guest may not watch */
export function playbackToken(kind: StreamKind, id: string, playerType: string, version: UsherVersion, withAccount?: boolean): Promise<Token> {
    var vars: { [name: string]: string } = { id: id, playerType: playerType };
    if (version === 'v1') {
        vars.platform = platform();
    }
    return gql<{ [field: string]: TokenReply | null }>(tokenQuery(kind, version), vars, !withAccount).then(function (data) {
        var reply = data[KINDS[kind].field];
        if (!reply || !reply.value) {
            throw refusal('offline');
        }
        if (reply.authorization && reply.authorization.isForbidden) {
            throw refusal('forbidden');
        }
        return { value: reply.value, signature: reply.signature, playerType: playerType, usher: version };
    });
}

/** Whether the token itself says this viewer may not watch (refused, private, blocked here): an usher refusal it
 * explains is final */
export function tokenRefuses(t: Token): boolean {
    try {
        var v = JSON.parse(t.value);
        return !!((v.authorization && v.authorization.forbidden) || (v.private && v.private.allowed_to_view === false) || v.geoblock_reason);
    } catch (e) {
        return false;
    }
}

/** The error code of an usher refusal's body (a list of errors as JSON), or '' */
export function usherCode(body: string): string {
    try {
        var errors = JSON.parse(body);
        var first = errors instanceof Array ? errors[0] : errors;
        return first && typeof first.error_code === 'string' ? first.error_code : '';
    } catch (e) {
        return '';
    }
}

/** name=value pairs in this order, encoded */
function query(pairs: string[][]): string {
    return pairs.map(function (p) { return encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]); }).join('&');
}

/** The codecs usher is told: H.264, and HEVC with high (Twitch's 1440p, player/high.ts: listed only with it) */
function codecs(high?: boolean): string {
    return high ? 'h265,h264' : 'h264';
}

/** Twitch's TV app's parameters (v1): H.264 up to 1920 wide, or with high also HEVC and no width limit */
function tvPairs(kind: StreamKind, t: Token, high?: boolean): string[][] {
    var auth = KINDS[kind].auth;
    return [['player_type', t.playerType], ['player_backend', 'hlsjs'], ['playlist_include_framerate', 'true'],
        ['allow_source', 'true'], ['supported_codecs', codecs(high)]].concat(high ? [] : [['max_width', '1920']])
        .concat(kind === 'live' ? [['transcode_mode', 'cbr_v1']] : [])
        .concat([[auth[0], t.value], [auth[1], t.signature]]);
}

/** The website's parameters (v2), around the token; page: the website's address of the stream */
function webPairs(kind: StreamKind, t: Token, page: string, high?: boolean): string[][] {
    var acmb = btoa(JSON.stringify({ AppVersion: WEB.appVersion, ClientApp: 'twilight', URL: page }));
    return [['acmb', acmb], ['allow_source', 'true'], ['browser_family', 'chrome'], ['browser_version', '151.0'],
        ['cdm', 'wv'], ['enable_score', 'true']]
        .concat(kind === 'live' ? [['fast_bread', 'true']] : [])
        .concat([['include_unavailable', 'true'], ['lang', 'en'], ['os_name', 'Linux'], ['os_version', 'undefined'],
            ['p', String(Math.floor(Math.random() * 1e7))], ['platform', 'web'], ['play_session_id', randomId(32, '0123456789abcdef')],
            ['player_backend', 'mediaplayer'], ['player_version', WEB.playerVersion], ['playlist_include_framerate', 'true'],
            ['reassignments_supported', 'true'], ['sig', t.signature], ['supported_codecs', codecs(high)], ['token', t.value],
            ['transcode_mode', 'cbr_v1']]);
}

/** The master playlist's address for a token (through the usher version the token was asked for); high: with HEVC
 * and no width limit (the signed-in viewer's 1440p) */
export function masterUrl(kind: StreamKind, id: string, t: Token, high?: boolean): string {
    var k = KINDS[kind];
    var name = encodeURIComponent(kind === 'live' ? id.toLowerCase() : id);
    return USHER + (t.usher === 'v2' ? k.v2 : k.v1) + name + '.m3u8?' +
        query(t.usher === 'v2' ? webPairs(kind, t, k.page + name, high) : tvPairs(kind, t, high));
}

/** A way of asking a live stream: player type, platform ('' this device's) and usher version */
export interface Way {
    type: string;
    platform: string;
    usher: UsherVersion;
}

/** Player types beyond PLAYER_TYPES: Twitch's other players (site and pulsar last: they carry its breaks) */
var MORE_TYPES = ['autoplay', 'picture-by-picture', 'thunderdome', 'channel_home_live', 'dashboard', 'site', 'pulsar'];

/** Every way a commercial break may be left behind by: each player type as each platform through v1, and through
 * v2 as the website asks; the session's own ways first */
export var WAYS: Way[] = [];
PLAYER_TYPES.concat(MORE_TYPES).forEach(function (type) {
    ['', 'web', 'android', 'ios'].forEach(function (p) {
        WAYS.push({ type: type, platform: p, usher: 'v1' });
    });
    WAYS.push({ type: type, platform: 'web', usher: 'v2' });
});

/** Aliases Twitch takes in one query */
var ALIASES = 15;

/** Live tokens for ways, ALIASES to a query (one alias each), the queries at once; null for a way Twitch gave none */
export function wayTokens(login: string, ways: Way[], withAccount?: boolean): Promise<(Token | null)[]> {
    var asked: Promise<(Token | null)[]>[] = [];
    for (var i = 0; i < ways.length; i += ALIASES) {
        asked.push(someTokens(login, ways.slice(i, i + ALIASES), withAccount));
    }
    return Promise.all(asked).then(function (parts) {
        return ([] as (Token | null)[]).concat.apply([], parts);
    });
}

function someTokens(login: string, ways: Way[], withAccount?: boolean): Promise<(Token | null)[]> {
    var k = KINDS.live;
    var fields = ways.map(function (w, i) {
        var params = w.usher === 'v1' ? '{platform: "' + (w.platform || platform()) + '", playerType: "' + w.type + '"}' :
            '{platform: "web", playerBackend: "mediaplayer", playerType: "' + w.type + '"}';
        return 't' + i + ': ' + k.field + '(' + k.arg + ': $id, params: ' + params + ') { value signature }';
    });
    return gql<{ [alias: string]: TokenReply | null }>('query($id: String!) { ' + fields.join(' ') + ' }', { id: login }, !withAccount, true)
        .then(function (data) {
            return ways.map(function (w, i) {
                var r = data['t' + i];
                return r && r.value ? { value: r.value, signature: r.signature, playerType: w.type, usher: w.usher } : null;
            });
        });
}

/** A token as playerType for usher version, and the master playlist's address it opens (high: masterUrl's) */
export function playbackUrl(kind: StreamKind, id: string, playerType: string, version: UsherVersion, withAccount?: boolean, high?: boolean): Promise<{ url: string; token: Token }> {
    return playbackToken(kind, id, playerType, version, withAccount).then(function (t) {
        return { url: masterUrl(kind, id, t, high), token: t };
    });
}
