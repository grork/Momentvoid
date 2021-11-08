(function () {
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

    function collapseIfLessThan1(value, element) {
        var parent = element.parentElement;

        if(value > 0) {
            element.textContent = value;
            parent.style.display = "";
            return;
        }

        element.textContent = "-";
        parent.style.display = "none"
    }

    function addCommaIfNeeded(source) {
        if (source.length === 0) {
            return source;
        }

        return source + ", ";
    }

    function generateMessage(weeks, days, hours, minutes, seconds, segments) {
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

    function removeFromArray(source, itemToRemove) {
        let itemIndex = source.indexOf(itemToRemove);
        if (itemIndex < 0) {
            return;
        }

        source.splice(itemIndex, 1);
    }

    function cloneIntoWithParts(template, target, partNames) {
        let parts = {};
        let content = template.content;
    
        for (var index = 0; index < content.children.length; index += 1) {
            // Clone the node, and append it directly to the supplied container
            const templateChild = content.children[index];
            const clonedChild = templateChild.cloneNode(true);
            target.appendChild(clonedChild);
    
            // If we were asked to match parts, we'll do so.
            if (partNames?.length) {
                locatePartsFromDOM(clonedChild, partNames, parts);
            }
        }
    
        return parts;
    }

    function locatePartsFromDOM(element, partNames, parts) {
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

    function toggleFullscreen() {
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

    function saveCountdownsToStorage(countdowns) {
        const targetTimes = [];

        countdowns.forEach((countdown) => {
            if (!countdown.targetDate) {
                // Don't capture items with invalid target dates
                return;
            }

            const timeAsString = countdown.targetDate.toISOString();
            
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

            return {
                targetDate: time,
                title: persistedCountdown.title
            };
        });
    }

    class Clock {
        constructor() {
            this.timeOffset = 0;
            this.accelerationFactor = 0;
            this.handlers = new Map(); // Anyone listening for a tick
            this.nextHandlerId = 0;
            this.intervalToken = 0;
            this.tickInterval = DEFAULT_TICK_INTERVAL;
        }

        tick() {
            const tickData = this.getCurrentTickData();

            // Call all the handlers with the tick data so they can do whatever
            // it is they need to do. Note that they might throw, so lets
            // swallow it, and log any info when someone complains.
            for (const [_, handler] of this.handlers) {
                try {
                    handler(tickData);
                } catch(e) {
                    console.log("A tick handler failed: " + e.toString());
                }
            }
        }

        // Generates the tickdata to pass to handlers so they are all working
        // of a shared clock, which may or may not be time shifted.
        getCurrentTickData() {
            const newTime = this.getTime();
            const tickData = {
                getTime: () => newTime
            };

            return tickData;
        }

        // Register a callback for when a tick, ticks.
        registerTick(handler) {
            // so that people can easily unregister their tick handler, we give
            // them an ID they can use for clearing that register if they need
            // to. This is not fancy, but it gets the job done.
            var token = (this.nextHandlerId += 1);

            this.handlers.set(token, handler);
            
            return token;
        }
        
        unregisterTick(token) {
            this.handlers.delete(token);
        }

        getTime() {
            let time = Date.now();
            if (this.timeOffset || this.accelerationFactor) {
                time += ((this.timeOffset += this.accelerationFactor) * 1000);
            }

            return time;
        }

        start(tickInterval) {
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

        stop() {
            if(this.intervalToken) {
                window.clearInterval(this.intervalToken);
                this.intervalToken = null;
            }
        }

        setClockSpeed(accelerationFactor = 1, interval = DEFAULT_TICK_INTERVAL) {
            this.stop();

            this.accelerationFactor = accelerationFactor;

            this.start(interval);
        }

        resumeNormalSpeed() {
            this.stop();
            this.accelerationFactor = 0;
            this.tickInterval = DEFAULT_TICK_INTERVAL;

            this.start();
        }

        resetToCurrentTime() {
            this.stop();
            this.timeOffset = 0;
            this.resumeNormalSpeed();
        }

        goFaster() {
            let newAccelerationFactor = this.accelerationFactor * 10;
            if (newAccelerationFactor === 0) {
                newAccelerationFactor = 1;
            }

            newAccelerationFactor = Math.min(newAccelerationFactor, 10000);

            let newTickInterval = this.tickInterval / 10;
            newTickInterval = Math.max(newTickInterval, 16);

            this.setClockSpeed(newAccelerationFactor, newTickInterval);
        }

        togglePlayPause() {
            if (this.intervalToken) {
                this.stop();
                return;
            }

            this.start();
        }
    }
    
    class CountdownControl {
        constructor(container, clock, countdown) {
            this.clock = clock;
            this.accelerateTime = 0;
            this.accelerationFactor = 0;
            this.countdown = countdown;
            this.visibleSegments = AllSegments.slice();
            this.loadSegmentsFromStorage();

            const template = document.querySelector("[data-template='countdown-template']");
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

            this.titleElement.textContent = this.title;

            if (!countdown.targetDate) {
                this.displayInvalidDateError();
                return;
            }

            this.updateSegmentDOMState();

            this.start();
        }

        tick(tickData) {
            const now = tickData.getTime();
            const remaining = this.countdown.targetDate.getTime() - now;

            // Time calculations for days, hours, minutes and seconds
            var weeks = Math.floor(remaining / MS_IN_WEEK);
            var days = Math.floor( (remaining % MS_IN_WEEK) / MS_IN_DAY);
            var hours = Math.floor( (remaining % MS_IN_DAY ) / MS_IN_HOUR);
            var minutes = Math.floor( (remaining % MS_IN_HOUR) / MS_IN_MINUTE);
            var seconds = Math.floor( (remaining % MS_IN_MINUTE) / MS_IN_SECOND);

            // Check if we've reached the target time, and stop ourselves:
            if((weeks < 1)
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
            
            this.secondsElement.textContent = seconds;

            this.currentMessage = generateMessage(weeks, days, hours, minutes, seconds, this.visibleSegments);
        }

        start() {
            // Schedule a tick to that offset
            this.tickToken = this.clock.registerTick(this.tick.bind(this));
        }

        stop() {
            if(this.tickToken) {
                this.clock.unregisterTick(this.tickToken);
                this.tickToken = null;
            }
        }

        removeFromDom() {
            this.containerElement.parentElement.removeChild(this.containerElement);
        }

        displayTargetTimeReachedMessage()
        {
            this.containerElement.textContent = this.currentMessage = "You are living in the future";
        }

        displayInvalidDateError() {
            this.containerElement.textContent = "Invalid date! You need to use an ISO formatted date";
        }

        hideNextSegment() {
            this.cycleSegmentVisibility();
            this.updateSegmentDOMState();
            this.saveSegmentsToStorage();
        }

        updateSegmentDOMState() {
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

        cycleSegmentVisibility() {
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
            this.saveSegmentsToStorage();
        }

        loadSegmentsFromStorage() {
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

        saveSegmentsToStorage() {
            window.localStorage.setItem("segmentConfig", JSON.stringify(this.visibleSegments));
        }
    }

    class Menu {
        constructor(countdowns, clock, themeManager, container) {
            this.clock = clock;
            this.countdowns = countdowns;
            this.container = container;
            this.themeManager = themeManager;
            this.parts = {};

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

        handleClick(event) {
            // We only want clicks directly on the container element
            if(event.target !== this.container) {
                return;
            }

            this.dismissMenu();
        }

        handleKeyDown(keyEvent) {
            // When typing into a text box, don't process shortcuts.
            if (keyEvent.target.tagName === "INPUT") {
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

        handleShiftKeyDown(keyEvent) {
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

        toggleMenuVisibility() {
            if (this.container.style.display === "none") {
                this.renderExistingCountdowns();
                this.container.style.display = "";
            } else {
                this.dismissMenu();
            }
        }

        handleNoModifierKeyDown(keyEvent) {
            const keyToMatch = keyEvent.key.toLowerCase();
            switch (keyToMatch)
            {
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

        handleAddButtonClick() {
            // Note that the value from the date picker is actually a *string*
            // so does need to be parsed.
            const countdown = { targetDate: new Date(this.parts.targetDate.value), title: this.parts.titleTextbox.value };
            this.addCountdown(countdown);

            this.dismissMenu();
        }

        renderExistingCountdowns() {
            this.parts.countdownList.innerHTML = "";

            if (this.countdowns.length === 1) {
                return;
            }

            const template = document.querySelector("[data-template='countdown-list-template'");

            this.countdowns.forEach(countdown => {
                const parts = cloneIntoWithParts(template, this.parts.countdownList, ["label", "remove"]);
                parts.label.textContent = `${countdown.title} (${countdown.countdown.targetDate.toLocaleDateString()})`;

                parts.remove.addEventListener("click", () => {
                    this.removeCountdown(countdown.countdown.targetDate);
                });
            });
        }

        putCountdownTimesOnClipboard() {
            let message = null;

            if (this.countdowns.length === 1) {
                message = this.countdowns[0].currentMessage;
            } else {
                this.countdowns.forEach((c, index) => {
                    const countdownText = `${c.title}: ${c.currentMessage}`;

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

        hideNextSegmentOnCountdowns() {
            this.countdowns.forEach((c) => c.hideNextSegment());
        }

        addCountdown(countdown) {
            const countdownControl = new CountdownControl(document.getElementById("countdown-container"), this.clock, countdown);
            this.countdowns.push(countdownControl);

            const countdownData = this.countdowns.map(c => c.countdown);

            saveCountdownsToStorage(countdownData);
            this.clock.start();

            this.renderExistingCountdowns();
        }

        removeCountdown(targetTime) {
            const matchedCountdowns = this.countdowns.filter((c) => c.countdown.targetDate == targetTime);

            matchedCountdowns.forEach((c) => {
                c.stop();
                c.removeFromDom();
                removeFromArray(this.countdowns, c);
            });

            const countdownData = this.countdowns.map(c => c.countdown);
            saveCountdownsToStorage(countdownData);
            this.renderExistingCountdowns();
        }

        dismissMenu() {
            this.container.style.display = "none";
        }
    }

    class ThemeManager {
        constructor() {
            this.themeConfig = {
                dark: "default",
                light: "default"
            };

            this.loadFromStorage();
            this.isSystemDarkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        }

        loadFromStorage() {
            const storageValue = window.localStorage.getItem("themeConfig");
            if (storageValue === null) {
                // Nothing persisted, give up
                return;
            }

            const storageConfig = JSON.parse(storageValue);
            if (!storageConfig.hasOwnProperty("dark") && !storageConfig.hasOwnProperty("light")) {
                // Not a valid object. we'll stomp it later.
                return;
            }

            this.themeConfig = storageConfig;
        }

        saveConfigToStorage() {
            window.localStorage.setItem("themeConfig", JSON.stringify(this.themeConfig));
        }

        toggleTheme() {
            const themeState = this.getCurrentThemeState();
            const isDefaultForTheme = (themeState.currentThemeSetting === THEME_DEFAULT);
            const setting = (isDefaultForTheme) ? THEME_TOGGLED : THEME_DEFAULT;

            this.themeConfig[themeState.currentThemeKey] = setting;
        
            this.applyThemeBasedOnConfig();
            this.saveConfigToStorage();
        }

        applyThemeBasedOnConfig() {
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

        getCurrentThemeState() {
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
        const clock = window.Clock = new Clock();

        let firstTargetDate = DEFAULT_TARGET;
        const params = new URLSearchParams(window.location.search);
        let targetParam = params.get("target");
        if(targetParam) {   
            const targetAsDate = new Date(targetParam);
            firstTargetDate = targetAsDate; 
            if(isNaN(firstTargetDate)) {
                firstTargetDate = new Date(DEFAULT_TARGET);
            }
        }

        let persistedCountdowns = loadCountdownsFromStorage();
        if (!persistedCountdowns.length) {
            // If we didn't find any persisted countdowns, create a default one
            persistedCountdowns = [{ targetDate: firstTargetDate }];
        }

        // Create the count downs from any saved state
        const countdowns = persistedCountdowns.map((persistedCountdown) => {
            return new CountdownControl(
                document.getElementById("countdown-container"),
                clock,
                persistedCountdown
            );
        });

        window.Countdowns = countdowns;
        window.Menu = new Menu(
            countdowns,
            clock,
            themeHelper,
            document.querySelector(".menu-container")
        );

        clock.start();
    });
})();
