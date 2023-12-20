import JSConfetti from "js-confetti";
import { Clock } from "./clock.js";
import { CountdownManager } from "./countdown.js";
import { CountdownControl, AllSegments, Segments } from "./countdowncontrol.js";
import { ManageCountdowns } from "./managecountdowns.js";
import { Menu } from "./menu.js";
import { ShortcutMananger } from "./shortcuts.js";
import { ThemeManager } from "./thememanager.js";
import { Toolbar } from "./toolbar.js";
import { NullableString, removeFromArray } from "./utilities.js";

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

/**
 * Cycles through which segments are visible, removing one segment type per
 * invocation. If there are no more segments visible, will cycle back to showing
 * all segments
 * @param countdownControls Countdown Controls to refresh when segments change
 * @param visibleSegments Currently visible segments array 
 */
function cycleVisibleSegments(countdownControls: CountdownControl[], visibleSegments: Segments[]): void {
    {
        const secondsHidden = !visibleSegments.includes(Segments.SECONDS);
        const minutesHidden = !visibleSegments.includes(Segments.MINUTES);
        const hoursHidden = !visibleSegments.includes(Segments.HOURS)
        const daysHidden = !visibleSegments.includes(Segments.DAYS);
    
        if (!secondsHidden) {
            removeFromArray(visibleSegments, Segments.SECONDS);
        } else if (!minutesHidden) {
            removeFromArray(visibleSegments, Segments.MINUTES);
        } else if (!hoursHidden) {
            removeFromArray(visibleSegments, Segments.HOURS);
        } else if (!daysHidden) {
            removeFromArray(visibleSegments, Segments.DAYS);
        } else {
            // We need to set to 0, and add them back because there is a shared
            // instance of the visible segments across all countdowns. If we
            // just reset the reference to a new array, it will only effect our
            // local reference.
            visibleSegments.length = 0;
            visibleSegments.splice(0, 0, ...AllSegments);
        }

        window.localStorage.setItem("segmentConfig", JSON.stringify(visibleSegments));

        countdownControls.forEach((c) => c.updateSegmentDOMState())
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

    // Load the visible segments from storage, and apply them if available. We
    // need to assume none, and use all segments, for the first run case.
    let visibleSegments = AllSegments.slice();
    const storageValue = window.localStorage.getItem("segmentConfig");
    if (storageValue !== null) {
        const storageConfig = JSON.parse(storageValue);
        if (Array.isArray(storageConfig) && storageConfig.length > 0) {
            visibleSegments = storageConfig;
        }
    }

    // Create the count downs from any saved state
    const countdownControls = countdownManager.getCountdownsSnapshot().map((countdown) => {
        const control = new CountdownControl(
            countdownContainer,
            visibleSegments,
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
                visibleSegments,
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
        "s": () => cycleVisibleSegments(countdownControls, visibleSegments),
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
