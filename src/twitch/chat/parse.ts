// Twitch chat's IRC lines (chat/irc.ts) as the messages the panel draws: a chat line split into text, emote and link
// parts (Twitch's emotes where the line places them, then the words that name a third-party emote) with the sender's
// badges and the name colour Twitch's TV app draws; a sub or resub as a notice in the TV app's
// words; gifts and raids, which the TV app leaves out, as a Bolli extra in Twitch's own system text (on unless switched
// off in Settings); a timeout or ban as a grey status line. How the live chat settings show each emote is worked out
// when a message is drawn (shownParts), so a change of them needs no line read again.

import { load, save } from '../../core/store.js';
import { IrcLine, tagValue } from './irc.js';
import { ChatEmote, EmoteFinder, EmotePart, EmoteShow, Message, MessageKind, Part } from './types.js';

/** The picture of badge "set/version" in channel's chat, or '' when the lists don't have it (chat/assets.ts) */
export type BadgeLookup = (channel: string, id: string) => string;

/** The third-party emotes of channel's chat, or null for none (chat/emotes.ts) */
export type EmoteLookup = (channel: string) => EmoteFinder | null;

/** Twitch's colour for a name without one */
var DEFAULT_COLOR = '#efeff1';
var EMOTE_URL = 'https://static-cdn.jtvnw.net/emoticons/v2/';
/** Notices drawn in Twitch's own system text: gifts and raids */
var SYSTEM_WORDS: { [kind: string]: boolean } = { subgift: true, anonsubgift: true, submysterygift: true, anonsubmysterygift: true, raid: true };
/** The stored setting: false switches gift and raid notices off */
var EXTRA_KEY = 'twitch.chat.extraNotices';
/** The setting in memory, read from storage the first time: every notice asks for it */
var extras: boolean | null = null;

/** Whether gift and raid notices are drawn: Twitch's TV app draws none of them (only subs and resubs), Bolli does
 * unless they are switched off */
export function extraNotices(): boolean {
    if (extras === null) {
        extras = load<boolean>(EXTRA_KEY) !== false;
    }
    return extras;
}

/** Switches gift and raid notices on or off (Settings); lines that come after it follow it */
export function setExtraNotices(on: boolean): void {
    extras = on;
    save(EXTRA_KEY, on);
}

/** A chat line (PRIVMSG), a notice (USERNOTICE) or a timeout or ban (CLEARCHAT) as a Message, or null for what the
 * panel does not draw */
export function messageOf(line: IrcLine, badges: BadgeLookup, emotes?: EmoteLookup): Message | null {
    switch (line.command) {
        case 'PRIVMSG':
            return chatMessage(line, badges, emotes);
        case 'USERNOTICE':
            return noticeOf(line, emotes);
        case 'CLEARCHAT':
            return banOf(line);
    }
    return null;
}

/** Whether messageOf draws the line, told from its command, tags and whether it has a text, without parsing it: the
 * connection drops the others so that they never take the place of lines that draw */
export function drawable(line: IrcLine): boolean {
    switch (line.command) {
        case 'PRIVMSG':
            return line.params[1] !== undefined;
        case 'USERNOTICE':
            return noticeDrawn(line);
        case 'CLEARCHAT':
            return !!line.params[1];
    }
    return false;
}

/** The sender's login: the login tag, else the nick in nick!user@host */
export function loginOf(line: IrcLine): string {
    if (line.tags.login) {
        return line.tags.login;
    }
    var bang = line.prefix.indexOf('!');
    return bang > 0 ? line.prefix.slice(0, bang) : line.prefix;
}

/** The line's channel's third-party emotes, if any */
function finderOf(line: IrcLine, emotes?: EmoteLookup): EmoteFinder | null {
    return emotes ? emotes((line.params[0] || '').slice(1)) : null;
}

