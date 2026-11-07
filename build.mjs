// Builds the app into apps/bolli-twitch: the TypeScript to ES5 (build/tsc), each entry as one script (rollup) with
// the version from appinfo.json, then compact: no comments or indentation, in plain ASCII (the TV holds such a script
// at one byte per character, else at two). Usage: npm run build
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { compact } from './tools/lib.mjs';

const folder = 'apps/bolli-twitch';
const version = JSON.parse(fs.readFileSync(folder + '/appinfo.json', 'utf8')).version;
const bundles = {"main":"app.js"};
execFileSync('node_modules/.bin/tsc', ['-p', '.'], { stdio: 'inherit' });
for (const [entry, file] of Object.entries(bundles)) {
    const out = folder + '/' + file;
    execFileSync('node_modules/.bin/rollup', ['build/tsc/src/twitch/' + entry + '.js', '--format', 'iife', '--file', out, '--silent'], { stdio: 'inherit' });
    fs.writeFileSync(out, compact(fs.readFileSync(out, 'utf8').split('__BOLLI_VERSION__').join(version)));
}
