const enum SystemColourScheme {
    Dark = "dark",
    Light = "light"
}

const THEME_DEFAULT_FOR_COLOUR_SCHEME = "default";
const DARK_SCHEME_LIGHT = "force-light";
const LIGHT_SHEME_DARK = "force-dark";

// We used to use 'toggled' to imply the opposite theme, this failed when we
// add multiple themes, we need to migrate that state
const THEME_TOGGLED_DEPRECATED = "toggled";

function handleDeprecatedThemeNameMapping(theme: string, systemColourScheme: SystemColourScheme): string {
    // if it's not toggled, we're going to return it pass through since theres
    // no  deprecation involved
    if (theme !== THEME_TOGGLED_DEPRECATED) {
        return theme;
    }

    switch (systemColourScheme) {
        case SystemColourScheme.Dark:
            return DARK_SCHEME_LIGHT;
        
        case SystemColourScheme.Light:
            return LIGHT_SHEME_DARK;
    }
}

export class ThemeManager {
    private settingBySystemColourScheme: { dark: string; light: string };
    private isSystemColourSchemeDarkMediaQuery: MediaQueryList;

    constructor() {
        this.settingBySystemColourScheme = {
            dark: "default",
            light: "default"
        };

        this.loadFromStorage();
        this.isSystemColourSchemeDarkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    }

    private loadFromStorage(): void {
        const storageValue = window.localStorage.getItem("themeConfig");
        if (storageValue === null) {
            // Nothing persisted, give up
            return;
        }

        const storageConfig: any = JSON.parse(storageValue);
        if (!storageConfig.hasOwnProperty(SystemColourScheme.Dark) && !storageConfig.hasOwnProperty(SystemColourScheme.Light)) {
            // Not a valid object. we'll stomp it later.
            return;
        }

        this.settingBySystemColourScheme = storageConfig;

        const lightTheme = this.settingBySystemColourScheme.light;
        const darkTheme = this.settingBySystemColourScheme.dark;

        if (lightTheme === THEME_TOGGLED_DEPRECATED || darkTheme === THEME_TOGGLED_DEPRECATED) {
            this.settingBySystemColourScheme.light = handleDeprecatedThemeNameMapping(lightTheme, SystemColourScheme.Light);
            this.settingBySystemColourScheme.dark = handleDeprecatedThemeNameMapping(darkTheme, SystemColourScheme.Dark);
            this.saveConfigToStorage();
        }
    }

    private saveConfigToStorage(): void {
        window.localStorage.setItem("themeConfig", JSON.stringify(this.settingBySystemColourScheme));
    }

    /**
     * Changes the current theme for the currently system colour scheme. E.g.,
     * cycles for dark if we're currently in dark scheme leaving whatever the
     * theme for light scheme is unchanged.
     */
    moveToNextTheme(): void {
        const themeState = this.getCurrentThemeState();
        const isDefaultForTheme = (themeState.currentThemeName === THEME_DEFAULT_FOR_COLOUR_SCHEME);
        const setting = (isDefaultForTheme) ? (themeState.isSystemDark ? DARK_SCHEME_LIGHT : LIGHT_SHEME_DARK) : THEME_DEFAULT_FOR_COLOUR_SCHEME;

        this.settingBySystemColourScheme[themeState.currentSystemColourScheme] = setting;

        this.applyThemeBasedOnConfig();
        this.saveConfigToStorage();
    }

    applyThemeBasedOnConfig(): void {
        const themeState = this.getCurrentThemeState();
        const isOverriden = (themeState.currentThemeName !== THEME_DEFAULT_FOR_COLOUR_SCHEME);
        const theme = (themeState.isSystemDark) ? "force-light" : "force-dark";

        const setTheme = () => {
            document.body.classList.toggle(theme, isOverriden);

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

    private getCurrentThemeState(): { isSystemDark: boolean; currentSystemColourScheme: SystemColourScheme; currentThemeName: string } {
        const isSystemDark = this.isSystemColourSchemeDarkMediaQuery.matches;
        const systemColourSchemeKey = (isSystemDark) ? SystemColourScheme.Dark : SystemColourScheme.Light;
        const setting = this.settingBySystemColourScheme[systemColourSchemeKey];

        return {
            isSystemDark: isSystemDark,
            currentSystemColourScheme: systemColourSchemeKey,
            currentThemeName: setting,
        }
    }
}