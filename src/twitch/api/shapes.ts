// Whether what was read back from the device has the shape the tiles draw (api/types.ts): a kept answer (Home's rows,
// the favorites') that another build wrote, or that is damaged, is told by these and not drawn.

import { Channel, Game, Stream, Video } from './types.js';

export function isText(v: unknown): boolean {
    return typeof v === 'string';
}

export function isChannel(c: Channel): boolean {
    return !!c && isText(c.id) && isText(c.login) && isText(c.displayName) && isText(c.avatar);
}

export function isGame(g: Game | undefined): boolean {
    return !!g && isText(g.id) && isText(g.name) && isText(g.displayName) && isText(g.boxArt);
}

/** A stream with its channel, and its category where it has one */
export function isStream(s: Stream): boolean {
    return !!s && isText(s.id) && isText(s.title) && typeof s.viewers === 'number' && isText(s.preview) && isChannel(s.channel) &&
        (s.game === undefined || isGame(s.game));
}

/** A past broadcast with its channel, and its category where it has one */
export function isVideo(v: Video): boolean {
    return !!v && isText(v.id) && isText(v.title) && isText(v.preview) && isText(v.publishedAt) && typeof v.lengthSeconds === 'number' &&
        typeof v.views === 'number' && isChannel(v.channel) && (v.game === undefined || isGame(v.game));
}
