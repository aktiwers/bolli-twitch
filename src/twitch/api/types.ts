// What the screens show, as the API layer hands it over: plain objects made from Twitch's GraphQL replies, with
// picture addresses already sized for their tiles. Every part of the app (api/, views/, player/, chat/) uses these.

export interface Game {
    id: string;
    /** The name in addresses (/directory/game/<name>) */
    name: string;
    displayName: string;
    /** Box art sized for a category tile (Twitch asks 138x184); bigger through boxArtAt() in api/pictures.ts */
    boxArt: string;
    viewers?: number;
    followers?: number;
    /** The category's top live stream: what the Home hero shows while the category's tile has focus */
    topStream?: Stream;
    /** Signed in: the account follows this category (the Follow button's state); unset for a guest */
    followed?: boolean;
}

export interface Channel {
    id: string;
    login: string;
    displayName: string;
    /** Round avatar, 50x50 as Twitch asks; bigger sizes through avatarAt() in api/pictures.ts */
    avatar: string;
    /** The channel page's header: description and name colour */
    description?: string;
    color?: string;
    /** The channel page's header and offline channel tiles */
    followers?: number;
    /** The channel's banner (Following's hero for an offline channel), when it has one */
    banner?: string;
    /** Signed in: the account follows this channel (the Follow button's state); unset for a guest */
    followed?: boolean;
}

export interface Stream {
    id: string;
    channel: Channel;
    title: string;
    game?: Game;
    viewers: number;
    /** Preview picture, 276x155 as Twitch asks (the hero takes a bigger one through previewAt()) */
    preview: string;
    /** ISO time the broadcast began (uptime) */
    startedAt?: string;
    /** Twitch's content labels: a mature channel shows its gate first */
    mature?: boolean;
    /** Twitch gates it by age, region or an account's limits: its gate shows whatever Bolli's setting says */
    restricted?: boolean;
    /** A portrait stream: Twitch draws its 360x640 picture (verticalPreview()) over a blurred copy */
    vertical?: boolean;
}

/** What changes while a stream plays, asked again every minute (api/channel.ts liveInfo): the player keeps the
 * rest (channel, picture, content gate) from the page it was opened from */
export interface LiveUpdate {
    /** A different id than the player's: the channel began a new broadcast */
    id: string;
    title: string;
    viewers: number;
    startedAt?: string;
    /** The category now: its names only (no box art) */
    game?: { id: string; name: string; displayName: string };
}

export interface Video {
    id: string;
    title: string;
    channel: Channel;
    game?: Game;
    /** Preview picture, 320x180 as Twitch asks for video tiles */
    preview: string;
    lengthSeconds: number;
    views: number;
    /** ISO time Twitch made the video (its createdAt: the tile and the player show the same date) */
    publishedAt: string;
    kind: 'archive' | 'highlight' | 'upload';
    /** Signed in: where the account stopped watching, in seconds (the tile's progress bar) */
    position?: number;
    /** Twitch's content labels ask for the gate before it plays */
    mature?: boolean;
    /** Twitch gates it by age, region or an account's limits: its gate shows whatever Bolli's setting says */
    restricted?: boolean;
}

export interface Clip {
    slug: string;
    title: string;
    channel: Channel;
    game?: Game;
    /** Preview picture, 320x180 (Twitch draws clip tiles as video tiles) */
    thumbnail: string;
    durationSeconds: number;
    views: number;
    createdAt: string;
    /** The past broadcast it was cut from and where ("Watch Full Video"), when it still exists */
    videoId?: string;
    videoOffset?: number;
    /** As a video's */
    mature?: boolean;
    restricted?: boolean;
}

/** One tile of a row. An offline channel tile: lastLive is when its last broadcast began (ISO), lastGame what it
 * played (Following's hero: "<when> playing <category>") */
export type Item =
    { kind: 'stream'; stream: Stream } |
    { kind: 'game'; game: Game } |
    { kind: 'video'; video: Video } |
    { kind: 'clip'; clip: Clip } |
    { kind: 'channel'; channel: Channel; live: boolean; lastLive?: string; lastGame?: Game };

/** A row with its title as Twitch words it */
export interface Shelf {
    id: string;
    title: string;
    items: Item[];
}

/** A page of a long list: the next page's cursor, or none at the end */
export interface Page<T> {
    items: T[];
    next?: string;
}
