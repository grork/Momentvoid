namespace Codevoid.Momentvoid {
    const DARK_THEME_KEY = "dark";
    const LIGHT_THEME_KEY = "light";
    const THEME_DEFAULT = "default";
    const THEME_TOGGLED = "toggled";

    function calculateDefaultDate(): [Date, NullableString][] {
        const dates: [Date, NullableString][] = [];

        // Work out the current year, and then pick a year after that
        const nextYear = ((new Date()).getFullYear()) + 1;

        if (!dates.length) {
            dates.push([new Date(nextYear, 0, 1, 0, 0, 0, 0), "Next Year"]);
        }

        return dates;
    }

    export class ThemeManager {
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
                defaultTargetDates = [[targetAsDate, null]];
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

                newControl.start();

                countdownControls.push(newControl);
            });
        });

        const menu = new Menu(
            countdownControls,
            countdownManager,
            clock,
            themeHelper,
            document.querySelector("[data-id='menu-container']")!,
            document.querySelector("[data-id='toolbar-container']")!
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
        if (params.get("startpaused") !== "true") {
            clock.start();
        }
    });
}