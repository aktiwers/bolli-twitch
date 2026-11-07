// What checks over remote DevTools reach on window.__bolli (core/perf.ts makes it): hook(name, obj) puts one there.

export function hook(name: string, obj: unknown): void {
    var w = window as unknown as { __bolli?: { [name: string]: unknown } };
    w.__bolli = w.__bolli || {};
    w.__bolli[name] = obj;
}
