// Twitch's fMP4 segments (recent past broadcasts, some live channels) come as low-latency CMAF chunks: one segment
// holds many moof/mdat pairs. The TV's Media Source parser takes the first pair and then fails the stream (not
// supported), while one moof and one mdat per segment, as YouTube and DR send, plays. So a chunked segment is
// rewritten as one fragment: per track one traf with the first chunk's tfdt and one trun listing every sample, and
// one mdat with each track's data in turn. The samples, their decode times and their bytes stay as they were (a jump
// in a later chunk's decode time goes into the duration of the sample before it); every top-level box other than
// moof and mdat (styp, emsg, prft) is left out. A value no chunk states (Twitch's audio flags) is left out too, so the
// init segment's default still applies. Anything it cannot carry over exactly comes back as it came: a segment with
// one moof, a TS or init segment, boxes that do not add up, encryption or sample groups, a value some chunks state
// and others not.

interface Box {
    type: string;
    start: number;
    end: number;
}

/** What one track gathers over the chunks */
interface Track {
    id: number;
    /** The first traf's tfdt box as it came (null: it had none) */
    tfdt: Uint8Array | null;
    /** Where the samples so far end on the decode timeline; -1 when not known (no tfdt, or a duration from the init) */
    end: number;
    /** The tfhd's sample description index (-1: not stated) */
    sdi: number;
    /** Four numbers per sample: duration, size, flags, composition offset (0 for a value not stated) */
    samples: number[];
    count: number;
    /** How many samples state a duration, and flags */
    durations: number;
    flags: number;
    /** A version 1 trun was seen (signed composition offsets), a sample has an offset, an unsigned one past 2^31 */
    signed: boolean;
    offsets: boolean;
    big: boolean;
    data: Uint8Array[];
    bytes: number;
}

function u32(u: Uint8Array, p: number): number {
    return (u[p] << 24 | u[p + 1] << 16 | u[p + 2] << 8 | u[p + 3]) >>> 0;
}

function put32(u: Uint8Array, p: number, v: number): void {
    u[p] = v >>> 24 & 255;
    u[p + 1] = v >>> 16 & 255;
    u[p + 2] = v >>> 8 & 255;
    u[p + 3] = v & 255;
}

/** Writes a box's size and type at p; returns where its body starts */
function header(u: Uint8Array, p: number, size: number, type: string): number {
    put32(u, p, size);
    for (var i = 0; i < 4; i++) {
        u[p + 4 + i] = type.charCodeAt(i);
    }
    return p + 8;
}

/** The boxes in [start, end) of u, one level; null unless they fill it exactly (no 64-bit or open sizes) */
function boxes(u: Uint8Array, start: number, end: number): Box[] | null {
    var out: Box[] = [];
    var p = start;
    while (p + 8 <= end) {
        var size = u32(u, p);
        if (size < 8 || p + size > end) {
            return null;
        }
        out.push({ type: String.fromCharCode(u[p + 4], u[p + 5], u[p + 6], u[p + 7]), start: p, end: p + size });
        p += size;
    }
    return p === end ? out : null;
}

/** Whether [from, to) lies inside one mdat's data */
function inMdat(mdats: Box[], from: number, to: number): boolean {
    for (var i = 0; i < mdats.length; i++) {
        if (from >= mdats[i].start + 8 && to <= mdats[i].end) {
            return true;
        }
    }
    return false;
}

/** A tfdt's decode time (version 0: 32 bits, 1: 64 bits); -1 for another version, a box too short, or past 2^53 */
function decodeTime(u: Uint8Array, tfdt: Box): number {
    var v1 = u[tfdt.start + 8] === 1;
    if (u[tfdt.start + 8] > 1 || tfdt.end - tfdt.start < (v1 ? 20 : 16)) {
        return -1;
    }
    if (!v1) {
        return u32(u, tfdt.start + 12);
    }
    var high = u32(u, tfdt.start + 12);
    return high > 0x1fffff ? -1 : high * 4294967296 + u32(u, tfdt.start + 16);
}

/** A later traf's decode time: the track's samples so far must end there, else the jump goes into the last one's
 * duration while that stays above 0 */
function continues(track: Track, time: number): boolean {
    if (!track.tfdt || track.end < 0 || !track.count || time < 0) {
        return false;
    }
    var last = (track.count - 1) * 4;
    var duration = track.samples[last] + time - track.end;
    if (duration <= 0 || duration > 0xffffffff) {
        return false;
    }
    track.samples[last] = duration;
    track.end = time;
    return true;
}

/** Adds one traf to its track. base: where its data counts from unless its tfhd says otherwise (the moof's start for
 * the first traf, else where the traf before it ends). Returns where its data ends, or -1 when it cannot be carried
 * over. */
