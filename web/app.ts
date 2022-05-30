namespace Codevoid.Momentvoid {
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

    function calculateDefaultDate(): [Date, NullableString][] {
        const dates: [Date, NullableString][] = [];

        // Work out the current year, and then pick a year after that
        const nextYear = ((new Date()).getFullYear()) + 1;

        if (!dates.length) {
            dates.push([new Date(nextYear, 0, 1, 0, 0, 0, 0), "Next Year"]);
        }

        return dates;
    }

    function thirtyDaysFromNow(): string {
        let thirtyDays = new Date();
        thirtyDays.setUTCHours(0);
        thirtyDays.setUTCMinutes(0);
        thirtyDays.setUTCSeconds(0);
        thirtyDays.setUTCMilliseconds(0);
        thirtyDays.setUTCDate(thirtyDays.getUTCDate() + 30);

        const result = `${thirtyDays.getUTCFullYear()}-${('0' + (thirtyDays.getUTCMonth() + 1)).slice(-2)}-${('0' + thirtyDays.getUTCDate()).slice(-2)}T00:00`;
        return result;
    }

    class Menu {
        private menuParts: {
            countdownList: HTMLElement;
            targetDate: HTMLInputElement;
            titleTextbox: HTMLInputElement;
            addButton: HTMLButtonElement;
            contentContainer: HTMLElement;
        };

        private toolbarParts: {
            add: HTMLButtonElement,
            info: HTMLButtonElement
        };

        constructor(
            private countdownControls: CountdownControl[],
            private countdownManager: CountdownManager,
            private clock: Clock,
            private themeManager: ThemeManager,
            private container: HTMLDialogElement,
            private toolbar: HTMLElement) {

            this.menuParts = locatePartsFromDOM(this.container);
            this.toolbarParts = locatePartsFromDOM(this.toolbar);

            window.addEventListener("keydown", this.handleKeyDown.bind(this));
            this.container.addEventListener("click", this.handleClick.bind(this));
            this.menuParts.addButton.addEventListener("click", this.handleAddButtonClick.bind(this));
            document.body.addEventListener("copy", this.putCountdownTimesOnClipboard.bind(this));
            this.container.addEventListener("close", this.handleDialogClose.bind(this));

            this.toolbarParts.info.addEventListener("click", this.toggleMenuVisibility.bind(this));
            this.toolbarParts.add.addEventListener("click", this.toggleMenuVisibility.bind(this));

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

            if (keyEvent.ctrlKey || keyEvent.metaKey) {
                // Nothing with these keys yet, but want to avoid handling
                // combinations that would trigger anyway
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
            //if (this.container.style.display === "none") {
            if(!this.container.open) {
                this.renderCountdownManagementList(this.countdownManager.getCountdownsSnapshot());
                
                // Update the default date in the date field to be 30 days in the
                // future
                this.menuParts.targetDate.value = thirtyDaysFromNow();

                this.container.showModal();

                // Since this area *can* scroll, restore the scroll to the top when
                // it's dismissed.
                this.menuParts.contentContainer.scrollTop = 0;
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
            const targetDate = new Date((<HTMLInputElement>this.menuParts.targetDate).value);
            const title = (<HTMLInputElement>this.menuParts.titleTextbox).value;

            this.countdownManager.addCountdown(targetDate, title);

            this.dismissMenu();
        }

        private handleDialogClose(): void {
            this.menuParts.titleTextbox.value = "";
        }

        private renderCountdownManagementList(currentCountdowns: Countdown[]): void {
            this.menuParts.countdownList.innerHTML = "";

            if (currentCountdowns.length === 1) {
                return;
            }

            const template = <HTMLTemplateElement>document.querySelector("[data-template='countdown-list-template'");

            currentCountdowns.forEach(countdown => {
                const parts: {
                    label: HTMLElement;
                    remove: HTMLButtonElement;
                } = cloneIntoWithParts(template, this.menuParts.countdownList);

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
            this.container.close();
        }
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