import JSConfetti from "js-confetti";
import { Clock, TickIntervalMs } from "./clock.js";
import { CountdownManager } from "./countdown.js";
import { CountdownControl, AllSegments, Segments } from "./countdowncontrol.js";
import { ManageCountdowns } from "./managecountdowns.js";
import { Menu } from "./menu.js";
import { ShortcutMananger } from "./shortcuts.js";
import { ThemeManager } from "./thememanager.js";
import { Toolbar } from "./toolbar.js";
import { NullableString, removeFromArray } from "./utilities.js";

async function postDataToService(data: any) {
    const response = await fetch('/.netlify/functions/setCookie', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return response.json();
}

async function getDataFromService() {
    const response = await fetch('/.netlify/functions/setCookie', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if (response.status === 200) {
        return response.json();
    }
    return null;
}

function toggleEmptyState(isEmpty: boolean): void {
    document.body.classList.toggle("ui-empty-state", isEmpty);
}

/**
 * Converts the supplied list of countdowns to the clipboard in a user-readable
 * format. Multiple countdowns will be split by the platform specific new line
 * character.
 * @param countdowns Countdown items to write to the clipboard
 */
function writeCountdownTimesToClipboard(countdowns: CountdownControl[]): void {
    let message: string = "";

    // If we only have one item, it's a simple copy of the message we already
    // generate.
    if (countdowns.length === 1) {
        message = countdowns[0].currentMessage;
    } else {
        // But > 1 requires us to differentiate with a title and a new line.
        // But not all countdowns have explicitly set titles...
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

/**
 * Toggles the full screen state from the browser, accounting for API differences
 * across versions and vendors.
 * 
 * If we are currently fullscreen, will exit. If we aren't, will enter.
 */
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
 * all segments. Also returns a new ticker interval that reflects the smallest
 * unit of the visible segments.
 * 
 * @param countdownControls Countdown Controls to refresh when segments change
 * @param visibleSegments Currently visible segments array 
 * @returns An interval reflecting the expected visible segments to minimize the
 *          time spent updating needlessly
 */
function cycleVisibleSegments(countdownControls: CountdownControl[], visibleSegments: Segments[]): number {
    {
        let newInterval = TickIntervalMs.Second;
        const secondsHidden = !visibleSegments.includes(Segments.SECONDS);
        const minutesHidden = !visibleSegments.includes(Segments.MINUTES);
        const hoursHidden = !visibleSegments.includes(Segments.HOURS)
        const daysHidden = !visibleSegments.includes(Segments.DAYS);
        const weeksHidden = !visibleSegments.includes(Segments.WEEKS);
        const monthsHidden = !visibleSegments.includes(Segments.MONTHS)
    
        if (!secondsHidden) {
            removeFromArray(visibleSegments, Segments.SECONDS);
            newInterval = TickIntervalMs.Minute;
        } else if (!minutesHidden) {
            removeFromArray(visibleSegments, Segments.MINUTES);
            newInterval = TickIntervalMs.Hour;
        } else if (!hoursHidden) {
            removeFromArray(visibleSegments, Segments.HOURS);
            newInterval = TickIntervalMs.Day;
        } else if (!daysHidden) {
            removeFromArray(visibleSegments, Segments.DAYS);
            newInterval = TickIntervalMs.Week;
        } else if (!weeksHidden) {
            removeFromArray(visibleSegments, Segments.WEEKS);
            newInterval = TickIntervalMs.Week;
        } else if (!monthsHidden) {
            removeFromArray(visibleSegments, Segments.MONTHS);
            newInterval = TickIntervalMs.Week;
        } else {
            // We need to set to 0, and add them back because there is a shared
            // instance of the visible segments across all countdowns. If we
            // just reset the reference to a new array, it will only effect our
            // local reference.
            visibleSegments.length = 0;
            visibleSegments.splice(0, 0, ...AllSegments);
            newInterval = TickIntervalMs.Second;
        }

        window.localStorage.setItem("segmentConfig", JSON.stringify(visibleSegments));

        countdownControls.forEach((c) => c.updateSegmentDOMState())

        return newInterval;
    }
}

/**
 * Holds general app state, available for all the functions within this file
 * access the appropriate state, and avoid them getting GCd.
 */
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

document.addEventListener("DOMContentLoaded", async () => {
    /**
     * Gets a JSConfetti instance, initializing it if needed
     * @returns The instance of JSConfetti to use to play confetti
     */
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

    // Process any URL parameters for adding countdowns to the list of tracked
    // countdowns, accounting for bad formats that people type in
    let defaultTargetDates: [Date, NullableString][] = [];
    const params = new URLSearchParams(window.location.search);
    let targetParam = params.get("target");
    if (targetParam) {
        const targetAsDate = new Date(targetParam);
        if (defaultTargetDates.toString() !== "Invalid Date") {
            defaultTargetDates = [[targetAsDate, null]];
        }
    }

    // Get the manager for our countdowns, passing in any ones obtained from
    // the URL so they can be merged
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
        "t": () => themeManager.moveToNextTheme(),
        "n": () => clock.resetToCurrentTime(),
        "f": () => clock.goFaster(),
        "o": () => countdownManager.cycleSortOrder(),
        "0": () => clock.resumeNormalSpeed(),
        "s": () => {
            const updatedInterval = cycleVisibleSegments(countdownControls, visibleSegments);
            clock.start(updatedInterval);
        },
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
    
    // When someone releases a mouse button toggle the visibility of various
    // transient elements (e.g., toolbar)
    document.body.addEventListener("pointerup", (e) => {
        if (!countdownContainer.parentElement?.contains(<HTMLElement>e.target) && countdownContainer.parentElement !== e.target) {
            return;
        }

        document.body.classList.toggle("ui-force-visible");
    });

    // Initialize the state now we've constructed our core app model
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
        const serviceData = await getDataFromService();
        if (serviceData) {
            countdownManager.loadCountdownsFromService(serviceData);
        }
        toggleEmptyState(true);
        welcomeCountdowns.show();
    }
});

export { };
