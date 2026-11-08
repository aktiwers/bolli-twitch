// The playback test hook, window.__bolli.player, for the TV, emulator and desktop checks over remote DevTools:
//   live(login), vod(id, startAt?), clip(slug)   play full screen (the target that plays already is handed over)
//   preview(login)                               a live channel as a small muted preview (live(login) then hands over)
//   prefetch(login)                              resolve a live channel ahead (the next live() is quicker)
//   stop()                                       stop (a Media Source pipeline is kept for the next start)
//   release()                                    stop and let the video go (the pipeline too)
//   engine('native' | 'mse' | '')                the engine live streams and past broadcasts start on in this run
//                                                ('' the policy's; never stored); returns what each kind starts on
//   usher('v1' | 'v2' | '')                      the usher version to start with ('' the default)
//   account(on)                                  stream tokens asked with the account (signed in) in this run: ads
//   levels(ms)                                   Stable Volume's input and output level over ms (dB RMS and peak; Android)
//   quality(index), seek(s), pause(), resume(), debug(on) (hls.js's warnings on the console)
//   state()                                      the session's state, first picture, stalls, seeks, pipelines, events
// It prints no token, signature or stream address.

import { whenLoaded } from '../../core/dom.js';
import { hook } from '../hook.js';
import { UsherVersion } from '../api/playback.js';
import * as session from './session.js';
import { pipelineStats } from './pipeline.js';
import { adStats } from './ads.js';
import { Failure, Quality } from './engine.js';
import { setHlsDebug } from './mse-engine.js';
import { audioGraph } from './stable-volume.js';

var MAX_EVENTS = 40;
/** A preview's box and the whole screen, in layout units */
var PREVIEW = { left: 40, top: 80, width: 427, height: 240 };
var WHOLE = { left: 0, top: 0, width: 1280, height: 720 };

var log: string[] = [];
var startedAt = 0;
var firstPicture = -1;
var stalls = 0;
var seeks = 0;
var watching = false;

function note(what: string): void {
    log.push(((Date.now() - startedAt) / 1000).toFixed(2) + 's ' + what);
    if (log.length > MAX_EVENTS) {
        log.shift();
    }
}

var events: session.SessionEvents = {
    playing: function () {
        if (firstPicture < 0) {
            firstPicture = Date.now() - startedAt;
        }
        note('playing');
    },
    buffering: function () {
        note('buffering');
    },
    paused: function () {
        note('paused');
    },
    ended: function () {
        note('ended');
    },
    qualities: function (list: Quality[], picked: number, playing: number) {
        note('qualities ' + list.map(function (q) { return q.name; }).join(',') + ' picked ' + picked + ' playing ' + playing);
    },
    playerTypeChanged: function (playerType: string) {
        note('player type ' + playerType);
    },
    stalled: function (action: string) {
        if (!action) {
            stalls++;
        }
        note('stalled ' + action);
    },
    failed: function (failure: Failure) {
        note('failed ' + failure.kind + ': ' + failure.detail);
    }
};

function start(target: session.Target, preview: boolean): void {
    var video = session.videoElement();
    if (!watching) {
        watching = true;
        video.addEventListener('seeking', function () {
            seeks++;
        });
    }
    // Over the app's screens; placed as a screen places it (the session shows it while it plays)
    video.style.zIndex = '10';
    session.placeVideo(preview ? PREVIEW : WHOLE);
    log = [];
    startedAt = Date.now();
    firstPicture = -1;
    stalls = 0;
    seeks = 0;
    note('start ' + target.kind + (preview ? ' preview' : ''));
    session.play(target, events, preview ? { maxHeight: PREVIEW.height, muted: true, remember: false } : {});
}

var api = {
    live: function (login: string): void {
        start({ kind: 'live', id: login }, false);
    },
    preview: function (login: string): void {
        start({ kind: 'live', id: login }, true);
    },
    vod: function (id: string, startAt?: number): void {
        start({ kind: 'vod', id: id, startAt: startAt }, false);
    },
    clip: function (slug: string): void {
        start({ kind: 'clip', id: slug }, false);
    },
    prefetch: function (login: string): void {
        session.prefetch({ kind: 'live', id: login });
    },
    stop: function (): void {
        session.stop();
        note('stop');
    },
    release: function (): void {
        session.release();
        session.placeVideo(null);
        session.videoElement().style.zIndex = '';
        note('release');
    },
    engine: function (name?: session.EngineName | ''): { [kind: string]: string } {
        if (name !== undefined) {
            session.forceEngine(name);
        }
        return { live: session.engineFor('live'), vod: session.engineFor('vod'), clip: session.engineFor('clip') };
    },
    usher: function (version: UsherVersion | ''): void {
        session.setUsher(version);
    },
    account: function (on: boolean): void {
        session.forceAccount(on);
    },
    levels: function (ms: number): Promise<{ [name: string]: number }> | null {
        var g = audioGraph();
        if (!g) {
            return null;
        }
        var ctx = g.ctx;
        var meters = [g.source, g.out].map(function (node) {
            var an = ctx.createAnalyser();
            an.fftSize = 2048;
            node.connect(an);
            return { node: node, an: an, sum: 0, count: 0, peak: 0 };
        });
        var buf = new Float32Array(2048);
        var timer = setInterval(function () {
            for (var i = 0; i < meters.length; i++) {
                var m = meters[i];
                (m.an as AnalyserNode & { getFloatTimeDomainData(a: Float32Array): void }).getFloatTimeDomainData(buf);
                for (var j = 0; j < buf.length; j++) {
                    m.sum += buf[j] * buf[j];
                    m.peak = Math.max(m.peak, Math.abs(buf[j]));
                }
                m.count += buf.length;
            }
        }, 40);
        var db = function (x: number): number {
            return Math.round(20 * Math.log(Math.max(x, 1e-6)) / Math.LN10 * 10) / 10;
        };
        return new Promise(function (resolve) {
            setTimeout(function () {
                clearInterval(timer);
                for (var i = 0; i < meters.length; i++) {
                    meters[i].node.disconnect(meters[i].an);
                }
                resolve({ inRms: db(Math.sqrt(meters[0].sum / (meters[0].count || 1))), inPeak: db(meters[0].peak),
                    outRms: db(Math.sqrt(meters[1].sum / (meters[1].count || 1))), outPeak: db(meters[1].peak) });
            }, ms);
        });
    },
    quality: function (index: number): void {
        session.setQuality(index);
        note('quality ' + index);
    },
    debug: function (on: boolean): void {
        setHlsDebug(on);
    },
    seek: function (seconds: number): void {
        session.seek(seconds);
        note('seek ' + seconds);
    },
    pause: function (): void {
        session.pause();
    },
    resume: function (): void {
        session.resume();
    },
    state: function (): { [name: string]: unknown } {
        var out = (session.playbackState() || {}) as unknown as { [name: string]: unknown };
        out.firstPictureMs = firstPicture;
        out.stalls = stalls;
        out.seeks = seeks;
        out.pipelines = pipelineStats;
        out.adSegmentsMarked = adStats.marked;
        out.events = log.slice();
        return out;
    }
};

/** On window.__bolli once the page has loaded (the app's start replaces that object: core/perf.ts sets it) */
whenLoaded(function () {
    hook('player', api);
});
