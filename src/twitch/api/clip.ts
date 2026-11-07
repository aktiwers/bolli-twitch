// A clip and its MP4 files: Twitch keeps clips as plain MP4 files that need a playback token of their own (signature
// and token as the address's query), asked with the clip in one query as Twitch's TV app does. The clip page and the
// player share the one answer. The addresses carry the token: never log or show them.

import { android } from '../../core/platform.js';
import { gql, notFound, platform } from './gql.js';
import { Clip } from './types.js';
import { CLIP_PICTURE, FOLLOW_FIELDS, GATE_FIELDS, Raw, USER_FIELDS, parseAll, toClip } from './parse.js';
import { Quality } from '../player/engine.js';
import { byQuality, qualityName } from '../player/master.js';

/** Twitch's TV app's player type for clips */
var PLAYER_TYPE = 'pulsar';
/** No bigger file than this on webOS, or where the Android app cannot tell its screen's height */
var MAX_HEIGHT = 1080;

var QUERY = 'query Clip($slug: ID!, $platform: String!, $playerType: String!, $me: Boolean!) { clip(slug: $slug) { ' + CLIP_PICTURE +
    ' videoOffsetSeconds video { id } ' + GATE_FIELDS + ' broadcaster { ' + USER_FIELDS + ' ' + FOLLOW_FIELDS + ' }' +
    ' playbackAccessToken(params: { platform: $platform, playerType: $playerType }) { signature value }' +
    ' videoQualities { quality frameRate sourceURL } } }';

export interface ClipFile {
    clip: Clip;
    /** The file to play on this screen ('' when the clip has no file to play) */
    mp4: string;
    /** Every file, best first, each ready to play (the player's qualities) */
    files: Quality[];
}

/** The clip and its files. Rejects with notFound() when there is no such clip */
export function clip(slug: string): Promise<ClipFile> {
    return gql<Raw>(QUERY, { slug: slug, platform: platform(), playerType: PLAYER_TYPE }).then(toClipFile);
}

export function toClipFile(data: Raw): ClipFile {
    var raw = data && data.clip;
    var c = toClip(raw);
    if (!c) {
        throw notFound();
    }
    var files = clipFiles(raw.videoQualities, raw.playbackAccessToken);
    return { clip: c, mp4: forScreen(files), files: files };
}

/** url with the token Twitch's file server asks for */
function signed(url: string, token: Raw): string {
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'sig=' + encodeURIComponent(token.signature) + '&token=' + encodeURIComponent(token.value);
}

/** A clip's files, best first, each signed; none without a token */
export function clipFiles(qualities: Raw, token: Raw): Quality[] {
    if (!token || !token.signature || !token.value) {
        return [];
    }
    var files = parseAll(qualities, function (q: Raw): Quality | null {
        var height = parseInt(q.quality, 10) || 0;
        var fps = Math.round(q.frameRate || 0);
        return q.sourceURL ? { name: qualityName(height, fps), width: Math.round(height * 16 / 9), height: height, fps: fps, bandwidth: 0, url: signed(q.sourceURL, token) } : null;
    });
    files.sort(byQuality);
    return files;
}

/** The biggest file up to the screen's height (the smallest when all are bigger); '' for none */
function forScreen(files: Quality[]): string {
    var shell = android();
    var max = (shell && shell.screenHeight()) || MAX_HEIGHT;
    for (var i = 0; i < files.length; i++) {
        if (files[i].height <= max) {
            return files[i].url;
        }
    }
    return files.length ? files[files.length - 1].url : '';
}

/** The file to play on this screen for a reply's qualities and token; '' when there is no file or no token */
export function mp4Address(qualities: Raw, token: Raw): string {
    return forScreen(clipFiles(qualities, token));
}
