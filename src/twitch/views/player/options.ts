// The player's options page (the options button), as Twitch's TV app has it: the top menu's Go Back alone over
// full-width rows, Report Video (past broadcasts), Report Channel and "Not interested in this channel?"; a live
// player's also Bolli's Live Chat Settings first, which goes back to the player and opens them over it. The reports
// open Twitch's QR pages; Not interested is Twitch's (a guest signs in first, the account is asked "Are you sure?").
// Up from the first row goes to Go Back. The player stays under it: Back returns to it with its chat.

import { h, setShown, toggleClass } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { Channel } from '../../api/types.js';
import { MenuMode, Navigator, Screen } from '../navigator.js';
import { askNotInterested } from '../not-interested.js';
import { QrInfo, QrPage, reportChannel, reportVideo } from '../qr.js';
import { icon } from './icons.js';

interface Row {
    el: HTMLElement;
    act: () => void;
}

export class OptionsPage implements Screen {
    el: HTMLElement;
    menu: MenuMode = 'back';
    private rows: Row[] = [];
    private index = 0;
    private focused = true;

    /** videoId: a past broadcast's (it adds Report Video); chatSettings: a live player's, opening its chat's settings */
    constructor(channel: Channel, videoId: string, nav: Navigator, chatSettings?: () => void) {
        this.el = h('div', 'bt-opt');
        var list = this.el.appendChild(h('div', 'bt-opt-rows')) as HTMLElement;
        if (chatSettings) {
            this.add(list, 'chatset', 'Live Chat Settings', 'Where the chat shows and how it looks', function () {
                nav.back();
                chatSettings();
            });
        }
        var qr = function (info: QrInfo): () => void {
            return function () {
                nav.push(new QrPage(info, nav));
            };
        };
        if (videoId) {
            this.add(list, 'pencil', 'Report Video', 'Is this video violating ToS? Tell us about it!', qr(reportVideo(videoId)));
        }
        this.add(list, 'pencil', 'Report Channel', 'Is this channel violating ToS? Tell us about it!', qr(reportChannel(channel.login)));
        this.add(list, 'sparkle', 'Not interested in this channel?', 'We won\'t recommend it to you anymore', function () {
            askNotInterested({ kind: 'channel', channel: channel }, nav);
        });
        setShown(this.el, false);
        this.mark();
    }

    show(): void {
        setShown(this.el, true);
    }

    hide(): void {
        setShown(this.el, false);
    }

    atTop(): boolean {
        return this.index === 0;
    }

    setFocused(focused: boolean): void {
        this.focused = focused;
        this.mark();
    }

    onKey(code: number): boolean {
        if (code === KEY.UP || code === KEY.DOWN) {
            var to = this.index + (code === KEY.UP ? -1 : 1);
            if (to < 0 || to >= this.rows.length) {
                // Up from the first row is the shell's (Go Back)
                return code === KEY.DOWN;
            }
            this.index = to;
            this.mark();
            return true;
        }
        if (code === KEY.OK) {
            this.rows[this.index].act();
            return true;
        }
        return code === KEY.LEFT || code === KEY.RIGHT;
    }

    private add(list: HTMLElement, picture: string, title: string, text: string, act: () => void): void {
        var el = list.appendChild(h('div', 'bt-opt-row')) as HTMLElement;
        el.appendChild(h('div', 'bt-opt-icon')).appendChild(icon(picture));
        el.appendChild(h('div', 'bt-opt-title', title));
        el.appendChild(h('div', 'bt-opt-text', text));
        el.appendChild(h('div', 'bt-opt-next')).appendChild(icon('next'));
        this.rows.push({ el: el, act: act });
    }

    private mark(): void {
        for (var i = 0; i < this.rows.length; i++) {
            toggleClass(this.rows[i].el, 'bt-focused', this.focused && i === this.index);
        }
    }
}
