// The screen over the app while the TV has no internet, in the look of Twitch's TV app's error pages: a heading and
// a line under it, centred on the page. It goes by itself when the connection is back (what failed then asks again).

import { h, setShown } from '../../core/dom.js';
import { isOnline, onNetwork } from '../../core/network.js';

export function initOffline(root: HTMLElement): void {
    var el = h('div', 'bt-offline');
    el.appendChild(h('div', 'bt-offline-title', 'No internet connection'));
    el.appendChild(h('div', 'bt-offline-text', 'Check your TV\'s network. Bolli Twitch picks up again as soon as it\'s back.'));
    setShown(el, !isOnline());
    root.appendChild(el);
    onNetwork(function (online: boolean) {
        setShown(el, !online);
    });
}