function gather(u: Uint8Array, traf: Box, moofStart: number, base: number, mdats: Box[], tracks: Track[]): number {
    var inner = boxes(u, traf.start + 8, traf.end);
    if (!inner) {
        return -1;
    }
    var tfhd: Box | null = null;
    var tfdt: Box | null = null;
    for (var b = 0; b < inner.length; b++) {
        var type = inner[b].type;
        if (type === 'tfhd') {
            tfhd = inner[b];
        } else if (type === 'tfdt') {
            tfdt = inner[b];
        } else if (type !== 'trun') {
            // senc, saiz, saio, sample groups: nothing the merged traf could keep
            return -1;
        }
    }
    if (!tfhd || tfhd.end - tfhd.start < 16) {
        return -1;
    }
    var tf = u32(u, tfhd.start + 8) & 0xffffff;
    var id = u32(u, tfhd.start + 12);
    var q = tfhd.start + 16;
    if (q + (tf & 1 ? 8 : 0) + (tf & 2 ? 4 : 0) + (tf & 8 ? 4 : 0) + (tf & 0x10 ? 4 : 0) + (tf & 0x20 ? 4 : 0) > tfhd.end) {
        return -1;
    }
    if (tf & 1) {
        // A base data offset counts from the segment's start
        base = u32(u, q) * 4294967296 + u32(u, q + 4);
        q += 8;
    } else if (tf & 0x20000) {
        base = moofStart;
    }
    var sdi = -1;
    var defDuration = -1;
    var defSize = -1;
    var defFlags = -1;
    if (tf & 2) {
        sdi = u32(u, q);
        q += 4;
    }
    if (tf & 8) {
        defDuration = u32(u, q);
        q += 4;
    }
    if (tf & 0x10) {
        defSize = u32(u, q);
        q += 4;
    }
    if (tf & 0x20) {
        defFlags = u32(u, q);
    }
    var time = tfdt ? decodeTime(u, tfdt) : -1;
    var track: Track | null = null;
    for (var t = 0; t < tracks.length; t++) {
        if (tracks[t].id === id) {
            track = tracks[t];
        }
    }
    if (!track) {
        if (tfdt && time < 0) {
            return -1;
        }
        track = {
            id: id, tfdt: tfdt ? u.subarray(tfdt.start, tfdt.end) : null, end: time, sdi: sdi, samples: [], count: 0,
            durations: 0, flags: 0, signed: false, offsets: false, big: false, data: [], bytes: 0
        };
        tracks.push(track);
    } else if (track.sdi !== sdi || (tfdt && !continues(track, time))) {
        return -1;
    }
    // Each trun's data follows the last one's when it names no offset of its own
    var next = base;
    for (var i = 0; i < inner.length; i++) {
        var trun = inner[i];
        if (trun.type !== 'trun') {
            continue;
        }
        var version = u[trun.start + 8];
        var flags = u32(u, trun.start + 8) & 0xffffff;
        var count = u32(u, trun.start + 12);
        var p = trun.start + 16;
        var entry = (flags & 0x100 ? 4 : 0) + (flags & 0x200 ? 4 : 0) + (flags & 0x400 ? 4 : 0) + (flags & 0x800 ? 4 : 0);
        if (version > 1 || trun.end - trun.start < 16 || p + (flags & 1 ? 4 : 0) + (flags & 4 ? 4 : 0) + count * entry > trun.end) {
            return -1;
        }
        // Sizes stated nowhere (or 0) leave the data's layout unknown
        if (!(flags & 0x200) && defSize <= 0) {
            return -1;
        }
        var at = next;
        if (flags & 1) {
            at = base + (u32(u, p) | 0);
            p += 4;
        }
        var first = -1;
        if (flags & 4) {
            first = u32(u, p);
            p += 4;
        }
        // Without sizes per sample the count is not bounded by the box: the data must hold it first
        if (!(flags & 0x200) && !inMdat(mdats, at, at + count * defSize)) {
            return -1;
        }
        var total = 0;
        var s = track.samples;
        for (var n = 0; n < count; n++) {
            var duration = defDuration;
            var size = defSize;
            var sampleFlags = n === 0 && first >= 0 ? first : defFlags;
            var cto = 0;
            if (flags & 0x100) {
                duration = u32(u, p);
                p += 4;
            }
            if (flags & 0x200) {
                size = u32(u, p);
                p += 4;
            }
            if (flags & 0x400) {
                sampleFlags = u32(u, p);
                p += 4;
            }
            if (flags & 0x800) {
                cto = version === 1 ? u32(u, p) | 0 : u32(u, p);
                track.offsets = true;
                track.big = track.big || cto > 0x7fffffff;
                p += 4;
            }
            if (duration >= 0) {
                track.durations++;
                if (track.end >= 0) {
                    track.end += duration;
                }
            } else {
                track.end = -1;
            }
            if (sampleFlags >= 0) {
                track.flags++;
            }
            s.push(duration >= 0 ? duration : 0, size, sampleFlags >= 0 ? sampleFlags : 0, cto);
            total += size;
        }
        if (!inMdat(mdats, at, at + total)) {
            return -1;
        }
        track.signed = track.signed || version === 1;
        track.count += count;
        track.data.push(u.subarray(at, at + total));
        track.bytes += total;
        next = at + total;
    }
    return next;
}

