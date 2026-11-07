// Following channels and categories as Twitch's TV app does it (signed in only), the account's follow state as last
// heard, and Twitch's Not Interested. The state is kept by channel or category id from every reply that says it (the
// parsers note it from a channel's or category's `self`), the follow query and the mutations, so a screen kept under
// another shows the new state when it shows again; listeners hear every change, and the account change that forgets
// them all.

import { gql } from './gql.js';
import { Raw } from './parse.js';

export type FollowKind = 'channel' | 'game';

var FOLLOW_CHANNEL = 'mutation Follow($id: ID!) { followUser(input: { targetID: $id, disableNotifications: true }) {' +
    ' follow { user { id self { follower { followedAt } } } } } }';
var UNFOLLOW_CHANNEL = 'mutation Unfollow($id: ID!) { unfollowUser(input: { targetID: $id }) { follow { user { id } } } }';
var FOLLOW_GAME = 'mutation FollowGame($input: FollowGameInput!) { followGame(input: $input) { game { id self { follow { followedAt } } } } }';
var UNFOLLOW_GAME = 'mutation UnfollowGame($input: UnfollowGameInput!) { unfollowGame(input: $input) { game { id self { follow { followedAt } } } } }';
var FOLLOWS = 'query FollowState($login: String!) { user(login: $login) { id self { follower { followedAt } } } }';
var NOT_INTERESTED = 'mutation NotInterested($input: AddRecommendationFeedbackInput!) { addRecommendationFeedback(input: $input) {' +
    ' recommendationFeedback { id } } }';

/** Hears a change of one state, or (kind null) every state forgotten */
export type FollowListener = (kind: FollowKind | null, id: string, on: boolean | undefined) => void;

var states: { [key: string]: boolean } = {};
var listeners: FollowListener[] = [];

function keyOf(kind: FollowKind, id: string): string {
    return kind + ':' + id;
}

/** What the account was last heard to follow (undefined: not known, or a guest) */
export function followState(kind: FollowKind, id: string): boolean | undefined {
    return states[keyOf(kind, id)];
}

/** A reply said whether the account follows it; listeners hear a change */
export function noteFollow(kind: FollowKind, id: string, on: boolean): void {
    var key = keyOf(kind, id);
    if (states[key] === on) {
        return;
    }
    states[key] = on;
    tell(kind, id, on);
}

/** listener(kind, id, on) after every change, listener(null, '', undefined) when every state is forgotten; returns
 * the function that stops it */
export function onFollowChange(listener: FollowListener): () => void {
    listeners.push(listener);
    return function (): void {
        var i = listeners.indexOf(listener);
        if (i >= 0) {
            listeners.splice(i, 1);
        }
    };
}

/** Forgets every state (the account changed); listeners hear it, so no button keeps the last account's state */
export function forgetFollows(): void {
    states = {};
    tell(null, '', undefined);
}

function tell(kind: FollowKind | null, id: string, on: boolean | undefined): void {
    var all = listeners.slice();
    for (var i = 0; i < all.length; i++) {
        all[i](kind, id, on);
    }
}

/** Follows (on) or unfollows a channel or category; whether the account follows it now. Rejects with the GqlError */
export function follow(kind: FollowKind, id: string, on: boolean): Promise<boolean> {
    var answer = kind === 'channel' ? followChannel(id, on) : followGame(id, on);
    return answer.then(function (now: boolean) {
        noteFollow(kind, id, now);
        return now;
    });
}

/** A follow without notifications, as Twitch's TV app asks it */
function followChannel(channelId: string, on: boolean): Promise<boolean> {
    return gql<Raw>(on ? FOLLOW_CHANNEL : UNFOLLOW_CHANNEL, { id: channelId }).then(function (data: Raw) {
        if (!on) {
            return false;
        }
        var user = data && data.followUser && data.followUser.follow && data.followUser.follow.user;
        return !!(user && user.self && user.self.follower && user.self.follower.followedAt);
    });
}

function followGame(gameId: string, on: boolean): Promise<boolean> {
    return gql<Raw>(on ? FOLLOW_GAME : UNFOLLOW_GAME, { input: { gameID: gameId } }).then(function (data: Raw) {
        var payload = data && (on ? data.followGame : data.unfollowGame);
        var self = payload && payload.game && payload.game.self;
        // A reply without the game says nothing new: what was asked is taken as done
        return self ? !!(self.follow && self.follow.followedAt) : on;
    });
}

/** Whether the signed-in account follows the channel (a stream tile does not say) */
export function followsChannel(login: string): Promise<boolean> {
    return gql<Raw>(FOLLOWS, { login: login }).then(function (data: Raw) {
        var user = data && data.user;
        var on = !!(user && user.self && user.self.follower && user.self.follower.followedAt);
        if (user && user.id) {
            noteFollow('channel', user.id, on);
        }
        return on;
    });
}

/** Twitch stops recommending the channel or category to the account, as its TV app asks it */
export function notInterested(itemType: 'CHANNEL' | 'CATEGORY', id: string): Promise<void> {
    var input = { category: 'NOT_INTERESTED', itemID: id, itemType: itemType, sourceItemPage: 'browse', sourceItemRequestID: '',
        sourceItemTrackingID: '' };
    return gql<Raw>(NOT_INTERESTED, { input: input }).then(function () {
        return undefined;
    });
}
