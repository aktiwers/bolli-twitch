#!/usr/bin/env node
// Bolli Twitch's hls.js: third_party/hls.js (hls.js, Apache 2.0) compiled for Chrome 38 into apps/bolli-twitch/hls/:
// hls.js (the player, the global BolliHls, loaded by src/twitch/player/hls-loader.ts) and hls-worker.js (the
// segment conversion: MPEG-TS to fMP4, fMP4 passed through; the player starts it as a Web Worker).
//
// Everything it changes happens here, at build time; the vendored source stays as released:
// - Trims what Twitch never sends: hls.js's own feature switches off (DRM/EME, subtitles and captions, alternate audio,
//   CMCD, content steering, interstitials, I-frame tracks, variable substitution, AC-3 in MPEG-TS, media capability
//   queries), and modules that code which stays still uses replaced by stand-ins (TRIMMED, STUBS): AAC and MP3
//   segments (Twitch sends MPEG-TS, and fMP4 for newer past broadcasts and some live channels), encrypted streams,
//   and what the switches leave half in.
// - Compiles TypeScript to ES5 with TypeScript itself. Calls of library functions Chrome 38 lacks (String startsWith,
//   Object.assign, typed array slice, ...) go to small helpers inside the bundle instead, which use the browser's own
//   function where it has one (Android TV, desktop) and a fallback otherwise; no global is changed. A call whose
//   receiver is typed any but is named like one of those functions goes to a helper that checks at run time. A call of
//   a library function the build does not know, or a type error in a file that ends up in a bundle, stops it.
// - Converts segments only in the worker: the player's own copy of the converter (hls.js's fallback when no worker
//   can start) is left out, a third less code for the TV to parse on the main thread. A worker that fails is an hls.js
//   error (event 'demuxerWorker'): the session then plays on the TV's own player.
// - Puts hls.js's own worker start (loadWorker) on the bundle, so the app starts the worker once for its whole run.
// - Drops hls.js's trace, debug, info and log calls: they build their message strings even with logging off, work on
//   every fragment, append and playlist on the TV's slow CPU. Warnings and errors stay.
//
//   node tools/twitch_hls.mjs               build
//   node tools/twitch_hls.mjs --keep-logs   a build with hls.js's log calls (to read them: the test hook's debug(true))
//   node tools/twitch_hls.mjs --sizes       also each module's size (--all: every module)

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { rollup } from 'rollup';
import * as acorn from 'acorn';
import { compact, root } from './lib.mjs';

/** The hls.js release in third_party/hls.js (its src/ is that npm package's src/) */
const VERSION = '1.7.4';
const HLS = path.join(root, 'third_party', 'hls.js');
const SRC = path.join(HLS, 'src');
const DEPS = path.join(HLS, 'deps');
const OUT = path.join(root, 'apps', 'bolli-twitch', 'hls');
const TMP = path.join(root, 'build', 'twitch-hls');
const JS = path.join(TMP, 'js');

/** hls.js's build-time constants (its rollup config's define values), written into the code */
const DEFINES = {
    __USE_ALT_AUDIO__: false,
    __USE_EME_DRM__: false,
    __USE_SUBTITLES__: false,
    __USE_CMCD__: false,
    __USE_CONTENT_STEERING__: false,
    __USE_VARIABLE_SUBSTITUTION__: false,
    __USE_M2TS_ADVANCED_CODECS__: false,
    __USE_MEDIA_CAPABILITIES__: false,
    __USE_INTERSTITIALS__: false,
    __USE_IFRAMES__: false,
    __IN_WORKER__: true,
    __VERSION__: VERSION,
    __HLS_WORKER_BUNDLE__: undefined
};

/** Modules replaced by empty ones (every export undefined) because code that stays still names them: hls.js's
 * default config (CMCD, whose package is not here; the ID3 metadata track and cue handler nobody reads; the fetch
 * loader: the XMLHttpRequest one loads everything), and the demuxers the converter probes for segments Twitch never
 * sends (AAC, MP3: it skips an undefined one). fMP4 stays: Twitch's newer past broadcasts and some live channels
 * send it, and the TV's own player cannot play fMP4 HLS. */
const TRIMMED = [
    'controller/cmcd-controller', 'controller/id3-track-controller', 'utils/cues', 'utils/fetch-loader',
    'demux/audio/aacdemuxer', 'demux/audio/mp3demuxer'
];
/** Replaced by empty ones in the main bundle only: the converter's fMP4 parts. The main thread never converts (its
 * converter is a stand-in, below), but the stand-in takes the small types it shares with the worker from the
 * converter's module, which names them; without this the main bundle carries all of mp4-tools. */
const MAIN_TRIMMED = ['demux/mp4demuxer', 'remux/passthrough-remuxer'];

const ENCRYPTED = "throw new Error('encrypted streams are left out')";
/** Modules replaced by small stand-ins: classes made on every start whose work Twitch never needs (its streams are
 * not encrypted). A key tag is ignored, a decryption fails. */
