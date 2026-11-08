// A master playlist's qualities as Twitch's quality menu names them (1080p60, 720p60, 480p, 360p, 160p), best first:
// the one list the session hands to every engine.

import { attrs, resolveUrl } from '../../player/hls.js';
import { Quality } from './engine.js';

/** The quality name Twitch shows for a picture height and frame rate: the rate only above 30 */
export function qualityName(height: number, fps: number): string {
    return height + 'p' + (fps > 30 ? Math.round(fps) : '');
}

/** Best first: the taller picture, then the higher frame rate, then the higher bandwidth */
export function byQuality(a: Quality, b: Quality): number {
    return b.height - a.height || b.fps - a.fps || b.bandwidth - a.bandwidth;
}

/** The master's video qualities, best first (variants without a picture, e.g. audio only, are left out) */
export function parseQualities(text: string, base: string): Quality[] {
    var lines = text.split(/\r?\n/);
    var names: { [group: string]: string } = {};
    var out: Quality[] = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf('#EXT-X-MEDIA:') === 0) {
            var media = attrs(line);
            if (media.TYPE === 'VIDEO' && media['GROUP-ID'] && media.NAME) {
                names[media['GROUP-ID']] = media.NAME.replace(/\s*\(source\)\s*$/i, '');
            }
        } else if (line.indexOf('#EXT-X-STREAM-INF:') === 0) {
            var uri = '';
            for (var j = i + 1; j < lines.length && !uri; j++) {
                uri = lines[j].charAt(0) === '#' ? '' : lines[j].trim();
            }
            var v = attrs(line);
            var size = (v.RESOLUTION || '').split('x');
            var height = +size[1] || 0;
            if (!uri || !height) {
                continue;
            }
            var fps = +v['FRAME-RATE'] || 0;
            out.push({
                name: names[v.VIDEO] || qualityName(height, fps),
                width: +size[0] || 0,
                height: height,
                fps: Math.round(fps),
                bandwidth: +v.BANDWIDTH || 0,
                url: resolveUrl(uri, base),
                codecs: v.CODECS || ''
            });
        }
    }
    out.sort(byQuality);
    return out;
}

var DATE_TAG = '#EXT-X-PROGRAM-DATE-TIME:';

/** A past broadcast's media playlist with only its first date tag: Twitch dates every 10 s segment (2,555 in a 7 h
 * broadcast) and hls.js parses each date on the TV's slow CPU, while nothing here uses them past the first */
export function firstDateOnly(text: string): string {
    var at = text.indexOf(DATE_TAG);
    if (at < 0) {
        return text;
    }
    var next = text.indexOf('\n', at) + 1;
    return next <= 0 ? text : text.slice(0, next) + text.slice(next).replace(/#EXT-X-PROGRAM-DATE-TIME:[^\n]*\n/g, '');
}

/** The segment holding at (s) in a media playlist, its durations added up as hls.js does: where it begins and its
 * address as written; null when at lies past the last segment */
export function segmentAt(text: string, at: number): { start: number; uri: string } | null {
    var re = /#EXTINF:([\d.]+)/g;
    var start = 0;
    for (var m = re.exec(text); m; m = re.exec(text)) {
        var next = start + parseFloat(m[1]);
        if (next > at) {
            return { start: start, uri: addressAfter(text, m.index) };
        }
        start = next;
    }
    return null;
}

/** Where the segment holding at begins; at itself past the last segment */
export function segmentStart(text: string, at: number): number {
    var segment = segmentAt(text, at);
    return segment ? segment.start : at;
}

/** The stretches of a past broadcast Twitch muted for copyrighted audio (its segments' addresses end in -muted), as
 * [start, end] seconds on the playlist's timeline, neighbours joined */
export function mutedRanges(text: string): number[][] {
    var out: number[][] = [];
    var re = /#EXTINF:([\d.]+)/g;
    var start = 0;
    for (var m = re.exec(text); m; m = re.exec(text)) {
        var end = start + parseFloat(m[1]);
        if (/-muted\./.test(addressAfter(text, m.index))) {
            var last = out[out.length - 1];
            if (last && last[1] === start) {
                last[1] = end;
            } else {
                out.push([start, end]);
            }
        }
        start = end;
    }
    return out;
}

/** The first line after the one at from that is not a tag or blank */
function addressAfter(text: string, from: number): string {
    for (var at = text.indexOf('\n', from) + 1; at > 0 && at < text.length;) {
        var end = text.indexOf('\n', at);
        if (end < 0) {
            end = text.length;
        }
        var line = text.slice(at, end).trim();
        if (line && line.charAt(0) !== '#') {
            return line;
        }
        at = end + 1;
    }
    return '';
}

var END_TAG = '#EXT-X-ENDLIST';
var TARGET_TAG = /#EXT-X-TARGETDURATION:(\d+)/;

/** A live media playlist with its target duration cut to its longest segment's, rounded as the HLS spec rounds it.
 * Twitch declares 6 s for its 2 s segments, and hls.js starts a live stream at least a target duration behind the
 * newest segment, so its live sync could not bring the start closer. hls.js times more by it: an unchanged playlist
 * is asked again after half of it, the start's jump over a gap goes up to two of it */
export function liveTarget(text: string): string {
    var m = TARGET_TAG.exec(text);
    if (!m) {
        return text;
    }
    var longest = 0;
    var re = /#EXTINF:([\d.]+)/g;
    for (var e = re.exec(text); e; e = re.exec(text)) {
        longest = Math.max(longest, parseFloat(e[1]));
    }
    var target = Math.max(1, Math.round(longest));
    return longest > 0 && target < +m[1] ? text.replace(TARGET_TAG, '#EXT-X-TARGETDURATION:' + target) : text;
}

/** A past broadcast's media playlist for hls.js: its first date tag only, and an end when it has none (the broadcast
 * still records). Without one hls.js takes it for live and parses all of it again every target duration, which
 * stops the TV for seconds each time in a long broadcast (14,633 segments in 40 h). recording: the end was added */
export function pastBroadcast(text: string): { text: string; recording: boolean } {
    var out = firstDateOnly(text);
    if (out.indexOf(END_TAG) >= 0) {
        return { text: out, recording: false };
    }
    return { text: (out.charAt(out.length - 1) === '\n' ? out : out + '\n') + END_TAG + '\n', recording: true };
}

/** Video codecs by their sample entry (the codecs list's other entries are audio) */
var VIDEO_CODEC = /^(avc[1-4]|hvc1|hev1|dvh1|dvhe|dva1|dvav|av01|vp08|vp09)\b/;

/** Whether this device's Media Source plays a quality's video codecs, checked as hls.js checks its levels (it leaves
 * out the others); true when the master names none */
export function mediaSourcePlays(q: Quality): boolean {
    var MS = (window as unknown as { MediaSource?: { isTypeSupported?(type: string): boolean } }).MediaSource;
    if (!q.codecs || !MS || !MS.isTypeSupported) {
        return true;
    }
    var list = q.codecs.split(',');
    for (var i = 0; i < list.length; i++) {
        var codec = list[i].replace(/^\s+|\s+$/g, '');
        if (VIDEO_CODEC.test(codec) && !MS.isTypeSupported('video/mp4;codecs=' + codec)) {
            return false;
        }
    }
    return true;
}
