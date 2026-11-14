// The TV's own player: clips (plain MP4 files), past broadcasts once the Media Source worker failed (their TS plays
// here, fMP4 does not), and every stream on a device without Media Source (session.ts engineFor; it cannot play
// Twitch live on the TV). A stream's chosen media playlist, or a clip's file, goes straight into the video (given the
// master, the TV's player starts at its lowest variant and climbs slowly). Auto plays the best quality the remembered
// line speed allows (bandwidth.ts); a stream whose picture stalls twice within a while steps one quality down (its
// own picks stay there for the app's run, hls.js's measured speed is not touched), and a picture that stands still is reloaded (the TV's player does not
// always go on after a gap). Clips loop, as on Twitch, and are never stepped down.

import { unloadVideo, watchStill } from '../../player/video.js';
import { Engine, EngineEvents, hideVideo, playVideo, Source } from './engine.js';
import { fitQuality, lowerTo, nativeBandwidth } from './bandwidth.js';
import { whenKeysRest } from './rest.js';

/** Two stalls this close together step Auto one quality down */
var STALL_WINDOW_MS = 30 * 1000;
/** A wait this soon after a load or a seek is the start filling up, not a stall */
var SETTLE_MS = 3000;
/** A picture standing still this long (s) is reloaded */
var STILL_S = 8;

export class NativeEngine implements Engine {
    readonly keepsPipeline = false;
    private events: EngineEvents | null = null;
    private source: Source | null = null;
    private choice = -1;
    private pausedOn = false;
    private playing = -1;
    private lastStall = 0;
    /** The last load or seek (waits right after one are not stalls) */
    private settling = 0;
    /** Where to go once the new file's metadata is in (s; 0 none) */
    private resumeAt = 0;
    private listeners: { [event: string]: () => void } = {};
    private unwatch: (() => void) | null = null;

    constructor(private video: HTMLVideoElement) {}

    /** Plays source; its address replaces whatever the video holds in one reset */
    start(source: Source, events: EngineEvents, paused?: boolean): void {
        this.halt();
        this.events = events;
        this.source = source;
        this.choice = source.quality;
        this.pausedOn = !!paused;
        this.lastStall = 0;
        this.listen(source.kind !== 'clip');
        this.video.loop = source.kind === 'clip';
        this.load(this.wanted(), source.kind === 'live' ? 0 : source.startAt || 0);
    }

    private listen(stream: boolean): void {
        var self = this;
        var video = this.video;
        var settle = function (): void {
            self.settling = Date.now();
        };
        this.on('playing', function () {
            if (self.events) {
                self.events.playing();
            }
        });
        this.on('loadedmetadata', function () {
            if (self.resumeAt > 0) {
                video.currentTime = self.resumeAt;
                self.resumeAt = 0;
            }
        });
        this.on('loadstart', settle);
        this.on('seeking', settle);
        this.on('waiting', function () {
            if (!video.seeking && Date.now() - self.settling > SETTLE_MS) {
                self.stalled();
            }
        });
        this.on('error', function () {
            var events = self.events;
            var code = video.error ? video.error.code : 0;
            self.halt();
            if (events) {
                // MEDIA_ERR_NETWORK is 2
                events.failed({ kind: code === 2 ? 'network' : 'media', detail: 'video error ' + code });
            }
        });
        if (stream) {
            this.unwatch = watchStill(video, STILL_S, function (again) {
                if (again && self.canStepDown()) {
                    self.stepDown();
                } else if (self.events) {
                    self.events.stalled('reload');
                    self.load(self.playing, video.currentTime);
                }
            });
        }
    }

    private on(event: string, listener: () => void): void {
        this.listeners[event] = listener;
        this.video.addEventListener(event, listener);
    }

    /** The quality to play: the one picked, or Auto's (the best the line speed allows, under what this player stalled
     * above) */
    private wanted(): number {
        var list = (this.source as Source).qualities;
        return list[this.choice] ? this.choice : fitQuality(list, nativeBandwidth());
    }

    /** Plays quality index from at (s; live: 0, the TV's player starts near the newest segment) */
    private load(index: number, at: number): void {
        var source = this.source as Source;
        this.playing = index;
        this.settling = Date.now();
        this.resumeAt = source.kind !== 'live' ? at : 0;
        this.video.src = source.qualities[index].url;
        if (!this.pausedOn) {
            playVideo(this.video);
        }
        if (this.events) {
            this.events.quality(index);
        }
    }

    private canStepDown(): boolean {
        var source = this.source;
        return !!source && source.kind !== 'clip' && !source.qualities[this.choice] &&
            this.playing < source.qualities.length - 1;
    }

    /** A stall: two close together step Auto one quality down */
    private stalled(): void {
        var now = Date.now();
        var close = now - this.lastStall < STALL_WINDOW_MS;
        this.lastStall = now;
        if (close && this.canStepDown()) {
            this.lastStall = 0;
            this.stepDown();
        } else if (this.events) {
            this.events.stalled('');
        }
    }

    private stepDown(): void {
        var lower = (this.source as Source).qualities[this.playing + 1];
        lowerTo(lower);
        if (this.events) {
            this.events.stalled('step down to ' + lower.name);
        }
        this.load(this.playing + 1, this.video.currentTime);
    }

    setQuality(index: number): void {
        this.choice = index;
        if (this.events) {
            this.toWanted();
        }
    }

    /** Loads the quality wanted now when it is not the one playing */
    private toWanted(): void {
        var wanted = this.wanted();
        if (wanted !== this.playing) {
            this.load(wanted, this.video.currentTime);
        }
    }

    paused(on: boolean): void {
        this.pausedOn = on;
    }

    current(): number {
        return this.playing;
    }

    /** Pauses and hides the video at once (display:none also hides the TV's video plane); the video is unloaded once
     * the keys rest, unless something else plays on it by then */
    stop(): void {
        var video = this.video;
        var src = video.getAttribute('src');
        var had = !!this.events;
        this.halt();
        if (!had) {
            return;
        }
        var self = this;
        video.pause();
        hideVideo(video);
        whenKeysRest(function () {
            if (!self.events && video.getAttribute('src') === src) {
                unloadVideo(video);
            }
        });
    }

    private halt(): void {
        for (var event in this.listeners) {
            this.video.removeEventListener(event, this.listeners[event]);
        }
        this.listeners = {};
        // A clip's loop must not carry over to what plays next on the video
        this.video.loop = false;
        if (this.unwatch) {
            this.unwatch();
            this.unwatch = null;
        }
        this.events = null;
    }
}
