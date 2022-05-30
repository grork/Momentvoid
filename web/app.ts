namespace Codevoid.Momentvoid {
    function calculateDefaultDate(): [Date, NullableString][] {
        const dates: [Date, NullableString][] = [];

        // Work out the current year, and then pick a year after that
        const nextYear = ((new Date()).getFullYear()) + 1;

        if (!dates.length) {
            dates.push([new Date(nextYear, 0, 1, 0, 0, 0, 0), "Next Year"]);
        }

        return dates;
    }

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

        const themeManager = new ThemeManager();
        themeManager.applyThemeBasedOnConfig();

        const menu = new Menu(
            countdownControls,
            countdownManager,
            clock,
            themeManager,
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