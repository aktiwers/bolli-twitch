// What the shell gives every screen to open others, and what it asks of a screen beyond core's View.

import { View } from '../../core/view.js';
import { Item } from '../api/types.js';

/** The top menu over a screen: its items (over a page Go Back stands first, in the logo's place), Go Back alone, the
 * logo and the items also over a page (Twitch's "Are you sure?"), or none */
export type MenuMode = 'items' | 'back' | 'nav' | 'none';

/** Twitch's error pages: the page is not there, the stream cannot play on this device, parental controls */
export type ErrorKind = 'not-found' | 'not-playable' | 'parental';

export interface Screen extends View {
    /** How the menu stands over it ('items' when not said) */
    menu?: MenuMode;
    /** Nothing on it takes focus: focus stays on the menu */
    menuFocus?: boolean;
    /** It shows the account's own things: a section is made anew, a page closed, when the account changes */
    accountBound?: boolean;
    /** The account changed and the screen stays: what it shows of the account is asked again */
    accountChanged?(): void;
    /** A full-screen player: the screens under it keep pictures for their focused row only (narrow()) until they show */
    plays?: boolean;
    narrow?(): void;
    /** It shows what OK on item would open (the player's avatar over that channel's page goes back to it) */
    shows?(item: Item): boolean;
    /** What failed is asked again. pressed: OK, which asks only where focus is on Try Again (true: it was, the press
     * is used); else the network is back and everything failed or waiting is asked at once */
    retry?(pressed?: boolean): boolean;
}

export interface Navigator {
    /** What OK on a tile opens: the player for a stream, a category's page */
    open(item: Item): void;
    /** A page over the screen on top */
    push(view: Screen): void;
    /** Closes the page on top */
    back(): void;
    /** Twitch's Sign In as a page over the top one (a guest's Follow or Not Interested) */
    signIn(): void;
    /** Home, the pages over the sections closed (the gate's Go Home, after Not Interested) */
    home(): void;
    /** Twitch's error page in the place of the page from */
    error(from: Screen, kind: ErrorKind): void;
    /** What focus resting on item fetches ahead, by its kind (settles once fetched) */
    ahead(item: Item): Promise<unknown> | void;
}
