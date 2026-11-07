// The channel pages asked and kept: a page asked in the last minute is not asked again (a prefetch while the player's
// avatar or a channel tile has focus, then the open), and the last few pages draw at once when their channel opens
// again while a fresh copy is asked behind them.

import { Cache } from '../../api/cache.js';
import { channelPage, ChannelPage } from '../../api/channel.js';

export type PageLoader = (login: string) => Promise<ChannelPage>;

/** A page asked this recently is taken as it is; one that came draws at once this long after; pages kept */
var FRESH_MS = 60 * 1000;
var KEEP_MS = 10 * 60 * 1000;
var KEPT = 4;

var pages = new Cache<ChannelPage>(FRESH_MS, KEEP_MS, KEPT);

/** The channel's page: one asked in the last minute, else asked now (load: the request, channelPage by default) */
export function askPage(login: string, load?: PageLoader): Promise<ChannelPage> {
    return pages.get(login.toLowerCase(), function () {
        return (load || channelPage)(login);
    });
}

/** The page that came last for this channel within KEEP_MS, or null */
export function keptPage(login: string): ChannelPage | null {
    return pages.kept(login.toLowerCase()) || null;
}

/** Asks the channel's page ahead (OK on the avatar or the tile then draws it at once) */
export function prefetchChannel(login: string): Promise<unknown> {
    return pages.prefetch(login.toLowerCase(), function () {
        return channelPage(login);
    });
}

/** Forgets every page (the tests) */
export function forgetPages(): void {
    pages.clear();
}