function chatMessage(line: IrcLine, badges: BadgeLookup, emotes?: EmoteLookup): Message | null {
    var text = line.params[1];
    if (text === undefined) {
        return null;
    }
    var action = false;
    // "/me" arrives as a CTCP ACTION; emote positions count from the inner text
    if (text.charCodeAt(0) === 1 && text.slice(1, 8) === 'ACTION ') {
        action = true;
        text = text.slice(8, text.charCodeAt(text.length - 1) === 1 ? text.length - 1 : text.length);
    }
    var m = base('chat', line, loginOf(line));
    m.badges = badgesOf(line, badges);
    m.parts = partsOf(text, line.tags.emotes || '', finderOf(line, emotes));
    if (action) {
        // Twitch's TV app draws a /me text in the colour as sent, only the name made readable
        m.action = validColor(line.tags.color || '') || DEFAULT_COLOR;
    }
    return m;
}

/** Subs and resubs; gifts and raids with their system text while extraNotices() (not the single gifts of a gift
 * bomb: its submysterygift notice stands for all of them) */
function noticeDrawn(line: IrcLine): boolean {
    var kind = line.tags['msg-id'];
    if (kind === 'sub' || kind === 'resub') {
        return true;
    }
    return SYSTEM_WORDS.hasOwnProperty(kind) && extraNotices() && !!tagValue(line, 'system-msg') &&
        !(line.tags['msg-param-community-gift-id'] && (kind === 'subgift' || kind === 'anonsubgift'));
}

/** A notice is drawn without badges, its own words on the band and the sender's message (if any) under them */
function noticeOf(line: IrcLine, emotes?: EmoteLookup): Message | null {
    if (!noticeDrawn(line)) {
        return null;
    }
    var kind = line.tags['msg-id'];
    var login = loginOf(line);
    var words: Part[];
    if (kind === 'sub' || kind === 'resub') {
        var months = +line.tags['msg-param-cumulative-months'] || 0;
        if (tagValue(line, 'msg-param-sub-plan') === 'Prime') {
            words = [textPart(login + ' just subscribed with '), { kind: 'highlight', text: 'Prime' }, textPart('!')];
        } else if (kind === 'resub' && months > 1) {
            words = [textPart(login + ' subscribed for ' + months + ' months in a row!')];
        } else {
            words = [textPart(login + ' just subscribed!')];
        }
    } else {
        words = [textPart(tagValue(line, 'system-msg'))];
    }
    var m = base('notice', line, login);
    m.notice = words;
    m.parts = line.params[1] ? partsOf(line.params[1], line.tags.emotes || '', finderOf(line, emotes)) : [];
    return m;
}

/** A timeout's or ban's status line; null when the whole chat was cleared */
function banOf(line: IrcLine): Message | null {
    var login = line.params[1];
    if (!login) {
        return null;
    }
    var duration = line.tags['ban-duration'];
    return statusLine('status', duration ? login + ' has been timed out for ' + duration + ' seconds.' : login + ' has been banned.');
}

/** A grey line without a sender: a status line or the welcome */
export function statusLine(kind: MessageKind, words: string): Message {
    return { kind: kind, id: '', login: '', name: '', color: '', badges: [], parts: [textPart(words)] };
}

/** A sender's message without badges or parts yet */
function base(kind: MessageKind, line: IrcLine, login: string): Message {
    // Trimmed: a display name can end in an escaped space
    var shown = tagValue(line, 'display-name').trim() || login;
    // A display name in other letters than the login (e.g. Japanese) shows the login after it
    if (shown.toLowerCase() !== login) {
        shown += ' (' + login + ')';
    }
    var m: Message = { kind: kind, id: line.tags.id || '', login: login, name: shown, color: readableColor(line.tags.color || ''), badges: [], parts: [] };
    // The sender's id (the Avatars setting asks for its picture) and when Twitch got it (Timestamps)
    if (line.tags['user-id']) {
        m.userId = line.tags['user-id'];
    }
    if (+line.tags['tmi-sent-ts']) {
        m.at = +line.tags['tmi-sent-ts'];
    }
    return m;
}

/** The badges tag's pictures, in its order, those the lists know for the line's channel */
function badgesOf(line: IrcLine, lookup: BadgeLookup): string[] {
    var list: string[] = [];
    var tag = line.tags.badges;
    if (!tag) {
        return list;
    }
    var channel = (line.params[0] || '').slice(1);
    var ids = tag.split(',');
    for (var i = 0; i < ids.length; i++) {
        var picture = lookup(channel, ids[i]);
        if (picture) {
            list.push(picture);
        }
    }
    return list;
}

