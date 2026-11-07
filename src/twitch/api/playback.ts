// Playback tokens and stream list addresses (Twitch's usher). A token is asked as an ad-free player type: popout
// first, then embed, frontpage and mobile_web (Twitch's own types, site on the website and pulsar in its TV app, carry
// stitched ads). The stream list is asked through usher v1 as Twitch's TV app asks it, or through v2 with the
// website's parameters; the caller picks the version, and the token remembers the one it was made for. Tokens,
// signatures and stream addresses are never logged or shown.

import { gql, platform, randomId } from './gql.js';

/** The ad-free player types, in the order they are tried */
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

/** A token for a live channel or a past broadcast (also a highlight or upload) as playerType, for usher version */
export function playbackToken(kind: StreamKind, id: string, playerType: string, version: UsherVersion): Promise<Token> {
    var vars: { [name: string]: string } = { id: id, playerType: playerType };
    if (version === 'v1') {
        vars.platform = platform();
    }
    return gql<{ [field: string]: TokenReply | null }>(tokenQuery(kind, version), vars).then(function (data) {
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

/** name=value pairs in this order, encoded */
function query(pairs: string[][]): string {
    return pairs.map(function (p) { return encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]); }).join('&');
}

/** Twitch's TV app's parameters (v1). The TV decodes H.264 only (Twitch's TV app also offers AV1) */
function tvPairs(kind: StreamKind, t: Token): string[][] {
    var auth = KINDS[kind].auth;
    return [['player_type', t.playerType], ['player_backend', 'hlsjs'], ['playlist_include_framerate', 'true'],
        ['allow_source', 'true'], ['supported_codecs', 'h264'], ['max_width', '1920']]
        .concat(kind === 'live' ? [['transcode_mode', 'cbr_v1']] : [])
        .concat([[auth[0], t.value], [auth[1], t.signature]]);
}

/** The website's parameters (v2), around the token; page: the website's address of the stream */
function webPairs(kind: StreamKind, t: Token, page: string): string[][] {
    var acmb = btoa(JSON.stringify({ AppVersion: WEB.appVersion, ClientApp: 'twilight', URL: page }));
    return [['acmb', acmb], ['allow_source', 'true'], ['browser_family', 'chrome'], ['browser_version', '151.0'],
        ['cdm', 'wv'], ['enable_score', 'true']]
        .concat(kind === 'live' ? [['fast_bread', 'true']] : [])
        .concat([['include_unavailable', 'true'], ['lang', 'en'], ['os_name', 'Linux'], ['os_version', 'undefined'],
            ['p', String(Math.floor(Math.random() * 1e7))], ['platform', 'web'], ['play_session_id', randomId(32, '0123456789abcdef')],
            ['player_backend', 'mediaplayer'], ['player_version', WEB.playerVersion], ['playlist_include_framerate', 'true'],
            ['reassignments_supported', 'true'], ['sig', t.signature], ['supported_codecs', 'h264'], ['token', t.value],
            ['transcode_mode', 'cbr_v1']]);
}

/** The master playlist's address for a token (through the usher version the token was asked for) */
export function masterUrl(kind: StreamKind, id: string, t: Token): string {
    var k = KINDS[kind];
    var name = encodeURIComponent(kind === 'live' ? id.toLowerCase() : id);
    return USHER + (t.usher === 'v2' ? k.v2 : k.v1) + name + '.m3u8?' +
        query(t.usher === 'v2' ? webPairs(kind, t, k.page + name) : tvPairs(kind, t));
}

/** A token as playerType for usher version, and the master playlist's address it opens */
export function playbackUrl(kind: StreamKind, id: string, playerType: string, version: UsherVersion): Promise<{ url: string; token: Token }> {
    return playbackToken(kind, id, playerType, version).then(function (t) {
        return { url: masterUrl(kind, id, t), token: t };
    });
}
