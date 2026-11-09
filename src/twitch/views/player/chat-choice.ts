// Chat shown or hidden in the live player, as the viewer last left it with the chat button: Twitch's TV app keeps
// that choice across runs and opens every live player the same way. Hidden, the video is full width and the chat is
// not joined until the chat button shows it (less work and memory on the TV while nobody reads it). Where it shows
// and how it looks are Bolli settings (the live chat settings page: chat-settings.ts):
// beside the video (a column at the right, Twitch's own, or at the left, with its Join band; a strip along the bottom
// or top, the picture whole above or below it or zoomed to the screen's width) or over it (at the right or left at a
// height, along the bottom, or in a box of the viewer's own); a strip as a ticker, a band of lines or one message at
// a time; its size, its background over the video, each message's time and its sender's picture, and old messages
// fading.

import { LAYOUT_HEIGHT, LAYOUT_WIDTH } from '../../../core/dom.js';
import { load, save } from '../../../core/store.js';
import { ChatMode, PanelLayout } from '../../chat/panel.js';
import { Box } from '../../player/session.js';

/** The stored layout: true when chat shows over the video */
var OVER_KEY = 'twitch.player.chatOver';
var over: boolean | null = null;

/** Whether chat shows over the video (beside it unless switched) */
export function chatOver(): boolean {
    if (over === null) {
        over = load<boolean>(OVER_KEY) === true;
    }
    return over;
}

/** Chat over the video (true) or beside it; players follow it */
export function setChatOver(on: boolean): void {
    over = on;
    save(OVER_KEY, on);
}

/** The chat's settings, each with its values (the first the default): beside the video its side; over it its
 * position and its height at a side; a strip's style, and the picture beside a strip */
export type ChatPref = 'chatSide' | 'chatPosition' | 'chatHeight' | 'chatBottom' | 'chatPicture' | 'chatSize' | 'chatBackground' | 'chatTimes' |
    'chatAvatars' | 'chatFade';
export type ChatValue = string | number | boolean;
export var CHAT_VALUES: { [name in ChatPref]: ChatValue[] } = {
    chatSide: ['right', 'left', 'bottom', 'top'],
    chatPosition: ['right', 'left', 'bottom', 'custom'],
    chatHeight: ['tall', 'full', 'half'],
    chatBottom: ['ticker', 'band', 'one'],
    chatPicture: ['fit', 'fill'],
    chatSize: ['medium', 'tiny', 'small', 'large'],
    chatBackground: ['panel', 'bubbles', 'none'],
    chatTimes: [false, true],
    chatAvatars: [false, true],
    chatFade: [0, 15, 30, 60]
};
var PREF_KEY = 'twitch.player.';
var kept: { [name: string]: ChatValue } = {};

/** A setting's value: the stored one when it is one of its values, else its default */
export function chatPref(name: ChatPref): ChatValue {
    if (!(name in kept)) {
        var stored = load<ChatValue>(PREF_KEY + name);
        kept[name] = stored !== null && CHAT_VALUES[name].indexOf(stored) >= 0 ? stored : CHAT_VALUES[name][0];
    }
    return kept[name];
}

export function setChatPref(name: ChatPref, value: ChatValue): void {
    kept[name] = value;
    save(PREF_KEY + name, value);
}

/** How large each size draws the chat (text, badges, emotes; over the video its width, a strip its height) next to
 * Twitch's */
var SCALE: { [size: string]: number } = { tiny: 0.7, small: 0.85, medium: 1, large: 1.2 };
/** Twitch's column: its width (themes/chat.css), and an emote's height there */
var WIDTH = 320;
var EMOTE_PX = 28.8;
/** Where the player's controls start (its Follow button's top, themes/player.css): chat over the video or along a
 * strip is kept ABOVE_CONTROLS above them while they show */
var CONTROLS_TOP = 561;
var ABOVE_CONTROLS = 16;
/** Over the video (layout units): its distance from the screen's edges, the tall and half heights' tops and the tall
 * one's bottom (above the controls, so it stays put when they show), and a box of its own's least size */
var EDGE = 24;
var TALL_TOP = 120;
var TALL_BOTTOM = CONTROLS_TOP - ABOVE_CONTROLS;
var HALF_TOP = 360;
export var LEAST = { width: 200, height: 100 };
/** A strip's height at Medium: one line (a ticker, one at a time), or a band of three */
var LINE_HIGH = 46;
var BAND_HIGH = 130;
var BOX_KEY = 'twitch.player.chatBox';
/** The box in memory, read from storage the first time (undefined: not read yet) */
var box: Box | null | undefined;

/** A box of the viewer's own (none yet: null) */
export function chatBox(): Box | null {
    if (box === undefined) {
        var b = load<Box>(BOX_KEY);
        box = b && b.width >= LEAST.width && b.height >= LEAST.height ? b : null;
    }
    return box;
}

export function setChatBox(b: Box): void {
    box = b;
    save(BOX_KEY, b);
}

/** The scale the size draws at */
function chatScale(): number {
    return SCALE[chatPref('chatSize') as string] || 1;
}

/** Chat as set: kind (column: beside the video at a side, Twitch's panel with its Join band; side: over the video at
 * a side; strip: along the bottom or top; own: a box of the viewer's own), its panel's layout (place null: the
 * stylesheet's, Twitch's column at the right), the room it leaves the picture (the screen but a chat beside it), and
 * where the picture goes in it while chat shows */
export interface ChatLayout extends PanelLayout {
    kind: 'column' | 'side' | 'strip' | 'own';
    room: Box;
    video: Box;
}

