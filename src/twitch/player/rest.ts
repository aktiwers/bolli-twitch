// Work that can wait until the viewer stops pressing keys (freeing a stopped player's video, destroying a stopped
// hls.js): run once no key went down for a moment, so a key press while zapping or browsing never waits for it.

/** No key for this long: the keys rest */
var REST_MS = 1500;

var queue: (() => void)[] = [];
var lastKey = 0;
var timer = 0;
var listening = false;

function runQueue(): void {
    timer = 0;
    var wait = lastKey + REST_MS - Date.now();
    if (wait > 0 && !document.hidden) {
        timer = setTimeout(runQueue, wait) as unknown as number;
        return;
    }
    var jobs = queue;
    queue = [];
    for (var i = 0; i < jobs.length; i++) {
        jobs[i]();
    }
}

/** Runs job once the keys rest (at once while the page is hidden) */
export function whenKeysRest(job: () => void): void {
    if (!listening) {
        listening = true;
        document.addEventListener('keydown', function () {
            lastKey = Date.now();
        }, true);
    }
    queue.push(job);
    if (!timer) {
        timer = setTimeout(runQueue, Math.max(0, lastKey + REST_MS - Date.now())) as unknown as number;
    }
}
