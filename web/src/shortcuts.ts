import { NakedFunction } from "./utilities.js";

type HandlerMap = { [partName: string]: NakedFunction };

function addHandlersTo(existing: HandlerMap, toAdd: HandlerMap): void {
    for (const [key, handler] of Object.entries(toAdd)) {
        if (existing[key]) {
            throw new Error(`Handler with key '${key}' was already registered`);
        }

        existing[key] = handler;
    }
}

export class ShortcutMananger {
    private noModifierShortcuts: HandlerMap = {};
    private shiftModifierShortcuts: HandlerMap = {};

    constructor() {
        window.addEventListener("keydown", this.handleKeyDown.bind(this));
    }

    private handleKeyDown(keyEvent: KeyboardEvent): void {
        const source = (<HTMLElement>keyEvent.target);

        // When typing into a text box, don't process shortcuts.
        if ((source.tagName === "INPUT") || (source.isContentEditable)) {
            return;
        }

        // Don't handle the event again if they key is being held down
        if (keyEvent.repeat) {
            return;
        }

        const lowerCaseKey = keyEvent.key.toLowerCase();

        if (keyEvent.shiftKey) {
            //invokeHandlerForKey(this.shiftModifierShortcuts, lowerCaseKey);
            this.shiftModifierShortcuts[lowerCaseKey]?.();
            return;
        }

        if (keyEvent.ctrlKey || keyEvent.metaKey) {
            // Nothing with these keys yet, but want to avoid handling
            // combinations that would trigger anyway
            return;
        }

        const handler = this.noModifierShortcuts[lowerCaseKey];
        if (!handler) {
            return;
        }

        keyEvent.preventDefault();
        handler();
    }

    public registerNoModifierHandlers(handlers: HandlerMap): void {
        addHandlersTo(this.noModifierShortcuts, handlers);
    }

    public registerShiftModifierHandlers(handlers: HandlerMap): void {
        addHandlersTo(this.shiftModifierShortcuts, handlers);
    }
}