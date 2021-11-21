namespace Codevoid.Momentvoid {
    const DEFAULT_TARGET = new Date("2021-11-30T00:00:00");

    const DARK_THEME_KEY = "dark";
    const LIGHT_THEME_KEY = "light";
    const THEME_DEFAULT = "default";
    const THEME_TOGGLED = "toggled";

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

    class Menu {
        private parts: IImmutableHtmlParts = {};

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
            let message: string = "";

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
            const countdownControl = new CountdownControl(document.getElementById("countdown-container")!, this.clock, countdown);
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
            (<HTMLInputElement>this.parts.titleTextbox).value = "";
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
                let meta = document.querySelector('meta[name="theme-color"]')!;
                meta.setAttribute("content", finalStyle.backgroundColor);
            }
            
            // Don't wait for request animation frame if we have a body element
            if (document && document.body) {
                setTheme()
            } else {
                window.requestAnimationFrame(setTheme);
            }
        }

        private getCurrentThemeState(): { isSystemDark: boolean; currentThemeKey: "dark" | "light"; currentThemeSetting: string } {
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

    let State: {
        Clock: Clock;
        CountdownControls: CountdownControl[];
        Countdowns: Countdown[];
        Menu: Menu;
    };

    document.addEventListener("DOMContentLoaded", () => {
        // Start the single clock ticker
        const clock = new Clock();

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
            countdowns = [new Countdown(firstTargetDate, null)];
        }

        // Create the count downs from any saved state
        const countdownControls = countdowns.map((countdown) => {
            return new CountdownControl(
                document.getElementById("countdown-container")!,
                clock,
                countdown
            );
        });

        const menu = new Menu(
            countdownControls,
            countdowns,
            clock,
            themeHelper,
            document.querySelector(".menu-container")!
        );

        State = {
            Clock: clock,
            CountdownControls: countdownControls,
            Countdowns: countdowns,
            Menu: menu
        };

        clock.start();
    });
}