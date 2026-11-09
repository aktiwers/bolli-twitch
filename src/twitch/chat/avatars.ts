// Senders' pictures for the chat's Avatars setting (off by default). Twitch's chat lines carry none, so the senders'
// user ids are gathered and asked for in one GraphQL request at most every ASK_MS (up to ASK_MAX ids each, as a
// guest), and kept for the visit (the oldest of more than KEEP forgotten). A failed request's ids are asked again once
// FAILED_MS have passed.

import { gql } from '../api/gql.js';

var ASK_MS = 1000;
var ASK_MAX = 100;
var KEEP = 1000;
var FAILED_MS = 30 * 1000;

/** Known pictures by user id ('' none), in the order they came */
var known: { [id: string]: string } = Object.create(null);
var order: string[] = [];
/** Ids to ask for, those asked now, the callbacks waiting for pictures, and the timer of the next request */
var wanted: string[] = [];
var asked: { [id: string]: boolean } = Object.create(null);
var waiting: (() => void)[] = [];
var timer = 0;
var pausedUntil = 0;

interface UsersReply {
    users: ({ id: string; profileImageURL: string | null } | null)[];
}

/** A sender's picture: its address ('' none), or null when it is not known yet: then it is asked for, and came is
 * called once the answer is in */
export function avatarOf(userId: string, came: () => void): string | null {
    if (userId in known) {
        return known[userId];
    }
    if (!asked[userId] && wanted.indexOf(userId) < 0) {
        wanted.push(userId);
    }
    if (waiting.indexOf(came) < 0) {
        waiting.push(came);
    }
    askSoon();
    return null;
}

function askSoon(): void {
    if (!timer && wanted.length) {
        timer = setTimeout(ask, Math.max(ASK_MS, pausedUntil - Date.now())) as unknown as number;
    }
}

function ask(): void {
    timer = 0;
    // (failed a moment ago: not before FAILED_MS)
    if (Date.now() < pausedUntil) {
        askSoon();
        return;
    }
    var ids = wanted.splice(0, ASK_MAX);
    ids.forEach(function (id) { asked[id] = true; });
    gql<UsersReply>('query($ids: [ID!]) { users(ids: $ids) { id profileImageURL(width: 50) } }', { ids: ids }, true).then(function (r) {
        var pictures: { [id: string]: string } = {};
        (r.users || []).forEach(function (u) {
            if (u) {
                pictures[u.id] = u.profileImageURL || '';
            }
        });
        ids.forEach(function (id) {
            knownAvatar(id, pictures[id] || '');
        });
        // Every panel waiting looks again (one waiting for ids still to come asks again)
        var told = waiting;
        waiting = [];
        told.forEach(function (came) { came(); });
    }, function () {
        // Asked again once FAILED_MS have passed (the rows drawn meanwhile still waiting for them)
        ids.forEach(function (id) {
            delete asked[id];
            if (wanted.indexOf(id) < 0) {
                wanted.push(id);
            }
        });
        pausedUntil = Date.now() + FAILED_MS;
        askSoon();
    });
    askSoon();
}

/** A picture known (asked for, or the live chat settings' example senders, drawn there) */
export function knownAvatar(id: string, url: string): void {
    delete asked[id];
    if (!(id in known)) {
        order.push(id);
    }
    known[id] = url;
    if (order.length > KEEP) {
        order.splice(0, order.length - KEEP).forEach(function (old) { delete known[old]; });
    }
}

/** Forgets every picture (the tests) */
export function resetAvatars(): void {
    known = Object.create(null);
    order = [];
    wanted = [];
    asked = Object.create(null);
    waiting = [];
    clearTimeout(timer);
    timer = 0;
    pausedUntil = 0;
}
