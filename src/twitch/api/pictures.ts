// Twitch's picture addresses at the sizes Twitch's TV app asks: stream previews 276x155 (the Home hero 540x304),
// box art 138x184, video and clip previews 320x180, avatars 50/70/150/300. Twitch's picture server cuts any size,
// so each helper takes a template ({width}x{height}) or an address already sized and gives the size asked.
// Twitch's TV app has stand-ins for stream previews and box art only: a video without a preview stays empty there,
// and Twitch's replies already carry its default avatar for an account without one.

var BOX_ART_404 = 'https://static-cdn.jtvnw.net/ttv-static/404_boxart-{width}x{height}.jpg';
var PREVIEW_404 = 'https://static-cdn.jtvnw.net/ttv-static/404_preview-{width}x{height}.jpg';
/** Twitch's own picture for one still being made (its path, not a word a login may hold) */
var PROCESSING = /\/_404\/|404_processing/;

/** Stream preview on a tile */
export var PREVIEW_WIDTH = 276;
/** Box art on a category tile and beside the hero */
export var BOX_ART_WIDTH = 138;
/** Past broadcast and clip previews on a tile */
export var VIDEO_WIDTH = 320;

/** The sizes Twitch keeps avatars in */
var AVATAR_SIZES = [28, 50, 70, 150, 300, 600];
var TEMPLATE = '{width}x{height}';
var SIZED = /-\d+x\d+(\.\w+)$/;

/** The address at width x height: the template's {width}x{height} filled, or a sized address's size swapped */
export function sized(url: string, width: number, height: number): string {
    if (!url) {
        return '';
    }
    if (url.indexOf(TEMPLATE) >= 0) {
        return url.replace(TEMPLATE, width + 'x' + height);
    }
    return url.replace(SIZED, '-' + width + 'x' + height + '$1');
}

/** A stream preview at this width (16:9); Twitch's stand-in when there is none or it is still being made */
export function previewAt(url: string, width: number): string {
    return sized(!url || PROCESSING.test(url) ? PREVIEW_404 : url, width, Math.round(width * 9 / 16));
}

/** A stream preview for a tile, 276x155 */
export function preview(url: string): string {
    return previewAt(url, PREVIEW_WIDTH);
}

/** A portrait stream's picture, 360x640 as Twitch asks it */
export function verticalPreview(url: string): string {
    return sized(url, 360, 640);
}

/** Box art at this width (3:4); Twitch's stand-in when the category has none */
export function boxArtAt(url: string, width: number): string {
    return sized(url || BOX_ART_404, width, Math.round(width * 4 / 3));
}

/** Box art for a category tile, 138x184 */
export function boxArt(url: string): string {
    return boxArtAt(url, BOX_ART_WIDTH);
}

/** A past broadcast's or clip's preview, 320x180 (a broadcast still being made has Twitch's own picture for that) */
export function videoPreview(url: string): string {
    return sized(url, VIDEO_WIDTH, Math.round(VIDEO_WIDTH * 9 / 16));
}

/** The avatar at size x size (50 tiles, 70 player, 150 channel header, 300 offline channel tile): the nearest
 * size Twitch keeps at or above it */
export function avatarAt(url: string, size: number): string {
    var keep = AVATAR_SIZES[AVATAR_SIZES.length - 1];
    for (var i = 0; i < AVATAR_SIZES.length; i++) {
        if (AVATAR_SIZES[i] >= size) {
            keep = AVATAR_SIZES[i];
            break;
        }
    }
    return sized(url, keep, keep);
}