/** The screen: the picture with chat hidden or over it */
export var WHOLE: Box = { left: 0, top: 0, width: LAYOUT_WIDTH, height: LAYOUT_HEIGHT };

/** Where chat goes as set and how it shows; own: a box of its own being moved */
export function chatLayout(own?: Box): ChatLayout {
    var scale = chatScale();
    var strip = chatPref('chatBottom') as ChatMode;
    var high = Math.round((strip === 'band' ? BAND_HIGH : LINE_HIGH) * scale);
    var layout: ChatLayout = { kind: 'column', place: null, mode: 'column', emotePx: EMOTE_PX * scale, avatars: chatPref('chatAvatars') === true,
        look: chatClasses(), room: WHOLE, video: WHOLE };
    if (!chatOver()) {
        var side = chatPref('chatSide');
        if (side === 'right' || side === 'left') {
            var left = side === 'left';
            layout.place = left ? { left: 0, top: 0, width: WIDTH, height: LAYOUT_HEIGHT } : null;
            layout.room = layout.video = { left: left ? WIDTH : 0, top: 0, width: LAYOUT_WIDTH - WIDTH, height: LAYOUT_HEIGHT };
            return layout;
        }
        // A strip beside the picture: the picture whole above or below it, in the middle, or zoomed to the screen's
        // width with its middle in the middle of the room (the strip covering what it cuts; a band would cut too much
        // of it: whole)
        var top = side === 'top';
        var room = layout.room = { left: 0, top: top ? high : 0, width: LAYOUT_WIDTH, height: LAYOUT_HEIGHT - high };
        var wide = Math.round(room.height * 16 / 9);
        layout.kind = 'strip';
        layout.mode = strip;
        layout.place = { left: 0, top: top ? 0 : room.height, width: LAYOUT_WIDTH, height: high };
        layout.video = chatPref('chatPicture') === 'fill' && strip !== 'band' ?
            { left: 0, top: room.top + Math.round((room.height - LAYOUT_HEIGHT) / 2), width: LAYOUT_WIDTH, height: LAYOUT_HEIGHT } :
            { left: Math.round((LAYOUT_WIDTH - wide) / 2), top: room.top, width: wide, height: room.height };
        return layout;
    }
    var position = chatPref('chatPosition');
    layout.mode = 'rows';
    if (position === 'custom') {
        layout.kind = 'own';
        layout.place = fitted(own || chatBox() || sidePlace(scale));
    } else if (position === 'bottom') {
        layout.kind = 'strip';
        layout.mode = strip;
        layout.place = { left: EDGE, top: LAYOUT_HEIGHT - EDGE - high, width: LAYOUT_WIDTH - 2 * EDGE, height: high };
    } else {
        layout.kind = 'side';
        layout.place = sidePlace(scale);
    }
    return layout;
}

/** Over the video at the right or left, its height as set */
function sidePlace(scale: number): Box {
    var width = Math.round(WIDTH * scale);
    var height = chatPref('chatHeight');
    var top = height === 'full' ? EDGE : height === 'half' ? HALF_TOP : TALL_TOP;
    return {
        left: chatPref('chatPosition') === 'left' ? EDGE : LAYOUT_WIDTH - EDGE - width, top: top, width: width,
        height: (height === 'tall' ? TALL_BOTTOM : LAYOUT_HEIGHT - EDGE) - top
    };
}

/** A box kept on the screen, at least LEAST */
export function fitted(b: Box): Box {
    var width = Math.max(LEAST.width, Math.min(LAYOUT_WIDTH - 2 * EDGE, b.width));
    var height = Math.max(LEAST.height, Math.min(LAYOUT_HEIGHT - 2 * EDGE, b.height));
    return {
        left: Math.max(EDGE, Math.min(LAYOUT_WIDTH - EDGE - width, b.left)), top: Math.max(EDGE, Math.min(LAYOUT_HEIGHT - EDGE - height, b.top)),
        width: width, height: height
    };
}

/** A box kept above the player's controls: moved up as much as it needs, or where that would take it off the screen
 * (a column the whole height), shorter instead */
export function lifted(b: Box): Box {
    var by = Math.max(0, b.top + b.height + ABOVE_CONTROLS - CONTROLS_TOP);
    if (!by) {
        return b;
    }
    return b.top - by < EDGE ? { left: b.left, top: b.top, width: b.width, height: Math.max(LEAST.height, b.height - by) } :
        { left: b.left, top: b.top - by, width: b.width, height: b.height };
}

/** The classes for how chat looks as set (on the player, or the settings page's example; themes/chat.css): its size,
 * over the video its background, each message's time, and old messages fading */
export function chatClasses(): string {
    var fade = chatPref('chatFade');
    return (chatOver() ? 'bt-chatover bt-chat-bg-' + chatPref('chatBackground') + ' ' : '') + 'bt-chat-size-' + chatPref('chatSize') +
        (chatPref('chatTimes') === true ? ' bt-chat-times' : '') + (fade ? ' bt-chat-fade-' + fade : '');
}

/** The stored choice: true when chat was last hidden */
var HIDDEN_KEY = 'twitch.player.chatHidden';
/** The choice in memory, read from storage the first time */
var hidden: boolean | null = null;

/** Whether live players open with chat hidden */
export function chatHidden(): boolean {
    if (hidden === null) {
        hidden = load<boolean>(HIDDEN_KEY) === true;
    }
    return hidden;
}

/** The chat button hid (true) or showed chat; players opened after it follow it */
export function setChatHidden(on: boolean): void {
    hidden = on;
    save(HIDDEN_KEY, on);
}
