namespace Codevoid.Momentvoid {
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
        const parts = Array.from(element.querySelectorAll("[data-part]")).reduce<any>(
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
}