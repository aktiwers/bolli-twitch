// What build.mjs and tools/twitch_hls.mjs share: the repo's root, and compact: a script without its comments,
// indentation and blank lines, in plain ASCII (the TV holds such a script at one byte per character, else at two)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function compact(code) {
    const comments = [];
    acorn.parse(code, { ecmaVersion: 5, onComment: (block, text, start, end) => comments.push([start, end]) });
    let out = '';
    let at = 0;
    for (const [start, end] of comments) {
        out += code.slice(at, start) + (/[\n\r]/.test(code.slice(start, end)) ? '\n' : ' ');
        at = end;
    }
    out += code.slice(at);
    return out.replace(/^[ \t]+/gm, '').replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n')
        .replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}