function textPart(words: string): Part {
    return { kind: 'text', text: words };
}

interface Range {
    start: number;
    end: number;
    id: string;
}

/** The text as parts: the emotes tag's ranges ("id:0-4,6-10/id2:12-15", code point positions, ends included) as
 * emotes, links and the words extra knows as its emotes in the rest */
export function partsOf(text: string, emotes: string, extra?: EmoteFinder | null): Part[] {
    var parts: Part[] = [];
    if (!emotes) {
        addText(parts, text, extra);
        return parts;
    }
    var ranges: Range[] = [];
    var groups = emotes.split('/');
    for (var g = 0; g < groups.length; g++) {
        var colon = groups[g].indexOf(':');
        if (colon < 1) {
            continue;
        }
        var id = groups[g].slice(0, colon);
        var spans = groups[g].slice(colon + 1).split(',');
        for (var s = 0; s < spans.length; s++) {
            var dash = spans[s].indexOf('-');
            var start = +spans[s].slice(0, dash);
            var end = +spans[s].slice(dash + 1);
            if (dash > 0 && end >= start) {
                ranges.push({ start: start, end: end, id: id });
            }
        }
    }
    ranges.sort(function (a, b) { return a.start - b.start; });
    // Code point positions to string positions (they differ only after characters outside the BMP, e.g. emoji)
    var at = /[\uD800-\uDBFF]/.test(text) ? codePointOffsets(text) : null;
    var pos = 0;
    for (var r = 0; r < ranges.length; r++) {
        var from = at ? at[ranges[r].start] : ranges[r].start;
        var to = at ? at[ranges[r].end + 1] : ranges[r].end + 1;
        if (from === undefined || to === undefined || from < pos || to > text.length) {
            continue;
        }
        if (from > pos) {
            addText(parts, text.slice(pos, from), extra);
        }
        parts.push({ kind: 'emote', name: text.slice(from, to), url: EMOTE_URL + ranges[r].id + '/static/dark/2.0', id: ranges[r].id });
        pos = to;
    }
    if (pos < text.length) {
        addText(parts, text.slice(pos), extra);
    }
    return parts;
}

/** For each code point position, its string position (and one past the end) */
function codePointOffsets(text: string): number[] {
    var offsets: number[] = [];
    for (var i = 0; i < text.length; i++) {
        offsets.push(i);
        var c = text.charCodeAt(i);
        if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
            i++;
        }
    }
    offsets.push(text.length);
    return offsets;
}

/** Addresses: with a scheme, www., or a name ending in a common top-level domain */
var LINK = /^(?:https?:\/\/\S+|www\.\S+\.\S+|(?:[a-z0-9-]+\.)+(?:com|net|org|tv|gg|io|me|co|uk|de|fr|es|it|nl|se|no|dk|fi|pl|ru|jp|kr|br|ca|au|ly|be|gl|to|app|dev|xyz|info)(?:\/\S*)?)$/i;

/** Between words */
var SPACES = /(\s+)/;

/** Text, with its addresses as link parts and the words extra knows as its emotes; a zero-width emote right after
 * an emote goes over it (the spaces between them kept in its part). Plain stretches are cut from words as they are */
function addText(parts: Part[], words: string, extra?: EmoteFinder | null): void {
    if (!extra && words.indexOf('.') === -1) {
        parts.push(textPart(words));
        return;
    }
    var pieces = words.split(SPACES);
    /** Where the plain stretch starts, where this piece starts, and whether the stretch has spaces only */
    var from = 0;
    var at = 0;
    var spaces = true;
    for (var i = 0; i < pieces.length; i++) {
        var piece = pieces[i];
        var word = i % 2 === 0 && piece !== '';
        var emote = word && extra ? extra(piece) : null;
        if (emote || word && piece.indexOf('.') >= 0 && LINK.test(piece)) {
            var over = !!emote && emote.over && spaces && parts.length > 0 && parts[parts.length - 1].kind === 'emote';
            if (at > from && !over) {
                parts.push(textPart(words.slice(from, at)));
            }
            parts.push(emote ? emotePart(piece, emote, over, over ? words.slice(from, at) : '') : { kind: 'link', text: piece });
            from = at + piece.length;
            spaces = true;
        } else if (word) {
            spaces = false;
        }
        at += piece.length;
    }
    if (from < words.length) {
        parts.push(textPart(from ? words.slice(from) : words));
    }
}

