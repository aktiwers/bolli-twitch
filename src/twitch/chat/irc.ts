// One IRC line with IRCv3 tags as Twitch's chat sends it: tags, prefix, command and parameters.
// The line splitting is parse.msg() of tmi.js (MIT), which took it from irc-message by Fionn Kelleher (BSD-2-Clause);
// both licences are in LICENSE-irc beside this file.

export interface IrcLine {
    tags: { [name: string]: string };
    /** nick!user@host, or '' */
    prefix: string;
    command: string;
    params: string[];
}

/** The line's parts, or null when it is malformed */
export function parseLine(data: string): IrcLine | null {
    var line: IrcLine = { tags: {}, prefix: '', command: '', params: [] };
    var position = 0;
    var nextspace = 0;

    // Tags: @a=1;b=2 up to the first space
    if (data.charCodeAt(0) === 64) {
        nextspace = data.indexOf(' ');
        if (nextspace === -1) {
            return null;
        }
        var rawTags = data.slice(1, nextspace).split(';');
        for (var i = 0; i < rawTags.length; i++) {
            var tag = rawTags[i];
            var eq = tag.indexOf('=');
            if (eq === -1) {
                line.tags[tag] = '';
            } else {
                line.tags[tag.slice(0, eq)] = tag.slice(eq + 1);
            }
        }
        position = nextspace + 1;
    }

    while (data.charCodeAt(position) === 32) {
        position++;
    }

    // The prefix starts with a colon
    if (data.charCodeAt(position) === 58) {
        nextspace = data.indexOf(' ', position);
        if (nextspace === -1) {
            return null;
        }
        line.prefix = data.slice(position + 1, nextspace);
        position = nextspace + 1;
        while (data.charCodeAt(position) === 32) {
            position++;
        }
    }

    nextspace = data.indexOf(' ', position);
    if (nextspace === -1) {
        if (data.length > position) {
            line.command = data.slice(position);
            return line;
        }
        return null;
    }
    line.command = data.slice(position, nextspace);
    position = nextspace + 1;
    while (data.charCodeAt(position) === 32) {
        position++;
    }

    while (position < data.length) {
        nextspace = data.indexOf(' ', position);
        // A colon starts the trailing parameter: the rest of the line
        if (data.charCodeAt(position) === 58) {
            line.params.push(data.slice(position + 1));
            break;
        }
        if (nextspace === -1) {
            line.params.push(data.slice(position));
            break;
        }
        line.params.push(data.slice(position, nextspace));
        position = nextspace + 1;
        while (data.charCodeAt(position) === 32) {
            position++;
        }
    }
    return line;
}

var ESCAPES: { [c: string]: string } = { ':': ';', s: ' ', '\\': '\\', r: '\r', n: '\n' };

/** A tag's value with IRCv3's escapes undone (\s a space, \: a semicolon, \\ a backslash), '' when missing */
export function tagValue(line: IrcLine, name: string): string {
    var raw = line.tags[name] || '';
    return raw.indexOf('\\') === -1 ? raw : raw.replace(/\\(.?)/g, function (all: string, c: string) {
        return ESCAPES[c] !== undefined ? ESCAPES[c] : c;
    });
}
