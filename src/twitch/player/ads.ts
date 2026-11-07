// Ad pieces in a live media playlist. Twitch stitches its ads into the stream: a date range of class
// twitch-stitched-ad, and ad segments whose title is not "live" (live segments are titled "live"). The ad-free player
// types carry none; when one shows up anyway the session asks the stream again as the next player type, and on the
// Media Source engine the ad segments meanwhile become gaps, which hls.js skips.

/** An ad segment's title line: a title that is not "live" */
var AD_TITLE = /^#EXTINF:[^,]*,(?!live)\S/i;

/** Ad segments marked as gaps so far (for the test hook's state) */
export var adStats = { marked: 0 };

/** Where the next ad segment's title line ends (its line break) at or after from; -1 for none */
function nextAd(text: string, from: number): number {
    for (var at = text.indexOf('#EXTINF:', from); at >= 0; at = text.indexOf('#EXTINF:', at + 8)) {
        var end = text.indexOf('\n', at);
        if (end < 0) {
            return -1;
        }
        if (AD_TITLE.test(text.slice(at, end))) {
            return end;
        }
    }
    return -1;
}

/** Whether a live media playlist holds ad markers */
export function hasAds(text: string): boolean {
    return text.indexOf('stitched-ad') >= 0 || nextAd(text, 0) >= 0;
}

/** The playlist with each ad segment marked as a gap (#EXT-X-GAP before its address; the segments keep their places,
 * so the media sequence numbers of those around them stay right), and whether it held ad markers. One pass; a
 * playlist without ad segments comes back as it is. */
export function markAdGaps(text: string): { text: string; ads: boolean } {
    var out = '';
    var copied = 0;
    var found = text.indexOf('stitched-ad') >= 0;
    for (var end = nextAd(text, 0); end >= 0; end = nextAd(text, copied)) {
        found = true;
        // The segment's address: the next line that is neither a tag nor blank
        var line = end + 1;
        while (line < text.length && /[#\r\n]/.test(text.charAt(line))) {
            var next = text.indexOf('\n', line);
            line = next < 0 ? text.length : next + 1;
        }
        if (line >= text.length) {
            break;
        }
        out += text.slice(copied, line) + '#EXT-X-GAP\n';
        copied = line;
        adStats.marked++;
    }
    return { text: copied ? out + text.slice(copied) : text, ads: found };
}
