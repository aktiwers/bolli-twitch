// The page the app opens on (Settings, Home unless chosen): Home, History, Favorites, Following, Browse or Search.
// Following needs an account and History Watch History on its own page: without, the app opens on Home.

import { load, save } from '../../core/store.js';
import { MenuItem } from './menu.js';

var KEY = 'twitch.startPage';
export var START_PAGES: MenuItem[] = ['home', 'history', 'favorites', 'following', 'browse', 'search'];

export function startPage(): MenuItem {
    var page = load<string>(KEY) as MenuItem;
    return START_PAGES.indexOf(page) >= 0 ? page : 'home';
}

/** From the next start on */
export function setStartPage(page: MenuItem): void {
    save(KEY, page);
}
