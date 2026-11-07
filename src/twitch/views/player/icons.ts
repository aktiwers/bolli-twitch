// The player screens' own icons, drawn here: the options dots, the chat toggle, the big play sign, the quality check,
// and the options rows' pencil, sparkle and chevron.

import { svgNode } from '../icons.js';

var STROKE = ' fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
/** A four-pointed star with curved sides around 20,21 (Not interested) */
var STAR = 'M20 7c1.4 8 5 11.6 13 13-8 1.4-11.6 5-13 13-1.4-8-5-11.6-13-13 8-1.4 11.6-5 13-13z';

var SVG: { [name: string]: string } = {
    options: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="3.95" r="2.1"/><circle cx="10" cy="10" r="2.1"/>' +
        '<circle cx="10" cy="16.05" r="2.1"/></svg>',
    chat: '<svg viewBox="0 0 20 20"><rect x="2.79" y="3.72" width="14.42" height="12.09" rx="1.9"' + STROKE + ' stroke-width="1.86"/>' +
        '<path d="M12.1 3.72v12.09" fill="none" stroke="currentColor" stroke-width="1.86"/></svg>',
    play: '<svg viewBox="0 0 120 120"><path d="M33 20.5c0-3.6 3.9-5.8 7-4l55 39.5c2.9 2 2.9 6.1 0 8.1L40 103.6c-3.1 1.8-7-.4-7-4z" fill="#efeff1"/></svg>',
    check: '<svg viewBox="0 0 20 20"><path d="M4.5 10.5l3.6 3.6 7.4-8.2"' + STROKE + ' stroke-width="2.2"/></svg>',
    next: '<svg viewBox="0 0 20 20"><path d="M7.4 3.8L13.4 10l-6 6.2"' + STROKE + ' stroke-width="2.4"/></svg>',
    pencil: '<svg viewBox="0 0 40 40"><path d="M1 24.5V39h14.5l2.6-2.6H3.6V27.1z" fill="#9147ff"/>' +
        '<path d="M5.6 26.6L26.4 5.8a3.4 3.4 0 0 1 4.8 0l3 3a3.4 3.4 0 0 1 0 4.8L13.4 34.4H5.6z M22.3 9.9l7.8 7.8"' + STROKE + ' stroke-width="3.2"/>' +
        '<path d="M8.3 29.1l6.3-6.3 2.6 2.6-6.3 6.3z" fill="#9147ff"/></svg>',
    sparkle: '<svg viewBox="0 0 40 40"><path d="' + STAR + '" transform="translate(-3.5 3.5)" fill="#9147ff"/>' +
        '<path d="' + STAR + '"' + STROKE + ' stroke-width="3"/>' +
        '<path d="M33 2.5c.5 2.3 1.6 3.4 3.9 3.9-2.3.5-3.4 1.6-3.9 3.9-.5-2.3-1.6-3.4-3.9-3.9 2.3-.5 3.4-1.6 3.9-3.9z" fill="currentColor"/></svg>'
};

/** One of the icons by name (options, chat, play, check, next, pencil, sparkle) */
export function icon(name: string): Node {
    return svgNode(SVG[name]);
}
