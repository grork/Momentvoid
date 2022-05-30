namespace Codevoid.Momentvoid {
    const DARK_THEME_KEY = "dark";
    const LIGHT_THEME_KEY = "light";
    const THEME_DEFAULT = "default";
    const THEME_TOGGLED = "toggled";

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
}