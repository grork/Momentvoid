namespace Codevoid.Momentvoid {
    export interface IHtmlParts {
        [partName: string]: Element;
    }

    export interface IImmutableHtmlParts extends IHtmlParts {
        readonly [partName: string]: Element
    }

    export function collapseIfLessThan1(value: number, element: Element): void {
        var parent = element.parentElement;

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

        let locatedPartNames = []; // Track which ones we've located, so
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
}

namespace Codevoid.Momentvoid {
    const DEFAULT_TICK_INTERVAL = 1000;

    export interface ITickData {
        getTime(): number;
    }

    export class Clock {
        private timeOffset: number = 0;
        private accelerationFactor: number = 0;
        private handlers: Map<number, (ITickData) => void> = new Map();
        private nextHandlerId = 0;
        private tickInterval: number = DEFAULT_TICK_INTERVAL;
        private intervalToken: number = 0;

        private tick() {
            const tickData = this.getCurrentTickData();

            // Call all the handlers with the tick data so they can do whatever
            // it is they need to do. Note that they might throw, so lets
            // swallow it, and log any info when someone complains.
            for (const [_, handler] of this.handlers) {
                try {
                    handler(tickData);
                } catch (e) {
                    console.log(`A tick handler failed: ${e.toString()}`);
                }
            }
        }

        // Generates the tickdata to pass to handlers so they are all working
        // of a shared clock, which may or may not be time shifted.
        private getCurrentTickData(): ITickData {
            const newTime = this.getTime();
            const tickData = {
                getTime: () => newTime
            };

            return tickData;
        }

        // Register a callback for when a tick, ticks.
        registerTick(handler: (ITickData) => void): number {
            // so that people can easily unregister their tick handler, we give
            // them an ID they can use for clearing that register if they need
            // to. This is not fancy, but it gets the job done.
            var token = (this.nextHandlerId += 1);

            this.handlers.set(token, handler);
            
            return token;
        }
        
        unregisterTick(token: number): void {
            this.handlers.delete(token);
        }

        private getTime(): number {
            let time = Date.now();
            if (this.timeOffset || this.accelerationFactor) {
                time += ((this.timeOffset += this.accelerationFactor) * 1000);
            }

            return time;
        }

        start(tickInterval?: number): void {
            this.tickInterval = tickInterval || this.tickInterval;
            this.tick();
            
            // Calculate approximate offset to the nearest whole second with
            // a small fudge factor
            var currentSecondOffset = (Date.now() % 1000) - 5;
            
            // Schedule a tick to that offset
            this.intervalToken = setTimeout(() => {
                // Actually start our 'on the second' tick
                this.intervalToken = window.setInterval(this.tick.bind(this), this.tickInterval);
                this.tick();
            }, currentSecondOffset);
        }

        stop(): void {
            if (this.intervalToken) {
                window.clearInterval(this.intervalToken);
                this.intervalToken = null;
            }
        }

        setClockSpeed(accelerationFactor: number = 1, interval: number = DEFAULT_TICK_INTERVAL): void {
            this.stop();

            this.accelerationFactor = accelerationFactor;

            this.start(interval);
        }

        resumeNormalSpeed(): void {
            this.stop();
            this.accelerationFactor = 0;
            this.tickInterval = DEFAULT_TICK_INTERVAL;

            this.start();
        }

        resetToCurrentTime(): void {
            this.stop();
            this.timeOffset = 0;
            this.resumeNormalSpeed();
        }

        goFaster(): void {
            let newAccelerationFactor = this.accelerationFactor * 10;
            if (newAccelerationFactor === 0) {
                newAccelerationFactor = 1;
            }

            newAccelerationFactor = Math.min(newAccelerationFactor, 10000);

            let newTickInterval = this.tickInterval / 10;
            newTickInterval = Math.max(newTickInterval, 16);

            this.setClockSpeed(newAccelerationFactor, newTickInterval);
        }

        togglePlayPause(): void {
            if (this.intervalToken) {
                this.stop();
                return;
            }

            this.start();
        }
    }
}

namespace Codevoid.Momentvoid {
    export function saveCountdownsToStorage(countdowns): void {
        const targetTimes = [];

        countdowns.forEach((countdown) => {
            const timeAsString = countdown.toISOString();

            if (!timeAsString) {
                // Don't capture invalid countdowns
                return;
            }
            
            targetTimes.push({
                targetDate: timeAsString,
                title: countdown.title
            });
        });

        window.localStorage.setItem("countdowns", JSON.stringify(targetTimes));
    }

    export function loadCountdownsFromStorage() {
        const persistedCountdowns = JSON.parse(window.localStorage.getItem("countdowns"));

        if (!persistedCountdowns) {
            return [];
        }

        return persistedCountdowns.map((persistedCountdown) => {
            const time = new Date(persistedCountdown.targetDate);
            const countdown = new Countdown(time, persistedCountdown.title);
            return countdown;
        });
    }
    export class Countdown {
        private targetDateAsMs: number;

        constructor(private targetDate: Date, public readonly title?: string) {
            this.targetDateAsMs = targetDate.getTime();
            this.title = title;
        }

        getTime() {
            return this.targetDateAsMs;
        }

        toISOString() {
            if (!this.targetDate) {
                return "";
            }

            return this.targetDate.toISOString();
        }

        toLocaleDateString() {
            if (!this.targetDate) {
                return "";
            }

            return this.targetDate.toLocaleDateString();
        }
    }
}

namespace Codevoid.Momentvoid {
    const MS_IN_SECOND = 1000;
    const MS_IN_MINUTE = MS_IN_SECOND * 60;
    const MS_IN_HOUR = MS_IN_MINUTE * 60;
    const MS_IN_DAY = MS_IN_HOUR * 24;
    const MS_IN_WEEK = MS_IN_DAY * 7;

    const HIDE_SEGMENT_CLASS = "countdown-element-hide";

    export const enum Segments {
        WEEKS = "WEEKS",
        DAYS = "DAYS",
        HOURS = "HOURS",
        MINUTES = "MINUTES",
        SECONDS = "SECONDS"
    }

    const AllSegments = [
        Segments.WEEKS,
        Segments.DAYS,
        Segments.HOURS,
        Segments.MINUTES,
        Segments.SECONDS
    ];

    export class CountdownControl {
        private visibleSegments: Segments[] = AllSegments.slice();
        private tickToken: number;
        private _currentMessage: string;
        private parts: IImmutableHtmlParts;

        public get currentMessage(): string {
            return this._currentMessage;
        }

        constructor(container: HTMLElement, private clock: Clock, public readonly countdown: Countdown) {
            this.loadSegmentConfigurationFromStorage();

            const template = <HTMLTemplateElement>document.querySelector("[data-template='countdown-template']");
            this.parts = cloneIntoWithParts(template, container, [
                "weeks",
                "days",
                "hours",
                "minutes",
                "seconds",
                "container",
                "title"
            ]);

            this.parts.title.textContent = this.countdown.title;

            if (!countdown) {
                this.displayInvalidDateError();
                return;
            }

            this.updateSegmentDOMState();

            this.start();
        }

        private tick(tickData: ITickData): void {
            const now = tickData.getTime();
            const remaining = this.countdown.getTime() - now;

            // Time calculations for days, hours, minutes and seconds
            var weeks = Math.floor(remaining / MS_IN_WEEK);
            var days = Math.floor((remaining % MS_IN_WEEK) / MS_IN_DAY);
            var hours = Math.floor((remaining % MS_IN_DAY) / MS_IN_HOUR);
            var minutes = Math.floor((remaining % MS_IN_HOUR) / MS_IN_MINUTE);
            var seconds = Math.floor((remaining % MS_IN_MINUTE) / MS_IN_SECOND);

            // Check if we've reached the target time, and stop ourselves:
            if ((weeks < 1)
                && (days < 1)
                && (hours < 1)
                && (minutes < 1)
                && (seconds < 1)) {
                this.stop();
                this.displayTargetTimeReachedMessage();
                return;
            }

            collapseIfLessThan1(weeks, this.parts.weeks);
            collapseIfLessThan1(days, this.parts.days);
            collapseIfLessThan1(hours, this.parts.hours);
            collapseIfLessThan1(minutes, this.parts.minutes);
            
            this.parts.seconds.textContent = <string><unknown>seconds;

            this._currentMessage = generateMessage(weeks, days, hours, minutes, seconds, this.visibleSegments);
        }

        start(): void {
            // Schedule a tick to that offset
            this.tickToken = this.clock.registerTick(this.tick.bind(this));
        }

        stop(): void {
            if (this.tickToken) {
                this.clock.unregisterTick(this.tickToken);
                this.tickToken = null;
            }
        }

        removeFromDom(): void {
            this.parts.container.parentElement.removeChild(this.parts.container);
        }

        private displayTargetTimeReachedMessage(): void {
            this.parts.container.textContent = this._currentMessage = "You are living in the future";
        }

        private displayInvalidDateError(): void {
            this.parts.container.textContent = "Invalid date! You need to use an ISO formatted date";
        }

        hideNextSegment(): void {
            this.cycleSegmentVisibility();
            this.updateSegmentDOMState();
            this.saveSegmentConfigurationToStorage();
        }

        private updateSegmentDOMState(): void {
            const secondsVisible = !this.visibleSegments.includes(Segments.SECONDS);
            const minuteVisible = !this.visibleSegments.includes(Segments.MINUTES);
            const hoursVisible = !this.visibleSegments.includes(Segments.HOURS)
            const daysVisible = !this.visibleSegments.includes(Segments.DAYS);
            const weeksVisible = !this.visibleSegments.includes(Segments.WEEKS);

            this.parts.seconds.parentElement.classList.toggle(HIDE_SEGMENT_CLASS, secondsVisible);
            this.parts.minutes.parentElement.classList.toggle(HIDE_SEGMENT_CLASS, minuteVisible);
            this.parts.hours.parentElement.classList.toggle(HIDE_SEGMENT_CLASS, hoursVisible);
            this.parts.days.parentElement.classList.toggle(HIDE_SEGMENT_CLASS, daysVisible);
            this.parts.weeks.parentElement.classList.toggle(HIDE_SEGMENT_CLASS, weeksVisible);
        }

        cycleSegmentVisibility(): void {
            const secondsHidden = !this.visibleSegments.includes(Segments.SECONDS);
            const minutesHidden = !this.visibleSegments.includes(Segments.MINUTES);
            const hoursHidden = !this.visibleSegments.includes(Segments.HOURS)
            const daysHidden = !this.visibleSegments.includes(Segments.DAYS);

            if (!secondsHidden) {
                removeFromArray(this.visibleSegments, Segments.SECONDS);
                return;
            }

            if (!minutesHidden) {
                removeFromArray(this.visibleSegments, Segments.MINUTES);
                return;
            }

            if (!hoursHidden) {
                removeFromArray(this.visibleSegments, Segments.HOURS);
                return;
            }

            if (!daysHidden) {
                removeFromArray(this.visibleSegments, Segments.DAYS);
                return;
            }

            this.visibleSegments = AllSegments.slice();
            this.saveSegmentConfigurationToStorage();
        }

        private loadSegmentConfigurationFromStorage(): void {
            const storageValue = window.localStorage.getItem("segmentConfig");
            if (storageValue === null) {
                // Nothing persisted, give up
                return;
            }

            const storageConfig = JSON.parse(storageValue);
            if (!Array.isArray(storageConfig) || storageConfig.length < 1) {
                // Not a valid object. we'll stomp it later.
                return;
            }

            this.visibleSegments = storageConfig;
        }

        private saveSegmentConfigurationToStorage(): void {
            window.localStorage.setItem("segmentConfig", JSON.stringify(this.visibleSegments));
        }
    }
}