const STUBS = {
    'crypt/decrypter': 'export default function Decrypter() {}\n' +
        'Decrypter.prototype.destroy = Decrypter.prototype.reset = function () {};\n' +
        `Decrypter.prototype.decrypt = function () { return Promise.reject(new Error('encrypted streams are left out')); };\n`,
    'demux/sample-aes': `export default function SampleAesDecrypter() { ${ENCRYPTED}; }\n`,
    'loader/key-loader': 'export default function KeyLoader() { this.emeController = null; }\n' +
        'KeyLoader.prototype.abort = KeyLoader.prototype.destroy = function () {};\n' +
        'KeyLoader.prototype.loadClear = function () { return null; };\n' +
        `KeyLoader.prototype.load = function () { ${ENCRYPTED}; };\n`,
    'loader/level-key': 'export function LevelKey(method, uri) { this.method = method; this.uri = uri; }\n' +
        'LevelKey.prototype.isSupported = function () { return false; };\n'
};

/** Types of a package hls.js names but does not ship here (CMCD is switched off) */
const CMCD_TYPES = 'export type CmcdCustomKey = `${string}-${string}`;\nexport type CmcdCustomValue = any;\n' +
    'export type CmcdEventReportConfig = any;\nexport type CmcdKey = any;\nexport type CmcdVersion = any;\nexport type Cmcd = any;\n';

/** Library members Chrome 38 has beyond ES5 (allowed as they are) */
const ALLOWED = new Set([
    'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Symbol',
    'MapConstructor.*', 'SetConstructor.*', 'WeakMapConstructor.*', 'WeakSetConstructor.*', 'Map.*', 'Set.*',
    'ReadonlyMap.*', 'ReadonlySet.*', 'WeakMap.*', 'WeakSet.*', 'Iterator.*', 'IterableIterator.*', 'MapIterator.*',
    'SetIterator.*', 'ArrayIterator.*', 'Promise.then', 'Promise.catch', 'PromiseConstructor.all',
    'PromiseConstructor.race', 'PromiseConstructor.resolve', 'PromiseConstructor.reject', 'PromiseLike.then',
    'Math.*', 'NumberConstructor.isFinite', 'NumberConstructor.isInteger', 'NumberConstructor.isNaN',
    'NumberConstructor.isSafeInteger', 'NumberConstructor.parseFloat', 'NumberConstructor.parseInt',
    'NumberConstructor.EPSILON', 'NumberConstructor.MAX_SAFE_INTEGER', 'NumberConstructor.MIN_SAFE_INTEGER',
    'ObjectConstructor.setPrototypeOf', 'ObjectConstructor.getOwnPropertySymbols', 'ObjectConstructor.is',
    'SymbolConstructor.iterator', 'Array.keys', 'Array.entries', 'String.normalize', 'ArrayBufferConstructor.isView',
    // A function's name: V8 had it long before ES2015
    'Function.name'
]);

/** Calls rewritten to a helper: 'Owner.member' -> helper (instance members get the receiver first) */
const REWRITE = {
    'String.startsWith': 'startsWith', 'String.endsWith': 'endsWith', 'String.includes': 'includes',
    'String.repeat': 'repeat', 'String.padStart': 'padStart', 'String.padEnd': 'padEnd',
    'Array.includes': 'includes', 'ReadonlyArray.includes': 'includes', 'Array.find': 'find',
    'ReadonlyArray.find': 'find', 'Array.findIndex': 'findIndex', 'ReadonlyArray.findIndex': 'findIndex',
    'Array.fill': 'fill',
    'ObjectConstructor.assign': 'assign', 'ObjectConstructor.values': 'values', 'ObjectConstructor.entries': 'entries',
    'ArrayConstructor.from': 'arrayFrom', 'StringConstructor.fromCodePoint': 'fromCodePoint'
};
const STATIC = new Set(['ObjectConstructor', 'ArrayConstructor', 'StringConstructor']);
const TYPED = new Set(['Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array',
    'Uint32Array', 'Float32Array', 'Float64Array']);
/** Typed array members Chrome 38 has */
const TYPED_NATIVE = new Set(['set', 'subarray', 'length', 'buffer', 'byteLength', 'byteOffset', 'BYTES_PER_ELEMENT']);
/** Typed array methods rewritten (to 'ta_' + name) */
const TYPED_POLY = new Set(['slice', 'fill', 'indexOf', 'lastIndexOf', 'includes', 'join', 'forEach', 'map', 'filter',
    'reduce', 'every', 'some', 'find', 'findIndex', 'reverse', 'toString']);
/** Method names that, called on a receiver typed any, go to 'any_' + name: every name rewritten above (toString
 * aside: every object has one) */
const ANY_NAMES = new Set([...Object.keys(REWRITE).filter((k) => !STATIC.has(k.split('.')[0])).map((k) => REWRITE[k]),
    ...TYPED_POLY, 'from'].filter((n) => n !== 'toString'));

/** The helpers, by name: each a function expression; one may use another as __bolli.name and the shared values
 * (has, slice). Each uses the browser's own function when the receiver has it. */
