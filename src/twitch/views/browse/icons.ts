// The icons of Search, drawn here as SVG in Twitch's TV app's shapes: the recent search's clock arrow, the trash can of
// Clear Recent Searches, the magnifier beside a suggested term, the Delete key's arrow and the Search page's purple
// magnifier.

import { svgNode } from '../icons.js';

var STROKE = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
/** Twitch's list icons are drawn heavier */
var HEAVY = ' fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';

var SVGS: { [name: string]: string } = {
    recent: '<svg viewBox="0 0 20 20"><path d="M4.2 7.6A6.5 6.5 0 1 1 3.5 11"' + HEAVY + '/><path d="M2.4 3.6 3.4 8l4.3-1.4z" fill="currentColor"/>' +
        '<path d="M10 6.6V11l2.6 1.8"' + HEAVY + '/></svg>',
    trash: '<svg viewBox="0 0 20 20"><path d="M3.5 5h13M8 5V3h4v2M5.2 5l.9 12h7.8l.9-12M8.5 8.5v5.5M11.5 8.5v5.5"' + HEAVY + '/></svg>',
    find: '<svg viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.3"' + STROKE + '/><path d="m12.6 12.6 4.4 4.4"' + STROKE + '/></svg>',
    erase: '<svg viewBox="0 0 20 20"><path d="M7.2 4.5h9.3v11H7.2L2.5 10z"' + STROKE + '/><path d="m9.8 7.7 4.6 4.6m0-4.6-4.6 4.6"' + STROKE + '/></svg>',
    searchPage: '<svg viewBox="0 0 80 80"><circle cx="31" cy="47" r="22" fill="#a970ff"/><circle cx="43" cy="33" r="17" fill="#bf94ff" fill-opacity=".55"' +
        ' stroke="#fff" stroke-width="6.5"/><path d="m55.5 46 13 14" stroke="#fff" stroke-width="7.5" stroke-linecap="round"/></svg>'
};

/** A fresh copy of the named icon, with the class given */
export function browseIcon(name: string, cls: string): Element {
    var svg = svgNode(SVGS[name]) as Element;
    svg.setAttribute('class', cls);
    return svg;
}
