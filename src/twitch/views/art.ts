// The pictures of Twitch's TV app, drawn here as SVG in its style: Settings' card icons are a purple shape with a light
// outline over it (the outline turns dark on a focused card); the pictures of its pages and prompts are white objects
// outlined in black with a yellow edge over a purple blob.

import { svgNode } from './icons.js';

var PURPLE = '#a970ff';
var BLOB = '#9146ff';
var PINK = '#ff38db';
var YELLOW = '#f5f500';
var INK = '#0e0e10';
var SHADOW = '#2e2e35';

/** A card icon (60x64 at 1920): the shape filled purple, moved down left, under its outline in the text colour */
function duo(fill: string, outline: string, extra?: string): string {
    return '<svg viewBox="0 0 60 64" width="60" height="64">' +
        '<g transform="translate(-9 9)" fill="' + PURPLE + '">' + fill + '</g>' +
        '<g fill="none" stroke="currentColor" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round">' + outline + '</g>' +
        (extra || '') + '</svg>';
}

var HEAD = '<circle cx="36" cy="16" r="10"/>';
var BODY = 'M18 52v-4a10 10 0 0 1 10-10h16a10 10 0 0 1 10 10v4';
var HEART = 'M34 50C8 32 12 8 34 20C56 8 60 32 34 50Z';
var PENCIL = 'M10 54l3.5-13L42 12.5a4.6 4.6 0 0 1 6.5 0l3 3a4.6 4.6 0 0 1 0 6.5L23 50.5Z';
var GHOST = 'M16 52V26a17 17 0 0 1 34 0v26l-5.6-4.4-5.6 4.4-5.6-4.4-5.6 4.4-5.6-4.4Z';
/** A round face or coin, and a screen */
var ROUND = '<circle cx="32" cy="30" r="20"/>';
var SCREEN = '<rect x="8" y="12" width="48" height="36" rx="3"/>';
var BAG = '<rect x="20" y="24" width="32" height="30" rx="4"/>';
var SPEAKER = 'M10 24h10l14-11v38L20 40H10Z';
var HAND = 'M19 34V17a3.5 3.5 0 0 1 7 0v10V12a3.5 3.5 0 0 1 7 0v15V14a3.5 3.5 0 0 1 7 0v14V19a3.5 3.5 0 0 1 7 0v19c0 9-6 15-15 15h-2c-6 0-9-3-12-8l-7-10a3.5 3.5 0 0 1 5.5-4l5 5';