const HELPERS = {
    startsWith: 'function (s, x, at) { if (s.startsWith) { return s.startsWith(x, at); } at = at > 0 ? at | 0 : 0; return s.substr(at, String(x).length) === String(x); }',
    endsWith: 'function (s, x, end) { if (s.endsWith) { return s.endsWith(x, end); } x = String(x); end = end === undefined ? s.length : Math.min(Math.max(end | 0, 0), s.length); return end >= x.length && s.substring(end - x.length, end) === x; }',
    includes: 'function (o, x, at) {\n' +
        '    if (o.includes) { return o.includes(x, at); }\n' +
        "    if (typeof o === 'string') { return o.indexOf(x, at) !== -1; }\n" +
        '    for (var i = at > 0 ? at | 0 : 0; i < o.length; i++) { if (o[i] === x || (o[i] !== o[i] && x !== x)) { return true; } }\n' +
        '    return false;\n}',
    repeat: "function (s, n) { if (s.repeat) { return s.repeat(n); } var out = ''; for (var i = 0; i < n; i++) { out += s; } return out; }",
    padStart: "function (s, n, pad) { if (s.padStart) { return s.padStart(n, pad); } pad = pad === undefined ? ' ' : String(pad); while (s.length < n && pad) { s = pad.slice(0, n - s.length) + s; } return s; }",
    padEnd: "function (s, n, pad) { if (s.padEnd) { return s.padEnd(n, pad); } pad = pad === undefined ? ' ' : String(pad); while (s.length < n && pad) { s += pad.slice(0, n - s.length); } return s; }",
    find: 'function (a, fn, self) { if (a.find) { return a.find(fn, self); } for (var i = 0; i < a.length; i++) { if (fn.call(self, a[i], i, a)) { return a[i]; } } return undefined; }',
    findIndex: 'function (a, fn, self) { if (a.findIndex) { return a.findIndex(fn, self); } for (var i = 0; i < a.length; i++) { if (fn.call(self, a[i], i, a)) { return i; } } return -1; }',
    fill: 'function (a, v, start, end) {\n' +
        '    if (a.fill) { return a.fill(v, start, end); }\n' +
        '    var n = a.length;\n' +
        '    start = start === undefined ? 0 : start < 0 ? Math.max(n + start, 0) : Math.min(start, n);\n' +
        '    end = end === undefined ? n : end < 0 ? Math.max(n + end, 0) : Math.min(end, n);\n' +
        '    for (var i = start; i < end; i++) { a[i] = v; }\n' +
        '    return a;\n}',
    assign: 'function (target) {\n' +
        '    if (Object.assign) { return Object.assign.apply(Object, arguments); }\n' +
        '    for (var i = 1; i < arguments.length; i++) {\n' +
        '        var src = arguments[i];\n' +
        '        if (src != null) { for (var k in src) { if (has.call(src, k)) { target[k] = src[k]; } } }\n' +
        '    }\n' +
        '    return target;\n}',
    values: 'function (o) { if (Object.values) { return Object.values(o); } var out = []; for (var k in o) { if (has.call(o, k)) { out.push(o[k]); } } return out; }',
    entries: 'function (o) { if (Object.entries) { return Object.entries(o); } var out = []; for (var k in o) { if (has.call(o, k)) { out.push([k, o[k]]); } } return out; }',
    arrayFrom: 'function (src, fn, self) {\n' +
        '    if (Array.from) { return fn ? Array.from(src, fn, self) : Array.from(src); }\n' +
        "    var out = [];\n" +
        "    if (typeof src === 'string') { out = src.split(''); }\n" +
        "    else if (src != null && typeof src.length === 'number') { out = slice.call(src); }\n" +
        "    else if (src != null && typeof src.next === 'function') { for (var r = src.next(); !r.done; r = src.next()) { out.push(r.value); } }\n" +
        "    else if (src != null && typeof src.forEach === 'function') { src.forEach(function (v, k) { out.push(src instanceof Map ? [k, v] : v); }); }\n" +
        '    if (fn) { for (var i = 0; i < out.length; i++) { out[i] = fn.call(self, out[i], i); } }\n' +
        '    return out;\n}',
    typedFrom: 'function (C, src, fn, self) { return C.from ? (fn ? C.from(src, fn, self) : C.from(src)) : new C(__bolli.arrayFrom(src, fn, self)); }',
    fromCodePoint: 'function () {\n' +
        '    if (String.fromCodePoint) { return String.fromCodePoint.apply(String, arguments); }\n' +
        "    var out = '';\n" +
        '    for (var i = 0; i < arguments.length; i++) {\n' +
        '        var c = +arguments[i];\n' +
        '        if (c > 0xffff) { c -= 0x10000; out += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 0x3ff)); } else { out += String.fromCharCode(c); }\n' +
        '    }\n' +
        '    return out;\n}',
    ta_slice: 'function (a, start, end) { return a.slice ? a.slice(start, end) : new a.constructor(end === undefined ? a.subarray(start === undefined ? 0 : start) : a.subarray(start, end)); }',
    ta_fill: 'function (a, v, start, end) { return __bolli.fill(a, v, start, end); }',
    ta_indexOf: 'function (a, x, at) { return a.indexOf ? a.indexOf(x, at) : Array.prototype.indexOf.call(a, x, at); }',
    ta_lastIndexOf: 'function (a) { return (a.lastIndexOf || Array.prototype.lastIndexOf).apply(a, slice.call(arguments, 1)); }',
    ta_includes: 'function (a, x, at) { return __bolli.includes(a, x, at); }',
    ta_join: "function (a, sep) { return a.join ? a.join(sep) : Array.prototype.join.call(a, sep === undefined ? ',' : sep); }",
    ta_toString: "function (a) { return Array.prototype.join.call(a, ','); }",
    ta_forEach: 'function (a, fn, self) { (a.forEach || Array.prototype.forEach).call(a, fn, self); }',
    ta_map: 'function (a, fn, self) { if (a.map) { return a.map(fn, self); } var out = new a.constructor(a.length); for (var i = 0; i < a.length; i++) { out[i] = fn.call(self, a[i], i, a); } return out; }',
    ta_filter: 'function (a, fn, self) { return a.filter ? a.filter(fn, self) : new a.constructor(Array.prototype.filter.call(a, fn, self)); }',
    ta_reduce: 'function (a) { return (a.reduce || Array.prototype.reduce).apply(a, slice.call(arguments, 1)); }',
    ta_every: 'function (a, fn, self) { return (a.every || Array.prototype.every).call(a, fn, self); }',
    ta_some: 'function (a, fn, self) { return (a.some || Array.prototype.some).call(a, fn, self); }',
    ta_find: 'function (a, fn, self) { return __bolli.find(a, fn, self); }',
    ta_findIndex: 'function (a, fn, self) { return __bolli.findIndex(a, fn, self); }',
    ta_reverse: 'function (a) { return (a.reverse || Array.prototype.reverse).call(a); }'
};
for (const name of ANY_NAMES) {
    // A receiver typed any: its own method when it has one; else the typed array helper for a typed array, the
    // generic one for anything else (or the call as written, which then fails as it would have)
    const typed = HELPERS['ta_' + name] ? `ArrayBuffer.isView(o) ? __bolli.ta_${name}.apply(__bolli, arguments) : ` : '';
    const generic = name === 'from' ? '(o === Array ? __bolli.arrayFrom(a, b, c) : __bolli.typedFrom(o, a, b, c))' :
        HELPERS[name] ? `__bolli.${name}.apply(__bolli, arguments)` : `o.${name}(a, b, c)`;
    const call = name === 'reduce' || name === 'lastIndexOf' ? `o.${name}.apply(o, slice.call(arguments, 1))` : `o.${name}(a, b, c)`;
    HELPERS['any_' + name] = `function (o, a, b, c) { return typeof o.${name} === 'function' ? ${call} : ${typed}${generic}; }`;
}
/** Values the helpers share */
const SHARED = { has: 'Object.prototype.hasOwnProperty', slice: 'Array.prototype.slice' };

