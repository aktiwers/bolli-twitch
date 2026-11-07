// A past broadcast, highlight or upload as its player draws it: title, channel (avatar, name, Follow state),
// category, date, views, length, the content gate and, signed in, where the account stopped. No playback token:
// the player asks its own with an ad-free player type.

import { gql, notFound } from './gql.js';
import { Video } from './types.js';
import { FOLLOW_FIELDS, GATE_FIELDS, HISTORY_FIELDS, Raw, USER_FIELDS, VIDEO_PICTURE, toVideo } from './parse.js';

var QUERY = 'query Video($id: ID!, $me: Boolean!) { video(id: $id) { ' + VIDEO_PICTURE + ' ' + GATE_FIELDS + ' ' + HISTORY_FIELDS +
    ' owner { ' + USER_FIELDS + ' ' + FOLLOW_FIELDS + ' } } }';

/** Rejects with notFound() when there is no such video (deleted, or never there) */
export function video(id: string): Promise<Video> {
    return gql<Raw>(QUERY, { id: id }).then(function (data: Raw) {
        var v = toVideo(data && data.video);
        if (!v) {
            throw notFound();
        }
        return v;
    });
}
