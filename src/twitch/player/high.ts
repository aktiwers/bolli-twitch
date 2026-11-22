// Twitch's 1440p: since 2026-06 Partners and Affiliates may stream a 2560x1440 quality, in HEVC (the rest of such a
// stream, 1080p and lower, is H.264, both fMP4). Twitch lists it only to a signed-in viewer's token (to a guest's
// it is "unavailable media", AUTHZ_NOT_LOGGED_IN) and only when the stream list is asked with HEVC among the
// supported codecs and no width limit. The session's own stream stays the guest's (its ad-free player types); the
// signed-in viewer's list is asked beside it and only its qualities the guest's lacks are added (high), each going
// through the commercial break swap as any other (session.ts).
//
// Where HEVC at 1440p60 plays through Media Source (on Android in a hardware decoder: in software it is too slow for
// a TV box). This LG TV (webOS 3.9, Chrome 38) plays it: 2560x1440 at 60 frames a second shown, none dropped. With
// SourceBuffer.changeType a switch between the HEVC quality and an H.264 one (the viewer's, a break's, a stall's)
// goes on in the same buffers; without it (Chrome 38 has none) the session starts the stream again at the other
// quality (switchesCodec), and a kept pipeline of the other codec is not taken. Auto starts at 1440p only on a screen
// taller than 1080 lines.

import { android, oldEngine } from '../../core/platform.js';
import { resolveUrl } from '../../player/hls.js';
import { Quality } from './engine.js';
import { mediaSourcePlays, VIDEO_CODEC } from './master.js';

/** The HEVC 1440p60 Twitch lists (Main profile, level 5.0), the check for what this device plays */
var PROBE = 'hev1.1.6.L150.90';

var here: boolean | null = null;

var switches: boolean | null = null;

/** Whether this device's Media Source switches a buffer from one codec to another in place (changeType) */
export function switchesCodec(): boolean {
    if (switches === null) {
        var w = window as unknown as { SourceBuffer?: { prototype: { changeType?: unknown } } };
        switches = !!w.SourceBuffer && typeof w.SourceBuffer.prototype.changeType === 'function';
    }
    return switches;
}

/** For the tests: the device's answer forgotten (null) or set */
export function setSwitchesCodec(value: boolean | null): void {
    switches = value;
}

/** The video codec's kind in a codecs list (avc, hevc, Dolby Vision's under the one it is built on; av01, vp08,
 * vp09 as named; '' none named) */
function videoKind(codecs?: string): string {
    var list = (codecs || '').split(',');
    for (var i = 0; i < list.length; i++) {
        var m = VIDEO_CODEC.exec(list[i].trim());
        if (m) {
            return /^(avc|dva)/.test(m[1]) ? 'avc' : /^(hvc|hev|dvh)/.test(m[1]) ? 'hevc' : m[1];
        }
    }
    return '';
}

/** Whether a buffer of codecs a takes codecs b here: in place with changeType, or the same video codec (or one not
 * named); otherwise the stream starts again (session.ts toQuality) and a pipeline of a is not taken */
export function takesCodec(a?: string, b?: string): boolean {
    return switchesCodec() || sameCodec(a, b);
}

/** Whether a buffer of codecs a takes codecs b without changeType (the same video codec, or one not named) */
export function sameCodec(a?: string, b?: string): boolean {
    var x = videoKind(a);
    var y = videoKind(b);
    return !x || !y || x === y;
}

/** Whether this device plays Twitch's 1440p: HEVC at 1440p60 through Media Source */
export function highHere(): boolean {
    if (here === null) {
        here = check();
    }
    return here;
}

/** For the tests: the device's answer forgotten (null) or set */
export function setHighHere(value: boolean | null): void {
    here = value;
}

function check(): boolean {
    var w = window as unknown as { MediaSource?: { isTypeSupported?(type: string): boolean } };
    if (oldEngine() || !w.MediaSource || !w.MediaSource.isTypeSupported) {
        return false;
    }
    try {
        if (!w.MediaSource.isTypeSupported('video/mp4;codecs="' + PROBE + '"')) {
            return false;
        }
    } catch (e) {
        return false;
    }
    // (the web app comes inside the Android app, so its shell is always one that tells HEVC apart, in hardware)
    var shell = android();
    return !shell || (!!shell.decodes && shell.decodes(PROBE, 2560, 1440, 60));
}

/** Whether Auto may start at a quality taller than 1080 lines: the screen has more (Android: its largest mode; webOS:
 * the app's window is 1920 wide on a 4K TV, 1280 on an HD or Full HD one) */
export function tallScreen(): boolean {
    var shell = android();
    if (shell) {
        return shell.screenHeight() > 1080;
    }
    return window.innerWidth >= 1920;
}

/** Of the signed-in viewer's qualities, those the guest's list lacks (by name) that play here, marked high */
export function extraQualities(guest: Quality[], account: Quality[]): Quality[] {
    var have: { [name: string]: boolean } = {};
    for (var i = 0; i < guest.length; i++) {
        have[guest[i].name] = true;
    }
    var out: Quality[] = [];
    for (var j = 0; j < account.length; j++) {
        var q = account[j];
        if (!have[q.name] && mediaSourcePlays(q)) {
            out.push({ name: q.name, width: q.width, height: q.height, fps: q.fps, bandwidth: q.bandwidth, url: q.url, codecs: q.codecs, high: true });
        }
    }
    return out;
}

/** The guest's master with the signed-in viewer's variants for extra added (each variant's stream line, its video
 * group's media line and its address resolved against accountUrl, the signed-in master's), for hls.js to list them as
 * levels */
export function mergedMaster(guestText: string, accountText: string, accountUrl: string, extra: Quality[]): string {
    if (!extra.length) {
        return guestText;
    }
    var want: { [url: string]: boolean } = {};
    for (var i = 0; i < extra.length; i++) {
        want[extra[i].url] = true;
    }
    var lines = accountText.split(/\r?\n/);
    var media: { [group: string]: string } = {};
    for (var m = 0; m < lines.length; m++) {
        var g = /^#EXT-X-MEDIA:.*GROUP-ID="([^"]+)"/.exec(lines[m]);
        if (g && /TYPE=VIDEO/.test(lines[m])) {
            media[g[1]] = lines[m];
        }
    }
    var added: string[] = [];
    for (var k = 0; k < lines.length; k++) {
        if (lines[k].indexOf('#EXT-X-STREAM-INF:') !== 0) {
            continue;
        }
        var uri = '';
        for (var u = k + 1; u < lines.length && !uri; u++) {
            uri = lines[u].charAt(0) === '#' ? '' : lines[u].trim();
        }
        uri = uri && resolveUrl(uri, accountUrl);
        if (!uri || !want[uri]) {
            continue;
        }
        var group = /VIDEO="([^"]+)"/.exec(lines[k]);
        if (group && media[group[1]] && guestText.indexOf('GROUP-ID="' + group[1] + '"') < 0) {
            added.push(media[group[1]]);
        }
        added.push(lines[k], uri);
    }
    var text = guestText.replace(/\s+$/, '');
    return added.length ? text + '\n' + added.join('\n') + '\n' : guestText;
}