/** TypeScript's helpers the compiled code imports, written for ES5 without the library calls Chrome 38 lacks (the
 * bundle keeps only those it uses) */
const TSLIB = `
var extendStatics = Object.setPrototypeOf || function (d, b) { d.__proto__ = b; };
export function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
export function __assign() {
    return __bolli.assign.apply(__bolli, arguments);
}
export function __spreadArray(to, from, pack) {
    return to.concat(Array.prototype.slice.call(from));
}
`;
const TSLIB_TYPES = `
export declare function __extends(d: Function, b: Function | null): void;
export declare function __assign(t: any, ...sources: any[]): any;
export declare function __spreadArray(to: any[], from: any[], pack?: boolean): any[];
`;

const ENTRIES = {
    main: path.join(SRC, 'exports-default.ts'),
    worker: path.join(SRC, 'demux', 'transmuxer-worker.ts')
};
const INJECT_WORKER = path.join(SRC, 'demux', 'inject-worker.ts');
const jsDeps = [path.join(DEPS, 'cml-id3', 'index.js'), path.join(DEPS, 'cml-utils', 'index.js')];

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(path.join(TMP, 'tslib.d.ts'), TSLIB_TYPES);
fs.writeFileSync(path.join(TMP, 'cml-cmcd.d.ts'), CMCD_TYPES);

const options = {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    types: [],
    importHelpers: true,
    downlevelIteration: false,
    useDefineForClassFields: false,
    allowJs: true,
    checkJs: false,
    // Checking only (the output is the same): hls.js's types narrow as written only with it
    strictNullChecks: true,
    skipLibCheck: true,
    removeComments: true,
    noEmitOnError: false,
    rootDir: HLS,
    outDir: JS,
    baseUrl: HLS,
    paths: {
        tslib: [path.join(TMP, 'tslib.d.ts')],
        eventemitter3: ['deps/eventemitter3/index.d.ts'],
        'url-toolkit': ['deps/url-toolkit/index.d.ts'],
        '@svta/cml-id3': ['deps/cml-id3/index.js'],
        '@svta/cml-utils': ['deps/cml-utils/index.js'],
        '@svta/cml-cmcd': [path.join(TMP, 'cml-cmcd.d.ts')]
    }
};

// hls.js is written for TypeScript 5.7, whose typed arrays take a buffer type (Uint8Array<ArrayBuffer>); this
// project's TypeScript reads such a type as an error, which would type the variable any and hide its calls from
// the checks below. The source as read here leaves the buffer type out.
const BUFFER_TYPE = /\b((?:Ui|I)nt(?:8|16|32)Array|Uint8ClampedArray|Float(?:32|64)Array|DataView)<(?:ArrayBuffer|ArrayBufferLike|SharedArrayBuffer)>/g;
const host = ts.createCompilerHost(options);
const readSource = host.getSourceFile;
host.getSourceFile = (file, language, onError, create) => {
    if (path.resolve(file).startsWith(SRC + path.sep)) {
        return ts.createSourceFile(file, fs.readFileSync(file, 'utf8').replace(BUFFER_TYPE, '$1'), language);
    }
    return readSource.call(host, file, language, onError, create);
};
const program = ts.createProgram([ENTRIES.main, ENTRIES.worker, path.join(SRC, 'define-plugin.d.ts')].concat(jsDeps), options, host);
const checker = program.getTypeChecker();
const diagnostics = ts.getPreEmitDiagnostics(program);
const formatHost = { getCanonicalFileName: (f) => f, getCurrentDirectory: () => root, getNewLine: () => '\n' };

