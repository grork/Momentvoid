namespace Codevoid.Momentvoid {
    const DEFAULT_TARGET = new Date("2021-11-30T00:00:00");
    const DEFAULT_TICK_INTERVAL = 1000;
    
    const MS_IN_SECOND = 1000;
    const MS_IN_MINUTE = MS_IN_SECOND * 60;
    const MS_IN_HOUR = MS_IN_MINUTE * 60;
    const MS_IN_DAY = MS_IN_HOUR * 24;
    const MS_IN_WEEK = MS_IN_DAY * 7;

    const DARK_THEME_KEY = "dark";
    const LIGHT_THEME_KEY = "light";
    const THEME_DEFAULT = "default";
    const THEME_TOGGLED = "toggled";
    
    const HIDE_SEGMENT_CLASS = "countdown-element-hide";

    const Segments = {
        WEEKS: 'WEEKS',
        DAYS: 'DAYS',
        HOURS: 'HOURS',
        MINUTES: 'MINUTES',
        SECONDS: 'SECONDS'
    };

    const AllSegments = [
        Segments.WEEKS,
        Segments.DAYS,
        Segments.HOURS,
        Segments.MINUTES,
        Segments.SECONDS
    ];

    function collapseIfLessThan1(value: number, element: HTMLElement): void {
        var parent = element.parentElement;

        if (value > 0) {
            element.textContent = <string><unknown>value;
            parent.style.display = "";
            return;
        }

        element.textContent = "-";
        parent.style.display = "none"
    }

    function addCommaIfNeeded(source: string): string {
        if (source.length === 0) {
            return source;
        }

        return source + ", ";
    }

    function generateMessage(weeks: number, days: number, hours: number, minutes: number, seconds: number, segments: string[]): string {
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

    function removeFromArray<T>(source: T[], itemToRemove: T) {
        let itemIndex = source.indexOf(itemToRemove);
        if (itemIndex < 0) {
            return;
        }

        source.splice(itemIndex, 1);
    }

    function cloneIntoWithParts(template: HTMLTemplateElement, target: HTMLElement, partNames: string[]): { [key: string]: HTMLElement } {
        let parts: { [key: string]: HTMLElement } = {};
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

    function locatePartsFromDOM(element: HTMLElement, partNames: string[], parts: {[key: string]: HTMLElement}): void {
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
            let foundPart = <HTMLElement>element.querySelector(selector);

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

    function toggleFullscreen(): void {
        if (document.body.webkitRequestFullscreen) {
            // Assuming webkit
            if (!document.webkitFullscreenElement) {
                document.body.webkitRequestFullscreen();
            } else {
                document.webkitExitFullscreen();
            }

            return;
        }

        // Assume not-webkit
        if (!document.fullscreenElement) {
            document.body.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    function saveCountdownsToStorage(countdowns): void {
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

    function loadCountdownsFromStorage() {
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

    interface ITickData {
        getTime(): number;
    }

    class Clock {
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

    class Countdown {
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
            if(!this.targetDate) {
                return "";
            }

            return this.targetDate.toLocaleDateString();
        }
    }
    
    class CountdownControl {
        private weeksElement: HTMLElement;
        private daysElement: HTMLElement;
        private hoursElement: HTMLElement;
        private minutesElement: HTMLElement;
        private secondsElement: HTMLElement;
        private titleElement: HTMLElement;
        private containerElement: HTMLElement;
        private visibleSegments: string[] = AllSegments.slice();
        private tickToken: number;
        private _currentMessage: string;

        public get currentMessage(): string {
            return this._currentMessage;
        }

        constructor(container: HTMLElement, private clock: Clock, public readonly countdown: Countdown) {
            this.loadSegmentConfigurationFromStorage();

            const template = <HTMLTemplateElement>document.querySelector("[data-template='countdown-template']");
            const parts = cloneIntoWithParts(template, container, [
                "weeks",
                "days",
                "hours",
                "minutes",
                "seconds",
                "container",
                "title"
            ]);
            
            this.weeksElement = parts.weeks;
            this.daysElement = parts.days;
            this.hoursElement = parts.hours;
            this.minutesElement = parts.minutes;
            this.secondsElement = parts.seconds;
            this.titleElement = parts.title;
            this.containerElement = parts.container;

            this.titleElement.textContent = this.countdown.title;

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

            collapseIfLessThan1(weeks, this.weeksElement);
            collapseIfLessThan1(days, this.daysElement);
            collapseIfLessThan1(hours, this.hoursElement);
            collapseIfLessThan1(minutes, this.minutesElement);
            
            this.secondsElement.textContent = <string><unknown>seconds;

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
            this.containerElement.parentElement.removeChild(this.containerElement);
        }

        private displayTargetTimeReachedMessage(): void {
            this.containerElement.textContent = this._currentMessage = "You are living in the future";
        }

        private displayInvalidDateError(): void {
            this.containerElement.textContent = "Invalid date! You need to use an ISO formatted date";
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

            this.secondsElement.parentElement.classList.toggle(HIDE_SEGMENT_CLASS, secondsVisible);
            this.minutesElement.parentElement.classList.toggle(HIDE_SEGMENT_CLASS, minuteVisible);
            this.hoursElement.parentElement.classList.toggle(HIDE_SEGMENT_CLASS, hoursVisible);
            this.daysElement.parentElement.classList.toggle(HIDE_SEGMENT_CLASS, daysVisible);
            this.weeksElement.parentElement.classList.toggle(HIDE_SEGMENT_CLASS, weeksVisible);
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

    class Menu {
        private parts: { [key: string]: HTMLElement } = {};

        constructor(
            private countdownControls: CountdownControl[],
            private countdowns: Countdown[],
            private clock: Clock,
            private themeManager: ThemeManager,
            private container: HTMLElement) {

            locatePartsFromDOM(this.container, [
                "countdownList",
                "targetDate",
                "titleTextbox",
                "addButton"
            ], this.parts);

            window.addEventListener("keydown", this.handleKeyDown.bind(this));
            window.addEventListener("click", this.handleClick.bind(this));
            this.parts.addButton.addEventListener("click", this.handleAddButtonClick.bind(this));
        }

        private handleClick(event: MouseEvent): void {
            // We only want clicks directly on the container element
            if (event.target !== this.container) {
                return;
            }

            this.dismissMenu();
        }

        private handleKeyDown(keyEvent: KeyboardEvent): void {
            // When typing into a text box, don't process shortcuts.
            if ((<HTMLElement>keyEvent.target).tagName === "INPUT") {
                return;
            }
            
            // Don't handle the event again if they key is being held down
            if (keyEvent.repeat) {
                return;
            }

            if (keyEvent.shiftKey) {
                this.handleShiftKeyDown(keyEvent);
                return;
            }

            this.handleNoModifierKeyDown(keyEvent);
        }

        private handleShiftKeyDown(keyEvent: KeyboardEvent): void {
            switch (keyEvent.key.toLowerCase()) {
                case "r":
                    window.localStorage.clear();
                    window.location.reload();
                    break;
                
                case "f":
                    toggleFullscreen();
                    break;
                
                case "?":
                    this.toggleMenuVisibility();
                    break;
            }
        }

        private toggleMenuVisibility(): void {
            if (this.container.style.display === "none") {
                this.renderExistingCountdowns();
                this.container.style.display = "";
            } else {
                this.dismissMenu();
            }
        }

        private handleNoModifierKeyDown(keyEvent: KeyboardEvent): void {
            const keyToMatch = keyEvent.key.toLowerCase();
            switch (keyToMatch) {
                case "m":
                case "/":
                    this.toggleMenuVisibility();
                    break;
                
                case "p":
                    this.clock.togglePlayPause();
                    break;
                
                case "t":
                    this.themeManager.toggleTheme();
                    break;
                
                case "c":
                    this.putCountdownTimesOnClipboard();
                    break;
                
                case "n":
                    this.clock.resetToCurrentTime();
                    break;
                
                case "f":
                    this.clock.goFaster();
                    break;
                
                case "s":
                    this.hideNextSegmentOnCountdowns();
                    break;
                
                case "0":
                    this.clock.resumeNormalSpeed();
                    break;
                
                case "Escape":
                    this.dismissMenu();
                    keyEvent.preventDefault();
                    break;
            }
        }

        private handleAddButtonClick(): void {
            // Note that the value from the date picker is actually a *string*
            // so does need to be parsed.
            const countdown = new Countdown(
                new Date((<HTMLInputElement>this.parts.targetDate).value),
                (<HTMLInputElement>this.parts.titleTextbox).value);
            this.addCountdown(countdown);

            this.dismissMenu();
        }

        private renderExistingCountdowns(): void {
            this.parts.countdownList.innerHTML = "";

            if (this.countdowns.length === 1) {
                return;
            }

            const template = <HTMLTemplateElement>document.querySelector("[data-template='countdown-list-template'");

            this.countdowns.forEach(countdown => {
                const parts = cloneIntoWithParts(template, this.parts.countdownList, ["label", "remove"]);
                const title = countdown.title || "";
                parts.label.textContent = `${title} (${countdown.toLocaleDateString()})`;

                parts.remove.addEventListener("click", () => {
                    this.removeCountdown(countdown);
                });
            });
        }

        private putCountdownTimesOnClipboard(): void {
            let message: string = null;

            if (this.countdownControls.length === 1) {
                message = this.countdownControls[0].currentMessage;
            } else {
                this.countdownControls.forEach((c): void => {
                    const countdownText = `${c.countdown.title}: ${c.currentMessage}`;

                    if (!message) {
                        message = countdownText;
                        return;
                    }

                    // Yeah, this is weird. But this allows to get the correct
                    // platforms specific newline without detecting the user agent.
                    message = `${message}
${countdownText}`;
                })
            }

            navigator.clipboard.writeText(message);
        }

        private hideNextSegmentOnCountdowns(): void {
            this.countdownControls.forEach((c) => c.hideNextSegment());
        }

        private addCountdown(countdown: Countdown): void {
            this.countdowns.push(countdown);
            const countdownControl = new CountdownControl(document.getElementById("countdown-container"), this.clock, countdown);
            this.countdownControls.push(countdownControl);

            const countdownData = this.countdownControls.map(c => c.countdown);

            saveCountdownsToStorage(countdownData);
            this.clock.start();

            this.renderExistingCountdowns();
        }

        private removeCountdown(countdownToRemove: Countdown): void {
            const matchedCountdownControls = this.countdownControls.filter((c) => c.countdown === countdownToRemove);

            matchedCountdownControls.forEach((c) => {
                c.stop();
                c.removeFromDom();
                removeFromArray(this.countdownControls, c);
                removeFromArray(this.countdowns, c.countdown);
            });

            saveCountdownsToStorage(this.countdowns);
            this.renderExistingCountdowns();
        }

        private dismissMenu(): void {
            this.container.style.display = "none";
        }
    }

    class ThemeManager {
        private themeConfig: { dark: string; light: string };
        private isSystemDarkMediaQuery: MediaQueryList;

        constructor() {
            this.themeConfig = {
                dark: "default",
                light: "default"
            };

            this.loadFromStorage();
            this.isSystemDarkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        }

        private loadFromStorage(): void {
            const storageValue = window.localStorage.getItem("themeConfig");
            if (storageValue === null) {
                // Nothing persisted, give up
                return;
            }

            const storageConfig: any = JSON.parse(storageValue);
            if (!storageConfig.hasOwnProperty("dark") && !storageConfig.hasOwnProperty("light")) {
                // Not a valid object. we'll stomp it later.
                return;
            }

            this.themeConfig = storageConfig;
        }

        private saveConfigToStorage(): void {
            window.localStorage.setItem("themeConfig", JSON.stringify(this.themeConfig));
        }

        toggleTheme(): void {
            const themeState = this.getCurrentThemeState();
            const isDefaultForTheme = (themeState.currentThemeSetting === THEME_DEFAULT);
            const setting = (isDefaultForTheme) ? THEME_TOGGLED : THEME_DEFAULT;

            this.themeConfig[themeState.currentThemeKey] = setting;
        
            this.applyThemeBasedOnConfig();
            this.saveConfigToStorage();
        }

        applyThemeBasedOnConfig(): void {
            const themeState = this.getCurrentThemeState();
            const isOverriden = (themeState.currentThemeSetting !== THEME_DEFAULT);
            const alternativeTheme = (themeState.isSystemDark) ? "force-light" : "force-dark";

            const setTheme = () => {
                document.body.classList.toggle(alternativeTheme, isOverriden);

                // Now we need to update the safari et al window chrome colour
                // so that it matches the background of the page.
                let finalStyle = window.getComputedStyle(document.body);
                let meta = document.querySelector('meta[name="theme-color"]');
                meta.setAttribute("content", finalStyle.backgroundColor);
            }
            
            // Don't wait for request animation frame if we have a body element
            if (document && document.body) {
                setTheme()
            } else {
                window.requestAnimationFrame(setTheme);
            }
        }

        private getCurrentThemeState(): { isSystemDark: boolean; currentThemeKey: string; currentThemeSetting: string } {
            const isSystemDark = this.isSystemDarkMediaQuery.matches;
            const themeKey = (isSystemDark) ? DARK_THEME_KEY : LIGHT_THEME_KEY;
            const setting = this.themeConfig[themeKey];

            return {
                isSystemDark: isSystemDark,
                currentThemeKey: themeKey,
                currentThemeSetting: setting,
            }
        }
    }

    const themeHelper = new ThemeManager();
    themeHelper.applyThemeBasedOnConfig();

    document.addEventListener("DOMContentLoaded", () => {
        // Start the single clock ticker
        const clock = (<any>window).Clock = new Clock();

        let firstTargetDate = DEFAULT_TARGET;
        const params = new URLSearchParams(window.location.search);
        let targetParam = params.get("target");
        if (targetParam) {
            const targetAsDate = new Date(targetParam);
            firstTargetDate = targetAsDate;
            if (firstTargetDate.toString() == "Invalid Date") {
                firstTargetDate = new Date(DEFAULT_TARGET);
            }
        }

        let countdowns = loadCountdownsFromStorage();
        if (!countdowns.length) {
            // If we didn't find any persisted countdowns, create a default one
            countdowns = [new Countdown(firstTargetDate)];
        }

        // Create the count downs from any saved state
        const countdownControls = countdowns.map((countdown) => {
            return new CountdownControl(
                document.getElementById("countdown-container"),
                clock,
                countdown
            );
        });

        (<any>window).CountdownControls = countdownControls;
        (<any>window).Menu = new Menu(
            countdownControls,
            countdowns,
            clock,
            themeHelper,
            document.querySelector(".menu-container")
        );

        clock.start();
    });
}