(function () {
    const DEFAULT_TARGET = new Date("2021-11-30T23:59:59").getTime();
    
    const MS_IN_SECOND = 1000;
    const MS_IN_MINUTE = MS_IN_SECOND * 60;
    const MS_IN_HOUR = MS_IN_MINUTE * 60;
    const MS_IN_DAY = MS_IN_HOUR * 24;
    const MS_IN_WEEK = MS_IN_DAY * 7;

    const DARK_THEME_KEY = "dark";
    const LIGHT_THEME_KEY = "light";
    const THEME_DEFAULT = "default";
    const THEME_TOGGLED = "toggled";

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

    function generateMessage(weeks, days, hours, minutes, seconds) {
        let message = "";
        if (weeks === 1) {
            message = "1 week";
        }

        if (weeks > 1) {
            message = `${weeks} weeks`;
        }

        if (days > 0) {
            message += ", ";

            if (days === 1) {
                message += "1 day";
            }

            if (days > 1) {
                message += `${days} days`;
            }
        }

        if (hours > 0) {
            message += ", ";

            if (hours === 1) {
                message += "1 hour";
            }

            if (hours > 1) {
                message += `${hours} hours`;
            }
        }

        if (minutes > 0) {
            message += ", ";
            message += `${minutes} min`;
        }

        if (seconds > 0) {
            message += ", ";
            message += `${seconds} sec`;
        }

        return message;
    }
    
    class Countdown {
        constructor(containerElement) {
            this.accelerateTime = 0;
            this.containerElement = containerElement;
            this.targetDate = DEFAULT_TARGET;

            const params = new URLSearchParams(window.location.search);
            let targetParam = params.get("target");
            if(targetParam) {   
                const targetAsDate = new Date(targetParam);
                this.targetDate = targetAsDate.getTime(); 
                if(isNaN(this.targetDate)) {
                    this.displayInvalidDateError();
                    return;
                }
            }

            this.weeksElement = this.containerElement.querySelector("[data-countdown-part='weeks'");
            this.daysElement = this.containerElement.querySelector("[data-countdown-part='days'");
            this.hoursElement = this.containerElement.querySelector("[data-countdown-part='hours'");
            this.minutesElement = this.containerElement.querySelector("[data-countdown-part='minutes'");
            this.secondsElement = this.containerElement.querySelector("[data-countdown-part='seconds'");

            this.start();
        }

        getTime() {
            let time = new Date().getTime();
            if (this.accelerateTime) {
                time += ((this.accelerateTime += 1) * 1000);
            }

            return time;
        }

        tick() {
            const now = this.getTime();
            const remaining = this.targetDate - now;

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

            this.currentMessage = generateMessage(weeks, days, hours, minutes, seconds);
        }

        start(tickInterval) {
            tickInterval = tickInterval || 1000;
            this.tick();
            
            // Calculate approximate offset to the nearest whole second with
            // a small fudge factor
            var currentSecondOffset = (Date.now() % 1000) - 5;
            
            // Schedule a tick to that offset
            this.intervalToken = setTimeout(() => {
                // Actually start our 'on the second' tick
                this.intervalToken = window.setInterval(this.tick.bind(this), tickInterval);
                this.tick();
            }, currentSecondOffset);
        }

        stop() {
            if(this.intervalToken) {
                window.clearInterval(this.intervalToken);
                this.intervalToken = null;
            }
        }

        goFaster() {
            this.stop();
            let newInterval = 0;

            if (this.accelerateTime) {
                this.accelerateTime = 0;
            } else {
                this.accelerateTime = 1;
                newInterval = 250;
            }

            this.start(newInterval);
        }

        toggle() {
            if (this.intervalToken) {
                this.stop();
                return;
            }

            this.start();
        }

        displayTargetTimeReachedMessage()
        {
            this.containerElement.textContent = this.currentMessage = "You are living in the future";
        }

        displayInvalidDateError() {
            this.containerElement.textContent = "Invalid date! You need to use an ISO formatted date";
        }

        putOnClipboard() {
            navigator.clipboard.writeText(this.currentMessage);
        }

        toggleFullscreen() {
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
    }

    class Shortcuts {
        constructor(countdown, themeManager, container) {
            this.countdown = countdown;
            this.container = container;
            this.themeManager = themeManager;

            window.addEventListener("keydown", this.handleKeyDown.bind(this));
            window.addEventListener("keyup", this.handleKeyUp.bind(this));
        }

        handleKeyDown(keyEvent) {
            // Don't handle the event again if they key is being held down
            if (keyEvent.repeat) {
                return;
            }

            switch (keyEvent.key)
            {
                case "m":
                case "M":
                    this.container.style = "";
                    break;
                
                case "p":
                case "P":
                    this.countdown.toggle();
                    break;
                
                case "t":
                case "T":
                    this.themeManager.toggleTheme();
                    break;
                
                case "c":
                case "C":
                    this.countdown.putOnClipboard();
                    break;

                case "f":
                case "F":
                    this.countdown.toggleFullscreen()
                    break;
                
                case "r":
                case "R":
                    this.themeManager.resetConfig();
                    window.location.reload();
                    break;
                
                case "a":
                case "A":
                    this.countdown.goFaster();
                    break;
            }
        }

        handleKeyUp()
        {
            this.container.style = "display: none";
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

        resetConfig() {
            window.localStorage.clear();
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

            const setTheme = () => document.body.classList.toggle(alternativeTheme, isOverriden);
            
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
        var countdown = new Countdown(document.getElementById("primary-countdown"));
        window.Countdown = countdown;
        window.Shortcuts = new Shortcuts(countdown, themeHelper, document.querySelector(".shortcuts-container"));
    });
})();
