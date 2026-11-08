// Watch time as Twitch's TV app reports it: while a live stream plays in the player for a signed-in viewer, a
// minute-watched event goes to Twitch's analytics (spade) for every minute played, the first after a random part of
// the first minute (as the TV app staggers it), with the viewer, the channel and broadcast, the player and its
// session, and the minutes so far. This is what Twitch counts a viewer's watch time and channel points from; the
// stream itself is fetched as a guest. Only time that plays counts: the player is asked every second whether its
// picture plays in sight. With a minute reported the channel points' bonus is looked for (api/points.ts): every
// BONUS_EVERY minutes until one is claimed (how far Twitch's own timer has run is not known), then every minute from
// BONUS_AFTER_CLAIM minutes after each claim (Twitch offers one about every 15 minutes of watching).

import { postForm } from '../../core/http.js';
import { currentUser } from '../api/auth.js';
import { device, platform, randomId } from '../api/gql.js';
import { claimBonus, claimsBonus } from '../api/points.js';

/** The analytics address Twitch's settings give its TV app */
var SPADE = 'https://spade.twitch.tv/track';
var MINUTE_MS = 60000;
var TICK_MS = 1000;
var BONUS_EVERY = 5;
var BONUS_AFTER_CLAIM = 14;
/** Twitch's TV player, as its events name it */
var PLAYER = 'pulsar';

/** The live stream watched */
export interface Watched {
    login: string;
    channelId: string;
    /** The broadcast's id ('' when not known) */
    broadcastId: string;
    game: string;
}

/** An event as spade takes it: the JSON list of events in base64, as a form's data field */
export function spadeBody(events: object[]): string {
    return btoa(unescape(encodeURIComponent(JSON.stringify(events))));
}

function noop(): undefined {
    return undefined;
}

export class WatchTime {
    private session = randomId(32, '0123456789abcdef');
    private minutes = 0;
    private firstMs = 1000 * Math.floor(60 * Math.random());
    /** Played time towards the next minute */
    private played = 0;
    private timer: number;
    /** The minute the bonus is looked for next, and whether one was claimed in this session */
    private bonusAt = 1;
    private claimedOne = false;

    /** watched: the stream as it reports it now; runs: whether its picture plays in sight; claimed: a bonus was
     * claimed, with its points */
    constructor(private watched: () => Watched, private runs: () => boolean, private claimed: (points: number) => void) {
        var self = this;
        this.timer = setInterval(function () {
            self.tick();
        }, TICK_MS) as unknown as number;
    }

    stop(): void {
        clearInterval(this.timer);
    }

    private tick(): void {
        if (!this.runs()) {
            return;
        }
        this.played += TICK_MS;
        if (this.played >= (this.minutes ? MINUTE_MS : this.firstMs)) {
            this.played = 0;
            this.minutes++;
            this.report();
        }
    }

    private report(): void {
        var self = this;
        var w = this.watched();
        var minutes = this.minutes;
        var properties: { [name: string]: unknown } = {
            broadcast_id: w.broadcastId || null, channel: w.login, channel_id: w.channelId, client_time: Date.now() / 1000,
            content_mode: 'live', device_id: device(), game: w.game || null, live: true, logged_in: true,
            minutes_logged: minutes, platform: platform(), play_session_id: this.session, player: PLAYER,
            seconds_offset: this.firstMs / 1000
        };
        var bonus = claimsBonus() && minutes >= this.bonusAt;
        if (bonus) {
            this.bonusAt = minutes + (this.claimedOne ? 1 : BONUS_EVERY);
        }
        currentUser().then(function (user) {
            if (!user) {
                return;
            }
            properties.login = user.login;
            properties.user_id = user.id;
            postForm(SPADE, { data: spadeBody([{ event: 'minute-watched', properties: properties }]) }).then(null, noop);
            if (bonus) {
                claimBonus(w.login).then(function (points) {
                    if (points > 0) {
                        self.claimedOne = true;
                        self.bonusAt = minutes + BONUS_AFTER_CLAIM;
                        self.claimed(points);
                    }
                });
            }
        }).then(null, noop);
    }
}