// Spreading or iterating anything but an array or typed array needs downlevelIteration (slower everywhere), so that
// stays an error; an array or typed array is fine (__spreadArray copies it as an array-like)
const arrayLike = /^Type '((Ui|I)nt(8|16|32)Array|Uint8ClampedArray|Float(32|64)Array|[a-z]+\[\])( \| ((Ui|I)nt(8|16|32)Array|Uint8ClampedArray|Float(32|64)Array|[a-z]+\[\]))*' can only be iterated/;
const allowedIteration = (d) => d.code === 2802 && arrayLike.test(ts.flattenDiagnosticMessageText(d.messageText, '\n'));

/** --keep-logs: a build for reading hls.js's own log (with the player's debug option on) */
const KEEP_LOGS = process.argv.includes('--keep-logs');
const LOG_CALLS = new Set(['trace', 'debug', 'info', 'log']);
const LOGGER_FILE = path.join(SRC, 'utils', 'logger.ts');
/** Unknown library calls per source file (reported only for files that end up in a bundle) */
const unknown = new Map();
let stripped = 0;
let rewritten = 0;
let rewrittenAny = 0;

/** 'Owner.member' (or 'name' for a global) of the library declaration a name resolves to, and that library's file;
 * null for a name not declared in TypeScript's own library */
function libraryMember(name) {
    let symbol = checker.getSymbolAtLocation(name);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
        symbol = checker.getAliasedSymbol(symbol);
    }
    const decl = symbol && symbol.declarations && symbol.declarations[0];
    if (!decl) {
        return null;
    }
    const file = decl.getSourceFile().fileName;
    if (!/[\\/]typescript[\\/]lib[\\/]lib\..*\.d\.ts$/.test(file)) {
        return null;
    }
    const owner = decl.parent && (ts.isInterfaceDeclaration(decl.parent) || ts.isClassDeclaration(decl.parent)) && decl.parent.name ? decl.parent.name.text : '';
    return { key: owner ? owner + '.' + name.text : name.text, owner, member: name.text, lib: path.basename(file) };
}

function allowed(m) {
    return /^lib\.(es5|dom|dom\.iterable|webworker\..*|decorators.*|scripthost)\.d\.ts$/.test(m.lib) || ALLOWED.has(m.key) || ALLOWED.has(m.owner + '.*');
}

function noteUnknown(node, what) {
    const sf = node.getSourceFile();
    const at = sf.getLineAndCharacterOfPosition(node.getStart());
    const list = unknown.get(sf.fileName) || [];
    list.push(`${path.relative(HLS, sf.fileName)}:${at.line + 1} ${what}`);
    unknown.set(sf.fileName, list);
}

/** A trace/debug/info/log call on hls.js's logger (the statement goes) */
function isLogCall(expr) {
    if (!ts.isCallExpression(expr) || !ts.isPropertyAccessExpression(expr.expression) || !LOG_CALLS.has(expr.expression.name.text)) {
        return false;
    }
    const symbol = checker.getSymbolAtLocation(expr.expression.name);
    const decl = symbol && symbol.declarations && symbol.declarations[0];
    return !!decl && path.resolve(decl.getSourceFile().fileName) === LOGGER_FILE;
}

/** The identifier is what a declaration declares (or a property name), not a use */
function isDeclaredName(node) {
    const p = node.parent;
    return (ts.isDeclaration(p) && p.name === node) || (ts.isPropertyAccessExpression(p) && p.name === node);
}

/** The literal a DEFINES value is written as */
function defineLiteral(f, value) {
    return value === undefined ? f.createVoidZero() : typeof value === 'boolean' ? (value ? f.createTrue() : f.createFalse()) : f.createStringLiteral(value);
}

