import { Segments, segmentToDisplayWithPlurality } from "./countdowncontrol.js";

export type NullableString = string | null;
export type NakedFunction = () => void;

export function collapseIfLessThan1(value: number, element: Element): void {
    const parent = element.parentElement!;

    if (value > 0) {
        element.textContent = <string><unknown>value;
        parent.style.display = "";
        return;
    }

    element.textContent = "-";
    parent.style.display = "none"
}

export function addCommaIfNeeded(source: string): string {
    if (source.length === 0) {
        return source;
    }

    return source + ", ";
}

// Given a map of segments to their value, converts them to a display string
// based on the supplied visible segments. Note, the visibleSegments determines
// the order of these values, not their absolute logical ordering.
export function generateMessage(values: { [key in Segments]: number }, visibleSegments: Segments[]): string {
    let result = "";

    for (let segment of visibleSegments) {
        const value = values[segment];

        // Only include visible segments if there is a value in that segment
        if (value < 1) {
            continue;
        }

        // We need to add a comma after to ensure each unit is broken up
        result = addCommaIfNeeded(result);
        const unit = segmentToDisplayWithPlurality(segment, value);
        result += `${value} ${unit}`;
    }

    return result;
}

export function removeFromArray<T>(source: T[], itemToRemove: T) {
    let itemIndex = source.indexOf(itemToRemove);
    if (itemIndex < 0) {
        return;
    }

    source.splice(itemIndex, 1);
}

export function cloneIntoWithPartsFromName<T>(templateName: string, target: Element): T {
    const template = document.querySelector<HTMLTemplateElement>(`[data-template='${templateName}']`)!;

    return cloneIntoWithParts(template, target);
}

export function cloneIntoWithParts<T>(template: HTMLTemplateElement, target: Element): T {
    const content = document.importNode(template.content, true);

    const parts: T = locatePartsFromDOM(content);

    target.appendChild(content);

    return parts;
}

export function locatePartsFromDOM<T>(element: HTMLElement | DocumentFragment): T {
    const query = "[data-part]";
    const elements = Array.from(element.querySelectorAll(query));

    // Make sure that the node we're starting from is included.
    // querySelector only finds descendants of the element, not the element
    // itself.
    if (element.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
        if ((<Element>element).matches(query)) {
            elements.push(<Element>element);
        }
    }

    const parts = elements.reduce<any>(
        (localParts: any, el: Element) => {
            const partName = el.getAttribute("data-part")!;
            el.removeAttribute("data-part");
            localParts[partName] = el;
            return localParts;
        },
        {});

    return parts;
}

// Helps manage "Event" like callback pattern. Supports mutiple listeners,
// and easy raising of the event to all registered handlers.
export class EventManager<T> {
    private handlers: Map<number, (data: T) => void> = new Map();
    private nextHandlerId = 0;

    registerHandler(handler: (data: T) => void): number {
        const token = (this.nextHandlerId += 1);

        this.handlers.set(token, handler);

        return token;
    }

    unregisterHandler(token: number): void {
        this.handlers.delete(token);
    }

    raise(data: T): void {
        for (const [_, handler] of this.handlers) {
            try {
                handler(data);
            } catch (e: any) {
                console.log(`A handler failed: ${e.toString()}`);
            }
        }
    }

    reset() {
        this.handlers.clear();
    }
}