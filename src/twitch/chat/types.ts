// A channel's chat between its parts: the connection (chat/connection.ts) hands the panel (chat/panel.ts) Twitch's
// IRC lines, and the panel makes the ones it draws into messages (chat/parse.ts): text, emote and link parts with
// the sender's badge pictures.

import { IrcLine } from './irc.js';

/** Messages the panel keeps, as Twitch's TV app does; also the most lines worth holding before they are drawn */
export var KEPT = 30;

export type Part =
    { kind: 'text'; text: string } |
    { kind: 'emote'; name: string; url: string } |
    { kind: 'link'; text: string } |
    /** Words drawn in the link colour, as "Prime" in a sub notice */
    { kind: 'highlight'; text: string };

/** chat: a sender's message; notice: a sub, resub, gift or raid on the lighter band; status: a grey line (a timeout,
 * a ban, a drop); welcome: the greeting with its divider */
export type MessageKind = 'chat' | 'notice' | 'status' | 'welcome';

export interface Message {
    kind: MessageKind;
    /** Twitch's message id, '' for status lines */
    id: string;
    /** The sender's login (removals match on it), '' for status lines */
    login: string;
    /** The sender as drawn: the display name, with the login after it when it is in other letters */
    name: string;
    /** The name colour made readable on the dark panel */
    color: string;
    /** The badges' pictures (2x, sharp at the 1.5x drawing scale) */
    badges: string[];
    parts: Part[];
    /** A notice's own words, drawn on the band over the sender's message */
    notice?: Part[];
    /** A "/me" message: the colour of its text, the sender's own as sent */
    action?: string;
}

export interface ChatEvents {
    /** Chat lines in arrival order (PRIVMSG, USERNOTICE, and the CLEARCHAT of a timeout or ban for its status line) */
    lines(list: IrcLine[]): void;
    /** Messages deleted: these ids, or all of a login's (timeouts, bans), or the whole chat (neither) */
    removed(ids: string[] | null, login?: string): void;
    connected(on: boolean): void;
    /** The connection moved to another channel: what was shown belongs to the last one */
    reset(): void;
}