function chrome38(context) {
    const f = context.factory;
    const helper = (name) => f.createPropertyAccessExpression(f.createIdentifier('__bolli'), name);
    /** helper(receiver, ...args) for recv.member(args); recv?.member(args) keeps its short circuit:
     * (t = recv) == null ? void 0 : helper(t, ...args) */
    const callHelper = (node, name, withReceiver) => {
        const callee = node.expression;
        const args = node.arguments.map((a) => ts.visitNode(a, visit));
        if (!withReceiver) {
            return f.createCallExpression(helper(name), undefined, args);
        }
        const recv = ts.visitNode(callee.expression, visit);
        if (!callee.questionDotToken) {
            return f.createCallExpression(helper(name), undefined, [recv].concat(args));
        }
        const t = f.createTempVariable(context.hoistVariableDeclaration);
        return f.createParenthesizedExpression(f.createConditionalExpression(
            f.createBinaryExpression(f.createParenthesizedExpression(f.createAssignment(t, recv)), ts.SyntaxKind.EqualsEqualsToken, f.createNull()),
            undefined, f.createVoidZero(), undefined, f.createCallExpression(helper(name), undefined, [t].concat(args))));
    };
    const visit = (node) => {
        if (ts.isIdentifier(node) && Object.prototype.hasOwnProperty.call(DEFINES, node.text) && !isDeclaredName(node)) {
            return defineLiteral(f, DEFINES[node.text]);
        }
        if (!KEEP_LOGS && ts.isExpressionStatement(node) && isLogCall(node.expression)) {
            stripped++;
            return f.createEmptyStatement();
        }
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            const callee = node.expression;
            const m = libraryMember(callee.name);
            // Within a longer optional chain (a?.b.c()) a helper would lose the short circuit
            const plain = !ts.isOptionalChain(node) || !!callee.questionDotToken;
            if (m && TYPED.has(m.owner) && TYPED_POLY.has(m.member) && plain) {
                rewritten++;
                return callHelper(node, 'ta_' + m.member, true);
            }
            if (m && TYPED.has(m.owner.replace(/Constructor$/, '')) && m.member === 'from' && plain) {
                rewritten++;
                const args = [ts.visitNode(callee.expression, visit)].concat(node.arguments.map((a) => ts.visitNode(a, visit)));
                return f.createCallExpression(helper('typedFrom'), undefined, args);
            }
            if (m && REWRITE[m.key] && plain) {
                rewritten++;
                return callHelper(node, REWRITE[m.key], !STATIC.has(m.owner));
            }
            // A receiver typed any, called by a name rewritten above: decided at run time
            if (!m && ANY_NAMES.has(callee.name.text) && checker.getTypeAtLocation(callee.expression).flags & ts.TypeFlags.Any) {
                if (plain && node.arguments.length <= 3 && !node.arguments.some(ts.isSpreadElement)) {
                    rewrittenAny++;
                    return callHelper(node, 'any_' + callee.name.text, true);
                }
                noteUnknown(node, callee.name.text + ' on a receiver typed any, in a form no helper takes');
            }
            // Anything else: the callee is checked below as a property access
        }
        if (ts.isPropertyAccessExpression(node)) {
            const m = libraryMember(node.name);
            if (m && (TYPED.has(m.owner) ? !TYPED_NATIVE.has(m.member) : !allowed(m))) {
                noteUnknown(node, m.key + ' (' + m.lib + ')');
            }
        } else if (ts.isIdentifier(node) && (ts.isNewExpression(node.parent) || ts.isCallExpression(node.parent)) && node.parent.expression === node) {
            const m = libraryMember(node);
            if (m && !allowed(m)) {
                noteUnknown(node, m.key + ' (' + m.lib + ')');
            }
        }
        return ts.visitEachChild(node, visit, context);
    };
    return (sf) => ts.visitNode(sf, visit);
}

const emitted = new Map();
const emitResult = program.emit(undefined, (file, text) => {
    if (file.endsWith('.js')) {
        emitted.set(path.resolve(file), text);
    }
}, undefined, false, { before: [chrome38] });
if (emitResult.emitSkipped) {
    console.error('TypeScript emitted nothing');
    process.exit(1);
}

const jsOf = (file) => path.join(JS, path.relative(HLS, file)).replace(/\.ts$/, '.js');
const srcOf = (jsFile) => path.join(HLS, path.relative(JS, jsFile)).replace(/\.js$/, '.ts');
const trimmedJs = new Map(TRIMMED.map((m) => [path.join(JS, 'src', m + '.js'), '\0trimmed:']).concat(
    Object.keys(STUBS).map((m) => [path.join(JS, 'src', m + '.js'), '\0stub:'])));
const mainTrimmedJs = new Set(MAIN_TRIMMED.map((m) => path.join(JS, 'src', m + '.js')));
/** The bundle being built ('hls.js' or 'hls-worker.js'; one at a time) */
let bundling = '';

/** The value exports of a source module (for its empty stand-in) */
function valueExports(jsFile) {
    const sf = program.getSourceFile(srcOf(jsFile));
    const moduleSymbol = sf && checker.getSymbolAtLocation(sf);
    if (!moduleSymbol) {
        return [];
    }
    return checker.getExportsOfModule(moduleSymbol).filter((s) => {
        const target = s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
        return target.flags & ts.SymbolFlags.Value;
    }).map((s) => s.name);
}

/** The names hls.js imports from url-toolkit (the bundle exports only those) */
function urlToolkitImports() {
    const names = new Set();
    for (const sf of program.getSourceFiles()) {
        for (const st of sf.statements) {
            if (ts.isImportDeclaration(st) && st.moduleSpecifier.text === 'url-toolkit' && st.importClause && st.importClause.namedBindings &&
                ts.isNamedImports(st.importClause.namedBindings)) {
                st.importClause.namedBindings.elements.forEach((e) => names.add((e.propertyName || e.name).text));
            }
        }
    }
    return [...names];
}

