// A past broadcast playing in its own tile on Favorites' Latest Broadcasts grid, as the channel page's preview plays
// in its box (channel/preview.ts): once focus rests on the tile (the tab's Rest, after what OK opens was fetched and
// readied ahead) it plays there with sound, from where the viewer stopped in it or else its start, at full screen's
// quality, so OK hands it to the player as it is. The app's one video lies under the page: the tile drops its lift
// and is clear over the picture box only once the picture moves, and any move stops it at once. Settings' Favorites
// Previews switches it on (off by default); off, only the start ahead out of sight is left.

import { toggleClass } from '../../../core/dom.js';
import { load, save } from '../../../core/store.js';
import { Item } from '../../api/types.js';
import { Box, keyOf, SessionEvents, Target } from '../../player/session.js';
import { PreviewPlayer } from '../channel/preview.js';
import { gatePassed } from '../player/gate.js';
import { startOf } from '../player/resume.js';
import { Tile } from '../tiles.js';

var KEY = 'twitch.favorites.previews';
var on: boolean | null = null;

export function favoritePreviews(): boolean {
    if (on === null) {
        on = load<boolean>(KEY) === true;
    }
    return on;
}

/** Holds from the next rest on a tile */
export function setFavoritePreviews(value: boolean): void {
    on = value;
    save(KEY, value);
}

/** The value read again from the device (tests) */
export function forgetFavoritePreviews(): void {
    on = null;
}

/** A tile's picture box in 1280x720 units (home.css): its border 2.67 and the picture 12 in from its sides, 150 tall,
 * not lifted (the lift would cut the tile's border and ring across the video) */
var EDGE = 2.67;
var SIDE = 12;
var PICTURE_HEIGHT = 150;

/** The picture box of a tile whose left and top on screen are these, step wide */
export function pictureBox(left: number, top: number, step: number): Box {
    return { left: left + EDGE + SIDE, top: top + EDGE, width: step - 2 * (EDGE + SIDE), height: PICTURE_HEIGHT };
}

/** At the quality full screen plays, with sound, as the channel page's preview */
var OPTIONS = { muted: false, remember: false };

/** What a tile's preview plays: a past broadcast its player would start without asking first (not one behind a gate
 * the viewer has not passed, nor one whose page has to tell that), where its player starts it; null for none */
export function previewTarget(item: Item | null): Target | null {
    if (!item || item.kind !== 'video') {
        return null;
    }
    var v = item.video;
    if (!v.publishedAt || v.mature && !gatePassed(v.channel.login, !!v.restricted)) {
        return null;
    }
    return { kind: 'vod', id: v.id, startAt: startOf(v) };
}

export class GridPreview {
    private events: SessionEvents;
    /** What plays, and the tile it plays in (null: none) */
    private key = '';
    private tile: Tile | null = null;

    constructor(private player: PreviewPlayer) {
        var self = this;
        this.events = {
            playing: function () {
                self.clear(true);
            },
            failed: function () {
                self.clear(false);
            }
        };
    }

    /** Focus is on item now (null: off the grid): a preview of another one stops */
    want(item: Item | null): void {
        var target = previewTarget(item);
        if (this.key && (!target || keyOf(target) !== this.key)) {
            this.stop();
        }
    }

    /** Plays item in tile, its picture box at box; one that plays there already goes on */
    start(item: Item, tile: Tile, box: Box): void {
        var target = previewTarget(item);
        if (!target || keyOf(target) === this.key && this.player.owns(this.events)) {
            return;
        }
        this.stop();
        this.key = keyOf(target);
        this.tile = tile;
        this.player.placeVideo(box);
        this.player.play(target, this.events, OPTIONS);
    }

    /** Stops what it plays (focus moved, or left the grid) */
    stop(): void {
        if (this.key && this.player.owns(this.events)) {
            this.player.stop();
            this.player.placeVideo(null);
        }
        this.end();
    }

    /** The tab goes out of sight: the screen shown over it may claim the playback (OK opened its player); if none
     * does in this navigation, it stops */
    leave(): void {
        if (!this.key) {
            return;
        }
        this.player.leave(this.events);
        this.end();
        var self = this;
        Promise.resolve().then(function () {
            if (self.player.owns(self.events)) {
                self.player.stop();
            }
        });
    }

    /** Whether a preview plays (or starts) in a tile */
    get playing(): boolean {
        return !!this.key;
    }

    private end(): void {
        this.clear(false);
        this.key = '';
        this.tile = null;
    }

    /** The tile clear over the moving picture, or drawn whole */
    private clear(on: boolean): void {
        if (this.tile) {
            toggleClass(this.tile.el, 'bt-tile--preview', on);
        }
    }
}