/** A third-party emote's part: its ratio when it is not square; over when drawn over the emote before it, with the
 * spaces typed between them */
function emotePart(name: string, emote: ChatEmote, over: boolean, gap: string): Part {
    var part: EmotePart = { kind: 'emote', name: name, url: emote.url };
    if (emote.ratio !== 1) {
        part.ratio = emote.ratio;
    }
    if (over) {
        part.over = true;
        part.gap = gap;
    }
    return part;
}

/** parts with the words extra knows made its emotes: for a message made before its channel's lists were here, or
 * while word emotes showed as text */
export function withWordEmotes(parts: Part[], extra: EmoteFinder): Part[] {
    var out: Part[] = [];
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part.kind === 'text') {
            addText(out, part.text, extra);
        } else {
            out.push(part);
        }
    }
    return out;
}

var SPACE_LAST = /\s$/;
var SPACES_FIRST = /^\s+/;
var SPACES_LAST = /\s+$/;
/** What draws nothing: spaces, and the characters without a shape of their own (zero-width and format characters,
 * fillers, variation selectors, the tag characters some chat programs end a repeated message with) */
var UNSEEN = /[\s\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\u2800\u3164\uFE00-\uFE0F\uFEFF\uFFA0]|\uDB40[\uDC00-\uDFFF]/g;

/** parts as the live chat settings show their emotes (show: how one shows): as its picture, as the word that was
 * typed, or left out, the spaces around it then made one (none at the message's start or end). parts themselves
 * without an emote; [] when nothing that can be seen is left */
export function shownParts(parts: Part[], show: (emote: EmotePart) => EmoteShow): Part[] {
    var first = 0;
    while (first < parts.length && parts[first].kind !== 'emote') {
        first++;
    }
    if (first === parts.length) {
        return parts;
    }
    var out: Part[] = [];
    /** The text since the last picture or link, which goes into out as one part; cut: an emote was left out since
     * anything was last kept */
    var text = '';
    var cut = false;
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var how: EmoteShow | '' = part.kind === 'emote' ? show(part) : '';
        if (how === 'hidden') {
            cut = true;
            continue;
        }
        var words = part.kind === 'text' ? part.text : '';
        if (part.kind === 'emote') {
            // One drawn over the emote before it stays so only as a picture right after that one's picture; else it
            // stands on its own, after the spaces typed between them
            var over = how === 'pictures' && !text && !cut && out.length > 0 && out[out.length - 1].kind === 'emote';
            words = (part.over && !over ? part.gap || '' : '') + (how === 'text' ? part.name : '');
        }
        if (cut && words) {
            // Spaces (or the message's start) before what was left out: those after it go
            if (text ? SPACE_LAST.test(text) : !out.length) {
                words = words.replace(SPACES_FIRST, '');
            }
            cut = !words;
        }
        text += words;
        if (part.kind !== 'text' && how !== 'text') {
            if (text) {
                out.push(textPart(text));
                text = '';
            }
            out.push(part);
            cut = false;
        }
    }
    if (cut) {
        text = text.replace(SPACES_LAST, '');
    }
    // Text alone is left, with nothing in it to see (after the emotes left out, a mark that draws nothing): none
    if (text && (out.length || text.replace(UNSEEN, ''))) {
        out.push(textPart(text));
    }
    return out;
}

/** What a CLEARMSG or CLEARCHAT deletes: one message (ids), all of a login's, or the whole chat (neither) */
export interface Removal {
    ids: string[] | null;
    login?: string;
}