/** The converter, and the module that runs it in the worker (or would run it on the main thread) */
const TRANSMUXER = path.join(JS, 'src', 'demux', 'transmuxer.js');
const TRANSMUXER_INTERFACE = path.join(JS, 'src', 'demux', 'transmuxer-interface.js');
/** The main bundle's entry: hls.js's default export, with its worker start on it */
const MAIN_ENTRY = '\0entry:main';
/** Stand-ins resolved, per kind (each must be needed by a bundle) */
const standInsUsed = new Set();
const plugin = {
    name: 'bolli-hls',
    resolveId(source, importer) {
        if (source === MAIN_ENTRY) {
            return MAIN_ENTRY;
        }
        if (source === 'tslib') {
            return '\0tslib';
        }
        if (source === 'eventemitter3' || source === 'url-toolkit') {
            return '\0dep:' + source;
        }
        if (source === '@svta/cml-id3' || source === '@svta/cml-utils') {
            return path.join(JS, 'deps', source.slice(6), 'index.js');
        }
        if (source.charAt(0) !== '.' && !path.isAbsolute(source)) {
            return null;
        }
        const base = path.resolve(importer && importer.charAt(0) !== '\0' ? path.dirname(importer) : root, source);
        if (base + '.js' === TRANSMUXER && importer === TRANSMUXER_INTERFACE) {
            return '\0main-transmuxer';
        }
        for (const candidate of [base, base + '.js', path.join(base, 'index.js')]) {
            if (trimmedJs.has(candidate)) {
                return trimmedJs.get(candidate) + candidate;
            }
            if (bundling === 'hls.js' && mainTrimmedJs.has(candidate)) {
                return '\0trimmed:' + candidate;
            }
            if (emitted.has(candidate)) {
                return candidate;
            }
        }
        return null;
    },
    load(id) {
        if (id === MAIN_ENTRY) {
            return `import Hls from ${JSON.stringify(jsOf(ENTRIES.main))};\n` +
                `import { loadWorker } from ${JSON.stringify(jsOf(INJECT_WORKER))};\n` +
                'Hls.loadWorker = loadWorker;\nexport default Hls;\n';
        }
        if (id === '\0tslib') {
            return TSLIB;
        }
        if (id === '\0main-transmuxer') {
            return `export { isPromise, TransmuxConfig, TransmuxState } from ${JSON.stringify(TRANSMUXER)};\n` +
                "export default function Transmuxer() { throw new Error('segments are converted in the worker only'); }\n";
        }
        if (id === '\0dep:eventemitter3') {
            return fs.readFileSync(path.join(DEPS, 'eventemitter3', 'index.js'), 'utf8');
        }
        if (id === '\0dep:url-toolkit') {
            const umd = fs.readFileSync(path.join(DEPS, 'url-toolkit', 'index.js'), 'utf8').replace(/\}\)\(this\);\s*$/, '})(undefined);');
            return 'var module = { exports: {} }, exports = module.exports;\n' + umd + '\nvar URLToolkit = module.exports;\n' +
                urlToolkitImports().map((n) => `export var ${n} = URLToolkit.${n};`).join('\n') + '\n';
        }
        if (id.indexOf('\0trimmed:') === 0) {
            standInsUsed.add(id);
            const names = valueExports(id.slice(9));
            const named = names.filter((n) => n !== 'default');
            return (named.length ? 'export var ' + named.join(', ') + ';\n' : '') + (names.indexOf('default') >= 0 ? 'export default undefined;\n' : '');
        }
        if (id.indexOf('\0stub:') === 0) {
            standInsUsed.add(id);
            return STUBS[path.relative(path.join(JS, 'src'), id.slice(6)).replace(/\.js$/, '')];
        }
        if (emitted.has(id)) {
            return emitted.get(id);
        }
        return null;
    }
};

const BANNER = `/*! hls.js ${VERSION} (https://github.com/video-dev/hls.js), Copyright (c) 2017 Dailymotion, Apache License 2.0. ` +
    'Trimmed and compiled for Chrome 38 by Bolli Twitch (tools/twitch_hls.mjs): see LICENSE and README.md beside this file. ' +
    'Includes eventemitter3 (MIT, Arnout Kazemier), url-toolkit (Apache 2.0, Tom Jenkinson) and the Common Media Library ' +
    '(Apache 2.0, Streaming Video Technology Alliance). */\n';

/** Library names a bundle must not use (Chrome 38 lacks them; the type-based check cannot see every use). Feature
 * checks (self.ResizeObserver) are fine. Checked before the helpers go in (they use the browser's own where it has
 * one). */
