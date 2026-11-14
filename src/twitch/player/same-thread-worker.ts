// A Web Worker that runs on the page's own thread, for webOS TV 1.x-2.x: its browser makes a Worker object for any
// script (a file, a Blob, a data: address) but never runs it, and says nothing. hls.js's segment worker (hls-worker.js)
// runs here instead: its script read as text and run in a function whose `self` is a stand-in global, messages passed
// both ways a turn later as a worker's are. What it does is the same; only the converting no longer runs beside the page.

type Listener = (e: { data?: unknown; message?: string }) => void;

/** The worker's side: what hls-worker.js uses of its global */
interface Scope {
    addEventListener(type: string, listener: Listener): void;
    removeEventListener(type: string, listener: Listener): void;
    postMessage(data: unknown): void;
    [name: string]: unknown;
}

/** Calls f a turn later (as a worker's message comes) */
function later(f: () => void): void {
    setTimeout(f, 0);
}

/** What a worker tells its listeners: type's listeners and its on<type> handler */
function tell(listeners: { [type: string]: Listener[] }, target: { [name: string]: unknown }, type: string, e: { data?: unknown; message?: string }): void {
    var list = (listeners[type] || []).slice();
    var handler = target['on' + type];
    if (typeof handler === 'function') {
        list.unshift(handler as Listener);
    }
    for (var i = 0; i < list.length; i++) {
        list[i](e);
    }
}

/** Reads the script at url as text (a file:// read says status 0); done gets null when it cannot be read */
export function readScript(url: string, done: (text: string | null) => void): void {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function () {
        done((xhr.status === 0 || xhr.status === 200) && xhr.responseText ? xhr.responseText : null);
    };
    xhr.onerror = function () {
        done(null);
    };
    xhr.send();
}

/** The worker for the script at url (readScript). Messages sent before
 * the script has run wait for it; a script that cannot be read or throws (also later, on a message) is an 'error'
 * event, as a worker's */
export function SameThreadWorker(this: { [name: string]: unknown }, url: string): void {
    var worker = this;
    var mine: { [type: string]: Listener[] } = {};
    var theirs: { [type: string]: Listener[] } = {};
    var waiting: unknown[] = [];
    var running = false;
    var ended = false;
    /** f a turn later, unless the worker ended by then */
    var soon = function (f: () => void): void {
        later(function () {
            if (!ended) {
                f();
            }
        });
    };
    var scope: Scope = {
        addEventListener: function (type, listener) {
            (theirs[type] || (theirs[type] = [])).push(listener);
        },
        removeEventListener: function (type, listener) {
            var list = theirs[type] || [];
            var at = list.indexOf(listener);
            if (at >= 0) {
                list.splice(at, 1);
            }
        },
        postMessage: function (data) {
            soon(function () {
                tell(mine, worker, 'message', { data: data });
            });
        },
        performance: window.performance,
        console: window.console,
        MediaSource: (window as unknown as { MediaSource?: unknown }).MediaSource
    };
    var failed = function (message: string): void {
        soon(function () {
            tell(mine, worker, 'error', { message: message });
        });
    };
    // (a throw in the script's handler is the worker's error, as a real worker's: hls.js hears it and gives the
    // segment up; thrown into the page nobody would, and hls.js would wait for the segment for good)
    var toWorker = function (data: unknown): void {
        soon(function () {
            try {
                tell(theirs, scope, 'message', { data: data });
            } catch (e) {
                failed('the worker threw: ' + (e && (e as Error).message));
            }
        });
    };
    worker.addEventListener = function (type: string, listener: Listener): void {
        (mine[type] || (mine[type] = [])).push(listener);
    };
    worker.removeEventListener = function (type: string, listener: Listener): void {
        var list = mine[type] || [];
        var at = list.indexOf(listener);
        if (at >= 0) {
            list.splice(at, 1);
        }
    };
    // (transferred buffers are handed over as they are: hls.js does not touch one it has transferred)
    worker.postMessage = function (data: unknown): void {
        if (running) {
            toWorker(data);
        } else {
            waiting.push(data);
        }
    };
    worker.terminate = function (): void {
        ended = true;
    };
    readScript(url, function (text) {
        if (ended) {
            return;
        }
        if (!text) {
            failed('the worker script could not be read');
            return;
        }
        try {
            /* eslint-disable-next-line no-new-func */
            new Function('self', 'postMessage', 'addEventListener', 'removeEventListener', text)(scope,
                scope.postMessage, scope.addEventListener, scope.removeEventListener);
        } catch (e) {
            failed('the worker script threw: ' + (e && (e as Error).message));
            return;
        }
        running = true;
        for (var i = 0; i < waiting.length; i++) {
            toWorker(waiting[i]);
        }
        waiting = [];
    });
}

/** Runs make() with the page's Worker and URL standing in as hls.js's loadWorker needs them on webOS TV 1.x-2.x: the
 * same-thread worker, and a URL constructor that resolves an address against the page's (that browser has only the
 * object with createObjectURL); both put back after, whatever happens */
export function withSameThreadWorker<T>(make: () => T): T {
    var w = window as unknown as { Worker: unknown; URL: unknown };
    var worker = w.Worker;
    var url = w.URL;
    w.Worker = SameThreadWorker;
    var made = url as { createObjectURL?: unknown; revokeObjectURL?: unknown };
    var Resolved = function (this: { href: string }, path: string, base?: string): void {
        var a = document.createElement('a');
        a.href = base && !/^[a-z]+:/i.test(path) ? base.replace(/[^/]*$/, '') + path : path;
        this.href = a.href;
    } as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown };
    Resolved.createObjectURL = made && made.createObjectURL;
    Resolved.revokeObjectURL = made && made.revokeObjectURL;
    w.URL = Resolved;
    try {
        return make();
    } finally {
        w.Worker = worker;
        w.URL = url;
    }
}
