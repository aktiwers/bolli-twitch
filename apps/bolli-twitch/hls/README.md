# Third-party code: hls.js

`hls.js` and `hls-worker.js` here are built by `tools/twitch_hls.mjs` from
[hls.js](https://github.com/video-dev/hls.js) 1.7.4, Copyright (c) 2017 Dailymotion, licensed under the Apache License
2.0 (LICENSE). They include eventemitter3 (MIT, LICENSE.eventemitter3), url-toolkit (Apache 2.0, LICENSE.url-toolkit)
and the Common Media Library's ID3 and utility packages (Apache 2.0, LICENSE.common-media-library).

Bolli Twitch's build leaves out what Twitch's streams never need (DRM and encrypted streams, subtitles, alternate
audio, CMCD, content steering, interstitials, AAC and MP3 segments), compiles it to ES5 for the TV's Chrome 38, runs
the segment conversion (MPEG-TS to fMP4, fMP4 passed through) only in the worker, puts hls.js's own worker start
(`loadWorker`) on the bundle and drops the debug log calls. The unchanged source is in `third_party/hls.js/`.

What the build checks: both files parse as ES5; the library functions Chrome 38 lacks are called through helpers
inside the bundle (the browser's own function where it has one), found by their types, and calls named like them on
values typed `any` are decided at run time; a known list of newer global names is refused; and a type error in a file
that ends up in a bundle stops the build. It cannot see a library function reached some other way (a property read
into a variable, a computed name): those are what the desktop check with Chrome 38's library removed is for.
