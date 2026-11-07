# hls.js for Bolli Twitch

The source of [hls.js](https://github.com/video-dev/hls.js) 1.7.4 (Apache License 2.0, see LICENSE), as its npm
package ships it (`src/`), and the four libraries it imports (`deps/`, each with its own licence):

| Folder | Package | Licence |
|---|---|---|
| deps/eventemitter3 | eventemitter3 5.0.4 (`dist/eventemitter3.esm.js`, `index.d.ts`) | MIT |
| deps/url-toolkit | url-toolkit 2.2.5 (`src/url-toolkit.js`, `.d.ts`) | Apache 2.0 |
| deps/cml-id3 | @svta/cml-id3 1.0.6 (`dist/index.js`, `.d.ts`) | Apache 2.0 |
| deps/cml-utils | @svta/cml-utils 1.5.0 (`dist/index.js`, `.d.ts`) | Apache 2.0 |

No file here is changed. `tools/twitch_hls.mjs` builds them into `apps/bolli-twitch/hls/` (hls.js, hls-worker.js and
the licences), and everything Bolli Twitch does differently happens in that build, described at the top of the
script: the parts Twitch never uses left out, ES5 for Chrome 38 with local helpers instead of polyfills, the segment
conversion in the worker only, and hls.js's log calls dropped.

To update: replace `src/` with the new release's `src/` (and `deps/` with the versions its package.json names), set
`VERSION` in the script, run `node tools/twitch_hls.mjs` and `npm test`. The build stops at any library call Chrome 38
lacks that it does not know yet.