export function removalOf(line: IrcLine): Removal | null {
    if (line.command === 'CLEARMSG') {
        var target = line.tags['target-msg-id'];
        return target ? { ids: [target] } : null;
    }
    if (line.command !== 'CLEARCHAT') {
        return null;
    }
    return line.params[1] ? { ids: null, login: line.params[1] } : { ids: null };
}

/** The colour as '#rrggbb', or '' when it is none */
function validColor(color: string): string {
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : '';
}

/** Twitch's TV app's dark page, which name colours are made readable against */
var PAGE = [15, 14, 17];
/** The contrast a name colour needs against the page */
var MIN_CONTRAST = 4.5;
/** A colour with every channel below this is drawn grey instead */
var DARK = 36;
var DARK_GREY = '#7a7a7a';
/** Most lightness steps tried */
var STEPS = 51;
var readable: { [color: string]: string } = {};

/** The name colour as Twitch's TV app draws it: grey when every channel is below 36; else, while it has less than
 * 4.5:1 against the page, its CIELAB lightness raised by a tenth (at most 51 times, the channels kept unrounded and
 * clipped to sRGB). None or junk: Twitch's default */
export function readableColor(color: string): string {
    var sent = validColor(color);
    if (!sent) {
        return DEFAULT_COLOR;
    }
    var known = readable[sent];
    if (known) {
        return known;
    }
    var rgb = [parseInt(sent.slice(1, 3), 16), parseInt(sent.slice(3, 5), 16), parseInt(sent.slice(5, 7), 16)];
    var out = DARK_GREY;
    if (rgb[0] >= DARK || rgb[1] >= DARK || rgb[2] >= DARK) {
        for (var i = 0; i < STEPS && contrast(rgb) < MIN_CONTRAST; i++) {
            var lab = toLab(rgb);
            lab[0] *= 1.1;
            rgb = fromLab(lab);
        }
        out = '#' + hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
    }
    readable[sent] = out;
    return out;
}

function hex(v: number): string {
    var n = Math.round(v);
    return (n < 16 ? '0' : '') + n.toString(16);
}

/** WCAG's contrast of a colour against the page */
function contrast(rgb: number[]): number {
    var a = luminance(rgb) + 0.05;
    var b = PAGE_LUMINANCE + 0.05;
    return a > b ? a / b : b / a;
}

function luminance(rgb: number[]): number {
    return 0.2126 * wcagLinear(rgb[0]) + 0.7152 * wcagLinear(rgb[1]) + 0.0722 * wcagLinear(rgb[2]);
}

var PAGE_LUMINANCE = luminance(PAGE);

function wcagLinear(c: number): number {
    var v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linear(c: number): number {
    var v = c / 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
}

/** sRGB to CIELAB (D65 white 95.047/100/108.883) with the 4-place matrix and the 0.008856 and 7.787 constants */
function toLab(rgb: number[]): number[] {
    var r = linear(rgb[0]), g = linear(rgb[1]), b = linear(rgb[2]);
    var x = labF((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
    var y = labF(0.2126 * r + 0.7152 * g + 0.0722 * b);
    var z = labF((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function labF(t: number): number {
    return t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;
}

/** CIELAB back to sRGB channels 0-255, clipped, unrounded */
function fromLab(lab: number[]): number[] {
    var y: number;
    var fy: number;
    if (lab[0] <= 8) {
        y = lab[0] / 903.3;
        fy = 7.787 * y + 16 / 116;
    } else {
        fy = (lab[0] + 16) / 116;
        y = fy * fy * fy;
    }
    var x = 0.95047 * Math.pow(lab[1] / 500 + fy, 3);
    var z = 1.08883 * Math.pow(fy - lab[2] / 200, 3);
    return [
        gamma(3.2406 * x - 1.5372 * y - 0.4986 * z),
        gamma(-0.9689 * x + 1.8758 * y + 0.0415 * z),
        gamma(0.0557 * x - 0.2040 * y + 1.0570 * z)
    ];
}

function gamma(v: number): number {
    v = v > 0.0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055 : 12.92 * v;
    return 255 * Math.max(0, Math.min(1, v));
}
