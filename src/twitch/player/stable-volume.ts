// Stable Volume (Settings, Android only, off unless switched on): Twitch streams come as loud as each streamer sends
// them, mostly quieter and less even than levelled broadcast sound. With it on, the video's sound goes through Web
// Audio: a compressor that lifts quiet passages and holds back loud ones, a gain that brings the whole up, a limiter,
// and a trim under full scale. Off by default since 0.1.13: a viewer on a Chromecast with Google TV heard the sound
// crackle with it on (Web Audio's processing on that device's CPU), and off, Web Audio is never made, so nothing of it
// runs.
// Android only: the LG TV plays video sound in its own hardware (Web Audio hears silence there), and its own Auto
// Volume does the same job. The video is wired only once the setting is on (Web Audio takes its sound for good), and
// a context the system started suspended is resumed when the video plays or a key is pressed.

import { android } from '../../core/platform.js';
import { load, save } from '../../core/store.js';

var STORE_KEY = 'twitch.player.stableVolume';
/** The compressor: from THRESHOLD_DB on, RATIO to 1, KNEE_DB soft; ATTACK_S and RELEASE_S as a speech leveller */
var THRESHOLD_DB = -36;
var KNEE_DB = 18;
var RATIO = 4;
var ATTACK_S = 0.02;
var RELEASE_S = 0.4;
/** The whole brought up after it (dB) */
var GAIN_DB = 4;
/** The limiter: nothing much past LIMIT_DB */
var LIMIT_DB = -3;
/** After the limiter (dB): Chrome's compressors add their own makeup gain and the limiter is no brick wall, so loud
 * attacks came out over full scale (up to +1.1 dBFS, clipped at the output: a click); with this, at most -1.9 dBFS
 * (rendered offline in Chrome: tones, noise bursts and quiet-to-loud steps up to 0 dBFS in) */
var TRIM_DB = -3;

interface Graph {
    ctx: AudioContext;
    source: MediaElementAudioSourceNode;
    /** The first node of the levelling chain */
    chain: AudioNode;
    /** Its last node (the test hook measures there) */
    out: AudioNode;
}

var on: boolean | null = null;
var video: HTMLVideoElement | null = null;
var graph: Graph | null = null;

function contextClass(): { new (): AudioContext } | null {
    var w = window as unknown as { AudioContext?: { new (): AudioContext }; webkitAudioContext?: { new (): AudioContext } };
    return w.AudioContext || w.webkitAudioContext || null;
}

/** Whether this device can level the sound: the Android app, with Web Audio */
export function canStabilize(): boolean {
    return !!android() && !!contextClass();
}

/** The setting: off unless switched on */
export function stableVolume(): boolean {
    if (on === null) {
        on = load<boolean>(STORE_KEY) === true;
    }
    return on;
}

export function setStableVolume(value: boolean): void {
    on = value;
    save(STORE_KEY, value);
    wire();
}

/** The app's video: its sound levelled while the setting is on (where it can be) */
export function stabilize(v: HTMLVideoElement): void {
    video = v;
    wire();
}

/** For the test hook: the context, the video's source and the chain's last node (null until wired) */
export function audioGraph(): Graph | null {
    return graph;
}

function wire(): void {
    if (!video || !canStabilize() || !graph && !stableVolume()) {
        return;
    }
    if (!graph) {
        graph = build(video);
    }
    graph.source.disconnect();
    graph.source.connect(stableVolume() ? graph.chain : graph.ctx.destination);
}

function build(v: HTMLVideoElement): Graph {
    var Ctx = contextClass() as { new (): AudioContext };
    var ctx = new Ctx();
    var source = ctx.createMediaElementSource(v);
    var compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = THRESHOLD_DB;
    compressor.knee.value = KNEE_DB;
    compressor.ratio.value = RATIO;
    compressor.attack.value = ATTACK_S;
    compressor.release.value = RELEASE_S;
    var gain = ctx.createGain();
    gain.gain.value = Math.pow(10, GAIN_DB / 20);
    var limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = LIMIT_DB;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;
    var trim = ctx.createGain();
    trim.gain.value = Math.pow(10, TRIM_DB / 20);
    compressor.connect(gain);
    gain.connect(limiter);
    limiter.connect(trim);
    trim.connect(ctx.destination);
    var resume = function (): void {
        var c = ctx as AudioContext & { state?: string; resume?: () => Promise<void> };
        if (c.state === 'suspended' && c.resume) {
            c.resume().then(null, function () { return undefined; });
        }
    };
    v.addEventListener('playing', resume);
    document.addEventListener('keydown', resume, true);
    resume();
    return { ctx: ctx, source: source, chain: compressor, out: trim };
}