/** Bytes per sample in a track's merged trun: the size, and duration and flags when every chunk states them */
function entrySize(track: Track): number {
    return 4 + (track.durations ? 4 : 0) + (track.flags ? 4 : 0) + (track.offsets ? 4 : 0);
}

function trafSize(track: Track): number {
    return 8 + (track.sdi >= 0 ? 20 : 16) + (track.tfdt ? track.tfdt.length : 0) + 20 + track.count * entrySize(track);
}

/** The merged segment, or null when a track's values cannot be carried over (stated for only some samples, or an
 * unsigned composition offset a signed trun cannot hold) */
function write(tracks: Track[], mfhd: Uint8Array): ArrayBuffer | null {
    var moofSize = 8 + mfhd.length;
    var bytes = 0;
    var t: number;
    var track: Track;
    for (t = 0; t < tracks.length; t++) {
        track = tracks[t];
        if ((track.durations && track.durations !== track.count) || (track.flags && track.flags !== track.count) || (track.signed && track.big)) {
            return null;
        }
        moofSize += trafSize(track);
        bytes += track.bytes;
    }
    var out = new Uint8Array(moofSize + 8 + bytes);
    var p = header(out, 0, moofSize, 'moof');
    out.set(mfhd, p);
    p += mfhd.length;
    // Each track's data offset, from the moof's start: its data follows the tracks' before it in the mdat
    var offset = moofSize + 8;
    for (t = 0; t < tracks.length; t++) {
        track = tracks[t];
        p = header(out, p, trafSize(track), 'traf');
        p = header(out, p, track.sdi >= 0 ? 20 : 16, 'tfhd');
        // default-base-is-moof, and the sample description index when the chunks state it
        put32(out, p, 0x020000 | (track.sdi >= 0 ? 2 : 0));
        put32(out, p + 4, track.id);
        p += 8;
        if (track.sdi >= 0) {
            put32(out, p, track.sdi);
            p += 4;
        }
        if (track.tfdt) {
            out.set(track.tfdt, p);
            p += track.tfdt.length;
        }
        p = header(out, p, 20 + track.count * entrySize(track), 'trun');
        put32(out, p, (track.signed ? 0x01000000 : 0) | 0x201 | (track.durations ? 0x100 : 0) | (track.flags ? 0x400 : 0) |
            (track.offsets ? 0x800 : 0));
        put32(out, p + 4, track.count);
        put32(out, p + 8, offset);
        p += 12;
        var s = track.samples;
        for (var n = 0; n < s.length; n += 4) {
            if (track.durations) {
                put32(out, p, s[n]);
                p += 4;
            }
            put32(out, p, s[n + 1]);
            p += 4;
            if (track.flags) {
                put32(out, p, s[n + 2]);
                p += 4;
            }
            if (track.offsets) {
                put32(out, p, s[n + 3] >>> 0);
                p += 4;
            }
        }
        offset += track.bytes;
    }
    p = header(out, p, 8 + bytes, 'mdat');
    for (t = 0; t < tracks.length; t++) {
        var data = tracks[t].data;
        for (var d = 0; d < data.length; d++) {
            out.set(data[d], p);
            p += data[d].length;
        }
    }
    return out.buffer;
}

/** The segment in buf as one moof and one mdat when it holds several moofs and every part of it can be carried over,
 * else buf itself */
export function mergeChunks(buf: ArrayBuffer): ArrayBuffer {
    var u = new Uint8Array(buf);
    var top = boxes(u, 0, u.length);
    if (!top) {
        return buf;
    }
    var moofs: Box[] = [];
    var mdats: Box[] = [];
    for (var i = 0; i < top.length; i++) {
        if (top[i].type === 'moof') {
            moofs.push(top[i]);
        } else if (top[i].type === 'mdat') {
            mdats.push(top[i]);
        }
    }
    if (moofs.length < 2) {
        return buf;
    }
    var tracks: Track[] = [];
    var mfhd: Uint8Array | null = null;
    for (var m = 0; m < moofs.length; m++) {
        var moof = moofs[m];
        var inner = boxes(u, moof.start + 8, moof.end);
        if (!inner) {
            return buf;
        }
        // A traf whose tfhd names no base starts its data where the traf before it ended (the first: at the moof)
        var end = moof.start;
        for (var k = 0; k < inner.length; k++) {
            var box = inner[k];
            if (box.type === 'mfhd') {
                mfhd = mfhd || u.subarray(box.start, box.end);
            } else if (box.type !== 'traf' || (end = gather(u, box, moof.start, end, mdats, tracks)) < 0) {
                return buf;
            }
        }
    }
    return mfhd && tracks.length ? write(tracks, mfhd) || buf : buf;
}
