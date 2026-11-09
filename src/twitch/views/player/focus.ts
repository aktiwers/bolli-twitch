// Focus on a player screen as Twitch's TV app moves it: from each button an arrow goes to the nearest one in its
// direction, and into a group of buttons (the controls at the right, the row of icon buttons) at the one last
// focused there, or the group's first. The moves are written out per player kind, as measured on Twitch's app,
// instead of measured on the page: no layout reads, and the same on every TV.

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Per button, per direction: where an arrow goes, a button's id or a group's name; a list takes the first that
 * can have focus */
export type Links = { [id: string]: { [dir: string]: string | string[] } };

export class FocusGraph {
    /** The button with focus */
    current: string;
    private last: { [group: string]: string } = {};

    /** groups: their buttons in order; usable(id): whether a button can have focus now (shown, enabled) */
    constructor(private links: Links, private groups: { [name: string]: string[] }, start: string,
                private usable: (id: string) => boolean) {
        this.current = start;
        this.remember(start);
    }

    /** The moves from now on (the buttons placed another way) */
    setLinks(links: Links): void {
        this.links = links;
    }

    /** An arrow: true when focus moved */
    move(dir: Direction): boolean {
        var to = this.target(dir);
        if (!to || to === this.current) {
            return false;
        }
        this.set(to);
        return true;
    }

    /** Where an arrow would go ('' nowhere) */
    target(dir: Direction): string {
        var from = this.links[this.current];
        var link = from ? from[dir] : undefined;
        var options = link === undefined ? [] : typeof link === 'string' ? [link] : link;
        for (var i = 0; i < options.length; i++) {
            var to = this.resolve(options[i]);
            if (to) {
                return to;
            }
        }
        return '';
    }

    /** Focus on a button (also remembered in its groups) */
    set(id: string): void {
        this.current = id;
        this.remember(id);
    }

    /** A group's member to enter it at: the last focused there, else its first usable one */
    enter(group: string): string {
        var members = this.groups[group];
        var last = this.last[group];
        if (last && this.usable(last)) {
            return last;
        }
        for (var i = 0; i < members.length; i++) {
            if (this.usable(members[i])) {
                return members[i];
            }
        }
        return '';
    }

    /** A link's end: a group's member to enter at, or the button when it can have focus */
    private resolve(name: string): string {
        if (this.groups[name]) {
            return this.enter(name);
        }
        return this.usable(name) ? name : '';
    }

    private remember(id: string): void {
        for (var name in this.groups) {
            if (this.groups[name].indexOf(id) >= 0) {
                this.last[name] = id;
            }
        }
    }
}