var ICONS: { [name: string]: string } = {
    profile: duo(HEAD + '<path d="' + BODY + 'h-4v-4a6 6 0 0 0-6-6H28a6 6 0 0 0-6 6v4Z"/>', HEAD + '<path d="' + BODY + '"/>'),
    help: duo('<path d="' + HEART + '"/>', '<path d="' + HEART + '"/>'),
    terms: duo('<path d="' + PENCIL + '"/>', '<path d="' + PENCIL + 'M37 17.5l9.5 9.5"/>'),
    privacy: duo('<path d="' + GHOST + '"/>', '<path d="' + GHOST + '"/>',
        '<circle cx="28" cy="28" r="3.2" fill="currentColor"/><circle cx="39" cy="28" r="3.2" fill="currentColor"/>'),
    cookies: duo(BAG, '<path d="M28 24v-5a8 8 0 0 1 16 0v5"/>', '<rect x="20" y="24" width="32" height="30" rx="4" fill="currentColor"/>'),
    // Bolli's own settings in the same style: a chat bubble, a smiling face, a screen with a column, one with lines in
    // the column, one with the column half dark, a screen dark at the bottom, one with a small picture in its corner,
    // a raised hand, a speaker, a coin, a
    // stack of servers, a screen, an i
    notices: duo('<path d="M12 12h36a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H28l-10 8v-8h-6a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4Z"/>',
        '<path d="M16 8h36a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H32l-10 8v-8h-6a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z"/>'),
    emotes: duo(ROUND, ROUND + '<path d="M24 35a10 10 0 0 0 16 0"/>',
        '<circle cx="25" cy="25" r="3.2" fill="currentColor"/><circle cx="39" cy="25" r="3.2" fill="currentColor"/>'),
    layout: duo(SCREEN, SCREEN + '<path d="M40 12v36"/>'),
    chatsize: duo(SCREEN, SCREEN + '<path d="M40 12v36M44 22h8M44 30h8M44 38h5"/>'),
    shade: duo(SCREEN, SCREEN + '<path d="M40 12h13a3 3 0 0 1 3 3v30a3 3 0 0 1-3 3H40Z" fill="currentColor" fill-opacity=".5"/>'),
    dim: duo(SCREEN, SCREEN + '<path d="M8 33h48v12a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3Z" fill="currentColor"/>'),
    pip: duo(SCREEN, SCREEN + '<rect x="34" y="17" width="16" height="11" rx="1.5" fill="currentColor"/>'),
    gate: duo('<path d="' + HAND + '"/>', '<path d="' + HAND + '"/>'),
    volume: duo('<path d="' + SPEAKER + '"/>', '<path d="' + SPEAKER + '"/><path d="M42 22a12 12 0 0 1 0 20M48 15a21 21 0 0 1 0 34"/>'),
    points: duo(ROUND, ROUND + '<path d="M32 18a12 12 0 0 1 12 12"/>'),
    usher: duo('<rect x="12" y="10" width="40" height="16" rx="3"/><rect x="12" y="32" width="40" height="16" rx="3"/>',
        '<rect x="12" y="10" width="40" height="16" rx="3"/><rect x="12" y="32" width="40" height="16" rx="3"/><path d="M20 18h4M20 40h4"/>'),
    quality: duo('<rect x="10" y="10" width="44" height="30" rx="3"/>', '<rect x="10" y="10" width="44" height="30" rx="3"/><path d="M24 52h16M32 40v12"/>'),
    version: duo('<circle cx="32" cy="30" r="20"/>', '<circle cx="32" cy="30" r="20"/><path d="M32 28v12"/>',
        '<circle cx="32" cy="20" r="3.4" fill="currentColor"/>')
};

/** A blob behind a picture: a rounded, slightly uneven square turned by deg and moved by dx, dy, in a 260 box */
function blob(color: string, deg: number, dx?: number, dy?: number): string {
    return '<path transform="translate(' + (dx || 0) + ' ' + (dy || 0) + ') rotate(' + deg + ' 130 130)" fill="' + color + '"' +
        ' d="M44 50Q48 32 68 32L198 28Q220 28 224 48L240 176Q243 198 222 202L62 218Q40 220 37 198Z"/>';
}

/** A shape drawn as the pictures draw objects: its yellow edge (moved right), then white with a black outline */
function object(d: string, fill?: string): string {
    return '<path d="' + d + '" transform="translate(5 3)" fill="none" stroke="' + YELLOW + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="' + d + '" fill="' + (fill || '#fff') + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>';
}

function page(body: string): string {
    return '<svg viewBox="0 0 260 260" width="260" height="260">' + body + '</svg>';
}

var BIG_HEART = 'M150 188C96 162 78 128 96 102C110 82 136 88 150 110C164 86 194 80 208 102C224 130 202 164 150 188Z';
var SMALL_HEART = 'M98 180C66 164 56 142 66 128C74 116 90 118 98 130C106 116 122 114 130 126C140 142 126 166 98 180Z';