const DENY = /\b(__USE_[A-Z0-9_]+__|__VERSION__|__IN_WORKER__|__HLS_WORKER_BUNDLE__|AbortController|queueMicrotask|structuredClone|requestIdleCallback|globalThis|Reflect|Proxy|URLSearchParams|BigInt|WeakRef)\b|\bfetch\(|\.finally\(|(?<!__bolli)\.(padStart|padEnd|startsWith|endsWith|fromCodePoint|repeat)\(|Object\.(assign|values|entries)\(|Array\.from\(/g;
/** Where the bundle's helpers go (only those it uses) */
const HELPERS_AT = '__BOLLI_HELPERS__';

/** The helpers code uses (with the helpers they use), as the object __bolli */
function helpersFor(code) {
    const names = new Set();
    const add = (name) => {
        if (!names.has(name)) {
            if (!HELPERS[name]) {
                console.error(`no helper ${name}`);
                process.exit(1);
            }
            names.add(name);
            for (const m of HELPERS[name].matchAll(/__bolli\.(\w+)/g)) {
                add(m[1]);
            }
        }
    };
    for (const m of code.matchAll(/__bolli\.(\w+)/g)) {
        add(m[1]);
    }
    if (!names.size) {
        return { count: 0, code: '' };
    }
    const body = [...names].sort().map((n) => n + ': ' + HELPERS[n]).join(',\n');
    const shared = Object.keys(SHARED).filter((s) => [...names].some((n) => new RegExp('\\b' + s + '\\.').test(HELPERS[n])));
    return { count: names.size, code: (shared.length ? 'var ' + shared.map((s) => s + ' = ' + SHARED[s]).join(', ') + ';\n' : '') + 'var __bolli = {\n' + body + '\n};' };
}

/** One bundle, checked; written later (once every check passed) */
async function build(file, input, globalName) {
    const included = new Set();
    const warnings = [];
    bundling = file;
    const bundle = await rollup({
        input,
        plugins: [plugin],
        treeshake: { moduleSideEffects: (id) => id === input },
        onwarn: (w) => warnings.push(w)
    });
    const { output } = await bundle.generate({
        format: 'iife',
        name: globalName,
        exports: globalName ? 'default' : 'none',
        intro: HELPERS_AT + ';',
        generatedCode: 'es5',
        strict: true
    });
    const chunk = output[0];
    const sizes = [];
    for (const [id, m] of Object.entries(chunk.modules)) {
        if (m.renderedLength) {
            // Stand-ins are not their module's code (its checks do not apply)
            if (id.charAt(0) !== '\0') {
                included.add(id);
            }
            sizes.push([id.indexOf('\0') === 0 ? id.replace(JS + path.sep, '') : path.relative(JS, id), m.renderedLength]);
        }
    }
    const missing = [];
    for (const [srcFile, list] of unknown) {
        if (included.has(jsOf(srcFile))) {
            missing.push(...list);
        }
    }
    if (missing.length) {
        console.error(`${file}: library calls Chrome 38 lacks, not handled by a helper:\n  ` + missing.join('\n  '));
        process.exit(1);
    }
    for (const w of warnings) {
        if (w.code !== 'THIS_IS_UNDEFINED' && w.code !== 'CIRCULAR_DEPENDENCY' && w.code !== 'EMPTY_BUNDLE') {
            console.warn(`${file}: rollup: ${w.message}`);
        }
    }
    let code = compact(chunk.code);
    const denied = code.match(DENY);
    if (denied) {
        console.error(`${file}: uses ${[...new Set(denied)].join(', ')} (Chrome 38 lacks them)`);
        process.exit(1);
    }
    const helpers = helpersFor(code);
    code = BANNER + code.replace(HELPERS_AT + ';', () => helpers.code ? compact(helpers.code).replace(/\n$/, '') : '');
    try {
        acorn.parse(code, { ecmaVersion: 5 });
    } catch (e) {
        console.error(`${file} is not ES5 (line ${e.loc && e.loc.line}): ${e.message}`);
        process.exit(1);
    }
    sizes.sort((a, b) => b[1] - a[1]);
    return { file, code, sizes, included, helpers: helpers.count, readable: chunk.code };
}

const main = await build('hls.js', MAIN_ENTRY, 'BolliHls');
const worker = await build('hls-worker.js', jsOf(ENTRIES.worker), null);

// A type error in a file that ends up in a bundle stops the build (the checks above trust the types), but for the
// one place hls.js is typed for a newer TypeScript in a way this one cannot read
const bundled = (fileName) => main.included.has(jsOf(path.resolve(fileName))) || worker.included.has(jsOf(path.resolve(fileName)));
const newerTyping = (d) => d.file && path.relative(SRC, d.file.fileName) === path.join('utils', 'hex.ts') && d.code === 2769;
const typeErrors = diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error && !allowedIteration(d) && !newerTyping(d) &&
    (!d.file || bundled(d.file.fileName)));
if (typeErrors.length) {
    console.error(ts.formatDiagnostics(typeErrors, formatHost));
    process.exit(1);
}
// Every stand-in replaces a module some bundle would otherwise carry
const unusedStandIns = [...trimmedJs].concat([...mainTrimmedJs].map((js) => [js, '\0trimmed:']))
    .filter(([js, kind]) => !standInsUsed.has(kind + js)).map(([js]) => path.relative(path.join(JS, 'src'), js));
if (unusedStandIns.length) {
    console.error(`no bundle imports ${unusedStandIns.join(', ')}: take them out of TRIMMED, MAIN_TRIMMED or STUBS`);
    process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
// The licences go with the code they cover
fs.copyFileSync(path.join(HLS, 'LICENSE'), path.join(OUT, 'LICENSE'));
fs.copyFileSync(path.join(DEPS, 'eventemitter3', 'LICENSE'), path.join(OUT, 'LICENSE.eventemitter3'));
fs.copyFileSync(path.join(DEPS, 'url-toolkit', 'LICENSE'), path.join(OUT, 'LICENSE.url-toolkit'));
fs.copyFileSync(path.join(DEPS, 'cml-utils', 'LICENSE'), path.join(OUT, 'LICENSE.common-media-library'));
for (const r of [main, worker]) {
    fs.writeFileSync(path.join(OUT, r.file), r.code);
    // The bundle before compacting, for reading (build/ is not committed)
    fs.writeFileSync(path.join(TMP, r.file), r.readable);
}
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`apps/bolli-twitch/hls/hls.js: ${kb(main.code.length)} (${main.helpers} helpers), hls-worker.js: ${kb(worker.code.length)} ` +
    `(${worker.helpers} helpers) (ES5 OK; ${stripped} log calls dropped, ${rewritten} library calls and ${rewrittenAny} calls on any to helpers)`);
if (process.argv.includes('--sizes')) {
    for (const r of [main, worker]) {
        console.log(r.file + ' modules (before compacting):');
        for (const [id, n] of r.sizes.slice(0, process.argv.includes('--all') ? 1e9 : 40)) {
            console.log('  ' + kb(n).padStart(9) + '  ' + id);
        }
    }
}
