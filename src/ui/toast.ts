// A short message at the bottom of the screen (over the player too).

import { setText } from '../core/dom.js';

var TOAST_MS = 3500;
var timer = 0;

/** Shows text for TOAST_MS, or ms */
export function toast(text: string, ms?: number): void {
    var el = document.getElementById('toast') as HTMLElement;
    setText(el, text);
    el.style.display = 'block';
    clearTimeout(timer);
    timer = setTimeout(function () { el.style.display = 'none'; }, ms || TOAST_MS) as unknown as number;
}
