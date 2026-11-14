// The icons Twitch's TV app draws on more than one screen, drawn here as SVG: the gear, the blank box art, Go Back's
// chevron, the Follow hearts (outlined, filled once followed), Report's speech bubble and Watch's play triangle; and
// Bolli's Favorite stars in the hearts' style. Every icon module draws through svgNode, which parses each SVG once and
// then clones it.

import { h } from '../../core/dom.js';

var parsed: { [svg: string]: Node } = {};

/** A fresh copy of svg's element (parsed the first time) */
export function svgNode(svg: string): Node {
    if (!parsed[svg]) {
        var box = h('div');
        box.innerHTML = svg;
        parsed[svg] = box.firstChild as Node;
    }
    return parsed[svg].cloneNode(true);
}

/** The gear (Settings): a ring with eight rounded teeth and a dot in the middle */
var GEAR = '<svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">' +
    '<circle cx="10" cy="10" r="5.6" fill="none" stroke="currentColor" stroke-width="2.3"/>' + teeth() +
    '<circle cx="10" cy="10" r="2.1"/></svg>';

/** The box art for a category without one: a game pad outlined over a dark one, in the box's 138x184 (1920 px) */
var BLANK_BOX = '<svg viewBox="0 0 138 184" width="138" height="184">' +
    '<path d="M26 74h72a3 3 0 0 1 3 3v44a3 3 0 0 1-3 3H26a3 3 0 0 1-3-3V77a3 3 0 0 1 3-3zM57 64h10v10H57z" fill="#2e2e37"/>' +
    '<path d="M40 60h72a3 3 0 0 1 3 3v44a3 3 0 0 1-3 3H40a3 3 0 0 1-3-3V63a3 3 0 0 1 3-3zM46 69v32h60V69zM71 50h10v10H71z' +
    'M58 76h8v5h5v8h-5v5h-8v-5h-5v-8h5zM81 76h9v9h-9zM90 85h9v9h-9z" fill="#a0a0ac" fill-rule="evenodd"/></svg>';

/** Go Back's chevron, pointing left, in Twitch's 20 box */
var CHEVRON = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.1">' +
    '<path d="M12.6 4.9 7.5 10l5.1 5.1"/></svg>';

/** The Follow heart in Twitch's 20 box: outlined, and filled once followed */
var HEART_PATH = 'M10 16.6 3.9 10.5A3.85 3.85 0 0 1 9.35 5.05l.65.65.65-.65a3.85 3.85 0 0 1 5.45 5.45z';
var HEART = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
    '<path d="' + HEART_PATH + '"/></svg>';
var HEARTED = '<svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
    '<path d="' + HEART_PATH + '"/></svg>';

/** The Favorite star in the same box and line: outlined, and filled once a favorite */
var STAR_PATH = 'M10 3.2l1.82 4.89 5.22.22-4.09 3.25 1.4 5.03L10 13.7l-4.35 2.89 1.4-5.03-4.09-3.25 5.22-.22z';
var STAR = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
    '<path d="' + STAR_PATH + '"/></svg>';
var STARRED = '<svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
    '<path d="' + STAR_PATH + '"/></svg>';

/** Report: a speech bubble with an exclamation mark */
var REPORT = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M4 3.5h12A1.25 1.25 0 0 1 17.25 4.75v9.5A1.25 1.25 0 0 1 16 15.5h-3.5L10 18l-2.5-2.5H4a1.25 1.25 0 0 1-1.25-1.25v-9.5A1.25 1.25 0 0 1 4 3.5z"' +
    ' stroke-linejoin="round"/><path d="M10 6.4v4.4"/><circle cx="10" cy="13" r="1.1" fill="currentColor" stroke="none"/></svg>';

/** Watch: a play triangle */
var PLAY = '<svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"><path d="M5 2.9v14.2L16.4 10z"/></svg>';

function teeth(): string {
    var out = '';
    for (var i = 0; i < 8; i++) {
        var a = (i * 45 + 22.5) * Math.PI / 180;
        out += '<circle cx="' + (10 + 6.85 * Math.cos(a)).toFixed(2) + '" cy="' + (10 + 6.85 * Math.sin(a)).toFixed(2) + '" r="1.45"/>';
    }
    return out;
}

export function gearIcon(): Node {
    return svgNode(GEAR);
}

export function blankBoxIcon(): Node {
    return svgNode(BLANK_BOX);
}

export function chevronIcon(): Node {
    return svgNode(CHEVRON);
}

/** The Follow heart: filled when followed */
export function heartIcon(followed: boolean): Node {
    return svgNode(followed ? HEARTED : HEART);
}

/** The Favorite star: filled when the channel is a favorite */
export function starIcon(favorite: boolean): Node {
    return svgNode(favorite ? STARRED : STAR);
}

export function reportIcon(): Node {
    return svgNode(REPORT);
}

export function playIcon(): Node {
    return svgNode(PLAY);
}
