import { Clock } from "./clock.js";
import { CountdownManager } from "./countdown.js";
import { CountdownControl } from "./countdowncontrol.js";
import { ManageCountdowns } from "./managecountdowns.js";
import { Menu } from "./menu.js";
import { ShortcutMananger } from "./shortcuts.js";
import { ThemeManager } from "./thememanager.js";
import { Toolbar } from "./toolbar.js";
import { NullableString } from "./utilities.js";
import JSConfetti from "js-confetti";

function toggleEmptyState(isEmpty: boolean): void {
    document.body.classList.toggle("ui-empty-state", isEmpty);
}

function writeCountdownTimesToClipboard(countdowns: CountdownControl[]): void {
    let message: string = "";

    if (countdowns.length === 1) {
        message = countdowns[0].currentMessage;
    } else {
        countdowns.forEach((c, index): void => {
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

let State: {
    Clock: Clock;
    CountdownControls: CountdownControl[];
    CountdownManager: CountdownManager;
    Menu: Menu;
    LoadingConfetti?: Promise<void>;
    Confetti?: JSConfetti;
    Toolbar: Toolbar,
    ManageCountdowns: ManageCountdowns;
};

document.addEventListener("DOMContentLoaded", () => {
    function getConfetti(): JSConfetti {
        // If we don't have the confetti cached...
        if (!State.Confetti) {
            // ... create & initialize it ...
            State.Confetti = new JSConfetti();
        }

        return State.Confetti;
    }

    // Start the single clock ticker
    const clock = new Clock();

    let defaultTargetDates: [Date, NullableString][] = [];
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
        const control = new CountdownControl(
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

        toggleEmptyState(!countdowns.length);
    });

    const themeManager = new ThemeManager();
    themeManager.applyThemeBasedOnConfig();

    const menu = new Menu(document.querySelector("[data-id='menu-container']")!);
    const toggleMenuVisibility = menu.toggleMenuVisibility.bind(menu);

    const manageCountdowns = new ManageCountdowns(document.querySelector("[data-id='manage-container']")!, countdownManager);
    const welcomeCountdowns = new ManageCountdowns(document.querySelector("[data-id='welcome-container']")!, countdownManager);

    const toggleManageCountdowns = manageCountdowns.toggleVisibility.bind(manageCountdowns);
    const toolbar = new Toolbar(document.querySelector("[data-id='toolbar-container']")!,
        toggleMenuVisibility,
        toggleManageCountdowns);

    const shortcuts = new ShortcutMananger();

    shortcuts.registerNoModifierHandlers({
        "a": toggleManageCountdowns,
        "p": () => clock.togglePlayPause(),
        "t": () => themeManager.toggleTheme(),
        "n": () => clock.resetToCurrentTime(),
        "f": () => clock.goFaster(),
        "o": () => countdownManager.cycleSortOrder(),
        "0": () => clock.resumeNormalSpeed(),
        "s": () => countdownControls.forEach((c) => c.hideNextSegment()),
        "c": () => countdownControls[0]?.playCelebrationAnimation(),
        "m": toggleManageCountdowns,
        "h": toggleMenuVisibility,
        "/": toggleMenuVisibility,
        "w": () => welcomeCountdowns.toggleVisibility()
    });

    shortcuts.registerShiftModifierHandlers({
        "r": () => {
            window.localStorage.clear();
            window.location.reload();
        },
        "f": toggleFullscreen,
        "?": toggleMenuVisibility
    });

    document.body.addEventListener("copy", () => writeCountdownTimesToClipboard(countdownControls));
    document.body.addEventListener("pointerup", (e) => {
        if (!countdownContainer.parentElement?.contains(<HTMLElement>e.target) && countdownContainer.parentElement !== e.target) {
            return;
        }

        document.body.classList.toggle("ui-force-visible");
    });

    State = {
        Clock: clock,
        CountdownControls: countdownControls,
        CountdownManager: countdownManager,
        Menu: menu,
        Toolbar: toolbar,
        ManageCountdowns: manageCountdowns
    };

    // Wait to start the countdown controls, so that any state etc is
    // properly constructed.
    countdownControls.forEach((cd) => cd.start());
    if (params.get("startpaused") !== "true") {
        clock.start();
    }

    if (countdownManager.getCountdownsSnapshot().length === 0) {
        toggleEmptyState(true);
        welcomeCountdowns.show();
    }
});

export { };
