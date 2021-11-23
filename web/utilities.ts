namespace Codevoid.Momentvoid {
    export type NullableString = string | null;
    
    export interface IHtmlParts {
        [partName: string]: Element;
    }

    export interface IImmutableHtmlParts extends IHtmlParts {
        readonly [partName: string]: Element
    }

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

    export function generateMessage(weeks: number, days: number, hours: number, minutes: number, seconds: number, segments: Segments[]): string {
        let message = "";

        if (segments.includes(Segments.WEEKS)) {
            if (weeks === 1) {
                message = "1 week";
            }

            if (weeks > 1) {
                message = `${weeks} weeks`;
            }
        }

        if (segments.includes(Segments.DAYS)) {
            if (days > 0) {
                message = addCommaIfNeeded(message);

                if (days === 1) {
                    message += "1 day";
                }

                if (days > 1) {
                    message += `${days} days`;
                }
            }
        }

        if (segments.includes(Segments.HOURS)) {
            if (hours > 0) {
                message = addCommaIfNeeded(message);

                if (hours === 1) {
                    message += "1 hour";
                }

                if (hours > 1) {
                    message += `${hours} hours`;
                }
            }
        }

        if (segments.includes(Segments.MINUTES)) {
            if (minutes > 0) {
                message = addCommaIfNeeded(message);

                if (minutes === 1) {
                    message += "1 min";
                }

                if (minutes > 1) {
                    message += `${minutes} mins`;
                }
            }
        }

        if (segments.includes(Segments.SECONDS)) {
            if (seconds > 0) {
                message = addCommaIfNeeded(message);

                if (seconds === 1) {
                    message += "1 sec"
                }

                if (seconds > 1) {
                    message += `${seconds} secs`;
                }
            }
        }

        return message;
    }

    export function removeFromArray<T>(source: T[], itemToRemove: T) {
        let itemIndex = source.indexOf(itemToRemove);
        if (itemIndex < 0) {
            return;
        }

        source.splice(itemIndex, 1);
    }

    export function cloneIntoWithParts(template: HTMLTemplateElement, target: Element, partNames: string[]): IImmutableHtmlParts {
        let parts: IHtmlParts = {};
        let content = template.content;
    
        for (var index = 0; index < content.children.length; index += 1) {
            // Clone the node, and append it directly to the supplied container
            const templateChild = content.children[index];
            const clonedChild = <HTMLElement>templateChild.cloneNode(true);
            target.appendChild(clonedChild);
    
            // If we were asked to match parts, we'll do so.
            if (partNames?.length) {
                locatePartsFromDOM(clonedChild, partNames, parts);
            }
        }
    
        return parts;
    }

    export function locatePartsFromDOM(element: Element, partNames: string[], parts: IHtmlParts): void {
        // No elements or part names, give up.
        if (!partNames?.length || !element || !parts) {
            return;
        }

        let locatedPartNames: string[] = []; // Track which ones we've located, so
        // we can remove them after. We only
        // support finding the first part with
        // a specific name.
        partNames.forEach((item) => {
            const selector = `[data-part='${item}']`;
            let foundPart = element.querySelector(selector);

            // querySelector only finds *decendents*, so if we didn't find
            // the item, maybe the element itself is the part.
            if (!foundPart && element.matches(selector)) {
                // Note; matches only gives you 'does selector match'
                // and doesn't return the element.
                foundPart = element;
            }

            if (!foundPart) {
                return;
            }

            // Since we found a part, we'll want to remove it later, but
            // since we're enumerating the item, we can't remove it yet
            locatedPartNames.push(item);
            parts[item] = foundPart;
        });

        // Now we can remove the part names we'd found so we don't
        // search for them again.
        locatedPartNames.forEach((itemToRemove) => removeFromArray(partNames, itemToRemove));
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
}