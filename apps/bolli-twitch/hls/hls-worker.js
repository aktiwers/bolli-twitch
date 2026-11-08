/*! hls.js 1.7.4 (https://github.com/video-dev/hls.js), Copyright (c) 2017 Dailymotion, Apache License 2.0. Trimmed and compiled for Chrome 38 by Bolli Twitch (tools/twitch_hls.mjs): see LICENSE and README.md beside this file. Includes eventemitter3 (MIT, Arnout Kazemier), url-toolkit (Apache 2.0, Tom Jenkinson) and the Common Media Library (Apache 2.0, Streaming Video Technology Alliance). */
(function () {
'use strict';
var has = Object.prototype.hasOwnProperty;
var __bolli = {
any_indexOf: function (o, a, b, c) { return typeof o.indexOf === 'function' ? o.indexOf(a, b, c) : ArrayBuffer.isView(o) ? __bolli.ta_indexOf.apply(__bolli, arguments) : o.indexOf(a, b, c); },
assign: function (target) {
if (Object.assign) { return Object.assign.apply(Object, arguments); }
for (var i = 1; i < arguments.length; i++) {
var src = arguments[i];
if (src != null) { for (var k in src) { if (has.call(src, k)) { target[k] = src[k]; } } }
}
return target;
},
fromCodePoint: function () {
if (String.fromCodePoint) { return String.fromCodePoint.apply(String, arguments); }
var out = '';
for (var i = 0; i < arguments.length; i++) {
var c = +arguments[i];
if (c > 0xffff) { c -= 0x10000; out += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 0x3ff)); } else { out += String.fromCharCode(c); }
}
return out;
},
startsWith: function (s, x, at) { if (s.startsWith) { return s.startsWith(x, at); } at = at > 0 ? at | 0 : 0; return s.substr(at, String(x).length) === String(x); },
ta_indexOf: function (a, x, at) { return a.indexOf ? a.indexOf(x, at) : Array.prototype.indexOf.call(a, x, at); },
ta_slice: function (a, start, end) { return a.slice ? a.slice(start, end) : new a.constructor(end === undefined ? a.subarray(start === undefined ? 0 : start) : a.subarray(start, end)); },
ta_some: function (a, fn, self) { return (a.some || Array.prototype.some).call(a, fn, self); }
};
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
var AACDemuxer = undefined;
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
function isArrayBufferLike(value) {
return value instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
}
var UTF_16 = "utf-16";
var UTF_16_BE = "utf-16be";
var UTF_16_LE = "utf-16le";
var UTF_8 = "utf-8";
function decodeText(data, options) {
if (options === void 0) { options = {}; }
var view;
if (isArrayBufferLike(data))
view = new DataView(data);
else
view = new DataView(data.buffer, data.byteOffset, data.byteLength);
var byteOffset = 0;
var encoding = options.encoding;
if (!encoding) {
var first = view.getUint8(0);
var second = view.getUint8(1);
if (first == 239 && second == 187 && view.getUint8(2) == 191) {
encoding = UTF_8;
byteOffset = 3;
}
else if (first == 254 && second == 255) {
encoding = UTF_16_BE;
byteOffset = 2;
}
else if (first == 255 && second == 254) {
encoding = UTF_16_LE;
byteOffset = 2;
}
else
encoding = UTF_8;
}
if (typeof TextDecoder !== "undefined")
return new TextDecoder(encoding).decode(view);
var byteLength = view.byteLength;
var endian = encoding !== UTF_16_BE;
var str = "";
var char;
while (byteOffset < byteLength) {
switch (encoding) {
case UTF_8:
char = view.getUint8(byteOffset);
if (char < 128)
byteOffset++;
else if (char >= 194 && char <= 223)
if (byteOffset + 1 < byteLength) {
var byte2 = view.getUint8(byteOffset + 1);
if (byte2 >= 128 && byte2 <= 191) {
char = (char & 31) << 6 | byte2 & 63;
byteOffset += 2;
}
else
byteOffset++;
}
else
byteOffset++;
else if (char >= 224 && char <= 239)
if (byteOffset + 2 <= byteLength - 1) {
var byte2 = view.getUint8(byteOffset + 1);
var byte3 = view.getUint8(byteOffset + 2);
if (byte2 >= 128 && byte2 <= 191 && byte3 >= 128 && byte3 <= 191) {
char = (char & 15) << 12 | (byte2 & 63) << 6 | byte3 & 63;
byteOffset += 3;
}
else
byteOffset++;
}
else
byteOffset++;
else if (char >= 240 && char <= 244)
if (byteOffset + 3 <= byteLength - 1) {
var byte2 = view.getUint8(byteOffset + 1);
var byte3 = view.getUint8(byteOffset + 2);
var byte4 = view.getUint8(byteOffset + 3);
if (byte2 >= 128 && byte2 <= 191 && byte3 >= 128 && byte3 <= 191 && byte4 >= 128 && byte4 <= 191) {
char = (char & 7) << 18 | (byte2 & 63) << 12 | (byte3 & 63) << 6 | byte4 & 63;
byteOffset += 4;
}
else
byteOffset++;
}
else
byteOffset++;
else
byteOffset++;
break;
case UTF_16_BE:
case UTF_16:
case UTF_16_LE:
char = view.getUint16(byteOffset, endian);
byteOffset += 2;
break;
}
str += __bolli.fromCodePoint(char);
}
return str;
}
function utf8ArrayToStr(array, exitOnNull) {
if (exitOnNull === void 0) { exitOnNull = false; }
var byteLength = exitOnNull ? __bolli.any_indexOf(array, 0) : array.length;
var result = decodeText(new DataView(array.buffer, array.byteOffset, byteLength), { encoding: UTF_8 });
return exitOnNull ? result : result.replace(/\0/g, "");
}
var MetadataSchema;
(function (MetadataSchema) {
MetadataSchema["audioId3"] = "org.id3";
MetadataSchema["dateRange"] = "com.apple.quicktime.HLS";
MetadataSchema["emsg"] = "https://aomedia.org/emsg/ID3";
MetadataSchema["misbklv"] = "urn:misb:KLV:bin:1910.1";
})(MetadataSchema || (MetadataSchema = {}));
function bin2str(data) {
return String.fromCharCode.apply(null, data);
}
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
? func.bind(self.console, "".concat('', "[").concat(type, "] >"))
: noop;
}
function getLoggerFn(key, debugConfig, id) {
return debugConfig[key]
? debugConfig[key].bind(debugConfig)
: consolePrintFn(key);
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
newLogger[key] = getLoggerFn(key, debugConfig);
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
var RemuxerTrackIdConfig = {
video: 1,
audio: 2,
id3: 3,
text: 4,
};
function readUint16(buffer, offset) {
var val = (buffer[offset] << 8) | buffer[offset + 1];
return val < 0 ? 65536 + val : val;
}
function readUint32(buffer, offset) {
var val = (buffer[offset] << 24) |
(buffer[offset + 1] << 16) |
(buffer[offset + 2] << 8) |
buffer[offset + 3];
return val < 0 ? 4294967296 + val : val;
}
function readUint64(buffer, offset) {
var result = readUint32(buffer, offset);
result *= Math.pow(2, 32);
result += readUint32(buffer, offset + 4);
return result;
}
function readCString(buffer, offset) {
var result = '';
for (var i = offset; i < buffer.length; i++) {
result += String.fromCharCode(buffer[i]);
if (buffer[i] === 0) {
return result;
}
}
return null;
}
function readSint32(buffer, offset) {
return ((buffer[offset] << 24) |
(buffer[offset + 1] << 16) |
(buffer[offset + 2] << 8) |
buffer[offset + 3]);
}
function writeUint32(buffer, offset, value) {
buffer[offset] = value >> 24;
buffer[offset + 1] = (value >> 16) & 0xff;
buffer[offset + 2] = (value >> 8) & 0xff;
buffer[offset + 3] = value & 0xff;
}
function hasBoxData(data, type) {
var end = data.byteLength;
for (var i = 0; i < end;) {
var size = readUint32(data, i);
if (size > 8 && readUint32(data, i + 4) === types[type]) {
return true;
}
i = size > 1 ? i + size : end;
}
return false;
}
function findBox(data, path) {
var results = [];
if (!path.length) {
return results;
}
findBoxPath(data, path, 0, 0, data.byteLength, results);
return results;
}
function findBoxPath(data, path, pathIndex, start, end, results) {
var pathType = path[pathIndex];
if ((pathType === null || pathType === void 0 ? void 0 : pathType.length) !== 4) {
return;
}
var type0 = pathType.charCodeAt(0);
var type1 = pathType.charCodeAt(1);
var type2 = pathType.charCodeAt(2);
var type3 = pathType.charCodeAt(3);
var lastPathIndex = path.length - 1;
for (var i = start; i < end;) {
var hasHeader = i + 8 <= end;
var size = i + 4 <= end
? data[i] * 0x1000000 +
((data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3])
: readUint32(data, i);
var endbox = size > 1 ? i + size : end;
if (hasHeader &&
data[i + 4] === type0 &&
data[i + 5] === type1 &&
data[i + 6] === type2 &&
data[i + 7] === type3) {
var boxEnd = Math.min(endbox, end);
if (pathIndex === lastPathIndex) {
results.push(data.subarray(i + 8, boxEnd));
}
else {
findBoxPath(data, path, pathIndex + 1, i + 8, boxEnd, results);
}
}
i = endbox;
}
}
function parseSegmentIndex(sidx) {
var references = [];
var version = sidx[0];
var index = 8;
var timescale = readUint32(sidx, index);
index += 4;
var earliestPresentationTime = 0;
var firstOffset = 0;
if (version === 0) {
earliestPresentationTime = readUint32(sidx, index);
firstOffset = readUint32(sidx, index + 4);
index += 8;
}
else {
earliestPresentationTime = readUint64(sidx, index);
firstOffset = readUint64(sidx, index + 8);
index += 16;
}
index += 2;
var startByte = sidx.length + firstOffset;
var referencesCount = readUint16(sidx, index);
index += 2;
for (var i = 0; i < referencesCount; i++) {
var referenceIndex = index;
var referenceInfo = readUint32(sidx, referenceIndex);
referenceIndex += 4;
var referenceSize = referenceInfo & 0x7fffffff;
var referenceType = (referenceInfo & 0x80000000) >>> 31;
if (referenceType === 1) {
logger.warn('SIDX has hierarchical references (not supported)');
return null;
}
var subsegmentDuration = readUint32(sidx, referenceIndex);
referenceIndex += 4;
references.push({
referenceSize: referenceSize,
subsegmentDuration: subsegmentDuration,
info: {
duration: subsegmentDuration / timescale,
start: startByte,
end: startByte + referenceSize - 1,
},
});
startByte += referenceSize;
referenceIndex += 4;
index = referenceIndex;
}
return {
earliestPresentationTime: earliestPresentationTime,
timescale: timescale,
version: version,
referencesCount: referencesCount,
references: references,
};
}
function parseInitSegment(initSegment) {
var result = [];
var traks = findBox(initSegment, ['moov', 'trak']);
for (var i = 0; i < traks.length; i++) {
var trak = traks[i];
var tkhd = findBox(trak, ['tkhd'])[0];
if (tkhd) {
var version = tkhd[0];
var trackId = readUint32(tkhd, version === 0 ? 12 : 20);
var mdhd = findBox(trak, ['mdia', 'mdhd'])[0];
if (mdhd) {
version = mdhd[0];
var timescale = readUint32(mdhd, version === 0 ? 12 : 20);
var hdlr = findBox(trak, ['mdia', 'hdlr'])[0];
if (hdlr) {
var hdlrType = bin2str(hdlr.subarray(8, 12));
var type = {
soun: "audio",
vide: "video",
}[hdlrType];
var stsdBox = findBox(trak, ['mdia', 'minf', 'stbl', 'stsd'])[0];
var stsd = parseStsd(stsdBox);
if (type) {
result[trackId] = { timescale: timescale, type: type, stsd: stsd };
result[type] = __assign({ timescale: timescale, id: trackId }, stsd);
}
else {
result[trackId] = {
timescale: timescale,
type: hdlrType,
stsd: stsd,
};
}
}
}
}
}
var trex = findBox(initSegment, ['moov', 'mvex', 'trex']);
trex.forEach(function (trex) {
var trackId = readUint32(trex, 4);
var track = result[trackId];
if (track) {
track.default = {
duration: readUint32(trex, 12),
sampleSize: readUint32(trex, 16),
flags: readUint32(trex, 20),
};
}
});
return result;
}
function parseStsd(stsd) {
var sampleEntries = stsd.subarray(8);
var sampleEntriesEnd = sampleEntries.subarray(8 + 78);
var fourCC = bin2str(sampleEntries.subarray(4, 8));
var codec = fourCC;
var supplemental;
var encrypted = fourCC === 'enca' || fourCC === 'encv';
if (encrypted) {
var encBox = findBox(sampleEntries, [fourCC])[0];
var encBoxChildren = encBox.subarray(fourCC === 'enca' ? 28 : 78);
var sinfs = findBox(encBoxChildren, ['sinf']);
sinfs.forEach(function (sinf) {
var schm = findBox(sinf, ['schm'])[0];
if (schm) {
var scheme = bin2str(schm.subarray(4, 8));
if (scheme === 'cbcs' || scheme === 'cenc') {
var frma = findBox(sinf, ['frma'])[0];
if (frma) {
codec = bin2str(frma);
}
}
}
});
}
var codecFourCC = codec;
switch (codec) {
case 'avc1':
case 'avc2':
case 'avc3':
case 'avc4': {
var avcCBox = findBox(sampleEntriesEnd, ['avcC'])[0];
if (avcCBox && avcCBox.length > 3) {
codec +=
'.' + toHex(avcCBox[1]) + toHex(avcCBox[2]) + toHex(avcCBox[3]);
supplemental = parseSupplementalDoViCodec(codecFourCC === 'avc1' ? 'dva1' : 'dvav', sampleEntriesEnd);
}
break;
}
case 'mp4a': {
var codecBox = findBox(sampleEntries, [fourCC])[0];
var esdsBox = findBox(codecBox.subarray(28), ['esds'])[0];
if (esdsBox && esdsBox.length > 7) {
var i = 4;
if (esdsBox[i++] !== 0x03) {
break;
}
i = skipBERInteger(esdsBox, i);
i += 2;
var flags = esdsBox[i++];
if (flags & 0x80) {
i += 2;
}
if (flags & 0x40) {
i += esdsBox[i++];
}
if (esdsBox[i++] !== 0x04) {
break;
}
i = skipBERInteger(esdsBox, i);
var objectType = esdsBox[i++];
if (objectType === 0x40) {
codec += '.' + toHex(objectType);
}
else {
break;
}
i += 12;
if (esdsBox[i++] !== 0x05) {
break;
}
i = skipBERInteger(esdsBox, i);
var firstByte = esdsBox[i++];
var audioObjectType = (firstByte & 0xf8) >> 3;
if (audioObjectType === 31) {
audioObjectType +=
1 + ((firstByte & 0x7) << 3) + ((esdsBox[i] & 0xe0) >> 5);
}
codec += '.' + audioObjectType;
}
break;
}
case 'hvc1':
case 'hev1': {
var hvcCBox = findBox(sampleEntriesEnd, ['hvcC'])[0];
if (hvcCBox && hvcCBox.length > 12) {
var profileByte = hvcCBox[1];
var profileSpace = ['', 'A', 'B', 'C'][profileByte >> 6];
var generalProfileIdc = profileByte & 0x1f;
var profileCompat = readUint32(hvcCBox, 2);
var tierFlag = (profileByte & 0x20) >> 5 ? 'H' : 'L';
var levelIDC = hvcCBox[12];
var constraintIndicator = hvcCBox.subarray(6, 12);
codec += '.' + profileSpace + generalProfileIdc;
codec +=
'.' + reverse32BitInt(profileCompat).toString(16).toUpperCase();
codec += '.' + tierFlag + levelIDC;
var constraintString = '';
for (var i = constraintIndicator.length; i--;) {
var byte = constraintIndicator[i];
if (byte || constraintString) {
var encodedByte = byte.toString(16).toUpperCase();
constraintString = '.' + encodedByte + constraintString;
}
}
codec += constraintString;
}
supplemental = parseSupplementalDoViCodec(codecFourCC == 'hev1' ? 'dvhe' : 'dvh1', sampleEntriesEnd);
break;
}
case 'dvh1':
case 'dvhe':
case 'dvav':
case 'dva1':
case 'dav1': {
codec = parseSupplementalDoViCodec(codec, sampleEntriesEnd) || codec;
break;
}
case 'vp09': {
var vpcCBox = findBox(sampleEntriesEnd, ['vpcC'])[0];
if (vpcCBox && vpcCBox.length > 6) {
var profile = vpcCBox[4];
var level = vpcCBox[5];
var bitDepth = (vpcCBox[6] >> 4) & 0x0f;
codec +=
'.' +
addLeadingZero(profile) +
'.' +
addLeadingZero(level) +
'.' +
addLeadingZero(bitDepth);
}
break;
}
case 'av01': {
var av1CBox = findBox(sampleEntriesEnd, ['av1C'])[0];
if (av1CBox && av1CBox.length > 2) {
var profile = av1CBox[1] >>> 5;
var level = av1CBox[1] & 0x1f;
var tierFlag = av1CBox[2] >>> 7 ? 'H' : 'M';
var highBitDepth = (av1CBox[2] & 0x40) >> 6;
var twelveBit = (av1CBox[2] & 0x20) >> 5;
var bitDepth = profile === 2 && highBitDepth
? twelveBit
? 12
: 10
: highBitDepth
? 10
: 8;
var monochrome = (av1CBox[2] & 0x10) >> 4;
var chromaSubsamplingX = (av1CBox[2] & 0x08) >> 3;
var chromaSubsamplingY = (av1CBox[2] & 0x04) >> 2;
var chromaSamplePosition = av1CBox[2] & 0x03;
var colorPrimaries = 1;
var transferCharacteristics = 1;
var matrixCoefficients = 1;
var videoFullRangeFlag = 0;
codec +=
'.' +
profile +
'.' +
addLeadingZero(level) +
tierFlag +
'.' +
addLeadingZero(bitDepth) +
'.' +
monochrome +
'.' +
chromaSubsamplingX +
chromaSubsamplingY +
chromaSamplePosition +
'.' +
addLeadingZero(colorPrimaries) +
'.' +
addLeadingZero(transferCharacteristics) +
'.' +
addLeadingZero(matrixCoefficients) +
'.' +
videoFullRangeFlag;
supplemental = parseSupplementalDoViCodec('dav1', sampleEntriesEnd);
}
break;
}
}
return { codec: codec, encrypted: encrypted, supplemental: supplemental };
}
function parseSupplementalDoViCodec(fourCC, sampleEntriesEnd) {
var dvvCResult = findBox(sampleEntriesEnd, ['dvvC']);
var dvXCBox = dvvCResult.length
? dvvCResult[0]
: findBox(sampleEntriesEnd, ['dvcC'])[0];
if (dvXCBox) {
var doViProfile = (dvXCBox[2] >> 1) & 0x7f;
var doViLevel = ((dvXCBox[2] << 5) & 0x20) | ((dvXCBox[3] >> 3) & 0x1f);
return (fourCC +
'.' +
addLeadingZero(doViProfile) +
'.' +
addLeadingZero(doViLevel));
}
}
function reverse32BitInt(val) {
var result = 0;
for (var i = 0; i < 32; i++) {
result |= ((val >> i) & 1) << (32 - 1 - i);
}
return result >>> 0;
}
function skipBERInteger(bytes, i) {
var limit = i + 5;
while (bytes[i++] & 0x80 && i < limit) {
}
return i;
}
function toHex(x) {
return ('0' + x.toString(16).toUpperCase()).slice(-2);
}
function addLeadingZero(num) {
return (num < 10 ? '0' : '') + num;
}
function patchEncyptionData(initSegment, decryptdata) {
if (!initSegment || !decryptdata) {
return;
}
var keyId = decryptdata.keyId;
if ((keyId === null || keyId === void 0 ? void 0 : keyId.byteLength) === 16 && decryptdata.isCommonEncryption) {
applyToTencBoxes(initSegment, function (tenc, isAudio) {
var tencKeyId = tenc.subarray(8, 24);
if (!__bolli.ta_some(tencKeyId, function (b) { return b !== 0; })) {
tenc.set(keyId, 8);
}
});
}
}
function applyToTencBoxes(initSegment, predicate) {
var traks = findBox(initSegment, ['moov', 'trak']);
traks.forEach(function (trak) {
var stsd = findBox(trak, [
'mdia',
'minf',
'stbl',
'stsd',
])[0];
if (!stsd)
return;
var sampleEntries = stsd.subarray(8);
var encBoxes = findBox(sampleEntries, ['enca']);
var isAudio = encBoxes.length > 0;
if (!isAudio) {
encBoxes = findBox(sampleEntries, ['encv']);
}
encBoxes.forEach(function (enc) {
var encBoxChildren = isAudio ? enc.subarray(28) : enc.subarray(78);
var sinfBoxes = findBox(encBoxChildren, ['sinf']);
sinfBoxes.forEach(function (sinf) {
var tenc = parseSinf(sinf);
if (tenc) {
predicate(tenc, isAudio);
}
});
});
});
}
function parseSinf(sinf) {
var schm = findBox(sinf, ['schm'])[0];
if (schm) {
var scheme = bin2str(schm.subarray(4, 8));
if (scheme === 'cbcs' || scheme === 'cenc') {
var tenc = findBox(sinf, ['schi', 'tenc'])[0];
if (tenc) {
return tenc;
}
}
}
}
var utf8TextDecoder;
function decodeUtf8UserData(data) {
if (typeof TextDecoder === 'undefined') {
return utf8ArrayToStr(data);
}
var result = (utf8TextDecoder || (utf8TextDecoder = new TextDecoder('utf-8'))).decode(data);
return result.replace(/\0/g, '');
}
function findMoofTrafs(data) {
var end = data.byteLength;
var trafs = [];
for (var i = 0; i < end;) {
var hasHeader = i + 8 <= end;
var size = i + 4 <= end
? data[i] * 0x1000000 +
((data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3])
: readUint32(data, i);
var endbox = size > 1 ? i + size : end;
if (hasHeader &&
data[i + 4] === 0x6d &&
data[i + 5] === 0x6f &&
data[i + 6] === 0x6f &&
data[i + 7] === 0x66) {
var moofEnd = Math.min(endbox, end);
for (var j = i + 8; j < moofEnd;) {
var childHasHeader = j + 8 <= moofEnd;
var childSize = j + 4 <= moofEnd
? data[j] * 0x1000000 +
((data[j + 1] << 16) | (data[j + 2] << 8) | data[j + 3])
: readUint32(data, j);
var childEndbox = childSize > 1 ? j + childSize : moofEnd;
if (childHasHeader &&
data[j + 4] === 0x74 &&
data[j + 5] === 0x72 &&
data[j + 6] === 0x61 &&
data[j + 7] === 0x66) {
var trafEnd = Math.min(childEndbox, moofEnd);
var tfdt = void 0;
var tfhd = void 0;
var truns = [];
for (var k = j + 8; k < trafEnd;) {
var boxHasHeader = k + 8 <= trafEnd;
var boxSize = k + 4 <= trafEnd
? data[k] * 0x1000000 +
((data[k + 1] << 16) | (data[k + 2] << 8) | data[k + 3])
: readUint32(data, k);
var boxEnd = boxSize > 1 ? k + boxSize : trafEnd;
if (boxHasHeader && data[k + 4] === 0x74) {
var payloadEnd = Math.min(boxEnd, trafEnd);
if (data[k + 5] === 0x66 &&
data[k + 6] === 0x68 &&
data[k + 7] === 0x64) {
tfhd || (tfhd = data.subarray(k + 8, payloadEnd));
}
else if (data[k + 5] === 0x66 &&
data[k + 6] === 0x64 &&
data[k + 7] === 0x74) {
tfdt || (tfdt = data.subarray(k + 8, payloadEnd));
}
else if (data[k + 5] === 0x72 &&
data[k + 6] === 0x75 &&
data[k + 7] === 0x6e) {
truns.push(data.subarray(k + 8, payloadEnd));
}
}
k = boxEnd;
}
trafs.push({
moofOffset: data.byteOffset + i,
tfdt: tfdt,
tfhd: tfhd,
truns: truns,
});
}
j = childEndbox;
}
}
i = endbox;
}
return trafs;
}
function getSampleData(data, initData, chunkMeta, logger, includeSampleDetails) {
return parseSampleData(data, initData, logger);
}
function parseSamplesAndTiming(timeOffset, track, initData, logger, includeSampleDetails) {
var samples = [];
var data = track.samples;
var tracks = parseSampleData(data, initData, logger, includeSampleDetails, {
isHEVCFlavor: isHEVC(track.codec),
samples: samples,
timeOffset: timeOffset,
timescale: track.timescale,
trackId: track.id,
});
return {
samples: samples,
sampleData: {
includeSampleDetails: includeSampleDetails,
tracks: tracks,
},
};
}
function parseSampleData(data, initData, logger, includeSampleDetails, seiContext) {
var _a, _b;
var tracks = {};
var hasTrackDuration = false;
var trafs = findMoofTrafs(data);
var eof = data.byteLength;
for (var i = 0; i < trafs.length; i++) {
var _c = trafs[i], moofOffset = _c.moofOffset, tfdt = _c.tfdt, tfhd = _c.tfhd, truns = _c.truns;
var id = readUint32(tfhd, 4);
var track = initData[id];
if (!track) {
continue;
}
var trackTimes = (tracks[id] || (tracks[id] = {
start: NaN,
duration: 0,
sampleCount: 0,
trun: [],
timescale: track.timescale,
type: track.type,
}));
var baseTime = void 0;
if (tfdt) {
var version = tfdt[0];
baseTime = readUint32(tfdt, 4);
if (version === 1) {
if (baseTime === UINT32_MAX) {
logger.warn("[mp4-demuxer]: Ignoring assumed invalid signed 64-bit track fragment decode time");
}
else {
baseTime *= UINT32_MAX + 1;
baseTime += readUint32(tfdt, 8);
}
}
if (Number.isFinite(baseTime) &&
(!Number.isFinite(trackTimes.start) || baseTime < trackTimes.start)) {
trackTimes.start = baseTime;
}
if (seiContext && Number.isFinite(baseTime)) {
seiContext.timeOffset = baseTime / seiContext.timescale;
}
}
var scanSei = (seiContext === null || seiContext === void 0 ? void 0 : seiContext.trackId) === id && track.type === "video";
var trackDefault = track.default;
var tfhdFlags = readUint32(tfhd, 0) & 0xffffff;
var defaultSampleDuration = (trackDefault === null || trackDefault === void 0 ? void 0 : trackDefault.duration) || 0;
var defaultSampleSize = (trackDefault === null || trackDefault === void 0 ? void 0 : trackDefault.sampleSize) || 0;
var tfhdOptOffset = 8;
if (tfhdFlags & 0x000001) {
tfhdOptOffset += 8;
}
if (tfhdFlags & 0x000002) {
tfhdOptOffset += 4;
}
if (tfhdFlags & 0x000008) {
defaultSampleDuration = readUint32(tfhd, tfhdOptOffset);
tfhd.byteOffset - data.byteOffset + tfhdOptOffset;
tfhdOptOffset += 4;
}
if (tfhdFlags & 0x000010) {
defaultSampleSize = readUint32(tfhd, tfhdOptOffset);
}
var baseDataOffset = 0;
var baseDataOffsetPresent = (tfhdFlags & 0x000001) !== 0;
var defaultBaseIsMoof = !baseDataOffsetPresent && (tfhdFlags & 0x020000) !== 0;
if (baseDataOffsetPresent) {
baseDataOffset = readUint32(tfhd, 8);
baseDataOffset *= Math.pow(2, 32);
baseDataOffset += readUint32(tfhd, 12);
}
else if (defaultBaseIsMoof) {
baseDataOffset = moofOffset;
}
var sampleDTS = baseTime || 0;
var rawDuration = 0;
var sampleDuration = defaultSampleDuration;
for (var j = 0; j < truns.length; j++) {
var trun = truns[j];
var sampleCount = readUint32(trun, 4);
var sampleIndex = trackTimes.sampleCount;
trackTimes.sampleCount += sampleCount;
var dataOffsetPresent = trun[3] & 0x01;
var dataOffset = 0;
var firstSampleFlagsPresent = trun[3] & 0x04;
var sampleDurationPresent = trun[2] & 0x01;
var sampleSizePresent = trun[2] & 0x02;
var sampleFlagsPresent = trun[2] & 0x04;
var sampleCompositionTimeOffsetPresent = trun[2] & 0x08;
var offset = 8;
if (dataOffsetPresent) {
dataOffset = readSint32(trun, offset);
offset += 4;
}
if (firstSampleFlagsPresent) {
var isNonSyncSample = trun[offset + 1] & 0x01;
if (!isNonSyncSample && trackTimes.keyFrameIndex === undefined) {
trackTimes.keyFrameIndex = sampleIndex;
}
offset += 4;
}
var sampleOffset = baseDataOffset + dataOffset;
if (trun[1] === 0 &&
trun[2] === 0x06 &&
trun[3] === 0x01) {
var runStartDTS = sampleDTS;
var runStartOffset = sampleOffset;
var trunSamplesOffset = offset;
var firstSyncSample = -1;
var firstSyncSampleEnd = 0;
var fittingSampleCount = 0;
var seiTimeOffset = (_a = seiContext === null || seiContext === void 0 ? void 0 : seiContext.timeOffset) !== null && _a !== void 0 ? _a : 0;
var seiSampleDuration = defaultSampleDuration / ((_b = seiContext === null || seiContext === void 0 ? void 0 : seiContext.timescale) !== null && _b !== void 0 ? _b : 1);
var hevcSei = (seiContext === null || seiContext === void 0 ? void 0 : seiContext.isHEVCFlavor) === true;
var seiHeaderSize = hevcSei ? 2 : 1;
for (var ix = 0; ix < sampleCount; ix++) {
var size_1 = trun[offset] === 0
? (trun[offset + 1] << 16) |
(trun[offset + 2] << 8) |
trun[offset + 3]
: readUint32(trun, offset);
var isFirstSyncSample = firstSyncSample === -1 &&
trackTimes.keyFrameIndex === undefined &&
(trun[offset + 5] & 0x01) === 0;
offset += 8;
var sampleEnd = sampleOffset + size_1;
if (scanSei) {
if (size_1 > 0) {
var naluOffset = sampleOffset;
do {
var naluSize = data[naluOffset] === 0
? (data[naluOffset + 1] << 16) |
(data[naluOffset + 2] << 8) |
data[naluOffset + 3]
: readUint32(data, naluOffset);
naluOffset += 4;
var naluHeader = data[naluOffset];
var naluType = hevcSei
? (naluHeader >> 1) & 0x3f
: naluHeader & 0x1f;
var isSei = hevcSei
? naluType === 39 || naluType === 40
: naluType === 6;
if (isSei) {
parseSEIMessageFromNALu(data.subarray(naluOffset, naluOffset + naluSize), seiHeaderSize, seiTimeOffset, seiContext.samples);
}
naluOffset += naluSize;
} while (naluOffset < sampleEnd);
}
seiTimeOffset += seiSampleDuration;
}
sampleOffset = sampleEnd;
if (isFirstSyncSample) {
firstSyncSample = ix;
firstSyncSampleEnd = sampleOffset;
}
}
if (sampleOffset <= eof) {
fittingSampleCount = sampleCount;
}
else {
var fittingOffset = runStartOffset;
var fittingTrunOffset = trunSamplesOffset;
for (var ix = 0; ix < sampleCount; ix++) {
var size_2 = trun[fittingTrunOffset] === 0
? (trun[fittingTrunOffset + 1] << 16) |
(trun[fittingTrunOffset + 2] << 8) |
trun[fittingTrunOffset + 3]
: readUint32(trun, fittingTrunOffset);
fittingOffset += size_2;
if (fittingOffset > eof) {
break;
}
fittingSampleCount = ix + 1;
fittingTrunOffset += 8;
}
}
if (scanSei) {
seiContext.timeOffset = seiTimeOffset;
}
if (firstSyncSample !== -1 &&
firstSyncSampleEnd <= eof &&
trackTimes.keyFrameIndex === undefined) {
trackTimes.keyFrameIndex = firstSyncSample;
trackTimes.keyFrameStart =
runStartDTS + firstSyncSample * defaultSampleDuration;
}
if (fittingSampleCount) {
if (!Number.isFinite(trackTimes.ptsMin) ||
runStartDTS < trackTimes.ptsMin) {
trackTimes.ptsMin = runStartDTS;
}
var lastSampleEnd = runStartDTS + fittingSampleCount * defaultSampleDuration;
if (!Number.isFinite(trackTimes.ptsMax) ||
lastSampleEnd > trackTimes.ptsMax) {
trackTimes.ptsMax = lastSampleEnd;
}
}
var runDuration = defaultSampleDuration * sampleCount;
sampleDTS = runStartDTS + runDuration;
rawDuration += runDuration;
continue;
}
var samples = void 0;
var fragRun = void 0;
var size = void 0;
for (var ix = 0; ix < sampleCount; ix++) {
var thisSampleDurationOffset = void 0;
if (sampleDurationPresent) {
sampleDuration = readUint32(trun, offset);
offset += 4;
}
else {
sampleDuration = defaultSampleDuration;
}
if (sampleSizePresent) {
size = readUint32(trun, offset);
offset += 4;
}
else {
size = defaultSampleSize;
}
var flags = void 0;
var isNonSyncSample = void 0;
if (sampleFlagsPresent) {
isNonSyncSample = trun[offset + 1] & 0x01 ? 1 : 0;
offset += 4;
}
var cts = 0;
if (sampleCompositionTimeOffsetPresent) {
var version = trun[0];
cts =
version === 0 ? readUint32(trun, offset) : readSint32(trun, offset);
offset += 4;
}
if (scanSei) {
var naluOffset = sampleOffset;
var naluTotalSize = 0;
while (naluTotalSize < size) {
var naluSize = readUint32(data, naluOffset);
naluOffset += 4;
if (isSEIMessage(seiContext.isHEVCFlavor, data[naluOffset])) {
parseSEIMessageFromNALu(data.subarray(naluOffset, naluOffset + naluSize), seiContext.isHEVCFlavor ? 2 : 1, seiContext.timeOffset + cts / seiContext.timescale, seiContext.samples);
}
naluOffset += naluSize;
naluTotalSize += naluSize + 4;
}
seiContext.timeOffset += sampleDuration / seiContext.timescale;
}
sampleOffset += size;
if (sampleOffset <= eof) {
if (fragRun && thisSampleDurationOffset !== undefined) {
fragRun.lastSampleDurationOffset = thisSampleDurationOffset;
}
if (isNonSyncSample === 0 && trackTimes.keyFrameIndex === undefined) {
trackTimes.keyFrameIndex = ix;
trackTimes.keyFrameStart = sampleDTS;
}
var pts = sampleDTS + cts;
if (!Number.isFinite(trackTimes.ptsMin) || pts < trackTimes.ptsMin) {
trackTimes.ptsMin = pts;
}
if (!Number.isFinite(trackTimes.ptsMax) ||
pts + sampleDuration > trackTimes.ptsMax) {
trackTimes.ptsMax = pts + sampleDuration;
}
if (samples) {
samples[ix] = {
cts: cts,
duration: sampleDuration,
flags: flags,
size: size,
};
}
}
sampleDTS += sampleDuration;
rawDuration += sampleDuration;
}
if (!rawDuration && defaultSampleDuration) {
rawDuration += defaultSampleDuration * sampleCount;
}
}
trackTimes.duration += rawDuration;
if (trackTimes.duration) {
hasTrackDuration = true;
}
}
if (!hasTrackDuration) {
var sidxMinStart = Infinity;
var sidxMaxEnd_1 = 0;
var sidxs = findBox(data, ['sidx']);
for (var i = 0; i < sidxs.length; i++) {
var sidx = parseSegmentIndex(sidxs[i]);
if (sidx === null || sidx === void 0 ? void 0 : sidx.references) {
sidxMinStart = Math.min(sidxMinStart, sidx.earliestPresentationTime / sidx.timescale);
var subSegmentDuration = sidx.references.reduce(function (dur, ref) { return dur + ref.info.duration || 0; }, 0);
sidxMaxEnd_1 = Math.max(sidxMaxEnd_1, subSegmentDuration + sidx.earliestPresentationTime / sidx.timescale);
}
}
if (sidxMaxEnd_1 && Number.isFinite(sidxMaxEnd_1)) {
Object.keys(tracks).forEach(function (trackId) {
if (!tracks[trackId].duration) {
tracks[trackId].duration =
sidxMaxEnd_1 * tracks[trackId].timescale - tracks[trackId].start;
}
});
}
}
return tracks;
}
function segmentValidRange(data) {
var segmentedRange = {
valid: null,
remainder: null,
};
var moofs = findBox(data, ['moof']);
if (moofs.length < 2) {
segmentedRange.remainder = data;
return segmentedRange;
}
var last = moofs[moofs.length - 1];
segmentedRange.valid = __bolli.ta_slice(data, 0, last.byteOffset - 8);
segmentedRange.remainder = __bolli.ta_slice(data, last.byteOffset - 8);
return segmentedRange;
}
function appendUint8Array(data1, data2) {
var temp = new Uint8Array(data1.length + data2.length);
temp.set(data1);
temp.set(data2, data1.length);
return temp;
}
function parseSamples(timeOffset, track) {
var seiSamples = [];
var videoData = track.samples;
var timescale = track.timescale;
var trackId = track.id;
var isHEVCFlavor = false;
var moofs = findBox(videoData, ['moof']);
moofs.map(function (moof) {
var moofOffset = moof.byteOffset - 8;
var trafs = findBox(moof, ['traf']);
trafs.map(function (traf) {
var baseTime = findBox(traf, ['tfdt']).map(function (tfdt) {
var version = tfdt[0];
var result = readUint32(tfdt, 4);
if (version === 1) {
result *= Math.pow(2, 32);
result += readUint32(tfdt, 8);
}
return result / timescale;
})[0];
if (baseTime !== undefined) {
timeOffset = baseTime;
}
return findBox(traf, ['tfhd']).map(function (tfhd) {
var id = readUint32(tfhd, 4);
var tfhdFlags = readUint32(tfhd, 0) & 0xffffff;
var baseDataOffsetPresent = (tfhdFlags & 0x000001) !== 0;
var baseDataOffset = 0;
var sampleDescriptionIndexPresent = (tfhdFlags & 0x000002) !== 0;
var defaultSampleDurationPresent = (tfhdFlags & 0x000008) !== 0;
var defaultSampleDuration = 0;
var defaultSampleSizePresent = (tfhdFlags & 0x000010) !== 0;
var defaultSampleSize = 0;
var defaultSampleFlagsPresent = (tfhdFlags & 0x000020) !== 0;
var defaultBaseIsMoof = !baseDataOffsetPresent && (tfhdFlags & 0x020000) !== 0;
var tfhdOffset = 8;
if (id === trackId) {
if (baseDataOffsetPresent) {
baseDataOffset = readUint32(tfhd, tfhdOffset);
tfhdOffset += 4;
baseDataOffset *= Math.pow(2, 32);
baseDataOffset += readUint32(tfhd, tfhdOffset);
tfhdOffset += 4;
}
else if (defaultBaseIsMoof) {
baseDataOffset = moofOffset;
}
if (sampleDescriptionIndexPresent) {
tfhdOffset += 4;
}
if (defaultSampleDurationPresent) {
defaultSampleDuration = readUint32(tfhd, tfhdOffset);
tfhdOffset += 4;
}
if (defaultSampleSizePresent) {
defaultSampleSize = readUint32(tfhd, tfhdOffset);
tfhdOffset += 4;
}
if (defaultSampleFlagsPresent) {
tfhdOffset += 4;
}
if (track.type === 'video') {
isHEVCFlavor = isHEVC(track.codec);
}
findBox(traf, ['trun']).map(function (trun) {
var version = trun[0];
var flags = readUint32(trun, 0) & 0xffffff;
var dataOffsetPresent = (flags & 0x000001) !== 0;
var dataOffset = 0;
var firstSampleFlagsPresent = (flags & 0x000004) !== 0;
var sampleDurationPresent = (flags & 0x000100) !== 0;
var sampleDuration = 0;
var sampleSizePresent = (flags & 0x000200) !== 0;
var sampleSize = 0;
var sampleFlagsPresent = (flags & 0x000400) !== 0;
var sampleCompositionOffsetsPresent = (flags & 0x000800) !== 0;
var compositionOffset = 0;
var sampleCount = readUint32(trun, 4);
var trunOffset = 8;
if (dataOffsetPresent) {
dataOffset = readUint32(trun, trunOffset);
trunOffset += 4;
}
if (firstSampleFlagsPresent) {
trunOffset += 4;
}
var sampleOffset = baseDataOffset + dataOffset;
for (var ix = 0; ix < sampleCount; ix++) {
if (sampleDurationPresent) {
sampleDuration = readUint32(trun, trunOffset);
trunOffset += 4;
}
else {
sampleDuration = defaultSampleDuration;
}
if (sampleSizePresent) {
sampleSize = readUint32(trun, trunOffset);
trunOffset += 4;
}
else {
sampleSize = defaultSampleSize;
}
if (sampleFlagsPresent) {
trunOffset += 4;
}
if (sampleCompositionOffsetsPresent) {
if (version === 0) {
compositionOffset = readUint32(trun, trunOffset);
}
else {
compositionOffset = readSint32(trun, trunOffset);
}
trunOffset += 4;
}
if (track.type === "video") {
var naluTotalSize = 0;
while (naluTotalSize < sampleSize) {
var naluSize = readUint32(videoData, sampleOffset);
sampleOffset += 4;
if (isSEIMessage(isHEVCFlavor, videoData[sampleOffset])) {
var data = videoData.subarray(sampleOffset, sampleOffset + naluSize);
parseSEIMessageFromNALu(data, isHEVCFlavor ? 2 : 1, timeOffset + compositionOffset / timescale, seiSamples);
}
sampleOffset += naluSize;
naluTotalSize += naluSize + 4;
}
}
timeOffset += sampleDuration / timescale;
}
});
}
});
});
});
return seiSamples;
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
function isSEIMessage(isHEVCFlavor, naluHeader) {
if (isHEVCFlavor) {
var naluType = (naluHeader >> 1) & 0x3f;
return naluType === 39 || naluType === 40;
}
else {
var naluType = naluHeader & 0x1f;
return naluType === 6;
}
}
function parseSEIMessageFromNALu(unescapedData, headerSize, pts, samples) {
var data = discardEPB(unescapedData);
var seiPtr = 0;
seiPtr += headerSize;
var payloadType = 0;
var payloadSize = 0;
var b = 0;
while (seiPtr < data.length) {
payloadType = 0;
do {
if (seiPtr >= data.length) {
break;
}
b = data[seiPtr++];
payloadType += b;
} while (b === 0xff);
payloadSize = 0;
do {
if (seiPtr >= data.length) {
break;
}
b = data[seiPtr++];
payloadSize += b;
} while (b === 0xff);
var leftOver = data.length - seiPtr;
var payPtr = seiPtr;
if (payloadSize < leftOver) {
seiPtr += payloadSize;
}
else if (payloadSize > leftOver) {
logger.error("Malformed SEI payload. ".concat(payloadSize, " is too small, only ").concat(leftOver, " bytes left to parse."));
break;
}
if (payloadType === 4) {
var countryCode = data[payPtr++];
if (countryCode === 181) {
var providerCode = readUint16(data, payPtr);
payPtr += 2;
if (providerCode === 49) {
var userStructure = readUint32(data, payPtr);
payPtr += 4;
if (userStructure === 0x47413934) {
var userDataType = data[payPtr++];
if (userDataType === 3) {
var firstByte = data[payPtr++];
var totalCCs = 0x1f & firstByte;
var enabled = 0x40 & firstByte;
var totalBytes = enabled ? 2 + totalCCs * 3 : 0;
var byteArray = new Uint8Array(totalBytes);
if (enabled) {
byteArray[0] = firstByte;
for (var i = 1; i < totalBytes; i++) {
byteArray[i] = data[payPtr++];
}
}
samples.push({
type: userDataType,
payloadType: payloadType,
pts: pts,
bytes: byteArray,
});
}
}
}
}
}
else if (payloadType === 5) {
if (payloadSize > 16) {
var uuidStrArray = [];
for (var i = 0; i < 16; i++) {
var b_1 = data[payPtr++].toString(16);
uuidStrArray.push(b_1.length == 1 ? '0' + b_1 : b_1);
if (i === 3 || i === 5 || i === 7 || i === 9) {
uuidStrArray.push('-');
}
}
var length_1 = payloadSize - 16;
var userDataBytes = new Uint8Array(length_1);
for (var i = 0; i < length_1; i++) {
userDataBytes[i] = data[payPtr++];
}
samples.push({
payloadType: payloadType,
pts: pts,
uuid: uuidStrArray.join(''),
userData: decodeUtf8UserData(userDataBytes),
userDataBytes: userDataBytes,
});
}
}
}
}
function discardEPB(data) {
var length = data.byteLength;
var epbPositions;
var position = __bolli.ta_indexOf(data, 0x03, 3);
while (position !== -1) {
if (data[position - 1] === 0 && data[position - 2] === 0) {
(epbPositions || (epbPositions = [])).push(position);
}
position = __bolli.ta_indexOf(data, 0x03, position + 1);
}
if (!epbPositions) {
return data;
}
var newLength = length - epbPositions.length;
var newData = new Uint8Array(newLength);
var epbIndex = 0;
var sourceIndex = 0;
for (var i = 0; i < newLength; sourceIndex++, i++) {
if (sourceIndex === epbPositions[epbIndex]) {
sourceIndex++;
epbIndex++;
}
newData[i] = data[sourceIndex];
}
return newData;
}
function parseEmsg(data) {
var version = data[0];
var schemeIdUri = '';
var value = '';
var timeScale = 0;
var presentationTimeDelta = 0;
var presentationTime;
var eventDuration = 0;
var id = 0;
var offset = 4;
if (version === 0) {
var scheme = readCString(data, offset);
var schemeValue = scheme !== null ? readCString(data, offset + scheme.length) : null;
if (scheme !== null && schemeValue !== null) {
schemeIdUri = scheme;
value = schemeValue;
offset += scheme.length + schemeValue.length;
timeScale = readUint32(data, offset);
offset += 4;
presentationTimeDelta = readUint32(data, offset);
offset += 4;
eventDuration = readUint32(data, offset);
offset += 4;
id = readUint32(data, offset);
offset += 4;
}
else {
logger.warn("Unterminated ".concat(scheme === null ? 'scheme_id_uri' : 'value', " in parsing emsg box: version 0 box ends inside a string, dropping all of its fields"));
offset = data.length;
}
}
else if (version === 1) {
timeScale = readUint32(data, offset);
offset += 4;
var leftPresentationTime = readUint32(data, offset);
offset += 4;
var rightPresentationTime = readUint32(data, offset);
offset += 4;
presentationTime = Math.pow(2, 32) * leftPresentationTime + rightPresentationTime;
if (!Number.isSafeInteger(presentationTime)) {
presentationTime = Number.MAX_SAFE_INTEGER;
logger.warn('Presentation time exceeds safe integer limit and wrapped to max safe integer in parsing emsg box');
}
eventDuration = readUint32(data, offset);
offset += 4;
id = readUint32(data, offset);
offset += 4;
var scheme = readCString(data, offset);
var schemeValue = scheme !== null ? readCString(data, offset + scheme.length) : null;
if (scheme !== null) {
schemeIdUri = scheme;
offset += scheme.length;
}
if (schemeValue !== null) {
value = schemeValue;
offset += schemeValue.length;
}
else {
logger.warn("Unterminated ".concat(scheme === null ? 'scheme_id_uri' : 'value', " in parsing emsg box: version 1 box ends inside a string, dropping its ").concat(scheme === null ? 'strings and payload' : 'value and payload'));
offset = data.length;
}
}
var payload = data.subarray(offset, data.byteLength);
return {
schemeIdUri: schemeIdUri,
value: value,
timeScale: timeScale,
presentationTime: presentationTime,
presentationTimeDelta: presentationTimeDelta,
eventDuration: eventDuration,
id: id,
payload: payload,
};
}
function dummyTrack(type, inputTimeScale) {
if (type === void 0) { type = ''; }
if (inputTimeScale === void 0) { inputTimeScale = 90000; }
return {
type: type,
id: -1,
pid: -1,
inputTimeScale: inputTimeScale,
sequenceNumber: -1,
samples: [],
dropped: 0,
};
}
var MP3Demuxer = undefined;
function Decrypter() {}
Decrypter.prototype.destroy = Decrypter.prototype.reset = function () {};
Decrypter.prototype.decrypt = function () { return Promise.reject(new Error('encrypted streams are left out')); };
var emsgSchemePattern = /\/emsg[-/]ID3/i;
var MP4Demuxer = (function () {
function MP4Demuxer(observer, config, typeSupported, logger$1) {
if (logger$1 === void 0) { logger$1 = logger; }
this.remainderData = null;
this.timeOffset = 0;
this.config = config;
this.logger = logger$1;
}
MP4Demuxer.prototype.resetTimeStamp = function () { };
MP4Demuxer.prototype.resetInitSegment = function (initSegment, audioCodec, videoCodec, trackDuration) {
var videoTrack = (this.videoTrack = dummyTrack('video', 1));
var audioTrack = (this.audioTrack = dummyTrack('audio', 1));
var captionTrack = (this.txtTrack = dummyTrack('text', 1));
this.id3Track = dummyTrack('id3', 1);
this.initData = undefined;
this.timeOffset = 0;
if (!(initSegment === null || initSegment === void 0 ? void 0 : initSegment.byteLength)) {
return;
}
var initData = (this.initData = parseInitSegment(initSegment));
if (initData.video) {
var _a = initData.video, id = _a.id, timescale = _a.timescale, codec = _a.codec, supplemental = _a.supplemental;
videoTrack.id = id;
videoTrack.timescale = captionTrack.timescale = timescale;
videoTrack.codec = codec;
videoTrack.supplemental = supplemental;
}
if (initData.audio) {
var _b = initData.audio, id = _b.id, timescale = _b.timescale, codec = _b.codec;
audioTrack.id = id;
audioTrack.timescale = timescale;
audioTrack.codec = codec;
}
captionTrack.id = RemuxerTrackIdConfig.text;
videoTrack.sampleDuration = 0;
videoTrack.duration = audioTrack.duration = trackDuration;
};
MP4Demuxer.prototype.resetContiguity = function () {
this.remainderData = null;
};
MP4Demuxer.probe = function (data) {
return hasBoxData(data, 'moof');
};
MP4Demuxer.prototype.demux = function (data, timeOffset, chunkMeta) {
this.timeOffset = timeOffset;
var videoSamples = data;
var videoTrack = this.videoTrack;
var textTrack = this.txtTrack;
if (this.config.progressive) {
if (this.remainderData) {
videoSamples = appendUint8Array(this.remainderData, data);
}
var segmentedData = segmentValidRange(videoSamples);
this.remainderData = segmentedData.remainder;
videoTrack.samples = segmentedData.valid || new Uint8Array();
}
else {
videoTrack.samples = videoSamples;
}
var id3Track = this.extractID3Track(videoTrack, timeOffset);
var sampleData = this.parseFragment(videoTrack, textTrack, timeOffset, chunkMeta);
return {
videoTrack: videoTrack,
audioTrack: this.audioTrack,
id3Track: id3Track,
textTrack: this.txtTrack,
initData: this.initData,
sampleData: sampleData,
};
};
MP4Demuxer.prototype.flush = function (_timeOffset, chunkMeta) {
var timeOffset = this.timeOffset;
var videoTrack = this.videoTrack;
var textTrack = this.txtTrack;
videoTrack.samples = this.remainderData || new Uint8Array();
this.remainderData = null;
var id3Track = this.extractID3Track(videoTrack, this.timeOffset);
var sampleData = this.parseFragment(videoTrack, textTrack, timeOffset, chunkMeta);
return {
videoTrack: videoTrack,
audioTrack: dummyTrack(),
id3Track: id3Track,
textTrack: dummyTrack(),
initData: this.initData,
sampleData: sampleData,
};
};
MP4Demuxer.prototype.parseFragment = function (videoTrack, textTrack, timeOffset, chunkMeta) {
var initData = this.initData;
if (initData && chunkMeta) {
var _a = parseSamplesAndTiming(timeOffset, videoTrack, initData, this.logger, false), samples = _a.samples, sampleData = _a.sampleData;
textTrack.samples = samples;
return sampleData;
}
textTrack.samples = parseSamples(timeOffset, videoTrack);
};
MP4Demuxer.prototype.extractID3Track = function (videoTrack, timeOffset) {
var _this = this;
var id3Track = this.id3Track;
if (videoTrack.samples.length) {
var emsgs = findBox(videoTrack.samples, ['emsg']);
if (emsgs) {
emsgs.forEach(function (data) {
var emsgInfo = parseEmsg(data);
if (emsgSchemePattern.test(emsgInfo.schemeIdUri)) {
var pts = getEmsgStartTime(emsgInfo, timeOffset);
var duration = emsgInfo.eventDuration === 0xffffffff
? Number.POSITIVE_INFINITY
: emsgInfo.eventDuration / emsgInfo.timeScale;
if (duration <= 0.001) {
duration = Number.POSITIVE_INFINITY;
}
var payload = emsgInfo.payload;
id3Track.samples.push({
data: payload,
len: payload.byteLength,
dts: pts,
pts: pts,
type: MetadataSchema.emsg,
duration: duration,
});
}
else if (_this.config.enableEmsgKLVMetadata) {
var klvSchemaUri = _this.config.emsgKLVSchemaUri || MetadataSchema.misbklv;
if (__bolli.startsWith(emsgInfo.schemeIdUri, klvSchemaUri)) {
var pts = getEmsgStartTime(emsgInfo, timeOffset);
id3Track.samples.push({
data: emsgInfo.payload,
len: emsgInfo.payload.byteLength,
dts: pts,
pts: pts,
type: MetadataSchema.misbklv,
duration: Number.POSITIVE_INFINITY,
});
}
}
});
}
}
return id3Track;
};
MP4Demuxer.prototype.demuxSampleAes = function (data, keyData, timeOffset) {
return Promise.reject(new Error('The MP4 demuxer does not support SAMPLE-AES decryption'));
};
MP4Demuxer.prototype.destroy = function () {
this.config = null;
this.remainderData = null;
this.videoTrack =
this.audioTrack =
this.id3Track =
this.txtTrack =
undefined;
this.initData = undefined;
};
return MP4Demuxer;
}());
function getEmsgStartTime(emsgInfo, timeOffset) {
return Number.isFinite(emsgInfo.presentationTime)
? emsgInfo.presentationTime / emsgInfo.timeScale
: timeOffset +
emsgInfo.presentationTimeDelta / emsgInfo.timeScale;
}
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
function getAudioConfig(observer, data, offset, manifestCodec) {
var adtsSamplingRates = [
96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025,
8000, 7350,
];
var byte2 = data[offset + 2];
var adtsSamplingIndex = (byte2 >> 2) & 0xf;
if (adtsSamplingIndex > 12) {
var error = new Error("invalid ADTS sampling index:".concat(adtsSamplingIndex));
observer.emit(Events.ERROR, Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.FRAG_PARSING_ERROR,
fatal: true,
error: error,
reason: error.message,
});
return;
}
var adtsObjectType = ((byte2 >> 6) & 0x3) + 1;
var channelCount = ((data[offset + 3] >> 6) & 0x3) | ((byte2 & 1) << 2);
var samplerate = adtsSamplingRates[adtsSamplingIndex];
var aacSampleIndex = adtsSamplingIndex;
if (adtsObjectType === 5 || adtsObjectType === 29) {
aacSampleIndex -= 3;
}
var config;
var samplingIndexHigh = (aacSampleIndex & 0x0e) >> 1;
var samplingIndexLowAndChannels = ((aacSampleIndex & 0x01) << 7) | (channelCount << 3);
var adtsOverride = 0;
if (adtsObjectType === 1 && adtsSamplingIndex >= 6) {
adtsOverride = 5;
var adtsExtensionSamplingIndex = adtsSamplingIndex - 3;
config = [
(adtsOverride << 3) | samplingIndexHigh,
samplingIndexLowAndChannels | ((adtsExtensionSamplingIndex & 0x0e) >> 1),
((adtsExtensionSamplingIndex & 0x01) << 7) | (2 << 2),
0,
];
}
else {
config = [
(adtsObjectType << 3) | samplingIndexHigh,
samplingIndexLowAndChannels,
];
}
var codec = 'mp4a.40.' + (adtsOverride || adtsObjectType);
return {
config: config,
samplerate: samplerate,
channelCount: channelCount,
codec: codec,
parsedCodec: codec,
manifestCodec: manifestCodec,
};
}
function isHeaderPattern$1(data, offset) {
return data[offset] === 0xff && (data[offset + 1] & 0xf6) === 0xf0;
}
function getHeaderLength(data, offset) {
return data[offset + 1] & 0x01 ? 7 : 9;
}
function getFullFrameLength(data, offset) {
return (((data[offset + 3] & 0x03) << 11) |
(data[offset + 4] << 3) |
((data[offset + 5] & 0xe0) >>> 5));
}
function isHeader$1(data, offset) {
return offset + 1 < data.length && isHeaderPattern$1(data, offset);
}
function initTrackConfig(track, observer, data, offset, audioCodec) {
if (!track.samplerate) {
var config = getAudioConfig(observer, data, offset, audioCodec);
if (!config) {
return;
}
__bolli.assign(track, config);
}
}
function getFrameDuration(samplerate) {
return (1024 * 90000) / samplerate;
}
function parseFrameHeader(data, offset) {
var headerLength = getHeaderLength(data, offset);
if (offset + headerLength <= data.length) {
var frameLength = getFullFrameLength(data, offset) - headerLength;
if (frameLength > 0) {
return { headerLength: headerLength, frameLength: frameLength };
}
}
}
function appendFrame$1(track, data, offset, pts, frameIndex) {
var frameDuration = getFrameDuration(track.samplerate);
var stamp = pts + frameIndex * frameDuration;
var header = parseFrameHeader(data, offset);
var unit;
if (header) {
var frameLength = header.frameLength, headerLength = header.headerLength;
var length_1 = headerLength + frameLength;
var missing = Math.max(0, offset + length_1 - data.length);
if (missing) {
unit = new Uint8Array(length_1 - headerLength);
unit.set(data.subarray(offset + headerLength, data.length), 0);
}
else {
unit = data.subarray(offset + headerLength, offset + length_1);
}
var sample_1 = {
unit: unit,
pts: stamp,
};
if (!missing) {
track.samples.push(sample_1);
}
return { sample: sample_1, length: length_1, missing: missing };
}
var length = data.length - offset;
unit = new Uint8Array(length);
unit.set(data.subarray(offset, data.length), 0);
var sample = {
unit: unit,
pts: stamp,
};
return { sample: sample, length: length, missing: -1 };
}
var ua = getNavigator('userAgent');
getNavigator('vendor');
var chromeVersion;
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
var BitratesMap = [
32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 32, 48, 56,
64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 32, 40, 48, 56, 64, 80,
96, 112, 128, 160, 192, 224, 256, 320, 32, 48, 56, 64, 80, 96, 112, 128, 144,
160, 176, 192, 224, 256, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144,
160,
];
var SamplingRateMap = [
44100, 48000, 32000, 22050, 24000, 16000, 11025, 12000, 8000,
];
var SamplesCoefficients = [
[
0,
72,
144,
12,
],
[
0,
0,
0,
0,
],
[
0,
72,
144,
12,
],
[
0,
144,
144,
12,
],
];
var BytesInSlot = [
0,
1,
1,
4,
];
function appendFrame(track, data, offset, pts, frameIndex) {
if (offset + 24 > data.length) {
return;
}
var header = parseHeader(data, offset);
if (header && offset + header.frameLength <= data.length) {
var frameDuration = (header.samplesPerFrame * 90000) / header.sampleRate;
var stamp = pts + frameIndex * frameDuration;
var sample = {
unit: data.subarray(offset, offset + header.frameLength),
pts: stamp,
dts: stamp,
};
track.config = [];
track.channelCount = header.channelCount;
track.samplerate = header.sampleRate;
track.samples.push(sample);
return { sample: sample, length: header.frameLength, missing: 0 };
}
}
function parseHeader(data, offset) {
var mpegVersion = (data[offset + 1] >> 3) & 3;
var mpegLayer = (data[offset + 1] >> 1) & 3;
var bitRateIndex = (data[offset + 2] >> 4) & 15;
var sampleRateIndex = (data[offset + 2] >> 2) & 3;
if (mpegVersion !== 1 &&
bitRateIndex !== 0 &&
bitRateIndex !== 15 &&
sampleRateIndex !== 3) {
var paddingBit = (data[offset + 2] >> 1) & 1;
var channelMode = data[offset + 3] >> 6;
var columnInBitrates = mpegVersion === 3 ? 3 - mpegLayer : mpegLayer === 3 ? 3 : 4;
var bitRate = BitratesMap[columnInBitrates * 14 + bitRateIndex - 1] * 1000;
var columnInSampleRates = mpegVersion === 3 ? 0 : mpegVersion === 2 ? 1 : 2;
var sampleRate = SamplingRateMap[columnInSampleRates * 3 + sampleRateIndex];
var channelCount = channelMode === 3 ? 1 : 2;
var sampleCoefficient = SamplesCoefficients[mpegVersion][mpegLayer];
var bytesInSlot = BytesInSlot[mpegLayer];
var samplesPerFrame = sampleCoefficient * 8 * bytesInSlot;
var frameLength = Math.floor((sampleCoefficient * bitRate) / sampleRate + paddingBit) *
bytesInSlot;
var chromeVersion = userAgentChromeVersion();
var needChromeFix = !!chromeVersion && chromeVersion <= 87;
if (needChromeFix &&
mpegLayer === 2 &&
bitRate >= 224000 &&
channelMode === 0) {
data[offset + 3] = data[offset + 3] | 0x80;
}
return { sampleRate: sampleRate, channelCount: channelCount, frameLength: frameLength, samplesPerFrame: samplesPerFrame };
}
}
function isHeaderPattern(data, offset) {
return (data[offset] === 0xff &&
(data[offset + 1] & 0xe0) === 0xe0 &&
(data[offset + 1] & 0x06) !== 0x00);
}
function isHeader(data, offset) {
return offset + 1 < data.length && isHeaderPattern(data, offset);
}
function SampleAesDecrypter() { throw new Error('encrypted streams are left out'); }
var ANNEX_B_START_CODE_MARKER = 0x01;
var MIN_START_CODE_ZERO_RUN = 2;
var MAX_START_CODE_ZERO_RUN = 3;
var NAL_UNIT_TYPE_PENDING = -1;
var BaseVideoParser = (function () {
function BaseVideoParser() {
this.VideoSample = null;
}
BaseVideoParser.prototype.createVideoSample = function (key, pts, dts) {
return {
key: key,
frame: false,
pts: pts,
dts: dts,
units: [],
length: 0,
};
};
BaseVideoParser.prototype.getLastNalUnit = function (samples) {
var VideoSample = this.VideoSample;
var lastUnit;
if (!VideoSample || VideoSample.units.length === 0) {
VideoSample = samples[samples.length - 1];
}
if (VideoSample === null || VideoSample === void 0 ? void 0 : VideoSample.units) {
var units = VideoSample.units;
lastUnit = units[units.length - 1];
}
return lastUnit;
};
BaseVideoParser.prototype.pushAccessUnit = function (VideoSample, videoTrack) {
if (VideoSample.units.length && VideoSample.frame) {
if (VideoSample.pts === undefined) {
var samples = videoTrack.samples;
var nbSamples = samples.length;
if (nbSamples) {
var lastSample = samples[nbSamples - 1];
VideoSample.pts = lastSample.pts;
VideoSample.dts = lastSample.dts;
}
else {
videoTrack.dropped++;
return;
}
}
videoTrack.samples.push(VideoSample);
}
};
BaseVideoParser.prototype.parseNALu = function (track, array, _endOfSegment) {
var len = array.byteLength;
if (len === 0) {
return [];
}
var previousState = track.naluState || 0;
var previousZeroRun = previousState === NAL_UNIT_TYPE_PENDING ? 0 : previousState;
var units = [];
var nextState = 0;
var searchFrom = 0;
var unitStart = -1;
var unitType = 0;
if (previousState === NAL_UNIT_TYPE_PENDING) {
unitStart = 0;
unitType = this.getNALuType(array, 0);
searchFrom = 1;
}
while (searchFrom < len) {
var markerIndex = __bolli.ta_indexOf(array, ANNEX_B_START_CODE_MARKER, searchFrom);
if (markerIndex === -1) {
break;
}
searchFrom = markerIndex + 1;
var nalEnd = markerIndex;
while (nalEnd > 0 && array[nalEnd - 1] === 0) {
nalEnd--;
}
var zeroRun = markerIndex - nalEnd + (nalEnd === 0 ? previousZeroRun : 0);
if (zeroRun < MIN_START_CODE_ZERO_RUN) {
continue;
}
var startCodeZeros = Math.min(zeroRun, MAX_START_CODE_ZERO_RUN);
var chunkStartCodeZeros = Math.min(markerIndex - nalEnd, startCodeZeros);
var previousUnitTrim = startCodeZeros - chunkStartCodeZeros;
nalEnd = markerIndex - chunkStartCodeZeros;
if (unitStart >= 0) {
units.push({
data: array.subarray(unitStart, nalEnd),
type: unitType,
});
}
else {
var previousUnit = this.getLastNalUnit(track.samples);
if (previousUnit) {
if (nalEnd > 0) {
previousUnit.data = appendUint8Array(previousUnit.data, array.subarray(0, nalEnd));
}
else if (previousUnitTrim > 0) {
previousUnit.data = previousUnit.data.subarray(0, previousUnit.data.byteLength - previousUnitTrim);
}
previousUnit.state = 0;
}
}
if (searchFrom < len) {
unitStart = searchFrom;
unitType = this.getNALuType(array, searchFrom);
}
else {
nextState = NAL_UNIT_TYPE_PENDING;
unitStart = -1;
break;
}
}
if (nextState !== NAL_UNIT_TYPE_PENDING) {
var trailingZeroStart = len;
while (trailingZeroStart > 0 && array[trailingZeroStart - 1] === 0) {
trailingZeroStart--;
}
nextState =
len -
trailingZeroStart +
(trailingZeroStart === 0 ? previousZeroRun : 0);
}
if (unitStart >= 0) {
units.push({
data: array.subarray(unitStart),
type: unitType,
state: nextState,
});
}
else if (units.length === 0 && nextState !== NAL_UNIT_TYPE_PENDING) {
var previousUnit = this.getLastNalUnit(track.samples);
if (previousUnit) {
previousUnit.data = appendUint8Array(previousUnit.data, array);
previousUnit.state = nextState;
}
}
track.naluState = nextState;
return units;
};
return BaseVideoParser;
}());
var ExpGolomb = (function () {
function ExpGolomb(data) {
this.data = data;
this.bytesAvailable = data.byteLength;
this.word = 0;
this.bitsAvailable = 0;
}
ExpGolomb.prototype.loadWord = function () {
var data = this.data;
var bytesAvailable = this.bytesAvailable;
var position = data.byteLength - bytesAvailable;
var workingBytes = new Uint8Array(4);
var availableBytes = Math.min(4, bytesAvailable);
if (availableBytes === 0) {
throw new Error('no bytes available');
}
workingBytes.set(data.subarray(position, position + availableBytes));
this.word = new DataView(workingBytes.buffer).getUint32(0);
this.bitsAvailable = availableBytes * 8;
this.bytesAvailable -= availableBytes;
};
ExpGolomb.prototype.skipBits = function (count) {
var skipBytes;
count = Math.min(count, this.bytesAvailable * 8 + this.bitsAvailable);
if (this.bitsAvailable > count) {
this.word <<= count;
this.bitsAvailable -= count;
}
else {
count -= this.bitsAvailable;
skipBytes = count >> 3;
count -= skipBytes << 3;
this.bytesAvailable -= skipBytes;
this.loadWord();
this.word <<= count;
this.bitsAvailable -= count;
}
};
ExpGolomb.prototype.readBits = function (size) {
var bits = Math.min(this.bitsAvailable, size);
var valu = this.word >>> (32 - bits);
if (size > 32) {
logger.error('Cannot read more than 32 bits at a time');
}
this.bitsAvailable -= bits;
if (this.bitsAvailable > 0) {
this.word <<= bits;
}
else if (this.bytesAvailable > 0) {
this.loadWord();
}
else {
throw new Error('no bits available');
}
bits = size - bits;
if (bits > 0 && this.bitsAvailable) {
return (valu << bits) | this.readBits(bits);
}
else {
return valu;
}
};
ExpGolomb.prototype.skipLZ = function () {
var leadingZeroCount;
for (leadingZeroCount = 0; leadingZeroCount < this.bitsAvailable; ++leadingZeroCount) {
if ((this.word & (0x80000000 >>> leadingZeroCount)) !== 0) {
this.word <<= leadingZeroCount;
this.bitsAvailable -= leadingZeroCount;
return leadingZeroCount;
}
}
this.loadWord();
return leadingZeroCount + this.skipLZ();
};
ExpGolomb.prototype.skipUEG = function () {
this.skipBits(1 + this.skipLZ());
};
ExpGolomb.prototype.skipEG = function () {
this.skipBits(1 + this.skipLZ());
};
ExpGolomb.prototype.readUEG = function () {
var clz = this.skipLZ();
return this.readBits(clz + 1) - 1;
};
ExpGolomb.prototype.readEG = function () {
var valu = this.readUEG();
if (0x01 & valu) {
return (1 + valu) >>> 1;
}
else {
return -1 * (valu >>> 1);
}
};
ExpGolomb.prototype.readBoolean = function () {
return this.readBits(1) === 1;
};
ExpGolomb.prototype.readUByte = function () {
return this.readBits(8);
};
return ExpGolomb;
}());
var AvcVideoParser = (function (_super) {
__extends(AvcVideoParser, _super);
function AvcVideoParser() {
return _super !== null && _super.apply(this, arguments) || this;
}
AvcVideoParser.prototype.parsePES = function (track, textTrack, pes, endOfSegment, chunkMeta) {
var _this = this;
var iframesOnly = chunkMeta.iframe;
var units = this.parseNALu(track, pes.data, endOfSegment);
var VideoSample = this.VideoSample;
var push;
var spsfound = false;
pes.data = null;
if (VideoSample && units.length && !track.audFound) {
this.pushAccessUnit(VideoSample, track);
VideoSample = this.VideoSample = this.createVideoSample(false, pes.pts, pes.dts);
}
units.forEach(function (unit) {
var _a, _b;
switch (unit.type) {
case 1: {
if (iframesOnly) {
break;
}
var iskey = false;
push = true;
var data = unit.data;
if (spsfound && data.length > 4) {
var sliceType = _this.readSliceType(data);
if (sliceType === 2 ||
sliceType === 4 ||
sliceType === 7 ||
sliceType === 9) {
iskey = true;
}
}
if (iskey) {
if ((VideoSample === null || VideoSample === void 0 ? void 0 : VideoSample.frame) && !VideoSample.key) {
_this.pushAccessUnit(VideoSample, track);
VideoSample = _this.VideoSample = null;
}
}
if (!VideoSample) {
VideoSample = _this.VideoSample = _this.createVideoSample(true, pes.pts, pes.dts);
}
VideoSample.frame = true;
VideoSample.key = iskey;
break;
}
case 5:
push = true;
if ((VideoSample === null || VideoSample === void 0 ? void 0 : VideoSample.frame) && !VideoSample.key) {
_this.pushAccessUnit(VideoSample, track);
VideoSample = _this.VideoSample = null;
}
if (!VideoSample) {
VideoSample = _this.VideoSample = _this.createVideoSample(true, pes.pts, pes.dts);
}
VideoSample.key = true;
VideoSample.frame = true;
break;
case 6: {
if (iframesOnly) {
break;
}
push = true;
parseSEIMessageFromNALu(unit.data, 1, pes.pts, textTrack.samples);
break;
}
case 7: {
push = true;
spsfound = true;
var sps = unit.data;
var config = _this.readSPS(sps);
if (!track.sps ||
track.width !== config.width ||
track.height !== config.height ||
((_a = track.pixelRatio) === null || _a === void 0 ? void 0 : _a[0]) !== config.pixelRatio[0] ||
((_b = track.pixelRatio) === null || _b === void 0 ? void 0 : _b[1]) !== config.pixelRatio[1]) {
track.width = config.width;
track.height = config.height;
track.pixelRatio = config.pixelRatio;
track.sps = [sps];
var codecarray = sps.subarray(1, 4);
var codecstring = 'avc1.';
for (var i = 0; i < 3; i++) {
var h = codecarray[i].toString(16);
if (h.length < 2) {
h = '0' + h;
}
codecstring += h;
}
track.codec = codecstring;
}
break;
}
case 8:
push = true;
track.pps = [unit.data];
break;
case 9:
push = true;
track.audFound = true;
if (VideoSample === null || VideoSample === void 0 ? void 0 : VideoSample.frame) {
_this.pushAccessUnit(VideoSample, track);
VideoSample = null;
}
if (!VideoSample) {
VideoSample = _this.VideoSample = _this.createVideoSample(false, pes.pts, pes.dts);
}
break;
case 12:
push = true;
break;
default:
push = false;
break;
}
if (VideoSample && push) {
var units_1 = VideoSample.units;
units_1.push(unit);
}
});
if (endOfSegment && VideoSample) {
this.pushAccessUnit(VideoSample, track);
this.VideoSample = null;
}
};
AvcVideoParser.prototype.getNALuType = function (data, offset) {
return data[offset] & 0x1f;
};
AvcVideoParser.prototype.readSliceType = function (data) {
var eg = new ExpGolomb(data);
eg.readUByte();
eg.readUEG();
return eg.readUEG();
};
AvcVideoParser.prototype.skipScalingList = function (count, reader) {
var lastScale = 8;
var nextScale = 8;
var deltaScale;
for (var j = 0; j < count; j++) {
if (nextScale !== 0) {
deltaScale = reader.readEG();
nextScale = (lastScale + deltaScale + 256) % 256;
}
lastScale = nextScale === 0 ? lastScale : nextScale;
}
};
AvcVideoParser.prototype.readSPS = function (sps) {
var eg = new ExpGolomb(sps);
var frameCropLeftOffset = 0;
var frameCropRightOffset = 0;
var frameCropTopOffset = 0;
var frameCropBottomOffset = 0;
var numRefFramesInPicOrderCntCycle;
var scalingListCount;
var i;
var readUByte = eg.readUByte.bind(eg);
var readBits = eg.readBits.bind(eg);
var readUEG = eg.readUEG.bind(eg);
var readBoolean = eg.readBoolean.bind(eg);
var skipBits = eg.skipBits.bind(eg);
var skipEG = eg.skipEG.bind(eg);
var skipUEG = eg.skipUEG.bind(eg);
var skipScalingList = this.skipScalingList.bind(this);
readUByte();
var profileIdc = readUByte();
readBits(5);
skipBits(3);
readUByte();
skipUEG();
if (profileIdc === 100 ||
profileIdc === 110 ||
profileIdc === 122 ||
profileIdc === 244 ||
profileIdc === 44 ||
profileIdc === 83 ||
profileIdc === 86 ||
profileIdc === 118 ||
profileIdc === 128) {
var chromaFormatIdc = readUEG();
if (chromaFormatIdc === 3) {
skipBits(1);
}
skipUEG();
skipUEG();
skipBits(1);
if (readBoolean()) {
scalingListCount = chromaFormatIdc !== 3 ? 8 : 12;
for (i = 0; i < scalingListCount; i++) {
if (readBoolean()) {
if (i < 6) {
skipScalingList(16, eg);
}
else {
skipScalingList(64, eg);
}
}
}
}
}
skipUEG();
var picOrderCntType = readUEG();
if (picOrderCntType === 0) {
readUEG();
}
else if (picOrderCntType === 1) {
skipBits(1);
skipEG();
skipEG();
numRefFramesInPicOrderCntCycle = readUEG();
for (i = 0; i < numRefFramesInPicOrderCntCycle; i++) {
skipEG();
}
}
skipUEG();
skipBits(1);
var picWidthInMbsMinus1 = readUEG();
var picHeightInMapUnitsMinus1 = readUEG();
var frameMbsOnlyFlag = readBits(1);
if (frameMbsOnlyFlag === 0) {
skipBits(1);
}
skipBits(1);
if (readBoolean()) {
frameCropLeftOffset = readUEG();
frameCropRightOffset = readUEG();
frameCropTopOffset = readUEG();
frameCropBottomOffset = readUEG();
}
var pixelRatio = [1, 1];
if (readBoolean()) {
if (readBoolean()) {
var aspectRatioIdc = readUByte();
switch (aspectRatioIdc) {
case 1:
pixelRatio = [1, 1];
break;
case 2:
pixelRatio = [12, 11];
break;
case 3:
pixelRatio = [10, 11];
break;
case 4:
pixelRatio = [16, 11];
break;
case 5:
pixelRatio = [40, 33];
break;
case 6:
pixelRatio = [24, 11];
break;
case 7:
pixelRatio = [20, 11];
break;
case 8:
pixelRatio = [32, 11];
break;
case 9:
pixelRatio = [80, 33];
break;
case 10:
pixelRatio = [18, 11];
break;
case 11:
pixelRatio = [15, 11];
break;
case 12:
pixelRatio = [64, 33];
break;
case 13:
pixelRatio = [160, 99];
break;
case 14:
pixelRatio = [4, 3];
break;
case 15:
pixelRatio = [3, 2];
break;
case 16:
pixelRatio = [2, 1];
break;
case 255: {
pixelRatio = [
(readUByte() << 8) | readUByte(),
(readUByte() << 8) | readUByte(),
];
break;
}
}
}
}
return {
width: Math.ceil((picWidthInMbsMinus1 + 1) * 16 -
frameCropLeftOffset * 2 -
frameCropRightOffset * 2),
height: (2 - frameMbsOnlyFlag) * (picHeightInMapUnitsMinus1 + 1) * 16 -
(frameMbsOnlyFlag ? 2 : 4) *
(frameCropTopOffset + frameCropBottomOffset),
pixelRatio: pixelRatio,
};
};
return AvcVideoParser;
}(BaseVideoParser));
var PACKET_LENGTH = 188;
var TSDemuxer = (function () {
function TSDemuxer(observer, config, typeSupported, logger) {
this.sampleAes = null;
this.pmtParsed = false;
this._pmtId = -1;
this._klvPid = -1;
this.aacOverFlow = null;
this.remainderData = null;
this.videoIntegrityChecker = null;
this.observer = observer;
this.config = config;
this.typeSupported = typeSupported;
this.logger = logger;
this.videoParser = null;
}
TSDemuxer.probe = function (data, logger) {
var syncOffset = TSDemuxer.syncOffset(data);
if (syncOffset > 0) {
logger.warn("MPEG2-TS detected but first sync word found @ offset ".concat(syncOffset));
}
return syncOffset !== -1;
};
TSDemuxer.syncOffset = function (data) {
var length = data.length;
var scanwindow = Math.min(PACKET_LENGTH * 5, length - PACKET_LENGTH) + 1;
var i = 0;
while (i < scanwindow) {
var foundPat = false;
var packetStart = -1;
var tsPackets = 0;
for (var j = i; j < length; j += PACKET_LENGTH) {
if (data[j] === 0x47 &&
(length - j === PACKET_LENGTH || data[j + PACKET_LENGTH] === 0x47)) {
tsPackets++;
if (packetStart === -1) {
packetStart = j;
if (packetStart !== 0) {
scanwindow =
Math.min(packetStart + PACKET_LENGTH * 99, data.length - PACKET_LENGTH) + 1;
}
}
if (!foundPat) {
foundPat = parsePID(data, j) === 0;
}
if (foundPat &&
tsPackets > 1 &&
((packetStart === 0 && tsPackets > 2) ||
j + PACKET_LENGTH > scanwindow)) {
return packetStart;
}
}
else if (tsPackets) {
return -1;
}
else {
break;
}
}
i++;
}
return -1;
};
TSDemuxer.createTrack = function (type, duration) {
return {
container: type === 'video' || type === 'audio' ? 'video/mp2t' : undefined,
type: type,
id: RemuxerTrackIdConfig[type],
pid: -1,
inputTimeScale: 90000,
sequenceNumber: 0,
samples: [],
dropped: 0,
duration: type === 'audio' ? duration : undefined,
};
};
TSDemuxer.prototype.resetInitSegment = function (initSegment, audioCodec, videoCodec, trackDuration, decryptdata, chunkMeta) {
this.pmtParsed = false;
this._pmtId = -1;
this._videoTrack = TSDemuxer.createTrack('video');
this._videoTrack.duration = trackDuration;
this.videoIntegrityChecker =
this.config.handleMpegTsVideoIntegrityErrors === 'skip'
? new PacketsIntegrityChecker(this.logger)
: null;
this._audioTrack = TSDemuxer.createTrack('audio', trackDuration);
this._id3Track = TSDemuxer.createTrack('id3');
this._txtTrack = TSDemuxer.createTrack('text');
this._audioTrack.segmentCodec = 'aac';
this.videoParser = null;
this.aacOverFlow = null;
this.remainderData = null;
this.audioCodec = audioCodec;
this.videoCodec = videoCodec;
if (initSegment) {
this.demux(initSegment, 0, chunkMeta, (decryptdata === null || decryptdata === void 0 ? void 0 : decryptdata.method) === 'SAMPLE-AES');
}
};
TSDemuxer.prototype.resetTimeStamp = function () { };
TSDemuxer.prototype.resetContiguity = function () {
var _a = this, _audioTrack = _a._audioTrack, _videoTrack = _a._videoTrack, _id3Track = _a._id3Track;
if (_audioTrack) {
_audioTrack.pesData = null;
}
if (_videoTrack) {
_videoTrack.pesData = null;
}
if (_id3Track) {
_id3Track.pesData = null;
}
this.videoParser = null;
this.aacOverFlow = null;
this.remainderData = null;
};
TSDemuxer.prototype.demux = function (data, timeOffset, chunkMeta, isSampleAes, flush) {
if (isSampleAes === void 0) { isSampleAes = false; }
if (flush === void 0) { flush = false; }
if (!isSampleAes) {
this.sampleAes = null;
}
var pes;
var videoTrack = this._videoTrack;
var videoIntegrityChecker = this.videoIntegrityChecker;
var audioTrack = this._audioTrack;
var id3Track = this._id3Track;
var textTrack = this._txtTrack;
var iframe = chunkMeta.iframe;
var videoPid = videoTrack.pid;
var videoData = videoTrack.pesData;
var audioPid = audioTrack.pid;
var id3Pid = id3Track.pid;
var klvPid = this._klvPid;
var audioData = audioTrack.pesData;
var id3Data = id3Track.pesData;
var klvData = null;
var unknownPID = null;
var pmtParsed = this.pmtParsed;
var pmtId = this._pmtId;
var len = data.length;
if (this.remainderData) {
data = appendUint8Array(this.remainderData, data);
len = data.length;
this.remainderData = null;
}
if (len < PACKET_LENGTH && !flush) {
this.remainderData = data;
return {
audioTrack: audioTrack,
videoTrack: videoTrack,
id3Track: id3Track,
textTrack: textTrack,
};
}
var syncOffset = Math.max(0, TSDemuxer.syncOffset(data));
len -= (len - syncOffset) % PACKET_LENGTH;
if (len < data.byteLength && !flush) {
this.remainderData = new Uint8Array(data.buffer, len, data.buffer.byteLength - len);
}
var tsPacketErrors = 0;
for (var start = syncOffset; start < len; start += PACKET_LENGTH) {
if (data[start] === 0x47) {
var stt = !!(data[start + 1] & 0x40);
var pid = parsePID(data, start);
var atf = (data[start + 3] & 0x30) >> 4;
var offset = void 0;
if (atf > 1) {
offset = start + 5 + data[start + 4];
if (offset === start + PACKET_LENGTH) {
continue;
}
}
else {
offset = start + 4;
}
switch (pid) {
case videoPid:
if (stt) {
if (videoData &&
!(videoIntegrityChecker === null || videoIntegrityChecker === void 0 ? void 0 : videoIntegrityChecker.isCorrupted) &&
(pes = parsePES(videoData, this.logger))) {
this.readyVideoParser(videoTrack.segmentCodec);
if (this.videoParser !== null) {
this.videoParser.parsePES(videoTrack, textTrack, pes, false, chunkMeta);
}
}
videoData = { data: [], size: 0 };
videoIntegrityChecker === null || videoIntegrityChecker === void 0 ? void 0 : videoIntegrityChecker.reset(videoPid);
}
videoIntegrityChecker === null || videoIntegrityChecker === void 0 ? void 0 : videoIntegrityChecker.handlePacket(data.subarray(start));
if (videoData) {
videoData.data.push(data.subarray(offset, start + PACKET_LENGTH));
videoData.size += start + PACKET_LENGTH - offset;
}
break;
case audioPid:
if (iframe) {
break;
}
if (stt) {
if (audioData && (pes = parsePES(audioData, this.logger))) {
switch (audioTrack.segmentCodec) {
case 'aac':
this.parseAACPES(audioTrack, pes, chunkMeta);
break;
case 'mp3':
this.parseMPEGPES(audioTrack, pes);
break;
}
}
audioData = { data: [], size: 0 };
}
if (audioData) {
audioData.data.push(data.subarray(offset, start + PACKET_LENGTH));
audioData.size += start + PACKET_LENGTH - offset;
}
break;
case id3Pid:
if (iframe) {
break;
}
if (stt) {
if (id3Data && (pes = parsePES(id3Data, this.logger))) {
this.parseID3PES(id3Track, pes);
}
id3Data = { data: [], size: 0 };
}
if (id3Data) {
id3Data.data.push(data.subarray(offset, start + PACKET_LENGTH));
id3Data.size += start + PACKET_LENGTH - offset;
}
break;
case klvPid:
if (iframe) {
break;
}
if (stt) {
if (klvData && (pes = parsePES(klvData, this.logger))) {
this.parseKlvPES(id3Track, pes);
}
klvData = { data: [], size: 0 };
}
if (klvData) {
klvData.data.push(data.subarray(offset, start + PACKET_LENGTH));
klvData.size += start + PACKET_LENGTH - offset;
}
break;
case 0:
if (stt) {
offset += data[offset] + 1;
}
pmtId = this._pmtId = parsePAT(data, offset);
break;
case pmtId: {
if (stt) {
offset += data[offset] + 1;
}
var parsedPIDs = parsePMT(data, offset, this.typeSupported, isSampleAes, this.observer, this.logger, this.config, chunkMeta);
videoPid = parsedPIDs.videoPid;
if (videoPid > 0) {
videoTrack.pid = videoPid;
videoTrack.segmentCodec = parsedPIDs.segmentVideoCodec;
}
audioPid = parsedPIDs.audioPid;
if (audioPid > 0) {
audioTrack.pid = audioPid;
audioTrack.segmentCodec = parsedPIDs.segmentAudioCodec;
}
id3Pid = parsedPIDs.id3Pid;
if (id3Pid > 0) {
id3Track.pid = id3Pid;
}
klvPid = parsedPIDs.klvPid;
if (klvPid > 0) {
this._klvPid = klvPid;
}
if (unknownPID !== null && !pmtParsed) {
this.logger.warn("MPEG-TS PMT found at ".concat(start, " after unknown PID '").concat(unknownPID, "'. Backtracking to sync byte @").concat(syncOffset, " to parse all TS packets."));
unknownPID = null;
start = syncOffset - 188;
}
pmtParsed = this.pmtParsed = true;
break;
}
case 0x11:
case 0x1fff:
break;
default:
unknownPID = pid;
break;
}
}
else {
tsPacketErrors++;
}
}
if (tsPacketErrors > 0) {
emitParsingError(this.observer, new Error("Found ".concat(tsPacketErrors, " TS packet/s that do not start with 0x47")), chunkMeta, undefined, this.logger);
}
videoTrack.pesData = videoData;
audioTrack.pesData = audioData;
id3Track.pesData = id3Data;
var demuxResult = {
audioTrack: audioTrack,
videoTrack: videoTrack,
id3Track: id3Track,
textTrack: textTrack,
};
if (flush) {
this.extractRemainingSamples(demuxResult, chunkMeta);
}
return demuxResult;
};
TSDemuxer.prototype.flush = function (timeOffset, chunkMeta) {
var remainderData = this.remainderData;
this.remainderData = null;
var result;
if (remainderData) {
result = this.demux(remainderData, 0, chunkMeta, false, true);
}
else {
result = {
videoTrack: this._videoTrack,
audioTrack: this._audioTrack,
id3Track: this._id3Track,
textTrack: this._txtTrack,
};
}
this.extractRemainingSamples(result, chunkMeta);
if (this.sampleAes) {
return this.decrypt(result, this.sampleAes);
}
return result;
};
TSDemuxer.prototype.extractRemainingSamples = function (demuxResult, chunkMeta) {
var audioTrack = demuxResult.audioTrack, videoTrack = demuxResult.videoTrack, id3Track = demuxResult.id3Track, textTrack = demuxResult.textTrack;
var videoData = videoTrack.pesData;
var audioData = audioTrack.pesData;
var id3Data = id3Track.pesData;
var videoIntegrityChecker = this.videoIntegrityChecker;
var pes;
if (videoData &&
!(videoIntegrityChecker === null || videoIntegrityChecker === void 0 ? void 0 : videoIntegrityChecker.isCorrupted) &&
(pes = parsePES(videoData, this.logger))) {
this.readyVideoParser(videoTrack.segmentCodec);
if (this.videoParser !== null) {
this.videoParser.parsePES(videoTrack, textTrack, pes, true, chunkMeta);
videoTrack.pesData = null;
}
}
else {
videoTrack.pesData = videoData;
}
if (audioData && (pes = parsePES(audioData, this.logger))) {
switch (audioTrack.segmentCodec) {
case 'aac':
this.parseAACPES(audioTrack, pes, chunkMeta);
break;
case 'mp3':
this.parseMPEGPES(audioTrack, pes);
break;
}
audioTrack.pesData = null;
}
else {
if (audioData === null || audioData === void 0 ? void 0 : audioData.size) ;
audioTrack.pesData = audioData;
}
if (id3Data && (pes = parsePES(id3Data, this.logger))) {
this.parseID3PES(id3Track, pes);
id3Track.pesData = null;
}
else {
id3Track.pesData = id3Data;
}
};
TSDemuxer.prototype.demuxSampleAes = function (data, keyData, timeOffset, chunkMeta) {
var demuxResult = this.demux(data, timeOffset, chunkMeta, true, !this.config.progressive);
var sampleAes = (this.sampleAes = new SampleAesDecrypter(this.observer, this.config));
return this.decrypt(demuxResult, sampleAes);
};
TSDemuxer.prototype.readyVideoParser = function (codec) {
if (this.videoParser === null) {
if (codec === 'avc') {
this.videoParser = new AvcVideoParser();
}
}
};
TSDemuxer.prototype.decrypt = function (demuxResult, sampleAes) {
return new Promise(function (resolve) {
var audioTrack = demuxResult.audioTrack, videoTrack = demuxResult.videoTrack;
if (audioTrack.samples && audioTrack.segmentCodec === 'aac') {
sampleAes.decryptAacSamples(audioTrack.samples, 0, function () {
if (videoTrack.samples) {
sampleAes.decryptAvcSamples(videoTrack.samples, 0, 0, function () {
resolve(demuxResult);
});
}
else {
resolve(demuxResult);
}
});
}
else if (videoTrack.samples) {
sampleAes.decryptAvcSamples(videoTrack.samples, 0, 0, function () {
resolve(demuxResult);
});
}
});
};
TSDemuxer.prototype.destroy = function () {
if (this.observer) {
this.observer.removeAllListeners();
}
this.config = this.logger = this.observer = null;
this.aacOverFlow =
this.videoParser =
this.remainderData =
this.sampleAes =
null;
this._videoTrack =
this._audioTrack =
this._id3Track =
this._txtTrack =
undefined;
this.videoIntegrityChecker = null;
};
TSDemuxer.prototype.parseAACPES = function (track, pes, chunkMeta) {
var startOffset = 0;
var aacOverFlow = this.aacOverFlow;
var data = pes.data;
if (aacOverFlow) {
this.aacOverFlow = null;
var frameMissingBytes = aacOverFlow.missing;
var sampleLength = aacOverFlow.sample.unit.byteLength;
if (frameMissingBytes === -1) {
data = appendUint8Array(aacOverFlow.sample.unit, data);
}
else {
var frameOverflowBytes = sampleLength - frameMissingBytes;
aacOverFlow.sample.unit.set(data.subarray(0, frameMissingBytes), frameOverflowBytes);
track.samples.push(aacOverFlow.sample);
startOffset = aacOverFlow.missing;
}
}
var offset;
var len;
for (offset = startOffset, len = data.length; offset < len - 1; offset++) {
if (isHeader$1(data, offset)) {
break;
}
}
if (offset !== startOffset) {
var reason = void 0;
var recoverable = offset < len - 1;
if (recoverable) {
reason = "AAC PES did not start with ADTS header,offset:".concat(offset);
}
else {
reason = 'No ADTS header found in AAC PES';
}
emitParsingError(this.observer, new Error(reason), chunkMeta, recoverable, this.logger);
if (!recoverable) {
return;
}
}
initTrackConfig(track, this.observer, data, offset, this.audioCodec);
var pts;
if (pes.pts !== undefined) {
pts = pes.pts;
}
else if (aacOverFlow) {
var frameDuration = getFrameDuration(track.samplerate);
pts = aacOverFlow.sample.pts + frameDuration;
}
else {
this.logger.warn('[tsdemuxer]: AAC PES unknown PTS');
return;
}
var frameIndex = 0;
var frame;
while (offset < len) {
frame = appendFrame$1(track, data, offset, pts, frameIndex);
offset += frame.length;
if (!frame.missing) {
frameIndex++;
for (; offset < len - 1; offset++) {
if (isHeader$1(data, offset)) {
break;
}
}
}
else {
this.aacOverFlow = frame;
break;
}
}
};
TSDemuxer.prototype.parseMPEGPES = function (track, pes) {
var data = pes.data;
var length = data.length;
var frameIndex = 0;
var offset = 0;
var pts = pes.pts;
if (pts === undefined) {
this.logger.warn('[tsdemuxer]: MPEG PES unknown PTS');
return;
}
while (offset < length) {
if (isHeader(data, offset)) {
var frame = appendFrame(track, data, offset, pts, frameIndex);
if (frame) {
offset += frame.length;
frameIndex++;
}
else {
break;
}
}
else {
offset++;
}
}
};
TSDemuxer.prototype.parseAC3PES = function (track, pes) {
};
TSDemuxer.prototype.parseID3PES = function (id3Track, pes) {
if (pes.pts === undefined) {
this.logger.warn('[tsdemuxer]: ID3 PES unknown PTS');
return;
}
var id3Sample = __bolli.assign({}, pes, {
type: this._videoTrack ? MetadataSchema.emsg : MetadataSchema.audioId3,
duration: Number.POSITIVE_INFINITY,
});
id3Track.samples.push(id3Sample);
};
TSDemuxer.prototype.parseKlvPES = function (id3Track, pes) {
var _a, _b;
var pts = (_a = pes.pts) !== null && _a !== void 0 ? _a : pes.dts;
if (pts === undefined) {
this.logger.warn('[tsdemuxer]: KLV PES unknown PTS and DTS');
return;
}
var klvData = pes.data;
if (klvData.length < 16) {
this.logger.warn('[tsdemuxer]: KLV PES payload too short');
return;
}
var offset = 0;
while (offset < klvData.length) {
if (offset + 16 > klvData.length) {
break;
}
var klvStart = offset;
offset += 16;
if (offset >= klvData.length) {
break;
}
var firstByte = klvData[offset];
offset += 1;
var length_2 = 0;
if (firstByte & 0x80) {
var lengthBytes = firstByte & 0x7f;
if (lengthBytes === 0 ||
lengthBytes > 4 ||
offset + lengthBytes > klvData.length) {
this.logger.warn('[tsdemuxer]: Invalid KLV length encoding');
break;
}
for (var i = 0; i < lengthBytes; i++) {
length_2 = (length_2 << 8) | klvData[offset + i];
}
offset += lengthBytes;
}
else {
length_2 = firstByte;
}
if (offset + length_2 > klvData.length) {
this.logger.warn('[tsdemuxer]: KLV value extends beyond PES payload');
break;
}
var klvEnd = offset + length_2;
var klvPacket = klvData.subarray(klvStart, klvEnd);
var klvSample = {
data: klvPacket,
len: klvPacket.byteLength,
pts: pts,
dts: (_b = pes.dts) !== null && _b !== void 0 ? _b : pts,
type: MetadataSchema.misbklv,
duration: Number.POSITIVE_INFINITY,
};
id3Track.samples.push(klvSample);
offset = klvEnd;
}
};
return TSDemuxer;
}());
function parsePID(data, offset) {
return ((data[offset + 1] & 0x1f) << 8) + data[offset + 2];
}
function parsePAT(data, offset) {
return ((data[offset + 10] & 0x1f) << 8) | data[offset + 11];
}
function parsePMT(data, offset, typeSupported, isSampleAes, observer, logger, config, chunkMeta) {
var result = {
audioPid: -1,
videoPid: -1,
id3Pid: -1,
klvPid: -1,
segmentVideoCodec: 'avc',
segmentAudioCodec: 'aac',
};
var sectionLength = ((data[offset + 1] & 0x0f) << 8) | data[offset + 2];
var tableEnd = offset + 3 + sectionLength - 4;
var programInfoLength = ((data[offset + 10] & 0x0f) << 8) | data[offset + 11];
offset += 12 + programInfoLength;
while (offset < tableEnd) {
var pid = parsePID(data, offset);
var esInfoLength = ((data[offset + 3] & 0x0f) << 8) | data[offset + 4];
switch (data[offset]) {
case 0xcf:
if (!isSampleAes) {
break;
}
case 0x0f:
if (result.audioPid === -1) {
result.audioPid = pid;
}
break;
case 0x15:
if (result.id3Pid === -1) {
result.id3Pid = pid;
}
break;
case 0xdb:
if (!isSampleAes) {
break;
}
case 0x1b:
if (result.videoPid === -1) {
result.videoPid = pid;
}
break;
case 0x03:
case 0x04:
if (!typeSupported.mpeg && !typeSupported.mp3) ;
else if (result.audioPid === -1) {
result.audioPid = pid;
result.segmentAudioCodec = 'mp3';
}
break;
case 0xc1:
if (!isSampleAes) {
break;
}
case 0x81:
{
logger.warn('AC-3 in M2TS support not included in build');
}
break;
case 0x06:
if (esInfoLength > 0) {
var parsePos = offset + 5;
var remaining = esInfoLength;
while (remaining > 2) {
var descriptorId = data[parsePos];
switch (descriptorId) {
case 0x6a:
if (result.audioPid === -1) {
{
logger.warn('AC-3 in M2TS support not included in build');
}
}
break;
case 0x05:
if (result.klvPid === -1 && config.enableEmsgKLVMetadata) {
result.klvPid = pid;
}
break;
}
var descriptorLen = data[parsePos + 1] + 2;
parsePos += descriptorLen;
remaining -= descriptorLen;
}
}
break;
case 0xc2:
case 0x87:
emitParsingError(observer, new Error('Unsupported EC-3 in M2TS found'), chunkMeta, undefined, logger);
return result;
case 0x24:
{
emitParsingError(observer, new Error('Unsupported HEVC in M2TS found'), chunkMeta, undefined, logger);
return result;
}
}
offset += esInfoLength + 5;
}
return result;
}
function emitParsingError(observer, error, chunkMeta, levelRetry, logger) {
logger.warn("parsing error: ".concat(error.message));
observer.emit(Events.ERROR, Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.FRAG_PARSING_ERROR,
fatal: false,
levelRetry: levelRetry,
chunkMeta: chunkMeta,
error: error,
reason: error.message,
});
}
function parsePES(stream, logger) {
var i = 0;
var frag;
var pesLen;
var pesHdrLen;
var pesPts;
var pesDts;
var data = stream.data;
if (!stream || stream.size === 0) {
return null;
}
while (data[0].length < 19 && data.length > 1) {
data[0] = appendUint8Array(data[0], data[1]);
data.splice(1, 1);
}
frag = data[0];
var pesPrefix = (frag[0] << 16) + (frag[1] << 8) + frag[2];
if (pesPrefix === 1) {
pesLen = (frag[4] << 8) + frag[5];
if (pesLen && pesLen > stream.size - 6) {
return null;
}
var pesFlags = frag[7];
if (pesFlags & 0xc0) {
pesPts =
(frag[9] & 0x0e) * 536870912 +
(frag[10] & 0xff) * 4194304 +
(frag[11] & 0xfe) * 16384 +
(frag[12] & 0xff) * 128 +
(frag[13] & 0xfe) / 2;
if (pesFlags & 0x40) {
pesDts =
(frag[14] & 0x0e) * 536870912 +
(frag[15] & 0xff) * 4194304 +
(frag[16] & 0xfe) * 16384 +
(frag[17] & 0xff) * 128 +
(frag[18] & 0xfe) / 2;
if (pesPts - pesDts > 60 * 90000) {
logger.warn("".concat(Math.round((pesPts - pesDts) / 90000), "s delta between PTS and DTS, align them"));
pesPts = pesDts;
}
}
else {
pesDts = pesPts;
}
}
pesHdrLen = frag[8];
var payloadStartOffset = pesHdrLen + 9;
if (stream.size <= payloadStartOffset) {
return null;
}
stream.size -= payloadStartOffset;
var pesData = new Uint8Array(stream.size);
for (var j = 0, dataLen = data.length; j < dataLen; j++) {
frag = data[j];
var len = frag.byteLength;
if (payloadStartOffset) {
if (payloadStartOffset > len) {
payloadStartOffset -= len;
continue;
}
else {
frag = frag.subarray(payloadStartOffset);
len -= payloadStartOffset;
payloadStartOffset = 0;
}
}
pesData.set(frag, i);
i += len;
}
if (pesLen) {
pesLen -= pesHdrLen + 3;
}
return { data: pesData, pts: pesPts, dts: pesDts, len: pesLen };
}
return null;
}
var PacketsIntegrityChecker = (function () {
function PacketsIntegrityChecker(logger) {
this.pid = 0;
this.lastContinuityCounter = -1;
this.integrityState = 'ok';
this.logger = logger;
}
Object.defineProperty(PacketsIntegrityChecker.prototype, "isCorrupted", {
get: function () {
return this.integrityState !== 'ok';
},
enumerable: false,
configurable: true
});
PacketsIntegrityChecker.prototype.reset = function (pid) {
this.pid = pid;
this.lastContinuityCounter = -1;
this.integrityState = 'ok';
};
PacketsIntegrityChecker.prototype.handlePacket = function (data) {
if (data.byteLength < 4) {
return;
}
var pid = parsePID(data, 0);
if (pid !== this.pid) {
return;
}
var adaptationFieldControl = (data[3] & 0x30) >> 4;
if (adaptationFieldControl === 0) {
return;
}
var continuityCounter = data[3] & 0xf;
var lastContinuityCounter = this.lastContinuityCounter;
this.lastContinuityCounter = continuityCounter;
var hasPayload = (adaptationFieldControl & 1) != 0;
var hasAdaptation = (adaptationFieldControl & 2) != 0;
var isDiscontinuity = hasAdaptation && data[4] != 0 && (data[5] & 0x80) != 0;
if (isDiscontinuity) {
return;
}
if (lastContinuityCounter < 0) {
return;
}
var expectedContinuityCounter = hasPayload
? (lastContinuityCounter + 1) & 0x0f
: lastContinuityCounter;
if (continuityCounter !== expectedContinuityCounter) {
this.logger.warn("MPEG-TS Continuity Counter check failed for PID='".concat(pid, "', CC=").concat(continuityCounter, ", Expected-CC=").concat(expectedContinuityCounter, " Last-CC=").concat(lastContinuityCounter));
this.integrityState = 'cc-failed';
return;
}
if ((data[1] & 0x80) !== 0) {
this.logger.warn("MPEG-TS Packet had TEI flag set for PID='".concat(pid, "'"));
this.integrityState = 'tei-bit';
return;
}
};
return PacketsIntegrityChecker;
}());
var AAC = (function () {
function AAC() {
}
AAC.getSilentFrame = function (codec, channelCount) {
switch (codec) {
case 'mp4a.40.2':
if (channelCount === 1) {
return new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x23, 0x80]);
}
else if (channelCount === 2) {
return new Uint8Array([
0x21, 0x00, 0x49, 0x90, 0x02, 0x19, 0x00, 0x23, 0x80,
]);
}
else if (channelCount === 3) {
return new Uint8Array([
0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64,
0x00, 0x8e,
]);
}
else if (channelCount === 4) {
return new Uint8Array([
0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64,
0x00, 0x80, 0x2c, 0x80, 0x08, 0x02, 0x38,
]);
}
else if (channelCount === 5) {
return new Uint8Array([
0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64,
0x00, 0x82, 0x30, 0x04, 0x99, 0x00, 0x21, 0x90, 0x02, 0x38,
]);
}
else if (channelCount === 6) {
return new Uint8Array([
0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64,
0x00, 0x82, 0x30, 0x04, 0x99, 0x00, 0x21, 0x90, 0x02, 0x00, 0xb2,
0x00, 0x20, 0x08, 0xe0,
]);
}
break;
default:
if (channelCount === 1) {
return new Uint8Array([
0x1, 0x40, 0x22, 0x80, 0xa3, 0x4e, 0xe6, 0x80, 0xba, 0x8, 0x0, 0x0,
0x0, 0x1c, 0x6, 0xf1, 0xc1, 0xa, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5e,
]);
}
else if (channelCount === 2) {
return new Uint8Array([
0x1, 0x40, 0x22, 0x80, 0xa3, 0x5e, 0xe6, 0x80, 0xba, 0x8, 0x0, 0x0,
0x0, 0x0, 0x95, 0x0, 0x6, 0xf1, 0xa1, 0xa, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5e,
]);
}
else if (channelCount === 3) {
return new Uint8Array([
0x1, 0x40, 0x22, 0x80, 0xa3, 0x5e, 0xe6, 0x80, 0xba, 0x8, 0x0, 0x0,
0x0, 0x0, 0x95, 0x0, 0x6, 0xf1, 0xa1, 0xa, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
0x5a, 0x5e,
]);
}
break;
}
return undefined;
};
return AAC;
}());
var HDLR_TYPES = {
video: new Uint8Array([
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x76,
0x69,
0x64,
0x65,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x56,
0x69,
0x64,
0x65,
0x6f,
0x48,
0x61,
0x6e,
0x64,
0x6c,
0x65,
0x72,
0x00,
]),
audio: new Uint8Array([
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x73,
0x6f,
0x75,
0x6e,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x53,
0x6f,
0x75,
0x6e,
0x64,
0x48,
0x61,
0x6e,
0x64,
0x6c,
0x65,
0x72,
0x00,
]),
};
var STCO = new Uint8Array([
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
]);
var STSZ = new Uint8Array([
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
]);
var VMHD = new Uint8Array([
0x00,
0x00,
0x00,
0x01,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
]);
var SMHD = new Uint8Array([
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
]);
var STSD = new Uint8Array([
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x01,
]);
var majorBrand = new Uint8Array([105, 115, 111, 109]);
var avc1Brand = new Uint8Array([97, 118, 99, 49]);
var minorVersion = new Uint8Array([0, 0, 0, 1]);
var MP4 = (function () {
function MP4() {
}
MP4.box = function (type) {
var payload = [];
for (var _i = 1; _i < arguments.length; _i++) {
payload[_i - 1] = arguments[_i];
}
var size = 8;
var i = payload.length;
var len = i;
while (i--) {
size += payload[i].byteLength;
}
var result = new Uint8Array(size);
writeUint32(result, 0, size);
writeUint32(result, 4, type);
for (i = 0, size = 8; i < len; i++) {
result.set(payload[i], size);
size += payload[i].byteLength;
}
return result;
};
MP4.hdlr = function (type) {
return MP4.box(types.hdlr, HDLR_TYPES[type]);
};
MP4.mdat = function (data) {
return MP4.box(types.mdat, data);
};
MP4.mdhd = function (timescale, duration) {
duration *= timescale;
var upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
var lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
return MP4.box(types.mdhd, new Uint8Array([
0x01,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x02,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x03,
(timescale >> 24) & 0xff,
(timescale >> 16) & 0xff,
(timescale >> 8) & 0xff,
timescale & 0xff,
upperWordDuration >> 24,
(upperWordDuration >> 16) & 0xff,
(upperWordDuration >> 8) & 0xff,
upperWordDuration & 0xff,
lowerWordDuration >> 24,
(lowerWordDuration >> 16) & 0xff,
(lowerWordDuration >> 8) & 0xff,
lowerWordDuration & 0xff,
0x55,
0xc4,
0x00,
0x00,
]));
};
MP4.mdia = function (track) {
return MP4.box(types.mdia, MP4.mdhd(track.timescale || 0, track.duration || 0), MP4.hdlr(track.type), MP4.minf(track));
};
MP4.mfhd = function (sequenceNumber) {
return MP4.box(types.mfhd, new Uint8Array([
0x00,
0x00,
0x00,
0x00,
sequenceNumber >> 24,
(sequenceNumber >> 16) & 0xff,
(sequenceNumber >> 8) & 0xff,
sequenceNumber & 0xff,
]));
};
MP4.minf = function (track) {
if (track.type === 'audio') {
return MP4.box(types.minf, MP4.box(types.smhd, SMHD), MP4.DINF, MP4.stbl(track));
}
else {
return MP4.box(types.minf, MP4.box(types.vmhd, VMHD), MP4.DINF, MP4.stbl(track));
}
};
MP4.moof = function (sn, baseMediaDecodeTime, track) {
return MP4.box(types.moof, MP4.mfhd(sn), MP4.traf(track, baseMediaDecodeTime));
};
MP4.moov = function (tracks) {
var i = tracks.length;
var boxes = [];
while (i--) {
boxes[i] = MP4.trak(tracks[i]);
}
return MP4.box.apply(null, [types.moov, MP4.mvhd(tracks[0].timescale || 0, tracks[0].duration || 0)]
.concat(boxes)
.concat(MP4.mvex(tracks)));
};
MP4.mvex = function (tracks) {
var i = tracks.length;
var boxes = [];
while (i--) {
boxes[i] = MP4.trex(tracks[i]);
}
return MP4.box.apply(null, __spreadArray([types.mvex], boxes));
};
MP4.mvhd = function (timescale, duration) {
duration *= timescale;
var upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
var lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
var bytes = new Uint8Array([
0x01,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x02,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x03,
(timescale >> 24) & 0xff,
(timescale >> 16) & 0xff,
(timescale >> 8) & 0xff,
timescale & 0xff,
upperWordDuration >> 24,
(upperWordDuration >> 16) & 0xff,
(upperWordDuration >> 8) & 0xff,
upperWordDuration & 0xff,
lowerWordDuration >> 24,
(lowerWordDuration >> 16) & 0xff,
(lowerWordDuration >> 8) & 0xff,
lowerWordDuration & 0xff,
0x00,
0x01,
0x00,
0x00,
0x01,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x01,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x01,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x40,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0xff,
0xff,
0xff,
0xff,
]);
return MP4.box(types.mvhd, bytes);
};
MP4.sdtp = function (track) {
var samples = track.samples || [];
var bytes = new Uint8Array(4 + samples.length);
var i;
var flags;
for (i = 0; i < samples.length; i++) {
flags = samples[i].flags;
bytes[i + 4] =
(flags.dependsOn << 4) |
(flags.isDependedOn << 2) |
flags.hasRedundancy;
}
return MP4.box(types.sdtp, bytes);
};
MP4.stbl = function (track) {
return MP4.box(types.stbl, MP4.stsd(track), MP4.box(types.stts, STCO), MP4.box(types.stsc, STCO), MP4.box(types.stsz, STSZ), MP4.box(types.stco, STCO));
};
MP4.avc1 = function (track) {
var sps = [];
var pps = [];
var i;
var data;
var len;
for (i = 0; i < track.sps.length; i++) {
data = track.sps[i];
len = data.byteLength;
sps.push((len >>> 8) & 0xff);
sps.push(len & 0xff);
sps = sps.concat(Array.prototype.slice.call(data));
}
for (i = 0; i < track.pps.length; i++) {
data = track.pps[i];
len = data.byteLength;
pps.push((len >>> 8) & 0xff);
pps.push(len & 0xff);
pps = pps.concat(Array.prototype.slice.call(data));
}
var avcc = MP4.box(types.avcC, new Uint8Array([
0x01,
sps[3],
sps[4],
sps[5],
0xfc | 3,
0xe0 | track.sps.length,
]
.concat(sps)
.concat([
track.pps.length,
])
.concat(pps)));
var width = track.width;
var height = track.height;
var hSpacing = track.pixelRatio[0];
var vSpacing = track.pixelRatio[1];
return MP4.box(types.avc1, new Uint8Array([
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x01,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
(width >> 8) & 0xff,
width & 0xff,
(height >> 8) & 0xff,
height & 0xff,
0x00,
0x48,
0x00,
0x00,
0x00,
0x48,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x01,
0x12,
0x64,
0x61,
0x69,
0x6c,
0x79,
0x6d,
0x6f,
0x74,
0x69,
0x6f,
0x6e,
0x2f,
0x68,
0x6c,
0x73,
0x2e,
0x6a,
0x73,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x18,
0x11,
0x11,
]), avcc, MP4.box(types.btrt, new Uint8Array([
0x00,
0x1c,
0x9c,
0x80,
0x00,
0x2d,
0xc6,
0xc0,
0x00,
0x2d,
0xc6,
0xc0,
])), MP4.box(types.pasp, new Uint8Array([
hSpacing >> 24,
(hSpacing >> 16) & 0xff,
(hSpacing >> 8) & 0xff,
hSpacing & 0xff,
vSpacing >> 24,
(vSpacing >> 16) & 0xff,
(vSpacing >> 8) & 0xff,
vSpacing & 0xff,
])));
};
MP4.esds = function (track) {
var config = track.config;
var len = config.length;
return new Uint8Array(__spreadArray(__spreadArray([
0x00,
0x00,
0x00,
0x00,
0x03,
0x17 + len,
0x00,
0x01,
0x00,
0x04,
0x0f + len,
0x40,
0x15,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x05,
len
], config, true), [
0x06,
0x01,
0x02,
]));
};
MP4.audioStsd = function (track) {
var samplerate = track.samplerate || 0;
return new Uint8Array([
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x01,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
track.channelCount || 0,
0x00,
0x10,
0x00,
0x00,
0x00,
0x00,
(samplerate >> 8) & 0xff,
samplerate & 0xff,
0x00,
0x00,
]);
};
MP4.mp4a = function (track) {
return MP4.box(types.mp4a, MP4.audioStsd(track), MP4.box(types.esds, MP4.esds(track)));
};
MP4.mp3 = function (track) {
return MP4.box(types['.mp3'], MP4.audioStsd(track));
};
MP4.ac3 = function (track) {
return MP4.box(types['ac-3'], MP4.audioStsd(track), MP4.box(types.dac3, track.config));
};
MP4.stsd = function (track) {
var segmentCodec = track.segmentCodec;
if (track.type === 'audio') {
if (segmentCodec === 'aac') {
return MP4.box(types.stsd, STSD, MP4.mp4a(track));
}
if (segmentCodec === 'mp3' && track.codec === 'mp3') {
return MP4.box(types.stsd, STSD, MP4.mp3(track));
}
}
else {
if (track.pps && track.sps) {
if (segmentCodec === 'avc') {
return MP4.box(types.stsd, STSD, MP4.avc1(track));
}
}
else {
throw new Error("video track missing pps or sps");
}
}
throw new Error("unsupported ".concat(track.type, " segment codec (").concat(segmentCodec, "/").concat(track.codec, ")"));
};
MP4.tkhd = function (track) {
var id = track.id;
var duration = (track.duration || 0) * (track.timescale || 0);
var width = track.width || 0;
var height = track.height || 0;
var upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
var lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
return MP4.box(types.tkhd, new Uint8Array([
0x01,
0x00,
0x00,
0x07,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x02,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x03,
(id >> 24) & 0xff,
(id >> 16) & 0xff,
(id >> 8) & 0xff,
id & 0xff,
0x00,
0x00,
0x00,
0x00,
upperWordDuration >> 24,
(upperWordDuration >> 16) & 0xff,
(upperWordDuration >> 8) & 0xff,
upperWordDuration & 0xff,
lowerWordDuration >> 24,
(lowerWordDuration >> 16) & 0xff,
(lowerWordDuration >> 8) & 0xff,
lowerWordDuration & 0xff,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x01,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x01,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x40,
0x00,
0x00,
0x00,
(width >> 8) & 0xff,
width & 0xff,
0x00,
0x00,
(height >> 8) & 0xff,
height & 0xff,
0x00,
0x00,
]));
};
MP4.traf = function (track, baseMediaDecodeTime) {
var sampleDependencyTable = MP4.sdtp(track);
var id = track.id;
var upperWordBaseMediaDecodeTime = Math.floor(baseMediaDecodeTime / (UINT32_MAX + 1));
var lowerWordBaseMediaDecodeTime = Math.floor(baseMediaDecodeTime % (UINT32_MAX + 1));
return MP4.box(types.traf, MP4.box(types.tfhd, new Uint8Array([
0x00,
0x00,
0x00,
0x00,
id >> 24,
(id >> 16) & 0xff,
(id >> 8) & 0xff,
id & 0xff,
])), MP4.box(types.tfdt, new Uint8Array([
0x01,
0x00,
0x00,
0x00,
upperWordBaseMediaDecodeTime >> 24,
(upperWordBaseMediaDecodeTime >> 16) & 0xff,
(upperWordBaseMediaDecodeTime >> 8) & 0xff,
upperWordBaseMediaDecodeTime & 0xff,
lowerWordBaseMediaDecodeTime >> 24,
(lowerWordBaseMediaDecodeTime >> 16) & 0xff,
(lowerWordBaseMediaDecodeTime >> 8) & 0xff,
lowerWordBaseMediaDecodeTime & 0xff,
])), MP4.trun(track, sampleDependencyTable.length +
16 +
20 +
8 +
16 +
8 +
8), sampleDependencyTable);
};
MP4.trak = function (track) {
track.duration = track.duration || 0xffffffff;
return MP4.box(types.trak, MP4.tkhd(track), MP4.mdia(track));
};
MP4.trex = function (track) {
var id = track.id;
return MP4.box(types.trex, new Uint8Array([
0x00,
0x00,
0x00,
0x00,
id >> 24,
(id >> 16) & 0xff,
(id >> 8) & 0xff,
id & 0xff,
0x00,
0x00,
0x00,
0x01,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x01,
0x00,
0x01,
]));
};
MP4.trun = function (track, offset) {
var samples = track.samples || [];
var len = samples.length;
var arraylen = 12 + 16 * len;
var array = new Uint8Array(arraylen);
var i;
var sample;
var duration;
var size;
var flags;
var cts;
offset += 8 + arraylen;
array.set([
track.type === 'video' ? 0x01 : 0x00,
0x00,
0x0f,
0x01,
(len >>> 24) & 0xff,
(len >>> 16) & 0xff,
(len >>> 8) & 0xff,
len & 0xff,
(offset >>> 24) & 0xff,
(offset >>> 16) & 0xff,
(offset >>> 8) & 0xff,
offset & 0xff,
], 0);
for (i = 0; i < len; i++) {
sample = samples[i];
duration = sample.duration;
size = sample.size;
flags = sample.flags;
cts = sample.cts;
array.set([
(duration >>> 24) & 0xff,
(duration >>> 16) & 0xff,
(duration >>> 8) & 0xff,
duration & 0xff,
(size >>> 24) & 0xff,
(size >>> 16) & 0xff,
(size >>> 8) & 0xff,
size & 0xff,
(flags.isLeading << 2) | flags.dependsOn,
(flags.isDependedOn << 6) |
(flags.hasRedundancy << 4) |
(flags.paddingValue << 1) |
flags.isNonSync,
flags.degradPrio & (0xf0 << 8),
flags.degradPrio & 0x0f,
(cts >>> 24) & 0xff,
(cts >>> 16) & 0xff,
(cts >>> 8) & 0xff,
cts & 0xff,
], 12 + 16 * i);
}
return MP4.box(types.trun, array);
};
MP4.initSegment = function (tracks) {
var movie = MP4.moov(tracks);
var result = appendUint8Array(MP4.FTYP, movie);
return result;
};
MP4.hvc1 = function (track) {
{
return new Uint8Array();
}
};
MP4.FTYP = MP4.box(types.ftyp, majorBrand, minorVersion, majorBrand, avc1Brand);
MP4.DINF = MP4.box(types.dinf, MP4.box(types.dref, new Uint8Array([
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x00,
0x01,
0x00,
0x00,
0x00,
0x0c,
0x75,
0x72,
0x6c,
0x20,
0x00,
0x00,
0x00,
0x01,
])));
return MP4;
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
var MPEG_TS_CLOCK_FREQ_HZ = 90000;
function toTimescaleFromBase(baseTime, destScale, srcBase, round) {
if (round === void 0) { round = false; }
var result = baseTime * destScale * srcBase;
return round ? Math.round(result) : result;
}
function toMsFromMpegTsClock(baseTime, round) {
return toTimescaleFromBase(baseTime, 1000, 1 / MPEG_TS_CLOCK_FREQ_HZ, round);
}
var MAX_SILENT_FRAME_DURATION = 10 * 1000;
var AAC_SAMPLES_PER_FRAME = 1024;
var MPEG_AUDIO_SAMPLE_PER_FRAME = 1152;
var AC3_SAMPLES_PER_FRAME = 1536;
var MPEG_TS_PTS_ROLLOVER = 8589934592;
function createMp4Sample(isKeyframe, duration, size, cts) {
return {
duration: duration,
size: size,
cts: cts,
flags: {
isLeading: 0,
isDependedOn: 0,
hasRedundancy: 0,
degradPrio: 0,
dependsOn: isKeyframe ? 2 : 1,
isNonSync: isKeyframe ? 0 : 1,
paddingValue: 0,
},
};
}
var MP4Remuxer = (function (_super) {
__extends(MP4Remuxer, _super);
function MP4Remuxer(observer, config, typeSupported, logger) {
var _this = _super.call(this, 'mp4-remuxer', logger) || this;
_this.ISGenerated = false;
_this._initPTS = null;
_this._initDTS = null;
_this.nextVideoTs = null;
_this.nextAudioTs = null;
_this.videoSampleDuration = null;
_this.isAudioContiguous = false;
_this.isVideoContiguous = false;
_this.observer = observer;
_this.config = config;
_this.typeSupported = typeSupported;
_this.ISGenerated = false;
return _this;
}
MP4Remuxer.prototype.destroy = function () {
this.config = this.videoTrackConfig = this._initPTS = this._initDTS = null;
};
MP4Remuxer.prototype.resetTimeStamp = function (defaultTimeStamp) {
var initPTS = this._initPTS;
if (!initPTS ||
!defaultTimeStamp ||
defaultTimeStamp.trackId !== initPTS.trackId ||
defaultTimeStamp.baseTime !== initPTS.baseTime ||
defaultTimeStamp.timescale !== initPTS.timescale) ;
this._initPTS = this._initDTS = defaultTimeStamp;
};
MP4Remuxer.prototype.resetNextTimestamp = function () {
this.isVideoContiguous = false;
this.isAudioContiguous = false;
};
MP4Remuxer.prototype.resetInitSegment = function () {
this.ISGenerated = false;
this.videoTrackConfig = undefined;
};
MP4Remuxer.prototype.getVideoStartPts = function (videoSamples) {
var firstPts = videoSamples[0].pts;
var startPTS = videoSamples.reduce(function (minPTS, sample) {
var pts = sample.pts;
var delta = pts - minPTS;
if (delta < -4294967296) {
pts = normalizePts(pts, firstPts);
delta = pts - minPTS;
}
if (delta > 0) {
return minPTS;
}
return pts;
}, firstPts);
return startPTS;
};
MP4Remuxer.prototype.remux = function (audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset, flush, playlistType, chunkMeta) {
var _a, _b, _c, _d;
var video;
var audio;
var initSegment;
var text;
var id3;
var independent;
var audioTimeOffset = timeOffset;
var videoTimeOffset = timeOffset;
var iframesOnly = chunkMeta.iframe;
var hasAudio = !iframesOnly && audioTrack.pid > -1;
var hasVideo = videoTrack.pid > -1;
var length = videoTrack.samples.length;
var enoughAudioSamples = audioTrack.samples.length > 0;
var enoughVideoSamples = (flush && length > 0) || length > 1;
var canRemuxAvc = ((!hasAudio || enoughAudioSamples) &&
(!hasVideo || enoughVideoSamples)) ||
this.ISGenerated ||
flush;
if (canRemuxAvc) {
if (this.ISGenerated) {
var config = this.videoTrackConfig;
if ((config &&
(videoTrack.width !== config.width ||
videoTrack.height !== config.height ||
((_a = videoTrack.pixelRatio) === null || _a === void 0 ? void 0 : _a[0]) !== ((_b = config.pixelRatio) === null || _b === void 0 ? void 0 : _b[0]) ||
((_c = videoTrack.pixelRatio) === null || _c === void 0 ? void 0 : _c[1]) !== ((_d = config.pixelRatio) === null || _d === void 0 ? void 0 : _d[1]))) ||
(!config && enoughVideoSamples) ||
(this.nextAudioTs === null && enoughAudioSamples)) {
this.resetInitSegment();
}
}
if (!this.ISGenerated) {
initSegment = this.generateIS(audioTrack, videoTrack, timeOffset, accurateTimeOffset);
}
var isVideoContiguous = this.isVideoContiguous;
var firstKeyFrameIndex = -1;
var firstKeyFramePTS = void 0;
if (enoughVideoSamples) {
firstKeyFrameIndex = findKeyframeIndex(videoTrack.samples);
if (!isVideoContiguous && this.config.forceKeyFrameOnDiscontinuity) {
independent = true;
if (firstKeyFrameIndex > 0) {
this.warn("Dropped ".concat(firstKeyFrameIndex, " out of ").concat(length, " video samples due to a missing keyframe"));
var startPTS = this.getVideoStartPts(videoTrack.samples);
videoTrack.samples = videoTrack.samples.slice(firstKeyFrameIndex);
videoTrack.dropped += firstKeyFrameIndex;
videoTimeOffset +=
(videoTrack.samples[0].pts - startPTS) /
videoTrack.inputTimeScale;
firstKeyFramePTS = videoTimeOffset;
}
else if (firstKeyFrameIndex === -1) {
this.warn("No keyframe found out of ".concat(length, " video samples"));
independent = false;
}
}
}
if (this.ISGenerated) {
if (enoughAudioSamples && enoughVideoSamples && timeOffset) {
var startPTS = this.getVideoStartPts(videoTrack.samples);
var tsDelta = normalizePts(audioTrack.samples[0].pts, startPTS) - startPTS;
var audiovideoTimestampDelta = tsDelta / videoTrack.inputTimeScale;
audioTimeOffset += Math.max(0, audiovideoTimestampDelta);
videoTimeOffset += Math.max(0, -audiovideoTimestampDelta);
}
if (enoughAudioSamples) {
if (!audioTrack.samplerate) {
this.warn('regenerate InitSegment as audio detected');
initSegment = this.generateIS(audioTrack, videoTrack, timeOffset, accurateTimeOffset);
}
audio = this.remuxAudio(audioTrack, audioTimeOffset, this.isAudioContiguous, accurateTimeOffset, hasVideo ||
enoughVideoSamples ||
playlistType === PlaylistLevelType.AUDIO
? videoTimeOffset
: undefined, chunkMeta);
if (enoughVideoSamples) {
var audioTrackLength = audio ? audio.endPTS - audio.startPTS : 0;
if (!videoTrack.inputTimeScale) {
this.warn('regenerate InitSegment as video detected');
initSegment = this.generateIS(audioTrack, videoTrack, timeOffset, accurateTimeOffset);
}
video = this.remuxVideo(videoTrack, videoTimeOffset, isVideoContiguous, audioTrackLength, chunkMeta);
}
}
else if (enoughVideoSamples) {
video = this.remuxVideo(videoTrack, videoTimeOffset, isVideoContiguous, 0, chunkMeta);
}
if (video) {
video.firstKeyFrame = firstKeyFrameIndex;
video.independent = firstKeyFrameIndex !== -1;
video.firstKeyFramePTS = firstKeyFramePTS;
}
}
}
if (this.ISGenerated && this._initPTS && this._initDTS) {
if (id3Track.samples.length) {
id3 = flushTextTrackMetadataCueSamples(id3Track, timeOffset, this._initPTS, this._initDTS);
}
if (textTrack.samples.length) {
text = flushTextTrackUserdataCueSamples(textTrack, timeOffset, this._initPTS);
}
}
return {
audio: audio,
video: video,
initSegment: initSegment,
independent: independent,
text: text,
id3: id3,
};
};
MP4Remuxer.prototype.computeInitPts = function (basetime, timescale, presentationTime, type) {
var offset = Math.round(presentationTime * timescale);
var timestamp = normalizePts(basetime, offset);
if (timestamp < offset) {
while (timestamp < offset) {
timestamp += MPEG_TS_PTS_ROLLOVER;
}
}
return timestamp - offset;
};
MP4Remuxer.prototype.generateIS = function (audioTrack, videoTrack, timeOffset, accurateTimeOffset) {
var audioSamples = audioTrack.samples;
var videoSamples = videoTrack.samples;
var typeSupported = this.typeSupported;
var tracks = {};
var _initPTS = this._initPTS;
var computePTSDTS = !_initPTS || accurateTimeOffset;
var container = 'audio/mp4';
var initPTS;
var initDTS;
var timescale;
var trackId = -1;
if (computePTSDTS) {
initPTS = initDTS = Infinity;
}
if (audioTrack.config && audioSamples.length) {
audioTrack.timescale = audioTrack.samplerate;
switch (audioTrack.segmentCodec) {
case 'mp3':
if (typeSupported.mpeg) {
container = 'audio/mpeg';
audioTrack.codec = '';
}
else if (typeSupported.mp3) {
audioTrack.codec = 'mp3';
}
break;
case 'ac3':
audioTrack.codec = 'ac-3';
break;
}
tracks.audio = {
id: 'audio',
container: container,
codec: audioTrack.codec,
initSegment: audioTrack.segmentCodec === 'mp3' && typeSupported.mpeg
? new Uint8Array(0)
: MP4.initSegment([audioTrack]),
metadata: {
channelCount: audioTrack.channelCount,
},
};
if (computePTSDTS) {
trackId = audioTrack.id;
timescale = audioTrack.inputTimeScale;
var initBaseTimestamp = this.computeInitPts(audioSamples[0].pts, timescale, timeOffset, 'audio');
if (!_initPTS ||
timescale !== _initPTS.timescale ||
(timeOffset === 0 && initBaseTimestamp < _initPTS.baseTime)) {
initPTS = initDTS = initBaseTimestamp;
}
}
}
if (videoTrack.sps && videoTrack.pps && videoSamples.length) {
videoTrack.timescale = videoTrack.inputTimeScale;
tracks.video = {
id: 'main',
container: 'video/mp4',
codec: videoTrack.codec,
initSegment: MP4.initSegment([videoTrack]),
metadata: {
width: videoTrack.width,
height: videoTrack.height,
},
};
if (computePTSDTS) {
trackId = videoTrack.id;
timescale = videoTrack.inputTimeScale;
var basePTS = this.getVideoStartPts(videoSamples);
var baseDTS = normalizePts(videoSamples[0].dts, basePTS);
var videoInitDTS = this.computeInitPts(baseDTS, timescale, timeOffset, 'video');
var videoInitPTS = this.computeInitPts(basePTS, timescale, timeOffset, 'video');
if (!_initPTS ||
timescale !== _initPTS.timescale ||
Number.isFinite(initPTS) ||
(timeOffset === 0 && videoInitPTS < _initPTS.baseTime)) {
initDTS = Math.min(initDTS, videoInitDTS);
var videoInit = !_initPTS && this.isVideoContiguous ? videoInitPTS : videoInitDTS;
initPTS = Math.min(initPTS, videoInit);
}
}
this.videoTrackConfig = {
width: videoTrack.width,
height: videoTrack.height,
pixelRatio: videoTrack.pixelRatio,
};
}
if (Object.keys(tracks).length) {
this.ISGenerated = true;
if (computePTSDTS && Number.isFinite(initPTS)) {
if (_initPTS) {
this.warn("Timestamps at playlist time: ".concat(accurateTimeOffset ? '' : '~').concat(timeOffset, " ").concat(initPTS / timescale, " != initPTS: ").concat(_initPTS.baseTime / _initPTS.timescale, " (").concat(_initPTS.baseTime, "/").concat(_initPTS.timescale, ") trackId: ").concat(_initPTS.trackId));
}
this._initPTS = {
baseTime: initPTS,
timescale: timescale,
trackId: trackId,
};
this._initDTS = {
baseTime: initDTS,
timescale: timescale,
trackId: trackId,
};
}
else {
initPTS = timescale = undefined;
}
return {
tracks: tracks,
initPTS: initPTS,
timescale: timescale,
trackId: trackId,
};
}
};
MP4Remuxer.prototype.remuxVideo = function (track, timeOffset, contiguous, audioTrackLength, chunkMeta) {
var timeScale = track.inputTimeScale;
var inputSamples = track.samples;
var outputSamples = [];
var nbSamples = inputSamples.length;
var initPTS = this._initPTS;
var initTime = (initPTS.baseTime * timeScale) / initPTS.timescale;
var nextVideoTs = this.nextVideoTs;
var offset = 8;
var mp4SampleDuration = this.videoSampleDuration;
var firstDTS;
var lastDTS;
var minPTS = Number.POSITIVE_INFINITY;
var maxPTS = Number.NEGATIVE_INFINITY;
var sortSamples = false;
if (!contiguous || nextVideoTs === null) {
var pts = initTime + timeOffset * timeScale;
var cts = inputSamples[0].pts -
normalizePts(inputSamples[0].dts, inputSamples[0].pts);
if (userAgentChromeVersion() &&
nextVideoTs !== null &&
Math.abs(pts - cts - (nextVideoTs + initTime)) < 15000) {
contiguous = true;
}
else {
nextVideoTs = pts - cts - initTime;
}
}
var nextVideoPts = nextVideoTs + initTime;
for (var i = 0; i < nbSamples; i++) {
var sample = inputSamples[i];
sample.pts = normalizePts(sample.pts, nextVideoPts);
sample.dts = normalizePts(sample.dts, nextVideoPts);
if (sample.dts < inputSamples[i > 0 ? i - 1 : i].dts) {
sortSamples = true;
}
}
if (sortSamples) {
inputSamples.sort(function (a, b) {
var deltadts = a.dts - b.dts;
var deltapts = a.pts - b.pts;
return deltadts || deltapts;
});
}
firstDTS = inputSamples[0].dts;
lastDTS = inputSamples[inputSamples.length - 1].dts;
var inputDuration = lastDTS - firstDTS;
var averageSampleDuration = inputDuration
? Math.round(inputDuration / (nbSamples - 1))
: mp4SampleDuration || track.inputTimeScale / 30;
if (contiguous) {
var delta = firstDTS - nextVideoPts;
var foundHole = delta > averageSampleDuration;
var foundOverlap = delta < -1;
if (foundHole || foundOverlap) {
if (foundHole) {
this.warn("".concat((track.segmentCodec || '').toUpperCase(), ": ").concat(toMsFromMpegTsClock(delta, true), " ms (").concat(delta, "dts) hole between fragments detected at ").concat(timeOffset.toFixed(3)));
}
else {
this.warn("".concat((track.segmentCodec || '').toUpperCase(), ": ").concat(toMsFromMpegTsClock(-delta, true), " ms (").concat(delta, "dts) overlapping between fragments detected at ").concat(timeOffset.toFixed(3)));
}
if (!foundOverlap ||
nextVideoPts >= inputSamples[0].pts ||
userAgentChromeVersion()) {
firstDTS = nextVideoPts;
var firstPTS = inputSamples[0].pts - delta;
if (foundHole) {
inputSamples[0].dts = firstDTS;
inputSamples[0].pts = firstPTS;
}
else {
var isPTSOrderRetained = true;
for (var i = 0; i < inputSamples.length; i++) {
if (inputSamples[i].dts > firstPTS && isPTSOrderRetained) {
break;
}
var prevPTS = inputSamples[i].pts;
inputSamples[i].dts -= delta;
inputSamples[i].pts -= delta;
if (i < inputSamples.length - 1) {
var nextSamplePTS = inputSamples[i + 1].pts;
var currentSamplePTS = inputSamples[i].pts;
var currentOrder = nextSamplePTS <= currentSamplePTS;
var prevOrder = nextSamplePTS <= prevPTS;
isPTSOrderRetained = currentOrder == prevOrder;
}
}
}
}
}
}
firstDTS = Math.max(0, firstDTS);
var nbNalu = 0;
var naluLen = 0;
var dtsStep = firstDTS;
for (var i = 0; i < nbSamples; i++) {
var sample = inputSamples[i];
var units = sample.units;
var nbUnits = units.length;
var sampleLen = 0;
for (var j = 0; j < nbUnits; j++) {
sampleLen += units[j].data.length;
}
naluLen += sampleLen;
nbNalu += nbUnits;
sample.length = sampleLen;
if (sample.dts < dtsStep) {
sample.dts = dtsStep;
dtsStep += (averageSampleDuration / 4) | 0 || 1;
}
else {
dtsStep = sample.dts;
}
minPTS = Math.min(sample.pts, minPTS);
maxPTS = Math.max(sample.pts, maxPTS);
}
lastDTS = inputSamples[nbSamples - 1].dts;
var mdatSize = naluLen + 4 * nbNalu + 8;
var mdat;
try {
mdat = new Uint8Array(mdatSize);
}
catch (err) {
this.observer.emit(Events.ERROR, Events.ERROR, {
type: ErrorTypes.MUX_ERROR,
details: ErrorDetails.REMUX_ALLOC_ERROR,
fatal: false,
chunkMeta: chunkMeta,
error: err,
bytes: mdatSize,
reason: "fail allocating video mdat ".concat(mdatSize),
});
return;
}
writeUint32(mdat, 0, mdatSize);
writeUint32(mdat, 4, types.mdat);
var stretchedLastFrame = false;
var minDtsDelta = Number.POSITIVE_INFINITY;
var minPtsDelta = Number.POSITIVE_INFINITY;
var maxDtsDelta = Number.NEGATIVE_INFINITY;
var maxPtsDelta = Number.NEGATIVE_INFINITY;
for (var i = 0; i < nbSamples; i++) {
var VideoSample = inputSamples[i];
var VideoSampleUnits = VideoSample.units;
var mp4SampleLength = 0;
for (var j = 0, nbUnits = VideoSampleUnits.length; j < nbUnits; j++) {
var unit = VideoSampleUnits[j];
var unitData = unit.data;
var unitDataLen = unit.data.byteLength;
writeUint32(mdat, offset, unitDataLen);
offset += 4;
mdat.set(unitData, offset);
offset += unitDataLen;
mp4SampleLength += 4 + unitDataLen;
}
var ptsDelta = void 0;
if (i < nbSamples - 1) {
mp4SampleDuration = inputSamples[i + 1].dts - VideoSample.dts;
ptsDelta = inputSamples[i + 1].pts - VideoSample.pts;
}
else {
var config = this.config;
var lastFrameDuration = i > 0
? VideoSample.dts - inputSamples[i - 1].dts
: averageSampleDuration;
ptsDelta =
i > 0
? VideoSample.pts - inputSamples[i - 1].pts
: averageSampleDuration;
if (config.stretchShortVideoTrack && this.nextAudioTs !== null) {
var gapTolerance = Math.floor(config.maxBufferHole * timeScale);
var deltaToFrameEnd = (audioTrackLength
? minPTS + audioTrackLength * timeScale
: this.nextAudioTs + initTime) - VideoSample.pts;
if (deltaToFrameEnd > gapTolerance) {
mp4SampleDuration = deltaToFrameEnd - lastFrameDuration;
if (mp4SampleDuration < 0) {
mp4SampleDuration = lastFrameDuration;
}
else {
stretchedLastFrame = true;
}
}
else {
mp4SampleDuration = lastFrameDuration;
}
}
else {
mp4SampleDuration = lastFrameDuration;
}
}
var compositionTimeOffset = Math.round(VideoSample.pts - VideoSample.dts);
minDtsDelta = Math.min(minDtsDelta, mp4SampleDuration);
maxDtsDelta = Math.max(maxDtsDelta, mp4SampleDuration);
minPtsDelta = Math.min(minPtsDelta, ptsDelta);
maxPtsDelta = Math.max(maxPtsDelta, ptsDelta);
if (!contiguous && i === 0 && compositionTimeOffset > mp4SampleDuration) {
var tickPaddedCompositionTime = Math.round(compositionTimeOffset / averageSampleDuration) *
averageSampleDuration;
if (tickPaddedCompositionTime - compositionTimeOffset === 1) {
compositionTimeOffset = tickPaddedCompositionTime;
}
}
outputSamples.push(createMp4Sample(VideoSample.key, mp4SampleDuration, mp4SampleLength, compositionTimeOffset));
}
if (outputSamples.length) {
var chromeVersion = userAgentChromeVersion();
if (chromeVersion) {
if (chromeVersion < 70) {
var flags = outputSamples[0].flags;
flags.dependsOn = 2;
flags.isNonSync = 0;
}
}
else if (userAgentSafariVersion()) {
if (maxPtsDelta - minPtsDelta < maxDtsDelta - minDtsDelta &&
averageSampleDuration / maxDtsDelta < 0.025 &&
outputSamples[0].cts === 0) {
this.warn('Found irregular gaps in sample duration. Using PTS instead of DTS to determine MP4 sample duration.');
var dts = firstDTS;
for (var i = 0, len = outputSamples.length; i < len; i++) {
var nextDts = dts + outputSamples[i].duration;
var pts = dts + outputSamples[i].cts;
if (i < len - 1) {
var nextPts = nextDts + outputSamples[i + 1].cts;
outputSamples[i].duration = nextPts - pts;
}
else {
outputSamples[i].duration = i
? outputSamples[i - 1].duration
: averageSampleDuration;
}
outputSamples[i].cts = 0;
dts = nextDts;
}
}
}
}
mp4SampleDuration =
stretchedLastFrame || !mp4SampleDuration
? averageSampleDuration
: mp4SampleDuration;
var endDTS = lastDTS + mp4SampleDuration;
this.nextVideoTs = nextVideoTs = endDTS - initTime;
this.videoSampleDuration = mp4SampleDuration;
this.isVideoContiguous = true;
var moof = MP4.moof(chunkMeta.sn, firstDTS, __bolli.assign(track, {
samples: outputSamples,
}));
var type = 'video';
var data = {
data1: moof,
data2: mdat,
startPTS: (minPTS - initTime) / timeScale,
endPTS: (maxPTS + mp4SampleDuration - initTime) / timeScale,
startDTS: (firstDTS - initTime) / timeScale,
endDTS: nextVideoTs / timeScale,
type: type,
hasAudio: false,
hasVideo: true,
nb: outputSamples.length,
dropped: track.dropped,
};
track.samples = [];
track.dropped = 0;
return data;
};
MP4Remuxer.prototype.getSamplesPerFrame = function (track) {
switch (track.segmentCodec) {
case 'mp3':
return MPEG_AUDIO_SAMPLE_PER_FRAME;
case 'ac3':
return AC3_SAMPLES_PER_FRAME;
default:
return AAC_SAMPLES_PER_FRAME;
}
};
MP4Remuxer.prototype.remuxAudio = function (track, timeOffset, contiguous, accurateTimeOffset, videoTimeOffset, chunkMeta) {
var inputTimeScale = track.inputTimeScale;
var mp4timeScale = track.samplerate
? track.samplerate
: inputTimeScale;
var scaleFactor = inputTimeScale / mp4timeScale;
var mp4SampleDuration = this.getSamplesPerFrame(track);
var inputSampleDuration = mp4SampleDuration * scaleFactor;
var initPTS = this._initPTS;
var rawMPEG = track.segmentCodec === 'mp3' && this.typeSupported.mpeg;
var outputSamples = [];
var alignedWithVideo = videoTimeOffset !== undefined;
var inputSamples = track.samples;
var offset = rawMPEG ? 0 : 8;
var nextAudioTs = this.nextAudioTs || -1;
var initTime = (initPTS.baseTime * inputTimeScale) / initPTS.timescale;
var timeOffsetMpegTS = initTime + timeOffset * inputTimeScale;
this.isAudioContiguous = contiguous =
contiguous ||
(inputSamples.length &&
nextAudioTs > 0 &&
((accurateTimeOffset &&
Math.abs(timeOffsetMpegTS - (nextAudioTs + initTime)) < 9000) ||
Math.abs(normalizePts(inputSamples[0].pts, timeOffsetMpegTS) -
(nextAudioTs + initTime)) <
20 * inputSampleDuration));
inputSamples.forEach(function (sample) {
sample.pts = normalizePts(sample.pts, timeOffsetMpegTS);
});
if (!contiguous || nextAudioTs < 0) {
var sampleCount = inputSamples.length;
inputSamples = inputSamples.filter(function (sample) { return sample.pts >= 0; });
if (sampleCount !== inputSamples.length) {
this.warn("Removed ".concat(inputSamples.length - sampleCount, " of ").concat(sampleCount, " samples (initPTS ").concat(initTime, " / ").concat(inputTimeScale, ")"));
}
if (!inputSamples.length) {
return;
}
if (videoTimeOffset === 0) {
nextAudioTs = 0;
}
else if (accurateTimeOffset && !alignedWithVideo) {
nextAudioTs = Math.max(0, timeOffsetMpegTS - initTime);
}
else {
nextAudioTs = inputSamples[0].pts - initTime;
}
}
if (track.segmentCodec === 'aac') {
var maxAudioFramesDrift = this.config.maxAudioFramesDrift;
for (var i = 0, nextPts = nextAudioTs + initTime; i < inputSamples.length; i++) {
var sample = inputSamples[i];
var pts = sample.pts;
var delta = pts - nextPts;
var duration = Math.abs((1000 * delta) / inputTimeScale);
if (delta <= -maxAudioFramesDrift * inputSampleDuration &&
alignedWithVideo) {
if (i === 0) {
this.warn("Audio frame @ ".concat((pts / inputTimeScale).toFixed(3), "s overlaps marker by ").concat(Math.round((1000 * delta) / inputTimeScale), " ms."));
this.nextAudioTs = nextAudioTs = pts - initTime;
nextPts = pts;
}
}
else if (delta >= maxAudioFramesDrift * inputSampleDuration &&
duration < MAX_SILENT_FRAME_DURATION &&
alignedWithVideo) {
var missing = Math.round(delta / inputSampleDuration);
nextPts = pts - missing * inputSampleDuration;
while (nextPts < initTime && missing && inputSampleDuration) {
missing--;
nextPts += inputSampleDuration;
}
if (i === 0) {
this.nextAudioTs = nextAudioTs = nextPts - initTime;
}
this.warn("Injecting ".concat(missing, " audio frames @ ").concat(((nextPts - initTime) /
inputTimeScale).toFixed(3), "s due to ").concat(Math.round((1000 * delta) / inputTimeScale), " ms gap."));
for (var j = 0; j < missing; j++) {
var fillFrame = AAC.getSilentFrame(track.parsedCodec || track.manifestCodec || track.codec, track.channelCount);
if (!fillFrame) {
fillFrame = sample.unit.subarray();
}
inputSamples.splice(i, 0, {
unit: fillFrame,
pts: nextPts,
});
nextPts += inputSampleDuration;
i++;
}
}
sample.pts = nextPts;
nextPts += inputSampleDuration;
}
}
var firstPTS = null;
var lastPTS = null;
var mdat;
var mdatSize = 0;
var sampleLength = inputSamples.length;
while (sampleLength--) {
mdatSize += inputSamples[sampleLength].unit.byteLength;
}
for (var j = 0, nbSamples_1 = inputSamples.length; j < nbSamples_1; j++) {
var audioSample = inputSamples[j];
var unit = audioSample.unit;
var pts = audioSample.pts;
if (lastPTS !== null) {
var prevSample = outputSamples[j - 1];
prevSample.duration = Math.round((pts - lastPTS) / scaleFactor);
}
else {
if (contiguous && track.segmentCodec === 'aac') {
pts = nextAudioTs + initTime;
}
firstPTS = pts;
if (mdatSize > 0) {
mdatSize += offset;
try {
mdat = new Uint8Array(mdatSize);
}
catch (err) {
this.observer.emit(Events.ERROR, Events.ERROR, {
type: ErrorTypes.MUX_ERROR,
details: ErrorDetails.REMUX_ALLOC_ERROR,
fatal: false,
chunkMeta: chunkMeta,
error: err,
bytes: mdatSize,
reason: "fail allocating audio mdat ".concat(mdatSize),
});
return;
}
if (!rawMPEG) {
writeUint32(mdat, 0, mdatSize);
writeUint32(mdat, 4, types.mdat);
}
}
else {
return;
}
}
if (mdat) {
mdat.set(unit, offset);
}
var unitLen = unit.byteLength;
offset += unitLen;
outputSamples.push(createMp4Sample(true, mp4SampleDuration, unitLen, 0));
lastPTS = pts;
}
var nbSamples = outputSamples.length;
if (!nbSamples) {
return;
}
var lastSample = outputSamples[outputSamples.length - 1];
nextAudioTs = lastPTS - initTime;
this.nextAudioTs = nextAudioTs + scaleFactor * lastSample.duration;
var moof = rawMPEG
? new Uint8Array(0)
: MP4.moof(track.sequenceNumber++, firstPTS / scaleFactor, __bolli.assign({}, track, { samples: outputSamples }));
track.samples = [];
var start = (firstPTS - initTime) / inputTimeScale;
var end = this.nextAudioTs / inputTimeScale;
var type = 'audio';
var audioData = {
data1: moof,
data2: mdat,
startPTS: start,
endPTS: end,
startDTS: start,
endDTS: end,
type: type,
hasAudio: true,
hasVideo: false,
nb: nbSamples,
};
this.isAudioContiguous = true;
return audioData;
};
return MP4Remuxer;
}(Logger));
function normalizePts(value, reference) {
var offset;
if (reference === null) {
return value;
}
if (reference < value) {
offset = -MPEG_TS_PTS_ROLLOVER;
}
else {
offset = MPEG_TS_PTS_ROLLOVER;
}
while (Math.abs(value - reference) > 4294967296) {
value += offset;
}
return value;
}
function findKeyframeIndex(samples) {
for (var i = 0; i < samples.length; i++) {
if (samples[i].key) {
return i;
}
}
return -1;
}
function flushTextTrackMetadataCueSamples(track, timeOffset, initPTS, initDTS) {
var length = track.samples.length;
if (!length) {
return;
}
var inputTimeScale = track.inputTimeScale;
for (var index = 0; index < length; index++) {
var sample = track.samples[index];
sample.pts =
normalizePts(sample.pts - (initPTS.baseTime * inputTimeScale) / initPTS.timescale, timeOffset * inputTimeScale) / inputTimeScale;
sample.dts =
normalizePts(sample.dts - (initDTS.baseTime * inputTimeScale) / initDTS.timescale, timeOffset * inputTimeScale) / inputTimeScale;
}
var samples = track.samples;
track.samples = [];
return {
samples: samples,
};
}
function flushTextTrackUserdataCueSamples(track, timeOffset, initPTS) {
var length = track.samples.length;
if (!length) {
return;
}
var inputTimeScale = track.inputTimeScale;
for (var index = 0; index < length; index++) {
var sample = track.samples[index];
sample.pts =
normalizePts(sample.pts - (initPTS.baseTime * inputTimeScale) / initPTS.timescale, timeOffset * inputTimeScale) / inputTimeScale;
}
track.samples.sort(function (a, b) { return a.pts - b.pts; });
var samples = track.samples;
track.samples = [];
return {
samples: samples,
};
}
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
function isCodecMediaSourceSupported(codec, type, preferManagedMediaSource) {
var _a;
if (preferManagedMediaSource === void 0) { preferManagedMediaSource = true; }
var MediaSource = getMediaSource(preferManagedMediaSource);
return (_a = MediaSource === null || MediaSource === void 0 ? void 0 : MediaSource.isTypeSupported(mimeTypeForCodec(codec, type))) !== null && _a !== void 0 ? _a : false;
}
function mimeTypeForCodec(codec, type) {
return "".concat(type, "/mp4;codecs=").concat(codec);
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
var PassThroughRemuxer = (function (_super) {
__extends(PassThroughRemuxer, _super);
function PassThroughRemuxer(observer, config, typeSupported, logger) {
var _this = _super.call(this, 'passthrough-remuxer', logger) || this;
_this.emitInitSegment = false;
_this.initPTS = null;
_this.lastEndTime = null;
_this.isVideoContiguous = false;
_this.videoOnlyRemux = false;
_this.decryptdata = null;
_this.observer = observer;
return _this;
}
PassThroughRemuxer.prototype.destroy = function () {
if (this.observer) {
this.observer.removeAllListeners();
}
this.observer = null;
};
PassThroughRemuxer.prototype.resetTimeStamp = function (defaultInitPTS) {
this.lastEndTime = null;
var initPTS = this.initPTS;
if (initPTS && defaultInitPTS) {
if (initPTS.baseTime === defaultInitPTS.baseTime &&
initPTS.timescale === defaultInitPTS.timescale) {
return;
}
}
this.initPTS = defaultInitPTS;
};
PassThroughRemuxer.prototype.resetNextTimestamp = function () {
this.isVideoContiguous = false;
this.lastEndTime = null;
};
PassThroughRemuxer.prototype.resetInitSegment = function (initSegment, audioCodec, videoCodec, decryptdata) {
this.audioCodec = audioCodec;
this.videoCodec = videoCodec;
this.decryptdata = decryptdata;
this.pendingInitSegment = initSegment;
this.videoOnlyRemux = false;
this.initTracks = undefined;
this.initData = undefined;
this.emitInitSegment = true;
};
PassThroughRemuxer.prototype.generateInitSegment = function (initSegment, decryptdata, parsedInitData) {
this.videoOnlyRemux = false;
var _a = this, audioCodec = _a.audioCodec, videoCodec = _a.videoCodec;
if (!(initSegment === null || initSegment === void 0 ? void 0 : initSegment.byteLength)) {
this.initTracks = undefined;
this.initData = undefined;
return;
}
var _b = (this.initData =
parsedInitData || parseInitSegment(initSegment)), audio = _b.audio, video = _b.video;
if (decryptdata) {
patchEncyptionData(initSegment, decryptdata);
}
else {
var eitherTrack = audio || video;
if (eitherTrack === null || eitherTrack === void 0 ? void 0 : eitherTrack.encrypted) {
this.warn("Init segment with encrypted track with has no key (\"".concat(eitherTrack.codec, "\")!"));
}
}
if (audio) {
audioCodec = getParsedTrackCodec(audio, "audio", this);
}
if (video) {
videoCodec = getParsedTrackCodec(video, "video", this);
}
var tracks = {};
if (audio && video) {
tracks.audiovideo = {
container: 'video/mp4',
codec: audioCodec + ',' + videoCodec,
supplemental: video.supplemental,
encrypted: video.encrypted,
initSegment: initSegment,
id: 'main',
};
}
else if (audio) {
tracks.audio = {
container: 'audio/mp4',
codec: audioCodec,
encrypted: audio.encrypted,
initSegment: initSegment,
id: 'audio',
};
}
else if (video) {
tracks.video = {
container: 'video/mp4',
codec: videoCodec,
supplemental: video.supplemental,
encrypted: video.encrypted,
initSegment: initSegment,
id: 'main',
};
}
else {
this.warn('initSegment does not contain moov or trak boxes.');
}
this.initTracks = tracks;
};
PassThroughRemuxer.prototype.remux = function (audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset, flush, playlistType, chunkMeta, parsedInitData, parsedSampleData) {
var _e = this, initPTS = _e.initPTS, lastEndTime = _e.lastEndTime;
var result = {
audio: undefined,
video: undefined,
text: undefined,
id3: id3Track,
initSegment: undefined,
};
if (!Number.isFinite(lastEndTime)) {
lastEndTime = this.lastEndTime = timeOffset || 0;
}
var data = videoTrack.samples;
if (!data.length) {
return result;
}
var pendingInitSegment = this.pendingInitSegment;
if (pendingInitSegment) {
this.pendingInitSegment = undefined;
this.generateInitSegment(pendingInitSegment, this.decryptdata, parsedInitData);
}
var initSegment = {
initPTS: undefined,
timescale: undefined,
trackId: undefined,
};
var initData = this.initData;
if (!(initData === null || initData === void 0 ? void 0 : initData.length)) {
this.generateInitSegment(data);
initData = this.initData;
}
if (!(initData === null || initData === void 0 ? void 0 : initData.length)) {
this.warn('Failed to generate initSegment.');
return result;
}
if (this.emitInitSegment) {
initSegment.tracks = this.initTracks;
result.initSegment = initSegment;
this.emitInitSegment = false;
}
var includeSampleDetails = false;
var trackSampleData = parsedSampleData &&
(!includeSampleDetails)
? parsedSampleData.tracks
: getSampleData(data, initData, chunkMeta, this);
var audioSampleTimestamps = initData.audio
? trackSampleData[initData.audio.id]
: null;
var videoSampleTimestamps = initData.video
? trackSampleData[initData.video.id]
: null;
var hasAudio = !!initData.audio;
var hasVideo = !!initData.video;
var type = '';
if (hasAudio) {
type += 'audio';
}
if (hasVideo) {
type += 'video';
}
var videoStartTime = toStartEndOrDefault(videoSampleTimestamps, Infinity);
var audioStartTime = toStartEndOrDefault(audioSampleTimestamps, Infinity);
var videoEndTime = toStartEndOrDefault(videoSampleTimestamps, 0, true);
var audioEndTime = toStartEndOrDefault(audioSampleTimestamps, 0, true);
var decodeTime = timeOffset;
var duration = 0;
if (videoSampleTimestamps &&
audioSampleTimestamps &&
initData.audio &&
(audioStartTime > videoEndTime || videoStartTime > audioEndTime)) {
this.warn("audio and video track sample timestamps do not overlap. v: ".concat(videoStartTime, "-").concat(videoEndTime, " a: ").concat(audioStartTime, "-").concat(audioEndTime, "}"), videoSampleTimestamps, audioSampleTimestamps);
}
var syncOnAudio = !!audioSampleTimestamps &&
(!videoSampleTimestamps ||
(!initPTS && audioStartTime < videoStartTime) ||
(!!initPTS && initPTS.trackId === initData.audio.id));
var baseOffsetSamples = syncOnAudio
? audioSampleTimestamps
: videoSampleTimestamps;
if (!baseOffsetSamples) {
return result;
}
var data1 = data;
var data2;
{
duration = syncOnAudio
? audioEndTime - audioStartTime
: videoEndTime - videoStartTime;
}
var timescale = baseOffsetSamples.timescale;
var baseTime = baseOffsetSamples.start - timeOffset * timescale;
var trackId = syncOnAudio ? initData.audio.id : initData.video.id;
decodeTime = baseOffsetSamples.start / timescale;
var continuesSegment = !!initPTS && chunkMeta.id > 1;
if (!continuesSegment &&
(accurateTimeOffset || !initPTS) &&
(isInvalidInitPts(initPTS, decodeTime, timeOffset, duration) ||
timescale !== initPTS.timescale)) {
var detectedDrift = false;
if (initPTS) {
var driftEstimate = timeOffset !== 0 ? decodeTime / timeOffset : 1 + decodeTime / 1;
detectedDrift = decodeTime >= 0 && Math.abs(1 - driftEstimate) < 0.001;
}
if (!detectedDrift) {
initPTS = null;
initSegment.initPTS = baseTime;
initSegment.timescale = timescale;
initSegment.trackId = trackId;
}
}
if (!initPTS) {
if (!initSegment.timescale ||
initSegment.trackId === undefined ||
initSegment.initPTS === undefined) {
this.warn('Could not set initPTS');
initSegment.initPTS = decodeTime;
initSegment.timescale = 1;
initSegment.trackId = -1;
}
this.initPTS = initPTS = {
baseTime: initSegment.initPTS,
timescale: initSegment.timescale,
trackId: initSegment.trackId,
};
}
else {
initSegment.initPTS = initPTS.baseTime;
initSegment.timescale = initPTS.timescale;
initSegment.trackId = initPTS.trackId;
}
var startDTS = decodeTime - initPTS.baseTime / initPTS.timescale;
var endDTS = startDTS + duration;
var startPTS = hasVideo && (baseOffsetSamples === null || baseOffsetSamples === void 0 ? void 0 : baseOffsetSamples.ptsMin) !== undefined
? baseOffsetSamples.ptsMin / baseOffsetSamples.timescale -
initPTS.baseTime / initPTS.timescale
: startDTS;
var endPTS = hasVideo && (baseOffsetSamples === null || baseOffsetSamples === void 0 ? void 0 : baseOffsetSamples.ptsMax)
? baseOffsetSamples.ptsMax / baseOffsetSamples.timescale -
initPTS.baseTime / initPTS.timescale
: endDTS;
if (duration > 0) {
this.lastEndTime = endDTS;
}
else {
this.warn('Duration parsed from mp4 should be greater than zero');
this.resetNextTimestamp();
}
var encrypted = (initData.audio ? initData.audio.encrypted : false) ||
(initData.video ? initData.video.encrypted : false);
var track = {
data1: data1,
data2: data2,
startPTS: startPTS,
startDTS: startDTS,
endPTS: endPTS,
endDTS: endDTS,
type: type,
hasAudio: hasAudio,
hasVideo: hasVideo,
nb: 1,
dropped: 0,
encrypted: encrypted,
};
result.audio = hasAudio && !hasVideo ? track : undefined;
result.video = hasVideo ? track : undefined;
var isVideoContiguous = this.isVideoContiguous;
var videoSampleCount = videoSampleTimestamps === null || videoSampleTimestamps === void 0 ? void 0 : videoSampleTimestamps.sampleCount;
if (videoSampleCount) {
var firstKeyFrame = videoSampleTimestamps.keyFrameIndex;
var independent = firstKeyFrame !== -1;
track.nb = videoSampleCount;
track.dropped =
firstKeyFrame === 0 || isVideoContiguous
? 0
: independent
? firstKeyFrame
: videoSampleCount;
track.independent = independent;
track.firstKeyFrame = firstKeyFrame;
if (independent && videoSampleTimestamps.keyFrameStart) {
track.firstKeyFramePTS =
(videoSampleTimestamps.keyFrameStart - initPTS.baseTime) /
initPTS.timescale;
}
if (!isVideoContiguous) {
result.independent = independent;
}
this.isVideoContiguous || (this.isVideoContiguous = independent);
if (track.dropped) {
this.warn("fmp4 does not start with IDR: firstIDR ".concat(firstKeyFrame, "/").concat(videoSampleCount, " dropped: ").concat(track.dropped, " start: ").concat(track.firstKeyFramePTS || 'NA'));
}
}
result.initSegment = initSegment;
result.id3 = flushTextTrackMetadataCueSamples(id3Track, timeOffset, initPTS, initPTS);
if (textTrack.samples.length) {
result.text = flushTextTrackUserdataCueSamples(textTrack, timeOffset, initPTS);
}
return result;
};
return PassThroughRemuxer;
}(Logger));
function toStartEndOrDefault(trackTimes, defaultValue, end) {
if (end === void 0) { end = false; }
return (trackTimes === null || trackTimes === void 0 ? void 0 : trackTimes.start) !== undefined
? (trackTimes.start + (end ? trackTimes.duration : 0)) /
trackTimes.timescale
: defaultValue;
}
function isInvalidInitPts(initPTS, startDTS, timeOffset, duration) {
if (initPTS === null) {
return true;
}
var minDuration = Math.max(duration, 1);
var startTime = startDTS - initPTS.baseTime / initPTS.timescale;
return Math.abs(startTime - timeOffset) >= minDuration;
}
function getParsedTrackCodec(track, type, logger) {
var parsedCodec = track.codec;
if (parsedCodec && parsedCodec.length > 4) {
return parsedCodec;
}
if (type === "audio") {
if (parsedCodec === 'ec-3' ||
parsedCodec === 'ac-3' ||
parsedCodec === 'alac') {
return parsedCodec;
}
if (parsedCodec === 'fLaC' || parsedCodec === 'Opus') {
var preferManagedMediaSource = false;
return getCodecCompatibleName(parsedCodec, preferManagedMediaSource);
}
logger.warn("Unhandled audio codec \"".concat(parsedCodec, "\" in mp4 MAP"));
return parsedCodec || 'mp4a';
}
else if (parsedCodec === 'mjpg') {
return parsedCodec;
}
logger.warn("Unhandled video codec \"".concat(parsedCodec, "\" in mp4 MAP"));
return parsedCodec || 'avc1';
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
var now;
try {
now = self.performance.now.bind(self.performance);
}
catch (err) {
now = Date.now;
}
var muxConfig = [
{ demux: MP4Demuxer, remux: PassThroughRemuxer },
{ demux: TSDemuxer, remux: MP4Remuxer },
{ demux: AACDemuxer, remux: MP4Remuxer },
{ demux: MP3Demuxer, remux: MP4Remuxer },
];
var Transmuxer = (function () {
function Transmuxer(observer, typeSupported, config, vendor, id, logger) {
this.asyncResult = false;
this.decryptionPromise = null;
this.observer = observer;
this.typeSupported = typeSupported;
this.config = config;
this.id = id;
this.logger = logger;
}
Transmuxer.prototype.configure = function (transmuxConfig) {
this.transmuxConfig = transmuxConfig;
if (this.decrypter) {
this.decrypter.reset();
}
};
Transmuxer.prototype.push = function (data, decryptdata, chunkMeta, state) {
var _this = this;
if (!this.observer) {
return emptyResult(chunkMeta);
}
var stats = chunkMeta.transmuxing;
stats.executeStart = now();
var uintData = new Uint8Array(data);
var _a = this, currentTransmuxState = _a.currentTransmuxState, transmuxConfig = _a.transmuxConfig;
if (state) {
this.currentTransmuxState = state;
}
var _b = state || currentTransmuxState, contiguous = _b.contiguous, discontinuity = _b.discontinuity, trackSwitch = _b.trackSwitch, accurateTimeOffset = _b.accurateTimeOffset, timeOffset = _b.timeOffset, initSegmentChange = _b.initSegmentChange;
var audioCodec = transmuxConfig.audioCodec, videoCodec = transmuxConfig.videoCodec, defaultInitPts = transmuxConfig.defaultInitPts, duration = transmuxConfig.duration, initSegmentData = transmuxConfig.initSegmentData;
var keyData = getEncryptionType(uintData, decryptdata);
if (keyData && isFullSegmentEncryption(keyData.method)) {
var decrypter = this.getDecrypter();
var aesMode = getAesModeFromFullSegmentMethod(keyData.method);
this.asyncResult = true;
this.decryptionPromise = decrypter
.decrypt(uintData, keyData.key.buffer, keyData.iv.buffer, aesMode, chunkMeta.decryptRange)
.then(function (decryptedData) {
var result = _this.push(decryptedData, null, chunkMeta);
_this.decryptionPromise = null;
return result;
});
return this.decryptionPromise;
}
var resetMuxers = this.needsProbing(discontinuity, trackSwitch);
if (resetMuxers) {
var segmentFormatData = chunkMeta.iframe &&
initSegmentData &&
TSDemuxer.probe(initSegmentData, this.logger)
? initSegmentData
: uintData;
var error = this.configureTransmuxer(segmentFormatData);
if (error) {
this.logger.warn("[transmuxer] ".concat(error.message));
this.observer.emit(Events.ERROR, Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.FRAG_PARSING_ERROR,
fatal: false,
error: error,
reason: error.message,
});
stats.executeEnd = now();
return emptyResult(chunkMeta);
}
}
if (discontinuity || trackSwitch || initSegmentChange || resetMuxers) {
this.resetInitSegment(initSegmentData, audioCodec, videoCodec, duration, decryptdata, chunkMeta);
}
if (discontinuity || initSegmentChange || resetMuxers) {
this.resetInitialTimestamp(defaultInitPts);
}
if (!contiguous) {
this.resetContiguity();
}
var result = this.transmux(uintData, keyData, timeOffset, accurateTimeOffset, chunkMeta);
this.asyncResult = isPromise(result);
var currentState = this.currentTransmuxState;
currentState.contiguous = true;
currentState.discontinuity = false;
currentState.trackSwitch = false;
stats.executeEnd = now();
return result;
};
Transmuxer.prototype.flush = function (chunkMeta) {
var _this = this;
var stats = chunkMeta.transmuxing;
stats.executeStart = now();
var _a = this, decrypter = _a.decrypter, currentTransmuxState = _a.currentTransmuxState, decryptionPromise = _a.decryptionPromise;
if (decryptionPromise) {
this.asyncResult = true;
return decryptionPromise.then(function () {
return _this.flush(chunkMeta);
});
}
var transmuxResults = [];
var timeOffset = currentTransmuxState.timeOffset;
if (decrypter) {
var decryptedData = decrypter.flush();
if (decryptedData) {
transmuxResults.push(this.push(decryptedData.buffer, null, chunkMeta));
}
}
var _b = this, demuxer = _b.demuxer, remuxer = _b.remuxer;
if (!demuxer || !remuxer) {
stats.executeEnd = now();
var emptyResults = [emptyResult(chunkMeta)];
if (this.asyncResult) {
return Promise.resolve(emptyResults);
}
return emptyResults;
}
var demuxResultOrPromise = demuxer.flush(timeOffset, chunkMeta);
if (isPromise(demuxResultOrPromise)) {
this.asyncResult = true;
return demuxResultOrPromise.then(function (demuxResult) {
_this.flushRemux(transmuxResults, demuxResult, chunkMeta);
return transmuxResults;
});
}
this.flushRemux(transmuxResults, demuxResultOrPromise, chunkMeta);
if (this.asyncResult) {
return Promise.resolve(transmuxResults);
}
return transmuxResults;
};
Transmuxer.prototype.flushRemux = function (transmuxResults, demuxResult, chunkMeta) {
if (!this.remuxer) {
return;
}
var audioTrack = demuxResult.audioTrack, videoTrack = demuxResult.videoTrack, id3Track = demuxResult.id3Track, textTrack = demuxResult.textTrack;
var _a = this.currentTransmuxState, accurateTimeOffset = _a.accurateTimeOffset, timeOffset = _a.timeOffset;
var remuxResult = this.remuxer.remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset, true, this.id, chunkMeta, demuxResult.initData, demuxResult.sampleData);
transmuxResults.push({
remuxResult: remuxResult,
chunkMeta: chunkMeta,
});
chunkMeta.transmuxing.executeEnd = now();
};
Transmuxer.prototype.resetInitialTimestamp = function (defaultInitPts) {
var _a = this, demuxer = _a.demuxer, remuxer = _a.remuxer;
if (!demuxer || !remuxer) {
return;
}
demuxer.resetTimeStamp(defaultInitPts);
remuxer.resetTimeStamp(defaultInitPts);
};
Transmuxer.prototype.resetContiguity = function () {
var _a = this, demuxer = _a.demuxer, remuxer = _a.remuxer;
if (!demuxer || !remuxer) {
return;
}
demuxer.resetContiguity();
remuxer.resetNextTimestamp();
};
Transmuxer.prototype.resetInitSegment = function (initSegmentData, audioCodec, videoCodec, trackDuration, decryptdata, chunkMeta) {
var _a = this, demuxer = _a.demuxer, remuxer = _a.remuxer;
if (!demuxer || !remuxer) {
return;
}
demuxer.resetInitSegment(initSegmentData, audioCodec, videoCodec, trackDuration, decryptdata, chunkMeta);
remuxer.resetInitSegment(initSegmentData, audioCodec, videoCodec, decryptdata);
};
Transmuxer.prototype.destroy = function () {
if (this.demuxer) {
this.demuxer.destroy();
this.demuxer = undefined;
}
if (this.remuxer) {
this.remuxer.destroy();
this.remuxer = undefined;
}
if (this.observer) {
this.observer.removeAllListeners();
}
this.decryptionPromise = null;
this.decrypter = this.observer = undefined;
this.logger = this.config = this.probe = undefined;
};
Transmuxer.prototype.transmux = function (data, keyData, timeOffset, accurateTimeOffset, chunkMeta) {
var result;
if ((keyData === null || keyData === void 0 ? void 0 : keyData.method) === 'SAMPLE-AES') {
result = this.transmuxSampleAes(data, keyData, timeOffset, accurateTimeOffset, chunkMeta);
}
else {
result = this.transmuxUnencrypted(data, timeOffset, accurateTimeOffset, chunkMeta);
}
return result;
};
Transmuxer.prototype.transmuxUnencrypted = function (data, timeOffset, accurateTimeOffset, chunkMeta) {
var _a = this, demuxer = _a.demuxer, remuxer = _a.remuxer;
if (!demuxer || !remuxer) {
return emptyResult(chunkMeta);
}
var demuxResult = demuxer.demux(data, timeOffset, chunkMeta, false, !this.config.progressive);
var audioTrack = demuxResult.audioTrack, videoTrack = demuxResult.videoTrack, id3Track = demuxResult.id3Track, textTrack = demuxResult.textTrack;
var remuxResult = remuxer.remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, accurateTimeOffset, false, this.id, chunkMeta, demuxResult.initData, demuxResult.sampleData);
return {
remuxResult: remuxResult,
chunkMeta: chunkMeta,
};
};
Transmuxer.prototype.transmuxSampleAes = function (data, decryptData, timeOffset, accurateTimeOffset, chunkMeta) {
var _this = this;
if (!this.demuxer) {
return Promise.reject(new Error('no demuxer'));
}
return this.demuxer
.demuxSampleAes(data, decryptData, timeOffset, chunkMeta)
.then(function (demuxResult) {
var remuxResult = _this.remuxer.remux(demuxResult.audioTrack, demuxResult.videoTrack, demuxResult.id3Track, demuxResult.textTrack, timeOffset, accurateTimeOffset, false, _this.id, chunkMeta, demuxResult.initData, demuxResult.sampleData);
return {
remuxResult: remuxResult,
chunkMeta: chunkMeta,
};
});
};
Transmuxer.prototype.configureTransmuxer = function (data) {
var _a;
var _b = this, config = _b.config, observer = _b.observer, typeSupported = _b.typeSupported;
if (!observer) {
return;
}
var mux;
try {
for (var i = 0, len = muxConfig.length; i < len; i++) {
if ((_a = muxConfig[i].demux) === null || _a === void 0 ? void 0 : _a.probe(data, this.logger)) {
mux = muxConfig[i];
break;
}
}
}
catch (error) {
return error;
}
if (!mux) {
return new Error('Failed to find demuxer by probing fragment data');
}
var demuxer = this.demuxer;
var remuxer = this.remuxer;
var Demuxer = mux.demux;
var Remuxer = mux.remux;
if (!demuxer || !(demuxer instanceof Demuxer)) {
this.demuxer = new Demuxer(observer, config, typeSupported, this.logger);
this.probe = Demuxer.probe;
}
if (!remuxer || !(remuxer instanceof Remuxer)) {
this.remuxer = new Remuxer(observer, config, typeSupported, this.logger);
}
};
Transmuxer.prototype.needsProbing = function (discontinuity, trackSwitch) {
return !this.demuxer || !this.remuxer || discontinuity || trackSwitch;
};
Transmuxer.prototype.getDecrypter = function () {
var decrypter = this.decrypter;
if (!decrypter) {
decrypter = this.decrypter = new Decrypter(this.config);
}
return decrypter;
};
return Transmuxer;
}());
function getEncryptionType(data, decryptData) {
var encryptionType = null;
if (data.byteLength > 0 &&
(decryptData === null || decryptData === void 0 ? void 0 : decryptData.key) != null &&
decryptData.iv !== null &&
decryptData.method != null) {
encryptionType = decryptData;
}
return encryptionType;
}
var emptyResult = function (chunkMeta) { return ({
remuxResult: {},
chunkMeta: chunkMeta,
}); };
function isPromise(p) {
return 'then' in p && p.then instanceof Function;
}
var transmuxers = [];
{
startWorker();
}
function startWorker() {
self.addEventListener('message', function (ev) {
var data = ev.data;
var instanceNo = data.instanceNo;
if (instanceNo === undefined) {
return;
}
var transmuxer = transmuxers[instanceNo];
if (data.cmd === 'reset') {
delete transmuxers[data.resetNo];
if (transmuxer) {
transmuxer.destroy();
}
data.cmd = 'init';
}
if (data.cmd === 'init') {
var config = JSON.parse(data.config);
var observer = new EventEmitter();
observer.on(Events.FRAG_DECRYPTED, function (event, data) {
return forwardMessage(event, data, instanceNo);
});
observer.on(Events.ERROR, function (event, data) {
return forwardMessage(event, data, instanceNo);
});
var logger = enableLogs(config.debug, data.id);
forwardWorkerLogs(logger, instanceNo);
transmuxers[instanceNo] = new Transmuxer(observer, data.typeSupported, config, '', data.id, logger);
forwardMessage('init', null, instanceNo);
return;
}
if (!transmuxer) {
return;
}
switch (data.cmd) {
case 'configure': {
transmuxer.configure(data.config);
break;
}
case 'demux': {
var transmuxResult = transmuxer.push(data.data, data.decryptdata, data.chunkMeta, data.state);
if (isPromise(transmuxResult)) {
transmuxResult
.then(function (data) {
emitTransmuxComplete(self, data, instanceNo);
})
.catch(function (error) {
forwardMessage(Events.ERROR, {
instanceNo: instanceNo,
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.FRAG_PARSING_ERROR,
chunkMeta: data.chunkMeta,
fatal: false,
error: error,
err: error,
reason: "transmuxer-worker push error",
}, instanceNo);
});
}
else {
emitTransmuxComplete(self, transmuxResult, instanceNo);
}
break;
}
case 'flush': {
var chunkMeta_1 = data.chunkMeta;
var transmuxResult = transmuxer.flush(chunkMeta_1);
if (isPromise(transmuxResult)) {
transmuxResult
.then(function (results) {
handleFlushResult(self, results, chunkMeta_1, instanceNo);
})
.catch(function (error) {
forwardMessage(Events.ERROR, {
type: ErrorTypes.MEDIA_ERROR,
details: ErrorDetails.FRAG_PARSING_ERROR,
chunkMeta: data.chunkMeta,
fatal: false,
error: error,
err: error,
reason: "transmuxer-worker flush error",
}, instanceNo);
});
}
else {
handleFlushResult(self, transmuxResult, chunkMeta_1, instanceNo);
}
break;
}
}
});
}
function emitTransmuxComplete(self, transmuxResult, instanceNo) {
if (isEmptyResult(transmuxResult.remuxResult)) {
return false;
}
var transferable = [];
var _a = transmuxResult.remuxResult, audio = _a.audio, video = _a.video;
if (audio) {
addToTransferable(transferable, audio);
}
if (video) {
addToTransferable(transferable, video);
}
self.postMessage({ event: 'transmuxComplete', data: transmuxResult, instanceNo: instanceNo }, transferable);
return true;
}
function addToTransferable(transferable, track) {
if (track.data1) {
transferable.push(track.data1.buffer);
}
if (track.data2) {
transferable.push(track.data2.buffer);
}
}
function handleFlushResult(self, results, chunkMeta, instanceNo) {
var parsed = results.reduce(function (parsed, result) {
return emitTransmuxComplete(self, result, instanceNo) || parsed;
}, false);
if (!parsed) {
self.postMessage({
event: 'transmuxComplete',
data: results[0],
instanceNo: instanceNo,
});
}
self.postMessage({ event: 'flush', data: chunkMeta, instanceNo: instanceNo });
}
function forwardMessage(event, data, instanceNo) {
self.postMessage({ event: event, data: data, instanceNo: instanceNo });
}
function forwardWorkerLogs(logger, instanceNo) {
var _loop_1 = function (logFn) {
logger[logFn] = function () {
var message = Array.prototype.join.call(arguments, ' ');
forwardMessage('workerLog', {
logType: logFn,
message: message,
}, instanceNo);
};
};
for (var logFn in logger) {
_loop_1(logFn);
}
}
function isEmptyResult(remuxResult) {
return (!remuxResult.audio &&
!remuxResult.video &&
!remuxResult.text &&
!remuxResult.id3 &&
!remuxResult.initSegment);
}
})();
