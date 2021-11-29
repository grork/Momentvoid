namespace Codevoid.Momentvoid {
    const FIRST_TARGET = new Date("2021-11-30T00:00:00");
    const SECOND_TARGET = new Date("2021-12-17T00:00:00");
    const FIVE_DAYS_MS = ((((1000 * 60) * 60) * 24) * 5);

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

    function setCustomConfettiIfSpecialDate(control: CountdownControl): void {
        if (control.countdown.targetDate.getTime() === FIRST_TARGET.getTime()) {
            control.customConfettiEmoji = ["💵", "💸", "💰", "🤑"];
        }

        if (control.countdown.targetDate.getTime() === SECOND_TARGET.getTime()) {
            control.customConfettiEmoji = ["📉", "📈", "🏛"];
        }
    }

    class Menu {
        private parts: IImmutableHtmlParts = {};

        constructor(
            private countdownControls: CountdownControl[],
            private countdownManager: CountdownManager,
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
            document.body.addEventListener("copy", this.putCountdownTimesOnClipboard.bind(this));

            countdownManager.registerChangeHandler(this.renderCountdownManagementList.bind(this));
        }

        private handleClick(event: MouseEvent): void {
            // We only want clicks directly on the container element
            if (event.target !== this.container) {
                return;
            }

            this.dismissMenu();
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
                this.renderCountdownManagementList(this.countdownManager.getCountdownsSnapshot());
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
                
                case "n":
                    this.clock.resetToCurrentTime();
                    break;
                
                case "f":
                    this.clock.goFaster();
                    break;
                
                case "s":
                    this.hideNextSegmentOnCountdowns();
                    break;
                
                case "o":
                    this.countdownManager.cycleSortOrder();
                    break;
                
                case "0":
                    this.clock.resumeNormalSpeed();
                    break;
                
                case "c":
                    this.playCelebrationForFirstCountdown();
                
                case "escape":
                    this.dismissMenu();
                    keyEvent.preventDefault();
                    break;
            }
        }

        playCelebrationForFirstCountdown() {
            const firstCountdownControl = this.countdownControls[0];
            if (!firstCountdownControl) {
                return;
            }

            firstCountdownControl.playCelebrationAnimation();
        }

        private handleAddButtonClick(): void {
            // Note that the value from the date picker is actually a *string*
            // so does need to be parsed.
            const targetDate = new Date((<HTMLInputElement>this.parts.targetDate).value);
            const title = (<HTMLInputElement>this.parts.titleTextbox).value;

            this.countdownManager.addCountdown(targetDate, title);

            this.dismissMenu();
        }

        private renderCountdownManagementList(currentCountdowns: Countdown[]): void {
            this.parts.countdownList.innerHTML = "";

            if (currentCountdowns.length === 1) {
                return;
            }

            const template = <HTMLTemplateElement>document.querySelector("[data-template='countdown-list-template'");

            currentCountdowns.forEach(countdown => {
                const parts = cloneIntoWithParts(template, this.parts.countdownList, ["label", "remove"]);
                const title = countdown.title || "";
                parts.label.textContent = `${title} (${countdown.toLocaleDateString()})`;

                parts.remove.addEventListener("click", () => {
                    this.countdownManager.removeCountdown(countdown);
                });
            });
        }

        private putCountdownTimesOnClipboard(): void {
            let message: string = "";

            if (this.countdownControls.length === 1) {
                message = this.countdownControls[0].currentMessage;
            } else {
                this.countdownControls.forEach((c, index): void => {
                    const countdownTitle = c.countdown.title || `Countdown ${index + 1}`;
                    const countdownText = `${countdownTitle}: ${c.currentMessage}`;

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
        CountdownManager: CountdownManager;
        Menu: Menu;
        LoadingConfetti?: Promise<void>;
        Confetti?: JSConfetti;
    };

    function calculateDefaultDate(): Date[] {
        const now = Date.now();
        const firstAsMs = FIRST_TARGET.getTime();
        const secondAsMs = SECOND_TARGET.getTime();
        const dates: Date[] = [];

        const firstDateInTheFuture = (now < firstAsMs);
        const firstDateWithinFiveDays = ((now - firstAsMs) < FIVE_DAYS_MS);
        const secondDateInFuture = (now < secondAsMs);
        const secondDateWithinFiveDays = ((now - secondAsMs) < FIVE_DAYS_MS);

        // If the first date is in the future (hasn't passed), or has passed
        // but less than five days ago, add it
        if (firstDateInTheFuture || firstDateWithinFiveDays) {
            dates.push(FIRST_TARGET);
        }

        // If first date is passed, second date is in the future
        if (!firstDateInTheFuture && (secondDateInFuture || secondDateWithinFiveDays)) {
            dates.push(SECOND_TARGET);
        }

        // Work out the current year, and then pick a year after that
        const nextYear = ((new Date()).getFullYear()) + 1;

        if (!dates.length) {
            dates.push(new Date(nextYear, 1, 1, 0, 0, 0, 0));
        }

        return dates;
    }

    document.addEventListener("DOMContentLoaded", () => {
        async function getConfetti(): Promise<JSConfetti> {
            // If we don't have the confetti cached...
            if (!State.Confetti) {
                // ... and we aren't alreay loading it ...
                if (!State.LoadingConfetti) {
                    State.LoadingConfetti = new Promise<void>((r) => {
                        // ... load the script file by inserting it into `head`
                        const scriptElement = document.createElement("script");
                        scriptElement.addEventListener("load", () => r());
                        scriptElement.src = "js-confetti.browser.js";

                        document.head.appendChild(scriptElement);
                    });
                }

                // ... wait for the script to load ...
                await State.LoadingConfetti;

                // ... create & initialize it ...
                State.Confetti = new JSConfetti();
            }

            return State.Confetti;
        }

        // Start the single clock ticker
        const clock = new Clock();

        let defaultTargetDates = calculateDefaultDate();
        const params = new URLSearchParams(window.location.search);
        let targetParam = params.get("target");
        if (targetParam) {
            const targetAsDate = new Date(targetParam);
            if (defaultTargetDates.toString() !== "Invalid Date") {
                defaultTargetDates = [targetAsDate];
            }
        }

        const countdownManager = new CountdownManager(defaultTargetDates);
        const countdownContainer = document.getElementById("countdown-container")!;

        // Create the count downs from any saved state
        const countdownControls = countdownManager.getCountdownsSnapshot().map((countdown) => {
            const control =  new CountdownControl(
                countdownContainer,
                clock,
                countdown,
                countdownManager,
                getConfetti,
            );

            setCustomConfettiIfSpecialDate(control);

            return control;
        });

        // Listen for any changes in the list of countdowns. Note, the intent
        // here to scorched-earth the content, rather than trying to work out
        // what is new, what is old & render the deltas.
        countdownManager.registerChangeHandler((countdowns) => {
            while (countdownControls.length) {
                let toCleanup = countdownControls.pop();
                toCleanup?.stop();
            }

            countdownContainer.innerHTML = "";

            countdowns.forEach((c) => {
                const newControl = new CountdownControl(
                    countdownContainer,
                    clock,
                    c,
                    countdownManager,
                    getConfetti,
                );
                
                setCustomConfettiIfSpecialDate(newControl);

                newControl.start();

                countdownControls.push(newControl);
            });
        });

        const menu = new Menu(
            countdownControls,
            countdownManager,
            clock,
            themeHelper,
            document.querySelector(".menu-container")!
        );

        State = {
            Clock: clock,
            CountdownControls: countdownControls,
            CountdownManager: countdownManager,
            Menu: menu
        };

        // Wait to start the countdown controls, so that any state etc is
        // properly constructed.
        countdownControls.forEach((cd) => cd.start());
        clock.start();
    });
}