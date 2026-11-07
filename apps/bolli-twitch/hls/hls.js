/*! hls.js 1.7.4 (https://github.com/video-dev/hls.js), Copyright (c) 2017 Dailymotion, Apache License 2.0. Trimmed and compiled for Chrome 38 by Bolli Twitch (tools/twitch_hls.mjs): see LICENSE and README.md beside this file. Includes eventemitter3 (MIT, Arnout Kazemier), url-toolkit (Apache 2.0, Tom Jenkinson) and the Common Media Library (Apache 2.0, Streaming Video Technology Alliance). */
var BolliHls = (function () {
'use strict';
var has = Object.prototype.hasOwnProperty, slice = Array.prototype.slice;
var __bolli = {
any_filter: function (o, a, b, c) { return typeof o.filter === 'function' ? o.filter(a, b, c) : ArrayBuffer.isView(o) ? __bolli.ta_filter.apply(__bolli, arguments) : o.filter(a, b, c); },
any_forEach: function (o, a, b, c) { return typeof o.forEach === 'function' ? o.forEach(a, b, c) : ArrayBuffer.isView(o) ? __bolli.ta_forEach.apply(__bolli, arguments) : o.forEach(a, b, c); },
any_indexOf: function (o, a, b, c) { return typeof o.indexOf === 'function' ? o.indexOf(a, b, c) : ArrayBuffer.isView(o) ? __bolli.ta_indexOf.apply(__bolli, arguments) : o.indexOf(a, b, c); },
any_map: function (o, a, b, c) { return typeof o.map === 'function' ? o.map(a, b, c) : ArrayBuffer.isView(o) ? __bolli.ta_map.apply(__bolli, arguments) : o.map(a, b, c); },
any_reduce: function (o, a, b, c) { return typeof o.reduce === 'function' ? o.reduce.apply(o, slice.call(arguments, 1)) : ArrayBuffer.isView(o) ? __bolli.ta_reduce.apply(__bolli, arguments) : o.reduce(a, b, c); },
any_slice: function (o, a, b, c) { return typeof o.slice === 'function' ? o.slice(a, b, c) : ArrayBuffer.isView(o) ? __bolli.ta_slice.apply(__bolli, arguments) : o.slice(a, b, c); },
assign: function (target) {
if (Object.assign) { return Object.assign.apply(Object, arguments); }
for (var i = 1; i < arguments.length; i++) {
var src = arguments[i];
if (src != null) { for (var k in src) { if (has.call(src, k)) { target[k] = src[k]; } } }
}
return target;
},
startsWith: function (s, x, at) { if (s.startsWith) { return s.startsWith(x, at); } at = at > 0 ? at | 0 : 0; return s.substr(at, String(x).length) === String(x); },
ta_filter: function (a, fn, self) { return a.filter ? a.filter(fn, self) : new a.constructor(Array.prototype.filter.call(a, fn, self)); },
ta_forEach: function (a, fn, self) { (a.forEach || Array.prototype.forEach).call(a, fn, self); },
ta_indexOf: function (a, x, at) { return a.indexOf ? a.indexOf(x, at) : Array.prototype.indexOf.call(a, x, at); },
ta_map: function (a, fn, self) { if (a.map) { return a.map(fn, self); } var out = new a.constructor(a.length); for (var i = 0; i < a.length; i++) { out[i] = fn.call(self, a[i], i, a); } return out; },
ta_reduce: function (a) { return (a.reduce || Array.prototype.reduce).apply(a, slice.call(arguments, 1)); },
ta_slice: function (a, start, end) { return a.slice ? a.slice(start, end) : new a.constructor(end === undefined ? a.subarray(start === undefined ? 0 : start) : a.subarray(start, end)); }
};
var extendStatics = Object.setPrototypeOf || function (d, b) { d.__proto__ = b; };
function __extends(d, b) {
extendStatics(d, b);
function __() { this.constructor = d; }
d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
function __assign() {
return __bolli.assign.apply(__bolli, arguments);
}
function __spreadArray(to, from, pack) {
return to.concat(Array.prototype.slice.call(from));
}
function uuid() {
try {
return crypto.randomUUID();
}
catch (error) {
try {
var url = URL.createObjectURL(new Blob());
var uuid$1 = url.toString();
URL.revokeObjectURL(url);
return uuid$1.slice(uuid$1.lastIndexOf("/") + 1);
}
catch (error$1) {
var dt_1 = (new Date()).getTime();
return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
var r = (dt_1 + Math.random() * 16) % 16 | 0;
dt_1 = Math.floor(dt_1 / 16);
return (c == "x" ? r : r & 3 | 8).toString(16);
});
}
}
}
function getDefaultExportFromCjs (x) {
return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}
var eventemitter3 = {exports: {}};
var hasRequiredEventemitter3;
function requireEventemitter3 () {
if (hasRequiredEventemitter3) return eventemitter3.exports;
hasRequiredEventemitter3 = 1;
(function (module) {
var has = Object.prototype.hasOwnProperty
, prefix = '~';
function Events() {}
if (Object.create) {
Events.prototype = Object.create(null);
if (!new Events().__proto__) prefix = false;
}
function EE(fn, context, once) {
this.fn = fn;
this.context = context;
this.once = once || false;
}
function addListener(emitter, event, fn, context, once) {
if (typeof fn !== 'function') {
throw new TypeError('The listener must be a function');
}
var listener = new EE(fn, context || emitter, once)
, evt = prefix ? prefix + event : event;
if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
else emitter._events[evt] = [emitter._events[evt], listener];
return emitter;
}
function clearEvent(emitter, evt) {
if (--emitter._eventsCount === 0) emitter._events = new Events();
else delete emitter._events[evt];
}
function EventEmitter() {
this._events = new Events();
this._eventsCount = 0;
}
EventEmitter.prototype.eventNames = function eventNames() {
var names = []
, events
, name;
if (this._eventsCount === 0) return names;
for (name in (events = this._events)) {
if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
}
if (Object.getOwnPropertySymbols) {
return names.concat(Object.getOwnPropertySymbols(events));
}
return names;
};
EventEmitter.prototype.listeners = function listeners(event) {
var evt = prefix ? prefix + event : event
, handlers = this._events[evt];
if (!handlers) return [];
if (handlers.fn) return [handlers.fn];
for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
ee[i] = handlers[i].fn;
}
return ee;
};
EventEmitter.prototype.listenerCount = function listenerCount(event) {
var evt = prefix ? prefix + event : event
, listeners = this._events[evt];
if (!listeners) return 0;
if (listeners.fn) return 1;
return listeners.length;
};
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
var evt = prefix ? prefix + event : event;
if (!this._events[evt]) return false;
var listeners = this._events[evt]
, len = arguments.length
, args
, i;
if (listeners.fn) {
if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);
switch (len) {
case 1: return listeners.fn.call(listeners.context), true;
case 2: return listeners.fn.call(listeners.context, a1), true;
case 3: return listeners.fn.call(listeners.context, a1, a2), true;
case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
}
for (i = 1, args = new Array(len -1); i < len; i++) {
args[i - 1] = arguments[i];
}
listeners.fn.apply(listeners.context, args);
} else {
var length = listeners.length
, j;
for (i = 0; i < length; i++) {
if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);
switch (len) {
case 1: listeners[i].fn.call(listeners[i].context); break;
case 2: listeners[i].fn.call(listeners[i].context, a1); break;
case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
default:
if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
args[j - 1] = arguments[j];
}
listeners[i].fn.apply(listeners[i].context, args);
}
}
}
return true;
};
EventEmitter.prototype.on = function on(event, fn, context) {
return addListener(this, event, fn, context, false);
};
EventEmitter.prototype.once = function once(event, fn, context) {
return addListener(this, event, fn, context, true);
};
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
var evt = prefix ? prefix + event : event;
if (!this._events[evt]) return this;
if (!fn) {
clearEvent(this, evt);
return this;
}
var listeners = this._events[evt];
if (listeners.fn) {
if (
listeners.fn === fn &&
(!once || listeners.once) &&
(!context || listeners.context === context)
) {
clearEvent(this, evt);
}
} else {
for (var i = 0, events = [], length = listeners.length; i < length; i++) {
if (
listeners[i].fn !== fn ||
(once && !listeners[i].once) ||
(context && listeners[i].context !== context)
) {
events.push(listeners[i]);
}
}
if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
else clearEvent(this, evt);
}
return this;
};
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
var evt;
if (event) {
evt = prefix ? prefix + event : event;
if (this._events[evt]) clearEvent(this, evt);
} else {
this._events = new Events();
this._eventsCount = 0;
}
return this;
};
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;
EventEmitter.prefixed = prefix;
EventEmitter.EventEmitter = EventEmitter;
{
module.exports = EventEmitter;
}
} (eventemitter3));
return eventemitter3.exports;
}
var eventemitter3Exports = requireEventemitter3();
var EventEmitter =  getDefaultExportFromCjs(eventemitter3Exports);
var module = { exports: {} }, exports$1 = module.exports;
(function (root) {
var URL_REGEX =
/^(?=((?:[a-zA-Z0-9+\-.]+:)?))\1(?=((?:\/\/[^\/?#]*)?))\2(?=((?:(?:[^?#\/]*\/)*[^;?#\/]*)?))\3((?:;[^?#]*)?)(\?[^#]*)?(#[^]*)?$/;
var FIRST_SEGMENT_REGEX = /^(?=([^\/?#]*))\1([^]*)$/;
var SLASH_DOT_REGEX = /(?:\/|^)\.(?=\/)/g;
var SLASH_DOT_DOT_REGEX = /(?:\/|^)\.\.\/(?!\.\.\/)[^\/]*(?=\/)/g;
var URLToolkit = {
buildAbsoluteURL: function (baseURL, relativeURL, opts) {
opts = opts || {};
baseURL = baseURL.trim();
relativeURL = relativeURL.trim();
if (!relativeURL) {
if (!opts.alwaysNormalize) {
return baseURL;
}
var basePartsForNormalise = URLToolkit.parseURL(baseURL);
if (!basePartsForNormalise) {
throw new Error('Error trying to parse base URL.');
}
basePartsForNormalise.path = URLToolkit.normalizePath(
basePartsForNormalise.path
);
return URLToolkit.buildURLFromParts(basePartsForNormalise);
}
var relativeParts = URLToolkit.parseURL(relativeURL);
if (!relativeParts) {
throw new Error('Error trying to parse relative URL.');
}
if (relativeParts.scheme) {
if (!opts.alwaysNormalize) {
return relativeURL;
}
relativeParts.path = URLToolkit.normalizePath(relativeParts.path);
return URLToolkit.buildURLFromParts(relativeParts);
}
var baseParts = URLToolkit.parseURL(baseURL);
if (!baseParts) {
throw new Error('Error trying to parse base URL.');
}
if (!baseParts.netLoc && baseParts.path && baseParts.path[0] !== '/') {
var pathParts = FIRST_SEGMENT_REGEX.exec(baseParts.path);
baseParts.netLoc = pathParts[1];
baseParts.path = pathParts[2];
}
if (baseParts.netLoc && !baseParts.path) {
baseParts.path = '/';
}
var builtParts = {
scheme: baseParts.scheme,
netLoc: relativeParts.netLoc,
path: null,
params: relativeParts.params,
query: relativeParts.query,
fragment: relativeParts.fragment,
};
if (!relativeParts.netLoc) {
builtParts.netLoc = baseParts.netLoc;
if (relativeParts.path[0] !== '/') {
if (!relativeParts.path) {
builtParts.path = baseParts.path;
if (!relativeParts.params) {
builtParts.params = baseParts.params;
if (!relativeParts.query) {
builtParts.query = baseParts.query;
}
}
} else {
var baseURLPath = baseParts.path;
var newPath =
baseURLPath.substring(0, baseURLPath.lastIndexOf('/') + 1) +
relativeParts.path;
builtParts.path = URLToolkit.normalizePath(newPath);
}
}
}
if (builtParts.path === null) {
builtParts.path = opts.alwaysNormalize
? URLToolkit.normalizePath(relativeParts.path)
: relativeParts.path;
}
return URLToolkit.buildURLFromParts(builtParts);
},
parseURL: function (url) {
var parts = URL_REGEX.exec(url);
if (!parts) {
return null;
}
return {
scheme: parts[1] || '',
netLoc: parts[2] || '',
path: parts[3] || '',
params: parts[4] || '',
query: parts[5] || '',
fragment: parts[6] || '',
};
},
normalizePath: function (path) {
path = path.split('').reverse().join('').replace(SLASH_DOT_REGEX, '');
while (
path.length !== (path = path.replace(SLASH_DOT_DOT_REGEX, '')).length
) {}
return path.split('').reverse().join('');
},
buildURLFromParts: function (parts) {
return (
parts.scheme +
parts.netLoc +
parts.path +
parts.params +
parts.query +
parts.fragment
);
},
};
if (typeof exports$1 === 'object' && typeof module === 'object')
module.exports = URLToolkit;
else if (typeof define === 'function' && define.amd)
define([], function () {
return URLToolkit;
});
else if (typeof exports$1 === 'object') exports$1['URLToolkit'] = URLToolkit;
else root['URLToolkit'] = URLToolkit;
})(undefined);
var URLToolkit = module.exports;
var buildAbsoluteURL = URLToolkit.buildAbsoluteURL;
var ErrorTypes;
(function (ErrorTypes) {
ErrorTypes["NETWORK_ERROR"] = "networkError";
ErrorTypes["MEDIA_ERROR"] = "mediaError";
ErrorTypes["KEY_SYSTEM_ERROR"] = "keySystemError";
ErrorTypes["MUX_ERROR"] = "muxError";
ErrorTypes["OTHER_ERROR"] = "otherError";
})(ErrorTypes || (ErrorTypes = {}));
var ErrorDetails;
(function (ErrorDetails) {
ErrorDetails["KEY_SYSTEM_NO_KEYS"] = "keySystemNoKeys";
ErrorDetails["KEY_SYSTEM_NO_ACCESS"] = "keySystemNoAccess";
ErrorDetails["KEY_SYSTEM_NO_SESSION"] = "keySystemNoSession";
ErrorDetails["KEY_SYSTEM_NO_CONFIGURED_LICENSE"] = "keySystemNoConfiguredLicense";
ErrorDetails["KEY_SYSTEM_LICENSE_REQUEST_FAILED"] = "keySystemLicenseRequestFailed";
ErrorDetails["KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED"] = "keySystemServerCertificateRequestFailed";
ErrorDetails["KEY_SYSTEM_SERVER_CERTIFICATE_UPDATE_FAILED"] = "keySystemServerCertificateUpdateFailed";
ErrorDetails["KEY_SYSTEM_SESSION_UPDATE_FAILED"] = "keySystemSessionUpdateFailed";
ErrorDetails["KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED"] = "keySystemStatusOutputRestricted";
ErrorDetails["KEY_SYSTEM_STATUS_INTERNAL_ERROR"] = "keySystemStatusInternalError";
ErrorDetails["KEY_SYSTEM_DESTROY_MEDIA_KEYS_ERROR"] = "keySystemDestroyMediaKeysError";
ErrorDetails["KEY_SYSTEM_DESTROY_CLOSE_SESSION_ERROR"] = "keySystemDestroyCloseSessionError";
ErrorDetails["KEY_SYSTEM_DESTROY_REMOVE_SESSION_ERROR"] = "keySystemDestroyRemoveSessionError";
ErrorDetails["MANIFEST_LOAD_ERROR"] = "manifestLoadError";
ErrorDetails["MANIFEST_LOAD_TIMEOUT"] = "manifestLoadTimeOut";
ErrorDetails["MANIFEST_PARSING_ERROR"] = "manifestParsingError";
ErrorDetails["MANIFEST_INCOMPATIBLE_CODECS_ERROR"] = "manifestIncompatibleCodecsError";
ErrorDetails["LEVEL_EMPTY_ERROR"] = "levelEmptyError";
ErrorDetails["PLAYLIST_UNCHANGED_ERROR"] = "playlistUnchangedError";
ErrorDetails["LEVEL_LOAD_ERROR"] = "levelLoadError";
ErrorDetails["LEVEL_LOAD_TIMEOUT"] = "levelLoadTimeOut";
ErrorDetails["LEVEL_PARSING_ERROR"] = "levelParsingError";
ErrorDetails["LEVEL_SWITCH_ERROR"] = "levelSwitchError";
ErrorDetails["AUDIO_TRACK_LOAD_ERROR"] = "audioTrackLoadError";
ErrorDetails["AUDIO_TRACK_LOAD_TIMEOUT"] = "audioTrackLoadTimeOut";
ErrorDetails["SUBTITLE_LOAD_ERROR"] = "subtitleTrackLoadError";
ErrorDetails["SUBTITLE_TRACK_LOAD_TIMEOUT"] = "subtitleTrackLoadTimeOut";
ErrorDetails["FRAG_LOAD_ERROR"] = "fragLoadError";
ErrorDetails["FRAG_LOAD_TIMEOUT"] = "fragLoadTimeOut";
ErrorDetails["FRAG_DECRYPT_ERROR"] = "fragDecryptError";
ErrorDetails["FRAG_PARSING_ERROR"] = "fragParsingError";
ErrorDetails["FRAG_GAP"] = "fragGap";
ErrorDetails["REMUX_ALLOC_ERROR"] = "remuxAllocError";
ErrorDetails["KEY_LOAD_ERROR"] = "keyLoadError";
ErrorDetails["KEY_LOAD_TIMEOUT"] = "keyLoadTimeOut";
ErrorDetails["BUFFER_ADD_CODEC_ERROR"] = "bufferAddCodecError";
ErrorDetails["BUFFER_INCOMPATIBLE_CODECS_ERROR"] = "bufferIncompatibleCodecsError";
ErrorDetails["BUFFER_APPEND_ERROR"] = "bufferAppendError";
ErrorDetails["BUFFER_APPENDING_ERROR"] = "bufferAppendingError";
ErrorDetails["BUFFER_APPEND_NO_PROGRESS"] = "bufferAppendNoProgress";
ErrorDetails["BUFFER_STALLED_ERROR"] = "bufferStalledError";
ErrorDetails["BUFFER_FULL_ERROR"] = "bufferFullError";
ErrorDetails["BUFFER_SEEK_OVER_HOLE"] = "bufferSeekOverHole";
ErrorDetails["BUFFER_NUDGE_ON_STALL"] = "bufferNudgeOnStall";
ErrorDetails["ASSET_LIST_LOAD_ERROR"] = "assetListLoadError";
ErrorDetails["ASSET_LIST_LOAD_TIMEOUT"] = "assetListLoadTimeout";
ErrorDetails["ASSET_LIST_PARSING_ERROR"] = "assetListParsingError";
ErrorDetails["INTERSTITIAL_ASSET_ITEM_ERROR"] = "interstitialAssetItemError";
ErrorDetails["INTERNAL_EXCEPTION"] = "internalException";
ErrorDetails["INTERNAL_ABORTED"] = "aborted";
ErrorDetails["ATTACH_MEDIA_ERROR"] = "attachMediaError";
ErrorDetails["MEDIA_SOURCE_REQUIRES_RESET"] = "mediaSourceRequiresReset";
ErrorDetails["UNKNOWN"] = "unknown";
})(ErrorDetails || (ErrorDetails = {}));
var Events;
(function (Events) {
Events["MEDIA_ATTACHING"] = "hlsMediaAttaching";
Events["MEDIA_ATTACHED"] = "hlsMediaAttached";
Events["MEDIA_DETACHING"] = "hlsMediaDetaching";
Events["MEDIA_DETACHED"] = "hlsMediaDetached";
Events["MEDIA_ENDED"] = "hlsMediaEnded";
Events["STALL_RESOLVED"] = "hlsStallResolved";
Events["BUFFER_RESET"] = "hlsBufferReset";
Events["BUFFER_CODECS"] = "hlsBufferCodecs";
Events["BUFFER_CREATED"] = "hlsBufferCreated";
Events["BUFFER_APPENDING"] = "hlsBufferAppending";
Events["BUFFER_APPENDED"] = "hlsBufferAppended";
Events["BUFFER_EOS"] = "hlsBufferEos";
Events["BUFFERED_TO_END"] = "hlsBufferedToEnd";
Events["BUFFER_FLUSHING"] = "hlsBufferFlushing";
Events["BUFFER_FLUSHED"] = "hlsBufferFlushed";
Events["MANIFEST_LOADING"] = "hlsManifestLoading";
Events["MANIFEST_LOADED"] = "hlsManifestLoaded";
Events["MANIFEST_PARSED"] = "hlsManifestParsed";
Events["LEVEL_SWITCHING"] = "hlsLevelSwitching";
Events["LEVEL_SWITCHED"] = "hlsLevelSwitched";
Events["LEVEL_LOADING"] = "hlsLevelLoading";
Events["LEVEL_LOADED"] = "hlsLevelLoaded";
Events["LEVEL_UPDATED"] = "hlsLevelUpdated";
Events["LEVEL_PTS_UPDATED"] = "hlsLevelPtsUpdated";
Events["LEVELS_UPDATED"] = "hlsLevelsUpdated";
Events["AUDIO_TRACKS_UPDATED"] = "hlsAudioTracksUpdated";
Events["AUDIO_TRACK_SWITCHING"] = "hlsAudioTrackSwitching";
Events["AUDIO_TRACK_SWITCHED"] = "hlsAudioTrackSwitched";
Events["AUDIO_TRACK_LOADING"] = "hlsAudioTrackLoading";
Events["AUDIO_TRACK_LOADED"] = "hlsAudioTrackLoaded";
Events["AUDIO_TRACK_UPDATED"] = "hlsAudioTrackUpdated";
Events["SUBTITLE_TRACKS_UPDATED"] = "hlsSubtitleTracksUpdated";
Events["SUBTITLE_TRACKS_CLEARED"] = "hlsSubtitleTracksCleared";
Events["SUBTITLE_TRACK_SWITCH"] = "hlsSubtitleTrackSwitch";
Events["SUBTITLE_TRACK_LOADING"] = "hlsSubtitleTrackLoading";
Events["SUBTITLE_TRACK_LOADED"] = "hlsSubtitleTrackLoaded";
Events["SUBTITLE_TRACK_UPDATED"] = "hlsSubtitleTrackUpdated";
Events["SUBTITLE_FRAG_PROCESSED"] = "hlsSubtitleFragProcessed";
Events["CUES_PARSED"] = "hlsCuesParsed";
Events["NON_NATIVE_TEXT_TRACKS_FOUND"] = "hlsNonNativeTextTracksFound";
Events["INIT_PTS_FOUND"] = "hlsInitPtsFound";
Events["FRAG_LOADING"] = "hlsFragLoading";
Events["FRAG_LOAD_EMERGENCY_ABORTED"] = "hlsFragLoadEmergencyAborted";
Events["FRAG_LOADED"] = "hlsFragLoaded";
Events["FRAG_DECRYPTED"] = "hlsFragDecrypted";
Events["FRAG_PARSING_INIT_SEGMENT"] = "hlsFragParsingInitSegment";
Events["FRAG_PARSING_USERDATA"] = "hlsFragParsingUserdata";
Events["FRAG_PARSING_METADATA"] = "hlsFragParsingMetadata";
Events["FRAG_PARSED"] = "hlsFragParsed";
Events["FRAG_BUFFERED"] = "hlsFragBuffered";
Events["FRAG_CHANGED"] = "hlsFragChanged";
Events["FPS_DROP"] = "hlsFpsDrop";
Events["FPS_DROP_LEVEL_CAPPING"] = "hlsFpsDropLevelCapping";
Events["MAX_AUTO_LEVEL_UPDATED"] = "hlsMaxAutoLevelUpdated";
Events["ERROR"] = "hlsError";
Events["DESTROYING"] = "hlsDestroying";
Events["KEY_LOADING"] = "hlsKeyLoading";
Events["KEY_LOADED"] = "hlsKeyLoaded";
Events["LIVE_BACK_BUFFER_REACHED"] = "hlsLiveBackBufferReached";
Events["BACK_BUFFER_REACHED"] = "hlsBackBufferReached";
Events["STEERING_MANIFEST_LOADED"] = "hlsSteeringManifestLoaded";
Events["ASSET_LIST_LOADING"] = "hlsAssetListLoading";
Events["ASSET_LIST_LOADED"] = "hlsAssetListLoaded";
Events["INTERSTITIALS_UPDATED"] = "hlsInterstitialsUpdated";
Events["INTERSTITIALS_BUFFERED_TO_BOUNDARY"] = "hlsInterstitialsBufferedToBoundary";
Events["INTERSTITIAL_ASSET_PLAYER_CREATED"] = "hlsInterstitialAssetPlayerCreated";
Events["INTERSTITIAL_STARTED"] = "hlsInterstitialStarted";
Events["INTERSTITIAL_ASSET_STARTED"] = "hlsInterstitialAssetStarted";
Events["INTERSTITIAL_ASSET_ENDED"] = "hlsInterstitialAssetEnded";
Events["INTERSTITIAL_ASSET_ERROR"] = "hlsInterstitialAssetError";
Events["INTERSTITIAL_ENDED"] = "hlsInterstitialEnded";
Events["INTERSTITIALS_PRIMARY_RESUMED"] = "hlsInterstitialsPrimaryResumed";
Events["PLAYOUT_LIMIT_REACHED"] = "hlsPlayoutLimitReached";
Events["EVENT_CUE_ENTER"] = "hlsEventCueEnter";
})(Events || (Events = {}));
var LoadStats = (function () {
function LoadStats() {
this.aborted = false;
this.loaded = 0;
this.retry = 0;
this.total = 0;
this.chunkCount = 0;
this.bwEstimate = 0;
this.loading = { start: 0, first: 0, end: 0 };
this.parsing = { start: 0, end: 0 };
this.buffering = { start: 0, first: 0, end: 0 };
}
return LoadStats;
}());
var LoaderContextType;
(function (LoaderContextType) {
LoaderContextType["MANIFEST"] = "manifest";
LoaderContextType["LEVEL"] = "level";
LoaderContextType["AUDIO_TRACK"] = "audioTrack";
LoaderContextType["SUBTITLE_TRACK"] = "subtitleTrack";
LoaderContextType["MEDIA_FRAGMENT"] = "media-fragment";
LoaderContextType["KEY"] = "key";
LoaderContextType["STEERING_MANIFEST"] = "steering-manifest";
LoaderContextType["SERVER_CERTIFICATE"] = "server-certificate";
LoaderContextType["INTERSTITIAL_ASSET_LIST"] = "interstitial-asset-list";
})(LoaderContextType || (LoaderContextType = {}));
var PlaylistLevelType;
(function (PlaylistLevelType) {
PlaylistLevelType["MAIN"] = "main";
PlaylistLevelType["AUDIO"] = "audio";
PlaylistLevelType["SUBTITLE"] = "subtitle";
})(PlaylistLevelType || (PlaylistLevelType = {}));
var BaseSegment = (function () {
function BaseSegment(base) {
this._byteRange = null;
this._url = null;
this._stats = null;
this._streams = null;
if (typeof base === 'string') {
base = { url: base };
}
this.base = base;
makeEnumerable(this, 'stats');
}
BaseSegment.prototype.setByteRange = function (value, previous) {
var params = value.split('@', 2);
var start;
if (params.length === 1) {
start = (previous === null || previous === void 0 ? void 0 : previous.byteRangeEndOffset) || 0;
}
else {
start = parseInt(params[1]);
}
this._byteRange = [start, parseInt(params[0]) + start];
};
Object.defineProperty(BaseSegment.prototype, "baseurl", {
get: function () {
return this.base.url;
},
enumerable: false,
configurable: true
});
Object.defineProperty(BaseSegment.prototype, "byteRange", {
get: function () {
if (this._byteRange === null) {
return [];
}
return this._byteRange;
},
enumerable: false,
configurable: true
});
Object.defineProperty(BaseSegment.prototype, "byteRangeStartOffset", {
get: function () {
return this.byteRange[0];
},
enumerable: false,
configurable: true
});
Object.defineProperty(BaseSegment.prototype, "byteRangeEndOffset", {
get: function () {
return this.byteRange[1];
},
enumerable: false,
configurable: true
});
Object.defineProperty(BaseSegment.prototype, "elementaryStreams", {
get: function () {
var _a;
if (this._streams === null) {
this._streams = (_a = {},
_a["audio"] = null,
_a["video"] = null,
_a["audiovideo"] = null,
_a);
}
return this._streams;
},
set: function (value) {
this._streams = value;
},
enumerable: false,
configurable: true
});
Object.defineProperty(BaseSegment.prototype, "hasStats", {
get: function () {
return this._stats !== null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(BaseSegment.prototype, "hasStreams", {
get: function () {
return this._streams !== null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(BaseSegment.prototype, "stats", {
get: function () {
if (this._stats === null) {
this._stats = new LoadStats();
}
return this._stats;
},
set: function (value) {
this._stats = value;
},
enumerable: false,
configurable: true
});
Object.defineProperty(BaseSegment.prototype, "url", {
get: function () {
if (!this._url && this.relurl) {
this._url = buildAbsoluteURL(this.baseurl, this.relurl, {
alwaysNormalize: true,
});
}
return this._url || '';
},
set: function (value) {
this._url = value;
},
enumerable: false,
configurable: true
});
BaseSegment.prototype.clearElementaryStreamInfo = function () {
var elementaryStreams = this.elementaryStreams;
elementaryStreams["audio"] = null;
elementaryStreams["video"] = null;
elementaryStreams["audiovideo"] = null;
this.url = null;
};
return BaseSegment;
}());
function isMediaFragment(frag) {
return frag.sn !== 'initSegment';
}
function mediaFragmentsAreEqual(frag, mediaFragment) {
return frag.sn === (mediaFragment === null || mediaFragment === void 0 ? void 0 : mediaFragment.sn) && frag.level === mediaFragment.level;
}
function fragmentsAreEqual(frag, otherFrag) {
return (frag.sn === (otherFrag === null || otherFrag === void 0 ? void 0 : otherFrag.sn) &&
frag.level === otherFrag.level &&
frag.cc === otherFrag.cc);
}
var Fragment = (function (_super) {
__extends(Fragment, _super);
function Fragment(type, base) {
var _this = _super.call(this, base) || this;
_this._decryptdata = null;
_this._programDateTime = null;
_this._ref = null;
_this.rawProgramDateTime = null;
_this.tagList = [];
_this.duration = 0;
_this.sn = 0;
_this.loader = null;
_this.keyLoader = null;
_this.level = -1;
_this.cc = 0;
_this.start = 0;
_this.playlistOffset = 0;
_this.bitrateTest = false;
_this.title = null;
_this.initSegment = null;
_this.urlId = 0;
_this.type = type;
return _this;
}
Object.defineProperty(Fragment.prototype, "byteLength", {
get: function () {
if (this.hasStats) {
var total = this.stats.total;
if (total) {
return total;
}
}
if (this.byteRange.length) {
var start = this.byteRange[0];
var end = this.byteRange[1];
if (Number.isFinite(start) && Number.isFinite(end)) {
return end - start;
}
}
return null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Fragment.prototype, "bitrate", {
get: function () {
if (this.byteLength) {
return (this.byteLength * 8) / this.duration;
}
if (this._bitrate) {
return this._bitrate;
}
return null;
},
set: function (value) {
this._bitrate = value;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Fragment.prototype, "decryptdata", {
get: function () {
var _a;
var levelkeys = this.levelkeys;
if (!levelkeys || levelkeys.NONE) {
return null;
}
if (levelkeys.identity) {
if (!this._decryptdata) {
this._decryptdata = levelkeys.identity.getDecryptData(this.sn);
}
}
else if (!((_a = this._decryptdata) === null || _a === void 0 ? void 0 : _a.keyId)) {
var keyFormats = Object.keys(levelkeys);
if (keyFormats.length === 1) {
var levelKey = (this._decryptdata = levelkeys[keyFormats[0]] || null);
if (levelKey) {
this._decryptdata = levelKey.getDecryptData(this.sn, levelkeys);
}
}
}
return this._decryptdata;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Fragment.prototype, "end", {
get: function () {
return this.start + this.duration;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Fragment.prototype, "endProgramDateTime", {
get: function () {
if (this.programDateTime === null) {
return null;
}
var duration = !Number.isFinite(this.duration) ? 0 : this.duration;
return this.programDateTime + duration * 1000;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Fragment.prototype, "encrypted", {
get: function () {
var _a, _b;
if ((_a = this._decryptdata) === null || _a === void 0 ? void 0 : _a.encrypted) {
return true;
}
else if (this.levelkeys) {
var keyFormats = Object.keys(this.levelkeys);
var len = keyFormats.length;
if (len > 1 || (len === 1 && ((_b = this.levelkeys[keyFormats[0]]) === null || _b === void 0 ? void 0 : _b.encrypted))) {
return true;
}
}
return false;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Fragment.prototype, "programDateTime", {
get: function () {
if (this._programDateTime === null && this.rawProgramDateTime) {
this.programDateTime = Date.parse(this.rawProgramDateTime);
}
return this._programDateTime;
},
set: function (value) {
if (!Number.isFinite(value)) {
this._programDateTime = this.rawProgramDateTime = null;
return;
}
this._programDateTime = value;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Fragment.prototype, "ref", {
get: function () {
if (!isMediaFragment(this)) {
return null;
}
if (!this._ref) {
this._ref = {
base: this.base,
start: this.start,
duration: this.duration,
sn: this.sn,
programDateTime: this.programDateTime,
};
}
return this._ref;
},
enumerable: false,
configurable: true
});
Fragment.prototype.addStart = function (value) {
this.setStart(this.start + value);
};
Fragment.prototype.setStart = function (value) {
this.start = value;
if (this._ref) {
this._ref.start = value;
}
};
Fragment.prototype.setDuration = function (value) {
this.duration = value;
if (this._ref) {
this._ref.duration = value;
}
};
Fragment.prototype.setKeyFormat = function (keyFormat) {
var _a;
var levelkeys = this.levelkeys;
if (levelkeys) {
var key = levelkeys[keyFormat];
if (key && !((_a = this._decryptdata) === null || _a === void 0 ? void 0 : _a.keyId)) {
this._decryptdata = key.getDecryptData(this.sn, levelkeys);
}
}
};
Fragment.prototype.abortRequests = function () {
var _a, _b;
(_a = this.loader) === null || _a === void 0 ? void 0 : _a.abort();
(_b = this.keyLoader) === null || _b === void 0 ? void 0 : _b.abort();
};
Fragment.prototype.setElementaryStreamInfo = function (type, startPTS, endPTS, startDTS, endDTS, partial) {
if (partial === void 0) { partial = false; }
var elementaryStreams = this.elementaryStreams;
var info = elementaryStreams[type];
if (!info) {
elementaryStreams[type] = {
startPTS: startPTS,
endPTS: endPTS,
startDTS: startDTS,
endDTS: endDTS,
partial: partial,
};
return;
}
info.startPTS = Math.min(info.startPTS, startPTS);
info.endPTS = Math.max(info.endPTS, endPTS);
info.startDTS = Math.min(info.startDTS, startDTS);
info.endDTS = Math.max(info.endDTS, endDTS);
};
return Fragment;
}(BaseSegment));
var Part = (function (_super) {
__extends(Part, _super);
function Part(partAttrs, frag, base, index, previous) {
var _this = _super.call(this, base) || this;
_this.fragOffset = 0;
_this.duration = 0;
_this.independent = false;
_this.gap = false;
_this.duration = partAttrs.decimalFloatingPoint('DURATION');
_this.gap = partAttrs.bool('GAP');
_this.independent = partAttrs.bool('INDEPENDENT');
_this.relurl = partAttrs.enumeratedString('URI');
_this.fragment = frag;
_this.index = index;
var byteRange = partAttrs.enumeratedString('BYTERANGE');
if (byteRange) {
_this.setByteRange(byteRange, previous);
}
if (previous) {
_this.fragOffset = previous.fragOffset + previous.duration;
}
return _this;
}
Object.defineProperty(Part.prototype, "start", {
get: function () {
return this.fragment.start + this.fragOffset;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Part.prototype, "end", {
get: function () {
return this.start + this.duration;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Part.prototype, "loaded", {
get: function () {
var elementaryStreams = this.elementaryStreams;
return !!(elementaryStreams.audio ||
elementaryStreams.video ||
elementaryStreams.audiovideo ||
(this.fragment.type === PlaylistLevelType.SUBTITLE &&
this.stats.loading.end > 0));
},
enumerable: false,
configurable: true
});
return Part;
}(BaseSegment));
function getOwnPropertyDescriptorFromPrototypeChain(object, property) {
var prototype = Object.getPrototypeOf(object);
if (prototype) {
var propertyDescriptor = Object.getOwnPropertyDescriptor(prototype, property);
if (propertyDescriptor) {
return propertyDescriptor;
}
return getOwnPropertyDescriptorFromPrototypeChain(prototype, property);
}
}
function makeEnumerable(object, property) {
var d = getOwnPropertyDescriptorFromPrototypeChain(object, property);
if (d) {
d.enumerable = true;
Object.defineProperty(object, property, d);
}
}
function isTimeoutError(error) {
switch (error.details) {
case ErrorDetails.FRAG_LOAD_TIMEOUT:
case ErrorDetails.KEY_LOAD_TIMEOUT:
case ErrorDetails.LEVEL_LOAD_TIMEOUT:
case ErrorDetails.MANIFEST_LOAD_TIMEOUT:
case ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT:
case ErrorDetails.SUBTITLE_TRACK_LOAD_TIMEOUT:
case ErrorDetails.ASSET_LIST_LOAD_TIMEOUT:
return true;
}
return false;
}
function isKeyError(error) {
return __bolli.startsWith(error.details, 'key');
}
function isUnusableKeyError(error) {
return isKeyError(error) && !!error.frag && !error.frag.decryptdata;
}
function getRetryConfig(loadPolicy, error) {
var isTimeout = isTimeoutError(error);
return loadPolicy.default["".concat(isTimeout ? 'timeout' : 'error', "Retry")];
}
function getRetryDelay(retryConfig, retryCount) {
var backoffFactor = retryConfig.backoff === 'linear' ? 1 : Math.pow(2, retryCount);
return Math.min(backoffFactor * retryConfig.retryDelayMs, retryConfig.maxRetryDelayMs);
}
function getLoaderConfigWithoutReties(loderConfig) {
return __assign(__assign({}, loderConfig), {
errorRetry: null,
timeoutRetry: null,
});
}
function shouldRetry(retryConfig, retryCount, isTimeout, loaderResponse) {
if (!retryConfig) {
return false;
}
var httpStatus = loaderResponse === null || loaderResponse === void 0 ? void 0 : loaderResponse.code;
var retry = retryCount < retryConfig.maxNumRetry &&
(retryForHttpStatus(httpStatus) || !!isTimeout);
return retryConfig.shouldRetry
? retryConfig.shouldRetry(retryConfig, retryCount, isTimeout, loaderResponse, retry)
: retry;
}
function retryForHttpStatus(httpStatus) {
return (offlineHttpStatus(httpStatus) ||
(!!httpStatus && (httpStatus < 400 || httpStatus > 499)));
}
function offlineHttpStatus(httpStatus) {
return httpStatus === 0 && navigator.onLine === false;
}
function isPenaltyExpired(level, expireMs) {
return (expireMs > 0 &&
level.loadError > 0 &&
level.loadErrorTime !== 0 &&
self.performance.now() - level.loadErrorTime > expireMs);
}
var EWMA = (function () {
function EWMA(halfLife, estimate, weight) {
if (estimate === void 0) { estimate = 0; }
if (weight === void 0) { weight = 0; }
this.halfLife = halfLife;
this.alpha_ = halfLife ? Math.exp(Math.log(0.5) / halfLife) : 0;
this.estimate_ = estimate;
this.totalWeight_ = weight;
}
EWMA.prototype.sample = function (weight, value) {
var adjAlpha = Math.pow(this.alpha_, weight);
this.estimate_ = value * (1 - adjAlpha) + adjAlpha * this.estimate_;
this.totalWeight_ += weight;
};
EWMA.prototype.getTotalWeight = function () {
return this.totalWeight_;
};
EWMA.prototype.getEstimate = function () {
if (this.alpha_) {
var zeroFactor = 1 - Math.pow(this.alpha_, this.totalWeight_);
if (zeroFactor) {
return this.estimate_ / zeroFactor;
}
}
return this.estimate_;
};
return EWMA;
}());
var EwmaBandWidthEstimator = (function () {
function EwmaBandWidthEstimator(slow, fast, defaultEstimate, defaultTTFB) {
if (defaultTTFB === void 0) { defaultTTFB = 100; }
this.defaultEstimate_ = defaultEstimate;
this.minWeight_ = 0.001;
this.minDelayMs_ = 50;
this.slow_ = new EWMA(slow);
this.fast_ = new EWMA(fast);
this.defaultTTFB_ = defaultTTFB;
this.ttfb_ = new EWMA(slow);
}
EwmaBandWidthEstimator.prototype.update = function (slow, fast) {
var _a = this, slow_ = _a.slow_, fast_ = _a.fast_, ttfb_ = _a.ttfb_;
if (slow_.halfLife !== slow) {
this.slow_ = new EWMA(slow, slow_.getEstimate(), slow_.getTotalWeight());
}
if (fast_.halfLife !== fast) {
this.fast_ = new EWMA(fast, fast_.getEstimate(), fast_.getTotalWeight());
}
if (ttfb_.halfLife !== slow) {
this.ttfb_ = new EWMA(slow, ttfb_.getEstimate(), ttfb_.getTotalWeight());
}
};
EwmaBandWidthEstimator.prototype.sample = function (durationMs, numBytes) {
if (numBytes <= 0) {
return;
}
var minDelay = Math.min(this.minDelayMs_, numBytes / 100000);
var numBits = 8 * numBytes;
var durationS = Math.max(durationMs, minDelay) / 1000;
var bandwidthInBps = numBits / durationS;
this.fast_.sample(durationS, bandwidthInBps);
this.slow_.sample(durationS, bandwidthInBps);
};
EwmaBandWidthEstimator.prototype.sampleTTFB = function (ttfb) {
var seconds = ttfb / 1000;
var weight = Math.sqrt(2) * Math.exp(-Math.pow(seconds, 2) / 2);
this.ttfb_.sample(weight, Math.max(ttfb, 5));
};
EwmaBandWidthEstimator.prototype.canEstimate = function () {
return this.fast_.getTotalWeight() >= this.minWeight_;
};
EwmaBandWidthEstimator.prototype.getEstimate = function () {
if (this.canEstimate()) {
return Math.min(this.fast_.getEstimate(), this.slow_.getEstimate());
}
else {
return this.defaultEstimate_;
}
};
EwmaBandWidthEstimator.prototype.getEstimateTTFB = function () {
if (this.ttfb_.getTotalWeight() >= this.minWeight_) {
return this.ttfb_.getEstimate();
}
else {
return this.defaultTTFB_;
}
};
Object.defineProperty(EwmaBandWidthEstimator.prototype, "defaultEstimate", {
get: function () {
return this.defaultEstimate_;
},
enumerable: false,
configurable: true
});
EwmaBandWidthEstimator.prototype.destroy = function () { };
return EwmaBandWidthEstimator;
}());
var Logger = (function () {
function Logger(label, logger) {
var lb = "[".concat(label, "]:");
this.trace = noop;
this.debug = logger.debug.bind(null, lb);
this.log = logger.log.bind(null, lb);
this.warn = logger.warn.bind(null, lb);
this.info = logger.info.bind(null, lb);
this.error = logger.error.bind(null, lb);
}
return Logger;
}());
var noop = function () { };
var fakeLogger = {
trace: noop,
debug: noop,
log: noop,
warn: noop,
info: noop,
error: noop,
};
function createLogger() {
return __bolli.assign({}, fakeLogger);
}
function consolePrintFn(type, id) {
var func = self.console[type];
return func
? func.bind(self.console, "".concat(id ? '[' + id + '] ' : '', "[").concat(type, "] >"))
: noop;
}
function getLoggerFn(key, debugConfig, id) {
return debugConfig[key]
? debugConfig[key].bind(debugConfig)
: consolePrintFn(key, id);
}
var exportedLogger = createLogger();
function enableLogs(debugConfig, context, id) {
var newLogger = createLogger();
if ((typeof console === 'object' && debugConfig === true) ||
typeof debugConfig === 'object') {
var keys = [
'debug',
'log',
'info',
'warn',
'error',
];
keys.forEach(function (key) {
newLogger[key] = getLoggerFn(key, debugConfig, id);
});
try {
;
}
catch (e) {
return createLogger();
}
keys.forEach(function (key) {
exportedLogger[key] = getLoggerFn(key, debugConfig);
});
}
else {
__bolli.assign(exportedLogger, newLogger);
}
return newLogger;
}
var logger = exportedLogger;
function getMediaSource(preferManagedMediaSource) {
if (preferManagedMediaSource === void 0) { preferManagedMediaSource = true; }
if (typeof self === 'undefined')
return undefined;
var mms = (preferManagedMediaSource || !self.MediaSource) &&
self.ManagedMediaSource;
return (mms ||
self.MediaSource ||
self.WebKitMediaSource);
}
function isManagedMediaSource(source) {
return (typeof self !== 'undefined' && source === self.ManagedMediaSource);
}
function isCompatibleTrackChange(currentTracks, requiredTracks) {
var trackNames = Object.keys(currentTracks);
var requiredTrackNames = Object.keys(requiredTracks);
var trackCount = trackNames.length;
var requiredTrackCount = requiredTrackNames.length;
return (!trackCount ||
!requiredTrackCount ||
(trackCount === requiredTrackCount &&
!trackNames.some(function (name) { return requiredTrackNames.indexOf(name) === -1; })));
}
var UINT32_MAX = Math.pow(2, 32) - 1;
var types = {
avc1: 0x61766331,
avcC: 0x61766343,
hvc1: 0x68766331,
hvcC: 0x68766343,
btrt: 0x62747274,
dinf: 0x64696e66,
dref: 0x64726566,
esds: 0x65736473,
free: 0x66726565,
ftyp: 0x66747970,
hdlr: 0x68646c72,
mdat: 0x6d646174,
mdhd: 0x6d646864,
mdia: 0x6d646961,
mfhd: 0x6d666864,
minf: 0x6d696e66,
moof: 0x6d6f6f66,
moov: 0x6d6f6f76,
mp4a: 0x6d703461,
'.mp3': 0x2e6d7033,
dac3: 0x64616333,
'ac-3': 0x61632d33,
mvex: 0x6d766578,
mvhd: 0x6d766864,
pasp: 0x70617370,
sdtp: 0x73647470,
stbl: 0x7374626c,
stco: 0x7374636f,
stsc: 0x73747363,
stsd: 0x73747364,
stsz: 0x7374737a,
stts: 0x73747473,
tfdt: 0x74666474,
tfhd: 0x74666864,
traf: 0x74726166,
trak: 0x7472616b,
trun: 0x7472756e,
trex: 0x74726578,
tkhd: 0x746b6864,
vmhd: 0x766d6864,
smhd: 0x736d6864,
};
function writeUint32(buffer, offset, value) {
buffer[offset] = value >> 24;
buffer[offset + 1] = (value >> 16) & 0xff;
buffer[offset + 2] = (value >> 8) & 0xff;
buffer[offset + 3] = value & 0xff;
}
function appendUint8Array(data1, data2) {
var temp = new Uint8Array(data1.length + data2.length);
temp.set(data1);
temp.set(data2, data1.length);
return temp;
}
function isHEVC(codec) {
if (!codec) {
return false;
}
var baseCodec = codec.substring(0, 4);
return (baseCodec === 'hvc1' ||
baseCodec === 'hev1' ||
baseCodec === 'dvh1' ||
baseCodec === 'dvhe');
}
var ua = getNavigator('userAgent');
getNavigator('vendor');
var chromeVersion;
var firefoxVersion;
var safariVersion;
function getNavigator(field) {
try {
return navigator[field] || '';
}
catch (e) {
}
return '';
}
function userAgentSafariVersion() {
if (safariVersion === undefined) {
var result = ua.match(/Safari\/(\d+)/i);
safariVersion = result ? parseInt(result[1]) : 0;
}
return safariVersion;
}
function userAgentChromeVersion() {
if (chromeVersion === undefined) {
var result = ua.match(/Chrome\/(\d+)/i);
chromeVersion = result ? parseInt(result[1]) : 0;
}
return chromeVersion;
}
function userAgentFirefoxVersion() {
if (firefoxVersion === undefined) {
var result = ua.match(/Firefox\/(\d+)/i);
firefoxVersion = result ? parseInt(result[1]) : 0;
}
return firefoxVersion;
}
function userAgentHevcSupportIsInaccurate() {
return /\(Windows.+Firefox\//i.test(ua);
}
function userAgentIsAndroidLike() {
return /Android/.test(ua);
}
var sampleEntryCodesISO = {
audio: {
a3ds: 1,
'ac-3': 0.95,
'ac-4': 1,
alac: 0.9,
alaw: 1,
dra1: 1,
'dts+': 1,
'dts-': 1,
dtsc: 1,
dtse: 1,
dtsh: 1,
'ec-3': 0.9,
enca: 1,
fLaC: 0.9,
flac: 0.9,
FLAC: 0.9,
g719: 1,
g726: 1,
m4ae: 1,
mha1: 1,
mha2: 1,
mhm1: 1,
mhm2: 1,
mlpa: 1,
mp4a: 1,
'raw ': 1,
Opus: 1,
opus: 1,
samr: 1,
sawb: 1,
sawp: 1,
sevc: 1,
sqcp: 1,
ssmv: 1,
twos: 1,
ulaw: 1,
},
video: {
avc1: 1,
avc2: 1,
avc3: 1,
avc4: 1,
avcp: 1,
av01: 0.8,
dav1: 0.8,
drac: 1,
dva1: 1,
dvav: 1,
dvh1: 0.7,
dvhe: 0.7,
encv: 1,
hev1: 0.75,
hvc1: 0.75,
mjp2: 1,
mp4v: 1,
mvc1: 1,
mvc2: 1,
mvc3: 1,
mvc4: 1,
resv: 1,
rv60: 1,
s263: 1,
svc1: 1,
svc2: 1,
'vc-1': 1,
vp08: 1,
vp09: 0.9,
},
text: {
stpp: 1,
wvtt: 1,
},
image: {
mjpg: 1,
},
};
function isCodecType(codec, type) {
var typeCodes = sampleEntryCodesISO[type];
return !!typeCodes && !!typeCodes[codec.slice(0, 4)];
}
function areCodecsMediaSourceSupported(codecs, type, preferManagedMediaSource) {
if (preferManagedMediaSource === void 0) { preferManagedMediaSource = true; }
return !codecs
.split(',')
.some(function (codec) {
return !isCodecMediaSourceSupported(codec, type, preferManagedMediaSource);
});
}
function isCodecMediaSourceSupported(codec, type, preferManagedMediaSource) {
var _a;
if (preferManagedMediaSource === void 0) { preferManagedMediaSource = true; }
var MediaSource = getMediaSource(preferManagedMediaSource);
return (_a = MediaSource === null || MediaSource === void 0 ? void 0 : MediaSource.isTypeSupported(mimeTypeForCodec(codec, type))) !== null && _a !== void 0 ? _a : false;
}
function mimeTypeForCodec(codec, type) {
return "".concat(type, "/mp4;codecs=").concat(codec);
}
function videoCodecPreferenceValue(videoCodec) {
if (videoCodec) {
var fourCC = videoCodec.substring(0, 4);
return sampleEntryCodesISO.video[fourCC];
}
return 2;
}
function codecsSetSelectionPreferenceValue(codecSet) {
var limitedHevcSupport = userAgentHevcSupportIsInaccurate();
return codecSet.split(',').reduce(function (num, fourCC) {
var lowerPriority = limitedHevcSupport && isHEVC(fourCC);
var preferenceValue = lowerPriority
? 9
: sampleEntryCodesISO.video[fourCC];
if (preferenceValue) {
return (preferenceValue * 2 + num) / (num ? 3 : 2);
}
return (sampleEntryCodesISO.audio[fourCC] + num) / (num ? 2 : 1);
}, 0);
}
var CODEC_COMPATIBLE_NAMES = {};
function getCodecCompatibleNameLower(lowerCaseCodec, preferManagedMediaSource) {
var _a;
if (preferManagedMediaSource === void 0) { preferManagedMediaSource = true; }
if (CODEC_COMPATIBLE_NAMES[lowerCaseCodec]) {
return CODEC_COMPATIBLE_NAMES[lowerCaseCodec];
}
var codecsToCheck = {
flac: ['flac', 'fLaC', 'FLAC'],
opus: ['opus', 'Opus'],
'mp4a.40.34': ['mp3'],
}[lowerCaseCodec];
for (var i = 0; i < codecsToCheck.length; i++) {
if (isCodecMediaSourceSupported(codecsToCheck[i], 'audio', preferManagedMediaSource)) {
CODEC_COMPATIBLE_NAMES[lowerCaseCodec] = codecsToCheck[i];
return codecsToCheck[i];
}
else if (codecsToCheck[i] === 'mp3' &&
((_a = getMediaSource(preferManagedMediaSource)) === null || _a === void 0 ? void 0 : _a.isTypeSupported('audio/mpeg'))) {
return '';
}
}
return lowerCaseCodec;
}
var AUDIO_CODEC_REGEXP = /flac|opus|mp4a\.40\.34/i;
function getCodecCompatibleName(codec, preferManagedMediaSource) {
if (preferManagedMediaSource === void 0) { preferManagedMediaSource = true; }
return codec.replace(AUDIO_CODEC_REGEXP, function (m) {
return getCodecCompatibleNameLower(m.toLowerCase(), preferManagedMediaSource);
});
}
function replaceVideoCodec(originalCodecs, newVideoCodec) {
var codecs = [];
if (originalCodecs) {
var allCodecs = originalCodecs.split(',');
for (var i = 0; i < allCodecs.length; i++) {
if (!isCodecType(allCodecs[i], 'video')) {
codecs.push(allCodecs[i]);
}
}
}
if (newVideoCodec) {
codecs.push(newVideoCodec);
}
return codecs.join(',');
}
function pickMostCompleteCodecName(parsedCodec, levelCodec) {
if (parsedCodec &&
(parsedCodec.length > 4 ||
['ac-3', 'ec-3', 'alac', 'fLaC', 'Opus'].indexOf(parsedCodec) !== -1)) {
if (isCodecSupportedAsType(parsedCodec, 'audio') ||
isCodecSupportedAsType(parsedCodec, 'video')) {
return parsedCodec;
}
}
if (levelCodec) {
var levelCodecs = levelCodec.split(',');
if (levelCodecs.length > 1) {
if (parsedCodec) {
for (var i = levelCodecs.length; i--;) {
if (levelCodecs[i].substring(0, 4) === parsedCodec.substring(0, 4)) {
return levelCodecs[i];
}
}
}
return levelCodecs[0];
}
}
return levelCodec || parsedCodec;
}
function isCodecSupportedAsType(codec, type) {
return isCodecType(codec, type) && isCodecMediaSourceSupported(codec, type);
}
function convertAVC1ToAVCOTI(videoCodecs) {
var codecs = videoCodecs.split(',');
for (var i = 0; i < codecs.length; i++) {
var avcdata = codecs[i].split('.');
if (avcdata.length > 2 && avcdata[0] === 'avc1') {
codecs[i] = "avc1.".concat(parseInt(avcdata[1]).toString(16)).concat(('000' + parseInt(avcdata[2]).toString(16)).slice(-4));
}
}
return codecs.join(',');
}
function fillInMissingAV01Params(videoCodec) {
if (__bolli.startsWith(videoCodec, 'av01.')) {
var av1params = videoCodec.split('.');
var placeholders = ['0', '111', '01', '01', '01', '0'];
for (var i = av1params.length; i > 4 && i < 10; i++) {
av1params[i] = placeholders[i - 4];
}
return av1params.join('.');
}
return videoCodec;
}
function getM2TSSupportedAudioTypes(preferManagedMediaSource) {
var MediaSource = getMediaSource(preferManagedMediaSource) || {
isTypeSupported: function () { return false; },
};
return {
mpeg: MediaSource.isTypeSupported('audio/mpeg'),
mp3: MediaSource.isTypeSupported('audio/mp4; codecs="mp3"'),
ac3: false,
};
}
function getCodecsForMimeType(mimeType) {
return mimeType.replace(/^.+codecs=["']?([^"']+).*$/, '$1');
}
var supportedResult = {
supported: true,
powerEfficient: true,
smooth: true,
};
var unsupportedResult = {
supported: false,
smooth: false,
powerEfficient: false,
};
var SUPPORTED_INFO_DEFAULT = {
supported: true,
configurations: [],
decodingInfoResults: [supportedResult],
};
function getUnsupportedResult(error, configurations) {
return {
supported: false,
configurations: configurations,
decodingInfoResults: [unsupportedResult],
error: error,
};
}
function getMediaDecodingInfoPromise(level, audioTracksByGroup, mediaCapabilities, cache) {
if (cache === void 0) { cache = {}; }
var videoCodecs = level.videoCodec;
if ((!videoCodecs && !level.audioCodec) || !mediaCapabilities) {
return Promise.resolve(SUPPORTED_INFO_DEFAULT);
}
var configurations = [];
var videoDecodeList = makeVideoConfigurations(level);
var videoCount = videoDecodeList.length;
var audioDecodeList = makeAudioConfigurations(level, audioTracksByGroup, videoCount > 0);
var audioCount = audioDecodeList.length;
for (var i = videoCount || 1 * audioCount || 1; i--;) {
var configuration = {
type: 'media-source',
};
if (videoCount) {
configuration.video = videoDecodeList[i % videoCount];
}
if (audioCount) {
configuration.audio = audioDecodeList[i % audioCount];
var audioBitrate = configuration.audio.bitrate;
if (configuration.video && audioBitrate) {
configuration.video.bitrate -= audioBitrate;
}
}
configurations.push(configuration);
}
if (videoCodecs) {
var ua = navigator.userAgent;
if (videoCodecs.split(',').some(function (videoCodec) { return isHEVC(videoCodec); }) &&
userAgentHevcSupportIsInaccurate()) {
return Promise.resolve(getUnsupportedResult(new Error("Overriding Windows Firefox HEVC MediaCapabilities result based on user-agent string: (".concat(ua, ")")), configurations));
}
}
return Promise.all(configurations.map(function (configuration) {
var decodingInfoKey = getMediaDecodingInfoKey(configuration);
return (cache[decodingInfoKey] ||
(cache[decodingInfoKey] = mediaCapabilities.decodingInfo(configuration)));
}))
.then(function (decodingInfoResults) { return ({
supported: !decodingInfoResults.some(function (info) { return !info.supported; }),
configurations: configurations,
decodingInfoResults: decodingInfoResults,
}); })
.catch(function (error) { return ({
supported: false,
configurations: configurations,
decodingInfoResults: [],
error: error,
}); });
}
function makeVideoConfigurations(level) {
var _a;
var videoCodecs = (_a = level.videoCodec) === null || _a === void 0 ? void 0 : _a.split(',');
var bitrate = getVariantDecodingBitrate(level);
var width = level.width || 640;
var height = level.height || 480;
var framerate = level.frameRate || 30;
var videoRange = level.videoRange.toLowerCase();
return videoCodecs
? videoCodecs.map(function (videoCodec) {
var videoConfiguration = {
contentType: mimeTypeForCodec(fillInMissingAV01Params(videoCodec), 'video'),
width: width,
height: height,
bitrate: bitrate,
framerate: framerate,
};
if (videoRange !== 'sdr') {
videoConfiguration.transferFunction = videoRange;
}
return videoConfiguration;
})
: [];
}
function makeAudioConfigurations(level, audioTracksByGroup, hasVideo) {
var _a;
var audioCodecs = (_a = level.audioCodec) === null || _a === void 0 ? void 0 : _a.split(',');
var combinedBitrate = getVariantDecodingBitrate(level);
if (audioCodecs && level.audioGroups) {
return level.audioGroups.reduce(function (configurations, audioGroupId) {
var _a;
var tracks = audioGroupId
? (_a = audioTracksByGroup.groups[audioGroupId]) === null || _a === void 0 ? void 0 : _a.tracks
: null;
if (tracks) {
return tracks.reduce(function (configs, audioTrack) {
if (audioTrack.groupId === audioGroupId) {
var channelsNumber_1 = parseFloat(audioTrack.channels || '');
audioCodecs.forEach(function (audioCodec) {
var audioConfiguration = {
contentType: mimeTypeForCodec(audioCodec, 'audio'),
bitrate: hasVideo
? estimatedAudioBitrate(audioCodec, combinedBitrate)
: combinedBitrate,
};
if (channelsNumber_1) {
audioConfiguration.channels = '' + channelsNumber_1;
}
configs.push(audioConfiguration);
});
}
return configs;
}, configurations);
}
return configurations;
}, []);
}
return [];
}
function estimatedAudioBitrate(audioCodec, levelBitrate) {
if (levelBitrate <= 1) {
return 1;
}
var audioBitrate = 128000;
if (audioCodec === 'ec-3') {
audioBitrate = 768000;
}
else if (audioCodec === 'ac-3') {
audioBitrate = 640000;
}
return Math.min(levelBitrate / 2, audioBitrate);
}
function getVariantDecodingBitrate(level) {
return (Math.ceil(Math.max(level.bitrate * 0.9, level.averageBitrate) / 1000) *
1000 || 1);
}
function getMediaDecodingInfoKey(config) {
var key = '';
var audio = config.audio, video = config.video;
if (video) {
var codec = getCodecsForMimeType(video.contentType);
key += "".concat(codec, "_r").concat(video.height, "x").concat(video.width, "f").concat(Math.ceil(video.framerate)).concat(video.transferFunction || 'sd', "_").concat(Math.ceil(video.bitrate / 1e5));
}
if (audio) {
var codec = getCodecsForMimeType(audio.contentType);
key += "".concat(video ? '_' : '').concat(codec, "_c").concat(audio.channels);
}
return key;
}
function setQueryParam(url, key, value) {
var encodedKey = encodeURIComponent(key);
var param = "".concat(encodedKey, "=").concat(encodeURIComponent(value));
var replaced = false;
var params = [];
url.search
.substring(1)
.split('&')
.forEach(function (p) {
if (p === encodedKey || __bolli.startsWith(p, encodedKey + '=')) {
if (!replaced) {
params.push(param);
replaced = true;
}
}
else if (p) {
params.push(p);
}
});
if (!replaced) {
params.push(param);
}
url.search = params.join('&');
}
var HdcpLevels = ['NONE', 'TYPE-0', 'TYPE-1', null];
function isHdcpLevel(value) {
return HdcpLevels.indexOf(value) > -1;
}
var VideoRangeValues = ['SDR', 'PQ', 'HLG'];
function isVideoRange(value) {
return !!value && VideoRangeValues.indexOf(value) > -1;
}
function getSkipValue(details) {
var canSkipUntil = details.canSkipUntil, canSkipDateRanges = details.canSkipDateRanges, age = details.age;
var playlistRecentEnough = age < canSkipUntil / 2;
if (canSkipUntil && playlistRecentEnough) {
if (canSkipDateRanges) {
return "v2";
}
return "YES";
}
return "";
}
var HlsUrlParameters = (function () {
function HlsUrlParameters(msn, part, skip) {
this.msn = msn;
this.part = part;
this.skip = skip;
}
HlsUrlParameters.prototype.addDirectives = function (uri) {
var url = new self.URL(uri);
if (this.msn !== undefined) {
setQueryParam(url, '_HLS_msn', this.msn.toString());
}
if (this.part !== undefined) {
setQueryParam(url, '_HLS_part', this.part.toString());
}
if (this.skip) {
setQueryParam(url, '_HLS_skip', this.skip);
}
return url.href;
};
return HlsUrlParameters;
}());
var Level = (function () {
function Level(data) {
var _a;
this.fragmentError = 0;
this.loadError = 0;
this.loadErrorTime = 0;
this.realBitrate = 0;
this._avgBitrate = 0;
this._urlId = 0;
this.url = [data.url];
this._attrs = [data.attrs];
this.bitrate = data.bitrate;
if (data.details) {
this.details = data.details;
}
this.id = data.id || 0;
this.name = data.name;
this.width = data.width || 0;
this.height = data.height || 0;
this.frameRate = data.attrs.optionalFloat('FRAME-RATE', 0);
this._avgBitrate = data.attrs.decimalInteger('AVERAGE-BANDWIDTH');
this.audioCodec = data.audioCodec;
this.videoCodec = data.videoCodec;
if ('imageCodec' in data) {
this.imageCodec = data.imageCodec;
}
this.codecSet = [data.videoCodec, data.audioCodec]
.filter(function (c) { return !!c; })
.map(function (s) { return s.substring(0, 4); })
.join(',');
if ('supplemental' in data) {
this.supplemental = data.supplemental;
var supplementalVideo = (_a = data.supplemental) === null || _a === void 0 ? void 0 : _a.videoCodec;
if (supplementalVideo && supplementalVideo !== data.videoCodec) {
this.codecSet += ",".concat(supplementalVideo.substring(0, 4));
}
}
if ('iframes' in data && data.iframes) {
this.iframes = true;
}
else {
this.addGroupId('audio', data.attrs.AUDIO);
this.addGroupId('text', data.attrs.SUBTITLES);
}
}
Object.defineProperty(Level.prototype, "maxBitrate", {
get: function () {
return Math.max(this.realBitrate, this.bitrate);
},
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "averageBitrate", {
get: function () {
return this._avgBitrate || this.realBitrate || this.bitrate;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "attrs", {
get: function () {
return this._attrs[0];
},
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "codecs", {
get: function () {
return this.attrs.CODECS || '';
},
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "pathwayId", {
get: function () {
return this.attrs['PATHWAY-ID'] || '.';
},
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "videoRange", {
get: function () {
return this.attrs['VIDEO-RANGE'] || 'SDR';
},
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "score", {
get: function () {
return this.attrs.optionalFloat('SCORE', 0);
},
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "uri", {
get: function () {
return this.url[0] || '';
},
enumerable: false,
configurable: true
});
Level.prototype.hasAudioGroup = function (groupId) {
return hasGroup(this._audioGroups, groupId);
};
Level.prototype.hasSubtitleGroup = function (groupId) {
return hasGroup(this._subtitleGroups, groupId);
};
Object.defineProperty(Level.prototype, "audioGroups", {
get: function () {
return this._audioGroups;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "subtitleGroups", {
get: function () {
return this._subtitleGroups;
},
enumerable: false,
configurable: true
});
Level.prototype.addGroupId = function (type, groupId) {
if (!groupId) {
return;
}
if (type === 'audio') {
var audioGroups = this._audioGroups;
if (!audioGroups) {
audioGroups = this._audioGroups = [];
}
if (audioGroups.indexOf(groupId) === -1) {
audioGroups.push(groupId);
}
}
else if (type === 'text') {
var subtitleGroups = this._subtitleGroups;
if (!subtitleGroups) {
subtitleGroups = this._subtitleGroups = [];
}
if (subtitleGroups.indexOf(groupId) === -1) {
subtitleGroups.push(groupId);
}
}
};
Object.defineProperty(Level.prototype, "urlId", {
get: function () {
return 0;
},
set: function (value) { },
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "audioGroupIds", {
get: function () {
return this.audioGroups ? [this.audioGroupId] : undefined;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "textGroupIds", {
get: function () {
return this.subtitleGroups ? [this.textGroupId] : undefined;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "audioGroupId", {
get: function () {
var _a;
return (_a = this.audioGroups) === null || _a === void 0 ? void 0 : _a[0];
},
enumerable: false,
configurable: true
});
Object.defineProperty(Level.prototype, "textGroupId", {
get: function () {
var _a;
return (_a = this.subtitleGroups) === null || _a === void 0 ? void 0 : _a[0];
},
enumerable: false,
configurable: true
});
Level.prototype.addFallback = function () { };
return Level;
}());
function hasGroup(groups, groupId) {
if (!groupId || !groups) {
return false;
}
return groups.indexOf(groupId) !== -1;
}
function isHdrSupported() {
if (typeof matchMedia === 'function') {
var mediaQueryList = matchMedia('(dynamic-range: high)');
var badQuery = matchMedia('bad query');
if (mediaQueryList.media !== badQuery.media) {
return mediaQueryList.matches === true;
}
}
return false;
}
function getVideoSelectionOptions(currentVideoRange, videoPreference) {
var preferHDR = false;
var allowedVideoRanges = [];
if (currentVideoRange) {
preferHDR = currentVideoRange !== 'SDR';
allowedVideoRanges = [currentVideoRange];
}
if (videoPreference) {
allowedVideoRanges =
videoPreference.allowedVideoRanges || VideoRangeValues.slice(0);
var allowAutoPreferHDR = allowedVideoRanges.join('') !== 'SDR' && !videoPreference.videoCodec;
preferHDR =
videoPreference.preferHDR !== undefined
? videoPreference.preferHDR
: allowAutoPreferHDR && isHdrSupported();
if (!preferHDR) {
allowedVideoRanges = ['SDR'];
}
}
return {
preferHDR: preferHDR,
allowedVideoRanges: allowedVideoRanges,
};
}
var omitCircularRefsReplacer = function (replacer) {
var known = new WeakSet();
return function (_, value) {
if (typeof value === 'object' && value !== null) {
if (known.has(value)) {
return;
}
known.add(value);
}
return value;
};
};
var stringify = function (object, replacer) { return JSON.stringify(object, omitCircularRefsReplacer()); };
function getStartCodecTier(codecTiers, currentVideoRange, currentBw, audioPreference, videoPreference) {
var codecSets = Object.keys(codecTiers);
var channelsPreference = audioPreference === null || audioPreference === void 0 ? void 0 : audioPreference.channels;
var audioCodecPreference = audioPreference === null || audioPreference === void 0 ? void 0 : audioPreference.audioCodec;
var videoCodecPreference = videoPreference === null || videoPreference === void 0 ? void 0 : videoPreference.videoCodec;
var preferStereo = channelsPreference && parseInt(channelsPreference) === 2;
var hasStereo = false;
var hasCurrentVideoRange = false;
var minHeight = Infinity;
var minFramerate = Infinity;
var minBitrate = Infinity;
var minIndex = Infinity;
var selectedScore = 0;
var videoRanges = [];
var _a = getVideoSelectionOptions(currentVideoRange, videoPreference), preferHDR = _a.preferHDR, allowedVideoRanges = _a.allowedVideoRanges;
var _loop_1 = function (i) {
var tier = codecTiers[codecSets[i]];
hasStereo || (hasStereo = tier.channels[2] > 0);
minHeight = Math.min(minHeight, tier.minHeight);
minFramerate = Math.min(minFramerate, tier.minFramerate);
minBitrate = Math.min(minBitrate, tier.minBitrate);
var matchingVideoRanges = allowedVideoRanges.filter(function (range) { return tier.videoRanges[range] > 0; });
if (matchingVideoRanges.length > 0) {
hasCurrentVideoRange = true;
}
};
for (var i = codecSets.length; i--;) {
_loop_1(i);
}
minHeight = Number.isFinite(minHeight) ? minHeight : 0;
minFramerate = Number.isFinite(minFramerate) ? minFramerate : 0;
var maxHeight = Math.max(1080, minHeight);
var maxFramerate = Math.max(30, minFramerate);
minBitrate = Number.isFinite(minBitrate) ? minBitrate : currentBw;
currentBw = Math.max(minBitrate, currentBw);
if (!hasCurrentVideoRange) {
currentVideoRange = undefined;
}
var hasMultipleSets = codecSets.length > 1;
var codecSet = codecSets.reduce(function (selected, candidate) {
var candidateTier = codecTiers[candidate];
if (candidate === selected) {
return selected;
}
videoRanges = hasCurrentVideoRange
? allowedVideoRanges.filter(function (range) { return candidateTier.videoRanges[range] > 0; })
: [];
if (hasMultipleSets) {
if (candidateTier.minBitrate > currentBw) {
logStartCodecCandidateIgnored(candidate, "min bitrate of ".concat(candidateTier.minBitrate, " > current estimate of ").concat(currentBw));
return selected;
}
if (!candidateTier.hasDefaultAudio) {
return selected;
}
if (audioCodecPreference &&
candidate.indexOf(audioCodecPreference.substring(0, 4)) % 5 !== 0) {
return selected;
}
if (channelsPreference && !preferStereo) {
if (!candidateTier.channels[channelsPreference]) {
logStartCodecCandidateIgnored(candidate, "no renditions with ".concat(channelsPreference, " channel sound found (channels options: ").concat(Object.keys(candidateTier.channels), ")"));
return selected;
}
}
else if ((!audioCodecPreference || preferStereo) &&
hasStereo &&
candidateTier.channels['2'] === 0) {
return selected;
}
if (candidateTier.minHeight > maxHeight) {
logStartCodecCandidateIgnored(candidate, "min resolution of ".concat(candidateTier.minHeight, " > maximum of ").concat(maxHeight));
return selected;
}
if (candidateTier.minFramerate > maxFramerate) {
logStartCodecCandidateIgnored(candidate, "min framerate of ".concat(candidateTier.minFramerate, " > maximum of ").concat(maxFramerate));
return selected;
}
if (!videoRanges.some(function (range) { return candidateTier.videoRanges[range] > 0; })) {
logStartCodecCandidateIgnored(candidate, "no variants with VIDEO-RANGE of ".concat(stringify(videoRanges), " found"));
return selected;
}
if (videoCodecPreference &&
candidate.indexOf(videoCodecPreference.substring(0, 4)) % 5 !== 0) {
return selected;
}
if (candidateTier.maxScore < selectedScore) {
logStartCodecCandidateIgnored(candidate, "max score of ".concat(candidateTier.maxScore, " < selected max of ").concat(selectedScore));
return selected;
}
}
if (selected &&
(codecsSetSelectionPreferenceValue(candidate) >=
codecsSetSelectionPreferenceValue(selected) ||
candidateTier.fragmentError > codecTiers[selected].fragmentError)) {
return selected;
}
minIndex = candidateTier.minIndex;
selectedScore = candidateTier.maxScore;
return candidate;
}, undefined);
return {
codecSet: codecSet,
videoRanges: videoRanges,
preferHDR: preferHDR,
minFramerate: minFramerate,
minBitrate: minBitrate,
minIndex: minIndex,
};
}
function logStartCodecCandidateIgnored(codeSet, reason) {
}
function getAudioTracksByGroup(allAudioTracks) {
return allAudioTracks.reduce(function (audioTracksByGroup, track) {
var trackGroup = audioTracksByGroup.groups[track.groupId];
if (!trackGroup) {
trackGroup = audioTracksByGroup.groups[track.groupId] = {
tracks: [],
channels: { 2: 0 },
hasDefault: false,
hasAutoSelect: false,
};
}
trackGroup.tracks.push(track);
var channelsKey = track.channels || '2';
trackGroup.channels[channelsKey] =
(trackGroup.channels[channelsKey] || 0) + 1;
trackGroup.hasDefault = trackGroup.hasDefault || track.default;
trackGroup.hasAutoSelect = trackGroup.hasAutoSelect || track.autoselect;
if (trackGroup.hasDefault) {
audioTracksByGroup.hasDefaultAudio = true;
}
if (trackGroup.hasAutoSelect) {
audioTracksByGroup.hasAutoSelectAudio = true;
}
return audioTracksByGroup;
}, {
hasDefaultAudio: false,
hasAutoSelectAudio: false,
groups: {},
});
}
function getCodecTiers(levels, audioTracksByGroup, minAutoLevel, maxAutoLevel) {
return levels
.slice(minAutoLevel, maxAutoLevel + 1)
.reduce(function (tiers, level, index) {
if (!level.codecSet) {
return tiers;
}
var audioGroups = level.audioGroups;
var tier = tiers[level.codecSet];
if (!tier) {
tiers[level.codecSet] = tier = {
minBitrate: Infinity,
minHeight: Infinity,
minFramerate: Infinity,
minIndex: index,
maxScore: 0,
videoRanges: { SDR: 0 },
channels: { '2': 0 },
hasDefaultAudio: !audioGroups,
fragmentError: 0,
};
}
tier.minBitrate = Math.min(tier.minBitrate, level.bitrate);
var lesserWidthOrHeight = Math.min(level.height, level.width);
tier.minHeight = Math.min(tier.minHeight, lesserWidthOrHeight);
tier.minFramerate = Math.min(tier.minFramerate, level.frameRate);
tier.minIndex = Math.min(tier.minIndex, index);
tier.maxScore = Math.max(tier.maxScore, level.score);
tier.fragmentError += level.fragmentError;
tier.videoRanges[level.videoRange] =
(tier.videoRanges[level.videoRange] || 0) + 1;
return tiers;
}, {});
}
function useAlternateAudio(audioTrackUrl, hls) {
var _a;
return !!audioTrackUrl && audioTrackUrl !== ((_a = hls.loadLevelObj) === null || _a === void 0 ? void 0 : _a.uri);
}
var AbrController = (function (_super) {
__extends(AbrController, _super);
function AbrController(hls) {
var _this = _super.call(this, 'abr', hls.logger) || this;
_this.lastLevelLoadSec = 0;
_this.lastLoadedFragLevel = -1;
_this.firstSelection = -1;
_this.firstAutoFloor = -1;
_this._nextAutoLevel = -1;
_this.nextAutoLevelKey = '';
_this.audioTracksByGroup = null;
_this.codecTiers = null;
_this.timer = -1;
_this.fragCurrent = null;
_this.partCurrent = null;
_this.bitrateTestDelay = 0;
_this.rebufferNotice = -1;
_this.supportedCache = {};
_this._abandonRulesCheck = function (levelLoaded) {
var _a;
var _b = _this, frag = _b.fragCurrent, part = _b.partCurrent, hls = _b.hls;
if (!hls) {
return;
}
var autoLevelEnabled = hls.autoLevelEnabled, media = hls.media;
if (!frag || !media) {
return;
}
var now = performance.now();
var stats = part ? part.stats : frag.stats;
var duration = part ? part.duration : frag.duration;
var timeLoading = now - stats.loading.start;
var minAutoLevel = hls.minAutoLevel;
var loadingFragForLevel = frag.level;
var currentAutoLevel = _this._nextAutoLevel;
if (stats.aborted ||
(stats.loaded && stats.loaded === stats.total) ||
loadingFragForLevel <= minAutoLevel) {
_this.clearTimer();
_this._nextAutoLevel = -1;
return;
}
if (!autoLevelEnabled) {
return;
}
var fragBlockingSwitch = currentAutoLevel > -1 && currentAutoLevel !== loadingFragForLevel;
var levelChange = !!levelLoaded || fragBlockingSwitch;
if (!levelChange &&
(media.paused || !media.playbackRate || !media.readyState)) {
return;
}
var bufferInfo = hls.mainForwardBufferInfo;
if (!levelChange && bufferInfo === null) {
return;
}
var ttfbEstimate = _this.bwEstimator.getEstimateTTFB();
var playbackRate = Math.abs(media.playbackRate);
if (timeLoading <=
Math.max(ttfbEstimate, 1000 * (duration / (playbackRate * 2)))) {
return;
}
var bufferStarvationDelay = bufferInfo
? bufferInfo.len / playbackRate
: 0;
var ttfb = stats.loading.first
? stats.loading.first - stats.loading.start
: -1;
var loadedFirstByte = stats.loaded && ttfb > -1;
var bwEstimate = _this.getBwEstimate();
var levels = hls.levels;
var level = levels[loadingFragForLevel];
var expectedLen = Math.max(stats.loaded, Math.round((duration * (frag.bitrate || level.averageBitrate)) / 8));
var timeStreaming = loadedFirstByte ? timeLoading - ttfb : timeLoading;
if (timeStreaming < 1 && loadedFirstByte) {
timeStreaming = Math.min(timeLoading, (stats.loaded * 8) / bwEstimate);
}
var loadRate = loadedFirstByte
? (stats.loaded * 1000) / timeStreaming
: 0;
var ttfbSeconds = ttfbEstimate / 1000;
var fragLoadedDelay = loadRate
? (expectedLen - stats.loaded) / loadRate
: (expectedLen * 8) / bwEstimate + ttfbSeconds;
if (fragLoadedDelay <= bufferStarvationDelay) {
return;
}
var bwe = loadRate ? loadRate * 8 : bwEstimate;
var live = ((_a = ((levelLoaded === null || levelLoaded === void 0 ? void 0 : levelLoaded.details) || hls.latestLevelDetails)) === null || _a === void 0 ? void 0 : _a.live) === true;
var abrBandWidthUpFactor = hls.config.abrBandWidthUpFactor;
var fragLevelNextLoadedDelay = Number.POSITIVE_INFINITY;
var nextLoadLevel;
for (nextLoadLevel = loadingFragForLevel - 1; nextLoadLevel > minAutoLevel; nextLoadLevel--) {
var levelNextBitrate = levels[nextLoadLevel].maxBitrate;
var requiresLevelLoad = !levels[nextLoadLevel].details || live;
fragLevelNextLoadedDelay = _this.getTimeToLoadFrag(ttfbSeconds, bwe, duration * levelNextBitrate, requiresLevelLoad);
if (fragLevelNextLoadedDelay <
Math.min(bufferStarvationDelay, duration + ttfbSeconds)) {
break;
}
}
if (fragLevelNextLoadedDelay >= fragLoadedDelay) {
return;
}
if (fragLevelNextLoadedDelay > duration * 10) {
return;
}
if (loadedFirstByte) {
_this.bwEstimator.sample(timeLoading - Math.min(ttfbEstimate, ttfb), stats.loaded);
}
else {
_this.bwEstimator.sampleTTFB(timeLoading);
}
var nextLoadLevelBitrate = levels[nextLoadLevel].maxBitrate;
if (_this.getBwEstimate() * abrBandWidthUpFactor > nextLoadLevelBitrate) {
_this.firstAutoFloor = Math.min(nextLoadLevel, hls.firstLevel);
_this.resetEstimator(nextLoadLevelBitrate);
}
var bestSwitchLevel = _this.findBestLevel(nextLoadLevelBitrate, minAutoLevel, nextLoadLevel, 0, bufferStarvationDelay, 1, 1);
if (bestSwitchLevel > -1) {
nextLoadLevel = bestSwitchLevel;
}
_this.warn("Fragment ".concat(frag.sn).concat(part ? ' part ' + part.index : '', " of level ").concat(loadingFragForLevel, " is loading too slowly;\n      Fragment duration: ").concat(frag.duration.toFixed(3), "\n      Time to underbuffer: ").concat(bufferStarvationDelay.toFixed(3), " s\n      Estimated load time for current fragment: ").concat(fragLoadedDelay.toFixed(3), " s\n      Estimated load time for down switch fragment: ").concat(fragLevelNextLoadedDelay.toFixed(3), " s\n      TTFB estimate: ").concat(ttfb | 0, " ms\n      Current BW estimate: ").concat(Number.isFinite(bwEstimate) ? bwEstimate | 0 : 'Unknown', " bps\n      New BW estimate: ").concat(_this.getBwEstimate() | 0, " bps\n      Switching to level ").concat(nextLoadLevel, " @ ").concat(nextLoadLevelBitrate | 0, " bps"));
hls.nextLoadLevel = hls.nextAutoLevel = nextLoadLevel;
_this.clearTimer();
var abortAndSwitch = function () {
_this.clearTimer();
var hls = _this.hls;
if (_this.fragCurrent === frag &&
hls.loadLevel === nextLoadLevel &&
nextLoadLevel > 0) {
var bufferStarvationDelay_1 = _this.getStarvationDelay();
_this
.warn("Aborting inflight request ".concat(nextLoadLevel > 0 ? 'and switching down' : '', "\n      Fragment duration: ").concat(frag.duration.toFixed(3), " s\n      Time to underbuffer: ").concat(bufferStarvationDelay_1.toFixed(3), " s"));
frag.abortRequests();
_this.fragCurrent = _this.partCurrent = null;
if (nextLoadLevel > minAutoLevel) {
var lowestSwitchLevel = _this.findBestLevel(hls.levels[minAutoLevel].bitrate, minAutoLevel, nextLoadLevel, 0, bufferStarvationDelay_1, 1, 1);
if (lowestSwitchLevel === -1) {
lowestSwitchLevel = minAutoLevel;
}
hls.nextLoadLevel = hls.nextAutoLevel = lowestSwitchLevel;
_this.firstAutoFloor = Math.min(lowestSwitchLevel, hls.firstLevel);
_this.resetEstimator(hls.levels[lowestSwitchLevel].bitrate);
}
}
};
if (fragBlockingSwitch || fragLoadedDelay > fragLevelNextLoadedDelay * 2) {
abortAndSwitch();
}
else {
_this.timer = self.setInterval(abortAndSwitch, fragLevelNextLoadedDelay * 1000);
}
hls.trigger(Events.FRAG_LOAD_EMERGENCY_ABORTED, { frag: frag, part: part, stats: stats });
};
_this.hls = hls;
_this.bwEstimator = _this.initEstimator();
_this.registerListeners();
return _this;
}
AbrController.prototype.resetEstimator = function (abrEwmaDefaultEstimate) {
if (!this.hls) {
return;
}
if (abrEwmaDefaultEstimate) {
this.hls.config.abrEwmaDefaultEstimate = abrEwmaDefaultEstimate;
}
this.firstSelection = -1;
this.bwEstimator = this.initEstimator();
};
AbrController.prototype.initEstimator = function () {
var config = this.hls.config;
return new EwmaBandWidthEstimator(config.abrEwmaSlowVoD, config.abrEwmaFastVoD, config.abrEwmaDefaultEstimate);
};
AbrController.prototype.registerListeners = function () {
var hls = this.hls;
hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.on(Events.FRAG_LOADING, this.onFragLoading, this);
hls.on(Events.FRAG_LOADED, this.onFragLoaded, this);
hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
hls.on(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
hls.on(Events.MAX_AUTO_LEVEL_UPDATED, this.onMaxAutoLevelUpdated, this);
hls.on(Events.ERROR, this.onError, this);
};
AbrController.prototype.unregisterListeners = function () {
var hls = this.hls;
if (!hls) {
return;
}
hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.off(Events.FRAG_LOADING, this.onFragLoading, this);
hls.off(Events.FRAG_LOADED, this.onFragLoaded, this);
hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
hls.off(Events.LEVEL_SWITCHING, this.onLevelSwitching, this);
hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
hls.off(Events.MAX_AUTO_LEVEL_UPDATED, this.onMaxAutoLevelUpdated, this);
hls.off(Events.ERROR, this.onError, this);
};
AbrController.prototype.destroy = function () {
this.unregisterListeners();
this.clearTimer();
this.hls = this._abandonRulesCheck = this.supportedCache = null;
this.audioTracksByGroup =
this.codecTiers =
this.fragCurrent =
this.partCurrent =
null;
};
AbrController.prototype.onManifestLoading = function (event, data) {
this.lastLoadedFragLevel = -1;
this.firstSelection = -1;
this.firstAutoFloor = -1;
this.lastLevelLoadSec = 0;
this.supportedCache = {};
this.fragCurrent = this.partCurrent = null;
this.onLevelsUpdated();
this.clearTimer();
};
AbrController.prototype.onLevelsUpdated = function () {
if (this.lastLoadedFragLevel > -1 && this.fragCurrent) {
this.lastLoadedFragLevel = this.fragCurrent.level;
}
this._nextAutoLevel = -1;
this.onMaxAutoLevelUpdated();
this.codecTiers = null;
this.audioTracksByGroup = null;
};
AbrController.prototype.onMaxAutoLevelUpdated = function () {
this.firstSelection = -1;
this.nextAutoLevelKey = '';
};
AbrController.prototype.onFragLoading = function (event, data) {
var _a;
var frag = data.frag;
if (this.ignoreFragment(frag)) {
return;
}
if (!frag.bitrateTest) {
this.fragCurrent = frag;
this.partCurrent = (_a = data.part) !== null && _a !== void 0 ? _a : null;
}
this.clearTimer();
this.timer = self.setInterval(this._abandonRulesCheck, 100);
};
AbrController.prototype.onLevelSwitching = function (event, data) {
this.clearTimer();
};
AbrController.prototype.onError = function (event, data) {
if (data.fatal) {
return;
}
switch (data.details) {
case ErrorDetails.BUFFER_ADD_CODEC_ERROR:
case ErrorDetails.BUFFER_APPEND_ERROR:
this.lastLoadedFragLevel = -1;
this.firstSelection = -1;
break;
case ErrorDetails.FRAG_LOAD_TIMEOUT: {
var frag = data.frag;
var _a = this, fragCurrent = _a.fragCurrent, part = _a.partCurrent;
if (frag && fragmentsAreEqual(frag, fragCurrent)) {
var now = performance.now();
var stats = part ? part.stats : frag.stats;
var timeLoading = now - stats.loading.start;
var ttfb = stats.loading.first
? stats.loading.first - stats.loading.start
: -1;
var loadedFirstByte = stats.loaded && ttfb > -1;
if (loadedFirstByte) {
var ttfbEstimate = this.bwEstimator.getEstimateTTFB();
this.bwEstimator.sample(timeLoading - Math.min(ttfbEstimate, ttfb), stats.loaded);
}
else {
this.bwEstimator.sampleTTFB(timeLoading);
}
}
break;
}
}
};
AbrController.prototype.getTimeToLoadFrag = function (timeToFirstByteSec, bandwidth, fragSizeBits, isSwitch) {
var fragLoadSec = timeToFirstByteSec + fragSizeBits / bandwidth;
var playlistLoadSec = isSwitch
? timeToFirstByteSec + this.lastLevelLoadSec
: 0;
return fragLoadSec + playlistLoadSec;
};
AbrController.prototype.onLevelLoaded = function (event, data) {
var config = this.hls.config;
var loading = data.stats.loading;
var timeLoadingMs = loading.end - loading.first;
if (Number.isFinite(timeLoadingMs)) {
this.lastLevelLoadSec = timeLoadingMs / 1000;
}
if (data.details.live) {
this.bwEstimator.update(config.abrEwmaSlowLive, config.abrEwmaFastLive);
}
else {
this.bwEstimator.update(config.abrEwmaSlowVoD, config.abrEwmaFastVoD);
}
if (this.timer > -1) {
this._abandonRulesCheck(data.levelInfo);
}
};
AbrController.prototype.onFragLoaded = function (event, data) {
var _a;
var frag = data.frag, part = data.part;
var stats = part ? part.stats : frag.stats;
if (frag.type === PlaylistLevelType.MAIN) {
this.bwEstimator.sampleTTFB(stats.loading.first - stats.loading.start);
}
if (this.ignoreFragment(frag)) {
return;
}
this.clearTimer();
if (frag.level === this._nextAutoLevel) {
this._nextAutoLevel = -1;
}
this.firstSelection = -1;
if ((_a = this.hls) === null || _a === void 0 ? void 0 : _a.config.abrMaxWithRealBitrate) {
var duration = part ? part.duration : frag.duration;
var level = this.hls.levels[frag.level];
var loadedBytes = (level.loaded ? level.loaded.bytes : 0) + stats.loaded;
var loadedDuration = (level.loaded ? level.loaded.duration : 0) + duration;
level.loaded = { bytes: loadedBytes, duration: loadedDuration };
level.realBitrate = Math.round((8 * loadedBytes) / loadedDuration);
}
if (frag.bitrateTest) {
var fragBufferedData = {
stats: stats,
frag: frag,
part: part,
id: frag.type,
};
this.onFragBuffered(Events.FRAG_BUFFERED, fragBufferedData);
frag.bitrateTest = false;
}
else {
this.lastLoadedFragLevel = frag.level;
}
};
AbrController.prototype.onFragBuffered = function (event, data) {
var frag = data.frag, part = data.part;
var stats = (part === null || part === void 0 ? void 0 : part.stats.loaded) ? part.stats : frag.stats;
if (stats.aborted) {
return;
}
if (this.ignoreFragment(frag)) {
return;
}
var processingEnd = (frag.bitrate || 0) >= 100000 ? stats.parsing.end : stats.loading.end;
var processingMs = processingEnd -
stats.loading.start -
Math.min(stats.loading.first - stats.loading.start, this.bwEstimator.getEstimateTTFB());
this.bwEstimator.sample(processingMs, stats.loaded);
stats.bwEstimate = this.getBwEstimate();
if (frag.bitrateTest) {
this.bitrateTestDelay = processingMs / 1000;
}
else {
this.bitrateTestDelay = 0;
if (this.firstAutoFloor > -1 && this.bwEstimator.canEstimate()) {
this.firstAutoFloor = -1;
}
}
};
AbrController.prototype.ignoreFragment = function (frag) {
return frag.type !== PlaylistLevelType.MAIN || frag.sn === 'initSegment';
};
AbrController.prototype.clearTimer = function () {
if (this.timer > -1) {
self.clearInterval(this.timer);
this.timer = -1;
}
};
Object.defineProperty(AbrController.prototype, "firstAutoLevel", {
get: function () {
var hls = this.hls;
if (!hls) {
return 0;
}
var maxAutoLevel = hls.maxAutoLevel, minAutoLevel = hls.minAutoLevel;
var bwEstimate = this.getBwEstimate();
var bufferStarvationDelay = this.getStarvationDelay();
var maxStartDelay = hls.config.maxStarvationDelay;
var abrAutoLevel = this.findBestLevel(bwEstimate, minAutoLevel, maxAutoLevel, bufferStarvationDelay / 2, maxStartDelay, 1, 1);
if (abrAutoLevel > -1) {
return abrAutoLevel;
}
var firstLevel = hls.firstLevel;
var firstAutoFloor = this.firstAutoFloor === -1 ? Infinity : this.firstAutoFloor;
var clamped = Math.min(Math.max(firstLevel, minAutoLevel), maxAutoLevel, firstAutoFloor);
this.warn("Could not find best starting auto level. Defaulting to first in playlist ".concat(firstLevel, " clamped to ").concat(clamped));
return clamped;
},
enumerable: false,
configurable: true
});
Object.defineProperty(AbrController.prototype, "forcedAutoLevel", {
get: function () {
if (this.nextAutoLevelKey) {
return -1;
}
return this._nextAutoLevel;
},
enumerable: false,
configurable: true
});
Object.defineProperty(AbrController.prototype, "nextAutoLevel", {
get: function () {
if (!this.hls) {
return -1;
}
var forcedAutoLevel = this.forcedAutoLevel;
var bwEstimator = this.bwEstimator;
var useEstimate = bwEstimator.canEstimate();
var loadedFirstFrag = this.lastLoadedFragLevel > -1;
if (forcedAutoLevel !== -1 &&
(!useEstimate ||
!loadedFirstFrag ||
this.nextAutoLevelKey === this.getAutoLevelKey())) {
return forcedAutoLevel;
}
var nextABRAutoLevel = useEstimate && loadedFirstFrag
? this.getNextABRAutoLevel()
: this.firstAutoLevel;
if (forcedAutoLevel !== -1) {
var levels = this.hls.levels;
if (levels.length > Math.max(forcedAutoLevel, nextABRAutoLevel) &&
levels[forcedAutoLevel].loadError <= levels[nextABRAutoLevel].loadError) {
return forcedAutoLevel;
}
}
this._nextAutoLevel = nextABRAutoLevel;
this.nextAutoLevelKey = this.getAutoLevelKey();
return nextABRAutoLevel;
},
set: function (nextLevel) {
var value = this.deriveNextAutoLevel(nextLevel);
if (this._nextAutoLevel !== value) {
this.nextAutoLevelKey = '';
this._nextAutoLevel = value;
}
},
enumerable: false,
configurable: true
});
AbrController.prototype.getAutoLevelKey = function () {
return "".concat(this.getBwEstimate(), "_").concat(this.getStarvationDelay().toFixed(2));
};
AbrController.prototype.getNextABRAutoLevel = function () {
var _a = this, fragCurrent = _a.fragCurrent, partCurrent = _a.partCurrent, hls = _a.hls;
if (!hls) {
return -1;
}
if (hls.levels.length <= 1) {
return hls.loadLevel;
}
var maxAutoLevel = hls.maxAutoLevel, config = hls.config, minAutoLevel = hls.minAutoLevel;
var currentFragDuration = partCurrent
? partCurrent.duration
: fragCurrent
? fragCurrent.duration
: 0;
var avgbw = this.getBwEstimate();
var bufferStarvationDelay = this.getStarvationDelay();
var bwFactor = config.abrBandWidthFactor;
var bwUpFactor = config.abrBandWidthUpFactor;
if (bufferStarvationDelay) {
var bestLevel_1 = this.findBestLevel(avgbw, minAutoLevel, maxAutoLevel, bufferStarvationDelay, 0, bwFactor, bwUpFactor);
if (bestLevel_1 >= 0) {
this.rebufferNotice = -1;
return bestLevel_1;
}
}
var maxStarvationDelay = currentFragDuration
? Math.min(currentFragDuration, config.maxStarvationDelay)
: config.maxStarvationDelay;
if (!bufferStarvationDelay) {
var bitrateTestDelay = this.bitrateTestDelay;
if (bitrateTestDelay) {
var maxLoadingDelay = currentFragDuration
? Math.min(currentFragDuration, config.maxLoadingDelay)
: config.maxLoadingDelay;
maxStarvationDelay = maxLoadingDelay - bitrateTestDelay;
bwFactor = bwUpFactor = 1;
}
}
var bestLevel = this.findBestLevel(avgbw, minAutoLevel, maxAutoLevel, bufferStarvationDelay, maxStarvationDelay, bwFactor, bwUpFactor);
if (this.rebufferNotice !== bestLevel) {
this.rebufferNotice = bestLevel;
}
if (bestLevel > -1) {
return bestLevel;
}
var minLevel = hls.levels[minAutoLevel];
var autoLevel = hls.loadLevelObj;
if (autoLevel && (minLevel === null || minLevel === void 0 ? void 0 : minLevel.bitrate) < autoLevel.bitrate) {
return minAutoLevel;
}
return hls.loadLevel;
};
AbrController.prototype.getStarvationDelay = function () {
var hls = this.hls;
var media = hls === null || hls === void 0 ? void 0 : hls.media;
if (!media) {
return Infinity;
}
var playbackRate = media && media.playbackRate !== 0 ? Math.abs(media.playbackRate) : 1.0;
var bufferInfo = hls.mainForwardBufferInfo;
return (bufferInfo ? bufferInfo.len : 0) / playbackRate;
};
AbrController.prototype.getBwEstimate = function () {
return this.bwEstimator.getEstimate();
};
AbrController.prototype.findBestLevel = function (currentBw, minAutoLevel, maxAutoLevel, bufferStarvationDelay, maxStarvationDelay, bwFactor, bwUpFactor) {
var _a, _b;
var _c = this, hls = _c.hls, lastLoadedFragLevel = _c.lastLoadedFragLevel, fragCurrent = _c.fragCurrent, partCurrent = _c.partCurrent;
if (!hls) {
return -1;
}
var maxFetchDuration = bufferStarvationDelay + maxStarvationDelay;
var selectionBaseLevel = lastLoadedFragLevel === -1 ? hls.firstLevel : lastLoadedFragLevel;
var levels = hls.levels, allAudioTracks = hls.allAudioTracks, loadLevel = hls.loadLevel, latestLevelDetails = hls.latestLevelDetails, config = hls.config;
if (levels.length === 1) {
return 0;
}
var level = levels[selectionBaseLevel];
var live = !!(latestLevelDetails === null || latestLevelDetails === void 0 ? void 0 : latestLevelDetails.live);
var firstSelection = loadLevel === -1 || lastLoadedFragLevel === -1;
var currentCodecSet;
var currentVideoRange = 'SDR';
var currentFrameRate = (level === null || level === void 0 ? void 0 : level.frameRate) || 0;
var audioPreference = config.audioPreference, videoPreference = config.videoPreference;
var audioTracksByGroup = this.audioTracksByGroup ||
(this.audioTracksByGroup = getAudioTracksByGroup(allAudioTracks));
var minStartIndex = -1;
if (firstSelection) {
if (this.firstSelection !== -1) {
return this.firstSelection;
}
var codecTiers = this.codecTiers ||
(this.codecTiers = getCodecTiers(levels, audioTracksByGroup, minAutoLevel, maxAutoLevel));
var startTier = getStartCodecTier(codecTiers, currentVideoRange, currentBw, audioPreference, videoPreference);
var codecSet = startTier.codecSet, videoRanges = startTier.videoRanges, minFramerate = startTier.minFramerate, minBitrate = startTier.minBitrate, minIndex = startTier.minIndex, preferHDR = startTier.preferHDR;
minStartIndex = minIndex;
currentCodecSet = codecSet;
currentVideoRange = preferHDR
? videoRanges[videoRanges.length - 1]
: videoRanges[0];
currentFrameRate = minFramerate;
currentBw = Math.max(currentBw, minBitrate);
}
else {
currentCodecSet = level === null || level === void 0 ? void 0 : level.codecSet;
currentVideoRange = level === null || level === void 0 ? void 0 : level.videoRange;
}
var currentFragDuration = partCurrent
? partCurrent.duration
: fragCurrent
? fragCurrent.duration
: 0;
var ttfbEstimateSec = this.bwEstimator.getEstimateTTFB() / 1000;
var _loop_1 = function (i) {
var levelInfo = levels[i];
var upSwitch = i > selectionBaseLevel;
if (!levelInfo) {
return "continue";
}
if ((currentCodecSet && levelInfo.codecSet !== currentCodecSet) ||
(currentVideoRange && levelInfo.videoRange !== currentVideoRange) ||
(upSwitch && currentFrameRate > levelInfo.frameRate) ||
(!upSwitch &&
currentFrameRate > 0 &&
currentFrameRate < levelInfo.frameRate) ||
((_b = (_a = levelInfo.supportedResult) === null || _a === void 0 ? void 0 : _a.decodingInfoResults) === null || _b === void 0 ? void 0 : _b.some(function (info) { return info.smooth === false; }))) {
if (!firstSelection || i !== minStartIndex) {
return "continue";
}
}
var levelDetails = levelInfo.details;
var avgDuration = (partCurrent
? levelDetails === null || levelDetails === void 0 ? void 0 : levelDetails.partTarget
: levelDetails === null || levelDetails === void 0 ? void 0 : levelDetails.averagetargetduration) ||
currentFragDuration ||
1;
var adjustedbw = void 0;
if (!upSwitch) {
adjustedbw = bwFactor * currentBw;
}
else {
adjustedbw = bwUpFactor * currentBw;
}
var bitrate = currentFragDuration &&
bufferStarvationDelay >= currentFragDuration * 2 &&
maxStarvationDelay === 0
? levelInfo.averageBitrate
: levelInfo.maxBitrate;
var fetchDuration = this_1.getTimeToLoadFrag(ttfbEstimateSec, adjustedbw, bitrate * avgDuration, !levelDetails || levelDetails.live);
var canSwitchWithinTolerance = adjustedbw >= bitrate &&
(i === lastLoadedFragLevel ||
(levelInfo.loadError === 0 && levelInfo.fragmentError === 0) ||
isPenaltyExpired(levelInfo, config.errorPenaltyExpireMs)) &&
(fetchDuration <= ttfbEstimateSec ||
!Number.isFinite(fetchDuration) ||
(live && !this_1.bitrateTestDelay) ||
fetchDuration < maxFetchDuration);
if (canSwitchWithinTolerance) {
this_1.forcedAutoLevel;
if (firstSelection) {
this_1.firstSelection = i;
}
return { value: i };
}
};
var this_1 = this;
for (var i = maxAutoLevel; i >= minAutoLevel; i--) {
var state_1 = _loop_1(i);
if (typeof state_1 === "object")
return state_1.value;
}
return -1;
};
AbrController.prototype.deriveNextAutoLevel = function (nextLevel) {
if (!this.hls) {
return -1;
}
var _a = this.hls, maxAutoLevel = _a.maxAutoLevel, minAutoLevel = _a.minAutoLevel;
return Math.min(Math.max(nextLevel, minAutoLevel), maxAutoLevel);
};
return AbrController;
}(Logger));
var BufferOperationQueue = (function () {
function BufferOperationQueue(sourceBufferReference) {
this.queues = {
video: [],
audio: [],
audiovideo: [],
};
this.tracks = sourceBufferReference;
}
BufferOperationQueue.prototype.destroy = function () {
this.tracks = this.queues = null;
};
BufferOperationQueue.prototype.append = function (operation, type, pending) {
if (this.queues === null || this.tracks === null) {
return;
}
var queue = this.queues[type];
queue.push(operation);
if (queue.length === 1 && !pending) {
this.executeNext(type);
}
};
BufferOperationQueue.prototype.appendBlocker = function (type) {
var _this = this;
return new Promise(function (resolve) {
var operation = {
label: 'async-blocker',
execute: resolve,
onStart: function () { },
onComplete: function () { },
onError: function () { },
};
_this.append(operation, type);
});
};
BufferOperationQueue.prototype.prependBlocker = function (type) {
var _this = this;
return new Promise(function (resolve) {
if (_this.queues) {
var operation = {
label: 'async-blocker-prepend',
execute: resolve,
onStart: function () { },
onComplete: function () { },
onError: function () { },
};
_this.queues[type].unshift(operation);
}
});
};
BufferOperationQueue.prototype.removeBlockers = function () {
if (this.queues === null) {
return;
}
[this.queues.video, this.queues.audio, this.queues.audiovideo].forEach(function (queue) {
var _a;
var label = (_a = queue[0]) === null || _a === void 0 ? void 0 : _a.label;
if (label === 'async-blocker' || label === 'async-blocker-prepend') {
queue[0].execute();
queue.splice(0, 1);
}
else if (label === 'block-audio') {
queue.splice(0, 1);
}
});
};
BufferOperationQueue.prototype.insertNext = function (operations, type) {
var _a;
if (this.queues === null) {
return;
}
(_a = this.queues[type]).splice.apply(_a, __spreadArray([1, 0], operations));
};
BufferOperationQueue.prototype.unblockAudio = function () {
var _a;
if (this.queues === null) {
return;
}
if (((_a = this.current('audio')) === null || _a === void 0 ? void 0 : _a.label) === 'block-audio') {
this.shiftAndExecuteNext('audio');
}
};
BufferOperationQueue.prototype.audioBlocking = function () {
if (this.queues === null) {
return false;
}
return this.queues.audio.some(function (op) { return op.label === 'block-audio'; });
};
BufferOperationQueue.prototype.executeNext = function (type) {
var _a;
if (this.queues === null || this.tracks === null) {
return;
}
var queue = this.queues[type];
if (queue.length) {
var operation = queue[0];
try {
operation.execute();
}
catch (error) {
operation.onError(error);
if (this.queues === null || this.tracks === null) {
return;
}
var sb = (_a = this.tracks[type]) === null || _a === void 0 ? void 0 : _a.buffer;
if (!(sb === null || sb === void 0 ? void 0 : sb.updating)) {
this.shiftAndExecuteNext(type);
}
}
}
};
BufferOperationQueue.prototype.shiftAndExecuteNext = function (type) {
if (this.queues === null) {
return;
}
this.queues[type].shift();
this.executeNext(type);
};
BufferOperationQueue.prototype.current = function (type) {
var _a;
return ((_a = this.queues) === null || _a === void 0 ? void 0 : _a[type][0]) || null;
};
BufferOperationQueue.prototype.toString = function () {
var _a = this, queues = _a.queues, tracks = _a.tracks;
if (queues === null || tracks === null) {
return "<destroyed>";
}
return "\n".concat(this.list('video'), "\n").concat(this.list('audio'), "\n").concat(this.list('audiovideo'), "}");
};
BufferOperationQueue.prototype.list = function (type) {
var _a, _b;
return ((_a = this.queues) === null || _a === void 0 ? void 0 : _a[type]) || ((_b = this.tracks) === null || _b === void 0 ? void 0 : _b[type])
? "".concat(type, ": (").concat(this.listSbInfo(type), ") ").concat(this.listOps(type))
: '';
};
BufferOperationQueue.prototype.listSbInfo = function (type) {
var _a;
var track = (_a = this.tracks) === null || _a === void 0 ? void 0 : _a[type];
var sb = track === null || track === void 0 ? void 0 : track.buffer;
if (!sb) {
return 'none';
}
return "SourceBuffer".concat(sb.updating ? ' updating' : '').concat(track.ended ? ' ended' : '').concat(track.ending ? ' ending' : '');
};
BufferOperationQueue.prototype.listOps = function (type) {
var _a;
return ((_a = this.queues) === null || _a === void 0 ? void 0 : _a[type].map(function (op) { return op.label; }).join(', ')) || '';
};
return BufferOperationQueue;
}());
var BinarySearch = {
search: function (list, comparisonFn) {
var minIndex = 0;
var maxIndex = list.length - 1;
var currentIndex = null;
var currentElement = null;
while (minIndex <= maxIndex) {
currentIndex = ((minIndex + maxIndex) / 2) | 0;
currentElement = list[currentIndex];
var comparisonResult = comparisonFn(currentElement);
if (comparisonResult > 0) {
minIndex = currentIndex + 1;
}
else if (comparisonResult < 0) {
maxIndex = currentIndex - 1;
}
else {
return currentElement;
}
}
return null;
},
};
function findFragmentByPDT(fragments, PDTValue, maxFragLookUpTolerance) {
if (PDTValue === null ||
!Array.isArray(fragments) ||
!fragments.length ||
!Number.isFinite(PDTValue)) {
return null;
}
var startPDT = fragments[0].programDateTime;
if (PDTValue < (startPDT || 0)) {
return null;
}
var endPDT = fragments[fragments.length - 1].endProgramDateTime;
if (PDTValue >= (endPDT || 0)) {
return null;
}
for (var seg = 0; seg < fragments.length; ++seg) {
var frag = fragments[seg];
if (pdtWithinToleranceTest(PDTValue, maxFragLookUpTolerance, frag)) {
return frag;
}
}
return null;
}
function findFragmentByPTS(fragPrevious, fragments, bufferEnd, maxFragLookUpTolerance, nextFragLookupTolerance) {
if (bufferEnd === void 0) { bufferEnd = 0; }
if (maxFragLookUpTolerance === void 0) { maxFragLookUpTolerance = 0; }
if (nextFragLookupTolerance === void 0) { nextFragLookupTolerance = 0.005; }
var fragNext = null;
if (fragPrevious) {
fragNext = fragments[1 + fragPrevious.sn - fragments[0].sn] || null;
var bufferEdgeError = fragPrevious.endDTS - bufferEnd;
if (bufferEdgeError > 0 && bufferEdgeError < 0.0000015) {
bufferEnd += 0.0000015;
}
if (fragNext &&
fragPrevious.level !== fragNext.level &&
fragNext.end <= fragPrevious.end) {
fragNext = fragments[2 + fragPrevious.sn - fragments[0].sn] || null;
}
}
else if (bufferEnd === 0 && fragments[0].start === 0) {
fragNext = fragments[0];
}
if (fragNext &&
(((!fragPrevious || fragPrevious.level === fragNext.level) &&
fragmentWithinToleranceTest(bufferEnd, maxFragLookUpTolerance, fragNext) === 0) ||
fragmentWithinFastStartSwitch(fragNext, fragPrevious, Math.min(nextFragLookupTolerance, maxFragLookUpTolerance)))) {
return fragNext;
}
var foundFragment = BinarySearch.search(fragments, fragmentWithinToleranceTest.bind(null, bufferEnd, maxFragLookUpTolerance));
if (foundFragment && (foundFragment !== fragPrevious || !fragNext)) {
return foundFragment;
}
return fragNext;
}
function fragmentWithinFastStartSwitch(fragNext, fragPrevious, nextFragLookupTolerance) {
if ((fragPrevious === null || fragPrevious === void 0 ? void 0 : fragPrevious.start) === 0 &&
fragPrevious.level < fragNext.level &&
(fragPrevious.endPTS || 0) > 0) {
var firstDuration = fragPrevious.tagList.reduce(function (duration, tag) {
if (tag[0] === 'INF') {
duration += parseFloat(tag[1]);
}
return duration;
}, nextFragLookupTolerance);
return fragNext.start <= firstDuration;
}
return false;
}
function fragmentWithinToleranceTest(bufferEnd, maxFragLookUpTolerance, candidate) {
if (bufferEnd === void 0) { bufferEnd = 0; }
if (maxFragLookUpTolerance === void 0) { maxFragLookUpTolerance = 0; }
if (candidate.start <= bufferEnd &&
candidate.start + candidate.duration > bufferEnd) {
return 0;
}
var candidateLookupTolerance = Math.min(maxFragLookUpTolerance, candidate.duration + (candidate.deltaPTS ? candidate.deltaPTS : 0));
if (candidate.start + candidate.duration - candidateLookupTolerance <=
bufferEnd) {
return 1;
}
else if (candidate.start - candidateLookupTolerance > bufferEnd &&
candidate.start) {
return -1;
}
return 0;
}
function pdtWithinToleranceTest(pdtBufferEnd, maxFragLookUpTolerance, candidate) {
var candidateLookupTolerance = Math.min(maxFragLookUpTolerance, candidate.duration + (candidate.deltaPTS ? candidate.deltaPTS : 0)) * 1000;
var endProgramDateTime = candidate.endProgramDateTime || 0;
return endProgramDateTime - candidateLookupTolerance > pdtBufferEnd;
}
function findNearestWithCC(details, cc, pos) {
if (details) {
if (details.startCC <= cc && details.endCC >= cc) {
var fragments = details.fragments;
var fragmentHint = details.fragmentHint;
if (fragmentHint) {
fragments = fragments.concat(fragmentHint);
}
var closest_1;
BinarySearch.search(fragments, function (candidate) {
if (candidate.cc < cc) {
return 1;
}
if (candidate.cc > cc) {
return -1;
}
closest_1 = candidate;
if (candidate.end <= pos) {
return 1;
}
if (candidate.start > pos) {
return -1;
}
return 0;
});
return closest_1 || null;
}
}
return null;
}
function getNextFrag(details, sn) {
if (sn === details.endSN && details.fragmentHint) {
return details.fragmentHint;
}
return details.fragments[1 + sn - details.startSN] || null;
}
var ErrorController = (function (_super) {
__extends(ErrorController, _super);
function ErrorController(hls) {
var _this = _super.call(this, 'error-controller', hls.logger) || this;
_this.playlistError = 0;
_this.hls = hls;
_this.registerListeners();
return _this;
}
ErrorController.prototype.registerListeners = function () {
var hls = this.hls;
hls.on(Events.ERROR, this.onError, this);
hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
};
ErrorController.prototype.unregisterListeners = function () {
var hls = this.hls;
if (!hls) {
return;
}
hls.off(Events.ERROR, this.onError, this);
hls.off(Events.ERROR, this.onErrorOut, this);
hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
};
ErrorController.prototype.destroy = function () {
this.unregisterListeners();
this.hls = null;
};
ErrorController.prototype.startLoad = function (startPosition) { };
ErrorController.prototype.stopLoad = function () {
this.playlistError = 0;
};
ErrorController.prototype.getVariantLevelIndex = function (frag) {
if ((frag === null || frag === void 0 ? void 0 : frag.type) === PlaylistLevelType.MAIN) {
return frag.level;
}
return this.getVariantIndex();
};
ErrorController.prototype.getVariantIndex = function () {
var _a;
var hls = this.hls;
var currentLevel = hls.currentLevel;
if (((_a = hls.loadLevelObj) === null || _a === void 0 ? void 0 : _a.details) || currentLevel === -1) {
return hls.loadLevel;
}
return currentLevel;
};
ErrorController.prototype.variantHasKey = function (level, keyInError) {
var _a;
if (level) {
if ((_a = level.details) === null || _a === void 0 ? void 0 : _a.hasKey(keyInError)) {
return true;
}
var audioGroupsIds_1 = level.audioGroups;
if (audioGroupsIds_1) {
var audioTracks = this.hls.allAudioTracks.filter(function (track) { return audioGroupsIds_1.indexOf(track.groupId) >= 0; });
return audioTracks.some(function (track) { var _a; return (_a = track.details) === null || _a === void 0 ? void 0 : _a.hasKey(keyInError); });
}
}
return false;
};
ErrorController.prototype.onManifestLoading = function () {
this.playlistError = 0;
};
ErrorController.prototype.onLevelUpdated = function () {
this.playlistError = 0;
};
ErrorController.prototype.onError = function (event, data) {
var _a, _b, _c;
if (data.fatal) {
return;
}
var hls = this.hls;
var context = data.context;
switch (data.details) {
case ErrorDetails.FRAG_LOAD_ERROR:
case ErrorDetails.FRAG_LOAD_TIMEOUT:
case ErrorDetails.KEY_LOAD_ERROR:
case ErrorDetails.KEY_LOAD_TIMEOUT:
data.errorAction = this.getFragRetryOrSwitchAction(data);
return;
case ErrorDetails.FRAG_PARSING_ERROR:
if ((_a = data.frag) === null || _a === void 0 ? void 0 : _a.gap) {
data.errorAction = createDoNothingErrorAction();
return;
}
case ErrorDetails.FRAG_GAP:
case ErrorDetails.FRAG_DECRYPT_ERROR: {
data.errorAction = this.getFragRetryOrSwitchAction(data);
data.errorAction.action = 2;
return;
}
case ErrorDetails.PLAYLIST_UNCHANGED_ERROR:
case ErrorDetails.LEVEL_EMPTY_ERROR:
case ErrorDetails.LEVEL_PARSING_ERROR:
{
var levelIndex = data.parent === PlaylistLevelType.MAIN
? data.level
: hls.loadLevel;
if (data.details === ErrorDetails.LEVEL_EMPTY_ERROR &&
!!((_c = (_b = data.context) === null || _b === void 0 ? void 0 : _b.levelDetails) === null || _c === void 0 ? void 0 : _c.live)) {
data.errorAction = this.getPlaylistRetryOrSwitchAction(data, levelIndex);
}
else {
data.levelRetry = false;
data.errorAction = this.getLevelSwitchAction(data, levelIndex);
}
}
return;
case ErrorDetails.LEVEL_LOAD_ERROR:
case ErrorDetails.LEVEL_LOAD_TIMEOUT:
if (typeof (context === null || context === void 0 ? void 0 : context.level) === 'number') {
data.errorAction = this.getPlaylistRetryOrSwitchAction(data, context.level);
}
return;
case ErrorDetails.AUDIO_TRACK_LOAD_ERROR:
case ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT:
case ErrorDetails.SUBTITLE_LOAD_ERROR:
case ErrorDetails.SUBTITLE_TRACK_LOAD_TIMEOUT:
if (context) {
var level = hls.loadLevelObj;
if (level &&
((context.type === LoaderContextType.AUDIO_TRACK &&
level.hasAudioGroup(context.groupId)) ||
(context.type === LoaderContextType.SUBTITLE_TRACK &&
level.hasSubtitleGroup(context.groupId)))) {
data.errorAction = this.getPlaylistRetryOrSwitchAction(data, hls.loadLevel);
data.errorAction.action =
2;
data.errorAction.flags =
1;
return;
}
}
return;
case ErrorDetails.KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED:
{
data.errorAction = {
action: 2,
flags: 2,
};
}
return;
case ErrorDetails.KEY_SYSTEM_SESSION_UPDATE_FAILED:
case ErrorDetails.KEY_SYSTEM_STATUS_INTERNAL_ERROR:
case ErrorDetails.KEY_SYSTEM_NO_SESSION:
{
data.errorAction = {
action: 2,
flags: 4,
};
}
return;
case ErrorDetails.BUFFER_ADD_CODEC_ERROR:
case ErrorDetails.REMUX_ALLOC_ERROR:
case ErrorDetails.BUFFER_APPEND_ERROR:
if (!data.errorAction) {
data.errorAction = this.getLevelSwitchAction(data, data.level);
}
return;
case ErrorDetails.MEDIA_SOURCE_REQUIRES_RESET:
if (!data.errorAction) {
data.errorAction = this.getLevelSwitchAction(data, data.level);
}
data.errorAction.flags |=
16 | 8;
return;
case ErrorDetails.INTERNAL_EXCEPTION:
case ErrorDetails.BUFFER_APPENDING_ERROR:
case ErrorDetails.BUFFER_APPEND_NO_PROGRESS:
case ErrorDetails.BUFFER_FULL_ERROR:
case ErrorDetails.LEVEL_SWITCH_ERROR:
case ErrorDetails.BUFFER_STALLED_ERROR:
case ErrorDetails.BUFFER_SEEK_OVER_HOLE:
case ErrorDetails.BUFFER_NUDGE_ON_STALL:
data.errorAction = createDoNothingErrorAction();
return;
}
if (data.type === ErrorTypes.KEY_SYSTEM_ERROR) {
data.levelRetry = false;
data.errorAction = createDoNothingErrorAction();
}
};
ErrorController.prototype.getPlaylistRetryOrSwitchAction = function (data, levelIndex) {
var hls = this.hls;
var retryConfig = getRetryConfig(hls.config.playlistLoadPolicy, data);
var retryCount = this.playlistError++;
var retry = shouldRetry(retryConfig, retryCount, isTimeoutError(data), data.response);
if (retry) {
return {
action: 5,
flags: 0,
retryConfig: retryConfig,
retryCount: retryCount,
};
}
var errorAction = this.getLevelSwitchAction(data, levelIndex);
if (retryConfig) {
errorAction.retryConfig = retryConfig;
errorAction.retryCount = retryCount;
}
return errorAction;
};
ErrorController.prototype.getFragRetryOrSwitchAction = function (data) {
var hls = this.hls;
var variantLevelIndex = this.getVariantLevelIndex(data.frag);
var level = hls.levels[variantLevelIndex];
var _a = hls.config, fragLoadPolicy = _a.fragLoadPolicy, keyLoadPolicy = _a.keyLoadPolicy;
var retryConfig = getRetryConfig(isKeyError(data) ? keyLoadPolicy : fragLoadPolicy, data);
var fragmentErrors = hls.levels.reduce(function (acc, level) { return acc + level.fragmentError; }, 0);
if (level) {
if (data.details !== ErrorDetails.FRAG_GAP) {
level.fragmentError++;
}
if (!isUnusableKeyError(data)) {
var retry = shouldRetry(retryConfig, fragmentErrors, isTimeoutError(data), data.response);
if (retry) {
return {
action: 5,
flags: 0,
retryConfig: retryConfig,
retryCount: fragmentErrors,
};
}
}
}
var errorAction = this.getLevelSwitchAction(data, variantLevelIndex);
if (retryConfig) {
errorAction.retryConfig = retryConfig;
errorAction.retryCount = fragmentErrors;
}
return errorAction;
};
ErrorController.prototype.getLevelSwitchAction = function (data, levelIndex) {
var _a, _b, _c, _d;
var hls = this.hls;
if (levelIndex === null || levelIndex === undefined) {
levelIndex = hls.loadLevel;
}
var level = this.hls.levels[levelIndex];
if (level) {
var errorDetails = data.details;
level.loadError++;
level.loadErrorTime = self.performance.now();
if (errorDetails === ErrorDetails.BUFFER_APPEND_ERROR) {
level.fragmentError++;
}
var nextLevel = -1;
var levels = hls.levels, loadLevel = hls.loadLevel, minAutoLevel = hls.minAutoLevel, maxAutoLevel = hls.maxAutoLevel;
if (!hls.autoLevelEnabled && !hls.config.preserveManualLevelOnError) {
hls.loadLevel = -1;
}
var fragErrorType = (_a = data.frag) === null || _a === void 0 ? void 0 : _a.type;
var isAudioCodecError = (fragErrorType === PlaylistLevelType.AUDIO &&
errorDetails === ErrorDetails.FRAG_PARSING_ERROR) ||
(data.sourceBufferName === 'audio' && isCodecRelated(data));
var findAudioCodecAlternate = isAudioCodecError &&
levels.some(function (_a) {
var audioCodec = _a.audioCodec;
return level.audioCodec !== audioCodec;
});
var isVideoCodecError = data.sourceBufferName === 'video' && isCodecRelated(data);
var findVideoCodecAlternate = isVideoCodecError &&
levels.some(function (_a) {
var codecSet = _a.codecSet, audioCodec = _a.audioCodec;
return level.codecSet !== codecSet && level.audioCodec === audioCodec;
});
var _e = (_b = data.context) !== null && _b !== void 0 ? _b : {}, playlistErrorType = _e.type, playlistErrorGroupId = _e.groupId;
var _loop_1 = function (i) {
var candidate = (i + loadLevel) % levels.length;
if (candidate !== loadLevel &&
candidate >= minAutoLevel &&
candidate <= maxAutoLevel &&
(levels[candidate].loadError === 0 ||
isPenaltyExpired(levels[candidate], hls.config.errorPenaltyExpireMs))) {
var levelCandidate_1 = levels[candidate];
if (errorDetails === ErrorDetails.FRAG_GAP &&
fragErrorType === PlaylistLevelType.MAIN &&
data.frag) {
var levelDetails = levels[candidate].details;
if (levelDetails) {
var fragCandidate = findFragmentByPTS(data.frag, levelDetails.fragments, data.frag.start);
if (fragCandidate === null || fragCandidate === void 0 ? void 0 : fragCandidate.gap) {
return "continue";
}
}
}
else if ((playlistErrorType === LoaderContextType.AUDIO_TRACK &&
levelCandidate_1.hasAudioGroup(playlistErrorGroupId)) ||
(playlistErrorType === LoaderContextType.SUBTITLE_TRACK &&
levelCandidate_1.hasSubtitleGroup(playlistErrorGroupId))) {
return "continue";
}
else if ((fragErrorType === PlaylistLevelType.AUDIO &&
((_c = level.audioGroups) === null || _c === void 0 ? void 0 : _c.some(function (groupId) {
return levelCandidate_1.hasAudioGroup(groupId);
}))) ||
(fragErrorType === PlaylistLevelType.SUBTITLE &&
((_d = level.subtitleGroups) === null || _d === void 0 ? void 0 : _d.some(function (groupId) {
return levelCandidate_1.hasSubtitleGroup(groupId);
}))) ||
(findAudioCodecAlternate &&
level.audioCodec === levelCandidate_1.audioCodec) ||
(findVideoCodecAlternate &&
level.codecSet === levelCandidate_1.codecSet) ||
(!findAudioCodecAlternate &&
level.audioCodec !== levelCandidate_1.audioCodec)) {
return "continue";
}
nextLevel = candidate;
return "break";
}
};
for (var i = levels.length; i--;) {
var state_1 = _loop_1(i);
if (state_1 === "break")
break;
}
if (nextLevel > -1 && hls.loadLevel !== nextLevel) {
data.levelRetry = true;
this.playlistError = 0;
return {
action: 2,
flags: 0,
nextAutoLevel: nextLevel,
};
}
}
return {
action: 2,
flags: 1,
};
};
ErrorController.prototype.onErrorOut = function (event, data) {
var _a, _b;
switch ((_a = data.errorAction) === null || _a === void 0 ? void 0 : _a.action) {
case 0:
break;
case 2:
this.sendAlternateToPenaltyBox(data);
if (!data.errorAction.resolved &&
data.details !== ErrorDetails.FRAG_GAP &&
data.details !== ErrorDetails.PLAYLIST_UNCHANGED_ERROR &&
!isAppendStateRelated(data)) {
data.fatal = true;
}
break;
}
var flags = ((_b = data.errorAction) === null || _b === void 0 ? void 0 : _b.flags) || 0;
if (flags & 16) {
this.hls.recoverMediaError();
}
if (data.fatal) {
this.hls.stopLoad();
return;
}
};
ErrorController.prototype.sendAlternateToPenaltyBox = function (data) {
var hls = this.hls;
var errorAction = data.errorAction;
if (!errorAction) {
return;
}
var nextAutoLevel = errorAction.nextAutoLevel;
if (errorAction.flags === 0) {
this.switchLevel(data, nextAutoLevel);
}
else if (errorAction.flags & 8) {
var levels = this.hls.levels;
var levelCountWithError = levels.length;
for (var i = levelCountWithError; i--;) {
if (levels[i].videoRange !== 'SDR') {
levels[i].fragmentError++;
levels[i].loadError++;
}
else if (nextAutoLevel === undefined) {
nextAutoLevel = i;
}
}
}
else if (errorAction.flags & 2) {
var levelIndex = this.getVariantLevelIndex(data.frag);
var level = hls.levels[levelIndex];
var restrictedHdcpLevel = level === null || level === void 0 ? void 0 : level.attrs['HDCP-LEVEL'];
errorAction.hdcpLevel = restrictedHdcpLevel;
var restrictedOutputErrorWhileNoneDeclared = restrictedHdcpLevel === 'NONE';
if (restrictedHdcpLevel && !restrictedOutputErrorWhileNoneDeclared) {
hls.maxHdcpLevel =
HdcpLevels[HdcpLevels.indexOf(restrictedHdcpLevel) - 1];
errorAction.resolved = true;
this.warn("Restricting playback to HDCP-LEVEL of \"".concat(hls.maxHdcpLevel, "\" or lower"));
}
else {
if (restrictedOutputErrorWhileNoneDeclared) {
this.warn("HDCP policy resticted output with HDCP-LEVEL=NONE");
}
errorAction.flags |= 4;
}
}
if (errorAction.flags & 4) {
var levelKey = data.decryptdata;
if (levelKey) {
var levels = this.hls.levels;
var levelCountWithError = levels.length;
for (var i = levelCountWithError; i--;) {
if (this.variantHasKey(levels[i], levelKey)) {
levels[i].fragmentError++;
levels[i].loadError++;
this.hls.removeLevel(i);
}
}
var frag = data.frag;
if (this.hls.levels.length < levelCountWithError) {
errorAction.resolved = true;
}
else if (frag && frag.type !== PlaylistLevelType.MAIN) {
var fragLevelKey = frag.decryptdata;
if (fragLevelKey && !levelKey.matches(fragLevelKey)) {
errorAction.resolved = true;
}
}
}
}
if (!errorAction.resolved) {
this.switchLevel(data, nextAutoLevel);
}
};
ErrorController.prototype.switchLevel = function (data, levelIndex) {
if (levelIndex !== undefined && data.errorAction) {
this.warn("switching to level ".concat(levelIndex, " after ").concat(data.details));
this.hls.nextAutoLevel = levelIndex;
data.errorAction.resolved = true;
this.hls.nextLoadLevel = this.hls.nextAutoLevel;
if (data.details === ErrorDetails.BUFFER_ADD_CODEC_ERROR &&
data.mimeType &&
data.sourceBufferName !== 'audiovideo') {
var codec = getCodecsForMimeType(data.mimeType);
var levels = this.hls.levels;
for (var i = levels.length; i--;) {
if (levels[i]["".concat(data.sourceBufferName, "Codec")] === codec) {
this.hls.removeLevel(i);
}
}
}
}
};
return ErrorController;
}(Logger));
function isCodecRelated(data) {
var errorDetails = data.details;
if (errorDetails === ErrorDetails.BUFFER_ADD_CODEC_ERROR ||
errorDetails === ErrorDetails.MEDIA_SOURCE_REQUIRES_RESET) {
return true;
}
if (errorDetails === ErrorDetails.BUFFER_APPEND_ERROR) {
if (!isAppendStateRelated(data)) {
return true;
}
}
return false;
}
function isAppendStateRelated(data) {
var errorDetails = data.details;
return (errorDetails === ErrorDetails.BUFFER_APPEND_ERROR &&
(data.error.name === 'QuotaExceededError' ||
data.error.name === 'InvalidStateError'));
}
function createDoNothingErrorAction(resolved) {
var errorAction = {
action: 0,
flags: 0,
};
if (resolved) {
errorAction.resolved = true;
}
return errorAction;
}
var DEFAULT_TARGET_DURATION = 10;
var LevelDetails = (function () {
function LevelDetails(baseUrl) {
this.PTSKnown = false;
this.alignedSliding = false;
this.endCC = 0;
this.endSN = 0;
this.partList = null;
this.dateRangeTagCount = 0;
this.live = true;
this.iframesOnly = false;
this.requestScheduled = -1;
this.ageHeader = 0;
this.updated = true;
this.advanced = true;
this.misses = 0;
this.startCC = 0;
this.startSN = 0;
this.startTimeOffset = null;
this.targetduration = 0;
this.totalduration = 0;
this.type = null;
this.m3u8 = '';
this.version = null;
this.canBlockReload = false;
this.canSkipUntil = 0;
this.canSkipDateRanges = false;
this.skippedSegments = 0;
this.partHoldBack = 0;
this.holdBack = 0;
this.partTarget = 0;
this.tuneInGoal = 0;
this.driftStartTime = 0;
this.driftEndTime = 0;
this.driftStart = 0;
this.driftEnd = 0;
this.playlistParsingError = null;
this.variableList = null;
this.hasVariableRefs = false;
this.fragments = [];
this.encryptedFragments = [];
this.dateRanges = {};
this.url = baseUrl;
}
LevelDetails.prototype.reloaded = function (previous) {
if (!previous) {
this.advanced = true;
this.updated = true;
return;
}
var partSnDiff = this.lastPartSn - previous.lastPartSn;
var partIndexDiff = this.lastPartIndex - previous.lastPartIndex;
this.updated =
this.endSN !== previous.endSN ||
!!partIndexDiff ||
!!partSnDiff ||
!this.live;
this.advanced =
this.endSN > previous.endSN ||
partSnDiff > 0 ||
(partSnDiff === 0 && partIndexDiff > 0);
if (this.updated || this.advanced) {
this.misses = 0;
}
else {
this.misses = previous.misses + 1;
}
};
LevelDetails.prototype.hasKey = function (levelKey) {
return this.encryptedFragments.some(function (frag) {
var decryptdata = frag.decryptdata;
if (!decryptdata) {
frag.setKeyFormat(levelKey.keyFormat);
decryptdata = frag.decryptdata;
}
return !!decryptdata && levelKey.matches(decryptdata);
});
};
Object.defineProperty(LevelDetails.prototype, "hasProgramDateTime", {
get: function () {
if (this.fragments.length) {
return Number.isFinite(this.fragments[this.fragments.length - 1].programDateTime);
}
return false;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "levelTargetDuration", {
get: function () {
return (this.averagetargetduration ||
this.targetduration ||
DEFAULT_TARGET_DURATION);
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "drift", {
get: function () {
var runTime = this.driftEndTime - this.driftStartTime;
if (runTime > 0) {
var runDuration = this.driftEnd - this.driftStart;
return (runDuration * 1000) / runTime;
}
return 1;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "edge", {
get: function () {
return this.partEnd || this.fragmentEnd;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "partEnd", {
get: function () {
var _a;
if ((_a = this.partList) === null || _a === void 0 ? void 0 : _a.length) {
return this.partList[this.partList.length - 1].end;
}
return this.fragmentEnd;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "fragmentEnd", {
get: function () {
if (this.fragments.length) {
return this.fragments[this.fragments.length - 1].end;
}
return 0;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "fragmentStart", {
get: function () {
if (this.fragments.length) {
return this.fragments[0].start;
}
return 0;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "age", {
get: function () {
if (this.advancedDateTime) {
return Math.max(Date.now() - this.advancedDateTime, 0) / 1000;
}
return 0;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "lastPartIndex", {
get: function () {
var _a;
if ((_a = this.partList) === null || _a === void 0 ? void 0 : _a.length) {
return this.partList[this.partList.length - 1].index;
}
return -1;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "maxPartIndex", {
get: function () {
var partList = this.partList;
if (partList) {
var lastIndex = this.lastPartIndex;
if (lastIndex !== -1) {
for (var i = partList.length; i--;) {
if (partList[i].index > lastIndex) {
return partList[i].index;
}
}
return lastIndex;
}
}
return 0;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "lastPartSn", {
get: function () {
var _a;
if ((_a = this.partList) === null || _a === void 0 ? void 0 : _a.length) {
return this.partList[this.partList.length - 1].fragment.sn;
}
return this.endSN;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "expired", {
get: function () {
if (this.live && this.advancedDateTime !== undefined && this.misses < 3) {
var playlistWindowDuration = this.partEnd - this.fragmentStart;
return (this.age >
Math.max(playlistWindowDuration, this.totalduration) +
this.levelTargetDuration);
}
return false;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelDetails.prototype, "partsExpired", {
get: function () {
if (this.live &&
this.partTarget &&
this.advancedDateTime !== undefined &&
this.misses < 3) {
return this.age > (this.partHoldBack || this.partTarget * 3) * 1.5;
}
return false;
},
enumerable: false,
configurable: true
});
return LevelDetails;
}());
var noopBuffered = {
length: 0,
start: function () { return 0; },
end: function () { return 0; },
};
var BufferHelper = (function () {
function BufferHelper() {
}
BufferHelper.isBuffered = function (media, position) {
if (media) {
var buffered = BufferHelper.getBuffered(media);
for (var i = buffered.length; i--;) {
if (position >= buffered.start(i) && position <= buffered.end(i)) {
return true;
}
}
}
return false;
};
BufferHelper.bufferedRanges = function (media) {
if (media) {
var timeRanges = BufferHelper.getBuffered(media);
return BufferHelper.timeRangesToArray(timeRanges);
}
return [];
};
BufferHelper.timeRangesToArray = function (timeRanges) {
var buffered = [];
for (var i = 0; i < timeRanges.length; i++) {
buffered.push({ start: timeRanges.start(i), end: timeRanges.end(i) });
}
return buffered;
};
BufferHelper.bufferInfo = function (media, pos, maxHoleDuration) {
if (media) {
var buffered = BufferHelper.bufferedRanges(media);
if (buffered.length) {
return BufferHelper.bufferedInfo(buffered, pos, maxHoleDuration);
}
}
return { len: 0, start: pos, end: pos, bufferedIndex: -1 };
};
BufferHelper.bufferedInfo = function (buffered, pos, maxHoleDuration) {
pos = Math.max(0, pos);
if (buffered.length > 1) {
buffered.sort(function (a, b) { return a.start - b.start || b.end - a.end; });
}
var bufferedIndex = -1;
var buffered2 = [];
if (maxHoleDuration) {
for (var i = 0; i < buffered.length; i++) {
if (pos >= buffered[i].start && pos <= buffered[i].end) {
bufferedIndex = i;
}
var buf2len = buffered2.length;
if (buf2len) {
var buf2end = buffered2[buf2len - 1].end;
if (buffered[i].start - buf2end < maxHoleDuration) {
if (buffered[i].end > buf2end) {
buffered2[buf2len - 1].end = buffered[i].end;
}
}
else {
buffered2.push(buffered[i]);
}
}
else {
buffered2.push(buffered[i]);
}
}
}
else {
buffered2 = buffered;
}
var bufferLen = 0;
var nextStart;
var bufferStart = pos;
var bufferEnd = pos;
for (var i = 0; i < buffered2.length; i++) {
var start = buffered2[i].start;
var end = buffered2[i].end;
if (bufferedIndex === -1 && pos >= start && pos <= end) {
bufferedIndex = i;
}
if (pos + maxHoleDuration >= start && pos < end) {
bufferStart = start;
bufferEnd = end;
bufferLen = bufferEnd - pos;
}
else if (pos + maxHoleDuration < start) {
nextStart = start;
break;
}
}
return {
len: bufferLen,
start: bufferStart || 0,
end: bufferEnd || 0,
nextStart: nextStart,
buffered: buffered,
bufferedIndex: bufferedIndex,
};
};
BufferHelper.getBuffered = function (media) {
try {
return media.buffered || noopBuffered;
}
catch (e) {
return noopBuffered;
}
};
return BufferHelper;
}());
function addEventListener(el, type, listener) {
removeEventListener(el, type, listener);
el.addEventListener(type, listener);
}
function removeEventListener(el, type, listener) {
el.removeEventListener(type, listener);
}
var VIDEO_CODEC_PROFILE_REPLACE = /(avc[1234]|hvc1|hev1|dvh[1e]|vp09|av01)(?:\.[^.,]+)+/;
var TRACK_REMOVED_ERROR_NAME = 'HlsJsTrackRemovedError';
var SOURCE_BUFFER_ERROR_NAME = 'HlsJsSourceBufferError';
var LOOP_FLUSH_SAFETY_MARGIN = 0.25;
var MIN_BUFFERED_PROGRESS = 0.001;
var HlsJsTrackRemovedError = (function (_super) {
__extends(HlsJsTrackRemovedError, _super);
function HlsJsTrackRemovedError(message) {
var _this = _super.call(this, message) || this;
_this.name = TRACK_REMOVED_ERROR_NAME;
return _this;
}
return HlsJsTrackRemovedError;
}(Error));
var BufferController = (function (_super) {
__extends(BufferController, _super);
function BufferController(hls, fragmentTracker) {
var _this = _super.call(this, 'buffer-controller', hls.logger) || this;
_this.fragmentAppendProgress = Object.create(null);
_this.appendsWithoutProgress = Object.create(null);
_this.details = null;
_this._objectUrl = null;
_this.operationQueue = null;
_this.bufferCodecEventsTotal = 0;
_this.media = null;
_this.mediaSource = null;
_this.lastMpegAudioChunk = null;
_this.lastVideoAppendEnd = 0;
_this.appendErrors = {
audio: 0,
video: 0,
audiovideo: 0,
};
_this._quotaEvictionPending = {};
_this.tracks = {};
_this.sourceBuffers = [
[null, null],
[null, null],
];
_this._onEndStreaming = function (event) {
var _a;
if (!_this.hls) {
return;
}
if (((_a = _this.mediaSource) === null || _a === void 0 ? void 0 : _a.readyState) !== 'open') {
return;
}
if (!_this.media || _this.media.seeking) {
return;
}
_this.hls.pauseBuffering();
};
_this._onStartStreaming = function (event) {
if (!_this.hls) {
return;
}
_this.hls.resumeBuffering();
};
_this._onMediaSourceOpen = function (e) {
var _a = _this, media = _a.media, mediaSource = _a.mediaSource;
if (!media || !mediaSource) {
return;
}
removeEventListener(mediaSource, 'sourceopen', _this._onMediaSourceOpen);
removeEventListener(media, 'emptied', _this._onMediaEmptied);
_this.updateDuration();
_this.hls.trigger(Events.MEDIA_ATTACHED, {
media: media,
mediaSource: mediaSource,
});
if (_this.mediaSource !== null) {
_this.checkPendingTracks();
}
};
_this._onMediaSourceClose = function () {
if (_this.media) {
if (_this.isMediaSourceReplaced()) {
var currentSrc = _this.media.currentSrc;
var newSrc = currentSrc && currentSrc !== _this._objectUrl
? currentSrc
: _this.mediaSrc;
_this.warn("MediaSource closed after media element switched to another source (".concat(_this._objectUrl, " > ").concat(newSrc, ") - detaching media"));
_this.hls.detachMedia();
return;
}
var mediaError = _this.media.error;
var _a = _this, appendError = _a.appendError, appendErrors = _a.appendErrors;
var fatal = false;
if (!appendError && mediaError) {
var appendErrorCount = Math.max(++appendErrors.audio, ++appendErrors.video, ++appendErrors.audiovideo);
fatal = appendErrorCount >= _this.hls.config.appendErrorMaxRetry;
}
var error = new Error("MediaSource closed while media attached".concat(mediaErrorRecoveryMessage(fatal, mediaError)));
_this.warn(error);
_this.hls.trigger(Events.ERROR, __bolli.assign({ fatal: fatal }, appendError, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.MEDIA_SOURCE_REQUIRES_RESET,
error: error,
}));
}
};
_this._onMediaSourceEnded = function () {
};
_this._onMediaEmptied = function () {
var _a = _this, mediaSrc = _a.mediaSrc, _objectUrl = _a._objectUrl;
if (mediaSrc !== _objectUrl) {
_this.error("Media element src was set while attaching MediaSource (".concat(_objectUrl, " > ").concat(mediaSrc, ")"));
}
};
_this._onMediaError = function () {
_this.media;
};
_this.hls = hls;
_this.fragmentTracker = fragmentTracker;
_this.appendSource = isManagedMediaSource(getMediaSource(hls.config.preferManagedMediaSource));
_this.initTracks();
_this.registerListeners();
return _this;
}
BufferController.prototype.hasSourceTypes = function () {
return Object.keys(this.tracks).length > 0;
};
BufferController.prototype.destroy = function () {
this.unregisterListeners();
this.details = null;
this.lastMpegAudioChunk = null;
this.transferData = this.overrides = undefined;
if (this.operationQueue) {
this.operationQueue.destroy();
this.operationQueue = null;
}
this.hls = this.fragmentTracker = null;
this._onMediaSourceOpen = this._onMediaSourceClose = null;
this._onMediaSourceEnded = null;
this._onStartStreaming = this._onEndStreaming = null;
this._onMediaEmptied = this._onMediaError = null;
};
BufferController.prototype.registerListeners = function () {
var hls = this.hls;
hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
hls.on(Events.BUFFER_RESET, this.onBufferReset, this);
hls.on(Events.BUFFER_APPENDING, this.onBufferAppending, this);
hls.on(Events.BUFFER_CODECS, this.onBufferCodecs, this);
hls.on(Events.BUFFER_EOS, this.onBufferEos, this);
hls.on(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
hls.on(Events.FRAG_PARSED, this.onFragParsed, this);
hls.on(Events.FRAG_CHANGED, this.onFragChanged, this);
hls.on(Events.ERROR, this.onError, this);
};
BufferController.prototype.unregisterListeners = function () {
var hls = this.hls;
hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
hls.off(Events.BUFFER_RESET, this.onBufferReset, this);
hls.off(Events.BUFFER_APPENDING, this.onBufferAppending, this);
hls.off(Events.BUFFER_CODECS, this.onBufferCodecs, this);
hls.off(Events.BUFFER_EOS, this.onBufferEos, this);
hls.off(Events.BUFFER_FLUSHING, this.onBufferFlushing, this);
hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
hls.off(Events.FRAG_PARSED, this.onFragParsed, this);
hls.off(Events.FRAG_CHANGED, this.onFragChanged, this);
hls.off(Events.ERROR, this.onError, this);
};
BufferController.prototype.transferMedia = function () {
var _this = this;
var _a = this, media = _a.media, mediaSource = _a.mediaSource;
if (!media) {
return null;
}
var tracks = {};
if (this.operationQueue) {
var updating = this.isUpdating();
if (!updating) {
this.operationQueue.removeBlockers();
}
var queued = this.isQueued();
if (updating || queued) {
this.warn("Transfering MediaSource with".concat(queued ? ' operations in queue' : '').concat(updating ? ' updating SourceBuffer(s)' : '', " ").concat(this.operationQueue));
}
this.operationQueue.destroy();
}
var transferData = this.transferData;
if (transferData &&
!this.sourceBufferCount &&
transferData.mediaSource === mediaSource) {
__bolli.assign(tracks, transferData.tracks);
}
else {
this.sourceBuffers.forEach(function (tuple) {
var type = tuple[0];
if (type) {
tracks[type] = __bolli.assign({}, _this.tracks[type]);
_this.removeBuffer(type);
}
tuple[0] = tuple[1] = null;
});
}
return {
media: media,
mediaSource: mediaSource,
tracks: tracks,
};
};
BufferController.prototype.initTracks = function () {
var tracks = {};
this.resetAppendProgress();
this.sourceBuffers = [
[null, null],
[null, null],
];
this.tracks = tracks;
this.resetQueue();
this.lastMpegAudioChunk = null;
this.lastVideoAppendEnd = 0;
};
BufferController.prototype.onManifestLoading = function () {
this.bufferCodecEventsTotal = 0;
this.details = null;
this.resetAppendErrors();
this.resetAppendProgress();
};
BufferController.prototype.onManifestParsed = function (event, data) {
var _a;
var codecEvents = 2;
if ((data.audio && !data.video) || !data.altAudio) {
codecEvents = 1;
}
this.bufferCodecEventsTotal = codecEvents;
if (((_a = this.transferData) === null || _a === void 0 ? void 0 : _a.mediaSource) &&
this.sourceBufferCount &&
codecEvents) {
this.bufferCreated();
}
};
BufferController.prototype.onMediaAttaching = function (event, data) {
var _this = this;
var _a;
var media = (this.media = data.media);
this.transferData = this.overrides = undefined;
var MediaSource = getMediaSource(this.appendSource);
if (MediaSource) {
var transferringMedia = !!data.mediaSource;
if (transferringMedia || data.overrides) {
this.transferData = data;
this.overrides = data.overrides;
}
var ms_1 = (this.mediaSource = data.mediaSource || new MediaSource());
this.assignMediaSource(ms_1);
if (transferringMedia) {
this._objectUrl = media.src;
this.attachTransferred();
}
else {
var objectUrl_1 = (this._objectUrl = self.URL.createObjectURL(ms_1));
var config = this.hls.config;
var cleanupPromise = config.emeEnabled && media.mediaKeys
? (_a = config.emeController) === null || _a === void 0 ? void 0 : _a.CDMCleanupPromise
: null;
if (cleanupPromise) {
cleanupPromise
.then(function () {
if (!_this.hls) {
return;
}
_this.setSource(media, ms_1, objectUrl_1);
})
.catch(function () {
});
}
else {
this.setSource(media, ms_1, objectUrl_1);
}
}
addEventListener(media, 'emptied', this._onMediaEmptied);
addEventListener(media, 'error', this._onMediaError);
if (this.appendSource) {
addEventListener(media, 'seeking', this._onStartStreaming);
}
}
};
BufferController.prototype.setSource = function (media, ms, objectUrl) {
if (this.appendSource) {
try {
media.removeAttribute('src');
var MMS = self.ManagedMediaSource;
media.disableRemotePlayback =
media.disableRemotePlayback || (MMS && ms instanceof MMS);
removeSourceChildren(media);
addSource(media, objectUrl);
media.load();
}
catch (error) {
media.src = objectUrl;
}
}
else {
media.src = objectUrl;
}
};
BufferController.prototype.assignMediaSource = function (ms) {
addEventListener(ms, 'sourceopen', this._onMediaSourceOpen);
addEventListener(ms, 'sourceended', this._onMediaSourceEnded);
addEventListener(ms, 'sourceclose', this._onMediaSourceClose);
if (this.appendSource) {
addEventListener(ms, 'startstreaming', this._onStartStreaming);
addEventListener(ms, 'endstreaming', this._onEndStreaming);
}
};
BufferController.prototype.attachTransferred = function () {
var _this = this;
var media = this.media;
var data = this.transferData;
if (!data || !media) {
return;
}
var requiredTracks = this.tracks;
var transferredTracks = data.tracks;
var trackNames = transferredTracks
? Object.keys(transferredTracks)
: null;
var trackCount = trackNames ? trackNames.length : 0;
var mediaSourceOpenCallback = function () {
Promise.resolve().then(function () {
if (_this.media && _this.mediaSourceOpenOrEnded) {
_this._onMediaSourceOpen();
}
});
};
if (transferredTracks && trackNames && trackCount) {
if (!this.tracksReady) {
this.hls.config.startFragPrefetch = true;
return;
}
if (!isCompatibleTrackChange(transferredTracks, requiredTracks)) {
data.mediaSource = null;
data.tracks = undefined;
var currentTime = media.currentTime;
var details = this.details;
var startTime = Math.max(currentTime, (details === null || details === void 0 ? void 0 : details.fragments[0].start) || 0);
if (startTime - currentTime > 1) {
return;
}
this.warn("attachTransferred: resetting MediaSource for incompatible tracks (\"".concat(Object.keys(transferredTracks), "\"->\"").concat(Object.keys(requiredTracks), "\") start time: ").concat(startTime, " currentTime: ").concat(currentTime));
this.onMediaDetaching(Events.MEDIA_DETACHING, {});
this.onMediaAttaching(Events.MEDIA_ATTACHING, data);
media.currentTime = startTime;
return;
}
this.transferData = undefined;
trackNames.forEach(function (trackName) {
var type = trackName;
var track = transferredTracks[type];
if (track) {
var sb = track.buffer;
if (sb) {
var fragmentTracker = _this.fragmentTracker;
var playlistType = track.id;
if (fragmentTracker.hasFragments(playlistType) ||
fragmentTracker.hasParts(playlistType)) {
var bufferedTimeRanges = BufferHelper.getBuffered(sb);
fragmentTracker.detectEvictedFragments(type, bufferedTimeRanges, playlistType, null, null, true);
}
var sbIndex = sourceBufferNameToIndex(type);
var sbTuple = [type, sb];
_this.sourceBuffers[sbIndex] = sbTuple;
if (sb.updating && _this.operationQueue) {
_this.operationQueue.prependBlocker(type);
}
_this.trackSourceBuffer(type, track);
}
}
});
mediaSourceOpenCallback();
this.bufferCreated();
}
else {
mediaSourceOpenCallback();
}
};
Object.defineProperty(BufferController.prototype, "mediaSourceOpenOrEnded", {
get: function () {
var _a;
var readyState = (_a = this.mediaSource) === null || _a === void 0 ? void 0 : _a.readyState;
return readyState === 'open' || readyState === 'ended';
},
enumerable: false,
configurable: true
});
BufferController.prototype.onMediaDetaching = function (event, data) {
var _this = this;
var transferringMedia = !!data.transferMedia;
this.transferData = this.overrides = undefined;
var _a = this, media = _a.media, mediaSource = _a.mediaSource, _objectUrl = _a._objectUrl;
if (mediaSource) {
if (transferringMedia) {
this.sourceBuffers.forEach(function (_a) {
var type = _a[0];
if (type) {
_this.removeBuffer(type);
}
});
this.resetQueue();
}
else {
if (this.mediaSourceOpenOrEnded) {
var open_1 = mediaSource.readyState === 'open';
try {
var sourceBuffers = mediaSource.sourceBuffers;
for (var i = sourceBuffers.length; i--;) {
if (open_1) {
sourceBuffers[i].abort();
}
mediaSource.removeSourceBuffer(sourceBuffers[i]);
}
if (open_1) {
mediaSource.endOfStream();
}
}
catch (err) {
this.warn("onMediaDetaching: ".concat(err.message, " while calling endOfStream"));
}
}
if (this.sourceBufferCount) {
this.onBufferReset();
}
}
removeEventListener(mediaSource, 'sourceopen', this._onMediaSourceOpen);
removeEventListener(mediaSource, 'sourceended', this._onMediaSourceEnded);
removeEventListener(mediaSource, 'sourceclose', this._onMediaSourceClose);
if (this.appendSource) {
removeEventListener(mediaSource, 'startstreaming', this._onStartStreaming);
removeEventListener(mediaSource, 'endstreaming', this._onEndStreaming);
}
this.mediaSource = null;
this._objectUrl = null;
}
if (media) {
removeEventListener(media, 'emptied', this._onMediaEmptied);
removeEventListener(media, 'error', this._onMediaError);
removeEventListener(media, 'seeking', this._onStartStreaming);
if (!transferringMedia) {
if (_objectUrl) {
self.URL.revokeObjectURL(_objectUrl);
}
if (this.mediaSrc === _objectUrl &&
!this.isMediaSourceReplaced(_objectUrl)) {
media.removeAttribute('src');
if (this.appendSource) {
removeSourceChildren(media);
}
media.load();
}
else {
this.warn('media|source.src was changed by a third party - skip cleanup');
}
}
this.media = null;
}
};
BufferController.prototype.onBufferReset = function () {
var _this = this;
this.sourceBuffers.forEach(function (_a) {
var type = _a[0];
if (type) {
_this.resetBuffer(type);
}
});
this.initTracks();
};
BufferController.prototype.resetBuffer = function (type) {
var _a, _b;
var sb = (_a = this.tracks[type]) === null || _a === void 0 ? void 0 : _a.buffer;
this.removeBuffer(type);
if (sb) {
try {
if ((_b = this.mediaSource) === null || _b === void 0 ? void 0 : _b.sourceBuffers.length) {
this.mediaSource.removeSourceBuffer(sb);
}
}
catch (err) {
this.warn("onBufferReset ".concat(type), err);
}
}
delete this.tracks[type];
};
BufferController.prototype.removeBuffer = function (type) {
this.removeBufferListeners(type);
this.sourceBuffers[sourceBufferNameToIndex(type)] = [null, null];
var track = this.tracks[type];
if (track) {
this.clearBufferAppendTimeoutId(track);
track.buffer = undefined;
}
};
BufferController.prototype.resetQueue = function () {
if (this.operationQueue) {
this.operationQueue.destroy();
}
this.operationQueue = new BufferOperationQueue(this.tracks);
};
BufferController.prototype.onBufferCodecs = function (event, data) {
var _this = this;
var _a;
var tracks = this.tracks;
var trackNames = Object.keys(data);
var unmuxedToMuxed = ('audiovideo' in data && (tracks.audio || tracks.video)) ||
(tracks.audiovideo && ('audio' in data || 'video' in data));
var muxedToUnmuxed = !unmuxedToMuxed &&
this.sourceBufferCount &&
this.media &&
trackNames.some(function (sbName) { return !tracks[sbName]; });
if (unmuxedToMuxed || muxedToUnmuxed) {
this.warn("Unsupported transition between \"".concat(Object.keys(tracks), "\" and \"").concat(trackNames, "\" SourceBuffers"));
return;
}
trackNames.forEach(function (trackName) {
var _a, _b;
var parsedTrack = data[trackName];
var id = parsedTrack.id, codec = parsedTrack.codec, levelCodec = parsedTrack.levelCodec, container = parsedTrack.container, metadata = parsedTrack.metadata, supplemental = parsedTrack.supplemental;
var track = tracks[trackName];
var transferredTrack = (_b = (_a = _this.transferData) === null || _a === void 0 ? void 0 : _a.tracks) === null || _b === void 0 ? void 0 : _b[trackName];
var sbTrack = (transferredTrack === null || transferredTrack === void 0 ? void 0 : transferredTrack.buffer) ? transferredTrack : track;
var sbCodec = (sbTrack === null || sbTrack === void 0 ? void 0 : sbTrack.pendingCodec) || (sbTrack === null || sbTrack === void 0 ? void 0 : sbTrack.codec);
var trackLevelCodec = sbTrack === null || sbTrack === void 0 ? void 0 : sbTrack.levelCodec;
if (!track) {
track = tracks[trackName] = {
buffer: undefined,
listeners: [],
codec: codec,
supplemental: supplemental,
container: container,
levelCodec: levelCodec,
metadata: metadata,
id: id,
};
}
var currentCodecFull = pickMostCompleteCodecName(sbCodec, trackLevelCodec);
var currentCodec = currentCodecFull === null || currentCodecFull === void 0 ? void 0 : currentCodecFull.replace(VIDEO_CODEC_PROFILE_REPLACE, '$1');
var trackCodec = pickMostCompleteCodecName(codec, levelCodec);
var nextCodec = trackCodec === null || trackCodec === void 0 ? void 0 : trackCodec.replace(VIDEO_CODEC_PROFILE_REPLACE, '$1');
if (trackCodec && currentCodecFull && currentCodec !== nextCodec) {
if (trackName.slice(0, 5) === 'audio') {
trackCodec = getCodecCompatibleName(trackCodec, _this.appendSource);
}
if (trackCodec !== (track.pendingCodec || track.codec)) {
track.pendingCodec = trackCodec;
}
track.container = container;
_this.appendChangeType(trackName, container, trackCodec);
}
});
if (this.tracksReady || this.sourceBufferCount) {
data.tracks = this.sourceBufferTracks;
}
if (this.sourceBufferCount) {
return;
}
if (this.bufferCodecEventsTotal > 1 &&
!this.tracks.video &&
!data.video &&
((_a = data.audio) === null || _a === void 0 ? void 0 : _a.id) === 'main') {
this.bufferCodecEventsTotal = 1;
}
if (this.mediaSourceOpenOrEnded) {
this.checkPendingTracks();
}
};
Object.defineProperty(BufferController.prototype, "sourceBufferTracks", {
get: function () {
var _this = this;
return Object.keys(this.tracks).reduce(function (baseTracks, type) {
var track = _this.tracks[type];
baseTracks[type] = {
id: track.id,
container: track.container,
codec: track.codec,
levelCodec: track.levelCodec,
};
return baseTracks;
}, {});
},
enumerable: false,
configurable: true
});
BufferController.prototype.appendChangeType = function (type, container, codec) {
var _this = this;
var mimeType = "".concat(container, ";codecs=").concat(codec);
var operation = {
label: "change-type=".concat(mimeType),
execute: function () {
var track = _this.tracks[type];
if (track) {
var sb = track.buffer;
if (sb === null || sb === void 0 ? void 0 : sb.changeType) {
sb.changeType(mimeType);
track.codec = codec;
track.container = container;
}
}
_this.shiftAndExecuteNext(type);
},
onStart: function () { },
onComplete: function () { },
onError: function (error) {
_this.warn("Failed to change ".concat(type, " SourceBuffer type"), error);
},
};
this.append(operation, type, this.isPending(this.tracks[type]));
};
BufferController.prototype.blockAudio = function (partOrFrag) {
var _this = this;
var _a;
var pStart = partOrFrag.start;
var pTime = pStart + partOrFrag.duration * 0.05;
var atGap = ((_a = this.fragmentTracker.getAppendedFrag(pStart, PlaylistLevelType.MAIN)) === null || _a === void 0 ? void 0 : _a.gap) === true;
if (atGap) {
return;
}
var op = {
label: 'block-audio',
execute: function () {
var _a, _b;
var videoEnd = _this.lastVideoAppendEnd;
if (videoEnd > pTime ||
BufferHelper.isBuffered((_a = _this.tracks.video) === null || _a === void 0 ? void 0 : _a.buffer, pTime) ||
((_b = _this.fragmentTracker.getAppendedFrag(pTime, PlaylistLevelType.MAIN)) === null || _b === void 0 ? void 0 : _b.gap) === true) {
_this.unblockAudio();
}
},
onStart: function () { },
onComplete: function () { },
onError: function (error) {
_this.warn('Error executing block-audio operation', error);
},
};
this.append(op, 'audio', true);
};
BufferController.prototype.unblockAudio = function () {
if (this.operationQueue) {
this.operationQueue.unblockAudio();
}
};
BufferController.prototype.onBufferAppending = function (event, eventData) {
var _this = this;
var tracks = this.tracks;
var data = eventData.data, type = eventData.type, parent = eventData.parent, frag = eventData.frag, part = eventData.part, chunkMeta = eventData.chunkMeta, offset = eventData.offset;
var chunkStats = chunkMeta.buffering[type];
var trackProgress = isMediaFragment(frag) &&
!part &&
!frag.gap &&
!chunkMeta.partial &&
!chunkMeta.iframe;
var bufferedBefore = null;
var fullyBufferedBefore = false;
var sn = frag.sn, cc = frag.cc;
var bufferAppendingStart = self.performance.now();
chunkStats.start = bufferAppendingStart;
var fragBuffering = frag.stats.buffering;
var partBuffering = part ? part.stats.buffering : null;
if (fragBuffering.start === 0) {
fragBuffering.start = bufferAppendingStart;
}
if ((partBuffering === null || partBuffering === void 0 ? void 0 : partBuffering.start) === 0) {
partBuffering.start = bufferAppendingStart;
}
var audioTrack = tracks.audio;
var checkTimestampOffset = false;
if (type === 'audio' && (audioTrack === null || audioTrack === void 0 ? void 0 : audioTrack.container) === 'audio/mpeg') {
checkTimestampOffset =
!this.lastMpegAudioChunk ||
chunkMeta.id === 1 ||
this.lastMpegAudioChunk.sn !== chunkMeta.sn;
this.lastMpegAudioChunk = chunkMeta;
}
var videoTrack = tracks.video;
var videoSb = videoTrack === null || videoTrack === void 0 ? void 0 : videoTrack.buffer;
if (videoSb && sn !== 'initSegment' && offset !== undefined) {
var audioSb = audioTrack === null || audioTrack === void 0 ? void 0 : audioTrack.buffer;
var partOrFrag = part || frag;
if (type === 'audio' &&
parent !== 'main' &&
!(videoTrack.ending || videoTrack.ended) &&
audioSb &&
BufferHelper.getBuffered(audioSb).length) {
var pStart = partOrFrag.start;
var pTime = pStart + partOrFrag.duration * 0.05;
var vbuffered = BufferHelper.getBuffered(videoSb);
var vappending = this.currentOp('video');
if (!vbuffered.length && !vappending) {
this.blockAudio(partOrFrag);
}
else if (!BufferHelper.isBuffered(videoSb, pTime) &&
this.lastVideoAppendEnd < pTime) {
this.blockAudio(partOrFrag);
}
}
else if (type === 'video') {
var videoAppendEnd = partOrFrag.end;
var diff = this.lastVideoAppendEnd - videoAppendEnd;
this.lastVideoAppendEnd = videoAppendEnd;
if (diff < 0 || diff > partOrFrag.duration) {
this.unblockAudio();
}
else if (this.isAudioBlocked()) {
this.executeNext('audio');
}
}
}
var fragStart = (part || frag).start;
var operation = {
label: "append-".concat(type),
execute: function () {
var _a;
chunkStats.executeStart = self.performance.now();
var sb = (_a = _this.tracks[type]) === null || _a === void 0 ? void 0 : _a.buffer;
if (sb) {
if (trackProgress) {
bufferedBefore = BufferHelper.timeRangesToArray(BufferHelper.getBuffered(sb));
fullyBufferedBefore = isFragmentFullyBuffered(fragmentBufferedCoverage(bufferedBefore, frag), frag);
}
if (checkTimestampOffset) {
_this.updateTimestampOffset(sb, fragStart, 0.1, type, sn, cc);
}
else if (offset !== undefined && Number.isFinite(offset)) {
_this.updateTimestampOffset(sb, offset, 0.000001, type, sn, cc);
}
}
_this.appendExecutor(data, type);
},
onStart: function () {
},
onComplete: function () {
_this.clearBufferAppendTimeoutId(_this.tracks[type]);
var end = self.performance.now();
chunkStats.executeEnd = chunkStats.end = end;
if (fragBuffering.first === 0) {
fragBuffering.first = end;
}
if ((partBuffering === null || partBuffering === void 0 ? void 0 : partBuffering.first) === 0) {
partBuffering.first = end;
}
var timeRanges = {};
_this.sourceBuffers.forEach(function (_a) {
var type = _a[0], sb = _a[1];
if (type) {
timeRanges[type] = BufferHelper.getBuffered(sb);
}
});
if (trackProgress) {
var progress = _this.getFragmentAppendProgress(frag);
var buffered = timeRanges[type];
if (buffered && bufferedBefore) {
var bufferedAfter = BufferHelper.timeRangesToArray(buffered);
var coverageAfter = fragmentBufferedCoverage(bufferedAfter, frag);
progress.progressed || (progress.progressed = coverageAfter - fragmentBufferedCoverage(bufferedBefore, frag) >
MIN_BUFFERED_PROGRESS);
var fullyBuffered = fullyBufferedBefore &&
isFragmentFullyBuffered(coverageAfter, frag);
progress.fullyBuffered[type] =
progress.fullyBuffered[type] === undefined
? fullyBuffered
: progress.fullyBuffered[type] && fullyBuffered;
}
}
_this.hls.trigger(Events.BUFFER_APPENDED, {
type: type,
frag: frag,
part: part,
chunkMeta: chunkMeta,
parent: parent,
timeRanges: timeRanges,
});
},
onError: function (error) {
var _a, _b;
_this.clearBufferAppendTimeoutId(_this.tracks[type]);
var isQuotaError = error.code === DOMException.QUOTA_EXCEEDED_ERR ||
error.name == 'QuotaExceededError' ||
"quota" in error;
if (isQuotaError) {
if (!_this._quotaEvictionPending[type]) {
var evictEnd = _this.getBackBufferEvictionTarget(type, data.byteLength, frag.type);
if (evictEnd > 0) {
_this._quotaEvictionPending[type] = true;
var removeOp = _this.getFlushOp(type, 0, evictEnd);
var clearOp = _this.getClearEvictionPendingOp(type);
_this.insertNext([removeOp, operation, clearOp], type);
return;
}
_this.warn("QuotaExceededError on \"".concat(type, "\" sn: ").concat(sn, " - no back buffer available to evict"));
}
}
if (trackProgress) {
_this.getFragmentAppendProgress(frag).errored = true;
}
var event = {
type: ErrorTypes.MEDIA_ERROR,
parent: parent,
details: ErrorDetails.BUFFER_APPEND_ERROR,
sourceBufferName: type,
frag: frag,
part: part,
chunkMeta: chunkMeta,
error: error,
err: error,
fatal: false,
};
var mediaError = (_a = _this.media) === null || _a === void 0 ? void 0 : _a.error;
if (error.name === TRACK_REMOVED_ERROR_NAME &&
_this.sourceBufferCount === 0 &&
(!_this.media || _this.pendingTrackCount === 0)) {
event.errorAction = createDoNothingErrorAction(true);
}
else {
if (isQuotaError) {
event.details = ErrorDetails.BUFFER_FULL_ERROR;
}
var appendErrorCount = ++_this.appendErrors[type];
var appendErrorMaxRetry = _this.hls.config.appendErrorMaxRetry;
_this.warn("Failed ".concat(appendErrorCount, "/").concat(appendErrorMaxRetry + 1, " times to append segment in \"").concat(type, "\" sourceBuffer with error: ").concat(error.message));
if (appendErrorCount >= appendErrorMaxRetry) {
event.fatal = !isQuotaError;
}
var readyState = (_b = _this.mediaSource) === null || _b === void 0 ? void 0 : _b.readyState;
if ((readyState === 'ended' ||
readyState === 'closed' ||
!!mediaError) &&
!_this.isMediaSourceReplaced()) {
_this.warn("MediaSource readyState \"".concat(readyState, "\" during SourceBuffer").concat(mediaErrorRecoveryMessage(event.fatal, mediaError)));
event.details = ErrorDetails.MEDIA_SOURCE_REQUIRES_RESET;
}
}
_this.appendError = event;
_this.hls.trigger(Events.ERROR, event);
if (isQuotaError && _this.hls) {
_this.trimBuffers(frag.start, 1);
}
},
};
this.append(operation, type, this.isPending(this.tracks[type]));
};
BufferController.prototype.getClearEvictionPendingOp = function (type) {
var _this = this;
return {
label: 'clear',
execute: function () {
_this._quotaEvictionPending[type] = false;
_this.shiftAndExecuteNext(type);
},
onStart: function () { },
onComplete: function () { },
onError: function () { },
};
};
BufferController.prototype.getFlushOp = function (type, start, end) {
var _this = this;
return {
label: 'remove',
execute: function () {
_this.removeExecutor(type, start, end);
},
onStart: function () {
},
onComplete: function () {
var _a;
(_a = _this.tracks[type]) === null || _a === void 0 ? void 0 : _a.buffer;
_this.hls.trigger(Events.BUFFER_FLUSHED, { type: type, start: start, end: end });
},
onError: function (error) {
_this.warn("Failed to remove ".concat(start, "-").concat(end, " from \"").concat(type, "\" SourceBuffer"), error);
_this.hls.trigger(Events.BUFFER_FLUSHED, {
type: type,
start: 0,
end: 0,
error: error,
});
},
};
};
BufferController.prototype.onBufferFlushing = function (event, data) {
var _this = this;
var type = data.type, startOffset = data.startOffset, endOffset = data.endOffset;
if (!type || type === 'audio') {
this.unblockAudio();
}
if (type) {
this.append(this.getFlushOp(type, startOffset, endOffset), type);
}
else {
this.sourceBuffers.forEach(function (_a) {
var type = _a[0];
if (type) {
_this.append(_this.getFlushOp(type, startOffset, endOffset), type);
}
});
}
};
BufferController.prototype.onFragParsed = function (event, data) {
var _this = this;
var frag = data.frag, part = data.part, chunkMeta = data.chunkMeta;
var buffersAppendedTo = [];
var elementaryStreams = part
? part.elementaryStreams
: frag.elementaryStreams;
if (elementaryStreams["audiovideo"]) {
buffersAppendedTo.push('audiovideo');
}
else {
if (elementaryStreams["audio"]) {
buffersAppendedTo.push('audio');
}
if (elementaryStreams["video"]) {
buffersAppendedTo.push('video');
}
}
var onUnblocked = function () {
var now = self.performance.now();
frag.stats.buffering.end = now;
if (part) {
part.stats.buffering.end = now;
}
var stats = part ? part.stats : frag.stats;
_this.checkAppendProgress(frag, part, chunkMeta, buffersAppendedTo);
if (!_this.hls) {
return;
}
_this.hls.trigger(Events.FRAG_BUFFERED, {
frag: frag,
part: part,
stats: stats,
id: frag.type,
chunkMeta: chunkMeta,
});
if (!part && frag.gap && stats.retry) ;
};
if (buffersAppendedTo.length === 0) ;
this.blockBuffers(onUnblocked, buffersAppendedTo).catch(function (error) {
_this.warn("Fragment buffered callback ".concat(error.message));
_this.stepOperationQueue(_this.sourceBufferTypes);
});
};
BufferController.prototype.onFragChanged = function (event, data) {
var _this = this;
var _a, _b;
var config = (_a = this.hls) === null || _a === void 0 ? void 0 : _a.config;
if (!config) {
return;
}
var backBufferLength = config.backBufferLength, frontBufferFlushThreshold = config.frontBufferFlushThreshold;
this.trimBuffers(frontBufferFlushThreshold, backBufferLength, data.frag, data.previousFrag);
var elementaryStreams = data.frag.elementaryStreams;
var appendErrors = this.appendErrors;
var appendErrorType = (_b = this.appendError) === null || _b === void 0 ? void 0 : _b.sourceBufferName;
Object.keys(elementaryStreams).forEach(function (type) {
if (!elementaryStreams[type]) {
return;
}
appendErrors[type] = 0;
if (type === appendErrorType) {
_this.appendError = undefined;
}
if (type === 'audio' || type === 'video') {
appendErrors.audiovideo = 0;
if (appendErrorType === 'audiovideo') {
_this.appendError = undefined;
}
}
else {
appendErrors.audio = 0;
appendErrors.video = 0;
if (appendErrorType !== 'audiovideo') {
_this.appendError = undefined;
}
}
});
};
Object.defineProperty(BufferController.prototype, "bufferedToEnd", {
get: function () {
var _this = this;
return (this.sourceBufferCount > 0 &&
!this.sourceBuffers.some(function (_a) {
var type = _a[0];
if (type) {
var track = _this.tracks[type];
if (track) {
return !track.ended || track.ending;
}
}
return false;
}));
},
enumerable: false,
configurable: true
});
BufferController.prototype.onBufferEos = function (event, data) {
var _this = this;
var _a;
this.sourceBuffers.forEach(function (_a) {
var type = _a[0];
if (type) {
var track = _this.tracks[type];
if (!data.type || data.type === type) {
track.ending = true;
if (!track.ended) {
track.ended = true;
}
}
}
});
var allowEndOfStream = ((_a = this.overrides) === null || _a === void 0 ? void 0 : _a.endOfStream) !== false;
if (this.allTracksEnding) {
this.unblockAudio();
if (allowEndOfStream) {
this.blockUntilOpen(function () {
_this.tracksEnded();
if (!_this.allTracksEnding) {
return;
}
var mediaSource = _this.mediaSource;
if ((mediaSource === null || mediaSource === void 0 ? void 0 : mediaSource.readyState) !== 'open') {
return;
}
mediaSource.endOfStream();
_this.hls.trigger(Events.BUFFERED_TO_END, undefined);
});
}
else {
this.tracksEnded();
this.hls.trigger(Events.BUFFERED_TO_END, undefined);
}
}
else if (data.type === 'video') {
this.unblockAudio();
}
};
Object.defineProperty(BufferController.prototype, "allTracksEnding", {
get: function () {
var _this = this;
return (this.sourceBufferCount > 0 &&
!this.sourceBuffers.some(function (_a) {
var _b;
var type = _a[0];
return type && !((_b = _this.tracks[type]) === null || _b === void 0 ? void 0 : _b.ended);
}));
},
enumerable: false,
configurable: true
});
BufferController.prototype.tracksEnded = function () {
var _this = this;
this.sourceBuffers.forEach(function (_a) {
var type = _a[0];
if (type !== null) {
var track = _this.tracks[type];
if (track) {
track.ending = false;
}
}
});
};
BufferController.prototype.onLevelUpdated = function (event, _a) {
var details = _a.details;
if (!details.fragments.length) {
return;
}
this.details = details;
this.updateDuration();
};
BufferController.prototype.updateDuration = function () {
var _this = this;
this.blockUntilOpen(function () {
var durationAndRange = _this.getDurationAndRange();
if (!durationAndRange) {
return;
}
_this.updateMediaSource(durationAndRange);
});
};
BufferController.prototype.onError = function (event, data) {
var _a;
if (data.details === ErrorDetails.BUFFER_APPEND_ERROR && data.frag) {
var nextAutoLevel = (_a = data.errorAction) === null || _a === void 0 ? void 0 : _a.nextAutoLevel;
if (Number.isFinite(nextAutoLevel) && nextAutoLevel !== data.frag.level) {
this.resetAppendErrors();
}
}
};
BufferController.prototype.getBackBufferEvictionTarget = function (type, segmentBytes, playlistType) {
var media = this.media;
if (!media) {
return 0;
}
return this.fragmentTracker.getBackBufferEvictionEnd(media.currentTime, playlistType, segmentBytes);
};
BufferController.prototype.getFragmentAppendProgress = function (frag) {
var key = appendProgressKey(frag);
var progress = this.fragmentAppendProgress[key];
if ((progress === null || progress === void 0 ? void 0 : progress.stats) !== frag.stats) {
progress = {
stats: frag.stats,
progressed: false,
errored: false,
fullyBuffered: Object.create(null),
};
this.fragmentAppendProgress[key] = progress;
}
return progress;
};
BufferController.prototype.checkAppendProgress = function (frag, part, chunkMeta, buffersAppendedTo) {
if (part ||
!isMediaFragment(frag) ||
frag.gap ||
chunkMeta.iframe ||
chunkMeta.partial) {
return;
}
var key = appendProgressKey(frag);
var progress = this.fragmentAppendProgress[key];
delete this.fragmentAppendProgress[key];
var fragBuffering = frag.stats.buffering;
if (fragBuffering.start && !fragBuffering.first) {
return;
}
var cycle = (progress === null || progress === void 0 ? void 0 : progress.stats) === frag.stats ? progress : undefined;
if (cycle === null || cycle === void 0 ? void 0 : cycle.errored) {
return;
}
var fullyBuffered = buffersAppendedTo.length > 0 &&
buffersAppendedTo.every(function (type) { return (cycle === null || cycle === void 0 ? void 0 : cycle.fullyBuffered[type]) === true; });
if ((cycle === null || cycle === void 0 ? void 0 : cycle.progressed) || fullyBuffered) {
delete this.appendsWithoutProgress[key];
return;
}
if (!cycle && buffersAppendedTo.length === 0) {
return;
}
var count = (this.appendsWithoutProgress[key] || 0) + 1;
var hls = this.hls;
var exhausted = count >= hls.config.appendErrorMaxRetry;
if (exhausted) {
delete this.appendsWithoutProgress[key];
}
else {
this.appendsWithoutProgress[key] = count;
}
this.warn("Fragment ".concat(frag.sn, " of ").concat(frag.type, " playlist ").concat(frag.level, " appended ").concat(count, " time").concat(count > 1 ? 's' : '', " without buffered range growth"));
hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.BUFFER_APPEND_NO_PROGRESS,
fatal: false,
frag: frag,
chunkMeta: chunkMeta,
parent: frag.type,
appendsWithoutProgress: count,
error: new Error("Fragment append did not increase buffered coverage (".concat(count, ")")),
});
};
BufferController.prototype.resetAppendProgress = function () {
this.fragmentAppendProgress = Object.create(null);
this.appendsWithoutProgress = Object.create(null);
};
BufferController.prototype.resetAppendErrors = function () {
this.appendErrors = {
audio: 0,
video: 0,
audiovideo: 0,
};
this.appendError = undefined;
};
BufferController.prototype.trimBuffers = function (frontBufferFlushThreshold, backBufferLength, frag, previousFrag) {
var _a = this, hls = _a.hls, details = _a.details, media = _a.media;
if (!media || details === null) {
return;
}
if (!this.sourceBufferCount) {
return;
}
var config = hls.config;
var currentTime = media.currentTime;
var targetDuration = details.levelTargetDuration;
backBufferLength =
details.live && config.liveBackBufferLength !== null
? config.liveBackBufferLength
: backBufferLength;
var targetBackBufferPosition = -Infinity;
if (Number.isFinite(backBufferLength) && backBufferLength >= 0) {
var maxBackBufferLength = Math.max(backBufferLength, targetDuration);
targetBackBufferPosition =
Math.floor(currentTime / targetDuration) * targetDuration -
maxBackBufferLength;
}
if (frag) {
var loopFlushEnd = this.getLoopBackBufferFlushEnd(frag, previousFrag !== null && previousFrag !== void 0 ? previousFrag : null);
if (loopFlushEnd > 0) {
targetBackBufferPosition = Math.max(targetBackBufferPosition, loopFlushEnd);
}
}
if (targetBackBufferPosition > 0) {
this.flushBackBuffer(currentTime, targetDuration, targetBackBufferPosition);
}
if (Number.isFinite(frontBufferFlushThreshold) &&
frontBufferFlushThreshold > 0) {
var frontBufferLength = Math.max(config.maxBufferLength, frontBufferFlushThreshold);
var maxFrontBufferLength = Math.max(frontBufferLength, targetDuration);
var targetFrontBufferPosition = Math.floor(currentTime / targetDuration) * targetDuration +
maxFrontBufferLength;
this.flushFrontBuffer(currentTime, targetDuration, targetFrontBufferPosition);
}
};
BufferController.prototype.getLoopBackBufferFlushEnd = function (frag, previousFrag) {
var _a;
var media = this.media;
if (((_a = this.hls) === null || _a === void 0 ? void 0 : _a.config.loopBackBufferFlush) === false ||
!(media === null || media === void 0 ? void 0 : media.loop) ||
!previousFrag ||
frag.level <= previousFrag.level) {
return 0;
}
var _b = frag.elementaryStreams, video = _b.video, audiovideo = _b.audiovideo;
if ((video === null || video === void 0 ? void 0 : video.partial) || (audiovideo === null || audiovideo === void 0 ? void 0 : audiovideo.partial)) {
return 0;
}
var flushEnd = this.getEarliestElementaryStreamStart(frag) - LOOP_FLUSH_SAFETY_MARGIN;
if (flushEnd <= 0) {
return 0;
}
return flushEnd;
};
BufferController.prototype.getEarliestElementaryStreamStart = function (frag) {
var _a = frag.elementaryStreams, audio = _a.audio, video = _a.video, audiovideo = _a.audiovideo;
var earliest = frag.start;
if (audiovideo) {
earliest = Math.min(earliest, audiovideo.startDTS);
}
else {
if (audio) {
earliest = Math.min(earliest, audio.startDTS);
}
if (video) {
earliest = Math.min(earliest, video.startDTS);
}
}
return earliest;
};
BufferController.prototype.flushBackBuffer = function (currentTime, targetDuration, targetBackBufferPosition) {
var _this = this;
this.sourceBuffers.forEach(function (_a) {
var _b, _c, _d;
var type = _a[0], sb = _a[1];
if (sb) {
var buffered = BufferHelper.getBuffered(sb);
if (buffered.length > 0 &&
targetBackBufferPosition > buffered.start(0)) {
_this.hls.trigger(Events.BACK_BUFFER_REACHED, {
bufferEnd: targetBackBufferPosition,
});
var track = _this.tracks[type];
if ((_b = _this.details) === null || _b === void 0 ? void 0 : _b.live) {
_this.hls.trigger(Events.LIVE_BACK_BUFFER_REACHED, {
bufferEnd: targetBackBufferPosition,
});
}
else if ((track === null || track === void 0 ? void 0 : track.ended) &&
!(((_c = _this.media) === null || _c === void 0 ? void 0 : _c.loop) && ((_d = _this.hls) === null || _d === void 0 ? void 0 : _d.config.loopBackBufferFlush) !== false)) {
return;
}
_this.hls.trigger(Events.BUFFER_FLUSHING, {
startOffset: 0,
endOffset: targetBackBufferPosition,
type: type,
});
}
}
});
};
BufferController.prototype.flushFrontBuffer = function (currentTime, targetDuration, targetFrontBufferPosition) {
var _this = this;
this.sourceBuffers.forEach(function (_a) {
var type = _a[0], sb = _a[1];
if (sb) {
var buffered = BufferHelper.getBuffered(sb);
var numBufferedRanges = buffered.length;
if (numBufferedRanges < 2) {
return;
}
var bufferStart = buffered.start(numBufferedRanges - 1);
var bufferEnd = buffered.end(numBufferedRanges - 1);
if (targetFrontBufferPosition > bufferStart ||
(currentTime >= bufferStart && currentTime <= bufferEnd)) {
return;
}
_this.hls.trigger(Events.BUFFER_FLUSHING, {
startOffset: bufferStart,
endOffset: Infinity,
type: type,
});
}
});
};
BufferController.prototype.getDurationAndRange = function () {
var _a;
var _b = this, details = _b.details, mediaSource = _b.mediaSource;
if (!details || !this.media || (mediaSource === null || mediaSource === void 0 ? void 0 : mediaSource.readyState) !== 'open') {
return null;
}
var playlistEnd = details.edge;
if (details.live && this.hls.config.liveDurationInfinity) {
var len = details.fragments.length;
if (len && !!mediaSource.setLiveSeekableRange) {
var start = Math.max(0, details.fragmentStart);
var end = Math.max(start, playlistEnd);
return { duration: Infinity, start: start, end: end };
}
return { duration: Infinity };
}
var overrideDuration = (_a = this.overrides) === null || _a === void 0 ? void 0 : _a.duration;
if (overrideDuration) {
if (!Number.isFinite(overrideDuration)) {
return null;
}
return { duration: overrideDuration };
}
var mediaDuration = this.media.duration;
var msDuration = Number.isFinite(mediaSource.duration)
? mediaSource.duration
: 0;
if ((playlistEnd > msDuration && playlistEnd > mediaDuration) ||
!Number.isFinite(mediaDuration)) {
return { duration: playlistEnd };
}
return null;
};
BufferController.prototype.updateMediaSource = function (_a) {
var duration = _a.duration, start = _a.start, end = _a.end;
var mediaSource = this.mediaSource;
if (!mediaSource || !this.media || mediaSource.readyState !== 'open') {
return;
}
if (mediaSource.duration !== duration) {
mediaSource.duration = duration;
}
if (start !== undefined && end !== undefined) {
mediaSource.setLiveSeekableRange(start, end);
}
};
Object.defineProperty(BufferController.prototype, "tracksReady", {
get: function () {
var pendingTrackCount = this.pendingTrackCount;
return (pendingTrackCount > 0 &&
(pendingTrackCount >= this.bufferCodecEventsTotal ||
this.isPending(this.tracks.audiovideo)));
},
enumerable: false,
configurable: true
});
BufferController.prototype.checkPendingTracks = function () {
var _a;
var _b = this; _b.bufferCodecEventsTotal; _b.pendingTrackCount; _b.tracks;
if (this.tracksReady) {
var transferredTracks = (_a = this.transferData) === null || _a === void 0 ? void 0 : _a.tracks;
if (transferredTracks && Object.keys(transferredTracks).length) {
this.attachTransferred();
}
else {
this.createSourceBuffers();
}
}
};
BufferController.prototype.bufferCreated = function () {
var _this = this;
if (this.sourceBufferCount) {
var tracks_1 = {};
this.sourceBuffers.forEach(function (_a) {
var type = _a[0], buffer = _a[1];
if (type) {
var track = _this.tracks[type];
tracks_1[type] = {
buffer: buffer,
container: track.container,
codec: track.codec,
supplemental: track.supplemental,
levelCodec: track.levelCodec,
id: track.id,
metadata: track.metadata,
};
}
});
this.hls.trigger(Events.BUFFER_CREATED, {
tracks: tracks_1,
});
this.sourceBuffers.forEach(function (_a) {
var type = _a[0];
_this.executeNext(type);
});
}
else {
var error = new Error('could not create source buffer for media codec(s)');
this.hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR,
fatal: true,
error: error,
reason: error.message,
});
}
};
BufferController.prototype.createSourceBuffers = function () {
var _a;
var _b = this, tracks = _b.tracks, sourceBuffers = _b.sourceBuffers, mediaSource = _b.mediaSource;
if (!mediaSource) {
throw new Error('createSourceBuffers called when mediaSource was null');
}
for (var trackName in tracks) {
var type = trackName;
var track = tracks[type];
if (this.isPending(track)) {
var codec = this.getTrackCodec(track, type);
var mimeType = "".concat(track.container, ";codecs=").concat(codec);
track.codec = codec;
try {
var sb = mediaSource.addSourceBuffer(mimeType);
var sbIndex = sourceBufferNameToIndex(type);
var sbTuple = [type, sb];
sourceBuffers[sbIndex] = sbTuple;
track.buffer = sb;
}
catch (error) {
this.error("error while trying to add sourceBuffer: ".concat(error.message));
this.shiftAndExecuteNext(type);
(_a = this.operationQueue) === null || _a === void 0 ? void 0 : _a.removeBlockers();
delete this.tracks[type];
this.hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.BUFFER_ADD_CODEC_ERROR,
fatal: false,
error: error,
sourceBufferName: type,
mimeType: mimeType,
parent: track.id,
});
return;
}
this.trackSourceBuffer(type, track);
}
}
this.bufferCreated();
};
BufferController.prototype.clearBufferAppendTimeoutId = function (track) {
if (!track) {
return;
}
self.clearTimeout(track.bufferAppendTimeoutId);
track.bufferAppendTimeoutId = undefined;
};
BufferController.prototype.getTrackCodec = function (track, trackName) {
var supplementalCodec = track.supplemental;
var trackCodec = track.codec;
if (supplementalCodec &&
(trackName === 'video' || trackName === 'audiovideo') &&
areCodecsMediaSourceSupported(supplementalCodec, 'video')) {
trackCodec = replaceVideoCodec(trackCodec, supplementalCodec);
}
var codec = pickMostCompleteCodecName(trackCodec, track.levelCodec);
if (codec) {
if (trackName.slice(0, 5) === 'audio') {
return getCodecCompatibleName(codec, this.appendSource);
}
return codec;
}
return '';
};
BufferController.prototype.trackSourceBuffer = function (type, track) {
var _this = this;
var buffer = track.buffer;
if (!buffer) {
return;
}
var codec = this.getTrackCodec(track, type);
this.tracks[type] = {
buffer: buffer,
codec: codec,
container: track.container,
levelCodec: track.levelCodec,
supplemental: track.supplemental,
metadata: track.metadata,
id: track.id,
listeners: [],
};
this.removeBufferListeners(type);
this.addBufferListener(type, 'updatestart', this.onSBUpdateStart);
this.addBufferListener(type, 'updateend', this.onSBUpdateEnd);
this.addBufferListener(type, 'error', this.onSBUpdateError);
if (this.appendSource) {
this.addBufferListener(type, 'bufferedchange', function (type, event) {
var removedRanges = event.removedRanges;
if (removedRanges === null || removedRanges === void 0 ? void 0 : removedRanges.length) {
_this.hls.trigger(Events.BUFFER_FLUSHED, {
type: type,
start: removedRanges.start(0),
end: removedRanges.end(removedRanges.length - 1),
});
}
});
}
};
Object.defineProperty(BufferController.prototype, "mediaSrc", {
get: function () {
var _a;
var media = this.media;
if (!media) {
return undefined;
}
var source = media.src
? media
: ((_a = media.querySelector) === null || _a === void 0 ? void 0 : _a.call(media, 'source')) || media;
return source.src;
},
enumerable: false,
configurable: true
});
BufferController.prototype.isMediaSourceReplaced = function (objectUrl) {
var _a;
if (objectUrl === void 0) { objectUrl = this._objectUrl; }
if (!objectUrl) {
return false;
}
var currentSrc = (_a = this.media) === null || _a === void 0 ? void 0 : _a.currentSrc;
var mediaSrc = this.mediaSrc;
return ((!!currentSrc && currentSrc !== objectUrl) ||
(!!mediaSrc && mediaSrc !== objectUrl));
};
BufferController.prototype.onSBUpdateStart = function (type) {
var operation = this.currentOp(type);
if (!operation) {
return;
}
operation.onStart();
};
BufferController.prototype.onSBUpdateEnd = function (type) {
var _this = this;
var _a, _b, _c;
if (((_a = this.mediaSource) === null || _a === void 0 ? void 0 : _a.readyState) === 'closed') {
this.resetBuffer(type);
return;
}
var operation = this.currentOp(type);
if (!operation) {
return;
}
operation.onComplete();
var updating = (_c = (_b = this.tracks[type]) === null || _b === void 0 ? void 0 : _b.buffer) === null || _c === void 0 ? void 0 : _c.updating;
if (updating) {
this.blockUntilOpen(function () {
_this.shiftAndExecuteNext(type);
});
return;
}
this.shiftAndExecuteNext(type);
};
BufferController.prototype.onSBUpdateError = function (type, event) {
var _a;
var readyState = (_a = this.mediaSource) === null || _a === void 0 ? void 0 : _a.readyState;
var error = new Error("".concat(type, " SourceBuffer error. MediaSource readyState: ").concat(readyState));
error.name = SOURCE_BUFFER_ERROR_NAME;
this.error("".concat(error.message), event);
this.hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.BUFFER_APPENDING_ERROR,
sourceBufferName: type,
error: error,
fatal: false,
});
var operation = this.currentOp(type);
if (operation) {
operation.onError(error);
}
};
BufferController.prototype.updateTimestampOffset = function (sb, timestampOffset, tolerance, type, sn, cc) {
var delta = timestampOffset - sb.timestampOffset;
if (Math.abs(delta) >= tolerance) {
sb.timestampOffset = timestampOffset;
}
};
BufferController.prototype.removeExecutor = function (type, startOffset, endOffset) {
var _a;
var _b = this, media = _b.media, mediaSource = _b.mediaSource;
var track = this.tracks[type];
var sb = track === null || track === void 0 ? void 0 : track.buffer;
if (!media || !mediaSource || !sb) {
throw new Error("Attempting to remove from the ".concat(type, " SourceBuffer, but it does not exist"));
}
var mediaDuration = Number.isFinite(media.duration)
? media.duration
: Infinity;
var msDuration = Number.isFinite(mediaSource.duration)
? mediaSource.duration
: Infinity;
var removeStart = Math.max(0, startOffset);
if (removeStart >= msDuration) {
(_a = this.currentOp(type)) === null || _a === void 0 ? void 0 : _a.onComplete();
this.shiftAndExecuteNext(type);
return;
}
var removeEnd = Math.min(endOffset, mediaDuration, msDuration);
if (removeEnd > removeStart && (!track.ending || track.ended)) {
track.ended = false;
sb.remove(removeStart, removeEnd);
}
else {
throw new Error("Cannot remove ".concat(removeEnd <= removeStart ? "invalid range (".concat(removeStart, " >= ").concat(removeEnd, ") ") : '', "from the ").concat(type, " SourceBuffer").concat(track.ending ? ' while track ending' : ''));
}
};
BufferController.prototype.appendExecutor = function (data, type) {
var _this = this;
var track = this.tracks[type];
var sb = track === null || track === void 0 ? void 0 : track.buffer;
if (!sb) {
throw new HlsJsTrackRemovedError("Attempting to append to the ".concat(type, " SourceBuffer, but it does not exist"));
}
track.ending = false;
track.ended = false;
if (this.hls.config.appendTimeout !== Infinity) {
var appendTimeoutTime_1 = this.calculateAppendTimeoutTime(sb);
track.bufferAppendTimeoutId = self.setTimeout(function () { return _this.appendTimeoutHandler(type, sb, appendTimeoutTime_1); }, appendTimeoutTime_1);
}
sb.appendBuffer(data);
};
BufferController.prototype.appendTimeoutHandler = function (type, sb, appendTimeoutTime) {
try {
sb.abort();
}
catch (e) {
}
var operation = this.currentOp(type);
if (operation) {
operation.onError(new Error("".concat(type, "-append-timeout")));
}
};
BufferController.prototype.calculateAppendTimeoutTime = function (sb) {
var targetDuration = DEFAULT_TARGET_DURATION;
if (this.details) {
targetDuration = this.details.levelTargetDuration;
}
var desiredDefaultTimeoutValue = 2 * targetDuration * 1000;
if (this.media === null) {
return desiredDefaultTimeoutValue;
}
var activeBufferedRange = BufferHelper.bufferInfo(sb, this.media.currentTime, 0);
if (!activeBufferedRange.len) {
return desiredDefaultTimeoutValue;
}
desiredDefaultTimeoutValue = Math.max(activeBufferedRange.len * 1000, desiredDefaultTimeoutValue);
return Math.max(this.hls.config.appendTimeout, desiredDefaultTimeoutValue);
};
BufferController.prototype.blockUntilOpen = function (callback) {
var _this = this;
if (this.isUpdating() || this.isQueued()) {
this.blockBuffers(callback).catch(function (error) {
_this.warn("SourceBuffer blocked callback ".concat(error));
_this.stepOperationQueue(_this.sourceBufferTypes);
});
}
else {
try {
callback();
}
catch (error) {
this.warn("Callback run without blocking ".concat(this.operationQueue, " ").concat(error));
}
}
};
BufferController.prototype.isUpdating = function () {
return this.sourceBuffers.some(function (_a) {
var type = _a[0], sb = _a[1];
return type && sb.updating;
});
};
BufferController.prototype.isQueued = function () {
var _this = this;
return this.sourceBuffers.some(function (_a) {
var type = _a[0];
return type && !!_this.currentOp(type);
});
};
BufferController.prototype.isPending = function (track) {
return !!track && !track.buffer;
};
BufferController.prototype.isAudioBlocked = function () {
var _a;
return ((_a = this.currentOp('audio')) === null || _a === void 0 ? void 0 : _a.label) === 'block-audio';
};
BufferController.prototype.isAudioBlocking = function () {
if (this.operationQueue) {
return this.operationQueue.audioBlocking();
}
return false;
};
BufferController.prototype.blockBuffers = function (onUnblocked, bufferNames) {
var _this = this;
if (bufferNames === void 0) { bufferNames = this.sourceBufferTypes; }
if (!bufferNames.length) {
return Promise.resolve().then(onUnblocked);
}
var operationQueue = this.operationQueue;
var audioAlreadyBlocked = bufferNames.length === 2 && this.isAudioBlocking();
var blockingOperations = audioAlreadyBlocked
? [this.appendBlocker('video')]
: bufferNames.map(function (type) { return _this.appendBlocker(type); });
return Promise.all(blockingOperations).then(function (result) {
if (operationQueue !== _this.operationQueue) {
return;
}
onUnblocked();
_this.stepOperationQueue(_this.sourceBufferTypes);
});
};
BufferController.prototype.stepOperationQueue = function (bufferNames) {
var _this = this;
bufferNames.forEach(function (type) {
var _a;
var sb = (_a = _this.tracks[type]) === null || _a === void 0 ? void 0 : _a.buffer;
if (!sb || sb.updating || (type === 'audio' && _this.isAudioBlocked())) {
return;
}
_this.shiftAndExecuteNext(type);
});
};
BufferController.prototype.append = function (operation, type, pending) {
if (this.operationQueue) {
this.operationQueue.append(operation, type, pending);
}
};
BufferController.prototype.insertNext = function (operations, type) {
if (this.operationQueue) {
this.operationQueue.insertNext(operations, type);
}
};
BufferController.prototype.appendBlocker = function (type) {
if (this.operationQueue) {
return this.operationQueue.appendBlocker(type);
}
};
BufferController.prototype.currentOp = function (type) {
if (this.operationQueue) {
return this.operationQueue.current(type);
}
return null;
};
BufferController.prototype.executeNext = function (type) {
if (type && this.operationQueue) {
this.operationQueue.executeNext(type);
}
};
BufferController.prototype.shiftAndExecuteNext = function (type) {
if (this.operationQueue) {
this.operationQueue.shiftAndExecuteNext(type);
}
};
Object.defineProperty(BufferController.prototype, "pendingTrackCount", {
get: function () {
var _this = this;
return Object.keys(this.tracks).reduce(function (acc, type) {
return acc + (_this.isPending(_this.tracks[type]) ? 1 : 0);
}, 0);
},
enumerable: false,
configurable: true
});
Object.defineProperty(BufferController.prototype, "sourceBufferCount", {
get: function () {
return this.sourceBuffers.reduce(function (acc, _a) {
var type = _a[0];
return acc + (type ? 1 : 0);
}, 0);
},
enumerable: false,
configurable: true
});
Object.defineProperty(BufferController.prototype, "sourceBufferTypes", {
get: function () {
return this.sourceBuffers
.map(function (_a) {
var type = _a[0];
return type;
})
.filter(function (type) { return !!type; });
},
enumerable: false,
configurable: true
});
BufferController.prototype.addBufferListener = function (type, event, fn) {
var track = this.tracks[type];
if (!track) {
return;
}
var buffer = track.buffer;
if (!buffer) {
return;
}
var listener = fn.bind(this, type);
track.listeners.push({ event: event, listener: listener });
addEventListener(buffer, event, listener);
};
BufferController.prototype.removeBufferListeners = function (type) {
var track = this.tracks[type];
if (!track) {
return;
}
var buffer = track.buffer;
if (!buffer) {
return;
}
track.listeners.forEach(function (l) {
removeEventListener(buffer, l.event, l.listener);
});
track.listeners.length = 0;
};
return BufferController;
}(Logger));
function removeSourceChildren(node) {
var sourceChildren = node.querySelectorAll('source');
__bolli.any_forEach([].slice.call(sourceChildren), function (source) {
node.removeChild(source);
});
}
function addSource(media, url) {
var source = self.document.createElement('source');
source.type = 'video/mp4';
source.src = url;
media.appendChild(source);
}
function sourceBufferNameToIndex(type) {
return type === 'audio' ? 1 : 0;
}
function mediaErrorRecoveryMessage(fatal, mediaError) {
return "".concat(fatal ? '' : ' - triggering recovery').concat(mediaError ? ' with HTMLMediaElement Error: ' + mediaError.message : '');
}
function appendProgressKey(fragment) {
return "".concat(fragment.type, "_").concat(fragment.sn, "_").concat(fragment.level);
}
function fragmentBufferedCoverage(timeRanges, fragment) {
var start = fragment.start, end = fragment.end;
var coverage = 0;
for (var i = 0; i < timeRanges.length; i++) {
var timeRange = timeRanges[i];
if (timeRange.start >= end) {
break;
}
var rangeStart = Math.max(start, timeRange.start);
var rangeEnd = Math.min(end, timeRange.end);
if (rangeEnd > rangeStart) {
coverage += rangeEnd - rangeStart;
}
}
return coverage;
}
function isFragmentFullyBuffered(coverage, fragment) {
return fragment.duration - coverage <= 0.05;
}
function Decrypter() {}
Decrypter.prototype.destroy = Decrypter.prototype.reset = function () {};
Decrypter.prototype.decrypt = function () { return Promise.reject(new Error('encrypted streams are left out')); };
var MIN_CHUNK_SIZE = Math.pow(2, 17);
var FragmentLoader = (function () {
function FragmentLoader(config) {
this.loader = null;
this.partLoadTimeout = -1;
this.config = config;
}
FragmentLoader.prototype.destroy = function () {
if (this.loader) {
this.loader.destroy();
this.loader = null;
}
};
FragmentLoader.prototype.abort = function () {
if (this.loader) {
this.loader.abort();
}
};
FragmentLoader.prototype.load = function (frag, isIFrame, onProgress, progressGate) {
var _this = this;
var url = frag.url;
if (!url) {
return Promise.reject(new LoadError({
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.FRAG_LOAD_ERROR,
fatal: false,
frag: frag,
error: new Error("Fragment does not have a ".concat(url ? 'part list' : 'url')),
networkDetails: null,
}));
}
this.abort();
var config = this.config;
var FragmentILoader = config.fLoader;
var DefaultILoader = config.loader;
return new Promise(function (resolve, reject) {
if (_this.loader) {
_this.loader.destroy();
}
if (frag.gap) {
if (frag.tagList.some(function (tags) { return tags[0] === 'GAP'; })) {
reject(createGapLoadError(frag));
return;
}
else {
frag.gap = false;
}
}
var loader = (_this.loader = FragmentILoader
? new FragmentILoader(config)
: new DefaultILoader(config));
var loaderContext = createLoaderContext(frag, null, isIFrame);
frag.loader = loader;
var loadPolicy = getLoaderConfigWithoutReties(config.fragLoadPolicy.default);
var loaderConfig = {
loadPolicy: loadPolicy,
timeout: loadPolicy.maxLoadTimeMs,
maxRetry: 0,
retryDelay: 0,
maxRetryDelay: 0,
highWaterMark: frag.sn === 'initSegment' ? Infinity : MIN_CHUNK_SIZE,
};
loader.stats.retry = frag.stats.retry;
frag.stats = loader.stats;
var callbacks = {
onSuccess: function (response, stats, context, networkDetails) {
_this.resetLoader(frag, loader);
var payload = response.data;
if (context.resetIV && frag.decryptdata) {
frag.decryptdata.iv = new Uint8Array(payload.slice(0, 16));
payload = payload.slice(16);
}
resolve({
frag: frag,
part: null,
payload: payload,
networkDetails: networkDetails,
});
},
onError: function (response, context, networkDetails, stats) {
_this.resetLoader(frag, loader);
reject(new LoadError({
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.FRAG_LOAD_ERROR,
fatal: false,
frag: frag,
response: __assign({ url: url, data: undefined }, response),
error: new Error("HTTP Error ".concat(response.code, " ").concat(response.text)),
networkDetails: networkDetails,
stats: stats,
}));
},
onAbort: function (stats, context, networkDetails) {
_this.resetLoader(frag, loader);
reject(new LoadError({
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.INTERNAL_ABORTED,
fatal: false,
frag: frag,
error: new Error('Aborted'),
networkDetails: networkDetails,
stats: stats,
}));
},
onTimeout: function (stats, context, networkDetails) {
_this.resetLoader(frag, loader);
reject(new LoadError({
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.FRAG_LOAD_TIMEOUT,
fatal: false,
frag: frag,
error: new Error("Timeout after ".concat(loaderConfig.timeout, "ms")),
networkDetails: networkDetails,
stats: stats,
}));
},
};
if (onProgress) {
var onProgressGated_1 = _this.gateProgress(onProgress, progressGate);
callbacks.onProgress = function (stats, context, data, networkDetails) {
return onProgressGated_1({
frag: frag,
part: null,
payload: data,
networkDetails: networkDetails,
});
};
}
loader.load(loaderContext, loaderConfig, callbacks);
});
};
FragmentLoader.prototype.gateProgress = function (onProgress, progressGate) {
var handleChunk = onProgress;
if (progressGate) {
var pendingChunks_1 = [];
var gateDone_1 = false;
progressGate
.then(function () {
gateDone_1 = true;
pendingChunks_1.forEach(function (chunk) { return onProgress(chunk); });
pendingChunks_1.length = 0;
})
.catch(function () { });
handleChunk = function (data) {
if (gateDone_1) {
onProgress(data);
}
else {
pendingChunks_1.push(data);
}
};
}
return handleChunk;
};
FragmentLoader.prototype.loadPart = function (frag, part, onProgress) {
var _this = this;
this.abort();
var config = this.config;
var FragmentILoader = config.fLoader;
var DefaultILoader = config.loader;
return new Promise(function (resolve, reject) {
if (_this.loader) {
_this.loader.destroy();
}
if (frag.gap || part.gap) {
reject(createGapLoadError(frag, part));
return;
}
var loader = (_this.loader = FragmentILoader
? new FragmentILoader(config)
: new DefaultILoader(config));
var loaderContext = createLoaderContext(frag, part);
frag.loader = loader;
var loadPolicy = getLoaderConfigWithoutReties(config.fragLoadPolicy.default);
var loaderConfig = {
loadPolicy: loadPolicy,
timeout: loadPolicy.maxLoadTimeMs,
maxRetry: 0,
retryDelay: 0,
maxRetryDelay: 0,
highWaterMark: MIN_CHUNK_SIZE,
};
part.stats = loader.stats;
loader.load(loaderContext, loaderConfig, {
onSuccess: function (response, stats, context, networkDetails) {
_this.resetLoader(frag, loader);
_this.updateStatsFromPart(frag, part);
var partLoadedData = {
frag: frag,
part: part,
payload: response.data,
networkDetails: networkDetails,
};
onProgress(partLoadedData);
resolve(partLoadedData);
},
onError: function (response, context, networkDetails, stats) {
_this.resetLoader(frag, loader);
reject(new LoadError({
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.FRAG_LOAD_ERROR,
fatal: false,
frag: frag,
part: part,
response: __assign({ url: loaderContext.url, data: undefined }, response),
error: new Error("HTTP Error ".concat(response.code, " ").concat(response.text)),
networkDetails: networkDetails,
stats: stats,
}));
},
onAbort: function (stats, context, networkDetails) {
frag.stats.aborted = part.stats.aborted;
_this.resetLoader(frag, loader);
reject(new LoadError({
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.INTERNAL_ABORTED,
fatal: false,
frag: frag,
part: part,
error: new Error('Aborted'),
networkDetails: networkDetails,
stats: stats,
}));
},
onTimeout: function (stats, context, networkDetails) {
_this.resetLoader(frag, loader);
reject(new LoadError({
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.FRAG_LOAD_TIMEOUT,
fatal: false,
frag: frag,
part: part,
error: new Error("Timeout after ".concat(loaderConfig.timeout, "ms")),
networkDetails: networkDetails,
stats: stats,
}));
},
});
});
};
FragmentLoader.prototype.updateStatsFromPart = function (frag, part) {
var fragStats = frag.stats;
var partStats = part.stats;
var partTotal = partStats.total;
fragStats.loaded += partStats.loaded;
if (partTotal) {
var estTotalParts = Math.round(frag.duration / part.duration);
var estLoadedParts = Math.min(Math.round(fragStats.loaded / partTotal), estTotalParts);
var estRemainingParts = estTotalParts - estLoadedParts;
var estRemainingBytes = estRemainingParts * Math.round(fragStats.loaded / estLoadedParts);
fragStats.total = fragStats.loaded + estRemainingBytes;
}
else {
fragStats.total = Math.max(fragStats.loaded, fragStats.total);
}
var fragLoading = fragStats.loading;
var partLoading = partStats.loading;
if (fragLoading.start) {
fragLoading.first += partLoading.first - partLoading.start;
}
else {
fragLoading.start = partLoading.start;
fragLoading.first = partLoading.first;
}
fragLoading.end = partLoading.end;
};
FragmentLoader.prototype.resetLoader = function (frag, loader) {
frag.loader = null;
frag.url = null;
if (this.loader === loader) {
self.clearTimeout(this.partLoadTimeout);
this.loader = null;
}
loader.destroy();
};
return FragmentLoader;
}());
function createLoaderContext(frag, part, isIFrame) {
if (part === void 0) { part = null; }
var segment = part || frag;
var loaderContext = {
type: LoaderContextType.MEDIA_FRAGMENT,
frag: frag,
part: part,
responseType: 'arraybuffer',
url: segment.url,
headers: {},
rangeStart: 0,
rangeEnd: 0,
};
var aesAdjustments = getAESAdjustments(frag, part, isIFrame);
if (aesAdjustments.resetIV) {
loaderContext.resetIV = true;
}
if (aesAdjustments.byteRange) {
loaderContext.rangeStart = aesAdjustments.byteRange.start;
loaderContext.rangeEnd = aesAdjustments.byteRange.end;
}
return loaderContext;
}
function getAESAdjustments(frag, part, isIFrame) {
var _a;
if (part === void 0) { part = null; }
var result = {};
var segment = part || frag;
var start = segment.byteRangeStartOffset;
var end = segment.byteRangeEndOffset;
if (Number.isFinite(start) && Number.isFinite(end)) {
if ((frag.sn === 'initSegment' || isIFrame) &&
isMethodFullSegmentAesCbc((_a = frag.decryptdata) === null || _a === void 0 ? void 0 : _a.method)) {
var byteRangeStart = Math.floor(start / 16) * 16;
var byteRangeEnd = Math.ceil(end / 16) * 16;
result.decryptRange = {
start: start - byteRangeStart,
end: end - byteRangeStart,
};
if (byteRangeStart >= 16) {
result.resetIV = true;
byteRangeStart = byteRangeStart - 16;
}
result.byteRange = {
start: byteRangeStart,
end: byteRangeEnd,
};
}
else {
result.byteRange = {
start: start,
end: end,
};
}
}
return result;
}
function createGapLoadError(frag, part) {
var error = new Error("GAP ".concat(frag.gap ? 'tag' : 'attribute', " found"));
var errorData = {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.FRAG_GAP,
fatal: false,
frag: frag,
error: error,
networkDetails: null,
};
if (part) {
errorData.part = part;
}
(part ? part : frag).stats.aborted = true;
return new LoadError(errorData);
}
function isMethodFullSegmentAesCbc(method) {
return method === 'AES-128' || method === 'AES-256';
}
var LoadError = (function (_super) {
__extends(LoadError, _super);
function LoadError(data) {
var _this = _super.call(this, data.error.message) || this;
_this.data = data;
return _this;
}
return LoadError;
}(Error));
var TaskLoop = (function (_super) {
__extends(TaskLoop, _super);
function TaskLoop(label, logger) {
var _this = _super.call(this, label, logger) || this;
_this._tickTimer = null;
_this._tickInterval = null;
_this._tickCallCount = 0;
_this._boundTick = _this.tick.bind(_this);
return _this;
}
TaskLoop.prototype.destroy = function () {
this.onHandlerDestroying();
this.onHandlerDestroyed();
};
TaskLoop.prototype.onHandlerDestroying = function () {
this.clearNextTick();
this.clearInterval();
};
TaskLoop.prototype.onHandlerDestroyed = function () { };
TaskLoop.prototype.hasInterval = function () {
return !!this._tickInterval;
};
TaskLoop.prototype.hasNextTick = function () {
return !!this._tickTimer;
};
TaskLoop.prototype.setInterval = function (millis) {
if (!this._tickInterval) {
this._tickCallCount = 0;
this._tickInterval = self.setInterval(this._boundTick, millis);
return true;
}
return false;
};
TaskLoop.prototype.clearInterval = function () {
if (this._tickInterval) {
self.clearInterval(this._tickInterval);
this._tickInterval = null;
return true;
}
return false;
};
TaskLoop.prototype.clearNextTick = function () {
if (this._tickTimer) {
self.clearTimeout(this._tickTimer);
this._tickTimer = null;
return true;
}
return false;
};
TaskLoop.prototype.tick = function () {
this._tickCallCount++;
if (this._tickCallCount === 1) {
this.doTick();
if (this._tickCallCount > 1) {
this.tickImmediate();
}
this._tickCallCount = 0;
}
else {
this._tickCallCount = 0;
}
};
TaskLoop.prototype.tickImmediate = function () {
this.clearNextTick();
this._tickTimer = self.setTimeout(this._boundTick, 0);
};
TaskLoop.prototype.doTick = function () { };
return TaskLoop;
}(Logger));
var ChunkMetadata = (function () {
function ChunkMetadata(level, sn, id, size, part, partial, duration, iframe, decryptRange) {
if (size === void 0) { size = 0; }
if (part === void 0) { part = -1; }
if (partial === void 0) { partial = false; }
this.transmuxing = getNewPerformanceTiming();
this.buffering = {
audio: getNewPerformanceTiming(),
video: getNewPerformanceTiming(),
audiovideo: getNewPerformanceTiming(),
};
this.level = level;
this.sn = sn;
this.id = id;
this.size = size;
this.part = part;
this.partial = partial;
this.duration = duration || 0;
this.decryptRange = decryptRange;
this.iframe = iframe || false;
}
return ChunkMetadata;
}());
function getNewPerformanceTiming() {
return { start: 0, executeStart: 0, executeEnd: 0, end: 0 };
}
var DECIMAL_RESOLUTION_REGEX = /^(\d+)x(\d+)$/;
var ATTR_LIST_REGEX = /(.+?)=(".*?"|.*?)(?:,|$)/g;
var AttrList = (function () {
function AttrList(attrs, parsed) {
if (typeof attrs === 'string') {
attrs = AttrList.parseAttrList(attrs, parsed);
}
__bolli.assign(this, attrs);
}
Object.defineProperty(AttrList.prototype, "clientAttrs", {
get: function () {
return Object.keys(this).filter(function (attr) { return attr.substring(0, 2) === 'X-'; });
},
enumerable: false,
configurable: true
});
AttrList.prototype.decimalInteger = function (attrName) {
var intValue = parseInt(this[attrName], 10);
if (intValue > Number.MAX_SAFE_INTEGER) {
return Infinity;
}
return intValue;
};
AttrList.prototype.hexadecimalInteger = function (attrName) {
if (this[attrName]) {
var stringValue = __bolli.any_slice((this[attrName] || '0x'), 2);
stringValue = (stringValue.length & 1 ? '0' : '') + stringValue;
var value = new Uint8Array(stringValue.length / 2);
for (var i = 0; i < stringValue.length / 2; i++) {
value[i] = parseInt(__bolli.any_slice(stringValue, i * 2, i * 2 + 2), 16);
}
return value;
}
return null;
};
AttrList.prototype.hexadecimalIntegerAsNumber = function (attrName) {
var intValue = parseInt(this[attrName], 16);
if (intValue > Number.MAX_SAFE_INTEGER) {
return Infinity;
}
return intValue;
};
AttrList.prototype.decimalFloatingPoint = function (attrName) {
return parseFloat(this[attrName]);
};
AttrList.prototype.optionalFloat = function (attrName, defaultValue) {
var value = this[attrName];
return value ? parseFloat(value) : defaultValue;
};
AttrList.prototype.enumeratedString = function (attrName) {
return this[attrName];
};
AttrList.prototype.enumeratedStringList = function (attrName, dict) {
var attrValue = this[attrName];
return __bolli.any_reduce((attrValue ? attrValue.split(/[ ,]+/) : []), function (result, identifier) {
result[identifier.toLowerCase()] = true;
return result;
}, dict);
};
AttrList.prototype.bool = function (attrName) {
return this[attrName] === 'YES';
};
AttrList.prototype.decimalResolution = function (attrName) {
var res = DECIMAL_RESOLUTION_REGEX.exec(this[attrName]);
if (res === null) {
return undefined;
}
return {
width: parseInt(res[1], 10),
height: parseInt(res[2], 10),
};
};
AttrList.parseAttrList = function (input, parsed) {
var match;
var attrs = {};
var quote = '"';
ATTR_LIST_REGEX.lastIndex = 0;
while ((match = ATTR_LIST_REGEX.exec(input)) !== null) {
var name_1 = match[1].trim();
var value = match[2];
var quotedString = value.indexOf(quote) === 0 &&
value.lastIndexOf(quote) === value.length - 1;
var hexadecimalSequence = false;
if (quotedString) {
value = value.slice(1, -1);
}
else {
switch (name_1) {
case 'IV':
case 'SCTE35-CMD':
case 'SCTE35-IN':
case 'SCTE35-OUT':
hexadecimalSequence = true;
}
}
if (parsed && (quotedString || hexadecimalSequence)) ;
else if (!hexadecimalSequence && !quotedString) {
switch (name_1) {
case 'CLOSED-CAPTIONS':
if (value === 'NONE') {
break;
}
case 'ALLOWED-CPC':
case 'CLASS':
case 'ASSOC-LANGUAGE':
case 'AUDIO':
case 'BYTERANGE':
case 'CHANNELS':
case 'CHARACTERISTICS':
case 'CODECS':
case 'DATA-ID':
case 'END-DATE':
case 'GROUP-ID':
case 'ID':
case 'IMPORT':
case 'INSTREAM-ID':
case 'KEYFORMAT':
case 'KEYFORMATVERSIONS':
case 'LANGUAGE':
case 'NAME':
case 'PATHWAY-ID':
case 'QUERYPARAM':
case 'RECENTLY-REMOVED-DATERANGES':
case 'SERVER-URI':
case 'STABLE-RENDITION-ID':
case 'STABLE-VARIANT-ID':
case 'START-DATE':
case 'SUBTITLES':
case 'SUPPLEMENTAL-CODECS':
case 'URI':
case 'VALUE':
case 'VIDEO':
case 'X-ASSET-LIST':
case 'X-ASSET-URI':
logger.warn("".concat(input, ": attribute ").concat(name_1, " is missing quotes"));
}
}
attrs[name_1] = value;
}
return attrs;
};
return AttrList;
}());
var CLASS_INTERSTITIAL = 'com.apple.hls.interstitial';
var DateRange = (function () {
function DateRange(dateRangeAttr, dateRangeWithSameId, tagCount) {
if (tagCount === void 0) { tagCount = 0; }
var _a;
this.tagAnchor = (dateRangeWithSameId === null || dateRangeWithSameId === void 0 ? void 0 : dateRangeWithSameId.tagAnchor) || null;
this.tagOrder = (_a = dateRangeWithSameId === null || dateRangeWithSameId === void 0 ? void 0 : dateRangeWithSameId.tagOrder) !== null && _a !== void 0 ? _a : tagCount;
if (dateRangeWithSameId) {
var previousAttr = dateRangeWithSameId.attr;
for (var key in previousAttr) {
if (Object.prototype.hasOwnProperty.call(dateRangeAttr, key) &&
dateRangeAttr[key] !== previousAttr[key]) {
logger.warn("DATERANGE tag attribute: \"".concat(key, "\" does not match for tags with ID: \"").concat(dateRangeAttr.ID, "\""));
this._badValueForSameId = key;
break;
}
}
dateRangeAttr = __bolli.assign(new AttrList({}), previousAttr, dateRangeAttr);
}
this.attr = dateRangeAttr;
if (dateRangeWithSameId) {
this._startDate = dateRangeWithSameId._startDate;
this._cue = dateRangeWithSameId._cue;
this._endDate = dateRangeWithSameId._endDate;
this._dateAtEnd = dateRangeWithSameId._dateAtEnd;
}
else {
this._startDate = new Date(dateRangeAttr["START-DATE"]);
}
if ("END-DATE" in dateRangeAttr) {
var endDate = (dateRangeWithSameId === null || dateRangeWithSameId === void 0 ? void 0 : dateRangeWithSameId.endDate) ||
new Date(dateRangeAttr["END-DATE"]);
if (Number.isFinite(endDate.getTime())) {
this._endDate = endDate;
}
}
}
Object.defineProperty(DateRange.prototype, "id", {
get: function () {
return this.attr.ID;
},
enumerable: false,
configurable: true
});
Object.defineProperty(DateRange.prototype, "class", {
get: function () {
return this.attr.CLASS;
},
enumerable: false,
configurable: true
});
Object.defineProperty(DateRange.prototype, "cue", {
get: function () {
var _cue = this._cue;
if (_cue === undefined) {
return (this._cue = this.attr.enumeratedStringList(this.attr.CUE ? 'CUE' : 'X-CUE', {
pre: false,
post: false,
once: false,
}));
}
return _cue;
},
enumerable: false,
configurable: true
});
Object.defineProperty(DateRange.prototype, "startTime", {
get: function () {
var tagAnchor = this.tagAnchor;
if (tagAnchor === null || tagAnchor.programDateTime === null) {
logger.warn("Expected tagAnchor Fragment with PDT set for DateRange \"".concat(this.id, "\": ").concat(tagAnchor));
return NaN;
}
return (tagAnchor.start +
(this.startDate.getTime() - tagAnchor.programDateTime) / 1000);
},
enumerable: false,
configurable: true
});
Object.defineProperty(DateRange.prototype, "startDate", {
get: function () {
return this._startDate;
},
enumerable: false,
configurable: true
});
Object.defineProperty(DateRange.prototype, "endDate", {
get: function () {
var dateAtEnd = this._endDate || this._dateAtEnd;
if (dateAtEnd) {
return dateAtEnd;
}
var duration = this.duration;
if (duration !== null) {
return (this._dateAtEnd = new Date(this._startDate.getTime() + duration * 1000));
}
return null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(DateRange.prototype, "duration", {
get: function () {
if ("DURATION" in this.attr) {
var duration = this.attr.decimalFloatingPoint("DURATION");
if (Number.isFinite(duration)) {
return duration;
}
}
else if (this._endDate) {
return (this._endDate.getTime() - this._startDate.getTime()) / 1000;
}
return null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(DateRange.prototype, "plannedDuration", {
get: function () {
if ("PLANNED-DURATION" in this.attr) {
return this.attr.decimalFloatingPoint("PLANNED-DURATION");
}
return null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(DateRange.prototype, "endOnNext", {
get: function () {
return this.attr.bool("END-ON-NEXT");
},
enumerable: false,
configurable: true
});
Object.defineProperty(DateRange.prototype, "isInterstitial", {
get: function () {
return this.class === CLASS_INTERSTITIAL;
},
enumerable: false,
configurable: true
});
Object.defineProperty(DateRange.prototype, "isValid", {
get: function () {
return (!!this.id &&
!this._badValueForSameId &&
Number.isFinite(this.startDate.getTime()) &&
(this.duration === null || this.duration >= 0) &&
(!this.endOnNext || !!this.class) &&
(!this.attr.CUE ||
(!this.cue.pre && !this.cue.post) ||
this.cue.pre !== this.cue.post) &&
(!this.isInterstitial ||
'X-ASSET-URI' in this.attr ||
'X-ASSET-LIST' in this.attr));
},
enumerable: false,
configurable: true
});
Object.defineProperty(DateRange.prototype, "invalidReason", {
get: function () {
if (!this.id) {
return 'Missing ID';
}
if (this._badValueForSameId) {
return "Date range ".concat(this._badValueForSameId, " mismatch");
}
if (!Number.isFinite(this.startDate.getTime())) {
return 'Date range invalid start date';
}
if (this.isInterstitial &&
!('X-ASSET-URI' in this.attr || 'X-ASSET-LIST' in this.attr)) {
return 'Interstitial Date range missing X-ASSET-(LIST|URI)';
}
if (!this.isValid) {
return 'Unknown (check DURATION(|END|NEXT), CLASS, and CUE)';
}
return null;
},
enumerable: false,
configurable: true
});
return DateRange;
}());
function LevelKey(method, uri) { this.method = method; this.uri = uri; }
LevelKey.prototype.isSupported = function () { return false; };
var MASTER_PLAYLIST_REGEX = /#EXT-X-STREAM-INF:([^\r\n]*)(?:[\r\n](?:#[^\r\n]*)?)*([^\r\n]+)|#EXT-X-(I-FRAME-STREAM-INF|SESSION-DATA|SESSION-KEY|DEFINE|CONTENT-STEERING|START):([^\r\n]*)(?:[\r\n]+|$)/g;
var MASTER_PLAYLIST_MEDIA_REGEX = /#EXT-X-MEDIA:(.*)/g;
var IS_MEDIA_PLAYLIST = /^#EXT(?:INF|-X-TARGETDURATION):/m;
var LEVEL_PLAYLIST_REGEX_FAST = new RegExp([
/#EXTINF:\s*(\d+(?:\.\d*)?|\.\d+)?(?:,(.*)\s+)?/.source,
/(?!#) *(\S[^\r\n]*)/.source,
/#.*/.source,
].join('|'), 'g');
var LEVEL_PLAYLIST_REGEX_SLOW = new RegExp([
/#EXT-X-(PROGRAM-DATE-TIME|BYTERANGE|DATERANGE|DEFINE|KEY|MAP|PART|PART-INF|PLAYLIST-TYPE|PRELOAD-HINT|RENDITION-REPORT|SERVER-CONTROL|SKIP|START):(.+)/
.source,
/#EXT-X-(BITRATE|DISCONTINUITY-SEQUENCE|MEDIA-SEQUENCE|TARGETDURATION|VERSION): *(\d+)/
.source,
/#EXT-X-(DISCONTINUITY|ENDLIST|GAP|INDEPENDENT-SEGMENTS|I-FRAMES-ONLY)/
.source,
/(#)([^:]*):(.*)/.source,
/(#)(.*)(?:.*)\r?\n?/.source,
].join('|'));
var M3U8Parser = (function () {
function M3U8Parser() {
}
M3U8Parser.findGroup = function (groups, mediaGroupId) {
for (var i = 0; i < groups.length; i++) {
var group = groups[i];
if (group.id === mediaGroupId) {
return group;
}
}
};
M3U8Parser.resolve = function (url, baseUrl) {
return buildAbsoluteURL(baseUrl, url, { alwaysNormalize: true });
};
M3U8Parser.isMediaPlaylist = function (str) {
return IS_MEDIA_PLAYLIST.test(str);
};
M3U8Parser.parseMasterPlaylist = function (string, baseurl) {
var hasVariableRefs = false;
var parsed = {
contentSteering: null,
levels: [],
iframeVariants: [],
playlistParsingError: null,
sessionData: null,
sessionKeys: null,
startTimeOffset: null,
variableList: null,
hasVariableRefs: hasVariableRefs,
};
var levelsWithKnownCodecs = [];
MASTER_PLAYLIST_REGEX.lastIndex = 0;
if (!__bolli.startsWith(string, '#EXTM3U')) {
parsed.playlistParsingError = new Error('no EXTM3U delimiter');
return parsed;
}
var result;
while ((result = MASTER_PLAYLIST_REGEX.exec(string)) != null) {
if (result[1]) {
var attrs = new AttrList(result[1], parsed);
var level = createVariant(attrs, result[2], baseurl, parsed, levelsWithKnownCodecs);
if (level) {
parsed.levels.push(level);
}
}
else if (result[3]) {
var tag = result[3];
var attributes = result[4];
switch (tag) {
case 'I-FRAME-STREAM-INF':
{
var attrs = new AttrList(attributes, parsed);
var iframeVariant = createVariant(attrs, attrs.URI, baseurl, parsed, levelsWithKnownCodecs, true);
if (iframeVariant) {
parsed.iframeVariants.push(iframeVariant);
}
}
break;
case 'SESSION-DATA': {
var sessionAttrs = new AttrList(attributes, parsed);
var dataId = sessionAttrs['DATA-ID'];
if (dataId) {
if (parsed.sessionData === null) {
parsed.sessionData = {};
}
parsed.sessionData[dataId] = sessionAttrs;
}
break;
}
case 'SESSION-KEY': {
var sessionKey = parseKey(attributes, baseurl, parsed);
if (sessionKey.encrypted && sessionKey.isSupported()) {
if (parsed.sessionKeys === null) {
parsed.sessionKeys = [];
}
parsed.sessionKeys.push(sessionKey);
}
else {
logger.warn("[Keys] Ignoring invalid EXT-X-SESSION-KEY tag: \"".concat(attributes, "\""));
}
break;
}
case 'DEFINE': {
break;
}
case 'CONTENT-STEERING': {
var contentSteeringAttributes = new AttrList(attributes, parsed);
parsed.contentSteering = {
uri: M3U8Parser.resolve(contentSteeringAttributes['SERVER-URI'], baseurl),
pathwayId: contentSteeringAttributes['PATHWAY-ID'] || '.',
};
break;
}
case 'START': {
parsed.startTimeOffset = parseStartTimeOffset(attributes);
break;
}
}
}
}
var stripUnknownCodecLevels = levelsWithKnownCodecs.length > 0 &&
levelsWithKnownCodecs.length < parsed.levels.length;
parsed.levels = stripUnknownCodecLevels
? levelsWithKnownCodecs
: parsed.levels;
if (parsed.levels.length === 0) {
parsed.playlistParsingError = new Error('no levels found in manifest');
}
return parsed;
};
M3U8Parser.parseMasterPlaylistMedia = function (string, baseurl, parsed) {
var result;
var results = {};
var levels = parsed.levels;
var groupsByType = {
AUDIO: levels.map(function (level) { return ({
id: level.attrs.AUDIO,
audioCodec: level.audioCodec,
}); }),
SUBTITLES: levels.map(function (level) { return ({
id: level.attrs.SUBTITLES,
textCodec: level.textCodec,
}); }),
'CLOSED-CAPTIONS': [],
};
var id = 0;
MASTER_PLAYLIST_MEDIA_REGEX.lastIndex = 0;
while ((result = MASTER_PLAYLIST_MEDIA_REGEX.exec(string)) !== null) {
var attrs = new AttrList(result[1], parsed);
var type = attrs.TYPE;
if (type) {
var groups = groupsByType[type];
var medias = results[type] || [];
results[type] = medias;
var lang = attrs.LANGUAGE;
var assocLang = attrs['ASSOC-LANGUAGE'];
var channels = attrs.CHANNELS;
var characteristics = attrs.CHARACTERISTICS;
var instreamId = attrs['INSTREAM-ID'];
var media = {
attrs: attrs,
bitrate: 0,
id: id++,
groupId: attrs['GROUP-ID'] || '',
name: attrs.NAME || lang || '',
type: type,
default: attrs.bool('DEFAULT'),
autoselect: attrs.bool('AUTOSELECT'),
forced: attrs.bool('FORCED'),
lang: lang,
url: attrs.URI ? M3U8Parser.resolve(attrs.URI, baseurl) : '',
};
if (assocLang) {
media.assocLang = assocLang;
}
if (channels) {
media.channels = channels;
}
if (characteristics) {
media.characteristics = characteristics;
}
if (instreamId) {
media.instreamId = instreamId;
}
if (groups === null || groups === void 0 ? void 0 : groups.length) {
var groupCodec = M3U8Parser.findGroup(groups, media.groupId) || groups[0];
assignCodec(media, groupCodec, 'audioCodec');
assignCodec(media, groupCodec, 'textCodec');
}
medias.push(media);
}
}
return results;
};
M3U8Parser.parseLevelPlaylist = function (string, baseurl, id, type, levelUrlId, multivariantVariableList) {
var _a;
var base = { url: baseurl };
var level = new LevelDetails(baseurl);
var fragments = level.fragments;
var programDateTimes = [];
var currentInitSegment = null;
var currentSN = 0;
var currentPart = 0;
var totalduration = 0;
var discontinuityCounter = 0;
var currentBitrate = 0;
var prevFrag = null;
var frag = new Fragment(type, base);
var result;
var i;
var levelkeys;
var firstPdtIndex = -1;
var createNextFrag = false;
var nextByteRange = null;
var serverControlAttrs;
LEVEL_PLAYLIST_REGEX_FAST.lastIndex = 0;
level.m3u8 = string;
level.hasVariableRefs = false;
if (((_a = LEVEL_PLAYLIST_REGEX_FAST.exec(string)) === null || _a === void 0 ? void 0 : _a[0]) !== '#EXTM3U') {
level.playlistParsingError = new Error('Missing format identifier #EXTM3U');
return level;
}
while ((result = LEVEL_PLAYLIST_REGEX_FAST.exec(string)) !== null) {
if (createNextFrag) {
createNextFrag = false;
frag = new Fragment(type, base);
frag.playlistOffset = totalduration;
frag.setStart(totalduration);
frag.sn = currentSN;
frag.cc = discontinuityCounter;
if (currentBitrate) {
frag.bitrate = currentBitrate;
}
frag.level = id;
if (currentInitSegment) {
frag.initSegment = currentInitSegment;
if (currentInitSegment.rawProgramDateTime) {
frag.rawProgramDateTime = currentInitSegment.rawProgramDateTime;
currentInitSegment.rawProgramDateTime = null;
}
if (nextByteRange) {
frag.setByteRange(nextByteRange);
nextByteRange = null;
}
}
}
var duration = result[1];
if (duration) {
frag.duration = parseFloat(duration);
var title = (' ' + result[2]).slice(1);
frag.title = title || null;
frag.tagList.push(title ? ['INF', duration, title] : ['INF', duration]);
}
else if (result[3]) {
if (Number.isFinite(frag.duration)) {
frag.playlistOffset = totalduration;
frag.setStart(totalduration);
if (levelkeys) {
setFragLevelKeys(frag, levelkeys, level);
}
frag.sn = currentSN;
frag.level = id;
frag.cc = discontinuityCounter;
var uri = (' ' + result[3]).slice(1);
frag.relurl = uri;
assignProgramDateTime(frag, prevFrag, programDateTimes);
prevFrag = frag;
totalduration += frag.duration;
currentSN++;
currentPart = 0;
var byteRange = frag.byteRange;
if (byteRange.length === 2) {
frag.bitrate =
(((byteRange[1] - byteRange[0]) * 8) / frag.duration) | 0;
}
if (level.iframesOnly &&
byteRange[0] &&
(currentInitSegment === null || currentInitSegment === void 0 ? void 0 : currentInitSegment.cc) !== discontinuityCounter) {
var init = new Fragment(type, base);
init.relurl = frag.relurl;
init.setByteRange("".concat(Math.min(byteRange[0], 7 * 188), "@0"));
init.level = id;
init.sn = 'initSegment';
if (levelkeys) {
init.levelkeys = levelkeys;
if (levelkeys.identity) {
init._decryptdata =
levelkeys.identity.getDecryptData(0);
}
}
currentInitSegment = init;
frag.initSegment = currentInitSegment;
}
fragments.push(frag);
createNextFrag = true;
}
}
else {
result = result[0].match(LEVEL_PLAYLIST_REGEX_SLOW);
if (!result) {
logger.warn('No matches on slow regex match for level playlist!');
continue;
}
for (i = 1; i < result.length; i++) {
if (result[i] !== undefined) {
break;
}
}
var tag = (' ' + result[i]).slice(1);
var value1 = (' ' + result[i + 1]).slice(1);
var value2 = result[i + 2] ? (' ' + result[i + 2]).slice(1) : null;
switch (tag) {
case 'BYTERANGE':
if (prevFrag) {
frag.setByteRange(value1, prevFrag);
}
else {
frag.setByteRange(value1);
}
break;
case 'PROGRAM-DATE-TIME':
frag.rawProgramDateTime = value1;
frag.tagList.push(['PROGRAM-DATE-TIME', value1]);
if (firstPdtIndex === -1) {
firstPdtIndex = fragments.length;
}
break;
case 'PLAYLIST-TYPE':
if (level.type) {
assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
}
level.type = value1.toUpperCase();
break;
case 'MEDIA-SEQUENCE':
if (level.startSN !== 0) {
assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
}
else if (prevFrag !== null) {
assignMustAppearBeforeSegmentsError(level, tag, result);
}
level.startSN = parseInt(value1);
currentSN = level.startSN + level.skippedSegments;
break;
case 'SKIP': {
if (level.skippedSegments) {
assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
}
var skipAttrs = new AttrList(value1, level);
var skippedSegments = skipAttrs.decimalInteger('SKIPPED-SEGMENTS');
if (Number.isFinite(skippedSegments)) {
level.skippedSegments += skippedSegments;
for (var i_1 = skippedSegments; i_1--;) {
fragments.push(null);
}
currentSN += skippedSegments;
}
var recentlyRemovedDateranges = skipAttrs.enumeratedString('RECENTLY-REMOVED-DATERANGES');
if (recentlyRemovedDateranges) {
level.recentlyRemovedDateranges = (level.recentlyRemovedDateranges || []).concat(recentlyRemovedDateranges.split('\t'));
}
break;
}
case 'TARGETDURATION':
if (level.targetduration !== 0) {
assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
}
level.targetduration = Math.max(parseInt(value1), 1);
break;
case 'VERSION':
if (level.version !== null) {
assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
}
level.version = parseInt(value1);
break;
case 'INDEPENDENT-SEGMENTS':
break;
case 'I-FRAMES-ONLY':
level.iframesOnly = true;
break;
case 'ENDLIST':
if (!level.live) {
assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
}
level.live = false;
break;
case '#':
if (value1 || value2) {
frag.tagList.push(value2 ? [value1, value2] : [value1]);
}
break;
case 'DISCONTINUITY':
discontinuityCounter++;
frag.tagList.push(['DIS']);
break;
case 'GAP':
frag.gap = true;
frag.tagList.push([tag]);
break;
case 'BITRATE':
frag.tagList.push([tag, value1]);
currentBitrate = parseInt(value1) * 1000;
if (Number.isFinite(currentBitrate)) {
frag.bitrate = currentBitrate;
}
else {
currentBitrate = 0;
}
break;
case 'DATERANGE': {
var dateRangeAttr = new AttrList(value1, level);
var dateRange = new DateRange(dateRangeAttr, level.dateRanges[dateRangeAttr.ID], level.dateRangeTagCount);
level.dateRangeTagCount++;
if (dateRange.isValid || level.skippedSegments) {
level.dateRanges[dateRange.id] = dateRange;
}
frag.tagList.push(['EXT-X-DATERANGE', value1]);
break;
}
case 'DEFINE': {
break;
}
case 'DISCONTINUITY-SEQUENCE':
if (level.startCC !== 0) {
assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
}
level.startCC = discontinuityCounter = parseInt(value1);
fragments.forEach(function (frag) { return frag && (frag.cc = discontinuityCounter); });
break;
case 'KEY': {
var levelKey = parseKey(value1, baseurl, level);
if (levelKey.isSupported()) {
if (levelKey.method === 'NONE') {
levelkeys = undefined;
break;
}
if (!levelkeys) {
levelkeys = {};
}
var currentKey = levelkeys[levelKey.keyFormat];
if (!(currentKey === null || currentKey === void 0 ? void 0 : currentKey.matches(levelKey))) {
if (currentKey) {
levelkeys = __bolli.assign({}, levelkeys);
}
levelkeys[levelKey.keyFormat] = levelKey;
}
}
else {
logger.warn("[Keys] Ignoring unsupported EXT-X-KEY tag: \"".concat(value1, "\"").concat(' (light build)'));
}
break;
}
case 'START':
level.startTimeOffset = parseStartTimeOffset(value1);
break;
case 'MAP': {
var mapAttrs = new AttrList(value1, level);
if (frag.duration) {
var init = new Fragment(type, base);
setInitSegment(init, mapAttrs, id, levelkeys);
currentInitSegment = init;
frag.initSegment = currentInitSegment;
if (currentInitSegment.rawProgramDateTime &&
!frag.rawProgramDateTime) {
frag.rawProgramDateTime = currentInitSegment.rawProgramDateTime;
}
}
else {
var end = frag.byteRangeEndOffset;
if (end) {
var start = frag.byteRangeStartOffset;
nextByteRange = "".concat(end - start, "@").concat(start);
}
else {
nextByteRange = null;
}
setInitSegment(frag, mapAttrs, id, levelkeys);
currentInitSegment = frag;
createNextFrag = true;
}
currentInitSegment.cc = discontinuityCounter;
break;
}
case 'SERVER-CONTROL': {
if (serverControlAttrs) {
assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
}
serverControlAttrs = new AttrList(value1);
level.canBlockReload = serverControlAttrs.bool('CAN-BLOCK-RELOAD');
level.canSkipUntil = serverControlAttrs.optionalFloat('CAN-SKIP-UNTIL', 0);
level.canSkipDateRanges =
level.canSkipUntil > 0 &&
serverControlAttrs.bool('CAN-SKIP-DATERANGES');
level.partHoldBack = serverControlAttrs.optionalFloat('PART-HOLD-BACK', 0);
level.holdBack = serverControlAttrs.optionalFloat('HOLD-BACK', 0);
break;
}
case 'PART-INF': {
if (level.partTarget) {
assignMultipleMediaPlaylistTagOccuranceError(level, tag, result);
}
var partInfAttrs = new AttrList(value1);
level.partTarget = partInfAttrs.decimalFloatingPoint('PART-TARGET');
break;
}
case 'PART': {
var partList = level.partList;
if (!partList) {
partList = level.partList = [];
}
var previousPart = currentPart > 0 ? partList[partList.length - 1] : undefined;
var index = currentPart++;
var partAttrs = new AttrList(value1, level);
var part = new Part(partAttrs, frag, base, index, previousPart);
partList.push(part);
frag.duration += part.duration;
break;
}
case 'PRELOAD-HINT': {
var preloadHintAttrs = new AttrList(value1, level);
level.preloadHint = preloadHintAttrs;
break;
}
case 'RENDITION-REPORT': {
var renditionReportAttrs = new AttrList(value1, level);
level.renditionReports = level.renditionReports || [];
level.renditionReports.push(renditionReportAttrs);
break;
}
default:
logger.warn("line parsed but not handled: ".concat(result));
break;
}
}
}
if (prevFrag && !prevFrag.relurl) {
fragments.pop();
totalduration -= prevFrag.duration;
if (level.partList) {
level.fragmentHint = prevFrag;
}
}
else if (level.partList) {
assignProgramDateTime(frag, prevFrag, programDateTimes);
frag.cc = discontinuityCounter;
level.fragmentHint = frag;
if (levelkeys) {
setFragLevelKeys(frag, levelkeys, level);
}
}
if (!level.targetduration) {
level.playlistParsingError = new Error("Missing Target Duration");
}
var fragmentLength = fragments.length;
var firstFragment = fragments[0];
var lastFragment = fragments[fragmentLength - 1];
totalduration += level.skippedSegments * level.targetduration;
if (totalduration > 0 && fragmentLength && lastFragment) {
level.averagetargetduration = totalduration / fragmentLength;
var lastSn = lastFragment.sn;
level.endSN = lastSn !== 'initSegment' ? lastSn : 0;
if (!level.live) {
lastFragment.endList = true;
}
if (firstPdtIndex > 0) {
backfillProgramDateTimes(fragments, firstPdtIndex, firstPdtIndex > fragmentLength - 1 ? frag : null);
if (firstFragment) {
programDateTimes.unshift(firstFragment);
}
}
}
if (level.fragmentHint) {
totalduration += level.fragmentHint.duration;
}
level.totalduration = totalduration;
if (programDateTimes.length && level.dateRangeTagCount && firstFragment) {
mapDateRanges(programDateTimes, level);
}
level.endCC = discontinuityCounter;
return level;
};
return M3U8Parser;
}());
function createVariant(attrs, tUri, baseurl, parsed, levelsWithKnownCodecs, iframes) {
var _a;
if (tUri === undefined) {
return null;
}
var uri = tUri;
var level = {
attrs: attrs,
bitrate: attrs.decimalInteger('BANDWIDTH') ||
attrs.decimalInteger('AVERAGE-BANDWIDTH'),
name: attrs.NAME,
url: M3U8Parser.resolve(uri, baseurl),
};
var resolution = attrs.decimalResolution('RESOLUTION');
if (resolution) {
level.width = resolution.width;
level.height = resolution.height;
}
setCodecs(attrs.CODECS, level);
var supplementalCodecs = attrs['SUPPLEMENTAL-CODECS'];
if (supplementalCodecs) {
level.supplemental = {};
setCodecs(supplementalCodecs, level.supplemental);
}
if (!((_a = level.unknownCodecs) === null || _a === void 0 ? void 0 : _a.length)) {
levelsWithKnownCodecs.push(level);
}
if (iframes) {
level.iframes = true;
}
return level;
}
function mapDateRanges(programDateTimes, details) {
var _a;
var programDateTimeCount = programDateTimes.length;
if (!programDateTimeCount) {
if (details.hasProgramDateTime) {
var lastFragment = details.fragments[details.fragments.length - 1];
programDateTimes.push(lastFragment);
programDateTimeCount++;
}
else {
return;
}
}
var lastProgramDateTime = programDateTimes[programDateTimeCount - 1];
var playlistEnd = details.live ? Infinity : details.totalduration;
var dateRangeIds = Object.keys(details.dateRanges);
for (var i = dateRangeIds.length; i--;) {
var dateRange = details.dateRanges[dateRangeIds[i]];
var startDateTime = dateRange.startDate.getTime();
dateRange.tagAnchor = lastProgramDateTime.ref;
for (var j = programDateTimeCount; j--;) {
if (((_a = programDateTimes[j]) === null || _a === void 0 ? void 0 : _a.sn) < details.startSN) {
break;
}
var fragment = findFragmentWithStartDate(details, startDateTime, programDateTimes, j, playlistEnd);
if (fragment) {
dateRange.tagAnchor = fragment.ref;
break;
}
}
}
}
function findFragmentWithStartDate(details, startDateTime, programDateTimes, index, endTime) {
var _a;
var pdtFragment = programDateTimes[index];
if (pdtFragment) {
var pdtStart = pdtFragment.programDateTime;
if (startDateTime >= pdtStart || index === 0) {
var durationBetweenPdt = (((_a = programDateTimes[index + 1]) === null || _a === void 0 ? void 0 : _a.start) || endTime) - pdtFragment.start;
if (startDateTime <= pdtStart + durationBetweenPdt * 1000) {
var startIndex = pdtFragment.sn - details.startSN;
var fragments = details.fragments;
if (startIndex >= 0 && startIndex < fragments.length) {
if (fragments.length > programDateTimes.length) {
var endSegment = programDateTimes[index + 1] || fragments[fragments.length - 1];
var endIndex = Math.min(endSegment.sn - details.startSN, fragments.length - 1);
for (var i = endIndex; i > startIndex; i--) {
var fragStartDateTime = fragments[i].programDateTime;
if (startDateTime >= fragStartDateTime &&
startDateTime < fragStartDateTime + fragments[i].duration * 1000) {
return fragments[i];
}
}
}
return fragments[startIndex];
}
}
}
}
return null;
}
function parseKey(keyTagAttributes, baseurl, parsed) {
var _a, _b;
var keyAttrs = new AttrList(keyTagAttributes, parsed);
var decryptmethod = (_a = keyAttrs.METHOD) !== null && _a !== void 0 ? _a : '';
var decrypturi = keyAttrs.URI;
var decryptiv = keyAttrs.hexadecimalInteger('IV');
var decryptkeyformatversions = keyAttrs.KEYFORMATVERSIONS;
var decryptkeyformat = (_b = keyAttrs.KEYFORMAT) !== null && _b !== void 0 ? _b : 'identity';
if (decrypturi && keyAttrs.IV && !decryptiv) {
logger.error("Invalid IV: ".concat(keyAttrs.IV));
}
var resolvedUri = decrypturi ? M3U8Parser.resolve(decrypturi, baseurl) : '';
var keyFormatVersions = __bolli.any_filter(__bolli.any_map((decryptkeyformatversions ? decryptkeyformatversions : '1')
.split('/'), Number), Number.isFinite);
return new LevelKey(decryptmethod, resolvedUri, decryptkeyformat, keyFormatVersions, decryptiv, keyAttrs.KEYID);
}
function parseStartTimeOffset(startAttributes) {
var startAttrs = new AttrList(startAttributes);
var startTimeOffset = startAttrs.decimalFloatingPoint('TIME-OFFSET');
if (Number.isFinite(startTimeOffset)) {
return startTimeOffset;
}
return null;
}
function setCodecs(codecsAttributeValue, level) {
var codecs = (codecsAttributeValue || '').split(/[ ,]+/).filter(function (c) { return c; });
['video', 'audio', 'text', 'image'].forEach(function (type) {
var filtered = codecs.filter(function (codec) { return isCodecType(codec, type); });
if (filtered.length) {
level["".concat(type, "Codec")] = filtered.map(function (c) { return c.split('/')[0]; }).join(',');
codecs = codecs.filter(function (codec) { return filtered.indexOf(codec) === -1; });
}
});
level.unknownCodecs = codecs;
}
function assignCodec(media, groupItem, codecProperty) {
var codecValue = groupItem[codecProperty];
if (codecValue) {
media[codecProperty] = codecValue;
}
}
function backfillProgramDateTimes(fragments, firstPdtIndex, fragPrev) {
fragPrev || (fragPrev = fragments[firstPdtIndex]);
if (!fragPrev) {
return;
}
for (var i = firstPdtIndex; i--;) {
var frag = fragments[i];
if (!frag) {
return;
}
frag.programDateTime =
fragPrev.programDateTime - frag.duration * 1000;
fragPrev = frag;
}
}
function assignProgramDateTime(frag, prevFrag, programDateTimes) {
if (frag.rawProgramDateTime) {
programDateTimes.push(frag);
}
else if (prevFrag === null || prevFrag === void 0 ? void 0 : prevFrag.programDateTime) {
frag.programDateTime = prevFrag.endProgramDateTime;
}
}
function setInitSegment(frag, mapAttrs, id, levelkeys) {
frag.relurl = mapAttrs.URI;
if (mapAttrs.BYTERANGE) {
frag.setByteRange(mapAttrs.BYTERANGE);
}
frag.level = id;
frag.sn = 'initSegment';
if (levelkeys) {
frag.levelkeys = levelkeys;
}
frag.initSegment = null;
}
function setFragLevelKeys(frag, levelkeys, level) {
frag.levelkeys = levelkeys;
var encryptedFragments = level.encryptedFragments;
if ((!encryptedFragments.length ||
encryptedFragments[encryptedFragments.length - 1].levelkeys !==
levelkeys) &&
Object.keys(levelkeys).some(function (format) { return levelkeys[format].isCommonEncryption; })) {
encryptedFragments.push(frag);
}
}
function assignMultipleMediaPlaylistTagOccuranceError(level, tag, result) {
level.playlistParsingError = new Error("#EXT-X-".concat(tag, " must not appear more than once (").concat(result[0], ")"));
}
function assignMustAppearBeforeSegmentsError(level, tag, result) {
level.playlistParsingError = new Error("#EXT-X-".concat(tag, " must appear before the first Media Segment (").concat(result[0], ")"));
}
function updateFromToPTS(fragFrom, fragTo) {
var fragToPTS = fragTo.startPTS;
if (Number.isFinite(fragToPTS)) {
var duration = 0;
var frag = void 0;
if (fragTo.sn > fragFrom.sn) {
duration = fragToPTS - fragFrom.start;
frag = fragFrom;
}
else {
duration = fragFrom.start - fragToPTS;
frag = fragTo;
}
if (frag.duration !== duration) {
frag.setDuration(duration);
}
}
else if (fragTo.sn > fragFrom.sn) {
var contiguous = fragFrom.cc === fragTo.cc;
if (contiguous && fragFrom.minEndPTS) {
fragTo.setStart(fragFrom.start + (fragFrom.minEndPTS - fragFrom.start));
}
else {
fragTo.setStart(fragFrom.start + fragFrom.duration);
}
}
else {
fragTo.setStart(Math.max(fragFrom.start - fragTo.duration, 0));
}
}
function updateFragPTSDTS(details, frag, startPTS, endPTS, startDTS, endDTS, iframesOnly, logger) {
var parsedMediaDuration = endPTS - startPTS;
if (parsedMediaDuration <= 0) {
logger.warn('Fragment should have a positive duration', frag);
endPTS = startPTS + frag.duration;
endDTS = startDTS + frag.duration;
}
var maxStartPTS = startPTS;
var minEndPTS = endPTS;
var fragStartPts = frag.startPTS;
var fragEndPts = frag.endPTS;
if (Number.isFinite(fragStartPts)) {
var deltaPTS = Math.abs(fragStartPts - startPTS);
if (details && deltaPTS > details.totalduration) {
logger.warn("media timestamps and playlist times differ by ".concat(deltaPTS, "s for level ").concat(frag.level, " ").concat(details.url));
}
else if (!Number.isFinite(frag.deltaPTS)) {
frag.deltaPTS = deltaPTS;
}
else {
frag.deltaPTS = Math.max(deltaPTS, frag.deltaPTS);
}
maxStartPTS = Math.max(startPTS, fragStartPts);
startPTS = Math.min(startPTS, fragStartPts);
startDTS =
frag.startDTS !== undefined
? Math.min(startDTS, frag.startDTS)
: startDTS;
minEndPTS = Math.min(endPTS, fragEndPts);
endPTS = Math.max(endPTS, fragEndPts);
endDTS = frag.endDTS !== undefined ? Math.max(endDTS, frag.endDTS) : endDTS;
}
var drift = startPTS - frag.start;
if (frag.start !== 0) {
frag.setStart(startPTS);
}
frag.setDuration(endPTS - frag.start);
frag.startPTS = startPTS;
frag.maxStartPTS = maxStartPTS;
frag.startDTS = startDTS;
frag.endPTS = endPTS;
frag.minEndPTS = minEndPTS;
frag.endDTS = endDTS;
return alignSliding(details, frag, drift);
}
function alignSliding(details, frag, drift) {
var _a;
var sn = frag.sn;
if (!details ||
sn < details.startSN ||
sn > (((_a = details.fragmentHint) === null || _a === void 0 ? void 0 : _a.sn) || details.endSN)) {
return 0;
}
var i;
var fragIdx = sn - details.startSN;
var fragments = details.fragments;
fragments[fragIdx] = frag;
for (i = fragIdx; i > 0; i--) {
updateFromToPTS(fragments[i], fragments[i - 1]);
}
for (i = fragIdx; i < fragments.length - 1; i++) {
updateFromToPTS(fragments[i], fragments[i + 1]);
}
if (details.fragmentHint) {
updateFromToPTS(fragments[fragments.length - 1], details.fragmentHint);
}
details.PTSKnown = details.alignedSliding = true;
return drift;
}
function mergeDetails(oldDetails, newDetails, logger) {
var _a;
if (oldDetails === newDetails) {
return;
}
var currentInitSegment = null;
var oldFragments = oldDetails.fragments;
for (var i = oldFragments.length - 1; i >= 0; i--) {
var oldInit = oldFragments[i].initSegment;
if (oldInit) {
currentInitSegment = oldInit;
break;
}
}
if (oldDetails.fragmentHint) {
delete oldDetails.fragmentHint.endPTS;
}
var PTSFrag;
mapFragmentIntersection(oldDetails, newDetails, function (oldFrag, newFrag, newFragIndex, newFragments) {
if (newFrag.cc !== oldFrag.cc &&
(oldFrag.cc > newFrag.cc || newDetails.skippedSegments)) {
var ccOffset = oldFrag.cc - newFrag.cc;
for (var i = newFragIndex; i < newFragments.length; i++) {
newFragments[i].cc += ccOffset;
}
newDetails.endCC = newFragments[newFragments.length - 1].cc;
}
if (Number.isFinite(oldFrag.startPTS) &&
Number.isFinite(oldFrag.endPTS)) {
newFrag.setStart((newFrag.startPTS = oldFrag.startPTS));
newFrag.startDTS = oldFrag.startDTS;
newFrag.maxStartPTS = oldFrag.maxStartPTS;
newFrag.endPTS = oldFrag.endPTS;
newFrag.endDTS = oldFrag.endDTS;
newFrag.minEndPTS = oldFrag.minEndPTS;
newFrag.setDuration(oldFrag.endPTS - oldFrag.startPTS);
if (newFrag.duration) {
PTSFrag = newFrag;
}
newDetails.PTSKnown = newDetails.alignedSliding = true;
}
if (oldFrag.hasStreams) {
newFrag.elementaryStreams = oldFrag.elementaryStreams;
}
newFrag.loader = oldFrag.loader;
newFrag.gap = oldFrag.gap || newFrag.gap;
if (oldFrag.hasStats) {
newFrag.stats = oldFrag.stats;
}
if (oldFrag.initSegment) {
newFrag.initSegment = oldFrag.initSegment;
currentInitSegment = oldFrag.initSegment;
}
});
var newFragments = newDetails.fragments;
var fragmentsToCheck = newDetails.fragmentHint
? newFragments.concat(newDetails.fragmentHint)
: newFragments;
if (currentInitSegment) {
fragmentsToCheck.forEach(function (frag) {
if (frag &&
(!frag.initSegment ||
frag.initSegment.relurl === (currentInitSegment === null || currentInitSegment === void 0 ? void 0 : currentInitSegment.relurl))) {
frag.initSegment = currentInitSegment;
}
});
}
if (newDetails.skippedSegments) {
newDetails.deltaUpdateFailed = newFragments.some(function (frag) { return !frag; });
if (newDetails.deltaUpdateFailed) {
logger.warn('[level-helper] Previous playlist missing segments skipped in delta playlist');
for (var i = newDetails.skippedSegments; i--;) {
newFragments.shift();
}
newDetails.startSN = newFragments[0].sn;
}
else {
if (newDetails.canSkipDateRanges) {
newDetails.dateRanges = mergeDateRanges(oldDetails.dateRanges, newDetails, logger);
}
var programDateTimes = oldDetails.fragments.filter(function (frag) { return frag.rawProgramDateTime; });
if (oldDetails.hasProgramDateTime && !newDetails.hasProgramDateTime) {
for (var i = 1; i < fragmentsToCheck.length; i++) {
if (fragmentsToCheck[i].programDateTime === null) {
assignProgramDateTime(fragmentsToCheck[i], fragmentsToCheck[i - 1], programDateTimes);
}
}
}
mapDateRanges(programDateTimes, newDetails);
}
newDetails.endCC = newFragments[newFragments.length - 1].cc;
}
else if (newDetails.startSN > oldDetails.endSN &&
newFragments[0].cc < oldDetails.endCC) {
var ccOffset_1 = oldDetails.endCC - newFragments[0].cc;
fragmentsToCheck.forEach(function (frag) {
frag.cc += ccOffset_1;
});
newDetails.endCC += ccOffset_1;
}
if (!newDetails.startCC) {
var fragPriorToNewStart = getFragmentWithSN(oldDetails, newDetails.startSN - 1);
newDetails.startCC = (_a = fragPriorToNewStart === null || fragPriorToNewStart === void 0 ? void 0 : fragPriorToNewStart.cc) !== null && _a !== void 0 ? _a : newFragments[0].cc;
}
mapPartIntersection(oldDetails.partList, newDetails.partList, function (oldPart, newPart) {
newPart.elementaryStreams = oldPart.elementaryStreams;
newPart.stats = oldPart.stats;
newPart.gap = oldPart.gap || newPart.gap;
});
if (PTSFrag) {
var iframesOnly = newDetails.iframesOnly && PTSFrag.type === PlaylistLevelType.MAIN;
updateFragPTSDTS(newDetails, PTSFrag, PTSFrag.startPTS, PTSFrag.endPTS, PTSFrag.startDTS, PTSFrag.endDTS, iframesOnly, logger);
}
else {
adjustSliding(oldDetails, newDetails);
}
if (newFragments.length) {
newDetails.totalduration = newDetails.edge - newFragments[0].start;
}
newDetails.driftStartTime = oldDetails.driftStartTime;
newDetails.driftStart = oldDetails.driftStart;
var advancedDateTime = newDetails.advancedDateTime;
if (newDetails.advanced && advancedDateTime) {
var edge = newDetails.edge;
if (!newDetails.driftStart) {
newDetails.driftStartTime = advancedDateTime;
newDetails.driftStart = edge;
}
newDetails.driftEndTime = advancedDateTime;
newDetails.driftEnd = edge;
}
else {
newDetails.driftEndTime = oldDetails.driftEndTime;
newDetails.driftEnd = oldDetails.driftEnd;
newDetails.advancedDateTime = oldDetails.advancedDateTime;
}
if (newDetails.requestScheduled === -1) {
newDetails.requestScheduled = oldDetails.requestScheduled;
}
}
function mergeDateRanges(oldDateRanges, newDetails, logger) {
var deltaDateRanges = newDetails.dateRanges, recentlyRemovedDateranges = newDetails.recentlyRemovedDateranges;
var dateRanges = __bolli.assign({}, oldDateRanges);
if (recentlyRemovedDateranges) {
recentlyRemovedDateranges.forEach(function (id) {
delete dateRanges[id];
});
}
var mergeIds = Object.keys(dateRanges);
var mergeCount = mergeIds.length;
if (!mergeCount) {
return deltaDateRanges;
}
Object.keys(deltaDateRanges).forEach(function (id) {
var mergedDateRange = dateRanges[id];
var dateRange = new DateRange(deltaDateRanges[id].attr, mergedDateRange);
if (dateRange.isValid) {
dateRanges[id] = dateRange;
if (!mergedDateRange) {
dateRange.tagOrder += mergeCount;
}
}
else {
logger.warn("Ignoring invalid Playlist Delta Update DATERANGE tag: \"".concat(stringify(deltaDateRanges[id].attr), "\""));
}
});
return dateRanges;
}
function mapPartIntersection(oldParts, newParts, intersectionFn) {
if (oldParts && newParts) {
var delta = 0;
for (var i = 0, len = oldParts.length; i < len; i++) {
var oldPart = oldParts[i];
var newPart = newParts[i + delta];
if (oldPart &&
newPart &&
oldPart.index === newPart.index &&
oldPart.fragment.sn === newPart.fragment.sn) {
intersectionFn(oldPart, newPart);
}
else {
delta--;
}
}
}
}
function mapFragmentIntersection(oldDetails, newDetails, intersectionFn) {
var _a;
var skippedSegments = newDetails.skippedSegments;
var start = Math.max(oldDetails.startSN, newDetails.startSN) - newDetails.startSN;
var end = (oldDetails.fragmentHint ? 1 : 0) +
(skippedSegments
? newDetails.endSN
: Math.min(oldDetails.endSN, newDetails.endSN)) -
newDetails.startSN;
var delta = newDetails.startSN - oldDetails.startSN;
var newFrags = newDetails.fragmentHint
? newDetails.fragments.concat(newDetails.fragmentHint)
: newDetails.fragments;
var oldFrags = ((_a = oldDetails.fragmentHint) === null || _a === void 0 ? void 0 : _a.duration)
? oldDetails.fragments.concat(oldDetails.fragmentHint)
: oldDetails.fragments;
for (var i = start; i <= end; i++) {
var oldFrag = oldFrags[delta + i];
var newFrag = newFrags[i];
if (skippedSegments && !newFrag && oldFrag) {
newFrag = newDetails.fragments[i] = oldFrag;
}
if (oldFrag && newFrag) {
intersectionFn(oldFrag, newFrag, i, newFrags);
var uriBefore = oldFrag.relurl;
var uriAfter = newFrag.relurl;
if (uriBefore && notEqualAfterStrippingQueries(uriBefore, uriAfter)) {
newDetails.playlistParsingError = getSequenceError("media sequence mismatch ".concat(newFrag.sn, ":"), oldDetails, newDetails, oldFrag, newFrag);
return;
}
else if (oldFrag.cc !== newFrag.cc) {
newDetails.playlistParsingError = getSequenceError("discontinuity sequence mismatch (".concat(oldFrag.cc, "!=").concat(newFrag.cc, ")"), oldDetails, newDetails, oldFrag, newFrag);
return;
}
}
}
}
function getSequenceError(message, oldDetails, newDetails, oldFrag, newFrag) {
return new Error("".concat(message, " ").concat(newFrag.url, "\nPlaylist starting @").concat(oldDetails.startSN, "\n").concat(oldDetails.m3u8, "\n\nPlaylist starting @").concat(newDetails.startSN, "\n").concat(newDetails.m3u8));
}
function adjustSliding(oldDetails, newDetails, matchingStableVariantOrRendition, logger) {
if (matchingStableVariantOrRendition === void 0) { matchingStableVariantOrRendition = true; }
var delta = newDetails.startSN + newDetails.skippedSegments - oldDetails.startSN;
var oldFragments = oldDetails.fragments;
var advancedOrStable = delta >= 0;
var sliding = 0;
if (advancedOrStable && delta < oldFragments.length) {
sliding = oldFragments[delta].start;
}
else if (advancedOrStable && newDetails.startSN === oldDetails.endSN + 1) {
sliding = oldDetails.fragmentEnd;
}
else if (advancedOrStable && matchingStableVariantOrRendition) {
sliding = oldDetails.fragmentStart + delta * newDetails.levelTargetDuration;
}
else if (!newDetails.skippedSegments && newDetails.fragmentStart === 0) {
sliding = oldDetails.fragmentStart;
}
else {
return sliding;
}
addSliding(newDetails, sliding);
return sliding;
}
function addSliding(details, sliding) {
if (sliding) {
var fragments = details.fragments;
for (var i = details.skippedSegments; i < fragments.length; i++) {
fragments[i].addStart(sliding);
}
if (details.fragmentHint) {
details.fragmentHint.addStart(sliding);
}
}
}
function computeReloadInterval(newDetails, distanceToLiveEdgeMs) {
if (distanceToLiveEdgeMs === void 0) { distanceToLiveEdgeMs = Infinity; }
var reloadInterval = 1000 * newDetails.targetduration;
if (newDetails.updated) {
var fragments = newDetails.fragments;
var liveEdgeMaxTargetDurations = 4;
if (fragments.length &&
reloadInterval * liveEdgeMaxTargetDurations > distanceToLiveEdgeMs) {
var lastSegmentDuration = fragments[fragments.length - 1].duration * 1000;
if (lastSegmentDuration > 0 && lastSegmentDuration < reloadInterval) {
reloadInterval = lastSegmentDuration;
}
}
}
else {
reloadInterval /= 2;
}
return Math.round(reloadInterval);
}
function getFragmentWithSN(details, sn, fragCurrent) {
if (!details) {
return null;
}
var fragment = details.fragments[sn - details.startSN];
if (fragment) {
return fragment;
}
fragment = details.fragmentHint;
if ((fragment === null || fragment === void 0 ? void 0 : fragment.sn) === sn) {
return fragment;
}
if (fragCurrent && sn < details.startSN && fragCurrent.sn === sn) {
return fragCurrent;
}
return null;
}
function getPartWith(details, sn, partIndex) {
if (!details) {
return null;
}
return findPart(details.partList, sn, partIndex);
}
function findPart(partList, sn, partIndex) {
if (partList) {
for (var i = partList.length; i--;) {
var part = partList[i];
if (part.index === partIndex && part.fragment.sn === sn) {
return part;
}
}
}
return null;
}
function reassignFragmentLevelIndexes(levels) {
levels.forEach(function (level, index) {
var _a;
(_a = level.details) === null || _a === void 0 ? void 0 : _a.fragments.forEach(function (fragment) {
fragment.level = index;
if (fragment.initSegment) {
fragment.initSegment.level = index;
}
});
});
}
function notEqualAfterStrippingQueries(uriBefore, uriAfter) {
if (uriBefore !== uriAfter && uriAfter) {
return stripQuery(uriBefore) !== stripQuery(uriAfter);
}
return false;
}
function stripQuery(uri) {
return uri.replace(/\?[^?]*$/, '');
}
function findFirstFragWithCC(fragments, cc) {
var _a;
for (var i = 0, len = fragments.length; i < len; i++) {
if (((_a = fragments[i]) === null || _a === void 0 ? void 0 : _a.cc) === cc) {
return fragments[i];
}
}
return null;
}
function shouldAlignOnDiscontinuities(refDetails, details) {
if (refDetails) {
if (details.startCC < refDetails.endCC &&
details.endCC > refDetails.startCC) {
return true;
}
}
return false;
}
function adjustFragmentStart(frag, sliding) {
var start = frag.start + sliding;
frag.setStart(start);
}
function adjustSlidingStart(sliding, details) {
var fragments = details.fragments;
for (var i = 0, len = fragments.length; i < len; i++) {
adjustFragmentStart(fragments[i], sliding);
}
if (details.fragmentHint) {
adjustFragmentStart(details.fragmentHint, sliding);
}
details.alignedSliding = true;
}
function alignStream(switchDetails, details, logger) {
if (!switchDetails) {
return;
}
alignDiscontinuities(details, switchDetails);
if (!details.alignedSliding) {
alignMediaPlaylistByPDT(details, switchDetails);
}
if (!details.alignedSliding && !details.skippedSegments) {
adjustSliding(switchDetails, details, false);
}
}
function alignDiscontinuities(details, refDetails, logger) {
if (!shouldAlignOnDiscontinuities(refDetails, details)) {
return;
}
var targetCC = Math.min(refDetails.endCC, details.endCC);
var refFrag = findFirstFragWithCC(refDetails.fragments, targetCC);
var frag = findFirstFragWithCC(details.fragments, targetCC);
if (!refFrag || !frag) {
return;
}
var delta = refFrag.start - frag.start;
adjustSlidingStart(delta, details);
}
function alignMediaPlaylistByPDT(details, refDetails, logger) {
if (!details.hasProgramDateTime || !refDetails.hasProgramDateTime) {
return;
}
var fragments = details.fragments;
var refFragments = refDetails.fragments;
if (!fragments.length || !refFragments.length) {
return;
}
var refFrag;
var frag;
var targetCC = Math.min(refDetails.endCC, details.endCC);
if (refDetails.startCC < targetCC && details.startCC < targetCC) {
refFrag = findFirstFragWithCC(refFragments, targetCC);
frag = findFirstFragWithCC(fragments, targetCC);
}
if (!refFrag || !frag) {
refFrag =
refFragments[Math.floor(refFragments.length / 2)] ||
refFragments.filter(function (f) { return !!f; })[0];
frag =
findFirstFragWithCC(fragments, refFrag.cc) ||
fragments[Math.floor(fragments.length / 2)];
}
var refPDT = refFrag.programDateTime;
var targetPDT = frag.programDateTime;
if (!refPDT || !targetPDT) {
return;
}
var dateDifference = (targetPDT - refPDT) / 1000;
if (Math.abs(dateDifference) > Math.max(60, details.totalduration)) {
return;
}
var delta = dateDifference - (frag.start - refFrag.start);
adjustSlidingStart(delta, details);
}
function isFullSegmentEncryption(method) {
return (method === 'AES-128' || method === 'AES-256' || method === 'AES-256-CTR');
}
function getAesModeFromFullSegmentMethod(method) {
switch (method) {
case 'AES-128':
case 'AES-256':
return 0;
case 'AES-256-CTR':
return 1;
default:
throw new Error("invalid full segment method ".concat(method));
}
}
var State = {
STOPPED: 'STOPPED',
IDLE: 'IDLE',
KEY_LOADING: 'KEY_LOADING',
FRAG_LOADING: 'FRAG_LOADING',
FRAG_LOADING_WAITING_RETRY: 'FRAG_LOADING_WAITING_RETRY',
WAITING_TRACK: 'WAITING_TRACK',
PARSING: 'PARSING',
PARSED: 'PARSED',
ENDED: 'ENDED',
ERROR: 'ERROR',
WAITING_INIT_PTS: 'WAITING_INIT_PTS',
WAITING_LEVEL: 'WAITING_LEVEL',
};
var BaseStreamController = (function (_super) {
__extends(BaseStreamController, _super);
function BaseStreamController(hls, fragmentTracker, keyLoader, logPrefix, playlistType) {
var _this = _super.call(this, logPrefix, hls.logger) || this;
_this.fragPrevious = null;
_this.fragCurrent = null;
_this.fragPlaying = null;
_this.transmuxer = null;
_this._state = State.STOPPED;
_this.media = null;
_this.mediaBuffer = null;
_this.bitrateTest = false;
_this.lastCurrentTime = 0;
_this.nextLoadPosition = 0;
_this.startPosition = -1;
_this.startTimeOffset = null;
_this.retryDate = 0;
_this.levels = null;
_this.levelLastLoaded = null;
_this.startFragRequested = false;
_this.initPTS = [];
_this.buffering = true;
_this.loadingParts = false;
_this.onMediaSeeking = function () {
var _a;
var _b = _this, config = _b.config, fragCurrent = _b.fragCurrent, media = _b.media, mediaBuffer = _b.mediaBuffer; _b.state;
var currentTime = media ? media.currentTime : 0;
var bufferInfo = BufferHelper.bufferInfo(mediaBuffer ? mediaBuffer : media, currentTime, config.maxBufferHole);
var fowardBuffer = bufferInfo.len;
if (_this.state === State.ENDED) {
_this.resetLoadingState();
}
else if (fragCurrent) {
var tolerance = config.maxFragLookUpTolerance;
var fragStartOffset = fragCurrent.start - tolerance;
var fragEndOffset = fragCurrent.start + fragCurrent.duration + tolerance;
if (!fowardBuffer ||
fragEndOffset < bufferInfo.start ||
fragStartOffset > bufferInfo.end) {
var beforeFragment = currentTime < fragStartOffset;
var pastFragment = currentTime > fragEndOffset;
if (beforeFragment || pastFragment) {
if (fragCurrent.loader &&
(pastFragment || !_this.isFragmentNearlyDownloaded(fragCurrent))) {
fragCurrent.abortRequests();
_this.resetLoadingState();
}
else {
_this.fragPrevious = null;
}
}
}
}
if (media) {
if (((_a = _this.hls) === null || _a === void 0 ? void 0 : _a.hasEnoughToStart) &&
!fowardBuffer &&
currentTime !== _this.startPosition) {
_this.fragmentTracker.removeFragmentsInRange(currentTime, Infinity, _this.playlistType, true);
}
var lastCurrentTime = _this.lastCurrentTime;
if (currentTime > lastCurrentTime) {
_this.lastCurrentTime = currentTime;
}
if (!_this.loadingParts) {
var bufferEnd = Math.max(bufferInfo.end, currentTime);
var shouldLoadParts = _this.shouldLoadParts(_this.getLevelDetails(), bufferEnd);
if (shouldLoadParts) {
_this.loadingParts = shouldLoadParts;
}
}
}
var bufferEmpty = !BufferHelper.isBuffered(media, currentTime);
if (!_this.hls.hasEnoughToStart || bufferEmpty) {
_this.nextLoadPosition = currentTime;
if (bufferEmpty) {
_this.startPosition = currentTime;
}
else {
_this.lastCurrentTime = currentTime;
}
}
if (fowardBuffer < 1 && _this.state === State.IDLE) {
_this.tickImmediate();
}
};
_this.onMediaEnded = function () {
_this.startPosition = _this.nextLoadPosition = _this.lastCurrentTime = 0;
};
_this.playlistType = playlistType;
_this.hls = hls;
_this.fragmentLoader = new FragmentLoader(hls.config);
_this.initFragmentLoader = new FragmentLoader(hls.config);
_this.keyLoader = keyLoader;
_this.fragmentTracker = fragmentTracker;
_this.config = hls.config;
_this.decrypter = new Decrypter(hls.config);
return _this;
}
BaseStreamController.prototype.registerListeners = function () {
var hls = this.hls;
hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
hls.on(Events.ERROR, this.onError, this);
};
BaseStreamController.prototype.unregisterListeners = function () {
var hls = this.hls;
hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
hls.off(Events.ERROR, this.onError, this);
};
BaseStreamController.prototype.doTick = function () { };
BaseStreamController.prototype.onTickEnd = function () {
var media = this.media;
if ((media === null || media === void 0 ? void 0 : media.readyState) && media.seeking === false) {
this.lastCurrentTime = media.currentTime;
}
};
BaseStreamController.prototype.startLoad = function (startPosition) { };
BaseStreamController.prototype.stopLoad = function () {
if (this.state === State.STOPPED) {
return;
}
this.fragmentLoader.abort();
this.initFragmentLoader.abort();
this.keyLoader.abort(this.playlistType);
var frag = this.fragCurrent;
if (frag === null || frag === void 0 ? void 0 : frag.loader) {
frag.abortRequests();
this.fragmentTracker.removeFragment(frag);
}
this.resetTransmuxer();
this.fragCurrent = null;
this.fragPrevious = null;
this.clearInterval();
this.clearNextTick();
this.state = State.STOPPED;
};
Object.defineProperty(BaseStreamController.prototype, "startPositionValue", {
get: function () {
var _a = this, nextLoadPosition = _a.nextLoadPosition, startPosition = _a.startPosition;
if (startPosition === -1 && nextLoadPosition) {
var details = this.getLevelDetails();
if (details === null || details === void 0 ? void 0 : details.live) {
var liveSyncPosition = this.hls.liveSyncPosition;
var liveStart = liveSyncPosition || details.fragmentStart;
return liveStart + this.timelineOffset;
}
return nextLoadPosition;
}
return startPosition;
},
enumerable: false,
configurable: true
});
Object.defineProperty(BaseStreamController.prototype, "bufferingEnabled", {
get: function () {
return this.buffering;
},
enumerable: false,
configurable: true
});
Object.defineProperty(BaseStreamController.prototype, "backtrackFragment", {
get: function () {
return undefined;
},
set: function (_value) { },
enumerable: false,
configurable: true
});
Object.defineProperty(BaseStreamController.prototype, "couldBacktrack", {
get: function () {
return false;
},
set: function (_value) { },
enumerable: false,
configurable: true
});
BaseStreamController.prototype.pauseBuffering = function () {
this.buffering = false;
};
BaseStreamController.prototype.resumeBuffering = function () {
this.buffering = true;
};
Object.defineProperty(BaseStreamController.prototype, "inFlightFrag", {
get: function () {
return { frag: this.fragCurrent, state: this.state };
},
enumerable: false,
configurable: true
});
BaseStreamController.prototype._streamEnded = function (bufferInfo, levelDetails) {
if (levelDetails.live || !this.media) {
return false;
}
var bufferEnd = bufferInfo.end || 0;
var timelineStart = this.config.timelineOffset || 0;
if (bufferEnd <= timelineStart) {
return false;
}
var bufferedRanges = bufferInfo.buffered;
if (this.config.maxBufferHole &&
bufferedRanges &&
bufferedRanges.length > 1) {
bufferInfo = BufferHelper.bufferedInfo(bufferedRanges, bufferInfo.start, 0);
}
var nextStart = bufferInfo.nextStart;
var hasSecondBufferedRange = nextStart && nextStart > timelineStart && nextStart < levelDetails.edge;
if (hasSecondBufferedRange) {
return false;
}
if (this.media.currentTime < bufferInfo.start) {
return false;
}
var partList = levelDetails.partList;
if (partList === null || partList === void 0 ? void 0 : partList.length) {
var lastPart = partList[partList.length - 1];
var lastPartBuffered = BufferHelper.isBuffered(this.media, lastPart.start + lastPart.duration / 2);
return lastPartBuffered;
}
var lastFragment = levelDetails.fragments[levelDetails.fragments.length - 1];
return this.fragmentTracker.isEndListAppended(lastFragment.type);
};
BaseStreamController.prototype.getLevelDetails = function () {
if (this.levels && this.levelLastLoaded !== null) {
return this.levelLastLoaded.details;
}
};
Object.defineProperty(BaseStreamController.prototype, "timelineOffset", {
get: function () {
var _a;
var configuredTimelineOffset = this.config.timelineOffset;
if (configuredTimelineOffset) {
return (((_a = this.getLevelDetails()) === null || _a === void 0 ? void 0 : _a.appliedTimelineOffset) ||
configuredTimelineOffset);
}
return 0;
},
enumerable: false,
configurable: true
});
BaseStreamController.prototype.onMediaAttached = function (event, data) {
var media = (this.media = this.mediaBuffer = data.media);
addEventListener(media, 'seeking', this.onMediaSeeking);
addEventListener(media, 'ended', this.onMediaEnded);
var config = this.config;
if (this.levels && config.autoStartLoad && this.state === State.STOPPED) {
this.startLoad(config.startPosition);
}
};
BaseStreamController.prototype.onMediaDetaching = function (event, data) {
this.fragPlaying = null;
var transferringMedia = !!data.transferMedia;
var media = this.media;
if (media === null) {
return;
}
if (media.ended) {
this.startPosition = this.lastCurrentTime = 0;
}
removeEventListener(media, 'seeking', this.onMediaSeeking);
removeEventListener(media, 'ended', this.onMediaEnded);
this.media = this.mediaBuffer = null;
this.loopSn = undefined;
if (transferringMedia) {
this.resetLoadingState();
this.resetTransmuxer();
return;
}
this.loadingParts = false;
var fragmentTracker = this.fragmentTracker;
var gaps = fragmentTracker.gapFragments();
fragmentTracker.removeAllFragments();
gaps.forEach(function (frag) { return fragmentTracker.addAsGap(frag); });
this.stopLoad();
};
BaseStreamController.prototype.onManifestLoading = function () {
this.initPTS = [];
this.fragPlaying =
this.levels =
this.levelLastLoaded =
this.fragCurrent =
null;
this.lastCurrentTime = this.nextLoadPosition = 0;
this.startPosition = -1;
this.startFragRequested = false;
};
BaseStreamController.prototype.onError = function (event, data) { };
BaseStreamController.prototype.onManifestLoaded = function (event, data) {
this.startTimeOffset = data.startTimeOffset;
};
BaseStreamController.prototype.onHandlerDestroying = function () {
this.stopLoad();
if (this.transmuxer) {
this.transmuxer.destroy();
this.transmuxer = null;
}
_super.prototype.onHandlerDestroying.call(this);
this.hls = this.onMediaSeeking = this.onMediaEnded = null;
};
BaseStreamController.prototype.onHandlerDestroyed = function () {
this.state = State.STOPPED;
if (this.fragmentLoader) {
this.fragmentLoader.destroy();
}
if (this.initFragmentLoader) {
this.initFragmentLoader.destroy();
}
if (this.keyLoader) {
this.keyLoader.destroy();
}
if (this.decrypter) {
this.decrypter.destroy();
}
this.hls = this.decrypter = this.keyLoader = null;
this.fragmentLoader = this.initFragmentLoader = this.fragmentTracker = null;
_super.prototype.onHandlerDestroyed.call(this);
};
BaseStreamController.prototype.loadFragment = function (frag, level, targetBufferTime) {
this.startFragRequested = true;
this._loadFragForPlayback(frag, level, targetBufferTime);
};
BaseStreamController.prototype._loadFragForPlayback = function (fragment, level, targetBufferTime) {
var _this = this;
var progressCallback = function (data) {
var frag = data.frag;
if (_this.fragContextChanged(frag)) {
_this.warn("".concat(frag.type, " sn: ").concat(frag.sn).concat(data.part ? ' part: ' + data.part.index : '', " of ").concat(_this.fragInfo(frag, false, data.part), " was dropped during download."));
_this.fragmentTracker.removeFragment(frag);
return;
}
++frag.stats.chunkCount;
_this._handleFragmentLoadProgress(data);
};
this._doFragLoad(fragment, level, targetBufferTime, progressCallback)
.then(function (data) {
if (!data) {
return;
}
var state = _this.state;
var frag = data.frag;
if (_this.fragContextChanged(frag)) {
if (state === State.FRAG_LOADING ||
(!_this.fragCurrent && state === State.PARSING)) {
_this.fragmentTracker.removeFragment(frag);
_this.state = State.IDLE;
}
return;
}
if ('payload' in data) {
_this.hls.trigger(Events.FRAG_LOADED, data);
}
_this._handleFragmentLoadComplete(data);
})
.catch(function (reason) {
if (_this.state === State.STOPPED || _this.state === State.ERROR) {
return;
}
_this.resetFragmentLoading(fragment);
});
};
BaseStreamController.prototype.clearTrackerIfNeeded = function (frag) {
var _a;
var fragmentTracker = this.fragmentTracker;
var fragState = fragmentTracker.getState(frag);
if (fragState === "APPENDING") {
var playlistType = frag.type;
var bufferedInfo = this.getFwdBufferInfo(this.mediaBuffer, playlistType);
var minForwardBufferLength = Math.max(frag.duration, bufferedInfo ? bufferedInfo.len : this.config.maxBufferLength);
var backtrackFragment = this.backtrackFragment;
var backtracked = backtrackFragment
? frag.sn - backtrackFragment.sn
: 0;
if (backtracked === 1 ||
this.reduceMaxBufferLength(minForwardBufferLength, frag.duration)) {
fragmentTracker.removeFragment(frag);
}
}
else if (((_a = this.mediaBuffer) === null || _a === void 0 ? void 0 : _a.buffered.length) === 0) {
fragmentTracker.removeAllFragments();
}
else if (fragmentTracker.hasParts(frag.type)) {
fragmentTracker.detectPartialFragments({
frag: frag,
part: null,
stats: frag.stats,
id: frag.type,
});
if (fragmentTracker.getState(frag) === "PARTIAL") {
fragmentTracker.removeFragment(frag);
}
}
};
BaseStreamController.prototype.checkLiveUpdate = function (details) {
if (details.updated && !details.live) {
var fragmentTracker = this.fragmentTracker;
var lastFragment = details.fragments[details.fragments.length - 1];
if (lastFragment.endList &&
!fragmentTracker.isEndListAppended(this.playlistType)) {
var fragmentAtEnd = fragmentTracker.getPartialFragment(lastFragment.end);
if (fragmentAtEnd) {
fragmentTracker.removeFragment(fragmentAtEnd);
fragmentTracker.fragBuffered(lastFragment, true);
}
}
fragmentTracker.detectPartialFragments({
frag: lastFragment,
part: null,
stats: lastFragment.stats,
id: lastFragment.type,
});
}
if (!details.fragments[0]) {
details.deltaUpdateFailed = true;
}
};
BaseStreamController.prototype.waitForLive = function (levelInfo) {
var details = levelInfo.details;
return ((details === null || details === void 0 ? void 0 : details.live) &&
details.type !== 'EVENT' &&
details.advancedDateTime !== undefined &&
(details.expired ||
(this.loadingParts && details.partsExpired) ||
(details.misses < 3 && details.partEnd <= this.getLoadPosition())));
};
BaseStreamController.prototype.flushMainBuffer = function (startOffset, endOffset, type) {
if (type === void 0) { type = null; }
if (!(startOffset - endOffset)) {
return;
}
var flushScope = { startOffset: startOffset, endOffset: endOffset, type: type };
this.hls.trigger(Events.BUFFER_FLUSHING, flushScope);
};
BaseStreamController.prototype._loadInitSegment = function (initFrag) {
var _this = this;
var hls = this.hls;
this.initFragmentLoader.abort();
hls.trigger(Events.FRAG_LOADING, { frag: initFrag, targetBufferTime: 0 });
return this.initFragmentLoader
.load(initFrag)
.then(function (data) {
var _a;
var frag = data.frag;
if (!_this.levels ||
!fragmentsAreEqual(frag, (_a = _this.fragCurrent) === null || _a === void 0 ? void 0 : _a.initSegment)) {
throw new LoadError({
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.INTERNAL_ABORTED,
error: new Error('init load aborted'),
fatal: false,
frag: frag,
networkDetails: null,
});
}
return data;
})
.then(function (data) {
var frag = data.frag, payload = data.payload;
var decryptData = frag.decryptdata;
if (payload &&
payload.byteLength > 0 &&
(decryptData === null || decryptData === void 0 ? void 0 : decryptData.key) &&
decryptData.iv &&
isFullSegmentEncryption(decryptData.method)) {
var startTime_1 = self.performance.now();
var decryptRange = getAESAdjustments(frag, null, _this.iframesOnly).decryptRange;
return _this.decrypter
.decrypt(new Uint8Array(payload), decryptData.key.buffer, decryptData.iv.buffer, getAesModeFromFullSegmentMethod(decryptData.method), decryptRange)
.catch(function (err) {
hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.FRAG_DECRYPT_ERROR,
fatal: false,
error: err,
reason: err.message,
frag: frag,
});
_this.fragmentLoader.abort();
throw err;
})
.then(function (decryptedData) {
var endTime = self.performance.now();
hls.trigger(Events.FRAG_DECRYPTED, {
frag: frag,
part: null,
payload: decryptedData,
stats: {
tstart: startTime_1,
tdecrypt: endTime,
},
});
data.payload = decryptedData;
return _this.completeInitSegmentLoad(data);
});
}
return _this.completeInitSegmentLoad(data);
});
};
BaseStreamController.prototype.completeInitSegmentLoad = function (data) {
var stats = data.frag.stats;
data.frag.data = new Uint8Array(data.payload);
stats.parsing.start = stats.buffering.start = self.performance.now();
stats.parsing.end = stats.buffering.end = self.performance.now();
};
BaseStreamController.prototype.loadInitSegmentIfNeeded = function (mediaFrag) {
var _this = this;
var _a;
var initSegment = mediaFrag.initSegment;
if (!this.bitrateTest &&
isMediaFragment(mediaFrag) &&
initSegment &&
!initSegment.data) {
var initPromise = initSegment.encrypted && !((_a = initSegment.decryptdata) === null || _a === void 0 ? void 0 : _a.key)
? this.keyLoader
.load(initSegment)
.then(function () { return _this._loadInitSegment(initSegment); })
: this._loadInitSegment(initSegment);
return initPromise.catch(function (reason) {
if (_this.state === State.STOPPED || _this.state === State.ERROR) {
throw reason;
}
if ('data' in reason) {
_this.fragmentLoader.abort();
_this.handleFragLoadError(reason, mediaFrag);
}
_this.resetFragmentLoading(mediaFrag);
throw reason;
});
}
};
BaseStreamController.prototype.unhandledEncryptionError = function (initSegment, frag) {
var _a, _b;
var tracks = initSegment.tracks;
if (tracks &&
!frag.encrypted &&
(((_a = tracks.audio) === null || _a === void 0 ? void 0 : _a.encrypted) || ((_b = tracks.video) === null || _b === void 0 ? void 0 : _b.encrypted)) &&
(!this.config.emeEnabled || !this.keyLoader.emeController)) {
var media = this.media;
var error = new Error('EME not supported (light build)');
this.warn(error.message);
if (!media || media.mediaKeys) {
return false;
}
this.hls.trigger(Events.ERROR, {
type: ErrorTypes.KEY_SYSTEM_ERROR,
details: ErrorDetails.KEY_SYSTEM_NO_KEYS,
fatal: !false,
error: error,
frag: frag,
});
this.resetTransmuxer();
return true;
}
return false;
};
BaseStreamController.prototype.fragContextChanged = function (frag) {
var fragCurrent = this.fragCurrent;
return !frag || !fragmentsAreEqual(frag, fragCurrent);
};
BaseStreamController.prototype.fragBufferedComplete = function (frag, part) {
var _a;
this.mediaBuffer ? this.mediaBuffer : this.media;
if (isMediaFragment(frag)) {
if (frag.type !== PlaylistLevelType.SUBTITLE) {
var el_1 = frag.elementaryStreams;
if (!Object.keys(el_1).some(function (type) { return !!el_1[type]; })) {
this.state = State.IDLE;
return;
}
}
var level = (_a = this.levels) === null || _a === void 0 ? void 0 : _a[frag.level];
if ((level === null || level === void 0 ? void 0 : level.fragmentError) &&
(part || this.fragmentTracker.getState(frag) !== "PARTIAL")) {
level.fragmentError = 0;
frag.stats.retry = 0;
}
}
this.state = State.IDLE;
};
BaseStreamController.prototype._handleFragmentLoadComplete = function (fragLoadedEndData) {
var transmuxer = this.transmuxer;
if (!transmuxer) {
return;
}
var frag = fragLoadedEndData.frag;
var part = fragLoadedEndData.part, partsLoaded = fragLoadedEndData.partsLoaded;
var complete = !partsLoaded ||
partsLoaded.length === 0 ||
partsLoaded.some(function (fragLoaded) { return !fragLoaded; });
var decryptRange = getAESAdjustments(frag, part).decryptRange;
var chunkMeta = new ChunkMetadata(frag.level, frag.sn, frag.stats.chunkCount + 1, 0, part ? part.index : -1, !complete, frag.duration, this.iframesOnly, decryptRange);
transmuxer.flush(chunkMeta);
};
BaseStreamController.prototype._handleFragmentLoadProgress = function (frag) { };
BaseStreamController.prototype.loadKeyFor = function (frag, details, initDataPromise) {
var _this = this;
var _a;
var keyLoadingPromise = null;
if (frag.encrypted && !((_a = frag.decryptdata) === null || _a === void 0 ? void 0 : _a.key)) {
this.state = State.KEY_LOADING;
keyLoadingPromise = this.keyLoader
.load(frag, initDataPromise)
.then(function (keyLoadedData) {
if (!_this.fragContextChanged(keyLoadedData.frag)) {
_this.hls.trigger(Events.KEY_LOADED, keyLoadedData);
if (_this.state === State.KEY_LOADING) {
_this.state = State.IDLE;
}
return keyLoadedData;
}
});
this.hls.trigger(Events.KEY_LOADING, { frag: frag });
}
else if (!frag.encrypted) {
keyLoadingPromise = this.keyLoader.loadClear(frag, details.encryptedFragments, this.startFragRequested);
}
return keyLoadingPromise;
};
BaseStreamController.prototype._doFragLoad = function (frag, level, targetBufferTime, progressCallback) {
var _this = this;
if (targetBufferTime === void 0) { targetBufferTime = null; }
this.fragCurrent = frag;
var details = level.details;
if (!this.levels || !details) {
throw new Error("frag load aborted, missing level".concat(details ? '' : ' detail', "s"));
}
var fragPrevious = this.fragPrevious;
if (!mediaFragmentsAreEqual(frag, fragPrevious)) {
var shouldLoadParts = this.shouldLoadParts(level.details, frag.end);
if (shouldLoadParts !== this.loadingParts) {
this.loadingParts = shouldLoadParts;
}
}
targetBufferTime = Math.max(frag.start, targetBufferTime || 0);
if (this.loadingParts) {
var partList = details.partList;
if (partList && progressCallback) {
if (targetBufferTime > details.fragmentEnd && details.fragmentHint) {
frag = details.fragmentHint;
}
var partIndex = this.getNextPart(partList, frag, targetBufferTime);
if (partIndex > -1) {
var part_1 = partList[partIndex];
frag = this.fragCurrent = part_1.fragment;
if (!mediaFragmentsAreEqual(frag, fragPrevious) &&
!this.shouldLoadParts(level.details, frag.end)) {
this.loadingParts = false;
return Promise.resolve(null);
}
if (!this.filterReplacedPrimary(part_1, level.details)) {
return Promise.resolve(null);
}
var keyLoadingPromise_1 = this.loadKeyFor(frag, details);
if (this.fragContextChanged(frag)) {
return Promise.resolve(null);
}
this.nextLoadPosition = part_1.start + part_1.duration;
this.state = State.FRAG_LOADING;
var result_1;
var initDataPromise_1 = this.loadInitSegmentIfNeeded(frag);
if (keyLoadingPromise_1 || initDataPromise_1) {
var useKeyLoader_1 = !!keyLoadingPromise_1;
result_1 = Promise.all([keyLoadingPromise_1, initDataPromise_1])
.then(function (_a) {
var keyLoadedData = _a[0];
if (useKeyLoader_1 &&
(!keyLoadedData ||
_this.fragContextChanged(keyLoadedData.frag))) {
return null;
}
return _this.doFragPartsLoad(frag, part_1, level, progressCallback);
})
.catch(function (error) { return _this.handleFragLoadError(error, frag); });
}
else {
result_1 = this.doFragPartsLoad(frag, part_1, level, progressCallback).catch(function (error) {
return _this.handleFragLoadError(error, frag);
});
}
this.hls.trigger(Events.FRAG_LOADING, {
frag: frag,
part: part_1,
targetBufferTime: targetBufferTime,
});
if (this.fragCurrent === null) {
return Promise.reject(new Error("frag load aborted, context changed in FRAG_LOADING parts"));
}
return result_1;
}
else if (!frag.url ||
this.loadedEndOfParts(partList, targetBufferTime)) {
return Promise.resolve(null);
}
}
}
if (this.loadingParts) {
this.loadingParts = false;
}
else if (!frag.url) {
return Promise.resolve(null);
}
if (!this.filterReplacedPrimary(frag, level.details)) {
return Promise.resolve(null);
}
var initDataPromise = this.loadInitSegmentIfNeeded(frag);
var keyLoadingPromise = this.loadKeyFor(frag, details, initDataPromise);
if (this.fragContextChanged(frag)) {
initDataPromise === null || initDataPromise === void 0 ? void 0 : initDataPromise.catch(function () { return null; });
keyLoadingPromise === null || keyLoadingPromise === void 0 ? void 0 : keyLoadingPromise.catch(function () { return null; });
return Promise.resolve(null);
}
if (Number.isFinite(frag.sn) && !this.bitrateTest) {
this.nextLoadPosition = frag.start + frag.duration;
}
this.state = State.FRAG_LOADING;
var dataOnProgress = this.config.progressive && frag.type !== PlaylistLevelType.SUBTITLE;
var result;
if (dataOnProgress && keyLoadingPromise) {
result = keyLoadingPromise
.then(function (keyLoadedData) {
if (!keyLoadedData || _this.fragContextChanged(keyLoadedData.frag)) {
return null;
}
return _this.fragmentLoader.load(frag, _this.iframesOnly, progressCallback, initDataPromise);
})
.catch(function (error) { return _this.handleFragLoadError(error, frag); });
}
else {
result = Promise.all([
this.fragmentLoader.load(frag, this.iframesOnly, dataOnProgress ? progressCallback : undefined, dataOnProgress ? initDataPromise : undefined),
keyLoadingPromise,
initDataPromise,
])
.then(function (_a) {
var fragLoadedData = _a[0];
if (!dataOnProgress && progressCallback) {
progressCallback(fragLoadedData);
}
return fragLoadedData;
})
.catch(function (error) { return _this.handleFragLoadError(error, frag); });
}
this.hls.trigger(Events.FRAG_LOADING, { frag: frag, targetBufferTime: targetBufferTime });
if (this.fragCurrent === null) {
return Promise.reject(new Error("frag load aborted, context changed in FRAG_LOADING"));
}
return Promise.all([result, initDataPromise]).then(function (_a) {
var fragData = _a[0];
return fragData;
});
};
BaseStreamController.prototype.doFragPartsLoad = function (frag, fromPart, level, progressCallback) {
var _this = this;
return new Promise(function (resolve, reject) {
var _a;
var partsLoaded = [];
var initialPartList = (_a = level.details) === null || _a === void 0 ? void 0 : _a.partList;
var loadPart = function (part) {
_this.fragmentLoader
.loadPart(frag, part, progressCallback)
.then(function (partLoadedData) {
partsLoaded[part.index] = partLoadedData;
var loadedPart = partLoadedData.part;
_this.hls.trigger(Events.FRAG_LOADED, partLoadedData);
var nextPart = getPartWith(level.details, frag.sn, part.index + 1) ||
findPart(initialPartList, frag.sn, part.index + 1);
if (nextPart) {
loadPart(nextPart);
}
else {
return resolve({
frag: frag,
part: loadedPart,
partsLoaded: partsLoaded,
});
}
})
.catch(reject);
};
loadPart(fromPart);
});
};
BaseStreamController.prototype.handleFragLoadError = function (error, frag) {
if ('data' in error) {
var data = error.data;
if (data.details === ErrorDetails.INTERNAL_ABORTED) {
this.handleFragLoadAborted(frag, data.part);
}
else if (data.type === ErrorTypes.KEY_SYSTEM_ERROR && !data.fatal) {
frag.abortRequests();
this.resetStartWhenNotLoaded();
this.resetFragmentLoading(frag);
}
if (data.frag !== frag) {
if (data.frag) {
this.warn("".concat(data.details, " error cascading from ").concat(this.fragInfo(data.frag, false, data.part), " to ").concat(this.fragInfo(frag, false)));
}
this.hls.trigger(Events.ERROR, __assign(__assign({}, data), { frag: frag }));
}
else {
this.hls.trigger(Events.ERROR, data);
}
}
else {
this.hls.trigger(Events.ERROR, {
type: ErrorTypes.OTHER_ERROR,
details: ErrorDetails.INTERNAL_EXCEPTION,
err: error,
error: error,
fatal: true,
});
}
return null;
};
BaseStreamController.prototype._handleTransmuxerFlush = function (chunkMeta) {
var context = this.getCurrentContext(chunkMeta);
if (!context || this.state !== State.PARSING) {
if (!this.fragCurrent &&
this.state !== State.STOPPED &&
this.state !== State.ERROR) {
this.state = State.IDLE;
}
return;
}
var frag = context.frag, part = context.part, level = context.level;
var now = self.performance.now();
frag.stats.parsing.end = now;
if (part) {
part.stats.parsing.end = now;
}
var levelDetails = this.getLevelDetails();
var loadingPartsAtEdge = levelDetails && frag.sn > levelDetails.endSN;
var shouldLoadParts = loadingPartsAtEdge || this.shouldLoadParts(levelDetails, frag.end);
if (shouldLoadParts !== this.loadingParts) {
this.loadingParts = shouldLoadParts;
}
this.updateLevelTiming(frag, part, level, chunkMeta);
};
BaseStreamController.prototype.shouldLoadParts = function (details, bufferEnd) {
var _a;
if (this.config.lowLatencyMode) {
if (!details) {
return this.loadingParts;
}
if (details.partList && !this.iframesOnly) {
var firstPart = details.partList[0];
var safePartStart = firstPart.end + (((_a = details.fragmentHint) === null || _a === void 0 ? void 0 : _a.duration) || 0);
if (bufferEnd >= safePartStart) {
var playhead = this.playhead;
if (playhead > firstPart.start - firstPart.fragment.duration) {
return true;
}
}
}
}
return false;
};
BaseStreamController.prototype.getCurrentContext = function (chunkMeta) {
var _a = this, levels = _a.levels, fragCurrent = _a.fragCurrent;
var levelIndex = chunkMeta.level, sn = chunkMeta.sn, partIndex = chunkMeta.part;
if (!(levels === null || levels === void 0 ? void 0 : levels[levelIndex])) {
this.warn("Levels object was unset while buffering fragment ".concat(sn, " of ").concat(this.playlistLabel(), " ").concat(levelIndex, ". The current chunk will not be buffered."));
return null;
}
var level = levels[levelIndex];
var levelDetails = level.details;
var part = partIndex > -1 ? getPartWith(levelDetails, sn, partIndex) : null;
var frag = part
? part.fragment
: getFragmentWithSN(levelDetails, sn, fragCurrent);
if (!frag) {
return null;
}
if (fragCurrent && fragCurrent !== frag) {
frag.stats = fragCurrent.stats;
}
return { frag: frag, part: part, level: level };
};
BaseStreamController.prototype.bufferFragmentData = function (data, frag, part, chunkMeta, noBacktracking) {
if (this.state !== State.PARSING) {
return;
}
if (isMediaFragment(frag) && !this.fragContextChanged(frag)) {
this.fragPrevious = frag;
}
var data1 = data.data1, data2 = data.data2;
var buffer = data1;
if (data2) {
buffer = appendUint8Array(data1, data2);
}
if (!buffer.length) {
return;
}
var offsetTimestamp = this.initPTS[frag.cc];
var offset = offsetTimestamp
? -offsetTimestamp.baseTime / offsetTimestamp.timescale
: undefined;
var segment = {
type: data.type,
frag: frag,
part: part,
chunkMeta: chunkMeta,
offset: offset,
parent: frag.type,
data: buffer,
};
this.hls.trigger(Events.BUFFER_APPENDING, segment);
if (data.dropped && data.independent && !part) {
if (noBacktracking) {
return;
}
this.flushBufferGap(frag);
}
};
BaseStreamController.prototype.flushBufferGap = function (frag) {
var media = this.media;
if (!media) {
return;
}
if (!BufferHelper.isBuffered(media, media.currentTime)) {
this.flushMainBuffer(0, frag.start);
return;
}
var currentTime = media.currentTime;
var bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
var fragDuration = frag.duration;
var segmentFraction = Math.min(this.config.maxFragLookUpTolerance * 2, fragDuration * 0.25);
var start = Math.max(Math.min(frag.start - segmentFraction, bufferInfo.end - segmentFraction), currentTime + segmentFraction);
if (frag.start - start > segmentFraction) {
this.flushMainBuffer(start, frag.start);
}
};
BaseStreamController.prototype.getFwdBufferInfo = function (bufferable, type) {
var _a;
var pos = this.playhead;
var backwardSeek = this.lastCurrentTime > pos;
var maxBufferHole = backwardSeek || ((_a = this.media) === null || _a === void 0 ? void 0 : _a.paused) ? 0 : this.config.maxBufferHole;
return this.getFwdBufferInfoAtPos(bufferable, pos, type, maxBufferHole);
};
BaseStreamController.prototype.getFwdBufferInfoAtPos = function (bufferable, pos, type, maxBufferHole) {
var bufferInfo = BufferHelper.bufferInfo(bufferable, pos, maxBufferHole);
if (bufferInfo.len === 0 && bufferInfo.nextStart !== undefined) {
var bufferedFragAtPos = this.fragmentTracker.getBufferedFrag(pos, type);
if (bufferedFragAtPos &&
(bufferInfo.nextStart <= bufferedFragAtPos.end || bufferedFragAtPos.gap)) {
var gapDuration = Math.max(Math.min(bufferInfo.nextStart, bufferedFragAtPos.end) - pos, maxBufferHole);
return BufferHelper.bufferInfo(bufferable, pos, gapDuration);
}
}
return bufferInfo;
};
BaseStreamController.prototype.getMaxBufferLength = function (levelBitrate) {
var config = this.config;
var maxBufLen;
if (levelBitrate) {
maxBufLen = Math.max((8 * config.maxBufferSize) / levelBitrate, config.maxBufferLength);
}
else {
maxBufLen = config.maxBufferLength;
}
return Math.min(maxBufLen, config.maxMaxBufferLength);
};
BaseStreamController.prototype.exceedsMaxBuffer = function (bufferInfo, maxBufLen, selected) {
var nextStart = bufferInfo.nextStart;
if (nextStart && selected.start > nextStart) {
var bufferedRanges = bufferInfo.buffered;
if (bufferedRanges) {
var fullBufferLength = bufferInfo.len;
var bufferedIndex = bufferInfo.bufferedIndex;
for (var i = bufferedRanges.length - 1; i > bufferedIndex; i--) {
if (bufferedRanges[i].start < selected.start) {
fullBufferLength += bufferedRanges[i].end - bufferedRanges[i].start;
}
}
return fullBufferLength >= maxBufLen;
}
}
return false;
};
BaseStreamController.prototype.reduceMaxBufferLength = function (threshold, fragDuration) {
var config = this.config;
var minLength = Math.max(Math.min(threshold - fragDuration, config.maxBufferLength), fragDuration / 2);
var reducedLength = Math.max(threshold - fragDuration * 3, config.maxMaxBufferLength / 2, minLength);
if (reducedLength >= minLength) {
config.maxMaxBufferLength = reducedLength;
this.warn("Reduce max buffer length to ".concat(reducedLength, "s"));
return true;
}
return false;
};
BaseStreamController.prototype.getAppendedFrag = function (position) {
var fragOrPart = this.fragmentTracker
? this.fragmentTracker.getAppendedFrag(position, this.playlistType)
: null;
if (fragOrPart && 'fragment' in fragOrPart) {
return fragOrPart.fragment;
}
return fragOrPart;
};
BaseStreamController.prototype.getNextFragment = function (pos, levelDetails) {
var fragments = levelDetails.fragments;
var fragLen = fragments.length;
if (!fragLen) {
return null;
}
var config = this.config;
var playlistStart = levelDetails.fragmentStart;
var canLoadParts = config.lowLatencyMode && !!levelDetails.partList;
var frag = null;
if (levelDetails.live) {
var initialLiveManifestSize = config.initialLiveManifestSize;
if (fragLen < initialLiveManifestSize) {
this.warn("Not enough fragments to start playback (have: ".concat(fragLen, ", need: ").concat(initialLiveManifestSize, ")"));
return null;
}
if (!this.startFragRequested && canLoadParts && !this.loadingParts) {
this.loadingParts = true;
}
if ((!levelDetails.PTSKnown &&
!this.startFragRequested &&
this.startPosition === -1) ||
pos < playlistStart) {
frag = this.getInitialLiveFragment(levelDetails);
this.config.startPosition;
var mainStart = this.hls.startPosition;
var liveSyncPosition = this.hls.liveSyncPosition;
var fragStart = (frag === null || frag === void 0 ? void 0 : frag.start) || 0;
var startPosition = void 0;
if (mainStart !== -1 && mainStart >= playlistStart) {
startPosition = mainStart;
}
else if (liveSyncPosition) {
startPosition = liveSyncPosition;
}
else {
startPosition = pos;
}
if (startPosition < fragStart) {
startPosition = fragStart;
}
if (startPosition < playlistStart) {
startPosition = playlistStart;
}
if (this.startPosition != startPosition ||
this.nextLoadPosition != startPosition) {
var liveDetached = levelDetails.live &&
!this.filterReplacedPrimary(frag, levelDetails);
var tmpStartPosition = liveDetached ? -1 : startPosition;
this.startPosition = tmpStartPosition;
this.nextLoadPosition = startPosition;
}
}
}
else if (pos <= playlistStart) {
frag = fragments[0];
}
if (!frag) {
var end = this.loadingParts
? levelDetails.partEnd
: levelDetails.fragmentEnd;
frag = this.getFragmentAtPosition(pos, end, levelDetails);
}
var programFrag = this.filterReplacedPrimary(frag, levelDetails);
if (!programFrag && frag) {
programFrag = getNextFrag(levelDetails, frag.sn);
if (programFrag) {
this.nextLoadPosition = programFrag.start;
}
}
return programFrag;
};
BaseStreamController.prototype.isLoopLoading = function (frag, targetBufferTime) {
if (this.nextLoadPosition <= targetBufferTime) {
return false;
}
var trackerState = this.fragmentTracker.getState(frag);
if (trackerState === "OK") {
return true;
}
if (trackerState === "PARTIAL") {
if (frag.gap) {
return true;
}
if (frag.stats.retry > 1) {
return true;
}
}
return false;
};
BaseStreamController.prototype.getNextFragmentLoopLoading = function (frag, levelDetails, bufferInfo, playlistType, maxBufLen) {
var nextFragment = null;
if (frag.gap) {
nextFragment = this.getNextFragment(this.nextLoadPosition, levelDetails);
if (nextFragment && !nextFragment.gap && bufferInfo.nextStart) {
var nextbufferInfo = this.getFwdBufferInfoAtPos(this.mediaBuffer ? this.mediaBuffer : this.media, bufferInfo.nextStart, playlistType, 0);
if (nextbufferInfo !== null &&
bufferInfo.len + nextbufferInfo.len >= maxBufLen) {
var sn = nextFragment.sn;
if (this.loopSn !== sn) {
this.loopSn = sn;
}
return null;
}
}
}
this.loopSn = undefined;
return nextFragment;
};
Object.defineProperty(BaseStreamController.prototype, "primaryPrefetch", {
get: function () {
if (interstitialsEnabled(this.config)) ;
return false;
},
enumerable: false,
configurable: true
});
BaseStreamController.prototype.filterReplacedPrimary = function (frag, details) {
if (!frag) {
return frag;
}
if (interstitialsEnabled(this.config)) ;
return frag;
};
BaseStreamController.prototype.getNextPart = function (partList, frag, targetBufferTime) {
var nextPart = -1;
var contiguous = false;
var independentAttrOmitted = true;
for (var i = 0, len = partList.length; i < len; i++) {
var part_2 = partList[i];
independentAttrOmitted = independentAttrOmitted && !part_2.independent;
if (nextPart > -1 && targetBufferTime < part_2.start) {
break;
}
var loaded = part_2.loaded || part_2.gap;
if (loaded) {
nextPart = -1;
}
else if (contiguous ||
((part_2.independent || independentAttrOmitted) && part_2.fragment === frag)) {
nextPart = i;
}
contiguous = loaded && !part_2.gap;
}
var part = partList[nextPart];
if (part && part.fragment !== frag) ;
return nextPart;
};
BaseStreamController.prototype.loadedEndOfParts = function (partList, targetBufferTime) {
var part;
for (var i = partList.length; i--;) {
part = partList[i];
if (!part.loaded) {
return false;
}
if (targetBufferTime > part.start) {
return true;
}
}
return false;
};
BaseStreamController.prototype.getInitialLiveFragment = function (levelDetails) {
var fragments = levelDetails.fragments;
var fragPrevious = this.fragPrevious;
var frag = null;
if (fragPrevious) {
if (levelDetails.hasProgramDateTime) {
frag = findFragmentByPDT(fragments, fragPrevious.endProgramDateTime, this.config.maxFragLookUpTolerance);
}
if (!frag) {
var targetSN = fragPrevious.sn + 1;
if (targetSN >= levelDetails.startSN &&
targetSN <= levelDetails.endSN) {
var fragNext = fragments[targetSN - levelDetails.startSN];
if (fragPrevious.cc === fragNext.cc) {
frag = fragNext;
}
}
if (!frag) {
frag = findNearestWithCC(levelDetails, fragPrevious.cc, fragPrevious.end);
}
}
}
else {
var liveStart = this.hls.liveSyncPosition;
if (liveStart !== null) {
frag = this.getFragmentAtPosition(liveStart, this.bitrateTest ? levelDetails.fragmentEnd : levelDetails.edge, levelDetails);
}
}
return frag;
};
BaseStreamController.prototype.getFragmentAtPosition = function (bufferEnd, end, levelDetails) {
var _a;
var config = this.config;
var fragPrevious = this.fragPrevious;
var fragments = levelDetails.fragments, endSN = levelDetails.endSN;
var fragmentHint = levelDetails.fragmentHint;
var maxFragLookUpTolerance = config.maxFragLookUpTolerance;
var partList = levelDetails.partList;
var loadingParts = !!(this.loadingParts &&
(partList === null || partList === void 0 ? void 0 : partList.length) &&
fragmentHint);
if (loadingParts &&
!this.bitrateTest &&
partList[partList.length - 1].fragment.sn === fragmentHint.sn) {
fragments = fragments.concat(fragmentHint);
endSN = fragmentHint.sn;
}
if (fragPrevious &&
this.fragmentTracker.getState(fragPrevious) === "NOT_LOADED") {
fragPrevious = null;
}
var frag;
if (bufferEnd < end) {
var backwardSeek = bufferEnd < this.lastCurrentTime;
var lookupTolerance = backwardSeek ||
bufferEnd > end - maxFragLookUpTolerance ||
((_a = this.media) === null || _a === void 0 ? void 0 : _a.paused) ||
this.loadingParts ||
!this.startFragRequested
? 0
: maxFragLookUpTolerance;
frag = findFragmentByPTS(fragPrevious, fragments, bufferEnd, lookupTolerance);
}
else {
frag = fragments[fragments.length - 1];
}
if (frag) {
var fragSn_1 = frag.sn;
var curSNIdx = fragSn_1 - levelDetails.startSN;
var fragState = this.fragmentTracker.getState(frag);
if (fragState === "OK" ||
(fragState === "PARTIAL" && frag.gap)) {
fragPrevious = frag;
}
if (mediaFragmentsAreEqual(frag, fragPrevious) &&
(!loadingParts ||
partList[0].fragment.sn > fragSn_1 ||
!levelDetails.live ||
!partList.some(function (part) { return part.fragment.sn === fragSn_1 && !part.loaded && !part.gap; }))) {
var nextFrag = fragments[curSNIdx + 1];
if (frag.sn < endSN &&
this.fragmentTracker.getState(nextFrag) !== "OK") {
frag = nextFrag;
}
else {
frag = null;
}
}
}
return frag;
};
BaseStreamController.prototype.alignPlaylists = function (details, previousDetails, switchDetails) {
var length = details.fragments.length;
if (!length) {
this.warn("No fragments in live playlist");
return 0;
}
var slidingStart = details.fragmentStart;
var firstLevelLoad = !previousDetails;
var aligned = details.alignedSliding && Number.isFinite(slidingStart);
if (firstLevelLoad || (!aligned && !slidingStart)) {
alignStream(switchDetails, details);
var alignedSlidingStart = details.fragmentStart;
return alignedSlidingStart;
}
return slidingStart;
};
BaseStreamController.prototype.waitForCdnTuneIn = function (details) {
var advancePartLimit = 3;
return (details.live &&
details.canBlockReload &&
details.partTarget &&
details.tuneInGoal >
Math.max(details.partHoldBack, details.partTarget * advancePartLimit));
};
BaseStreamController.prototype.setStartPosition = function (details, sliding) {
var startPosition = this.startPosition;
if (startPosition < sliding) {
startPosition = -1;
}
var timelineOffset = this.timelineOffset;
if (startPosition === -1) {
var offsetInMultivariantPlaylist = this.startTimeOffset !== null;
var startTimeOffset = offsetInMultivariantPlaylist
? this.startTimeOffset
: details.startTimeOffset;
if (startTimeOffset !== null && Number.isFinite(startTimeOffset)) {
startPosition = sliding + startTimeOffset;
if (startTimeOffset < 0) {
startPosition += details.edge;
}
startPosition = Math.min(Math.max(sliding, startPosition), sliding + details.totalduration);
this.startPosition = startPosition;
}
else if (details.live) {
var liveSyncPosition = this.hls.liveSyncPosition;
startPosition = liveSyncPosition || sliding;
this.startPosition = -1;
}
else {
this.startPosition = startPosition = 0;
}
this.lastCurrentTime = startPosition + timelineOffset;
}
this.nextLoadPosition = startPosition + timelineOffset;
};
BaseStreamController.prototype.getLoadPosition = function () {
var _a;
var media = this.media;
var pos = 0;
if (((_a = this.hls) === null || _a === void 0 ? void 0 : _a.hasEnoughToStart) && media && !this.iframesOnly) {
pos = media.currentTime;
}
else if (this.nextLoadPosition >= 0) {
pos = this.nextLoadPosition;
}
return pos;
};
Object.defineProperty(BaseStreamController.prototype, "playhead", {
get: function () {
var _a, _b;
if ((_a = this.hls) === null || _a === void 0 ? void 0 : _a.hasEnoughToStart) {
var currentTime = (_b = this.media) === null || _b === void 0 ? void 0 : _b.currentTime;
if (Number.isFinite(currentTime)) {
return currentTime;
}
return this.lastCurrentTime;
}
return this.getLoadPosition();
},
enumerable: false,
configurable: true
});
Object.defineProperty(BaseStreamController.prototype, "iframesOnly", {
get: function () {
var _a;
if (this.playlistType !== PlaylistLevelType.MAIN) {
return false;
}
var details = this.getLevelDetails();
if (details) {
return details.iframesOnly;
}
return (_a = this.levelLastLoaded) === null || _a === void 0 ? void 0 : _a.iframes;
},
enumerable: false,
configurable: true
});
BaseStreamController.prototype.handleFragLoadAborted = function (frag, part) {
if (this.transmuxer &&
frag.type === this.playlistType &&
isMediaFragment(frag) &&
frag.stats.aborted) {
this.resetFragmentLoading(frag);
}
};
BaseStreamController.prototype.resetFragmentLoading = function (frag) {
if (this.state === State.STOPPED) {
return;
}
if (!this.fragCurrent ||
(!this.fragContextChanged(frag) &&
this.state !== State.FRAG_LOADING_WAITING_RETRY)) {
this.state = State.IDLE;
}
};
BaseStreamController.prototype.onFragmentOrKeyLoadError = function (filterType, data) {
var _a, _b;
if (data.chunkMeta && !data.frag) {
var context = this.getCurrentContext(data.chunkMeta);
if (context) {
data.frag = context.frag;
}
}
var frag = data.frag, part = data.part;
if (!frag || !this.levels || frag.type !== filterType) {
return;
}
if (this.fragContextChanged(frag)) {
this.warn("Frag load error must match current frag to retry ".concat(frag.relurl, " > ").concat((_a = this.fragCurrent) === null || _a === void 0 ? void 0 : _a.relurl));
return;
}
var gapTagEncountered = data.details === ErrorDetails.FRAG_GAP;
if (gapTagEncountered) {
this.fragmentTracker.addAsGap(frag);
}
var errorAction = data.errorAction;
if (!errorAction) {
this.state = State.ERROR;
return;
}
var action = errorAction.action, flags = errorAction.flags, _c = errorAction.retryCount, retryCount = _c === void 0 ? 0 : _c, retryConfig = errorAction.retryConfig;
var couldRetry = !!retryConfig;
var retry = couldRetry && action === 5;
var noAlternate = couldRetry &&
!errorAction.resolved &&
flags & 1;
var levelDetails = this.hls.latestLevelDetails;
var live = levelDetails === null || levelDetails === void 0 ? void 0 : levelDetails.live;
if (!retry &&
noAlternate &&
isMediaFragment(frag) &&
live &&
frag.sn < levelDetails.endSN &&
!isUnusableKeyError(data)) {
this.resetFragmentErrors(filterType);
if (part) {
part.gap = true;
}
else {
this.treatAsGap(frag);
}
errorAction.resolved = true;
}
else if ((retry || noAlternate) && retryCount < retryConfig.maxNumRetry) {
var offlineStatus = offlineHttpStatus((_b = data.response) === null || _b === void 0 ? void 0 : _b.code);
var delay = getRetryDelay(retryConfig, retryCount);
this.resetStartWhenNotLoaded();
this.retryDate = self.performance.now() + delay;
this.state = State.FRAG_LOADING_WAITING_RETRY;
errorAction.resolved = true;
if (offlineStatus) {
this.retryDate = Infinity;
data.reason = 'offline';
return;
}
this.warn("Fragment ".concat(frag.sn, " of ").concat(filterType, " ").concat(frag.level, " errored with ").concat(data.details, ", retrying loading ").concat(retryCount + 1, "/").concat(retryConfig.maxNumRetry, " in ").concat(delay, "ms"));
}
else if (retryConfig) {
this.resetFragmentErrors(filterType);
if (retryCount < retryConfig.maxNumRetry) {
if (!gapTagEncountered &&
action !== 3) {
errorAction.resolved = true;
}
}
else {
this.warn("".concat(data.details, " reached or exceeded max retry (").concat(retryCount, ")"));
return;
}
}
else if (action === 2) {
this.state = State.WAITING_LEVEL;
}
else {
this.state = State.ERROR;
}
this.tickImmediate();
};
BaseStreamController.prototype.onSourceBufferError = function (filterType, data) {
var _a, _b, _c;
var frag = data.frag, part = data.part, sourceBufferName = data.sourceBufferName;
var details = frag && ((_b = (_a = this.levels) === null || _a === void 0 ? void 0 : _a[frag.level]) === null || _b === void 0 ? void 0 : _b.details);
if (data.error.name !== SOURCE_BUFFER_ERROR_NAME ||
(frag === null || frag === void 0 ? void 0 : frag.type) !== filterType ||
!isMediaFragment(frag) ||
!(details === null || details === void 0 ? void 0 : details.live)) {
return;
}
var refused = part ? (part.index === 0 ? part : null) : frag;
var start = refused && sourceBufferName
? (_c = refused.elementaryStreams[sourceBufferName]) === null || _c === void 0 ? void 0 : _c.startPTS
: undefined;
this.markSourceBufferErrorGap(getFragmentWithSN(details, frag.sn) || frag);
if (start === undefined) {
return;
}
var previous = getFragmentWithSN(details, frag.sn - 1);
if (previous &&
this.fragmentTracker.getState(previous) !== "NOT_LOADED" &&
!BufferHelper.isBuffered(this.mediaBuffer || this.media, start - this.config.maxBufferHole)) {
this.markSourceBufferErrorGap(previous);
}
};
BaseStreamController.prototype.markSourceBufferErrorGap = function (frag) {
this.warn("Marking fragment ".concat(frag.sn, " of ").concat(this.playlistLabel(), " ").concat(frag.level, " as a gap after a SourceBuffer error"));
this.fragmentTracker.addAsGap(frag);
};
BaseStreamController.prototype.checkRetryDate = function () {
var now = self.performance.now();
var retryDate = this.retryDate;
var waitingForConnection = retryDate === Infinity;
if (!retryDate ||
now >= retryDate ||
(waitingForConnection && !offlineHttpStatus(0))) {
this.resetStartWhenNotLoaded();
this.state = State.IDLE;
}
};
BaseStreamController.prototype.reduceLengthAndFlushBuffer = function (data) {
if (this.state === State.PARSING || this.state === State.PARSED) {
var frag = data.frag;
var playlistType = data.parent;
var bufferedInfo = this.getFwdBufferInfo(this.mediaBuffer, playlistType);
var buffered = bufferedInfo && bufferedInfo.len > 0.5;
if (buffered) {
this.reduceMaxBufferLength(bufferedInfo.len, (frag === null || frag === void 0 ? void 0 : frag.duration) || 10);
}
var flushBuffer = !buffered;
if (flushBuffer) {
this.warn("Buffer full error while media.currentTime (".concat(this.playhead, ") is not buffered, flush ").concat(playlistType, " buffer"));
}
else if (bufferedInfo.nextStart &&
frag &&
bufferedInfo.nextStart > frag.start) {
this.flushMainBuffer(bufferedInfo.nextStart, Number.POSITIVE_INFINITY, playlistType === PlaylistLevelType.AUDIO ? playlistType : undefined);
}
if (frag) {
this.fragmentTracker.removeFragment(frag);
this.nextLoadPosition = frag.start;
}
this.resetLoadingState();
return flushBuffer;
}
return false;
};
BaseStreamController.prototype.resetFragmentErrors = function (filterType) {
if (filterType === PlaylistLevelType.AUDIO) {
this.fragCurrent = null;
}
if (!this.hls.hasEnoughToStart) {
this.startFragRequested = false;
}
if (this.state !== State.STOPPED) {
this.state = State.IDLE;
}
};
BaseStreamController.prototype.afterBufferFlushed = function (media, bufferType) {
if (!media) {
return;
}
var bufferedTimeRanges = BufferHelper.getBuffered(media);
this.fragmentTracker.detectEvictedFragments(bufferType, bufferedTimeRanges, this.playlistType);
if (this.state === State.ENDED) {
this.resetLoadingState();
}
};
BaseStreamController.prototype.resetLoadingState = function () {
this.fragCurrent = null;
this.fragPrevious = null;
if (this.state !== State.STOPPED) {
this.state = State.IDLE;
}
};
BaseStreamController.prototype.resetStartWhenNotLoaded = function () {
if (!this.hls.hasEnoughToStart) {
this.startFragRequested = false;
var details = this.getLevelDetails();
if (details === null || details === void 0 ? void 0 : details.live) {
this.startPosition = -1;
this.setStartPosition(details, details.fragmentStart);
this.resetLoadingState();
}
else {
this.nextLoadPosition = this.startPosition;
}
}
};
BaseStreamController.prototype.resetWhenMissingContext = function (chunkMeta) {
this.removeUnbufferedFrags();
this.resetStartWhenNotLoaded();
this.resetLoadingState();
};
BaseStreamController.prototype.removeUnbufferedFrags = function (start) {
if (start === void 0) { start = 0; }
this.fragmentTracker.removeFragmentsInRange(start, Infinity, this.playlistType, false, true);
};
BaseStreamController.prototype.updateLevelTiming = function (frag, part, level, chunkMeta) {
var _this = this;
var _a, _b, _c, _d;
var details = level.details;
if (!details) {
this.warn('level.details undefined');
return;
}
var parsed = Object.keys(frag.elementaryStreams).reduce(function (result, type) {
var info = frag.elementaryStreams[type];
if (info) {
var parsedDuration = info.endPTS - info.startPTS;
if (parsedDuration <= 0) {
_this.warn("Could not parse fragment ".concat(frag.sn, " ").concat(type, " duration reliably (").concat(parsedDuration, ")"));
return result || false;
}
var drift = 0;
if (chunkMeta.partial) {
if (part && chunkMeta.part === 0) {
drift = part.start - info.startPTS;
frag.startPTS = frag.maxStartPTS = info.startPTS;
frag.startDTS = info.startDTS;
if (frag.start !== 0) {
frag.setStart(info.startPTS);
}
alignSliding(details, frag, drift);
}
}
else {
drift = updateFragPTSDTS(details, frag, info.startPTS, info.endPTS, info.startDTS, info.endDTS, _this.iframesOnly, _this);
}
_this.hls.trigger(Events.LEVEL_PTS_UPDATED, {
details: details,
level: level,
drift: drift,
type: type,
frag: frag,
part: part,
start: info.startPTS,
end: info.endPTS,
});
return true;
}
return result;
}, false);
if (!parsed) {
var mediaNotFound = ((_a = this.transmuxer) === null || _a === void 0 ? void 0 : _a.error) === null;
var transmuxerError = ((_b = this.transmuxer) === null || _b === void 0 ? void 0 : _b.error) != null;
var hasAlternateLevels = ((_d = (_c = this.levels) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0) > 1;
if (level.fragmentError === 0 ||
(mediaNotFound && (level.fragmentError < 2 || frag.endList)) ||
(transmuxerError && hasAlternateLevels)) {
this.treatAsGap(frag, level);
}
if (mediaNotFound) {
var error = new Error("Found no media in ".concat(this.playlistLabel(), " ").concat(frag.level, " ").concat(part ? "part: ".concat(part.index, " of ") : '', "sn: ").concat(frag.sn, " at playlist time: ").concat(frag.start, ". Resetting transmuxer to fallback to playlist timing"));
this.warn(error.message);
this.hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.FRAG_PARSING_ERROR,
fatal: false,
error: error,
frag: frag,
reason: "Found no media in msn ".concat(frag.sn, " of ").concat(this.playlistLabel(), " \"").concat(level.url, "\""),
});
if (!this.hls) {
return;
}
this.resetTransmuxer();
}
}
this.state = State.PARSED;
this.hls.trigger(Events.FRAG_PARSED, { frag: frag, part: part, chunkMeta: chunkMeta });
};
BaseStreamController.prototype.playlistLabel = function () {
return "".concat(this.playlistType, " playlist");
};
BaseStreamController.prototype.fragInfo = function (frag, pts, part) {
var _a, _b;
if (pts === void 0) { pts = true; }
return "".concat(frag.type, " playlist ").concat(frag.level, " (").concat(part ? 'part' : 'frag', ":[").concat((_a = (pts && !part ? frag.startPTS : (part || frag).start)) !== null && _a !== void 0 ? _a : NaN, "-").concat((_b = (pts && !part ? frag.endPTS : (part || frag).end)) !== null && _b !== void 0 ? _b : NaN, "]").concat(part && frag.type === 'main' ? 'INDEPENDENT=' + (part.independent ? 'YES' : 'NO') : '', ")");
};
BaseStreamController.prototype.treatAsGap = function (frag, level) {
if (level) {
level.fragmentError++;
}
this.fragmentTracker.addAsGap(frag);
};
BaseStreamController.prototype.resetTransmuxer = function () {
var _a;
(_a = this.transmuxer) === null || _a === void 0 ? void 0 : _a.reset();
};
BaseStreamController.prototype.isFragmentNearlyDownloaded = function (fragment) {
var _a;
var stats = (_a = fragment.loader) === null || _a === void 0 ? void 0 : _a.stats;
if (!stats) {
return false;
}
if (stats.total <= 0) {
return false;
}
var hasFirstByte = stats.loading.first > 0;
var bitsRemaining = (stats.total - stats.loaded) * 8;
var timeToCompleteFragDownload = bitsRemaining /
(this.hls.bandwidthEstimate || this.hls.config.abrEwmaDefaultEstimate);
return hasFirstByte && timeToCompleteFragDownload <= 0.15;
};
BaseStreamController.prototype.recoverWorkerError = function (data) {
if (data.event === 'demuxerWorker') {
this.fragmentTracker.removeAllFragments();
if (this.transmuxer) {
this.transmuxer.destroy();
this.transmuxer = null;
}
this.resetStartWhenNotLoaded();
this.resetLoadingState();
}
};
Object.defineProperty(BaseStreamController.prototype, "state", {
get: function () {
return this._state;
},
set: function (nextState) {
var previousState = this._state;
if (previousState !== nextState) {
this._state = nextState;
}
},
enumerable: false,
configurable: true
});
BaseStreamController.prototype.calculateOptimalSwitchPoint = function (nextLevel, bufferInfo) {
var _a;
var fetchdelay = 0;
var _b = this, hls = _b.hls, media = _b.media, config = _b.config, levels = _b.levels, playlistType = _b.playlistType;
var levelDetails = this.getLevelDetails();
if (media && !media.paused && levels) {
var maxBitrate = playlistType === PlaylistLevelType.AUDIO
? estimatedAudioBitrate(nextLevel.audioCodec, 128000)
: nextLevel.maxBitrate;
var ttfbSec = 1 + hls.ttfbEstimate / 1000;
var bandwidth = hls.bandwidthEstimate * config.abrBandWidthUpFactor;
var fragDuration = (levelDetails &&
(this.loadingParts
? levelDetails.partTarget
: levelDetails.averagetargetduration)) ||
((_a = this.fragCurrent) === null || _a === void 0 ? void 0 : _a.duration) ||
6;
fetchdelay = ttfbSec + (maxBitrate * fragDuration) / bandwidth;
if (!nextLevel.details) {
fetchdelay += ttfbSec;
}
}
var currentTime = this.playhead;
var okToFlushForwardBuffer = !(levelDetails === null || levelDetails === void 0 ? void 0 : levelDetails.live) || bufferInfo.end - currentTime > fetchdelay * 1.5;
return { fetchdelay: fetchdelay, okToFlushForwardBuffer: okToFlushForwardBuffer };
};
BaseStreamController.prototype.scheduleTrackSwitch = function (bufferInfo, fetchdelay, okToFlushForwardBuffer) {
var _a;
var _b = this, media = _b.media, playlistType = _b.playlistType;
if (!media || !bufferInfo) {
return;
}
var bufferedFrag = okToFlushForwardBuffer
? this.getBufferedFrag(this.playhead + fetchdelay)
: null;
if (bufferedFrag) {
var nextBufferedFrag = this.followingBufferedFrag(bufferedFrag);
if (nextBufferedFrag) {
this.abortCurrentFrag();
var maxStart = nextBufferedFrag.maxStartPTS
? nextBufferedFrag.maxStartPTS
: nextBufferedFrag.start;
var fragDuration = nextBufferedFrag.duration;
var startOffset = Math.max(bufferedFrag.end, maxStart +
Math.min(Math.max(fragDuration - this.config.maxFragLookUpTolerance, fragDuration * (this.couldBacktrack ? 0.5 : 0.125)), fragDuration * (this.couldBacktrack ? 0.75 : 0.25)));
var liveWindowStart = ((_a = this.getLevelDetails()) === null || _a === void 0 ? void 0 : _a.fragmentStart) || 0;
if (liveWindowStart > startOffset) {
return;
}
var bufferType = playlistType === PlaylistLevelType.MAIN ? null : 'audio';
this.flushMainBuffer(startOffset, Number.POSITIVE_INFINITY, bufferType);
this.cleanupBackBuffer();
}
}
};
BaseStreamController.prototype.cleanupBackBuffer = function () {
var _a = this, media = _a.media, playlistType = _a.playlistType;
if (!media) {
return;
}
var fragPlayingCurrent = this.getAppendedFrag(this.playhead);
if (fragPlayingCurrent && fragPlayingCurrent.start > 1) {
var isAudio = playlistType === PlaylistLevelType.AUDIO;
this.flushMainBuffer(0, fragPlayingCurrent.start - (isAudio ? 0 : 1), isAudio ? 'audio' : null);
}
};
BaseStreamController.prototype.getBufferedFrag = function (position) {
return this.fragmentTracker.getBufferedFrag(position, this.playlistType);
};
BaseStreamController.prototype.followingBufferedFrag = function (frag) {
if (frag) {
return this.getBufferedFrag(frag.end + 0.5);
}
return null;
};
BaseStreamController.prototype.abortCurrentFrag = function () {
var _a;
var fragCurrent = this.fragCurrent;
this.fragCurrent = null;
if (fragCurrent) {
fragCurrent.abortRequests();
this.fragmentTracker.removeFragment(fragCurrent);
}
switch (this.state) {
case State.KEY_LOADING:
case State.FRAG_LOADING:
case State.FRAG_LOADING_WAITING_RETRY:
case State.PARSING:
case State.PARSED:
this.state = State.IDLE;
break;
}
this.nextLoadPosition = ((_a = this.hls) === null || _a === void 0 ? void 0 : _a.hasEnoughToStart)
? this.playhead
: this.lastCurrentTime;
};
BaseStreamController.prototype.checkFragPlaying = function () {
var video = this.media;
var fragPlayingCurrent = null;
if (video && video.readyState > 1 && video.seeking === false) {
var currentTime = video.currentTime;
if (BufferHelper.isBuffered(video, currentTime)) {
fragPlayingCurrent = this.getAppendedFrag(currentTime);
}
else if (BufferHelper.isBuffered(video, currentTime + 0.1)) {
fragPlayingCurrent = this.getAppendedFrag(currentTime + 0.1);
}
if (fragPlayingCurrent) {
this.backtrackFragment = undefined;
if (!mediaFragmentsAreEqual(fragPlayingCurrent, this.fragPlaying)) {
this.fragPlaying = fragPlayingCurrent;
return true;
}
}
}
return false;
};
BaseStreamController.prototype.getBufferOutput = function () {
return null;
};
BaseStreamController.prototype.nextLevelSwitch = function () {
var _a = this, levels = _a.levels, media = _a.media, hls = _a.hls, config = _a.config, playlistType = _a.playlistType;
if ((media === null || media === void 0 ? void 0 : media.readyState) && levels && hls && config) {
var bufferOutput = this.getBufferOutput();
var bufferInfo = this.getFwdBufferInfo(bufferOutput, playlistType);
if (!bufferInfo) {
return;
}
var nextLevelId = playlistType === PlaylistLevelType.AUDIO
? hls.nextAudioTrack
: hls.nextLoadLevel;
var nextLevel = levels[nextLevelId];
var _b = this.calculateOptimalSwitchPoint(nextLevel, bufferInfo), fetchdelay = _b.fetchdelay, okToFlushForwardBuffer = _b.okToFlushForwardBuffer;
this.scheduleTrackSwitch(bufferInfo, fetchdelay, okToFlushForwardBuffer);
}
this.tickImmediate();
};
return BaseStreamController;
}(TaskLoop));
function interstitialsEnabled(config) {
return (false);
}
var MetadataSchema;
(function (MetadataSchema) {
MetadataSchema["audioId3"] = "org.id3";
MetadataSchema["dateRange"] = "com.apple.quicktime.HLS";
MetadataSchema["emsg"] = "https://aomedia.org/emsg/ID3";
MetadataSchema["misbklv"] = "urn:misb:KLV:bin:1910.1";
})(MetadataSchema || (MetadataSchema = {}));
var now;
try {
now = self.performance.now.bind(self.performance);
}
catch (err) {
now = Date.now;
}
function isPromise(p) {
return 'then' in p && p.then instanceof Function;
}
var TransmuxConfig = (function () {
function TransmuxConfig(audioCodec, videoCodec, initSegmentData, duration, defaultInitPts) {
this.audioCodec = audioCodec;
this.videoCodec = videoCodec;
this.initSegmentData = initSegmentData;
this.duration = duration;
this.defaultInitPts = defaultInitPts || null;
}
return TransmuxConfig;
}());
var TransmuxState = (function () {
function TransmuxState(discontinuity, contiguous, accurateTimeOffset, trackSwitch, timeOffset, initSegmentChange) {
this.discontinuity = discontinuity;
this.contiguous = contiguous;
this.accurateTimeOffset = accurateTimeOffset;
this.trackSwitch = trackSwitch;
this.timeOffset = timeOffset;
this.initSegmentChange = initSegmentChange;
}
return TransmuxState;
}());
var version = "1.7.4";
var workerStore = {};
function hasUMDWorker() {
return typeof void 0 === 'function';
}
function injectWorker() {
var workerContext = workerStore[version];
if (workerContext) {
workerContext.clientCount++;
return workerContext;
}
var blob = new self.Blob([
"var exports={};var module={exports:exports};function define(f){f()};define.amd=true;(".concat((void 0).toString(), ")(true);"),
], {
type: 'text/javascript',
});
var objectURL = self.URL.createObjectURL(blob);
var worker = new self.Worker(objectURL);
var result = {
worker: worker,
objectURL: objectURL,
clientCount: 1,
};
workerStore[version] = result;
return result;
}
function loadWorker(path) {
var workerContext = workerStore[path];
if (workerContext) {
workerContext.clientCount++;
return workerContext;
}
var scriptURL = new self.URL(path, self.location.href).href;
var worker = new self.Worker(scriptURL);
var result = {
worker: worker,
scriptURL: scriptURL,
clientCount: 1,
};
workerStore[path] = result;
return result;
}
function removeWorkerFromStore(path) {
var workerContext = workerStore[path || version];
if (workerContext) {
var clientCount = workerContext.clientCount--;
if (clientCount === 1) {
var worker = workerContext.worker, objectURL = workerContext.objectURL;
delete workerStore[path || version];
if (objectURL) {
self.URL.revokeObjectURL(objectURL);
}
worker.terminate();
}
}
}
function Transmuxer() { throw new Error('segments are converted in the worker only'); }
var transmuxerInstanceCount = 0;
var TransmuxerInterface = (function () {
function TransmuxerInterface(hls, id, onTransmuxComplete, onFlush) {
var _this = this;
this.error = null;
this.instanceNo = transmuxerInstanceCount++;
this.frag = null;
this.part = null;
this.workerContext = null;
this.transmuxer = null;
this.onWorkerMessage = function (event) {
var _a;
var data = event.data;
var hls = _this.hls;
if (!hls || !(data === null || data === void 0 ? void 0 : data.event) || data.instanceNo !== _this.instanceNo) {
return;
}
switch (data.event) {
case 'init': {
var objectURL = (_a = _this.workerContext) === null || _a === void 0 ? void 0 : _a.objectURL;
if (objectURL) {
self.URL.revokeObjectURL(objectURL);
}
break;
}
case 'transmuxComplete': {
_this.handleTransmuxComplete(data.data);
break;
}
case 'flush': {
_this.onFlush(data.data);
break;
}
case 'workerLog': {
if (hls.logger[data.data.logType]) {
hls.logger[data.data.logType](data.data.message);
}
break;
}
default: {
data.data = data.data || {};
data.data.frag = _this.frag;
data.data.part = _this.part;
data.data.id = _this.id;
hls.trigger(data.event, data.data);
break;
}
}
};
this.onWorkerError = function (event) {
if (!_this.hls) {
return;
}
var error = new Error("".concat(event.message, "  (").concat(event.filename, ":").concat(event.lineno, ")"));
_this.hls.config.enableWorker = false;
_this.hls.logger.warn("Error in \"".concat(_this.id, "\" Web Worker, fallback to inline"));
_this.hls.trigger(Events.ERROR, {
type: ErrorTypes.OTHER_ERROR,
details: ErrorDetails.INTERNAL_EXCEPTION,
fatal: false,
event: 'demuxerWorker',
error: error,
});
};
var config = hls.config;
this.hls = hls;
this.id = id;
this.useWorker = !!config.enableWorker;
this.onTransmuxComplete = onTransmuxComplete;
this.onFlush = onFlush;
var forwardMessage = function (ev, data) {
data = data || {};
data.frag = _this.frag || undefined;
if (ev === Events.ERROR) {
data = data;
data.parent = _this.id;
data.part = _this.part;
_this.error = data.error;
}
_this.hls.trigger(ev, data);
};
this.observer = new EventEmitter();
this.observer.on(Events.FRAG_DECRYPTED, forwardMessage);
this.observer.on(Events.ERROR, forwardMessage);
var m2tsTypeSupported = getM2TSSupportedAudioTypes(config.preferManagedMediaSource);
if (this.useWorker && typeof Worker !== 'undefined') {
var logger = this.hls.logger;
var canCreateWorker = config.workerPath || hasUMDWorker();
if (canCreateWorker) {
try {
if (config.workerPath) {
;
this.workerContext = loadWorker(config.workerPath);
}
else {
;
this.workerContext = injectWorker();
}
var worker = this.workerContext.worker;
worker.addEventListener('message', this.onWorkerMessage);
worker.addEventListener('error', this.onWorkerError);
worker.postMessage({
instanceNo: this.instanceNo,
cmd: 'init',
typeSupported: m2tsTypeSupported,
id: id,
config: stringify(config),
});
}
catch (err) {
logger.warn("Error setting up \"".concat(id, "\" Web Worker, fallback to inline"), err);
this.terminateWorker();
this.error = null;
this.transmuxer = new Transmuxer(this.observer, m2tsTypeSupported, config, '', id, hls.logger);
}
return;
}
}
this.transmuxer = new Transmuxer(this.observer, m2tsTypeSupported, config, '', id, hls.logger);
}
TransmuxerInterface.prototype.reset = function () {
this.frag = null;
this.part = null;
if (this.workerContext) {
var instanceNo = this.instanceNo;
this.instanceNo = transmuxerInstanceCount++;
var config = this.hls.config;
var m2tsTypeSupported = getM2TSSupportedAudioTypes(config.preferManagedMediaSource);
this.workerContext.worker.postMessage({
instanceNo: this.instanceNo,
cmd: 'reset',
resetNo: instanceNo,
typeSupported: m2tsTypeSupported,
id: this.id,
config: stringify(config),
});
}
};
TransmuxerInterface.prototype.terminateWorker = function () {
if (this.workerContext) {
var worker = this.workerContext.worker;
this.workerContext = null;
worker.removeEventListener('message', this.onWorkerMessage);
worker.removeEventListener('error', this.onWorkerError);
removeWorkerFromStore(this.hls.config.workerPath);
}
};
TransmuxerInterface.prototype.destroy = function () {
if (this.workerContext) {
this.terminateWorker();
this.onWorkerMessage = this.onWorkerError = null;
}
else {
var transmuxer = this.transmuxer;
if (transmuxer) {
transmuxer.destroy();
this.transmuxer = null;
}
}
var observer = this.observer;
if (observer) {
observer.removeAllListeners();
}
this.frag = null;
this.part = null;
this.observer = null;
this.hls = null;
};
TransmuxerInterface.prototype.push = function (data, initSegmentData, audioCodec, videoCodec, frag, part, duration, accurateTimeOffset, chunkMeta, defaultInitPTS) {
var _this = this;
var _a, _b;
chunkMeta.transmuxing.start = self.performance.now();
var _c = this, instanceNo = _c.instanceNo, transmuxer = _c.transmuxer;
var timeOffset = part ? part.start : frag.start;
var decryptdata = frag.decryptdata;
var lastFrag = this.frag;
var discontinuity = lastFrag ? frag.cc !== lastFrag.cc : true;
var trackSwitch = lastFrag ? chunkMeta.level !== lastFrag.level : true;
var snDiff = lastFrag ? chunkMeta.sn - lastFrag.sn : -1;
var partDiff = this.part ? chunkMeta.part - this.part.index : -1;
var progressive = snDiff === 0 &&
chunkMeta.id > 1 &&
chunkMeta.id === (lastFrag === null || lastFrag === void 0 ? void 0 : lastFrag.stats.chunkCount);
var contiguous = !trackSwitch &&
(snDiff === 1 ||
(snDiff === 0 && (partDiff === 1 || (progressive && partDiff <= 0))));
var now = self.performance.now();
if (trackSwitch || snDiff || frag.stats.parsing.start === 0) {
frag.stats.parsing.start = now;
}
if (part && (partDiff || !contiguous)) {
part.stats.parsing.start = now;
}
var initSegmentChange = !(lastFrag && ((_a = frag.initSegment) === null || _a === void 0 ? void 0 : _a.url) === ((_b = lastFrag.initSegment) === null || _b === void 0 ? void 0 : _b.url));
var state = new TransmuxState(discontinuity, contiguous, accurateTimeOffset, trackSwitch, timeOffset, initSegmentChange);
if (!contiguous || discontinuity || initSegmentChange) {
var config = new TransmuxConfig(audioCodec, videoCodec, initSegmentData, duration, defaultInitPTS);
this.configureTransmuxer(config);
}
this.frag = frag;
this.part = part;
if (this.workerContext) {
this.workerContext.worker.postMessage({
instanceNo: instanceNo,
cmd: 'demux',
data: data,
decryptdata: decryptdata,
chunkMeta: chunkMeta,
state: state,
}, data instanceof ArrayBuffer ? [data] : []);
}
else if (transmuxer) {
var transmuxResult = transmuxer.push(data, decryptdata, chunkMeta, state);
if (isPromise(transmuxResult)) {
transmuxResult
.then(function (data) {
_this.handleTransmuxComplete(data);
})
.catch(function (error) {
_this.transmuxerError(error, chunkMeta, 'transmuxer-interface push error');
});
}
else {
this.handleTransmuxComplete(transmuxResult);
}
}
};
TransmuxerInterface.prototype.flush = function (chunkMeta) {
var _this = this;
chunkMeta.transmuxing.start = self.performance.now();
var _a = this, instanceNo = _a.instanceNo, transmuxer = _a.transmuxer;
if (this.workerContext) {
this.workerContext.worker.postMessage({
instanceNo: instanceNo,
cmd: 'flush',
chunkMeta: chunkMeta,
});
}
else if (transmuxer) {
var transmuxResult = transmuxer.flush(chunkMeta);
if (isPromise(transmuxResult)) {
transmuxResult
.then(function (data) {
_this.handleFlushResult(data, chunkMeta);
})
.catch(function (error) {
_this.transmuxerError(error, chunkMeta, 'transmuxer-interface flush error');
});
}
else {
this.handleFlushResult(transmuxResult, chunkMeta);
}
}
};
TransmuxerInterface.prototype.transmuxerError = function (error, chunkMeta, reason) {
if (!this.hls) {
return;
}
this.error = error;
this.hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.FRAG_PARSING_ERROR,
chunkMeta: chunkMeta,
frag: this.frag || undefined,
part: this.part || undefined,
fatal: false,
error: error,
err: error,
reason: reason,
});
};
TransmuxerInterface.prototype.handleFlushResult = function (results, chunkMeta) {
var _this = this;
results.forEach(function (result) {
_this.handleTransmuxComplete(result);
});
this.onFlush(chunkMeta);
};
TransmuxerInterface.prototype.configureTransmuxer = function (config) {
var _a = this, instanceNo = _a.instanceNo, transmuxer = _a.transmuxer;
if (this.workerContext) {
this.workerContext.worker.postMessage({
instanceNo: instanceNo,
cmd: 'configure',
config: config,
});
}
else if (transmuxer) {
transmuxer.configure(config);
}
};
TransmuxerInterface.prototype.handleTransmuxComplete = function (result) {
result.chunkMeta.transmuxing.end = self.performance.now();
this.onTransmuxComplete(result);
};
return TransmuxerInterface;
}());
var BasePlaylistController = (function (_super) {
__extends(BasePlaylistController, _super);
function BasePlaylistController(hls, logPrefix) {
var _this = _super.call(this, logPrefix, hls.logger) || this;
_this.canLoad = false;
_this.timer = -1;
_this.loadingSync = false;
_this.hls = hls;
return _this;
}
BasePlaylistController.prototype.destroy = function () {
this.clearTimer();
this.hls = null;
};
BasePlaylistController.prototype.clearTimer = function () {
if (this.timer !== -1) {
self.clearTimeout(this.timer);
this.timer = -1;
}
};
BasePlaylistController.prototype.startLoad = function () {
this.canLoad = true;
this.loadPlaylist();
};
BasePlaylistController.prototype.stopLoad = function () {
this.canLoad = false;
this.clearTimer();
};
BasePlaylistController.prototype.switchParams = function (playlistUri, previous, current) {
var renditionReports = previous === null || previous === void 0 ? void 0 : previous.renditionReports;
if (renditionReports) {
var foundIndex = -1;
for (var i = 0; i < renditionReports.length; i++) {
var attr = renditionReports[i];
var uri = void 0;
try {
uri = new self.URL(attr.URI, previous.url).href;
}
catch (error) {
this.warn("Could not construct new URL for Rendition Report: ".concat(error));
uri = attr.URI || '';
}
if (uri === playlistUri) {
foundIndex = i;
break;
}
else if (uri === playlistUri.substring(0, uri.length)) {
foundIndex = i;
}
}
if (foundIndex !== -1) {
var attr = renditionReports[foundIndex];
var msn = parseInt(attr['LAST-MSN']) || previous.lastPartSn;
var part = parseInt(attr['LAST-PART']) || previous.lastPartIndex;
if (this.hls.config.lowLatencyMode) {
var currentGoal = Math.min(previous.age - previous.partTarget, previous.targetduration);
if (part >= 0 && currentGoal > previous.partTarget) {
part += 1;
}
}
var skip = current && getSkipValue(current);
return new HlsUrlParameters(msn, part >= 0 ? part : undefined, skip);
}
}
};
BasePlaylistController.prototype.loadPlaylist = function (hlsUrlParameters) {
this.clearTimer();
};
BasePlaylistController.prototype.loadingPlaylist = function (playlist, hlsUrlParameters) {
this.clearTimer();
};
BasePlaylistController.prototype.shouldLoadPlaylist = function (playlist) {
return (this.canLoad &&
!!playlist &&
!!playlist.url &&
(!playlist.details || playlist.details.live));
};
BasePlaylistController.prototype.getUrlWithDirectives = function (uri, hlsUrlParameters) {
if (hlsUrlParameters) {
try {
return hlsUrlParameters.addDirectives(uri);
}
catch (error) {
this.warn("Could not construct new URL with HLS Delivery Directives: ".concat(error));
}
}
return uri;
};
BasePlaylistController.prototype.playlistLoaded = function (index, data, previousDetails) {
var _a;
var details = data.details, stats = data.stats;
var fragments = details.fragments;
var now = self.performance.now();
var elapsed = stats.loading.first
? Math.max(0, Math.floor(now - stats.loading.first))
: 0;
details.advancedDateTime = Date.now() - elapsed;
var timelineOffset = this.hls.config.timelineOffset;
if (timelineOffset !== details.appliedTimelineOffset) {
var offset_1 = Math.max(timelineOffset || 0, 0);
details.appliedTimelineOffset = offset_1;
fragments.forEach(function (frag) {
frag === null || frag === void 0 ? void 0 : frag.setStart(frag.playlistOffset + offset_1);
});
}
if (details.live || (previousDetails === null || previousDetails === void 0 ? void 0 : previousDetails.live)) {
var levelOrTrack = 'levelInfo' in data ? data.levelInfo : data.track;
details.reloaded(previousDetails);
var parent_1 = (_a = fragments[fragments.length - 1]) === null || _a === void 0 ? void 0 : _a.type;
if (details.misses >= this.hls.config.liveMaxUnchangedPlaylistRefresh) {
var error = new Error("".concat(parent_1, " playlist ").concat(levelOrTrack.id, " hit max allowed unchanged reloads."));
this.warn(error);
var networkDetails = data.networkDetails, context = data.context;
this.hls.trigger(Events.ERROR, {
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.PLAYLIST_UNCHANGED_ERROR,
fatal: false,
url: details.url,
error: error,
reason: error.message,
level: data.level,
parent: parent_1,
context: context,
networkDetails: networkDetails,
stats: stats,
});
return;
}
if (previousDetails) {
mergeDetails(previousDetails, details, this);
var error = details.playlistParsingError;
if (error) {
this.warn(error);
var hls = this.hls;
if (!hls.config.ignorePlaylistParsingErrors) {
var networkDetails = data.networkDetails;
hls.trigger(Events.ERROR, {
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.LEVEL_PARSING_ERROR,
fatal: false,
url: details.url,
error: error,
reason: error.message,
level: data.level,
parent: parent_1,
networkDetails: networkDetails,
stats: stats,
});
return;
}
details.playlistParsingError = null;
}
}
if (details.requestScheduled === -1) {
details.requestScheduled = stats.loading.start;
}
var bufferInfo = this.hls.mainForwardBufferInfo;
var position = bufferInfo ? bufferInfo.end - bufferInfo.len : 0;
var distanceToLiveEdgeMs = (details.edge - position) * 1000;
var reloadInterval = computeReloadInterval(details, distanceToLiveEdgeMs);
if (details.requestScheduled + reloadInterval < now) {
details.requestScheduled = now;
}
else if (details.requestScheduled <= now) {
details.requestScheduled += reloadInterval;
}
data.deliveryDirectives;
if (!this.canLoad || !details.live) {
return;
}
var deliveryDirectives = void 0;
var msn = undefined;
var part = undefined;
if (details.canBlockReload && details.advanced) {
var lowLatencyMode = this.hls.config.lowLatencyMode;
var lastPartSn = details.lastPartSn;
var endSn = details.endSN;
var lastPartIndex = details.lastPartIndex;
var hasParts = lastPartIndex !== -1;
var atLastPartOfSegment = lastPartSn === endSn;
if (hasParts) {
if (atLastPartOfSegment) {
msn = endSn + 1;
part = lowLatencyMode ? 0 : lastPartIndex;
}
else {
msn = lastPartSn;
part = lowLatencyMode ? lastPartIndex + 1 : details.maxPartIndex;
}
}
else {
msn = endSn + 1;
}
var lastAdvanced = details.age;
var cdnAge = lastAdvanced + details.ageHeader;
var currentGoal = Math.min(cdnAge - details.partTarget, details.targetduration * 1.5);
if (currentGoal > 0) {
if (cdnAge > details.targetduration * 3) {
msn = undefined;
part = undefined;
}
else if ((previousDetails === null || previousDetails === void 0 ? void 0 : previousDetails.tuneInGoal) &&
cdnAge - details.partTarget > previousDetails.tuneInGoal) {
this.warn("CDN Tune-in goal increased from: ".concat(previousDetails.tuneInGoal, " to: ").concat(currentGoal, " with playlist age: ").concat(details.age));
currentGoal = 0;
}
else {
var segments = Math.floor(currentGoal / details.targetduration);
msn += segments;
if (part !== undefined) {
var parts = Math.round((currentGoal % details.targetduration) / details.partTarget);
part += parts;
}
}
details.tuneInGoal = currentGoal;
}
deliveryDirectives = this.getDeliveryDirectives(details, data.deliveryDirectives, msn, part);
if (lowLatencyMode || !atLastPartOfSegment) {
details.requestScheduled = now;
this.loadingPlaylist(levelOrTrack, deliveryDirectives);
return;
}
}
else if (details.canBlockReload || details.canSkipUntil) {
deliveryDirectives = this.getDeliveryDirectives(details, data.deliveryDirectives, msn, part);
}
if (deliveryDirectives && msn !== undefined && details.canBlockReload) {
details.requestScheduled =
stats.loading.first +
Math.max(reloadInterval - elapsed * 2, reloadInterval / 2);
}
this.scheduleLoading(levelOrTrack, deliveryDirectives, details);
}
else {
this.clearTimer();
}
};
BasePlaylistController.prototype.scheduleLoading = function (levelOrTrack, deliveryDirectives, updatedDetails) {
var _this = this;
var details = updatedDetails || levelOrTrack.details;
if (!details) {
this.loadingPlaylist(levelOrTrack, deliveryDirectives);
return;
}
var now = self.performance.now();
var requestScheduled = details.requestScheduled;
if (now >= requestScheduled && !this.loadingSync) {
this.loadingSync = true;
this.loadingPlaylist(levelOrTrack, deliveryDirectives);
this.loadingSync = false;
return;
}
var estimatedTimeUntilUpdate = Math.max(requestScheduled - now, 0);
this.clearTimer();
this.timer = self.setTimeout(function () { return _this.loadingPlaylist(levelOrTrack, deliveryDirectives); }, estimatedTimeUntilUpdate);
};
BasePlaylistController.prototype.getDeliveryDirectives = function (details, previousDeliveryDirectives, msn, part) {
var skip = getSkipValue(details);
if ((previousDeliveryDirectives === null || previousDeliveryDirectives === void 0 ? void 0 : previousDeliveryDirectives.skip) && details.deltaUpdateFailed) {
msn = previousDeliveryDirectives.msn;
part = previousDeliveryDirectives.part;
skip = "";
}
return new HlsUrlParameters(msn, part, skip);
};
BasePlaylistController.prototype.checkRetry = function (errorEvent) {
var _this = this;
var _a, _b;
var errorDetails = errorEvent.details;
var isTimeout = isTimeoutError(errorEvent);
var errorAction = errorEvent.errorAction;
var _c = errorAction || {}, action = _c.action, _d = _c.retryCount, retryCount = _d === void 0 ? 0 : _d, retryConfig = _c.retryConfig;
var retry = !!errorAction &&
!!retryConfig &&
(action === 5 ||
(!errorAction.resolved &&
action === 2));
if (retry) {
if (retryCount >= retryConfig.maxNumRetry) {
return false;
}
if (isTimeout && ((_a = errorEvent.context) === null || _a === void 0 ? void 0 : _a.deliveryDirectives)) {
this.warn("Retrying playlist loading ".concat(retryCount + 1, "/").concat(retryConfig.maxNumRetry, " after \"").concat(errorDetails, "\" without delivery-directives"));
this.loadPlaylist();
}
else {
var offlineStatus = offlineHttpStatus((_b = errorEvent.response) === null || _b === void 0 ? void 0 : _b.code);
this.clearTimer();
if (offlineStatus) {
errorEvent.reason = 'offline';
this.timer = self.setTimeout(function () { return _this.checkOfflineStatus(); }, 1000);
}
else {
var delay = getRetryDelay(retryConfig, retryCount);
this.warn("Retrying playlist loading ".concat(retryCount + 1, "/").concat(retryConfig.maxNumRetry, " after \"").concat(errorDetails, "\" in ").concat(delay, "ms"));
this.timer = self.setTimeout(function () { return _this.loadPlaylist(); }, delay);
}
}
errorEvent.levelRetry = true;
errorAction.resolved = true;
}
return retry;
};
BasePlaylistController.prototype.checkOfflineStatus = function () {
var _this = this;
this.clearTimer();
if (offlineHttpStatus(0)) {
this.timer = self.setTimeout(function () { return _this.checkOfflineStatus(); }, 1000);
}
else {
this.loadPlaylist();
}
};
return BasePlaylistController;
}(Logger));
var CapLevelController = (function () {
function CapLevelController(hls) {
this.hls = null;
this.hls = hls;
this.autoLevelCapping = Number.POSITIVE_INFINITY;
this.media = null;
this.restrictedLevels = [];
this.clientRect = null;
this.registerListeners();
}
CapLevelController.prototype.setStreamController = function (streamController) {
this.streamController = streamController;
};
CapLevelController.prototype.destroy = function () {
if (this.hls) {
this.unregisterListener();
}
if (this.timer || this.observer) {
this.stopCapping();
}
this.media = this.clientRect = this.hls = null;
this.streamController = undefined;
};
CapLevelController.prototype.registerListeners = function () {
var hls = this.hls;
if (hls) {
hls.on(Events.FPS_DROP_LEVEL_CAPPING, this.onFpsDropLevelCapping, this);
hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
hls.on(Events.BUFFER_CODECS, this.onBufferCodecs, this);
hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
}
};
CapLevelController.prototype.unregisterListener = function () {
var hls = this.hls;
if (hls) {
hls.off(Events.FPS_DROP_LEVEL_CAPPING, this.onFpsDropLevelCapping, this);
hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
hls.off(Events.BUFFER_CODECS, this.onBufferCodecs, this);
hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
}
};
CapLevelController.prototype.onFpsDropLevelCapping = function (event, data) {
if (!this.hls) {
return;
}
var level = this.hls.levels[data.droppedLevel];
if (this.isLevelAllowed(level)) {
this.restrictedLevels.push({
bitrate: level.bitrate,
height: level.height,
width: level.width,
});
}
};
CapLevelController.prototype.onMediaAttaching = function (event, data) {
var media = data.media;
this.clientRect = null;
if (!this.hls) {
return;
}
if (media instanceof HTMLVideoElement) {
this.media = media;
if (this.hls.config.capLevelToPlayerSize) {
this.observe();
}
}
else {
this.media = null;
}
if ((this.timer || this.observer) && this.hls.levels.length > 1) {
this.detectPlayerSize();
}
};
CapLevelController.prototype.onManifestParsed = function (event, data) {
this.restrictedLevels = [];
if (data.video) {
this.startCapping();
}
this.onLevelsUpdated();
};
CapLevelController.prototype.onLevelsUpdated = function () {
if (!this.hls) {
return;
}
if ((this.timer || this.observer) &&
(Number.isFinite(this.autoLevelCapping) || this.clientRect)) {
this.detectPlayerSize();
}
else if (this.observer === undefined && this.timer === undefined) {
var levels = this.hls.levels;
if (levels.length > 1 && levels.some(function (level) { return !!level.videoCodec; })) {
this.startCapping();
}
}
};
CapLevelController.prototype.onBufferCodecs = function (event, data) {
if (data.video) {
this.startCapping();
}
};
CapLevelController.prototype.onMediaDetaching = function () {
this.stopCapping();
this.media = null;
};
CapLevelController.prototype.detectPlayerSize = function () {
if (this.media) {
if (this.mediaHeight <= 0 || this.mediaWidth <= 0 || !this.hls) {
this.clientRect = null;
return;
}
var levels = this.hls.levels;
if (levels.length > 1) {
var hls = this.hls;
var maxLevel = this.getMaxLevel(levels.length - 1);
if (maxLevel !== this.autoLevelCapping) ;
hls.autoLevelCapping = maxLevel;
if (hls.autoLevelEnabled &&
hls.autoLevelCapping > this.autoLevelCapping &&
this.streamController) {
this.streamController.nextLevelSwitch();
}
this.autoLevelCapping = hls.autoLevelCapping;
}
else if (levels.length === 1) {
this.stopCapping();
}
}
};
CapLevelController.prototype.getMaxLevel = function (capLevelIndex) {
var _this = this;
if (!this.hls) {
return -1;
}
var levels = this.hls.levels;
if (!levels.length) {
return -1;
}
var validLevels = levels.filter(function (level, index) { return _this.isLevelAllowed(level) && index <= capLevelIndex; });
if (!this.observer) {
this.clientRect = null;
}
return CapLevelController.getMaxLevelByMediaSize(validLevels, this.mediaWidth, this.mediaHeight);
};
CapLevelController.prototype.observe = function () {
var _this = this;
var ResizeObserver = self.ResizeObserver;
if (ResizeObserver) {
this.observer = new ResizeObserver(function (entries) {
var _a;
var bounds = (_a = entries[0]) === null || _a === void 0 ? void 0 : _a.contentRect;
if (bounds) {
_this.clientRect = bounds;
_this.detectPlayerSize();
}
});
}
if (this.observer && this.media) {
this.observer.observe(this.media);
}
};
CapLevelController.prototype.startCapping = function () {
var _a;
if (this.timer || this.observer || !((_a = this.hls) === null || _a === void 0 ? void 0 : _a.config.capLevelToPlayerSize)) {
return;
}
self.clearInterval(this.timer);
this.timer = undefined;
this.autoLevelCapping = Number.POSITIVE_INFINITY;
this.observe();
if (!this.observer) {
this.timer = self.setInterval(this.detectPlayerSize.bind(this), 1000);
}
this.detectPlayerSize();
};
CapLevelController.prototype.stopCapping = function () {
this.restrictedLevels = [];
this.autoLevelCapping = Number.POSITIVE_INFINITY;
if (this.timer) {
self.clearInterval(this.timer);
this.timer = undefined;
}
if (this.observer) {
this.observer.disconnect();
this.observer = undefined;
}
};
CapLevelController.prototype.getDimensions = function () {
if (this.clientRect) {
return this.clientRect;
}
var media = this.media;
var boundsRect = {
width: 0,
height: 0,
};
if (media) {
var clientRect = media.getBoundingClientRect();
boundsRect.width = clientRect.width;
boundsRect.height = clientRect.height;
if (!boundsRect.width && !boundsRect.height) {
boundsRect.width =
clientRect.right - clientRect.left || media.width || 0;
boundsRect.height =
clientRect.bottom - clientRect.top || media.height || 0;
}
}
this.clientRect = boundsRect;
return boundsRect;
};
Object.defineProperty(CapLevelController.prototype, "mediaWidth", {
get: function () {
return this.getDimensions().width * this.contentScaleFactor;
},
enumerable: false,
configurable: true
});
Object.defineProperty(CapLevelController.prototype, "mediaHeight", {
get: function () {
return this.getDimensions().height * this.contentScaleFactor;
},
enumerable: false,
configurable: true
});
Object.defineProperty(CapLevelController.prototype, "contentScaleFactor", {
get: function () {
var pixelRatio = 1;
if (!this.hls) {
return pixelRatio;
}
var _a = this.hls.config, ignoreDevicePixelRatio = _a.ignoreDevicePixelRatio, maxDevicePixelRatio = _a.maxDevicePixelRatio;
if (!ignoreDevicePixelRatio) {
try {
pixelRatio = self.devicePixelRatio;
}
catch (e) {
}
}
return Math.min(pixelRatio, maxDevicePixelRatio);
},
enumerable: false,
configurable: true
});
CapLevelController.prototype.isLevelAllowed = function (level) {
var restrictedLevels = this.restrictedLevels;
return !restrictedLevels.some(function (restrictedLevel) {
return (level.bitrate === restrictedLevel.bitrate &&
level.width === restrictedLevel.width &&
level.height === restrictedLevel.height);
});
};
CapLevelController.getMaxLevelByMediaSize = function (levels, width, height) {
if (!(levels === null || levels === void 0 ? void 0 : levels.length)) {
return -1;
}
var atGreatestBandwidth = function (curLevel, nextLevel) {
if (!nextLevel) {
return true;
}
return (curLevel.width !== nextLevel.width ||
curLevel.height !== nextLevel.height);
};
var maxLevelIndex = levels.length - 1;
var squareSize = Math.max(width, height);
for (var i = 0; i < levels.length; i += 1) {
var level = levels[i];
if ((level.width >= squareSize || level.height >= squareSize) &&
atGreatestBandwidth(level, levels[i + 1])) {
maxLevelIndex = i;
break;
}
}
return maxLevelIndex;
};
return CapLevelController;
}());
var FPSController = (function () {
function FPSController(hls) {
this.isVideoPlaybackQualityAvailable = false;
this.media = null;
this.lastDroppedFrames = 0;
this.lastDecodedFrames = 0;
this.hls = hls;
this.registerListeners();
}
FPSController.prototype.setStreamController = function (streamController) {
this.streamController = streamController;
};
FPSController.prototype.registerListeners = function () {
this.hls.on(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
this.hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
};
FPSController.prototype.unregisterListeners = function () {
this.hls.off(Events.MEDIA_ATTACHING, this.onMediaAttaching, this);
this.hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
};
FPSController.prototype.destroy = function () {
if (this.timer) {
clearInterval(this.timer);
}
this.unregisterListeners();
this.isVideoPlaybackQualityAvailable = false;
this.media = null;
};
FPSController.prototype.onMediaAttaching = function (event, data) {
var config = this.hls.config;
if (config.capLevelOnFPSDrop) {
var media = data.media instanceof self.HTMLVideoElement ? data.media : null;
this.media = media;
if (media && typeof media.getVideoPlaybackQuality === 'function') {
this.isVideoPlaybackQualityAvailable = true;
}
self.clearInterval(this.timer);
this.timer = self.setInterval(this.checkFPSInterval.bind(this), config.fpsDroppedMonitoringPeriod);
}
};
FPSController.prototype.onMediaDetaching = function () {
this.media = null;
};
FPSController.prototype.checkFPS = function (video, decodedFrames, droppedFrames) {
var currentTime = performance.now();
if (decodedFrames) {
if (this.lastTime) {
var currentPeriod = currentTime - this.lastTime;
var currentDropped = droppedFrames - this.lastDroppedFrames;
var currentDecoded = decodedFrames - this.lastDecodedFrames;
var droppedFPS = (1000 * currentDropped) / currentPeriod;
var hls = this.hls;
hls.trigger(Events.FPS_DROP, {
currentDropped: currentDropped,
currentDecoded: currentDecoded,
totalDroppedFrames: droppedFrames,
});
if (droppedFPS > 0) {
if (currentDropped >
hls.config.fpsDroppedMonitoringThreshold * currentDecoded) {
var currentLevel = hls.currentLevel;
hls.logger.warn('drop FPS ratio greater than max allowed value for currentLevel: ' +
currentLevel);
if (currentLevel > 0 &&
(hls.autoLevelCapping === -1 ||
hls.autoLevelCapping >= currentLevel)) {
currentLevel = currentLevel - 1;
hls.trigger(Events.FPS_DROP_LEVEL_CAPPING, {
level: currentLevel,
droppedLevel: hls.currentLevel,
});
hls.autoLevelCapping = currentLevel;
this.streamController.nextLevelSwitch();
}
}
}
}
this.lastTime = currentTime;
this.lastDroppedFrames = droppedFrames;
this.lastDecodedFrames = decodedFrames;
}
};
FPSController.prototype.checkFPSInterval = function () {
var video = this.media;
if (video) {
if (this.isVideoPlaybackQualityAvailable) {
var videoPlaybackQuality = video.getVideoPlaybackQuality();
this.checkFPS(video, videoPlaybackQuality.totalVideoFrames, videoPlaybackQuality.droppedVideoFrames);
}
else {
this.checkFPS(video, video.webkitDecodedFrameCount, video.webkitDroppedFrameCount);
}
}
};
return FPSController;
}());
var MAX_START_GAP_JUMP = 2.0;
var TICK_INTERVAL$1 = 100;
var GapController = (function (_super) {
__extends(GapController, _super);
function GapController(hls, fragmentTracker) {
var _this = _super.call(this, 'gap-controller', hls.logger) || this;
_this.media = null;
_this.nudgeRetry = 0;
_this.skipRetry = 0;
_this.stallReported = false;
_this.stalled = null;
_this.moved = false;
_this.seeking = false;
_this.buffered = {};
_this.ended = 0;
_this.waiting = 0;
_this.onMediaPlaying = function () {
_this.ended = 0;
_this.waiting = 0;
};
_this.onMediaWaiting = function () {
var _a;
if ((_a = _this.media) === null || _a === void 0 ? void 0 : _a.seeking) {
return;
}
_this.waiting = self.performance.now();
_this.tick();
};
_this.onMediaEnded = function () {
var _a;
if (_this.hls) {
_this.ended = ((_a = _this.media) === null || _a === void 0 ? void 0 : _a.currentTime) || 1;
_this.hls.trigger(Events.MEDIA_ENDED, {
stalled: false,
});
}
};
_this.hls = hls;
_this.fragmentTracker = fragmentTracker;
_this.lastCurrentTime = _this.getCurrentTime();
_this.registerListeners();
return _this;
}
GapController.prototype.registerListeners = function () {
var hls = this.hls;
if (hls) {
hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
hls.on(Events.BUFFER_APPENDED, this.onBufferAppended, this);
}
};
GapController.prototype.unregisterListeners = function () {
var hls = this.hls;
if (hls) {
hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
hls.off(Events.BUFFER_APPENDED, this.onBufferAppended, this);
}
};
GapController.prototype.destroy = function () {
_super.prototype.destroy.call(this);
this.unregisterListeners();
this.media = this.hls = this.fragmentTracker = null;
this.mediaSource = undefined;
};
GapController.prototype.onMediaAttached = function (event, data) {
this.setInterval(TICK_INTERVAL$1);
this.mediaSource = data.mediaSource;
var media = (this.media = data.media);
addEventListener(media, 'playing', this.onMediaPlaying);
addEventListener(media, 'waiting', this.onMediaWaiting);
addEventListener(media, 'ended', this.onMediaEnded);
};
GapController.prototype.onMediaDetaching = function (event, data) {
this.clearInterval();
var media = this.media;
if (media) {
removeEventListener(media, 'playing', this.onMediaPlaying);
removeEventListener(media, 'waiting', this.onMediaWaiting);
removeEventListener(media, 'ended', this.onMediaEnded);
this.media = null;
}
this.mediaSource = undefined;
};
GapController.prototype.onBufferAppended = function (event, data) {
this.buffered = data.timeRanges;
};
Object.defineProperty(GapController.prototype, "hasBuffered", {
get: function () {
return Object.keys(this.buffered).length > 0;
},
enumerable: false,
configurable: true
});
GapController.prototype.getCurrentTime = function () {
var _a;
var timelineOffset = ((_a = this.hls) === null || _a === void 0 ? void 0 : _a.config.timelineOffset) || 0;
if (this.media) {
return Math.max(this.media.currentTime, timelineOffset);
}
return timelineOffset;
};
GapController.prototype.tick = function () {
var _a;
if (!((_a = this.media) === null || _a === void 0 ? void 0 : _a.readyState) || !this.hasBuffered) {
return;
}
var currentTime = this.getCurrentTime();
if (this.media.currentTime < currentTime) {
return;
}
this.poll(currentTime, this.lastCurrentTime);
this.lastCurrentTime = currentTime;
};
GapController.prototype.poll = function (currentTime, lastCurrentTime) {
var _a, _b, _c;
var config = (_a = this.hls) === null || _a === void 0 ? void 0 : _a.config;
if (!config) {
return;
}
var media = this.media;
if (!media) {
return;
}
var seeking = media.seeking;
var seeked = this.seeking && !seeking;
var beginSeek = !this.seeking && seeking;
var pausedEndedOrHalted = (media.paused && !seeking) || media.ended || media.playbackRate === 0;
this.seeking = seeking;
if (currentTime !== lastCurrentTime) {
if (lastCurrentTime) {
this.ended = 0;
}
this.moved = true;
if (!seeking) {
this.skipRetry = this.nudgeRetry = 0;
if (config.nudgeOnVideoHole &&
!pausedEndedOrHalted &&
currentTime > lastCurrentTime) {
this.nudgeOnVideoHole(currentTime, lastCurrentTime);
}
}
if (this.waiting === 0) {
this.stallResolved(currentTime);
}
return;
}
if (beginSeek || seeked) {
if (seeked) {
this.stallResolved(currentTime);
}
return;
}
if (pausedEndedOrHalted) {
this.skipRetry = this.nudgeRetry = 0;
this.stallResolved(currentTime);
if (!this.ended && media.ended && this.hls) {
this.ended = currentTime || 1;
this.hls.trigger(Events.MEDIA_ENDED, {
stalled: false,
});
}
return;
}
if (!BufferHelper.getBuffered(media).length) {
this.skipRetry = this.nudgeRetry = 0;
return;
}
var bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
var fragmentTracker = this.fragmentTracker;
if (fragmentTracker && this.hls) {
withInterstitialBoundary(bufferInfo, currentTime, fragmentTracker, this.hls);
}
var nextStart = bufferInfo.nextStart || 0;
if (seeking && fragmentTracker && this.hls) {
var inFlightDependency = getInFlightDependency(this.hls.inFlightFragments, currentTime);
var hasEnoughBuffer = bufferInfo.len > MAX_START_GAP_JUMP;
var noBufferHole = !nextStart ||
inFlightDependency ||
(nextStart - currentTime > MAX_START_GAP_JUMP &&
!fragmentTracker.getPartialFragment(currentTime));
if (hasEnoughBuffer || noBufferHole) {
return;
}
this.moved = false;
}
var levelDetails = (_b = this.hls) === null || _b === void 0 ? void 0 : _b.latestLevelDetails;
if (!this.moved && this.stalled !== null && fragmentTracker) {
var isBuffered = bufferInfo.len > 0;
if (!isBuffered && !nextStart) {
return;
}
var startJump = Math.max(nextStart, bufferInfo.start || 0) - currentTime;
var isLive = !!(levelDetails === null || levelDetails === void 0 ? void 0 : levelDetails.live);
var maxStartGapJump = isLive
? levelDetails.targetduration * 2
: MAX_START_GAP_JUMP;
var appended = appendedFragAtPosition(currentTime, fragmentTracker);
if (startJump > 0 && (startJump <= maxStartGapJump || appended)) {
if (!media.paused) {
this._trySkipBufferHole(appended);
}
return;
}
}
var detectStallWithCurrentTimeMs = config.detectStallWithCurrentTimeMs;
var tnow = self.performance.now();
var tWaiting = this.waiting;
var stalled = this.stalled;
if (stalled === null) {
if (tWaiting > 0 && tnow - tWaiting < detectStallWithCurrentTimeMs) {
stalled = this.stalled = tWaiting;
}
else {
this.stalled = tnow;
return;
}
}
var stalledDuration = tnow - stalled;
if (!seeking &&
(stalledDuration >= detectStallWithCurrentTimeMs ||
(tWaiting && this.moved)) &&
this.hls) {
if (((_c = this.mediaSource) === null || _c === void 0 ? void 0 : _c.readyState) === 'ended' &&
!(levelDetails === null || levelDetails === void 0 ? void 0 : levelDetails.live) &&
Math.abs(currentTime - ((levelDetails === null || levelDetails === void 0 ? void 0 : levelDetails.edge) || 0)) < 1) {
if (this.ended) {
return;
}
this.ended = currentTime || 1;
this.hls.trigger(Events.MEDIA_ENDED, {
stalled: true,
});
return;
}
this._reportStall(bufferInfo);
if (!this.media || !this.hls) {
return;
}
if (media.currentTime !== currentTime) {
currentTime = media.currentTime;
this.moved = true;
return;
}
}
var bufferedWithHoles = BufferHelper.bufferInfo(media, currentTime, config.maxBufferHole);
this._tryFixBufferStall(bufferedWithHoles, stalledDuration, currentTime);
};
GapController.prototype.stallResolved = function (currentTime) {
var stalled = this.stalled;
if (stalled && this.hls) {
this.stalled = null;
if (this.stallReported) {
self.performance.now() - stalled;
this.stallReported = false;
this.waiting = 0;
this.hls.trigger(Events.STALL_RESOLVED, {});
}
}
};
GapController.prototype.nudgeOnVideoHole = function (currentTime, lastCurrentTime) {
var _a;
var videoSourceBuffered = this.buffered.video;
if (this.hls &&
this.media &&
this.fragmentTracker &&
((_a = this.buffered.audio) === null || _a === void 0 ? void 0 : _a.length) &&
videoSourceBuffered &&
videoSourceBuffered.length > 1 &&
currentTime > videoSourceBuffered.end(0)) {
var audioBufferInfo = BufferHelper.bufferedInfo(BufferHelper.timeRangesToArray(this.buffered.audio), currentTime, 0);
if (audioBufferInfo.len > 1 && lastCurrentTime >= audioBufferInfo.start) {
var videoTimes = BufferHelper.timeRangesToArray(videoSourceBuffered);
var lastBufferedIndex = BufferHelper.bufferedInfo(videoTimes, lastCurrentTime, 0).bufferedIndex;
if (lastBufferedIndex > -1 &&
lastBufferedIndex < videoTimes.length - 1) {
var bufferedIndex = BufferHelper.bufferedInfo(videoTimes, currentTime, 0).bufferedIndex;
var holeStart = videoTimes[lastBufferedIndex].end;
var holeEnd = videoTimes[lastBufferedIndex + 1].start;
if ((bufferedIndex === -1 || bufferedIndex > lastBufferedIndex) &&
holeEnd - holeStart < 1 &&
currentTime - holeStart < 2) {
var error = new Error("nudging playhead to flush pipeline after video hole. currentTime: ".concat(currentTime, " hole: ").concat(holeStart, " -> ").concat(holeEnd, " buffered index: ").concat(bufferedIndex));
this.warn(error.message);
this.media.currentTime += 0.000001;
var frag = appendedFragAtPosition(currentTime, this.fragmentTracker);
if (frag && 'fragment' in frag) {
frag = frag.fragment;
}
else if (!frag) {
frag = undefined;
}
var bufferInfo = BufferHelper.bufferInfo(this.media, currentTime, 0);
this.hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.BUFFER_SEEK_OVER_HOLE,
fatal: false,
error: error,
reason: error.message,
frag: frag,
buffer: bufferInfo.len,
bufferInfo: bufferInfo,
});
}
}
}
}
};
GapController.prototype._tryFixBufferStall = function (bufferInfo, stalledDurationMs, currentTime) {
var _a, _b;
var _c = this, fragmentTracker = _c.fragmentTracker, media = _c.media;
var config = (_a = this.hls) === null || _a === void 0 ? void 0 : _a.config;
if (!media || !fragmentTracker || !config) {
return;
}
var levelDetails = (_b = this.hls) === null || _b === void 0 ? void 0 : _b.latestLevelDetails;
var appended = appendedFragAtPosition(currentTime, fragmentTracker);
if (appended ||
((levelDetails === null || levelDetails === void 0 ? void 0 : levelDetails.live) && currentTime < levelDetails.fragmentStart)) {
var targetTime = this._trySkipBufferHole(appended);
if (targetTime || !this.media) {
return;
}
}
var bufferedRanges = bufferInfo.buffered;
var adjacentTraversal = this.adjacentTraversal(bufferInfo, currentTime);
if (((bufferedRanges &&
bufferedRanges.length > 1 &&
bufferInfo.len > config.maxBufferHole) ||
(bufferInfo.nextStart &&
(bufferInfo.nextStart - currentTime < config.maxBufferHole ||
adjacentTraversal))) &&
(stalledDurationMs > config.highBufferWatchdogPeriod * 1000 ||
this.waiting)) {
this.warn('Trying to nudge playhead over buffer-hole');
this._tryNudgeBuffer(bufferInfo);
}
};
GapController.prototype.adjacentTraversal = function (bufferInfo, currentTime) {
var fragmentTracker = this.fragmentTracker;
var nextStart = bufferInfo.nextStart;
if (fragmentTracker && nextStart) {
var current = fragmentTracker.getFragAtPos(currentTime, PlaylistLevelType.MAIN);
var next = fragmentTracker.getFragAtPos(nextStart, PlaylistLevelType.MAIN);
if (current && next) {
return next.sn - current.sn < 2;
}
}
return false;
};
GapController.prototype._reportStall = function (bufferInfo) {
var _a = this, hls = _a.hls, media = _a.media, stallReported = _a.stallReported, stalled = _a.stalled;
if (!stallReported && stalled !== null && media && hls) {
this.stallReported = true;
var error = new Error("Playback stalling at @".concat(media.currentTime, " due to low buffer (").concat(stringify(bufferInfo), ")"));
this.warn(error.message);
hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.BUFFER_STALLED_ERROR,
fatal: false,
error: error,
buffer: bufferInfo.len,
bufferInfo: bufferInfo,
stalled: { start: stalled },
});
}
};
GapController.prototype._trySkipBufferHole = function (appended) {
var _a;
var _b = this, fragmentTracker = _b.fragmentTracker, media = _b.media, hls = _b.hls;
var config = hls === null || hls === void 0 ? void 0 : hls.config;
if (!media || !fragmentTracker || !config) {
return 0;
}
var currentTime = media.currentTime;
var bufferInfo = BufferHelper.bufferInfo(media, currentTime, 0);
withInterstitialBoundary(bufferInfo, currentTime, fragmentTracker, hls);
var startTime = currentTime < bufferInfo.start ? bufferInfo.start : bufferInfo.nextStart;
if (startTime) {
var bufferStarved = bufferInfo.len <= config.maxBufferHole;
var waiting = bufferInfo.len > 0 && bufferInfo.len < 1 && media.readyState < 3;
var gapLength = startTime - currentTime;
if (gapLength > 0 && (bufferStarved || waiting)) {
if (gapLength > config.maxBufferHole) {
var startGap = false;
if (currentTime === 0) {
var startFrag = fragmentTracker.getAppendedFrag(0, PlaylistLevelType.MAIN);
if (startFrag && startTime < startFrag.end) {
startGap = true;
}
}
if (!startGap && appended) {
if (!((_a = hls.loadLevelObj) === null || _a === void 0 ? void 0 : _a.details)) {
return 0;
}
var inFlightDependency = getInFlightDependency(hls.inFlightFragments, startTime);
if (inFlightDependency) {
return 0;
}
var moreToLoad = false;
var pos = appended.end;
while (pos < startTime) {
var provisioned = appendedFragAtPosition(pos, fragmentTracker);
var duration = provisioned ? provisioned.duration : 0;
if (duration > 0) {
pos += duration;
}
else {
moreToLoad = true;
break;
}
}
if (moreToLoad) {
return 0;
}
}
}
var nudgeMaxRetry = config.nudgeMaxRetry, skipBufferHolePadding = config.skipBufferHolePadding;
var fatal = ++this.skipRetry > nudgeMaxRetry;
var targetTime = Math.max(startTime, currentTime) + skipBufferHolePadding;
if (!fatal) {
this.warn("skipping hole, adjusting currentTime from ".concat(currentTime, " to ").concat(targetTime));
this.moved = true;
media.currentTime = targetTime;
}
if (!(appended === null || appended === void 0 ? void 0 : appended.gap) || fatal) {
var error = new Error(fatal
? "Playhead still not moving after seeking over buffer hole from ".concat(currentTime, " to ").concat(targetTime, " after ").concat(config.nudgeMaxRetry, " attempts.")
: "fragment loaded with buffer holes, seeking from ".concat(currentTime, " to ").concat(targetTime));
var errorData = {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.BUFFER_SEEK_OVER_HOLE,
fatal: fatal,
error: error,
reason: error.message,
buffer: bufferInfo.len,
bufferInfo: bufferInfo,
};
if (appended) {
if ('fragment' in appended) {
errorData.part = appended;
}
else {
errorData.frag = appended;
}
}
hls.trigger(Events.ERROR, errorData);
}
return targetTime;
}
}
return 0;
};
GapController.prototype._tryNudgeBuffer = function (bufferInfo) {
var _a = this, hls = _a.hls, media = _a.media, nudgeRetry = _a.nudgeRetry;
var config = hls === null || hls === void 0 ? void 0 : hls.config;
if (!media || !config) {
return 0;
}
var currentTime = media.currentTime;
this.nudgeRetry++;
if (nudgeRetry < config.nudgeMaxRetry) {
var targetTime = currentTime + (nudgeRetry + 1) * config.nudgeOffset;
var error = new Error("Nudging 'currentTime' from ".concat(currentTime, " to ").concat(targetTime));
this.warn(error.message);
media.currentTime = targetTime;
hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.BUFFER_NUDGE_ON_STALL,
error: error,
fatal: false,
buffer: bufferInfo.len,
bufferInfo: bufferInfo,
});
}
else {
var error = new Error("Playhead still not moving while enough data buffered @".concat(currentTime, " after ").concat(config.nudgeMaxRetry, " nudges"));
this.error(error.message);
hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.BUFFER_STALLED_ERROR,
error: error,
fatal: true,
buffer: bufferInfo.len,
bufferInfo: bufferInfo,
});
}
};
return GapController;
}(TaskLoop));
function getInFlightDependency(inFlightFragments, currentTime) {
var main = inFlight(inFlightFragments.main);
if (main && main.start <= currentTime) {
return main;
}
var audio = inFlight(inFlightFragments.audio);
if (audio && audio.start <= currentTime) {
return audio;
}
return null;
}
function inFlight(inFlightData) {
if (!inFlightData) {
return null;
}
switch (inFlightData.state) {
case State.IDLE:
case State.STOPPED:
case State.ENDED:
case State.ERROR:
return null;
}
return inFlightData.frag;
}
function appendedFragAtPosition(pos, fragmentTracker) {
return (fragmentTracker.getAppendedFrag(pos, PlaylistLevelType.MAIN) ||
fragmentTracker.getPartialFragment(pos));
}
function withInterstitialBoundary(bufferInfo, currentTime, fragmentTracker, hls) {
hls.latestLevelDetails;
appendedFragAtPosition(currentTime, fragmentTracker);
if (interstitialsEnabled(hls.config)) ;
}
var ID3TrackController = undefined;
function getSourceBuffer() {
return self.SourceBuffer || self.WebKitSourceBuffer;
}
function isMSESupported() {
var mediaSource = getMediaSource();
if (!mediaSource) {
return false;
}
var sourceBuffer = getSourceBuffer();
return (!sourceBuffer ||
(sourceBuffer.prototype &&
typeof sourceBuffer.prototype.appendBuffer === 'function' &&
typeof sourceBuffer.prototype.remove === 'function'));
}
function isSupported() {
if (!isMSESupported()) {
return false;
}
var mediaSource = getMediaSource();
return (typeof (mediaSource === null || mediaSource === void 0 ? void 0 : mediaSource.isTypeSupported) === 'function' &&
(['avc1.42E01E,mp4a.40.2', 'av01.0.01M.08', 'vp09.00.50.08'].some(function (codecsForVideoContainer) {
return mediaSource.isTypeSupported(mimeTypeForCodec(codecsForVideoContainer, 'video'));
}) ||
['mp4a.40.2', 'fLaC'].some(function (codecForAudioContainer) {
return mediaSource.isTypeSupported(mimeTypeForCodec(codecForAudioContainer, 'audio'));
})));
}
function changeTypeSupported() {
var _a;
var sourceBuffer = getSourceBuffer();
return (typeof ((_a = sourceBuffer === null || sourceBuffer === void 0 ? void 0 : sourceBuffer.prototype) === null || _a === void 0 ? void 0 : _a.changeType) ===
'function');
}
var TICK_INTERVAL = 100;
var StreamController = (function (_super) {
__extends(StreamController, _super);
function StreamController(hls, fragmentTracker, keyLoader) {
var _this = _super.call(this, hls, fragmentTracker, keyLoader, 'stream-controller', PlaylistLevelType.MAIN) || this;
_this.audioCodecSwap = false;
_this.level = -1;
_this._forceStartLoad = false;
_this._hasEnoughToStart = false;
_this.altAudio = 0;
_this.audioOnly = false;
_this._couldBacktrack = false;
_this._backtrackFragment = undefined;
_this.audioCodecSwitch = false;
_this.videoBuffer = null;
_this.onMediaPlaying = function () {
_this.tick();
};
_this.onMediaSeeked = function () {
var media = _this.media;
var currentTime = media ? media.currentTime : null;
if (currentTime === null || !Number.isFinite(currentTime)) {
return;
}
if (!_this.getBufferedFrag(currentTime)) {
return;
}
var bufferInfo = _this.getFwdBufferInfoAtPos(media, currentTime, PlaylistLevelType.MAIN, 0);
if (!bufferInfo || bufferInfo.len === 0) {
return;
}
_this.tick();
};
_this.registerListeners();
return _this;
}
StreamController.prototype.registerListeners = function () {
_super.prototype.registerListeners.call(this);
var hls = this.hls;
hls.on(Events.MANIFEST_PARSED, this.onManifestParsed, this);
hls.on(Events.LEVEL_LOADING, this.onLevelLoading, this);
hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
hls.on(Events.FRAG_LOAD_EMERGENCY_ABORTED, this.onFragLoadEmergencyAborted, this);
hls.on(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
hls.on(Events.AUDIO_TRACK_SWITCHED, this.onAudioTrackSwitched, this);
hls.on(Events.BUFFER_CREATED, this.onBufferCreated, this);
hls.on(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
};
StreamController.prototype.unregisterListeners = function () {
_super.prototype.unregisterListeners.call(this);
var hls = this.hls;
hls.off(Events.MANIFEST_PARSED, this.onManifestParsed, this);
hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
hls.off(Events.FRAG_LOAD_EMERGENCY_ABORTED, this.onFragLoadEmergencyAborted, this);
hls.off(Events.AUDIO_TRACK_SWITCHING, this.onAudioTrackSwitching, this);
hls.off(Events.AUDIO_TRACK_SWITCHED, this.onAudioTrackSwitched, this);
hls.off(Events.BUFFER_CREATED, this.onBufferCreated, this);
hls.off(Events.BUFFER_FLUSHED, this.onBufferFlushed, this);
hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
};
StreamController.prototype.onHandlerDestroying = function () {
this.onMediaPlaying = this.onMediaSeeked = null;
this.unregisterListeners();
_super.prototype.onHandlerDestroying.call(this);
};
StreamController.prototype.startLoad = function (startPosition, skipSeekToStartPosition) {
if (this.levels) {
var _a = this, lastCurrentTime = _a.lastCurrentTime, hls = _a.hls;
this.stopLoad();
this.setInterval(TICK_INTERVAL);
this.level = -1;
if (!this.startFragRequested) {
var startLevel = hls.startLevel;
if (startLevel === -1) {
if (hls.config.testBandwidth && this.levels.length > 1) {
startLevel = 0;
this.bitrateTest = true;
}
else {
startLevel = hls.firstAutoLevel;
}
}
hls.nextLoadLevel = startLevel;
this.level = hls.loadLevel;
this._hasEnoughToStart = !!skipSeekToStartPosition;
}
if (lastCurrentTime > 0 &&
startPosition === -1 &&
!skipSeekToStartPosition &&
this.initPTS.length) {
startPosition = lastCurrentTime;
}
this.state = State.IDLE;
this.nextLoadPosition = this.lastCurrentTime =
startPosition + this.timelineOffset;
this.startPosition = skipSeekToStartPosition ? -1 : startPosition;
if (!skipSeekToStartPosition &&
!this.fragmentTracker.hasFragments(this.playlistType)) {
this._hasEnoughToStart = this.startFragRequested = false;
}
this.tick();
}
else {
this._forceStartLoad = true;
this.state = State.STOPPED;
}
};
StreamController.prototype.stopLoad = function () {
this._forceStartLoad = false;
_super.prototype.stopLoad.call(this);
};
StreamController.prototype.doTick = function () {
switch (this.state) {
case State.WAITING_LEVEL: {
var _a = this, levels = _a.levels, level = _a.level;
var currentLevel = levels === null || levels === void 0 ? void 0 : levels[level];
var details = currentLevel === null || currentLevel === void 0 ? void 0 : currentLevel.details;
if (details &&
(!details.live ||
(this.levelLastLoaded === currentLevel &&
!this.waitForLive(currentLevel)))) {
if (this.waitForCdnTuneIn(details)) {
break;
}
this.state = State.IDLE;
break;
}
else if (this.hls.nextLoadLevel !== this.level) {
this.state = State.IDLE;
break;
}
break;
}
case State.FRAG_LOADING_WAITING_RETRY:
this.checkRetryDate();
break;
}
if (this.state === State.IDLE) {
this.doTickIdle();
}
this.onTickEnd();
};
StreamController.prototype.onTickEnd = function () {
_super.prototype.onTickEnd.call(this);
this.checkFragmentChanged();
};
StreamController.prototype.doTickIdle = function () {
var _a;
var _b = this, hls = _b.hls, levelLastLoaded = _b.levelLastLoaded, levels = _b.levels, media = _b.media;
if (levelLastLoaded === null ||
(!media &&
!this.primaryPrefetch &&
(this.startFragRequested || !hls.config.startFragPrefetch))) {
return;
}
if (this.altAudio && this.audioOnly) {
return;
}
var level = this.buffering ? hls.nextLoadLevel : hls.loadLevel;
if (!(levels === null || levels === void 0 ? void 0 : levels[level])) {
return;
}
var levelInfo = levels[level];
var bufferInfo = this.getMainFwdBufferInfo();
if (bufferInfo === null) {
return;
}
var lastDetails = this.getLevelDetails();
if (lastDetails &&
this._streamEnded(bufferInfo, lastDetails) &&
this.altAudio !== 1) {
var data = {
type: this.targetBufferType(),
};
this.hls.trigger(Events.BUFFER_EOS, data);
this.state = State.ENDED;
return;
}
if (!this.buffering) {
return;
}
if (hls.loadLevel !== level && hls.manualLevel === -1) ;
this.level = hls.nextLoadLevel = level;
var levelDetails = levelInfo.details;
if (!levelDetails ||
this.state === State.WAITING_LEVEL ||
this.waitForLive(levelInfo)) {
this.level = level;
this.state = State.WAITING_LEVEL;
this.startFragRequested = false;
return;
}
var bufferLen = bufferInfo.len;
var maxBufLen = this.getMaxBufferLength(levelInfo.maxBitrate);
if (bufferLen >= maxBufLen) {
return;
}
if (this.backtrackFragment &&
this.backtrackFragment.start > bufferInfo.end) {
this.backtrackFragment = undefined;
}
var targetBufferTime = this.backtrackFragment
? this.backtrackFragment.start
: bufferInfo.end;
var frag = this.getNextFragment(targetBufferTime, levelDetails);
if (this.couldBacktrack &&
!this.fragPrevious &&
frag &&
isMediaFragment(frag) &&
this.fragmentTracker.getState(frag) !== "OK") {
var backtrackSn = ((_a = this.backtrackFragment) !== null && _a !== void 0 ? _a : frag).sn;
var fragIdx = backtrackSn - levelDetails.startSN;
var backtrackFrag = levelDetails.fragments[fragIdx - 1];
if (backtrackFrag && frag.cc === backtrackFrag.cc) {
frag = backtrackFrag;
this.fragmentTracker.removeFragment(backtrackFrag);
}
}
else if (this.backtrackFragment && bufferInfo.len) {
this.backtrackFragment = undefined;
}
if (frag && this.isLoopLoading(frag, targetBufferTime)) {
var gapStart = frag.gap;
if (!gapStart) {
var type = this.audioOnly && !this.altAudio
? "audio"
: "video";
var mediaBuffer = (type === "video"
? this.videoBuffer
: this.mediaBuffer) || this.media;
if (mediaBuffer) {
this.afterBufferFlushed(mediaBuffer, type);
}
}
frag = this.getNextFragmentLoopLoading(frag, levelDetails, bufferInfo, PlaylistLevelType.MAIN, maxBufLen);
}
if (!frag) {
return;
}
if (this.exceedsMaxBuffer(bufferInfo, maxBufLen, frag)) {
return;
}
this.loadFragment(frag, levelInfo, targetBufferTime);
};
StreamController.prototype.loadFragment = function (frag, level, targetBufferTime) {
var fragState = this.fragmentTracker.getState(frag);
if (fragState === "NOT_LOADED" ||
fragState === "PARTIAL") {
if (this.bitrateTest) {
this._loadBitrateTestFrag(frag, level);
}
else {
_super.prototype.loadFragment.call(this, frag, level, targetBufferTime);
}
}
else {
this.clearTrackerIfNeeded(frag);
}
};
StreamController.prototype.immediateLevelSwitch = function () {
var _a;
this.abortCurrentFrag();
this.flushMainBuffer(0, Number.POSITIVE_INFINITY);
if (this.altAudio !== 0) {
var liveWindowStart = ((_a = this.getLevelDetails()) === null || _a === void 0 ? void 0 : _a.fragmentStart) || 0;
if (liveWindowStart > this.lastCurrentTime) {
_super.prototype.flushMainBuffer.call(this, 0, Number.POSITIVE_INFINITY, 'audio');
}
}
};
StreamController.prototype.getBufferOutput = function () {
if (this.mediaBuffer && this.altAudio === 2) {
return this.mediaBuffer;
}
return this.media;
};
StreamController.prototype.checkFragmentChanged = function () {
var previousFrag = this.fragPlaying;
var fragChanged = this.checkFragPlaying();
if (!fragChanged) {
return false;
}
var fragPlaying = this.fragPlaying;
if (fragPlaying) {
var fragCurrentLevel = fragPlaying.level;
this.hls.trigger(Events.FRAG_CHANGED, {
frag: fragPlaying,
previousFrag: previousFrag,
});
if ((previousFrag === null || previousFrag === void 0 ? void 0 : previousFrag.level) !== fragCurrentLevel) {
this.hls.trigger(Events.LEVEL_SWITCHED, {
level: fragCurrentLevel,
});
}
}
return true;
};
Object.defineProperty(StreamController.prototype, "backtrackFragment", {
get: function () {
return this._backtrackFragment;
},
set: function (value) {
this._backtrackFragment = value;
},
enumerable: false,
configurable: true
});
Object.defineProperty(StreamController.prototype, "couldBacktrack", {
get: function () {
return this._couldBacktrack;
},
set: function (value) {
this._couldBacktrack = value;
},
enumerable: false,
configurable: true
});
StreamController.prototype.abortCurrentFrag = function () {
this.backtrackFragment = undefined;
_super.prototype.abortCurrentFrag.call(this);
};
StreamController.prototype.flushMainBuffer = function (startOffset, endOffset) {
_super.prototype.flushMainBuffer.call(this, startOffset, endOffset, this.targetBufferType());
};
StreamController.prototype.targetBufferType = function () {
return this.altAudio === 2 && !this.audioOnly
? 'video'
: null;
};
StreamController.prototype.onMediaAttached = function (event, data) {
_super.prototype.onMediaAttached.call(this, event, data);
var media = data.media;
addEventListener(media, 'playing', this.onMediaPlaying);
addEventListener(media, 'seeked', this.onMediaSeeked);
};
StreamController.prototype.onMediaDetaching = function (event, data) {
var media = this.media;
if (media) {
removeEventListener(media, 'playing', this.onMediaPlaying);
removeEventListener(media, 'seeked', this.onMediaSeeked);
}
this.videoBuffer = null;
_super.prototype.onMediaDetaching.call(this, event, data);
var transferringMedia = !!data.transferMedia;
if (transferringMedia) {
return;
}
this._hasEnoughToStart = false;
};
StreamController.prototype.onManifestLoading = function () {
_super.prototype.onManifestLoading.call(this);
this.hls.trigger(Events.BUFFER_RESET, undefined);
this.couldBacktrack = false;
this.backtrackFragment = undefined;
this.altAudio = 0;
this.audioOnly = false;
};
StreamController.prototype.onManifestParsed = function (event, data) {
var aac = false;
var heaac = false;
for (var i = 0; i < data.levels.length; i++) {
var codec = data.levels[i].audioCodec;
if (codec) {
aac = aac || codec.indexOf('mp4a.40.2') !== -1;
heaac = heaac || codec.indexOf('mp4a.40.5') !== -1;
}
}
this.audioCodecSwitch = aac && heaac && !changeTypeSupported();
if (this.audioCodecSwitch) ;
this.levels = data.levels;
this.startFragRequested = false;
};
StreamController.prototype.onLevelLoading = function (event, data) {
var levels = this.levels;
if (!levels || this.state !== State.IDLE) {
return;
}
var level = data.levelInfo;
if (!level.details ||
(level.details.live &&
(this.levelLastLoaded !== level || level.details.expired)) ||
this.waitForCdnTuneIn(level.details)) {
this.state = State.WAITING_LEVEL;
}
};
StreamController.prototype.onLevelLoaded = function (event, data) {
var _this = this;
var _a, _b;
var _c = this, levels = _c.levels, startFragRequested = _c.startFragRequested;
var newLevelId = data.level;
var newDetails = data.details;
newDetails.totalduration;
if (!levels) {
this.warn("Levels were reset while loading level ".concat(newLevelId));
return;
}
var curLevel = data.levelInfo;
var fragCurrent = this.fragCurrent;
if (fragCurrent &&
(this.state === State.FRAG_LOADING ||
this.state === State.FRAG_LOADING_WAITING_RETRY)) {
if (fragCurrent.level !== data.level && fragCurrent.loader) {
this.abortCurrentFrag();
}
}
var sliding = 0;
if (newDetails.live || ((_a = curLevel.details) === null || _a === void 0 ? void 0 : _a.live)) {
this.checkLiveUpdate(newDetails);
if (newDetails.deltaUpdateFailed) {
return;
}
sliding = this.alignPlaylists(newDetails, curLevel.details, (_b = this.levelLastLoaded) === null || _b === void 0 ? void 0 : _b.details);
}
curLevel.details = newDetails;
this.levelLastLoaded = curLevel;
if (!startFragRequested) {
this.setStartPosition(newDetails, sliding);
}
this.hls.trigger(Events.LEVEL_UPDATED, {
details: newDetails,
level: newLevelId,
});
if (this.state === State.WAITING_LEVEL) {
if (this.waitForCdnTuneIn(newDetails)) {
return;
}
this.state = State.IDLE;
}
if (startFragRequested && newDetails.live) {
this.synchronizeToLiveEdge(newDetails);
}
this.initPTS.some(function (t, i) {
if (i >= newDetails.startCC) {
return true;
}
delete _this.initPTS[i];
});
this.tick();
};
StreamController.prototype.synchronizeToLiveEdge = function (levelDetails) {
var _a;
var _b = this, config = _b.config, media = _b.media;
if (!media) {
return;
}
var liveSyncPosition = this.hls.liveSyncPosition;
var currentTime = this.playhead;
var start = levelDetails.fragmentStart;
var end = levelDetails.edge;
var withinSlidingWindow = currentTime >= start - config.maxFragLookUpTolerance &&
currentTime <= end;
if (liveSyncPosition !== null &&
media.duration > liveSyncPosition &&
(currentTime < liveSyncPosition || !withinSlidingWindow)) {
var maxLatency = config.liveMaxLatencyDuration !== undefined
? config.liveMaxLatencyDuration
: config.liveMaxLatencyDurationCount * levelDetails.targetduration;
if ((!withinSlidingWindow && media.readyState < 4) ||
currentTime < end - maxLatency) {
if (!this._hasEnoughToStart) {
this.nextLoadPosition = liveSyncPosition;
}
if (media.readyState) {
this.warn("Playback: ".concat(currentTime, " is located too far from the end of live sliding playlist: ").concat(end, ", reset currentTime to : ").concat(liveSyncPosition));
if (this.config.liveSyncMode === 'buffered') {
var bufferInfo = BufferHelper.bufferInfo(media, liveSyncPosition, 0);
if (!((_a = bufferInfo.buffered) === null || _a === void 0 ? void 0 : _a.length)) {
media.currentTime = liveSyncPosition;
return;
}
var isLiveSyncInBuffer = bufferInfo.start <= currentTime;
if (isLiveSyncInBuffer) {
media.currentTime = liveSyncPosition;
return;
}
var nextStart = BufferHelper.bufferedInfo(bufferInfo.buffered, currentTime, 0).nextStart;
if (nextStart) {
media.currentTime = nextStart;
}
}
else {
media.currentTime = liveSyncPosition;
}
}
}
}
};
StreamController.prototype._handleFragmentLoadProgress = function (data) {
var _a;
var frag = data.frag;
var part = data.part, payload = data.payload;
var levels = this.levels;
if (!levels) {
this.warn("Levels were reset while fragment load was in progress. Fragment ".concat(frag.sn, " of level ").concat(frag.level, " will not be buffered"));
return;
}
var currentLevel = levels[frag.level];
if (!currentLevel) {
this.warn("Level ".concat(frag.level, " not found on progress"));
return;
}
var details = currentLevel.details;
if (!details) {
this.warn("Dropping fragment ".concat(frag.sn, " of level ").concat(frag.level, " after level details were reset"));
this.fragmentTracker.removeFragment(frag);
return;
}
var videoCodec = currentLevel.videoCodec;
var accurateTimeOffset = details.PTSKnown || !details.live;
var initSegmentData = (_a = frag.initSegment) === null || _a === void 0 ? void 0 : _a.data;
var audioCodec = this._getAudioCodec(currentLevel);
var transmuxer = (this.transmuxer =
this.transmuxer ||
new TransmuxerInterface(this.hls, PlaylistLevelType.MAIN, this._handleTransmuxComplete.bind(this), this._handleTransmuxerFlush.bind(this)));
var partIndex = part ? part.index : -1;
var partial = partIndex !== -1;
var _b = getAESAdjustments(frag, part, this.iframesOnly), decryptRange = _b.decryptRange, byteRange = _b.byteRange;
var chunkMeta = new ChunkMetadata(frag.level, frag.sn, frag.stats.chunkCount, byteRange ? byteRange.end - byteRange.start : payload.byteLength, partIndex, partial, frag.duration, this.iframesOnly, decryptRange);
var initPTS = this.initPTS[frag.cc];
transmuxer.push(payload, initSegmentData, audioCodec, videoCodec, frag, part, details.totalduration, accurateTimeOffset, chunkMeta, initPTS);
};
StreamController.prototype.onAudioTrackSwitching = function (event, data) {
var _this = this;
var hls = this.hls;
var fromAltAudio = this.altAudio !== 0;
var altAudio = useAlternateAudio(data.url, hls);
if (!altAudio) {
if (this.mediaBuffer !== this.media) {
this.mediaBuffer = this.media;
var fragCurrent = this.fragCurrent;
if (fragCurrent) {
fragCurrent.abortRequests();
this.fragmentTracker.removeFragment(fragCurrent);
}
this.resetTransmuxer();
this.resetLoadingState();
}
else if (this.audioOnly) {
this.resetTransmuxer();
}
if (fromAltAudio) {
this.altAudio = 0;
this.fragmentTracker.removeAllFragments();
hls.once(Events.BUFFER_FLUSHED, function () {
if (!_this.hls) {
return;
}
_this.hls.trigger(Events.AUDIO_TRACK_SWITCHED, data);
});
hls.trigger(Events.BUFFER_FLUSHING, {
startOffset: 0,
endOffset: Number.POSITIVE_INFINITY,
type: null,
});
return;
}
hls.trigger(Events.AUDIO_TRACK_SWITCHED, data);
}
else {
this.altAudio = 1;
}
};
StreamController.prototype.onAudioTrackSwitched = function (event, data) {
var altAudio = useAlternateAudio(data.url, this.hls);
if (altAudio) {
var videoBuffer = this.videoBuffer;
if (videoBuffer && this.mediaBuffer !== videoBuffer) {
this.mediaBuffer = videoBuffer;
}
}
this.altAudio = altAudio
? 2
: 0;
this.tick();
};
StreamController.prototype.onBufferCreated = function (event, data) {
var tracks = data.tracks;
var mediaTrack;
var alternate = false;
for (var type in tracks) {
var track = tracks[type];
if (track.id === 'main') {
mediaTrack = track;
if (type === 'video') {
var videoTrack = tracks[type];
if (videoTrack) {
this.videoBuffer = videoTrack.buffer;
}
}
}
else {
alternate = true;
}
}
if (alternate && mediaTrack) {
this.mediaBuffer = mediaTrack.buffer;
}
else {
this.mediaBuffer = this.media;
}
};
StreamController.prototype.onFragBuffered = function (event, data) {
var _a;
var frag = data.frag, part = data.part;
var bufferedMainFragment = frag.type === PlaylistLevelType.MAIN;
if (bufferedMainFragment) {
if (this.fragContextChanged(frag)) {
this.warn("Fragment ".concat(frag.sn).concat(part ? ' p: ' + part.index : '', " of level ").concat(frag.level, " finished buffering, but was aborted. state: ").concat(this.state));
if (this.state === State.PARSED) {
this.state = State.IDLE;
}
return;
}
var fragError = false;
if (isMediaFragment(frag)) {
fragError =
!!frag.gap && !frag.tagList.some(function (tags) { return tags[0] === 'GAP'; });
}
this.fragBufferedComplete(frag, part);
if (fragError) {
frag.stats.retry++;
var level = (_a = this.levels) === null || _a === void 0 ? void 0 : _a[frag.level];
if (level) {
level.fragmentError++;
}
}
}
var media = this.media;
if (!media) {
return;
}
if (!this._hasEnoughToStart && BufferHelper.getBuffered(media).length) {
this.seekToStartPos();
this._hasEnoughToStart = true;
}
if (bufferedMainFragment) {
this.tick();
}
};
Object.defineProperty(StreamController.prototype, "hasEnoughToStart", {
get: function () {
return this._hasEnoughToStart;
},
enumerable: false,
configurable: true
});
StreamController.prototype.onError = function (event, data) {
var _a;
if (data.fatal) {
this.state = State.ERROR;
return;
}
switch (data.details) {
case ErrorDetails.FRAG_GAP:
case ErrorDetails.FRAG_PARSING_ERROR:
case ErrorDetails.FRAG_DECRYPT_ERROR:
case ErrorDetails.FRAG_LOAD_ERROR:
case ErrorDetails.FRAG_LOAD_TIMEOUT:
case ErrorDetails.KEY_LOAD_ERROR:
case ErrorDetails.KEY_LOAD_TIMEOUT:
this.onFragmentOrKeyLoadError(PlaylistLevelType.MAIN, data);
break;
case ErrorDetails.LEVEL_LOAD_ERROR:
case ErrorDetails.LEVEL_LOAD_TIMEOUT:
case ErrorDetails.LEVEL_PARSING_ERROR:
if (!data.levelRetry &&
this.state === State.WAITING_LEVEL &&
((_a = data.context) === null || _a === void 0 ? void 0 : _a.type) === LoaderContextType.LEVEL) {
this.state = State.IDLE;
}
break;
case ErrorDetails.BUFFER_APPEND_NO_PROGRESS:
if (data.parent !== 'main') {
return;
}
if (data.frag &&
(data.appendsWithoutProgress || 0) >= this.config.appendErrorMaxRetry) {
this.warn("Marking fragment ".concat(data.frag.sn, " of level ").concat(data.frag.level, " as a gap after ").concat(data.appendsWithoutProgress, " appends without buffered range growth, to prevent loop loading"));
this.fragmentTracker.addAsGap(data.frag);
}
break;
case ErrorDetails.MEDIA_SOURCE_REQUIRES_RESET:
this.onSourceBufferError(PlaylistLevelType.MAIN, data);
break;
case ErrorDetails.BUFFER_ADD_CODEC_ERROR:
case ErrorDetails.BUFFER_APPEND_ERROR:
if (data.parent !== 'main') {
return;
}
if (this.reduceLengthAndFlushBuffer(data)) {
this.resetLoadingState();
}
break;
case ErrorDetails.BUFFER_FULL_ERROR:
if (data.parent !== 'main') {
return;
}
if (this.reduceLengthAndFlushBuffer(data)) {
var isAssetPlayer = !this.config.interstitialsController && this.config.assetPlayerId;
if (isAssetPlayer) {
this._hasEnoughToStart = true;
}
else {
this.flushMainBuffer(0, Number.POSITIVE_INFINITY);
}
}
break;
case ErrorDetails.INTERNAL_EXCEPTION:
this.recoverWorkerError(data);
break;
}
};
StreamController.prototype.onFragLoadEmergencyAborted = function () {
this.state = State.IDLE;
if (!this._hasEnoughToStart) {
this.startFragRequested = false;
this.nextLoadPosition = this.lastCurrentTime;
}
this.tickImmediate();
};
StreamController.prototype.onBufferFlushed = function (event, _a) {
var type = _a.type;
if (type !== "audio" || !this.altAudio) {
var mediaBuffer = (type === "video"
? this.videoBuffer
: this.mediaBuffer) || this.media;
if (mediaBuffer) {
this.afterBufferFlushed(mediaBuffer, type);
this.tick();
}
}
};
StreamController.prototype.onLevelsUpdated = function (event, data) {
if (this.level > -1 && this.fragCurrent) {
this.level = this.fragCurrent.level;
if (this.level === -1) {
this.resetWhenMissingContext(this.fragCurrent);
}
}
this.levels = data.levels;
};
StreamController.prototype.swapAudioCodec = function () {
this.audioCodecSwap = !this.audioCodecSwap;
};
StreamController.prototype.seekToStartPos = function () {
var media = this.media;
if (!media) {
return;
}
var currentTime = media.currentTime;
var startPosition = this.startPosition;
if (startPosition >= 0 && currentTime < startPosition) {
if (media.seeking) {
return;
}
var timelineOffset = this.timelineOffset;
if (timelineOffset && startPosition) {
startPosition += timelineOffset;
}
var details = this.getLevelDetails();
var buffered = BufferHelper.getBuffered(media);
var bufferStart = buffered.length ? buffered.start(0) : 0;
var delta = bufferStart - startPosition;
var skipTolerance = Math.max(this.config.maxBufferHole, this.config.maxFragLookUpTolerance);
if (this.config.startOnSegmentBoundary ||
(delta > 0 &&
(delta < skipTolerance ||
(this.loadingParts && delta < 2 * ((details === null || details === void 0 ? void 0 : details.partTarget) || 0))))) {
startPosition += delta;
this.startPosition = startPosition;
}
if (currentTime < startPosition) {
media.currentTime = startPosition;
}
}
};
StreamController.prototype._getAudioCodec = function (currentLevel) {
var audioCodec = this.config.defaultAudioCodec || currentLevel.audioCodec;
if (this.audioCodecSwap && audioCodec) {
if (__bolli.any_indexOf(audioCodec, 'mp4a.40.5') !== -1) {
audioCodec = 'mp4a.40.2';
}
else {
audioCodec = 'mp4a.40.5';
}
}
return audioCodec;
};
StreamController.prototype._loadBitrateTestFrag = function (fragment, level) {
var _this = this;
fragment.bitrateTest = true;
this._doFragLoad(fragment, level)
.then(function (data) {
var hls = _this.hls;
var frag = data === null || data === void 0 ? void 0 : data.frag;
if (!frag || _this.fragContextChanged(frag)) {
return;
}
level.fragmentError = 0;
_this.state = State.IDLE;
_this.startFragRequested = false;
_this.bitrateTest = false;
var stats = frag.stats;
stats.parsing.start =
stats.parsing.end =
stats.buffering.start =
stats.buffering.end =
self.performance.now();
hls.trigger(Events.FRAG_LOADED, data);
frag.bitrateTest = false;
})
.catch(function (reason) {
if (_this.state === State.STOPPED || _this.state === State.ERROR) {
return;
}
_this.warn(reason);
_this.resetFragmentLoading(fragment);
});
};
StreamController.prototype._handleTransmuxComplete = function (transmuxResult) {
var id = this.playlistType;
var hls = this.hls;
var remuxResult = transmuxResult.remuxResult, chunkMeta = transmuxResult.chunkMeta;
var context = this.getCurrentContext(chunkMeta);
if (!context) {
this.resetWhenMissingContext(chunkMeta);
return;
}
var frag = context.frag, part = context.part, level = context.level;
var video = remuxResult.video, text = remuxResult.text, id3 = remuxResult.id3, initSegment = remuxResult.initSegment;
var details = level.details;
var audio = this.altAudio ? undefined : remuxResult.audio;
if (this.fragContextChanged(frag)) {
this.fragmentTracker.removeFragment(frag);
return;
}
this.state = State.PARSING;
if (initSegment) {
var tracks = initSegment.tracks;
if (tracks) {
var mapFragment = frag.initSegment || frag;
if (this.unhandledEncryptionError(initSegment, frag)) {
return;
}
this._bufferInitSegment(level, tracks, mapFragment, chunkMeta);
hls.trigger(Events.FRAG_PARSING_INIT_SEGMENT, {
frag: mapFragment,
id: id,
tracks: tracks,
});
}
var baseTime = initSegment.initPTS;
var timescale = initSegment.timescale;
var initPTS = this.initPTS[frag.cc];
if (Number.isFinite(baseTime) &&
(!initPTS ||
initPTS.baseTime !== baseTime ||
initPTS.timescale !== timescale)) {
var trackId = initSegment.trackId;
this.initPTS[frag.cc] = {
baseTime: baseTime,
timescale: timescale,
trackId: trackId,
};
var timestampOffsets = this.initPTS.slice(0);
hls.trigger(Events.INIT_PTS_FOUND, {
timestampOffsets: timestampOffsets,
frag: frag,
id: id,
initPTS: baseTime,
timescale: timescale,
trackId: trackId,
});
}
}
if (video && details) {
if (audio && video.type === 'audiovideo') {
this.logMuxedErr(frag);
}
var prevFrag = details.fragments[frag.sn - 1 - details.startSN];
var isFirstFragment = frag.sn === details.startSN;
var isFirstInDiscontinuity = !prevFrag || frag.cc > prevFrag.cc;
if (remuxResult.independent !== false) {
var startPTS = video.startPTS, endPTS = video.endPTS, startDTS = video.startDTS, endDTS = video.endDTS;
if (part) {
part.elementaryStreams[video.type] = {
startPTS: startPTS,
endPTS: endPTS,
startDTS: startDTS,
endDTS: endDTS,
};
}
else {
if (video.firstKeyFrame &&
video.independent &&
chunkMeta.id === 1 &&
!isFirstInDiscontinuity) {
this.couldBacktrack = true;
}
if (video.dropped && video.independent) {
var bufferInfo = this.getMainFwdBufferInfo();
var targetBufferTime = (bufferInfo ? bufferInfo.end : this.getLoadPosition()) +
this.config.maxBufferHole;
var startTime = video.firstKeyFramePTS
? video.firstKeyFramePTS
: startPTS;
if (!isFirstFragment &&
targetBufferTime < startTime - this.config.maxBufferHole &&
!isFirstInDiscontinuity) {
this.backtrack(frag);
return;
}
else if (isFirstInDiscontinuity) {
frag.gap = true;
}
frag.setElementaryStreamInfo(video.type, frag.start, endPTS, frag.start, endDTS, true);
}
else if (isFirstFragment &&
startPTS - (details.appliedTimelineOffset || 0) > MAX_START_GAP_JUMP) {
frag.gap = true;
}
}
frag.setElementaryStreamInfo(video.type, startPTS, endPTS, startDTS, endDTS);
if (this.backtrackFragment) {
this.backtrackFragment = frag;
}
this.bufferFragmentData(video, frag, part, chunkMeta, isFirstFragment || isFirstInDiscontinuity);
}
else if (isFirstFragment || isFirstInDiscontinuity) {
frag.gap = true;
}
else {
this.backtrack(frag);
return;
}
}
if (audio) {
var startPTS = audio.startPTS, endPTS = audio.endPTS, startDTS = audio.startDTS, endDTS = audio.endDTS;
if (part) {
part.elementaryStreams["audio"] = {
startPTS: startPTS,
endPTS: endPTS,
startDTS: startDTS,
endDTS: endDTS,
};
}
frag.setElementaryStreamInfo("audio", startPTS, endPTS, startDTS, endDTS);
this.bufferFragmentData(audio, frag, part, chunkMeta);
}
if (details && (id3 === null || id3 === void 0 ? void 0 : id3.samples.length)) {
var emittedID3 = {
id: id,
frag: frag,
details: details,
samples: id3.samples,
};
hls.trigger(Events.FRAG_PARSING_METADATA, emittedID3);
}
if (details && text) {
var emittedText = {
id: id,
frag: frag,
details: details,
samples: text.samples,
};
hls.trigger(Events.FRAG_PARSING_USERDATA, emittedText);
}
};
StreamController.prototype.logMuxedErr = function (frag) {
this.warn("".concat(isMediaFragment(frag) ? 'Media' : 'Init', " segment with muxed audiovideo where only video expected: ").concat(frag.url));
};
StreamController.prototype._bufferInitSegment = function (currentLevel, tracks, frag, chunkMeta) {
var _this = this;
if (this.state !== State.PARSING) {
return;
}
this.audioOnly = !!tracks.audio && !tracks.video;
if (this.altAudio && !this.audioOnly) {
delete tracks.audio;
if (tracks.audiovideo) {
this.logMuxedErr(frag);
}
}
var audio = tracks.audio, video = tracks.video, audiovideo = tracks.audiovideo;
if (audio) {
var levelCodec = currentLevel.audioCodec;
var audioCodec = pickMostCompleteCodecName(audio.codec, levelCodec);
if (audioCodec === 'mp4a') {
audioCodec = 'mp4a.40.5';
}
if (this.audioCodecSwitch) {
if (audioCodec) {
if (audioCodec.indexOf('mp4a.40.5') !== -1) {
audioCodec = 'mp4a.40.2';
}
else {
audioCodec = 'mp4a.40.5';
}
}
var audioMetadata = audio.metadata;
if (audioMetadata &&
'channelCount' in audioMetadata &&
(audioMetadata.channelCount || 1) !== 1 &&
!userAgentFirefoxVersion()) {
audioCodec = 'mp4a.40.5';
}
}
if (audioCodec &&
audioCodec.indexOf('mp4a.40.5') !== -1 &&
userAgentIsAndroidLike() &&
audio.container !== 'audio/mpeg') {
audioCodec = 'mp4a.40.2';
}
audio.levelCodec = audioCodec;
audio.id = PlaylistLevelType.MAIN;
delete tracks.audiovideo;
}
if (video) {
video.levelCodec = currentLevel.videoCodec;
video.id = PlaylistLevelType.MAIN;
var parsedVideoCodec = video.codec;
if ((parsedVideoCodec === null || parsedVideoCodec === void 0 ? void 0 : parsedVideoCodec.length) === 4) {
switch (parsedVideoCodec) {
case 'hvc1':
case 'hev1':
video.codec = 'hvc1.1.6.L120.90';
break;
case 'av01':
video.codec = 'av01.0.04M.08';
break;
case 'avc1':
video.codec = 'avc1.42e01e';
break;
}
}
delete tracks.audiovideo;
}
if (audiovideo) {
if (this.iframesOnly) {
this.logMuxedErr(frag);
}
delete tracks.video;
delete tracks.audio;
}
var trackTypes = Object.keys(tracks);
if (trackTypes.length) {
this.hls.trigger(Events.BUFFER_CODECS, tracks);
if (!this.hls) {
return;
}
trackTypes.forEach(function (trackName) {
var track = tracks[trackName];
var initSegment = track.initSegment;
if (initSegment === null || initSegment === void 0 ? void 0 : initSegment.byteLength) {
_this.hls.trigger(Events.BUFFER_APPENDING, {
type: trackName,
data: initSegment,
frag: frag,
part: null,
chunkMeta: chunkMeta,
parent: frag.type,
});
}
});
}
this.tickImmediate();
};
StreamController.prototype.getMainFwdBufferInfo = function () {
var bufferOutput = this.getBufferOutput();
return this.getFwdBufferInfo(bufferOutput, PlaylistLevelType.MAIN);
};
Object.defineProperty(StreamController.prototype, "maxBufferLength", {
get: function () {
var _a = this, levels = _a.levels, level = _a.level;
var levelInfo = levels === null || levels === void 0 ? void 0 : levels[level];
if (!levelInfo) {
return this.config.maxBufferLength;
}
return this.getMaxBufferLength(levelInfo.maxBitrate);
},
enumerable: false,
configurable: true
});
StreamController.prototype.backtrack = function (frag) {
this.couldBacktrack = true;
this.backtrackFragment = frag;
this.resetTransmuxer();
this.flushBufferGap(frag);
this.fragmentTracker.removeFragment(frag);
this.fragPrevious = null;
this.nextLoadPosition = frag.start;
this.state = State.IDLE;
};
Object.defineProperty(StreamController.prototype, "nextLevel", {
get: function () {
var frag = this.nextBufferedFrag;
if (frag) {
return frag.level;
}
return -1;
},
enumerable: false,
configurable: true
});
Object.defineProperty(StreamController.prototype, "currentFrag", {
get: function () {
var _a;
if (this.fragPlaying) {
return this.fragPlaying;
}
var currentTime = ((_a = this.media) === null || _a === void 0 ? void 0 : _a.currentTime) || this.lastCurrentTime;
if (Number.isFinite(currentTime)) {
return this.getAppendedFrag(currentTime);
}
return null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(StreamController.prototype, "currentProgramDateTime", {
get: function () {
var _a;
var currentTime = ((_a = this.media) === null || _a === void 0 ? void 0 : _a.currentTime) || this.lastCurrentTime;
if (Number.isFinite(currentTime)) {
var details = this.getLevelDetails();
var frag = this.currentFrag ||
(details
? findFragmentByPTS(null, details.fragments, currentTime)
: null);
if (frag) {
var programDateTime = frag.programDateTime;
if (programDateTime !== null) {
var epocMs = programDateTime + (currentTime - frag.start) * 1000;
return new Date(epocMs);
}
}
}
return null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(StreamController.prototype, "currentLevel", {
get: function () {
var frag = this.currentFrag;
if (frag) {
return frag.level;
}
return -1;
},
enumerable: false,
configurable: true
});
Object.defineProperty(StreamController.prototype, "nextBufferedFrag", {
get: function () {
var frag = this.currentFrag;
if (frag) {
return this.followingBufferedFrag(frag);
}
return null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(StreamController.prototype, "forceStartLoad", {
get: function () {
return this._forceStartLoad;
},
enumerable: false,
configurable: true
});
return StreamController;
}(BaseStreamController));
var LatencyController = (function () {
function LatencyController(hls) {
var _this = this;
this.media = null;
this.currentTime = 0;
this.stallCount = 0;
this._latency = null;
this._targetLatencyUpdated = false;
this.onTimeupdate = function () {
var media = _this.media;
var levelDetails = _this.levelDetails;
if (!media || !levelDetails || !_this.hls) {
return;
}
_this.currentTime = media.currentTime;
var config = _this.hls.config;
var latency = _this.computeLatency();
if (latency === null) {
return;
}
_this._latency = latency;
var lowLatencyMode = config.lowLatencyMode, maxLiveSyncPlaybackRate = config.maxLiveSyncPlaybackRate;
if (!lowLatencyMode ||
maxLiveSyncPlaybackRate === 1 ||
!levelDetails.live) {
return;
}
var targetLatency = _this.targetLatency;
if (targetLatency === null) {
return;
}
var distanceFromTarget = latency - targetLatency;
var liveMinLatencyDuration = Math.min(_this.maxLatency, targetLatency + levelDetails.targetduration);
var inLiveRange = distanceFromTarget < liveMinLatencyDuration;
var playingInterstitial = interstitialsEnabled();
if (inLiveRange &&
distanceFromTarget > 0.05 &&
_this.forwardBufferLength > 1 &&
!playingInterstitial) {
var max = Math.min(2, Math.max(1.0, maxLiveSyncPlaybackRate));
var rate = Math.round((2 / (1 + Math.exp(-0.75 * distanceFromTarget - _this.edgeStalled))) *
20) / 20;
var playbackRate = Math.min(max, Math.max(1, rate));
_this.changeMediaPlaybackRate(media, playbackRate);
}
else if (media.playbackRate !== 1 && media.playbackRate !== 0) {
_this.changeMediaPlaybackRate(media, 1);
}
};
this.hls = hls;
this.registerListeners();
}
Object.defineProperty(LatencyController.prototype, "levelDetails", {
get: function () {
var _a;
return ((_a = this.hls) === null || _a === void 0 ? void 0 : _a.latestLevelDetails) || null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LatencyController.prototype, "latency", {
get: function () {
return this._latency || 0;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LatencyController.prototype, "maxLatency", {
get: function () {
var _a;
var config = (_a = this.hls) === null || _a === void 0 ? void 0 : _a.config;
if (!config) {
return 0;
}
if (config.liveMaxLatencyDuration !== undefined) {
return config.liveMaxLatencyDuration;
}
var levelDetails = this.levelDetails;
return levelDetails
? config.liveMaxLatencyDurationCount * levelDetails.targetduration
: 0;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LatencyController.prototype, "targetLatency", {
get: function () {
var levelDetails = this.levelDetails;
if (levelDetails === null || !this.hls) {
return null;
}
var config = this.hls.config;
var holdBack = levelDetails.holdBack, partHoldBack = levelDetails.partHoldBack, targetduration = levelDetails.targetduration;
var liveSyncDuration = config.liveSyncDuration, liveSyncDurationCount = config.liveSyncDurationCount, lowLatencyMode = config.lowLatencyMode;
var userConfig = this.hls.userConfig;
var targetLatency = lowLatencyMode ? partHoldBack || holdBack : holdBack;
if (this._targetLatencyUpdated ||
userConfig.liveSyncDuration ||
userConfig.liveSyncDurationCount ||
targetLatency === 0) {
targetLatency =
liveSyncDuration !== undefined
? liveSyncDuration
: liveSyncDurationCount * targetduration;
}
var maxLiveSyncOnStallIncrease = targetduration;
return (targetLatency +
Math.min(this.stallCount * config.liveSyncOnStallIncrease, maxLiveSyncOnStallIncrease));
},
set: function (latency) {
if (!this.hls) {
return;
}
this.stallCount = 0;
this.hls.config.liveSyncDuration = latency;
this._targetLatencyUpdated = true;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LatencyController.prototype, "liveSyncPosition", {
get: function () {
var liveEdge = this.estimateLiveEdge();
var targetLatency = this.targetLatency;
if (liveEdge === null || targetLatency === null || !this.hls) {
return null;
}
var levelDetails = this.levelDetails;
if (levelDetails === null) {
return null;
}
var edge = levelDetails.edge;
var syncPosition = liveEdge - targetLatency - this.edgeStalled;
var min = edge - levelDetails.totalduration;
var max = edge -
((this.hls.config.lowLatencyMode && levelDetails.partTarget) ||
levelDetails.targetduration);
return Math.min(Math.max(min, syncPosition), max);
},
enumerable: false,
configurable: true
});
Object.defineProperty(LatencyController.prototype, "drift", {
get: function () {
var levelDetails = this.levelDetails;
if (levelDetails === null) {
return 1;
}
return levelDetails.drift;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LatencyController.prototype, "edgeStalled", {
get: function () {
var levelDetails = this.levelDetails;
if (levelDetails === null || !this.hls) {
return 0;
}
var maxLevelUpdateAge = ((this.hls.config.lowLatencyMode && levelDetails.partTarget) ||
levelDetails.targetduration) * 3;
return Math.max(levelDetails.age - maxLevelUpdateAge, 0);
},
enumerable: false,
configurable: true
});
Object.defineProperty(LatencyController.prototype, "forwardBufferLength", {
get: function () {
var media = this.media;
var levelDetails = this.levelDetails;
if (!media || !levelDetails) {
return 0;
}
var bufferedRanges = media.buffered.length;
return ((bufferedRanges
? media.buffered.end(bufferedRanges - 1)
: levelDetails.edge) - this.currentTime);
},
enumerable: false,
configurable: true
});
LatencyController.prototype.destroy = function () {
this.unregisterListeners();
this.onMediaDetaching();
this.hls = null;
};
LatencyController.prototype.registerListeners = function () {
var hls = this.hls;
if (!hls) {
return;
}
hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
hls.on(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.on(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
hls.on(Events.ERROR, this.onError, this);
hls.on(Events.INTERSTITIAL_ASSET_STARTED, this.onAssetStarted, this);
};
LatencyController.prototype.unregisterListeners = function () {
var hls = this.hls;
if (!hls) {
return;
}
hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
hls.off(Events.MEDIA_DETACHING, this.onMediaDetaching, this);
hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.off(Events.LEVEL_UPDATED, this.onLevelUpdated, this);
hls.off(Events.ERROR, this.onError, this);
hls.off(Events.INTERSTITIAL_ASSET_STARTED, this.onAssetStarted, this);
};
LatencyController.prototype.onMediaAttached = function (event, data) {
this.media = data.media;
this.media.addEventListener('timeupdate', this.onTimeupdate);
};
LatencyController.prototype.onMediaDetaching = function () {
if (this.media) {
this.media.removeEventListener('timeupdate', this.onTimeupdate);
this.media = null;
}
};
LatencyController.prototype.onManifestLoading = function () {
this._latency = null;
this.stallCount = 0;
};
LatencyController.prototype.onLevelUpdated = function (event, _a) {
var details = _a.details;
if (details.advanced) {
this.onTimeupdate();
}
if (!details.live && this.media) {
this.media.removeEventListener('timeupdate', this.onTimeupdate);
}
};
LatencyController.prototype.onAssetStarted = function (event, data) {
var _a;
var hls = this.hls;
var media = this.media ||
(data.event.appendInPlace &&
((_a = hls === null || hls === void 0 ? void 0 : hls.interstitialsManager) === null || _a === void 0 ? void 0 : _a.playerQueue.reduce(function (found, player) { return found || player.media; }, null)));
if (hls &&
media &&
media.playbackRate > 1 &&
media.playbackRate <= hls.config.maxLiveSyncPlaybackRate) {
this.changeMediaPlaybackRate(media, 1);
}
};
LatencyController.prototype.onError = function (event, data) {
var _a;
if (data.details !== ErrorDetails.BUFFER_STALLED_ERROR) {
return;
}
this.stallCount++;
if (this.hls && ((_a = this.levelDetails) === null || _a === void 0 ? void 0 : _a.live)) {
this.hls.logger.warn('[latency-controller]: Stall detected, adjusting target latency');
}
};
LatencyController.prototype.changeMediaPlaybackRate = function (media, playbackRate) {
if (media.playbackRate === playbackRate) {
return;
}
media.playbackRate = playbackRate;
};
LatencyController.prototype.estimateLiveEdge = function () {
var levelDetails = this.levelDetails;
if (levelDetails === null) {
return null;
}
return levelDetails.edge + levelDetails.age;
};
LatencyController.prototype.computeLatency = function () {
var liveEdge = this.estimateLiveEdge();
if (liveEdge === null) {
return null;
}
return liveEdge - this.currentTime;
};
return LatencyController;
}());
var Cues = undefined;
var fetchSupported;
var FetchLoader = undefined;
var clamp = function (val, min, max) {
return Math.max(min, Math.min(val, max));
};
var BaseLoader = (function () {
function BaseLoader() {
this.retryDelay = 0;
this.config = null;
this.callbacks = null;
this.context = null;
this.stats = new LoadStats();
}
BaseLoader.prototype.destroy = function () {
this.callbacks = this.context = this.config = null;
this.abortInternal();
this.stats = null;
};
BaseLoader.prototype.load = function (context, config, callbacks) {
var stats = this.stats;
if (stats.loading.start) {
throw new Error('Loader can only be used once.');
}
stats.loading.start = self.performance.now();
this.context = context;
this.config = config;
this.callbacks = callbacks;
this.loadInternal();
};
BaseLoader.prototype.abort = function () {
var _a;
this.abortInternal();
if ((_a = this.callbacks) === null || _a === void 0 ? void 0 : _a.onAbort) {
this.callbacks.onAbort(this.stats, this.context, this.getNetworkDetails());
}
};
BaseLoader.prototype.loadtimeout = function () {
var _a;
if (!this.config)
return;
var retryConfig = this.config.loadPolicy.timeoutRetry;
var retryCount = this.stats.retry;
if (shouldRetry(retryConfig, retryCount, true)) {
this.retry(retryConfig);
}
else {
logger.warn("timeout while loading ".concat((_a = this.context) === null || _a === void 0 ? void 0 : _a.url));
var callbacks = this.callbacks;
if (callbacks) {
this.abortInternal();
callbacks.onTimeout(this.stats, this.context, this.getNetworkDetails());
}
}
};
BaseLoader.prototype.retry = function (retryConfig) {
var _this = this;
var _a = this, context = _a.context, stats = _a.stats;
this.retryDelay = getRetryDelay(retryConfig, stats.retry);
stats.retry++;
logger.warn("".concat(status ? 'HTTP Status ' + status : 'Timeout', " while loading ").concat(context === null || context === void 0 ? void 0 : context.url, ", retrying ").concat(stats.retry, "/").concat(retryConfig.maxNumRetry, " in ").concat(this.retryDelay, "ms"));
this.abortInternal();
this.resetInternalLoader();
self.clearTimeout(this.retryTimeout);
this.retryTimeout = self.setTimeout(function () { return _this.loadInternal(); }, this.retryDelay);
};
return BaseLoader;
}());
var AGE_HEADER_LINE_REGEX = /^age:\s*[\d.]+\s*$/im;
var XhrLoader = (function (_super) {
__extends(XhrLoader, _super);
function XhrLoader(config) {
var _this = _super.call(this) || this;
_this.loader = null;
_this.xhrSetup = config.xhrSetup || null;
return _this;
}
XhrLoader.prototype.destroy = function () {
_super.prototype.destroy.call(this);
this.loader = null;
this.xhrSetup = null;
};
XhrLoader.prototype.abortInternal = function () {
var loader = this.loader;
self.clearTimeout(this.requestTimeout);
self.clearTimeout(this.retryTimeout);
if (loader) {
loader.onreadystatechange = null;
loader.onprogress = null;
if (loader.readyState !== 4) {
this.stats.aborted = true;
loader.abort();
}
}
};
XhrLoader.prototype.getNetworkDetails = function () {
return this.loader;
};
XhrLoader.prototype.resetInternalLoader = function () {
this.loader = null;
};
XhrLoader.prototype.loadInternal = function () {
var _this = this;
var _a = this, config = _a.config, context = _a.context;
if (!config || !context) {
return;
}
var xhr = (this.loader = new self.XMLHttpRequest());
var stats = this.stats;
stats.loading.first = 0;
stats.loaded = 0;
stats.aborted = false;
var xhrSetup = this.xhrSetup;
if (xhrSetup) {
Promise.resolve()
.then(function () {
if (_this.loader !== xhr || _this.stats.aborted)
return;
return xhrSetup.call(_this, xhr, context.url, context);
})
.catch(function (error) {
if (_this.loader !== xhr || _this.stats.aborted)
return;
xhr.open('GET', context.url, true);
return xhrSetup.call(_this, xhr, context.url, context);
})
.then(function () {
if (_this.loader !== xhr || _this.stats.aborted)
return;
_this.openAndSendXhr(xhr, context, config);
})
.catch(function (error) {
var _a;
(_a = _this.callbacks) === null || _a === void 0 ? void 0 : _a.onError({ code: xhr.status, text: error.message }, context, xhr, stats);
return;
});
}
else {
this.openAndSendXhr(xhr, context, config);
}
};
XhrLoader.prototype.openAndSendXhr = function (xhr, context, config) {
if (!xhr.readyState) {
xhr.open('GET', context.url, true);
}
var headers = context.headers;
var _a = config.loadPolicy, maxTimeToFirstByteMs = _a.maxTimeToFirstByteMs, maxLoadTimeMs = _a.maxLoadTimeMs;
if (headers) {
for (var header in headers) {
xhr.setRequestHeader(header, headers[header]);
}
}
if (context.rangeEnd) {
xhr.setRequestHeader('Range', "bytes=".concat(context.rangeStart, "-").concat(context.rangeEnd - 1));
}
xhr.onreadystatechange = this.readystatechange.bind(this);
xhr.onprogress = this.loadprogress.bind(this);
xhr.responseType = context.responseType;
self.clearTimeout(this.requestTimeout);
config.timeout =
maxTimeToFirstByteMs && Number.isFinite(maxTimeToFirstByteMs)
? maxTimeToFirstByteMs
: maxLoadTimeMs;
this.requestTimeout = self.setTimeout(this.loadtimeout.bind(this), config.timeout);
xhr.send();
};
XhrLoader.prototype.readystatechange = function () {
var _a, _b, _c;
var _d = this, context = _d.context, xhr = _d.loader, stats = _d.stats;
if (!context || !xhr) {
return;
}
var readyState = xhr.readyState;
var config = this.config;
if (stats.aborted) {
return;
}
if (readyState >= 2) {
if (stats.loading.first === 0) {
stats.loading.first = Math.max(self.performance.now(), stats.loading.start);
if (config.timeout !== config.loadPolicy.maxLoadTimeMs) {
self.clearTimeout(this.requestTimeout);
config.timeout = config.loadPolicy.maxLoadTimeMs;
this.requestTimeout = self.setTimeout(this.loadtimeout.bind(this), config.loadPolicy.maxLoadTimeMs -
(stats.loading.first - stats.loading.start));
}
}
if (readyState === 4) {
self.clearTimeout(this.requestTimeout);
xhr.onreadystatechange = null;
xhr.onprogress = null;
var status_1 = xhr.status;
var useResponseText = xhr.responseType === 'text' ? xhr.responseText : null;
if (status_1 >= 200 && status_1 < 300) {
var data = useResponseText !== null && useResponseText !== void 0 ? useResponseText : xhr.response;
if (data != null) {
stats.loading.end = Math.max(self.performance.now(), stats.loading.first);
var len = xhr.responseType === 'arraybuffer'
? data.byteLength
: data.length;
stats.loaded = stats.total = len;
stats.bwEstimate =
(stats.total * 8000) / (stats.loading.end - stats.loading.first);
var onProgress = (_a = this.callbacks) === null || _a === void 0 ? void 0 : _a.onProgress;
if (onProgress) {
onProgress(stats, context, data, xhr);
}
var response_1 = {
url: xhr.responseURL,
data: data,
code: status_1,
};
if (context.rangeEnd &&
len !== context.rangeEnd - context.rangeStart) {
logger.warn("Payload length ".concat(len, " does not match requested Range: bytes=").concat(context.rangeStart, "-").concat(context.rangeEnd - 1));
}
(_b = this.callbacks) === null || _b === void 0 ? void 0 : _b.onSuccess(response_1, stats, context, xhr);
return;
}
}
var retryConfig = config.loadPolicy.errorRetry;
var retryCount = stats.retry;
var response = {
url: context.url,
data: undefined,
code: status_1,
};
if (shouldRetry(retryConfig, retryCount, false, response)) {
this.retry(retryConfig);
}
else {
logger.error("".concat(status_1, " while loading ").concat(context.url));
(_c = this.callbacks) === null || _c === void 0 ? void 0 : _c.onError({ code: status_1, text: xhr.statusText }, context, xhr, stats);
}
}
}
};
XhrLoader.prototype.loadprogress = function (event) {
var stats = this.stats;
stats.loaded = event.loaded;
if (event.lengthComputable) {
stats.total = event.total;
}
};
XhrLoader.prototype.getCacheAge = function () {
var result = null;
if (this.loader &&
AGE_HEADER_LINE_REGEX.test(this.loader.getAllResponseHeaders())) {
var ageHeader = this.loader.getResponseHeader('age');
result = ageHeader ? parseFloat(ageHeader) : null;
}
return result;
};
XhrLoader.prototype.getResponseHeader = function (name) {
if (this.loader &&
new RegExp("^".concat(name, ":\\s*[\\d.]+\\s*$"), 'im').test(this.loader.getAllResponseHeaders())) {
return this.loader.getResponseHeader(name);
}
return null;
};
return XhrLoader;
}(BaseLoader));
var defaultLoadPolicy = {
maxTimeToFirstByteMs: 8000,
maxLoadTimeMs: 20000,
timeoutRetry: null,
errorRetry: null,
};
var hlsDefaultConfig = __assign(__assign({ autoStartLoad: true, startPosition: -1, defaultAudioCodec: undefined, debug: false, capLevelOnFPSDrop: false, capLevelToPlayerSize: false, ignoreDevicePixelRatio: false, maxDevicePixelRatio: Number.POSITIVE_INFINITY, preferManagedMediaSource: false, initialLiveManifestSize: 1, maxBufferLength: 30, backBufferLength: Infinity, frontBufferFlushThreshold: Infinity, loopBackBufferFlush: undefined, startOnSegmentBoundary: false, nextAudioTrackBufferFlushForwardOffset: 0.25, maxBufferSize: 60 * 1000 * 1000, maxFragLookUpTolerance: 0.25, maxBufferHole: 0.1, detectStallWithCurrentTimeMs: 1250, highBufferWatchdogPeriod: 2, nudgeOffset: 0.1, nudgeMaxRetry: 3, nudgeOnVideoHole: true, skipBufferHolePadding: 0.1, liveSyncMode: 'edge', liveSyncDurationCount: 3, liveSyncOnStallIncrease: 1, liveMaxLatencyDurationCount: Infinity, liveMaxUnchangedPlaylistRefresh: Infinity, liveSyncDuration: undefined, liveMaxLatencyDuration: undefined, maxLiveSyncPlaybackRate: 1, liveDurationInfinity: false, liveBackBufferLength: null, maxMaxBufferLength: 600, enableWorker: true, workerPath: null, enableSoftwareAES: true, startLevel: undefined, startFragPrefetch: false, fpsDroppedMonitoringPeriod: 5000, fpsDroppedMonitoringThreshold: 0.2, appendErrorMaxRetry: 3, appendTimeout: Infinity, ignorePlaylistParsingErrors: false, loader: XhrLoader, fLoader: undefined, pLoader: undefined, xhrSetup: undefined, licenseXhrSetup: undefined, licenseResponseCallback: undefined, stretchShortVideoTrack: false, maxAudioFramesDrift: 1, forceKeyFrameOnDiscontinuity: true, handleMpegTsVideoIntegrityErrors: 'process', abrEwmaFastLive: 3, abrEwmaSlowLive: 9, abrEwmaFastVoD: 3, abrEwmaSlowVoD: 9, abrEwmaDefaultEstimate: 5e5, abrEwmaDefaultEstimateMax: 5e6, abrBandWidthFactor: 0.95, abrBandWidthUpFactor: 0.7, abrMaxWithRealBitrate: false, abrSwitchInterval: 0, maxStarvationDelay: 4, maxLoadingDelay: 4, minAutoBitrate: 0, emeEnabled: false, widevineLicenseUrl: undefined, drmSystems: {}, drmSystemOptions: {}, requestMediaKeySystemAccessFunc: null, requireKeySystemAccessOnStart: false, reuseKeySessions: false, testBandwidth: true, progressive: false, lowLatencyMode: true, cmcd: undefined, enableDateRangeMetadataCues: true, enableEmsgMetadataCues: true, enableEmsgKLVMetadata: false, enableID3MetadataCues: true, emsgKLVSchemaUri: undefined, enableInterstitialPlayback: false, interstitialAppendInPlace: true, interstitialLiveLookAhead: 10, iframeCacheLimit: 2 * 1024 * 1024, useMediaCapabilities: false, preserveManualLevelOnError: false, errorPenaltyExpireMs: 0, certLoadPolicy: {
default: defaultLoadPolicy,
}, keyLoadPolicy: {
default: {
maxTimeToFirstByteMs: 8000,
maxLoadTimeMs: 20000,
timeoutRetry: {
maxNumRetry: 1,
retryDelayMs: 1000,
maxRetryDelayMs: 20000,
backoff: 'linear',
},
errorRetry: {
maxNumRetry: 8,
retryDelayMs: 1000,
maxRetryDelayMs: 20000,
backoff: 'linear',
},
},
}, manifestLoadPolicy: {
default: {
maxTimeToFirstByteMs: Infinity,
maxLoadTimeMs: 20000,
timeoutRetry: {
maxNumRetry: 2,
retryDelayMs: 0,
maxRetryDelayMs: 0,
},
errorRetry: {
maxNumRetry: 1,
retryDelayMs: 1000,
maxRetryDelayMs: 8000,
},
},
}, playlistLoadPolicy: {
default: {
maxTimeToFirstByteMs: 10000,
maxLoadTimeMs: 20000,
timeoutRetry: {
maxNumRetry: 2,
retryDelayMs: 0,
maxRetryDelayMs: 0,
},
errorRetry: {
maxNumRetry: 2,
retryDelayMs: 1000,
maxRetryDelayMs: 8000,
},
},
}, fragLoadPolicy: {
default: {
maxTimeToFirstByteMs: 10000,
maxLoadTimeMs: 120000,
timeoutRetry: {
maxNumRetry: 4,
retryDelayMs: 0,
maxRetryDelayMs: 0,
},
errorRetry: {
maxNumRetry: 6,
retryDelayMs: 1000,
maxRetryDelayMs: 8000,
},
},
}, steeringManifestLoadPolicy: {
default: defaultLoadPolicy,
}, interstitialAssetListLoadPolicy: {
default: defaultLoadPolicy,
}, manifestLoadingTimeOut: 10000, manifestLoadingMaxRetry: 1, manifestLoadingRetryDelay: 1000, manifestLoadingMaxRetryTimeout: 64000, levelLoadingTimeOut: 10000, levelLoadingMaxRetry: 4, levelLoadingRetryDelay: 1000, levelLoadingMaxRetryTimeout: 64000, fragLoadingTimeOut: 20000, fragLoadingMaxRetry: 6, fragLoadingRetryDelay: 1000, fragLoadingMaxRetryTimeout: 64000, streamController: StreamController, abrController: AbrController, bufferController: BufferController, capLevelController: CapLevelController, errorController: ErrorController, fpsController: FPSController, id3TrackController: ID3TrackController, gapController: GapController, latencyController: LatencyController }, timelineConfig()), { subtitleStreamController: undefined, subtitleTrackController: undefined, timelineController: undefined, audioStreamController: undefined, audioTrackController: undefined, emeController: undefined, cmcdController: undefined, contentSteeringController: undefined, iframeController: undefined, interstitialsController: undefined });
function timelineConfig() {
return {
cueHandler: Cues,
enableWebVTT: false,
enableIMSC1: false,
enableCEA708Captions: false,
captionsTextTrack1Label: 'English',
captionsTextTrack1LanguageCode: 'en',
captionsTextTrack2Label: 'Spanish',
captionsTextTrack2LanguageCode: 'es',
captionsTextTrack3Label: 'Unknown CC',
captionsTextTrack3LanguageCode: '',
captionsTextTrack4Label: 'Unknown CC',
captionsTextTrack4LanguageCode: '',
renderTextTracksNatively: true,
};
}
function mergeConfig(defaultConfig, userConfig, logger) {
if ((userConfig.liveSyncDurationCount ||
userConfig.liveMaxLatencyDurationCount) &&
(userConfig.liveSyncDuration || userConfig.liveMaxLatencyDuration)) {
throw new Error("Illegal hls.js config: don't mix up liveSyncDurationCount/liveMaxLatencyDurationCount and liveSyncDuration/liveMaxLatencyDuration");
}
if (userConfig.liveMaxLatencyDurationCount !== undefined &&
(userConfig.liveSyncDurationCount === undefined ||
userConfig.liveMaxLatencyDurationCount <=
userConfig.liveSyncDurationCount)) {
throw new Error('Illegal hls.js config: "liveMaxLatencyDurationCount" must be greater than "liveSyncDurationCount"');
}
if (userConfig.liveMaxLatencyDuration !== undefined &&
(userConfig.liveSyncDuration === undefined ||
userConfig.liveMaxLatencyDuration <= userConfig.liveSyncDuration)) {
throw new Error('Illegal hls.js config: "liveMaxLatencyDuration" must be greater than "liveSyncDuration"');
}
if (userConfig.liveMaxUnchangedPlaylistRefresh !== undefined) {
var liveMaxUnchangedPlaylistRefresh = userConfig.liveMaxUnchangedPlaylistRefresh;
var clampedValue = clamp(liveMaxUnchangedPlaylistRefresh, 2, Infinity);
if (clampedValue !== liveMaxUnchangedPlaylistRefresh) {
logger.warn("hls.js config: \"liveMaxUnchangedPlaylistRefresh\" clamped from ".concat(liveMaxUnchangedPlaylistRefresh, " to ").concat(clampedValue, "."));
}
userConfig.liveMaxUnchangedPlaylistRefresh = clampedValue;
}
var defaultsCopy = deepCpy(defaultConfig);
var deprecatedSettingTypes = ['manifest', 'level', 'frag'];
var deprecatedSettings = [
'TimeOut',
'MaxRetry',
'RetryDelay',
'MaxRetryTimeout',
];
deprecatedSettingTypes.forEach(function (type) {
var policyName = "".concat(type === 'level' ? 'playlist' : type, "LoadPolicy");
var policyNotSet = userConfig[policyName] === undefined;
var report = [];
deprecatedSettings.forEach(function (setting) {
var deprecatedSetting = "".concat(type, "Loading").concat(setting);
var value = userConfig[deprecatedSetting];
if (value !== undefined && policyNotSet) {
report.push(deprecatedSetting);
var settings = defaultsCopy[policyName].default;
userConfig[policyName] = { default: settings };
switch (setting) {
case 'TimeOut':
settings.maxLoadTimeMs = value;
settings.maxTimeToFirstByteMs = value;
break;
case 'MaxRetry':
settings.errorRetry.maxNumRetry = value;
settings.timeoutRetry.maxNumRetry = value;
break;
case 'RetryDelay':
settings.errorRetry.retryDelayMs = value;
settings.timeoutRetry.retryDelayMs = value;
break;
case 'MaxRetryTimeout':
settings.errorRetry.maxRetryDelayMs = value;
settings.timeoutRetry.maxRetryDelayMs = value;
break;
}
}
});
if (report.length) {
logger.warn("hls.js config: \"".concat(report.join('", "'), "\" setting(s) are deprecated, use \"").concat(policyName, "\": ").concat(stringify(userConfig[policyName])));
}
});
return __assign(__assign({}, defaultsCopy), userConfig);
}
function deepCpy(obj) {
if (obj && typeof obj === 'object') {
if (Array.isArray(obj)) {
return obj.map(deepCpy);
}
return Object.keys(obj).reduce(function (result, key) {
result[key] = deepCpy(obj[key]);
return result;
}, {});
}
return obj;
}
function enableStreamingMode(config, logger) {
var currentLoader = config.loader;
if (currentLoader !== FetchLoader && currentLoader !== XhrLoader) {
config.progressive = false;
}
else {
var canStreamProgressively = fetchSupported();
if (canStreamProgressively) {
config.loader = FetchLoader;
config.progressive = true;
config.enableSoftwareAES = true;
}
}
}
var FragmentTracker = (function () {
function FragmentTracker(hls) {
this.activePartLists = Object.create(null);
this.endListFragments = Object.create(null);
this.fragments = Object.create(null);
this.timeRanges = Object.create(null);
this.bufferPadding = 0.2;
this.hasGaps = false;
this.hls = hls;
this._registerListeners();
}
FragmentTracker.prototype._registerListeners = function () {
var hls = this.hls;
if (hls) {
hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.on(Events.BUFFER_APPENDED, this.onBufferAppended, this);
hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
hls.on(Events.FRAG_LOADED, this.onFragLoaded, this);
}
};
FragmentTracker.prototype._unregisterListeners = function () {
var hls = this.hls;
if (hls) {
hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.off(Events.BUFFER_APPENDED, this.onBufferAppended, this);
hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
hls.off(Events.FRAG_LOADED, this.onFragLoaded, this);
}
};
FragmentTracker.prototype.destroy = function () {
this._unregisterListeners();
this.hls =
this.fragments =
this.activePartLists =
this.endListFragments =
this.timeRanges =
null;
};
FragmentTracker.prototype.getAppendedFrag = function (position, levelType) {
var activeParts = this.activePartLists[levelType];
if (activeParts) {
for (var i = activeParts.length; i--;) {
var activePart = activeParts[i];
if (!activePart) {
break;
}
if (activePart.start <= position &&
position <= activePart.end &&
activePart.loaded) {
return activePart;
}
}
}
return this.getBufferedFrag(position, levelType);
};
FragmentTracker.prototype.getBufferedFrag = function (position, levelType) {
return this.getFragAtPos(position, levelType, true);
};
FragmentTracker.prototype.getFragAtPos = function (position, levelType, buffered) {
var fragments = this.fragments;
var keys = Object.keys(fragments);
for (var i = keys.length; i--;) {
var fragmentEntity = fragments[keys[i]];
if ((fragmentEntity === null || fragmentEntity === void 0 ? void 0 : fragmentEntity.body.type) === levelType &&
(!buffered || fragmentEntity.buffered)) {
var frag = fragmentEntity.body;
if (frag.start <= position && position <= frag.end) {
return frag;
}
}
}
return null;
};
FragmentTracker.prototype.detectEvictedFragments = function (elementaryStream, timeRange, playlistType, appendedFrag, appendedPart, removeAppending) {
var _this = this;
if (this.timeRanges) {
this.timeRanges[elementaryStream] = timeRange;
}
var appendedPartSn = (appendedPart === null || appendedPart === void 0 ? void 0 : appendedPart.fragment.sn) || -1;
Object.keys(this.fragments).forEach(function (key) {
var fragmentEntity = _this.fragments[key];
if (!fragmentEntity || !_this.hls) {
return;
}
var frag = fragmentEntity.body;
if (appendedPartSn >= frag.sn) {
return;
}
if (!fragmentEntity.buffered &&
(!fragmentEntity.loaded || removeAppending)) {
if (frag.type === playlistType) {
_this.removeFragment(frag);
}
return;
}
var esData = fragmentEntity.range[elementaryStream];
if (!esData) {
return;
}
if (esData.time.length === 0) {
_this.removeFragment(frag);
return;
}
esData.time.some(function (time) {
var isNotBuffered = !_this.isTimeBuffered(time.startPTS, time.endPTS, timeRange);
if (isNotBuffered) {
_this.removeFragment(frag);
}
return isNotBuffered;
});
if (appendedFrag && appendedFrag !== frag && userAgentChromeVersion()) {
var endPTS = appendedFrag.endPTS;
var otherStartPTS = frag.startPTS;
if (endPTS && otherStartPTS && fragmentEntity.range.video) {
var diff = otherStartPTS - endPTS;
if (diff < 0 && diff > -0.1) {
_this.removeFragment(frag);
_this.hls.trigger(Events.BUFFER_FLUSHING, {
startOffset: endPTS + 0.004,
endOffset: Infinity,
type: 'video',
});
}
}
}
});
};
FragmentTracker.prototype.detectPartialFragments = function (data) {
var _this = this;
var timeRanges = this.timeRanges;
var frag = data.frag, part = data.part, playlistType = data.id;
if (!timeRanges || !isMediaFragment(frag)) {
return;
}
var fragKey = getFragmentKey(frag);
var fragmentEntity = this.fragments[fragKey];
if (!fragmentEntity || (fragmentEntity.buffered && frag.gap)) {
return;
}
var isFragHint = !frag.relurl;
Object.keys(timeRanges).forEach(function (elementaryStream) {
var streamInfo = frag.elementaryStreams[elementaryStream];
if (!streamInfo) {
return;
}
var timeRange = timeRanges[elementaryStream];
var partial = isFragHint || streamInfo.partial === true;
fragmentEntity.range[elementaryStream] = _this.getBufferedTimes(frag, part, partial, timeRange);
_this.detectEvictedFragments(elementaryStream, timeRange, playlistType, frag, part);
});
fragmentEntity.loaded = null;
var trackNames = Object.keys(fragmentEntity.range);
if (trackNames.length) {
this.bufferedEnd(fragmentEntity, frag);
if (!isPartial(fragmentEntity)) {
this.removeParts(frag.sn - 1, frag.type);
}
if (!part) {
var minPartialAppend_1 = Math.min(0.004, frag.duration);
trackNames.some(function (elementaryStream) {
var _a;
var times = (_a = fragmentEntity.range[elementaryStream]) === null || _a === void 0 ? void 0 : _a.time;
var bufferedGap = times.length === 0 ||
(times.length === 1 &&
times[0].endPTS - times[0].startPTS < minPartialAppend_1);
if (bufferedGap) {
_this.addAsGap(frag);
}
return bufferedGap;
});
}
}
else {
this.removeFragment(frag);
}
};
FragmentTracker.prototype.addAsGap = function (frag) {
frag.gap = true;
this.removeFragment(frag);
this.fragBuffered(frag, true);
};
FragmentTracker.prototype.bufferedEnd = function (fragmentEntity, frag) {
fragmentEntity.buffered = true;
var endList = (fragmentEntity.body.endList =
frag.endList || fragmentEntity.body.endList);
if (endList && !frag.gap) {
this.endListFragments[fragmentEntity.body.type] = fragmentEntity;
}
};
FragmentTracker.prototype.removeParts = function (snToKeep, levelType) {
var activeParts = this.activePartLists[levelType];
if (!activeParts) {
return;
}
this.activePartLists[levelType] = filterParts(activeParts, function (part) { return part.fragment.sn >= snToKeep; });
};
FragmentTracker.prototype.fragBuffered = function (frag, force) {
var fragKey = getFragmentKey(frag);
var fragmentEntity = this.fragments[fragKey];
if (!fragmentEntity && force) {
fragmentEntity = this.fragments[fragKey] = {
body: frag,
appendedPTS: null,
loaded: null,
buffered: false,
range: Object.create(null),
};
if (frag.gap) {
this.hasGaps = true;
}
}
if (fragmentEntity) {
fragmentEntity.loaded = null;
this.bufferedEnd(fragmentEntity, frag);
}
return fragmentEntity;
};
FragmentTracker.prototype.getBufferedTimes = function (fragment, part, partial, timeRange) {
var buffered = {
time: [],
partial: partial,
};
var startPTS = fragment.start;
var endPTS = fragment.end;
var minEndPTS = fragment.minEndPTS || endPTS;
var maxStartPTS = fragment.maxStartPTS || startPTS;
for (var i = 0; i < timeRange.length; i++) {
var startTime = timeRange.start(i) - this.bufferPadding;
var endTime = timeRange.end(i) + this.bufferPadding;
if (maxStartPTS >= startTime && minEndPTS <= endTime) {
buffered.time.push({
startPTS: Math.max(startPTS, timeRange.start(i)),
endPTS: Math.min(endPTS, timeRange.end(i)),
});
break;
}
else if (startPTS < endTime && endPTS > startTime) {
var start = Math.max(startPTS, timeRange.start(i));
var end = Math.min(endPTS, timeRange.end(i));
if (end > start) {
buffered.partial = true;
buffered.time.push({
startPTS: start,
endPTS: end,
});
}
}
else if (endPTS <= startTime) {
break;
}
}
return buffered;
};
FragmentTracker.prototype.getPartialFragment = function (time) {
var bestFragment = null;
var timePadding;
var startTime;
var endTime;
var bestOverlap = 0;
var _a = this, bufferPadding = _a.bufferPadding, fragments = _a.fragments;
Object.keys(fragments).forEach(function (key) {
var fragmentEntity = fragments[key];
if (!fragmentEntity) {
return;
}
if (isPartial(fragmentEntity)) {
startTime = fragmentEntity.body.start - bufferPadding;
endTime = fragmentEntity.body.end + bufferPadding;
if (time >= startTime && time <= endTime) {
timePadding = Math.min(time - startTime, endTime - time);
if (bestOverlap <= timePadding) {
bestFragment = fragmentEntity.body;
bestOverlap = timePadding;
}
}
}
});
return bestFragment;
};
FragmentTracker.prototype.isEndListAppended = function (type) {
var lastFragmentEntity = this.endListFragments[type];
return (lastFragmentEntity !== undefined &&
(lastFragmentEntity.buffered || isPartial(lastFragmentEntity)));
};
FragmentTracker.prototype.getState = function (fragment) {
var fragKey = getFragmentKey(fragment);
var fragmentEntity = this.fragments[fragKey];
if (fragmentEntity) {
if (!fragmentEntity.buffered) {
return "APPENDING";
}
else if (isPartial(fragmentEntity)) {
return "PARTIAL";
}
else {
return "OK";
}
}
return "NOT_LOADED";
};
FragmentTracker.prototype.isTimeBuffered = function (startPTS, endPTS, timeRange) {
var startTime;
var endTime;
for (var i = 0; i < timeRange.length; i++) {
startTime = timeRange.start(i) - this.bufferPadding;
endTime = timeRange.end(i) + this.bufferPadding;
if (startPTS >= startTime && endPTS <= endTime) {
return true;
}
if (endPTS <= startTime) {
return false;
}
}
return false;
};
FragmentTracker.prototype.onManifestLoading = function () {
this.removeAllFragments();
};
FragmentTracker.prototype.onFragLoaded = function (event, data) {
if (!isMediaFragment(data.frag) || data.frag.bitrateTest) {
return;
}
var frag = data.frag;
var loaded = data.part ? null : data;
var fragKey = getFragmentKey(frag);
this.fragments[fragKey] = {
body: frag,
appendedPTS: null,
loaded: loaded,
buffered: false,
range: Object.create(null),
};
};
FragmentTracker.prototype.onBufferAppended = function (event, data) {
var frag = data.frag, part = data.part, timeRanges = data.timeRanges;
if (!isMediaFragment(frag)) {
return;
}
var playlistType = frag.type;
if (part) {
var activeParts = this.activePartLists[playlistType];
if (!activeParts) {
this.activePartLists[playlistType] = activeParts = [];
}
activeParts.push(part);
}
this.timeRanges = timeRanges;
};
FragmentTracker.prototype.onFragBuffered = function (event, data) {
this.detectPartialFragments(data);
};
FragmentTracker.prototype.hasFragment = function (fragment) {
var fragKey = getFragmentKey(fragment);
return !!this.fragments[fragKey];
};
FragmentTracker.prototype.hasFragments = function (type) {
var fragments = this.fragments;
var keys = Object.keys(fragments);
if (!type) {
return keys.length > 0;
}
for (var i = keys.length; i--;) {
var fragmentEntity = fragments[keys[i]];
if ((fragmentEntity === null || fragmentEntity === void 0 ? void 0 : fragmentEntity.body.type) === type) {
return true;
}
}
return false;
};
FragmentTracker.prototype.hasParts = function (type) {
var _a;
return !!((_a = this.activePartLists[type]) === null || _a === void 0 ? void 0 : _a.length);
};
FragmentTracker.prototype.getBackBufferEvictionEnd = function (beforePosition, levelType, bytesNeeded) {
var fragments = this.fragments;
var bytesFreed = 0;
var evictEnd = 0;
var keys = Object.keys(fragments);
for (var i = 0; i < keys.length; i++) {
var entity = fragments[keys[i]];
if (!entity || !entity.buffered || entity.body.type !== levelType) {
continue;
}
var frag = entity.body;
if (frag.gap) {
return 0;
}
var bytes = (frag.hasStats && frag.stats.loaded) ||
frag.byteLength ||
(frag.bitrate && frag.bitrate * 8 * frag.duration);
if (frag.end <= beforePosition && bytes) {
bytesFreed += bytes;
evictEnd = Math.max(evictEnd, frag.end);
if (bytesFreed >= bytesNeeded) {
return evictEnd;
}
}
}
return evictEnd > 0 ? evictEnd : 0;
};
FragmentTracker.prototype.removeFragmentsInRange = function (start, end, playlistType, withGapOnly, unbufferedOnly) {
var _this = this;
if (withGapOnly && !this.hasGaps) {
return;
}
Object.keys(this.fragments).forEach(function (key) {
var fragmentEntity = _this.fragments[key];
if (!fragmentEntity) {
return;
}
var frag = fragmentEntity.body;
if (frag.type !== playlistType || (withGapOnly && !frag.gap)) {
return;
}
if (frag.start < end &&
frag.end > start &&
(fragmentEntity.buffered || unbufferedOnly)) {
_this.removeFragment(frag);
}
});
};
FragmentTracker.prototype.removeFragment = function (fragment) {
var fragKey = getFragmentKey(fragment);
fragment.clearElementaryStreamInfo();
var activeParts = this.activePartLists[fragment.type];
if (activeParts) {
var snToRemove_1 = fragment.sn;
this.activePartLists[fragment.type] = filterParts(activeParts, function (part) { return part.fragment.sn !== snToRemove_1; });
}
delete this.fragments[fragKey];
if (fragment.endList) {
delete this.endListFragments[fragment.type];
}
};
FragmentTracker.prototype.gapFragments = function () {
var _this = this;
if (!this.hasGaps) {
return [];
}
return Object.keys(this.fragments)
.map(function (key) { var _a; return (_a = _this.fragments[key]) === null || _a === void 0 ? void 0 : _a.body; })
.filter(function (frag) { return !!(frag === null || frag === void 0 ? void 0 : frag.gap); });
};
FragmentTracker.prototype.removeAllFragments = function () {
var _a, _b;
this.fragments = Object.create(null);
this.endListFragments = Object.create(null);
this.activePartLists = Object.create(null);
this.hasGaps = false;
var partlist = (_b = (_a = this.hls) === null || _a === void 0 ? void 0 : _a.latestLevelDetails) === null || _b === void 0 ? void 0 : _b.partList;
if (partlist) {
partlist.forEach(function (part) { return part.clearElementaryStreamInfo(); });
}
};
return FragmentTracker;
}());
function isPartial(fragmentEntity) {
var _a, _b, _c, _d;
return (fragmentEntity.buffered &&
!!(fragmentEntity.body.gap ||
((_a = fragmentEntity.range.video) === null || _a === void 0 ? void 0 : _a.partial) ||
((_b = fragmentEntity.range.audio) === null || _b === void 0 ? void 0 : _b.partial) ||
((_c = fragmentEntity.range.audiovideo) === null || _c === void 0 ? void 0 : _c.partial) ||
((_d = fragmentEntity.range.subs) === null || _d === void 0 ? void 0 : _d.partial)));
}
function getFragmentKey(fragment) {
return "".concat(fragment.type, "_").concat(fragment.level, "_").concat(fragment.sn);
}
function filterParts(partList, predicate) {
return partList.filter(function (part) {
var keep = predicate(part);
if (!keep) {
part.clearElementaryStreamInfo();
}
return keep;
});
}
var LevelController = (function (_super) {
__extends(LevelController, _super);
function LevelController(hls, contentSteeringController) {
var _this = _super.call(this, hls, 'level-controller') || this;
_this._levels = [];
_this._firstLevel = -1;
_this._maxAutoLevel = -1;
_this.currentLevel = null;
_this.currentLevelIndex = -1;
_this.manualLevelIndex = -1;
_this.lastABRSwitchTime = -1;
_this._iframeVariants = [];
_this.steering = contentSteeringController;
_this._registerListeners();
return _this;
}
LevelController.prototype._registerListeners = function () {
var hls = this.hls;
hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
hls.on(Events.LEVEL_LOADED, this.onLevelLoaded, this);
hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
hls.on(Events.FRAG_BUFFERED, this.onFragBuffered, this);
hls.on(Events.ERROR, this.onError, this);
};
LevelController.prototype._unregisterListeners = function () {
var hls = this.hls;
hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
hls.off(Events.LEVEL_LOADED, this.onLevelLoaded, this);
hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
hls.off(Events.FRAG_BUFFERED, this.onFragBuffered, this);
hls.off(Events.ERROR, this.onError, this);
};
LevelController.prototype.destroy = function () {
this._unregisterListeners();
this.steering = null;
this.resetLevels();
_super.prototype.destroy.call(this);
};
LevelController.prototype.stopLoad = function () {
var levels = this._levels;
levels.forEach(function (level) {
level.loadError = 0;
level.fragmentError = 0;
});
_super.prototype.stopLoad.call(this);
};
LevelController.prototype.resetLevels = function () {
this._startLevel = undefined;
this.manualLevelIndex = -1;
this.currentLevelIndex = -1;
this.currentLevel = null;
this._levels = [];
this._maxAutoLevel = -1;
this._iframeVariants = [];
};
LevelController.prototype.onManifestLoading = function (event, data) {
this.resetLevels();
};
LevelController.prototype.onManifestLoaded = function (event, data) {
var _this = this;
var preferManagedMediaSource = this.hls.config.preferManagedMediaSource;
var levels = [];
var redundantSet = {};
var generatePathwaySet = {};
var resolutionFound = false;
var videoCodecFound = false;
var audioCodecFound = false;
var imageCodecFound = false;
data.levels.forEach(function (levelParsed) {
var attributes = levelParsed.attrs;
var supported = setTrackCodecsAndReturnSupported(levelParsed, preferManagedMediaSource);
var audioCodec = levelParsed.audioCodec, videoCodec = levelParsed.videoCodec, imageCodec = levelParsed.imageCodec, width = levelParsed.width, height = levelParsed.height;
if (!supported) {
return;
}
resolutionFound || (resolutionFound = !!(width && height));
videoCodecFound || (videoCodecFound = !!videoCodec);
audioCodecFound || (audioCodecFound = !!audioCodec);
imageCodecFound || (imageCodecFound = !!imageCodec);
var CODECS = attributes.CODECS, FRAMERATE = attributes["FRAME-RATE"], HDCP = attributes["HDCP-LEVEL"], PATHWAY = attributes["PATHWAY-ID"], RESOLUTION = attributes.RESOLUTION, VIDEO_RANGE = attributes["VIDEO-RANGE"];
var contentSteeringPrefix = "".concat(PATHWAY || '.', "-");
var levelKey = "".concat(contentSteeringPrefix).concat(levelParsed.bitrate, "-").concat(RESOLUTION, "-").concat(FRAMERATE, "-").concat(CODECS, "-").concat(VIDEO_RANGE, "-").concat(HDCP);
if (!redundantSet[levelKey]) {
var level = _this.createLevel(levelParsed);
redundantSet[levelKey] = level;
generatePathwaySet[levelKey] = 1;
levels.push(level);
}
else if (redundantSet[levelKey].uri !== levelParsed.url &&
!levelParsed.attrs['PATHWAY-ID']) {
var pathwayCount = (generatePathwaySet[levelKey] += 1);
levelParsed.attrs['PATHWAY-ID'] = new Array(pathwayCount + 1).join('.');
var level = _this.createLevel(levelParsed);
redundantSet[levelKey] = level;
levels.push(level);
}
else if (!levelParsed.iframes) {
redundantSet[levelKey].addGroupId('audio', attributes.AUDIO);
redundantSet[levelKey].addGroupId('text', attributes.SUBTITLES);
}
});
this.filterAndSortMediaOptions(levels, data, resolutionFound, videoCodecFound, audioCodecFound, imageCodecFound);
};
LevelController.prototype.createLevel = function (levelParsed) {
var level = new Level(levelParsed);
var supplemental = levelParsed.supplemental;
if ((supplemental === null || supplemental === void 0 ? void 0 : supplemental.videoCodec) &&
!isVideoSupported(supplemental.videoCodec, this.hls.config.preferManagedMediaSource)) {
var error = new Error("SUPPLEMENTAL-CODECS not supported \"".concat(supplemental.videoCodec, "\""));
level.supportedResult = getUnsupportedResult(error, []);
}
return level;
};
LevelController.prototype.filterAndSortMediaOptions = function (filteredLevels, data, resolutionFound, videoCodecFound, audioCodecFound, imageCodecFound) {
var _this = this;
var _a, _b;
var audioTracks = [];
var subtitleTracks = [];
var levels = filteredLevels;
var statsParsing = ((_a = data.stats) === null || _a === void 0 ? void 0 : _a.parsing) || {};
var preferManagedMediaSource = this.hls.config.preferManagedMediaSource;
if ((resolutionFound || videoCodecFound) && audioCodecFound) {
levels = levels.filter(function (_a) {
var videoCodec = _a.videoCodec, videoRange = _a.videoRange, width = _a.width, height = _a.height;
return (!!videoCodec || !!(width && height)) && isVideoRange(videoRange);
});
}
if (videoCodecFound && imageCodecFound) {
levels = levels.filter(function (lvl) { return !lvl.imageCodec; });
}
if (levels.length === 0) {
Promise.resolve().then(function () {
if (_this.hls) {
var message = 'no level with compatible codecs found in manifest';
var reason = message;
if (data.levels.length) {
reason = "one or more CODECS in variant not supported: ".concat(stringify(data.levels
.map(function (level) { return level.attrs.CODECS; })
.filter(function (value, index, array) { return array.indexOf(value) === index; })));
_this.warn(reason);
message += " (".concat(reason, ")");
}
var error = new Error(message);
_this.hls.trigger(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR,
fatal: true,
url: data.url,
error: error,
reason: reason,
});
}
});
statsParsing.end = performance.now();
return;
}
if (data.audioTracks) {
audioTracks = data.audioTracks.filter(function (track) {
return !track.audioCodec ||
isAudioSupported(track.audioCodec, preferManagedMediaSource);
});
assignTrackIdsByGroup(audioTracks);
}
if (data.subtitles) {
subtitleTracks = data.subtitles;
assignTrackIdsByGroup(subtitleTracks);
}
var unsortedLevels = levels.slice(0);
levels.sort(function (a, b) {
if (a.attrs['HDCP-LEVEL'] !== b.attrs['HDCP-LEVEL']) {
return (a.attrs['HDCP-LEVEL'] || '') > (b.attrs['HDCP-LEVEL'] || '')
? 1
: -1;
}
if (resolutionFound && a.height !== b.height) {
return a.height - b.height;
}
if (a.frameRate !== b.frameRate) {
return a.frameRate - b.frameRate;
}
if (a.videoRange !== b.videoRange) {
return (VideoRangeValues.indexOf(a.videoRange) -
VideoRangeValues.indexOf(b.videoRange));
}
if (a.videoCodec !== b.videoCodec) {
var valueA = videoCodecPreferenceValue(a.videoCodec);
var valueB = videoCodecPreferenceValue(b.videoCodec);
if (valueA !== valueB) {
return valueB - valueA;
}
}
if (a.uri === b.uri && a.codecSet !== b.codecSet) {
var valueA = codecsSetSelectionPreferenceValue(a.codecSet);
var valueB = codecsSetSelectionPreferenceValue(b.codecSet);
if (valueA !== valueB) {
return valueB - valueA;
}
}
if (a.averageBitrate !== b.averageBitrate) {
return a.averageBitrate - b.averageBitrate;
}
return 0;
});
var firstLevelInPlaylist = unsortedLevels[0];
if (this.steering) {
levels = this.steering.filterParsedLevels(levels);
if (levels.length !== unsortedLevels.length) {
for (var i = 0; i < unsortedLevels.length; i++) {
if (unsortedLevels[i].pathwayId === levels[0].pathwayId) {
firstLevelInPlaylist = unsortedLevels[i];
break;
}
}
}
}
this._levels = levels;
for (var i = 0; i < levels.length; i++) {
if (levels[i] === firstLevelInPlaylist) {
this._firstLevel = i;
var firstLevelBitrate = firstLevelInPlaylist.bitrate;
var bandwidthEstimate = this.hls.bandwidthEstimate;
if (((_b = this.hls.userConfig) === null || _b === void 0 ? void 0 : _b.abrEwmaDefaultEstimate) === undefined) {
var startingBwEstimate = Math.min(firstLevelBitrate, this.hls.config.abrEwmaDefaultEstimateMax);
if (startingBwEstimate > bandwidthEstimate &&
bandwidthEstimate === this.hls.abrEwmaDefaultEstimate) {
this.hls.bandwidthEstimate = startingBwEstimate;
}
}
break;
}
}
var iframeVariants = data.iframeVariants.filter(function (parsedVariant) {
return setTrackCodecsAndReturnSupported(parsedVariant, preferManagedMediaSource);
});
this._iframeVariants = iframeVariants;
var audioOnly = audioCodecFound && !videoCodecFound;
var config = this.hls.config;
var altAudioEnabled = !!(config.audioStreamController && config.audioTrackController);
var edata = {
levels: levels,
audioTracks: audioTracks,
subtitleTracks: subtitleTracks,
iframeVariants: iframeVariants,
sessionData: data.sessionData,
sessionKeys: data.sessionKeys,
firstLevel: this._firstLevel,
stats: data.stats,
audio: audioCodecFound,
video: videoCodecFound,
altAudio: altAudioEnabled && !audioOnly && audioTracks.some(function (t) { return !!t.url; }),
};
statsParsing.end = performance.now();
this.hls.trigger(Events.MANIFEST_PARSED, edata);
};
Object.defineProperty(LevelController.prototype, "iframeVariants", {
get: function () {
if (this._iframeVariants.length === 0) {
return null;
}
return this._iframeVariants;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelController.prototype, "levels", {
get: function () {
if (this._levels.length === 0) {
return null;
}
return this._levels;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelController.prototype, "loadLevelObj", {
get: function () {
return this.currentLevel;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelController.prototype, "level", {
get: function () {
return this.currentLevelIndex;
},
set: function (newLevel) {
var levels = this._levels;
if (levels.length === 0) {
return;
}
if (newLevel < 0 || newLevel >= levels.length) {
var error = new Error('invalid level idx');
var fatal = newLevel < 0;
this.hls.trigger(Events.ERROR, {
type: ErrorTypes.OTHER_ERROR,
details: ErrorDetails.LEVEL_SWITCH_ERROR,
level: newLevel,
fatal: fatal,
error: error,
reason: error.message,
});
if (fatal) {
return;
}
newLevel = Math.min(newLevel, levels.length - 1);
}
var lastLevelIndex = this.currentLevelIndex;
var lastLevel = this.currentLevel;
var lastPathwayId = lastLevel ? lastLevel.attrs['PATHWAY-ID'] : undefined;
var level = levels[newLevel];
var pathwayId = level.attrs['PATHWAY-ID'];
this.currentLevelIndex = newLevel;
this.currentLevel = level;
if (lastLevelIndex === newLevel &&
lastLevel &&
lastPathwayId === pathwayId) {
return;
}
var levelSwitchingData = {
level: newLevel,
attrs: level.attrs,
details: level.details,
bitrate: level.bitrate,
averageBitrate: level.averageBitrate,
maxBitrate: level.maxBitrate,
realBitrate: level.realBitrate,
width: level.width,
height: level.height,
codecSet: level.codecSet,
audioCodec: level.audioCodec,
videoCodec: level.videoCodec,
audioGroups: level.audioGroups,
subtitleGroups: level.subtitleGroups,
loaded: level.loaded,
loadError: level.loadError,
fragmentError: level.fragmentError,
name: level.name,
id: level.id,
uri: level.uri,
url: level.url,
urlId: 0,
audioGroupIds: level.audioGroupIds,
textGroupIds: level.textGroupIds,
};
this.hls.trigger(Events.LEVEL_SWITCHING, levelSwitchingData);
var levelDetails = level.details;
if (!levelDetails || levelDetails.live) {
var hlsUrlParameters = this.switchParams(level.uri, lastLevel === null || lastLevel === void 0 ? void 0 : lastLevel.details, levelDetails);
this.loadPlaylist(hlsUrlParameters);
}
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelController.prototype, "manualLevel", {
get: function () {
return this.manualLevelIndex;
},
set: function (newLevel) {
this.manualLevelIndex = newLevel;
if (this._startLevel === undefined) {
this._startLevel = newLevel;
}
if (newLevel !== -1) {
this.level = newLevel;
}
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelController.prototype, "firstLevel", {
get: function () {
return this._firstLevel;
},
set: function (newLevel) {
this._firstLevel = newLevel;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelController.prototype, "startLevel", {
get: function () {
if (this._startLevel === undefined) {
var configStartLevel = this.hls.config.startLevel;
if (configStartLevel !== undefined) {
return configStartLevel;
}
return this.hls.firstAutoLevel;
}
return this._startLevel;
},
set: function (newLevel) {
this._startLevel = newLevel;
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelController.prototype, "pathways", {
get: function () {
if (this.steering) {
return this.steering.pathways();
}
return [];
},
enumerable: false,
configurable: true
});
Object.defineProperty(LevelController.prototype, "pathwayPriority", {
get: function () {
if (this.steering) {
return this.steering.pathwayPriority;
}
return null;
},
set: function (pathwayPriority) {
if (this.steering) {
var pathwaysList_1 = this.steering.pathways();
var filteredPathwayPriority = pathwayPriority.filter(function (pathwayId) {
return pathwaysList_1.indexOf(pathwayId) !== -1;
});
if (pathwayPriority.length < 1) {
this.warn("pathwayPriority ".concat(pathwayPriority, " should contain at least one pathway from list: ").concat(pathwaysList_1));
return;
}
this.steering.pathwayPriority = filteredPathwayPriority;
}
},
enumerable: false,
configurable: true
});
LevelController.prototype.onError = function (event, data) {
if (data.fatal || !data.context) {
return;
}
if (data.context.type === LoaderContextType.LEVEL &&
data.context.level === this.level) {
this.checkRetry(data);
}
};
LevelController.prototype.onFragBuffered = function (event, _a) {
var frag = _a.frag;
if (frag.type === PlaylistLevelType.MAIN) {
var el_1 = frag.elementaryStreams;
if (!Object.keys(el_1).some(function (type) { return !!el_1[type]; })) {
return;
}
var level = this._levels[frag.level];
if (level === null || level === void 0 ? void 0 : level.loadError) {
level.loadError = 0;
}
}
};
LevelController.prototype.onLevelLoaded = function (event, data) {
var _a, _b;
var level = data.level, details = data.details;
var curLevel = data.levelInfo;
if (!curLevel) {
this.warn("Invalid level index ".concat(level));
if ((_a = data.deliveryDirectives) === null || _a === void 0 ? void 0 : _a.skip) {
details.deltaUpdateFailed = true;
}
return;
}
if (curLevel === this.currentLevel || data.withoutMultiVariant) {
if (curLevel.fragmentError === 0) {
curLevel.loadError = 0;
}
var previousDetails = curLevel.details;
if (previousDetails === data.details && previousDetails.advanced) {
previousDetails = undefined;
}
this.playlistLoaded(level, data, previousDetails);
}
else if ((_b = data.deliveryDirectives) === null || _b === void 0 ? void 0 : _b.skip) {
details.deltaUpdateFailed = true;
}
};
LevelController.prototype.loadPlaylist = function (hlsUrlParameters) {
_super.prototype.loadPlaylist.call(this);
if (this.shouldLoadPlaylist(this.currentLevel)) {
this.scheduleLoading(this.currentLevel, hlsUrlParameters);
}
};
LevelController.prototype.loadingPlaylist = function (currentLevel, hlsUrlParameters) {
_super.prototype.loadingPlaylist.call(this, currentLevel, hlsUrlParameters);
var url = this.getUrlWithDirectives(currentLevel.uri, hlsUrlParameters);
var currentLevelIndex = this.currentLevelIndex;
currentLevel.attrs['PATHWAY-ID'];
var details = currentLevel.details;
details === null || details === void 0 ? void 0 : details.age;
this.hls.trigger(Events.LEVEL_LOADING, {
url: url,
level: currentLevelIndex,
levelInfo: currentLevel,
pathwayId: currentLevel.attrs['PATHWAY-ID'],
id: 0,
deliveryDirectives: hlsUrlParameters || null,
});
};
Object.defineProperty(LevelController.prototype, "nextLoadLevel", {
get: function () {
if (this.manualLevelIndex !== -1) {
return this.manualLevelIndex;
}
else {
return this.hls.nextAutoLevel;
}
},
set: function (nextLevel) {
var currentLevel = this.currentLevelIndex;
var isABRSwitch = this.manualLevelIndex === -1;
if (isABRSwitch && nextLevel !== currentLevel && nextLevel !== -1) {
var abrSwitchInterval = this.hls.config.abrSwitchInterval;
if (abrSwitchInterval > 0) {
var now = performance.now();
var delta = now - this.lastABRSwitchTime;
var intervalMs = abrSwitchInterval * 1000;
if (this.lastABRSwitchTime > -1 && delta < intervalMs) {
this.warn("Preventing ABR level switch: ".concat(currentLevel, " -> ").concat(nextLevel, " (").concat(Math.round(delta), "ms < ").concat(intervalMs, "ms / ").concat(abrSwitchInterval, "s)"));
return;
}
this.lastABRSwitchTime = now;
}
}
this.level = nextLevel;
if (this.manualLevelIndex === -1) {
this.hls.nextAutoLevel = nextLevel;
}
},
enumerable: false,
configurable: true
});
LevelController.prototype.removeLevel = function (levelIndex) {
var _this = this;
var _a;
if (this._levels.length === 1) {
return;
}
var levels = this._levels.filter(function (level, index) {
if (index !== levelIndex) {
return true;
}
if (_this.steering) {
_this.steering.removeLevel(level);
}
if (level === _this.currentLevel) {
_this.currentLevel = null;
_this.currentLevelIndex = -1;
if (level.details) {
level.details.fragments.forEach(function (f) { return (f.level = -1); });
}
}
return false;
});
reassignFragmentLevelIndexes(levels);
this._levels = levels;
if (this.currentLevelIndex > -1 && ((_a = this.currentLevel) === null || _a === void 0 ? void 0 : _a.details)) {
this.currentLevelIndex = this.currentLevel.details.fragments[0].level;
}
if (this.manualLevelIndex > -1) {
this.manualLevelIndex = this.currentLevelIndex;
}
var maxLevel = levels.length - 1;
this._firstLevel = Math.min(this._firstLevel, maxLevel);
if (this._startLevel) {
this._startLevel = Math.min(this._startLevel, maxLevel);
}
this.hls.trigger(Events.LEVELS_UPDATED, { levels: levels });
};
LevelController.prototype.onLevelsUpdated = function (event, _a) {
var levels = _a.levels;
this._levels = levels;
};
LevelController.prototype.checkMaxAutoUpdated = function () {
var _a = this.hls, autoLevelCapping = _a.autoLevelCapping, maxAutoLevel = _a.maxAutoLevel, maxHdcpLevel = _a.maxHdcpLevel;
if (this._maxAutoLevel !== maxAutoLevel) {
this._maxAutoLevel = maxAutoLevel;
this.hls.trigger(Events.MAX_AUTO_LEVEL_UPDATED, {
autoLevelCapping: autoLevelCapping,
levels: this.levels,
maxAutoLevel: maxAutoLevel,
minAutoLevel: this.hls.minAutoLevel,
maxHdcpLevel: maxHdcpLevel,
});
}
};
return LevelController;
}(BasePlaylistController));
function isAudioSupported(codec, preferManagedMediaSource) {
return areCodecsMediaSourceSupported(codec, 'audio', preferManagedMediaSource);
}
function isVideoSupported(codec, preferManagedMediaSource) {
return areCodecsMediaSourceSupported(codec, 'video', preferManagedMediaSource);
}
function setTrackCodecsAndReturnSupported(levelParsed, preferManagedMediaSource) {
var audioCodec = levelParsed.audioCodec, videoCodec = levelParsed.videoCodec;
if (audioCodec) {
levelParsed.audioCodec = audioCodec =
getCodecCompatibleName(audioCodec, preferManagedMediaSource) || undefined;
}
if (videoCodec) {
videoCodec = levelParsed.videoCodec = convertAVC1ToAVCOTI(videoCodec);
}
var unknownCodecs = levelParsed.unknownCodecs;
var unknownUnsupportedCodecCount = (unknownCodecs === null || unknownCodecs === void 0 ? void 0 : unknownCodecs.length) || 0;
if (unknownUnsupportedCodecCount ||
(audioCodec && !isAudioSupported(audioCodec, preferManagedMediaSource)) ||
(videoCodec && !isVideoSupported(videoCodec, preferManagedMediaSource))) {
return false;
}
return true;
}
function assignTrackIdsByGroup(tracks) {
var groups = {};
tracks.forEach(function (track) {
var groupId = track.groupId || '';
track.id = groups[groupId] = groups[groupId] || 0;
groups[groupId]++;
});
}
function KeyLoader() { this.emeController = null; }
KeyLoader.prototype.abort = KeyLoader.prototype.destroy = function () {};
KeyLoader.prototype.loadClear = function () { return null; };
KeyLoader.prototype.load = function () { throw new Error('encrypted streams are left out'); };
function mapContextToLevelType(context) {
var type = context.type;
switch (type) {
case LoaderContextType.AUDIO_TRACK:
return PlaylistLevelType.AUDIO;
case LoaderContextType.SUBTITLE_TRACK:
return PlaylistLevelType.SUBTITLE;
default:
return PlaylistLevelType.MAIN;
}
}
function getResponseUrl(response, context) {
var url = response.url;
if (url === undefined || url.indexOf('data:') === 0) {
url = context.url;
}
return url;
}
var PlaylistLoader = (function () {
function PlaylistLoader(hls) {
this.loaders = Object.create(null);
this.variableList = null;
this.onManifestLoaded = this.checkAutostartLoad;
this.hls = hls;
this.registerListeners();
}
PlaylistLoader.prototype.startLoad = function (startPosition) { };
PlaylistLoader.prototype.stopLoad = function () {
this.destroyInternalLoaders();
};
PlaylistLoader.prototype.registerListeners = function () {
var hls = this.hls;
hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.on(Events.LEVEL_LOADING, this.onLevelLoading, this);
hls.on(Events.AUDIO_TRACK_LOADING, this.onAudioTrackLoading, this);
hls.on(Events.SUBTITLE_TRACK_LOADING, this.onSubtitleTrackLoading, this);
hls.on(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
};
PlaylistLoader.prototype.unregisterListeners = function () {
var hls = this.hls;
hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
hls.off(Events.LEVEL_LOADING, this.onLevelLoading, this);
hls.off(Events.AUDIO_TRACK_LOADING, this.onAudioTrackLoading, this);
hls.off(Events.SUBTITLE_TRACK_LOADING, this.onSubtitleTrackLoading, this);
hls.off(Events.LEVELS_UPDATED, this.onLevelsUpdated, this);
};
PlaylistLoader.prototype.createInternalLoader = function (context) {
var config = this.hls.config;
var PLoader = config.pLoader;
var Loader = config.loader;
var InternalLoader = PLoader || Loader;
var loader = new InternalLoader(config);
this.loaders[context.type] = loader;
return loader;
};
PlaylistLoader.prototype.getInternalLoader = function (context) {
return this.loaders[context.type];
};
PlaylistLoader.prototype.resetInternalLoader = function (contextType) {
if (this.loaders[contextType]) {
delete this.loaders[contextType];
}
};
PlaylistLoader.prototype.destroyInternalLoaders = function () {
for (var contextType in this.loaders) {
var loader = this.loaders[contextType];
if (loader) {
loader.destroy();
}
this.resetInternalLoader(contextType);
}
};
PlaylistLoader.prototype.destroy = function () {
this.variableList = null;
this.unregisterListeners();
this.destroyInternalLoaders();
};
PlaylistLoader.prototype.onManifestLoading = function (event, data) {
var url = data.url;
this.variableList = null;
this.load({
id: null,
level: 0,
responseType: 'text',
type: LoaderContextType.MANIFEST,
url: url,
deliveryDirectives: null,
levelOrTrack: null,
});
};
PlaylistLoader.prototype.onLevelLoading = function (event, data) {
var id = data.id, level = data.level, pathwayId = data.pathwayId, url = data.url, deliveryDirectives = data.deliveryDirectives, levelInfo = data.levelInfo;
this.load({
id: id,
level: level,
pathwayId: pathwayId,
responseType: 'text',
type: LoaderContextType.LEVEL,
url: url,
deliveryDirectives: deliveryDirectives,
levelOrTrack: levelInfo,
});
};
PlaylistLoader.prototype.onAudioTrackLoading = function (event, data) {
var id = data.id, groupId = data.groupId, url = data.url, deliveryDirectives = data.deliveryDirectives, track = data.track;
this.load({
id: id,
groupId: groupId,
level: null,
responseType: 'text',
type: LoaderContextType.AUDIO_TRACK,
url: url,
deliveryDirectives: deliveryDirectives,
levelOrTrack: track,
});
};
PlaylistLoader.prototype.onSubtitleTrackLoading = function (event, data) {
var id = data.id, groupId = data.groupId, url = data.url, deliveryDirectives = data.deliveryDirectives, track = data.track;
this.load({
id: id,
groupId: groupId,
level: null,
responseType: 'text',
type: LoaderContextType.SUBTITLE_TRACK,
url: url,
deliveryDirectives: deliveryDirectives,
levelOrTrack: track,
});
};
PlaylistLoader.prototype.onLevelsUpdated = function (event, data) {
var loader = this.loaders[LoaderContextType.LEVEL];
if (loader) {
var context_1 = loader.context;
if (context_1 &&
!data.levels.some(function (lvl) { return lvl === context_1.levelOrTrack; })) {
loader.abort();
delete this.loaders[LoaderContextType.LEVEL];
}
}
};
PlaylistLoader.prototype.load = function (context) {
var _this = this;
var _a;
var config = this.hls.config;
var loader = this.getInternalLoader(context);
if (loader) {
this.hls.logger;
var loaderContext = loader.context;
if ((loaderContext === null || loaderContext === void 0 ? void 0 : loaderContext.levelOrTrack) === context.levelOrTrack &&
(loaderContext.url === context.url ||
(loaderContext.deliveryDirectives && !context.deliveryDirectives))) {
if (loaderContext.url === context.url) ;
return;
}
loader.abort();
}
var loadPolicy;
if (context.type === LoaderContextType.MANIFEST) {
loadPolicy = config.manifestLoadPolicy.default;
}
else {
loadPolicy = __bolli.assign({}, config.playlistLoadPolicy.default, {
timeoutRetry: null,
errorRetry: null,
});
}
loader = this.createInternalLoader(context);
if (Number.isFinite((_a = context.deliveryDirectives) === null || _a === void 0 ? void 0 : _a.part)) {
var levelDetails = void 0;
if (context.type === LoaderContextType.LEVEL && context.level !== null) {
levelDetails = this.hls.levels[context.level].details;
}
else if (context.type === LoaderContextType.AUDIO_TRACK &&
context.id !== null) {
levelDetails = this.hls.audioTracks[context.id].details;
}
else if (context.type === LoaderContextType.SUBTITLE_TRACK &&
context.id !== null) {
levelDetails = this.hls.subtitleTracks[context.id].details;
}
if (levelDetails) {
var partTarget = levelDetails.partTarget;
var targetDuration = levelDetails.targetduration;
if (partTarget && targetDuration) {
var maxLowLatencyPlaylistRefresh = Math.max(partTarget * 3, targetDuration * 0.8) * 1000;
loadPolicy = __bolli.assign({}, loadPolicy, {
maxTimeToFirstByteMs: Math.min(maxLowLatencyPlaylistRefresh, loadPolicy.maxTimeToFirstByteMs),
maxLoadTimeMs: Math.min(maxLowLatencyPlaylistRefresh, loadPolicy.maxTimeToFirstByteMs),
});
}
}
}
var legacyRetryCompatibility = loadPolicy.errorRetry || loadPolicy.timeoutRetry || {};
var loaderConfig = {
loadPolicy: loadPolicy,
timeout: loadPolicy.maxLoadTimeMs,
maxRetry: legacyRetryCompatibility.maxNumRetry || 0,
retryDelay: legacyRetryCompatibility.retryDelayMs || 0,
maxRetryDelay: legacyRetryCompatibility.maxRetryDelayMs || 0,
};
var loaderCallbacks = {
onSuccess: function (response, stats, context, networkDetails) {
var loader = _this.getInternalLoader(context);
_this.resetInternalLoader(context.type);
var string = response.data;
stats.parsing.start = performance.now();
if (M3U8Parser.isMediaPlaylist(string) ||
context.type !== LoaderContextType.MANIFEST) {
_this.handleTrackOrLevelPlaylist(response, stats, context, networkDetails || null, loader);
}
else {
_this.handleMasterPlaylist(response, stats, context, networkDetails);
}
},
onError: function (response, context, networkDetails, stats) {
_this.handleNetworkError(context, networkDetails, false, response, stats);
},
onTimeout: function (stats, context, networkDetails) {
_this.handleNetworkError(context, networkDetails, true, undefined, stats);
},
};
loader.load(context, loaderConfig, loaderCallbacks);
};
PlaylistLoader.prototype.checkAutostartLoad = function () {
if (!this.hls) {
return;
}
var _a = this.hls, _b = _a.config, autoStartLoad = _b.autoStartLoad, startPosition = _b.startPosition, forceStartLoad = _a.forceStartLoad;
if (autoStartLoad || forceStartLoad) {
this.hls.startLoad(startPosition);
}
};
PlaylistLoader.prototype.handleMasterPlaylist = function (response, stats, context, networkDetails) {
var _this = this;
var hls = this.hls;
var string = response.data;
var url = getResponseUrl(response, context);
var parsedResult = M3U8Parser.parseMasterPlaylist(string, url);
if (parsedResult.playlistParsingError) {
stats.parsing.end = performance.now();
this.handleManifestParsingError(response, context, parsedResult.playlistParsingError, networkDetails, stats);
return;
}
var contentSteering = parsedResult.contentSteering, levels = parsedResult.levels, iframeVariants = parsedResult.iframeVariants, sessionData = parsedResult.sessionData, sessionKeys = parsedResult.sessionKeys, startTimeOffset = parsedResult.startTimeOffset, variableList = parsedResult.variableList;
this.variableList = variableList;
levels.forEach(function (levelParsed) {
var unknownCodecs = levelParsed.unknownCodecs;
if (unknownCodecs) {
var preferManagedMediaSource = _this.hls.config.preferManagedMediaSource;
var audioCodec = levelParsed.audioCodec, videoCodec = levelParsed.videoCodec;
for (var i = unknownCodecs.length; i--;) {
var unknownCodec = unknownCodecs[i];
if (areCodecsMediaSourceSupported(unknownCodec, 'audio', preferManagedMediaSource)) {
levelParsed.audioCodec = audioCodec = audioCodec
? "".concat(audioCodec, ",").concat(unknownCodec)
: unknownCodec;
sampleEntryCodesISO.audio[audioCodec.substring(0, 4)] = 2;
unknownCodecs.splice(i, 1);
}
else if (areCodecsMediaSourceSupported(unknownCodec, 'video', preferManagedMediaSource)) {
levelParsed.videoCodec = videoCodec = videoCodec
? "".concat(videoCodec, ",").concat(unknownCodec)
: unknownCodec;
sampleEntryCodesISO.video[videoCodec.substring(0, 4)] = 2;
unknownCodecs.splice(i, 1);
}
}
}
});
var _a = M3U8Parser.parseMasterPlaylistMedia(string, url, parsedResult), _b = _a.AUDIO, audioTracks = _b === void 0 ? [] : _b, subtitles = _a.SUBTITLES, captions = _a["CLOSED-CAPTIONS"];
if (audioTracks.length) {
var embeddedAudioFound = audioTracks.some(function (audioTrack) { return !audioTrack.url; });
if (!embeddedAudioFound &&
levels[0].audioCodec &&
!levels[0].attrs.AUDIO) {
audioTracks.unshift({
type: 'main',
name: 'main',
groupId: 'main',
default: false,
autoselect: false,
forced: false,
id: -1,
attrs: new AttrList({}),
bitrate: 0,
url: '',
});
}
}
hls.trigger(Events.MANIFEST_LOADED, {
levels: levels,
audioTracks: audioTracks,
subtitles: subtitles,
iframeVariants: iframeVariants,
captions: captions,
contentSteering: contentSteering,
url: url,
stats: stats,
networkDetails: networkDetails,
sessionData: sessionData,
sessionKeys: sessionKeys,
startTimeOffset: startTimeOffset,
variableList: variableList,
});
};
PlaylistLoader.prototype.handleTrackOrLevelPlaylist = function (response, stats, context, networkDetails, loader) {
var hls = this.hls;
var id = context.id, level = context.level, type = context.type;
var url = getResponseUrl(response, context);
var levelId = Number.isFinite(level)
? level
: Number.isFinite(id)
? id
: 0;
var levelType = mapContextToLevelType(context);
var levelDetails = M3U8Parser.parseLevelPlaylist(response.data, url, levelId, levelType, 0, this.variableList);
if (type === LoaderContextType.MANIFEST) {
var singleLevel = {
attrs: new AttrList({}),
bitrate: 0,
details: levelDetails,
name: '',
url: url,
};
levelDetails.requestScheduled =
stats.loading.start + computeReloadInterval(levelDetails, 0);
hls.trigger(Events.MANIFEST_LOADED, {
levels: [singleLevel],
audioTracks: [],
iframeVariants: [],
url: url,
stats: stats,
networkDetails: networkDetails,
sessionData: null,
sessionKeys: null,
contentSteering: null,
startTimeOffset: null,
variableList: null,
});
}
stats.parsing.end = performance.now();
context.levelDetails = levelDetails;
this.handlePlaylistLoaded(levelDetails, response, stats, context, networkDetails, loader);
};
PlaylistLoader.prototype.handleManifestParsingError = function (response, context, error, networkDetails, stats) {
this.hls.trigger(Events.ERROR, {
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.MANIFEST_PARSING_ERROR,
fatal: context.type === LoaderContextType.MANIFEST,
url: response.url,
err: error,
error: error,
reason: error.message,
response: response,
context: context,
networkDetails: networkDetails,
stats: stats,
});
};
PlaylistLoader.prototype.handleNetworkError = function (context, networkDetails, timeout, response, stats) {
if (timeout === void 0) { timeout = false; }
var message = "A network ".concat(timeout
? 'timeout'
: 'error' + (response ? ' (status ' + response.code + ')' : ''), " occurred while loading ").concat(context.type);
if (context.type === LoaderContextType.LEVEL) {
message += ": ".concat(context.level, " id: ").concat(context.id);
}
else if (context.type === LoaderContextType.AUDIO_TRACK ||
context.type === LoaderContextType.SUBTITLE_TRACK) {
message += " id: ".concat(context.id, " group-id: \"").concat(context.groupId, "\"");
}
var error = new Error(message);
this.hls.logger.warn("[playlist-loader]: ".concat(message));
var details = ErrorDetails.UNKNOWN;
var fatal = false;
var loader = this.getInternalLoader(context);
switch (context.type) {
case LoaderContextType.MANIFEST:
details = timeout
? ErrorDetails.MANIFEST_LOAD_TIMEOUT
: ErrorDetails.MANIFEST_LOAD_ERROR;
fatal = true;
break;
case LoaderContextType.LEVEL:
details = timeout
? ErrorDetails.LEVEL_LOAD_TIMEOUT
: ErrorDetails.LEVEL_LOAD_ERROR;
fatal = false;
break;
case LoaderContextType.AUDIO_TRACK:
details = timeout
? ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT
: ErrorDetails.AUDIO_TRACK_LOAD_ERROR;
fatal = false;
break;
case LoaderContextType.SUBTITLE_TRACK:
details = timeout
? ErrorDetails.SUBTITLE_TRACK_LOAD_TIMEOUT
: ErrorDetails.SUBTITLE_LOAD_ERROR;
fatal = false;
break;
}
if (loader) {
this.resetInternalLoader(context.type);
}
var errorData = {
type: ErrorTypes.NETWORK_ERROR,
details: details,
fatal: fatal,
url: context.url,
loader: loader,
context: context,
error: error,
networkDetails: networkDetails,
stats: stats,
};
if (response) {
var url = context.url;
if (networkDetails && 'url' in networkDetails) {
url = networkDetails.url;
}
errorData.response = __assign({ url: url, data: undefined }, response);
}
this.hls.trigger(Events.ERROR, errorData);
};
PlaylistLoader.prototype.handlePlaylistLoaded = function (levelDetails, response, stats, context, networkDetails, loader) {
var hls = this.hls;
var type = context.type, level = context.level, levelOrTrack = context.levelOrTrack, id = context.id, groupId = context.groupId, deliveryDirectives = context.deliveryDirectives;
var url = getResponseUrl(response, context);
var parent = mapContextToLevelType(context);
var levelIndex = typeof context.level === 'number' && parent === PlaylistLevelType.MAIN
? level
: undefined;
var error = levelDetails.playlistParsingError;
if (error) {
this.hls.logger.warn("".concat(error, " ").concat(levelDetails.url));
if (!hls.config.ignorePlaylistParsingErrors) {
hls.trigger(Events.ERROR, {
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.LEVEL_PARSING_ERROR,
fatal: false,
url: url,
error: error,
reason: error.message,
response: response,
context: context,
level: levelIndex,
parent: parent,
networkDetails: networkDetails,
stats: stats,
});
return;
}
levelDetails.playlistParsingError = null;
}
if (!levelDetails.fragments.length) {
var error_1 = (levelDetails.playlistParsingError = new Error('No Segments found in Playlist'));
hls.trigger(Events.ERROR, {
type: ErrorTypes.NETWORK_ERROR,
details: ErrorDetails.LEVEL_EMPTY_ERROR,
fatal: false,
url: url,
error: error_1,
reason: error_1.message,
response: response,
context: context,
level: levelIndex,
parent: parent,
networkDetails: networkDetails,
stats: stats,
});
return;
}
if (levelDetails.live && loader) {
if (loader.getCacheAge) {
levelDetails.ageHeader = loader.getCacheAge() || 0;
}
if (!loader.getCacheAge || isNaN(levelDetails.ageHeader)) {
levelDetails.ageHeader = 0;
}
}
switch (type) {
case LoaderContextType.MANIFEST:
case LoaderContextType.LEVEL:
if (levelIndex) {
if (!levelOrTrack) {
levelIndex = 0;
}
else {
if (levelOrTrack !== hls.levels[levelIndex]) {
var updatedIndex = hls.levels.indexOf(levelOrTrack);
if (updatedIndex > -1) {
levelIndex = updatedIndex;
}
}
}
}
hls.trigger(Events.LEVEL_LOADED, {
details: levelDetails,
levelInfo: levelOrTrack || hls.levels[0],
level: levelIndex || 0,
id: id || 0,
stats: stats,
networkDetails: networkDetails,
deliveryDirectives: deliveryDirectives,
withoutMultiVariant: type === LoaderContextType.MANIFEST,
context: context,
});
break;
case LoaderContextType.AUDIO_TRACK:
hls.trigger(Events.AUDIO_TRACK_LOADED, {
details: levelDetails,
track: levelOrTrack,
id: id || 0,
groupId: groupId || '',
stats: stats,
networkDetails: networkDetails,
deliveryDirectives: deliveryDirectives,
context: context,
});
break;
case LoaderContextType.SUBTITLE_TRACK:
hls.trigger(Events.SUBTITLE_TRACK_LOADED, {
details: levelDetails,
track: levelOrTrack,
id: id || 0,
groupId: groupId || '',
stats: stats,
networkDetails: networkDetails,
deliveryDirectives: deliveryDirectives,
context: context,
});
break;
}
};
return PlaylistLoader;
}());
var Hls = (function () {
function Hls(userConfig) {
if (userConfig === void 0) { userConfig = {}; }
this._url = null;
this._emitter = new EventEmitter();
this._autoLevelCapping = -1;
this._maxHdcpLevel = null;
this._media = null;
this.started = false;
var logger = (this.logger = enableLogs(userConfig.debug || false, 'Hls instance', userConfig.loggerId || userConfig.assetPlayerId));
var config = (this.config = mergeConfig(Hls.DefaultConfig, userConfig, logger));
this.userConfig = userConfig;
if (config.progressive) {
enableStreamingMode(config);
}
var _StreamController = config.streamController, _AbrController = config.abrController, _BufferController = config.bufferController, _CapLevelController = config.capLevelController, _ErrorController = config.errorController, _FpsController = config.fpsController, _ID3TrackController = config.id3TrackController, _IFrameController = config.iframeController, _GapController = config.gapController;
var errorController = new _ErrorController(this);
var abrController = (this.abrController = new _AbrController(this));
var fragmentTracker = new FragmentTracker(this);
var _InterstitialsController = config.interstitialsController;
var interstitialsController = _InterstitialsController
? (this.interstitialsController = new _InterstitialsController(this, Hls))
: null;
var bufferController = _BufferController
? (this.bufferController = new _BufferController(this, fragmentTracker))
: null;
var capLevelController = _CapLevelController
? (this.capLevelController = new _CapLevelController(this))
: null;
var fpsController = _FpsController ? new _FpsController(this) : null;
var _CMCDController = config.cmcdController;
var cmcdController = _CMCDController
? (this.cmcdController = new _CMCDController(this))
: null;
var playListLoader = new PlaylistLoader(this);
var _ContentSteeringController = config.contentSteeringController;
var contentSteering = _ContentSteeringController
? new _ContentSteeringController(this)
: null;
var levelController = (this.levelController = new LevelController(this, contentSteering));
var id3TrackController = _ID3TrackController
? new _ID3TrackController(this)
: undefined;
var keyLoader = new KeyLoader(this.config, this.logger);
var streamController = (this.streamController = new _StreamController(this, fragmentTracker, keyLoader));
var gapController = (this.gapController = _GapController
? new _GapController(this, fragmentTracker)
: undefined);
if (capLevelController) {
capLevelController.setStreamController(streamController);
}
var networkControllers = [
playListLoader,
levelController,
streamController,
];
if (interstitialsController) {
networkControllers.splice(1, 0, interstitialsController);
}
if (contentSteering) {
networkControllers.splice(1, 0, contentSteering);
}
this.networkControllers = networkControllers;
var coreComponents = [abrController];
if (bufferController) {
coreComponents.push(bufferController);
}
if (gapController) {
coreComponents.push(gapController);
}
if (capLevelController) {
coreComponents.push(capLevelController);
}
if (fpsController) {
fpsController.setStreamController(streamController);
coreComponents.push(fpsController);
}
if (id3TrackController) {
coreComponents.push(id3TrackController);
}
coreComponents.push(fragmentTracker);
this.audioTrackController = this.createController(config.audioTrackController, networkControllers);
var AudioStreamControllerClass = config.audioStreamController;
if (AudioStreamControllerClass) {
networkControllers.push((this.audioStreamController = new AudioStreamControllerClass(this, fragmentTracker, keyLoader)));
}
this.subtitleTrackController = this.createController(config.subtitleTrackController, networkControllers);
var SubtitleStreamControllerClass = config.subtitleStreamController;
if (SubtitleStreamControllerClass) {
networkControllers.push((this.subtititleStreamController = new SubtitleStreamControllerClass(this, fragmentTracker, keyLoader)));
}
this.createController(config.timelineController, coreComponents);
keyLoader.emeController = this.emeController = this.createController(config.emeController, coreComponents);
if (cmcdController) {
coreComponents.push(cmcdController);
}
this.latencyController = this.createController(config.latencyController, coreComponents);
this.coreComponents = coreComponents;
this.iframeController = _IFrameController
? new _IFrameController(this, Hls)
: undefined;
networkControllers.push(errorController);
var onErrorOut = errorController.onErrorOut;
if (typeof onErrorOut === 'function') {
this.on(Events.ERROR, onErrorOut, errorController);
}
this.on(Events.MANIFEST_LOADED, playListLoader.onManifestLoaded, playListLoader);
}
Object.defineProperty(Hls, "version", {
get: function () {
return version;
},
enumerable: false,
configurable: true
});
Hls.isMSESupported = function () {
return isMSESupported();
};
Hls.isSupported = function () {
return isSupported();
};
Hls.getMediaSource = function () {
return getMediaSource();
};
Object.defineProperty(Hls, "Events", {
get: function () {
return Events;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls, "MetadataSchema", {
get: function () {
return MetadataSchema;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls, "ErrorTypes", {
get: function () {
return ErrorTypes;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls, "ErrorDetails", {
get: function () {
return ErrorDetails;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls, "DefaultConfig", {
get: function () {
if (!Hls.defaultConfig) {
return hlsDefaultConfig;
}
return Hls.defaultConfig;
},
set: function (defaultConfig) {
Hls.defaultConfig = defaultConfig;
},
enumerable: false,
configurable: true
});
Hls.prototype.createController = function (ControllerClass, components) {
if (ControllerClass) {
var controllerInstance = new ControllerClass(this);
if (components) {
components.push(controllerInstance);
}
return controllerInstance;
}
return null;
};
Hls.prototype.on = function (event, listener, context) {
if (context === void 0) { context = this; }
this._emitter.on(event, listener, context);
};
Hls.prototype.once = function (event, listener, context) {
if (context === void 0) { context = this; }
this._emitter.once(event, listener, context);
};
Hls.prototype.removeAllListeners = function (event) {
this._emitter.removeAllListeners(event);
};
Hls.prototype.off = function (event, listener, context, once) {
if (context === void 0) { context = this; }
this._emitter.off(event, listener, context, once);
};
Hls.prototype.listeners = function (event) {
return this._emitter.listeners(event);
};
Hls.prototype.emit = function (event, name, eventObject) {
return this._emitter.emit(event, name, eventObject);
};
Hls.prototype.trigger = function (event, eventObject) {
if (this.config.debug) {
return this.emit(event, event, eventObject);
}
else {
try {
return this.emit(event, event, eventObject);
}
catch (error) {
this.logger.error('An internal error happened while handling event ' +
event +
'. Error message: "' +
error.message +
'". Here is a stacktrace:', error);
if (!this.triggeringException) {
this.triggeringException = true;
var fatal = event === Events.ERROR;
this.trigger(Events.ERROR, {
type: ErrorTypes.OTHER_ERROR,
details: ErrorDetails.INTERNAL_EXCEPTION,
fatal: fatal,
event: event,
error: error,
});
this.triggeringException = false;
}
}
}
return false;
};
Hls.prototype.listenerCount = function (event) {
return this._emitter.listenerCount(event);
};
Hls.prototype.destroy = function () {
this.trigger(Events.DESTROYING, undefined);
this.detachMedia();
this.removeAllListeners();
this._autoLevelCapping = -1;
this._url = null;
this.networkControllers.forEach(function (component) { return component.destroy(); });
this.networkControllers.length = 0;
this.coreComponents.forEach(function (component) { return component.destroy(); });
this.coreComponents.length = 0;
this.iframeController = undefined;
var config = this.config;
config.xhrSetup = config.fetchSetup = undefined;
this.userConfig = null;
};
Hls.prototype.attachMedia = function (data) {
if (!data || ('media' in data && !data.media)) {
var error = new Error("attachMedia failed: invalid argument (".concat(data, ")"));
this.trigger(Events.ERROR, {
type: ErrorTypes.OTHER_ERROR,
details: ErrorDetails.ATTACH_MEDIA_ERROR,
fatal: true,
error: error,
});
return;
}
if (this._media) {
this.logger.warn("media must be detached before attaching");
this.detachMedia();
}
var attachMediaSource = 'media' in data;
var media = attachMediaSource ? data.media : data;
var attachingData = attachMediaSource ? data : { media: media };
this._media = media;
this.trigger(Events.MEDIA_ATTACHING, attachingData);
};
Hls.prototype.detachMedia = function () {
var data = {};
this.trigger(Events.MEDIA_DETACHING, data);
this._media = null;
this.trigger(Events.MEDIA_DETACHED, data);
};
Hls.prototype.transferMedia = function () {
var _a;
this._media = null;
var transferMedia = ((_a = this.bufferController) === null || _a === void 0 ? void 0 : _a.transferMedia()) || null;
var data = { transferMedia: transferMedia };
this.trigger(Events.MEDIA_DETACHING, data);
this.trigger(Events.MEDIA_DETACHED, data);
return transferMedia;
};
Hls.prototype.loadSource = function (url) {
var _a;
this.stopLoad();
var media = this.media;
var loadedSource = this._url;
var loadingSource = (this._url = buildAbsoluteURL(self.location.href, url, {
alwaysNormalize: true,
}));
this._autoLevelCapping = -1;
this._maxHdcpLevel = null;
if (media &&
loadedSource &&
(loadedSource !== loadingSource ||
((_a = this.bufferController) === null || _a === void 0 ? void 0 : _a.hasSourceTypes()))) {
this.detachMedia();
this.attachMedia(media);
}
this.trigger(Events.MANIFEST_LOADING, { url: url });
};
Object.defineProperty(Hls.prototype, "url", {
get: function () {
return this._url;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "hasEnoughToStart", {
get: function () {
return this.streamController.hasEnoughToStart;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "startPosition", {
get: function () {
return this.streamController.startPositionValue;
},
enumerable: false,
configurable: true
});
Hls.prototype.startLoad = function (startPosition, skipSeekToStartPosition) {
if (startPosition === void 0) { startPosition = -1; }
this.started = true;
this.resumeBuffering();
for (var i = 0; i < this.networkControllers.length; i++) {
this.networkControllers[i].startLoad(startPosition, skipSeekToStartPosition);
if (!this.started || !this.networkControllers) {
break;
}
}
};
Hls.prototype.stopLoad = function () {
this.started = false;
for (var i = 0; i < this.networkControllers.length; i++) {
this.networkControllers[i].stopLoad();
if (this.started || !this.networkControllers) {
break;
}
}
};
Object.defineProperty(Hls.prototype, "loadingEnabled", {
get: function () {
return this.started && this.streamController.state !== State.STOPPED;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "bufferingEnabled", {
get: function () {
return this.streamController.bufferingEnabled;
},
enumerable: false,
configurable: true
});
Hls.prototype.resumeBuffering = function () {
if (!this.bufferingEnabled) {
this.networkControllers.forEach(function (controller) {
if (controller.resumeBuffering) {
controller.resumeBuffering();
}
});
}
};
Hls.prototype.pauseBuffering = function () {
if (this.bufferingEnabled) {
this.networkControllers.forEach(function (controller) {
if (controller.pauseBuffering) {
controller.pauseBuffering();
}
});
}
};
Object.defineProperty(Hls.prototype, "inFlightFragments", {
get: function () {
var _a;
var inFlightData = (_a = {},
_a[PlaylistLevelType.MAIN] = this.streamController.inFlightFrag,
_a);
if (this.audioStreamController) {
inFlightData[PlaylistLevelType.AUDIO] =
this.audioStreamController.inFlightFrag;
}
if (this.subtititleStreamController) {
inFlightData[PlaylistLevelType.SUBTITLE] =
this.subtititleStreamController.inFlightFrag;
}
return inFlightData;
},
enumerable: false,
configurable: true
});
Hls.prototype.swapAudioCodec = function () {
this.streamController.swapAudioCodec();
};
Hls.prototype.recoverMediaError = function () {
var media = this._media;
var started = this.started;
var time = media === null || media === void 0 ? void 0 : media.currentTime;
this.detachMedia();
if (media) {
this.attachMedia(media);
if (started) {
if (time) {
this.startLoad(time);
}
else if (!this.config.autoStartLoad) {
this.startLoad();
}
}
}
};
Hls.prototype.removeLevel = function (levelIndex) {
this.levelController.removeLevel(levelIndex);
};
Object.defineProperty(Hls.prototype, "sessionId", {
get: function () {
var _sessionId = this._sessionId;
if (!_sessionId) {
_sessionId = this._sessionId = uuid();
}
return _sessionId;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "levels", {
get: function () {
var levels = this.levelController.levels;
return levels ? levels : [];
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "latestLevelDetails", {
get: function () {
return this.streamController.getLevelDetails() || null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "loadLevelObj", {
get: function () {
return this.levelController.loadLevelObj;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "currentLevel", {
get: function () {
return this.streamController.currentLevel;
},
set: function (newLevel) {
this.levelController.manualLevel = newLevel;
this.streamController.immediateLevelSwitch();
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "nextLevel", {
get: function () {
return this.streamController.nextLevel;
},
set: function (newLevel) {
this.levelController.manualLevel = newLevel;
this.streamController.nextLevelSwitch();
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "loadLevel", {
get: function () {
return this.levelController.level;
},
set: function (newLevel) {
this.levelController.manualLevel = newLevel;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "nextLoadLevel", {
get: function () {
return this.levelController.nextLoadLevel;
},
set: function (level) {
this.levelController.nextLoadLevel = level;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "firstLevel", {
get: function () {
return Math.max(this.levelController.firstLevel, this.minAutoLevel);
},
set: function (newLevel) {
this.levelController.firstLevel = newLevel;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "startLevel", {
get: function () {
var startLevel = this.levelController.startLevel;
if (startLevel === -1 && this.abrController.forcedAutoLevel > -1) {
return this.abrController.forcedAutoLevel;
}
return startLevel;
},
set: function (newLevel) {
if (newLevel !== -1) {
newLevel = Math.max(newLevel, this.minAutoLevel);
}
this.levelController.startLevel = newLevel;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "capLevelToPlayerSize", {
get: function () {
return this.config.capLevelToPlayerSize;
},
set: function (shouldStartCapping) {
var capLevelController = this.capLevelController;
var newCapLevelToPlayerSize = !!shouldStartCapping;
if (capLevelController &&
newCapLevelToPlayerSize !== this.config.capLevelToPlayerSize) {
if (newCapLevelToPlayerSize) {
capLevelController.startCapping();
}
else {
capLevelController.stopCapping();
this.autoLevelCapping = -1;
this.streamController.nextLevelSwitch();
}
this.config.capLevelToPlayerSize = newCapLevelToPlayerSize;
}
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "autoLevelCapping", {
get: function () {
return this._autoLevelCapping;
},
set: function (newLevel) {
if (this._autoLevelCapping !== newLevel) {
this._autoLevelCapping = newLevel;
this.levelController.checkMaxAutoUpdated();
}
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "bandwidthEstimate", {
get: function () {
var bwEstimator = this.abrController.bwEstimator;
if (!bwEstimator) {
return NaN;
}
return bwEstimator.getEstimate();
},
set: function (abrEwmaDefaultEstimate) {
this.abrController.resetEstimator(abrEwmaDefaultEstimate);
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "abrEwmaDefaultEstimate", {
get: function () {
var bwEstimator = this.abrController.bwEstimator;
if (!bwEstimator) {
return NaN;
}
return bwEstimator.defaultEstimate;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "ttfbEstimate", {
get: function () {
var bwEstimator = this.abrController.bwEstimator;
if (!bwEstimator) {
return NaN;
}
return bwEstimator.getEstimateTTFB();
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "maxHdcpLevel", {
get: function () {
return this._maxHdcpLevel;
},
set: function (value) {
if (isHdcpLevel(value) && this._maxHdcpLevel !== value) {
this._maxHdcpLevel = value;
this.levelController.checkMaxAutoUpdated();
}
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "autoLevelEnabled", {
get: function () {
return this.levelController.manualLevel === -1;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "manualLevel", {
get: function () {
return this.levelController.manualLevel;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "minAutoLevel", {
get: function () {
var _a = this, levels = _a.levels, minAutoBitrate = _a.config.minAutoBitrate;
if (!levels)
return 0;
var len = levels.length;
for (var i = 0; i < len; i++) {
if (levels[i].maxBitrate >= minAutoBitrate) {
return i;
}
}
return 0;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "maxAutoLevel", {
get: function () {
var _a = this, levels = _a.levels, autoLevelCapping = _a.autoLevelCapping, maxHdcpLevel = _a.maxHdcpLevel;
var maxAutoLevel;
if (autoLevelCapping === -1 && (levels === null || levels === void 0 ? void 0 : levels.length)) {
maxAutoLevel = levels.length - 1;
}
else {
maxAutoLevel = autoLevelCapping;
}
if (maxHdcpLevel) {
for (var i = maxAutoLevel; i--;) {
var hdcpLevel = levels[i].attrs['HDCP-LEVEL'];
if (hdcpLevel && hdcpLevel <= maxHdcpLevel) {
return i;
}
}
}
return maxAutoLevel;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "firstAutoLevel", {
get: function () {
return this.abrController.firstAutoLevel;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "nextAutoLevel", {
get: function () {
return this.abrController.nextAutoLevel;
},
set: function (nextLevel) {
this.abrController.nextAutoLevel = nextLevel;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "playingDate", {
get: function () {
return this.streamController.currentProgramDateTime;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "mainForwardBufferInfo", {
get: function () {
return this.streamController.getMainFwdBufferInfo();
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "audioForwardBufferInfo", {
get: function () {
var _a;
return ((_a = this.audioStreamController) === null || _a === void 0 ? void 0 : _a.getFwdBufferInfo()) || null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "maxBufferLength", {
get: function () {
return this.streamController.maxBufferLength;
},
enumerable: false,
configurable: true
});
Hls.prototype.setAudioOption = function (audioOption) {
var _a;
return ((_a = this.audioTrackController) === null || _a === void 0 ? void 0 : _a.setAudioOption(audioOption)) || null;
};
Hls.prototype.setSubtitleOption = function (subtitleOption) {
var _a;
return (((_a = this.subtitleTrackController) === null || _a === void 0 ? void 0 : _a.setSubtitleOption(subtitleOption)) || null);
};
Object.defineProperty(Hls.prototype, "allAudioTracks", {
get: function () {
var audioTrackController = this.audioTrackController;
return audioTrackController ? audioTrackController.allAudioTracks : [];
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "audioTracks", {
get: function () {
var audioTrackController = this.audioTrackController;
return audioTrackController ? audioTrackController.audioTracks : [];
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "audioTrack", {
get: function () {
var audioTrackController = this.audioTrackController;
return audioTrackController ? audioTrackController.audioTrack : -1;
},
set: function (audioTrackId) {
var audioTrackController = this.audioTrackController;
if (audioTrackController) {
audioTrackController.audioTrack = audioTrackId;
}
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "nextAudioTrack", {
get: function () {
var _a, _b;
return (_b = (_a = this.audioStreamController) === null || _a === void 0 ? void 0 : _a.nextAudioTrack) !== null && _b !== void 0 ? _b : -1;
},
set: function (audioTrackId) {
var audioTrackController = this.audioTrackController;
if (audioTrackController) {
audioTrackController.nextAudioTrack = audioTrackId;
}
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "allSubtitleTracks", {
get: function () {
var subtitleTrackController = this.subtitleTrackController;
return subtitleTrackController
? subtitleTrackController.allSubtitleTracks
: [];
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "subtitleTracks", {
get: function () {
var subtitleTrackController = this.subtitleTrackController;
return subtitleTrackController
? subtitleTrackController.subtitleTracks
: [];
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "subtitleTrack", {
get: function () {
var subtitleTrackController = this.subtitleTrackController;
return subtitleTrackController ? subtitleTrackController.subtitleTrack : -1;
},
set: function (subtitleTrackId) {
var subtitleTrackController = this.subtitleTrackController;
if (subtitleTrackController) {
subtitleTrackController.subtitleTrack = subtitleTrackId;
}
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "media", {
get: function () {
return this._media;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "subtitleDisplay", {
get: function () {
var subtitleTrackController = this.subtitleTrackController;
return subtitleTrackController
? subtitleTrackController.subtitleDisplay
: false;
},
set: function (value) {
var subtitleTrackController = this.subtitleTrackController;
if (subtitleTrackController) {
subtitleTrackController.subtitleDisplay = value;
}
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "lowLatencyMode", {
get: function () {
return this.config.lowLatencyMode;
},
set: function (mode) {
this.config.lowLatencyMode = mode;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "liveSyncPosition", {
get: function () {
var _a, _b;
return (_b = (_a = this.latencyController) === null || _a === void 0 ? void 0 : _a.liveSyncPosition) !== null && _b !== void 0 ? _b : null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "latency", {
get: function () {
var _a;
return ((_a = this.latencyController) === null || _a === void 0 ? void 0 : _a.latency) || 0;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "maxLatency", {
get: function () {
var _a;
return ((_a = this.latencyController) === null || _a === void 0 ? void 0 : _a.maxLatency) || 0;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "targetLatency", {
get: function () {
var _a;
return ((_a = this.latencyController) === null || _a === void 0 ? void 0 : _a.targetLatency) || null;
},
set: function (latency) {
if (!this.latencyController)
return;
this.latencyController.targetLatency = latency;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "drift", {
get: function () {
var _a;
return ((_a = this.latencyController) === null || _a === void 0 ? void 0 : _a.drift) || null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "forceStartLoad", {
get: function () {
return this.streamController.forceStartLoad;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "pathways", {
get: function () {
return this.levelController.pathways;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "pathwayPriority", {
get: function () {
return this.levelController.pathwayPriority;
},
set: function (pathwayPriority) {
this.levelController.pathwayPriority = pathwayPriority;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "bufferedToEnd", {
get: function () {
var _a;
return !!((_a = this.bufferController) === null || _a === void 0 ? void 0 : _a.bufferedToEnd);
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "interstitialsManager", {
get: function () {
return null;
},
enumerable: false,
configurable: true
});
Object.defineProperty(Hls.prototype, "iframeVariants", {
get: function () {
var iframeVariants = this.levelController.iframeVariants;
return iframeVariants ? iframeVariants : [];
},
enumerable: false,
configurable: true
});
Hls.prototype.createIFramePlayer = function (configOverride) {
return null;
};
Hls.prototype.createImageIFramePlayer = function (configOverride) {
return null;
};
Hls.prototype.getMediaDecodingInfo = function (level, audioTracks) {
if (audioTracks === void 0) { audioTracks = this.allAudioTracks; }
var audioTracksByGroup = getAudioTracksByGroup(audioTracks);
return getMediaDecodingInfoPromise(level, audioTracksByGroup, navigator.mediaCapabilities);
};
return Hls;
}());
Hls.loadWorker = loadWorker;
return Hls;
})();
