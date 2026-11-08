// Channel points' bonus (a Bolli extra in Settings, on unless switched off; Twitch's TV app shows no channel points):
// the bonus Twitch offers a signed-in viewer every 15 minutes or so of watching a channel is claimed as the website's
// button claims it. The player's watch time asks as its minutes are reported (player/watch-time.ts says when).

import { load, save } from '../../core/store.js';
import { gql } from './gql.js';

var SETTING_KEY = 'twitch.points.claimBonus';
var BONUS = 'query PointsBonus($login: String) { user(login: $login) { id channel { id self { communityPoints {' +
    ' availableClaim { id } } } } } }';
var CLAIM = 'mutation ClaimBonus($input: ClaimCommunityPointsInput!) { claimCommunityPoints(input: $input) {' +
    ' claim { pointsEarnedTotal } error { code } } }';

var on: boolean | null = null;

/** The setting: on unless switched off */
export function claimsBonus(): boolean {
    if (on === null) {
        on = load<boolean>(SETTING_KEY) !== false;
    }
    return on;
}

export function setClaimsBonus(value: boolean): void {
    on = value;
    save(SETTING_KEY, value);
}

interface BonusReply {
    user: { id: string; channel: { id: string; self: { communityPoints: { availableClaim: { id: string } | null } | null } | null } | null } | null;
}

interface ClaimReply {
    claimCommunityPoints: { claim: { pointsEarnedTotal: number } | null; error: { code: string } | null } | null;
}

/** Claims login's bonus if Twitch offers one now: the points it gave, 0 when there was none or it failed */
export function claimBonus(login: string): Promise<number> {
    return gql<BonusReply>(BONUS, { login: login }).then(function (data) {
        var channel = data.user && data.user.channel;
        var points = channel && channel.self && channel.self.communityPoints;
        var claim = points && points.availableClaim;
        if (!channel || !claim) {
            return 0;
        }
        return gql<ClaimReply>(CLAIM, { input: { channelID: channel.id, claimID: claim.id } }).then(function (reply) {
            var r = reply.claimCommunityPoints;
            return r && r.claim && !r.error ? r.claim.pointsEarnedTotal || 0 : 0;
        });
    }).then(null, function () {
        return 0;
    });
}