var PICTURES: { [name: string]: string } = {
    hearts: page(blob(BLOB, 45) + '<ellipse cx="130" cy="236" rx="74" ry="5" fill="' + SHADOW + '"/>' + object(BIG_HEART) + object(SMALL_HEART)),
    pencil: page(blob(BLOB, -10, 18, -26) + '<ellipse cx="78" cy="234" rx="44" ry="5" fill="' + SHADOW + '"/>' +
        '<g transform="rotate(35 120 130)">' + object('M98 26a22 22 0 0 1 44 0V188L120 226 98 188Z') +
        '<path d="M106 212 120 226 134 212Z" fill="' + INK + '"/><path d="M98 54h44M98 68h44M120 70V184" stroke="' + INK + '" stroke-width="5"/></g>'),
    lock: page(blob(BLOB, 4, 14, -14) + '<g transform="rotate(-12 130 150)">' +
        '<path d="M92 108V82a36 36 0 0 1 72 0v26" fill="none" stroke="' + YELLOW + '" stroke-width="16" transform="translate(5 3)"/>' +
        '<path d="M92 108V82a36 36 0 0 1 72 0v26" fill="none" stroke="' + INK + '" stroke-width="16"/>' +
        object('M72 108h112a8 8 0 0 1 8 8v90a8 8 0 0 1-8 8H72a8 8 0 0 1-8-8v-90a8 8 0 0 1 8-8Z') +
        '<path d="M64 136h128M64 162h128M64 188h128" stroke="' + INK + '" stroke-width="5"/></g>' +
        '<path d="M36 70l16 10M30 104l18 2M224 70l-16 10M232 104l-18 2" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>'),
    cookie: page(blob(PINK, -6, 18, -16) + object('M112 58a84 84 0 1 1-1 0Z') +
        '<g fill="' + INK + '"><path d="M50 130l14-6 6 14-14 4Z"/><path d="M50 178l12 2-2 14-12-4Z"/><path d="M94 214l14-4 2 14-14 2Z"/>' +
        '<path d="M150 210l12-8 6 12-12 6Z"/><path d="M178 172l10 4-4 12-10-6Z"/>' +
        '<path d="M74 104l38 2-6 24-26-2Z"/><path d="M128 102l48-8-8 28-32 4Z"/>' +
        '<path d="M72 150l10-4 4 10-10 2Z"/><path d="M146 168l10 2-2 10-10-2Z"/></g>' +
        '<path d="M110 108h20" stroke="' + INK + '" stroke-width="6"/>' +
        '<path d="M106 156q18 4 34-6" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>'),
    /** Not Interested: three sparkles over the blob */
    sparkles: page(blob(BLOB, -4, 30, -30) + object(star(66, 104, 36)) + object(star(112, 172, 62)) + object(star(178, 170, 44))),
    screen: page(blob(BLOB, 6) + object('M30 70L196 82Q202 82 202 90L198 196Q198 204 190 204L34 202Q26 202 26 194L22 78Q22 70 30 70Z') +
        '<path d="M44 90L182 98 180 186 46 184Z" fill="#fff" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<ellipse cx="96" cy="140" rx="5" ry="7" fill="' + INK + '"/><ellipse cx="138" cy="142" rx="5" ry="7" fill="' + INK + '"/>' +
        '<path d="M90 124l8-6M144 126l-8-6" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M102 162h30a7 7 0 0 1 0 14h-30a7 7 0 0 1 0-14ZM100 169h34" fill="#fff" stroke="' + INK + '" stroke-width="5"/>' +
        object('M104 204h20l2 18 40 18H62l40-18Z')),
    shield: page(blob(BLOB, 0) + object('M88 66L186 56Q190 140 156 214Q120 200 96 214Q70 140 88 66Z') +
        '<path d="M150 84Q120 140 154 188" fill="none" stroke="' + INK + '" stroke-width="6"/>' +
        '<path d="M122 40l12 4-34 180-12-4Z" fill="' + INK + '"/><path d="M128 46l4 2-30 168-4-2Z" fill="#fff"/>' +
        '<path d="M92 98l50 10-3 12-50-10Z" fill="#fff" stroke="' + INK + '" stroke-width="5"/>' +
        '<ellipse cx="120" cy="230" rx="44" ry="5" fill="' + SHADOW + '"/>')
};

/** A four-pointed star with curved sides around cx, cy */
function star(cx: number, cy: number, r: number): string {
    var k = Math.round(r * 0.18);
    return 'M' + cx + ' ' + (cy - r) + 'Q' + (cx + k) + ' ' + (cy - k) + ' ' + (cx + r) + ' ' + cy + 'Q' + (cx + k) + ' ' + (cy + k) + ' ' + cx +
        ' ' + (cy + r) + 'Q' + (cx - k) + ' ' + (cy + k) + ' ' + (cx - r) + ' ' + cy + 'Q' + (cx - k) + ' ' + (cy - k) + ' ' + cx + ' ' + (cy - r) + 'Z';
}

