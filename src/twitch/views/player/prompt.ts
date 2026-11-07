// Twitch's full-screen prompt (its FullscreenOverlayPrompt): a picture on the left and, centred on the right, a
// heading, a few lines and a row of buttons. The players show it for the content gate ("Just one second..."), a
// stream that ended, a past broadcast at its end and the failures. Left and Right move between the buttons, OK
// presses the focused one; the screen it is on passes it the keys while it shows.

import { h, setShown, toggleClass } from '../../../core/dom.js';
import { KEY } from '../../../core/keys.js';
import { picture } from '../art.js';

export interface PromptLine {
    text: string;
    /** bt-pl-prompt-strong: the gate's bold line */
    cls?: string;
}

export interface PromptButton {
    label: string;
    act: () => void;
    /** No background while not focused (the gate's Go Home) */
    plain?: boolean;
}

export interface PromptModel {
    /** One of art.ts's pictures */
    picture: string;
    title: string;
    lines: PromptLine[];
    buttons: PromptButton[];
    /** The button focused first */
    focus?: number;
}

export class Prompt {
    el: HTMLElement;
    /** What it shows ('' none): the tests and the player's own checks */
    shown = '';
    private picture: HTMLElement;
    private cta: HTMLElement;
    private buttons: HTMLElement[] = [];
    private model: PromptModel | null = null;
    private index = 0;

    constructor() {
        this.el = h('div', 'bt-pl-prompt');
        this.picture = this.el.appendChild(h('div', 'bt-pl-prompt-picture')) as HTMLElement;
        this.cta = this.el.appendChild(h('div', 'bt-pl-prompt-cta')) as HTMLElement;
        setShown(this.el, false);
    }

    /** Shows model (built anew: prompts are rare); null hides it */
    set(model: PromptModel | null): void {
        this.model = model;
        this.shown = model ? model.title : '';
        setShown(this.el, !!model);
        if (!model) {
            return;
        }
        this.picture.textContent = '';
        this.picture.appendChild(picture(model.picture));
        this.cta.textContent = '';
        this.cta.appendChild(h('div', 'bt-pl-prompt-title', model.title));
        for (var i = 0; i < model.lines.length; i++) {
            var line = model.lines[i];
            if (line.text) {
                this.cta.appendChild(h('div', 'bt-pl-prompt-line' + (line.cls ? ' ' + line.cls : ''), line.text));
            }
        }
        var row = this.cta.appendChild(h('div', 'bt-pl-prompt-buttons')) as HTMLElement;
        this.buttons = [];
        for (var j = 0; j < model.buttons.length; j++) {
            var b = model.buttons[j];
            this.buttons.push(row.appendChild(h('div', 'bt-button' + (b.plain ? ' bt-button--plain' : ''), b.label)) as HTMLElement);
        }
        this.index = model.focus || 0;
        this.mark();
    }

    /** The label of the focused button ('' none) */
    focused(): string {
        return this.model && this.model.buttons[this.index] ? this.model.buttons[this.index].label : '';
    }

    /** Arrows and OK while it shows (Back is the screen's); true when used */
    onKey(code: number): boolean {
        var model = this.model;
        if (!model) {
            return false;
        }
        if (code === KEY.LEFT && this.index > 0) {
            this.index--;
            this.mark();
        } else if (code === KEY.RIGHT && this.index < model.buttons.length - 1) {
            this.index++;
            this.mark();
        } else if (code === KEY.OK && model.buttons[this.index]) {
            model.buttons[this.index].act();
        }
        return code !== KEY.BACK;
    }

    private mark(): void {
        for (var i = 0; i < this.buttons.length; i++) {
            toggleClass(this.buttons[i], 'bt-focused', i === this.index);
        }
    }
}