/** The player's and QR pages' pictures, in a 400 box: a blob behind a sketch with a heavier outline */
var BIG_BLOB = '<path d="M60 96c40-30 160-62 250-66 40-2 60 10 64 40 6 70 0 170-14 250-4 26-20 34-50 36-90 6-180 10-236 2-26-4-36-18-36-44-2-70 0-150 22-218z" fill="' + BLOB + '"/>';
var HEAVY = ' stroke="' + INK + '" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"';
var EDGE = ' fill="none" stroke="' + YELLOW + '" stroke-width="8" stroke-linecap="round"';

function big(body: string): string {
    return '<svg viewBox="0 0 400 400" width="400" height="400">' + body + '</svg>';
}

var BIG: { [name: string]: string } = {
    /** A raised hand: the mature gate */
    hand: big(BIG_BLOB +
        '<path d="M128 380c-26-40-60-96-80-150-8-22 18-34 32-14l30 44V88c0-18 26-18 26 0v120V62c0-18 28-18 28 0v146V74c0-18 28-18 28 0v140V100c0-18 26-18 26 0v150c18-26 36-44 56-50 22-6 32 12 18 28-30 34-52 76-70 116-10 20-24 36-44 36z" fill="#fff"' + HEAVY + '/>' +
        '<path d="M150 300c20-14 40-20 62-24" fill="none"' + HEAVY + '/>' +
        '<path d="M300 222c10 2 16 10 10 20"' + EDGE + '/>'),
    /** A knight with a sword: the QR pages */
    knight: big('<path d="M40 70c90-34 220-40 330-16-20 70-60 150-116 236L120 110z" fill="' + BLOB + '"/>' +
        '<path d="M120 86h110v160H120z" fill="#fff"' + HEAVY + '/>' +
        '<path d="M120 150h110M120 196h110" fill="none"' + HEAVY + '/>' +
        '<path d="M110 246h130l-10 60H120z" fill="#fff"' + HEAVY + '/>' +
        '<path d="M128 306l-6 50h30l6-40M206 316l6 44h30l-8-54" fill="#fff"' + HEAVY + '/>' +
        '<path d="M300 92l26 20-80 150-26-20z" fill="#fff"' + HEAVY + '/>' +
        '<path d="M232 236l44 34" fill="none"' + HEAVY + '/>' +
        '<path d="M330 120l-76 146"' + EDGE + '/>' +
        '<path d="M60 230c20-30 44-46 60-44v100c-20 4-44-20-60-56z" fill="#fff"' + HEAVY + '/>'),
    /** A worried screen: the error prompts */
    monitor: big(BIG_BLOB +
        '<path d="M70 110h250v170H70z" fill="#fff"' + HEAVY + '/>' +
        '<path d="M160 280l-10 50h90l-10-50M120 336h150" fill="#fff"' + HEAVY + '/>' +
        '<circle cx="150" cy="180" r="12" fill="' + INK + '"/><circle cx="240" cy="180" r="12" fill="' + INK + '"/>' +
        '<path d="M150 240c26-20 64-20 90 0" fill="none"' + HEAVY + '/>' +
        '<path d="M326 116v160"' + EDGE + '/>'),
    /** A screen with the replay arrow: the stream that ended, a video to watch again */
    ended: big(BIG_BLOB +
        '<path d="M70 110h250v170H70z" fill="#fff"' + HEAVY + '/>' +
        '<path d="M160 280l-10 50h90l-10-50M120 336h150" fill="#fff"' + HEAVY + '/>' +
        '<path d="M246 196a52 52 0 1 1-16-38" fill="none"' + HEAVY + '/>' +
        '<path d="M236 132v32h-32" fill="none"' + HEAVY + '/>' +
        '<path d="M326 116v160"' + EDGE + '/>')
};

/** A Settings card's icon: profile, help, terms, privacy, cookies (Twitch's), notices, emotes, layout, chatsize,
 * shade, dim, gate, volume, points, usher, quality, version (Bolli's) */
export function cardIcon(name: string): Node {
    return svgNode(ICONS[name]);
}

/** A picture: hearts (Need Help? and Following's card), pencil (Terms), lock (Privacy), cookie (Cookies), screen (not
 * playable here), shield (parental controls), sparkles (Not Interested); hand (the gate), knight (the QR pages),
 * monitor (errors), ended (a stream or video at its end) */
export function picture(name: string): Node {
    return svgNode(PICTURES[name] || BIG[name]);
}
