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

    export class Menu {
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
            this.container.addEventListener("click", this.handleBackdropClick.bind(this));
            this.menuParts.addButton.addEventListener("click", this.handleAddButtonClick.bind(this));
            document.body.addEventListener("copy", this.putCountdownTimesOnClipboard.bind(this));
            this.container.addEventListener("close", this.handleDialogClose.bind(this));

            this.toolbarParts.info.addEventListener("click", this.toggleMenuVisibility.bind(this));
            this.toolbarParts.add.addEventListener("click", this.toggleMenuVisibility.bind(this));

            countdownManager.registerChangeHandler(this.renderCountdownManagementList.bind(this));
        }

        //#region Dialog Infra   
        private handleBackdropClick(event: MouseEvent): void {
            // We only want clicks directly on the container element
            if (event.target !== this.container) {
                return;
            }

            this.dismissMenu();
        }

        private toggleMenuVisibility(): void {
            if (this.container.open) {
                
                this.dismissMenu();
                return;
            }

            this.menuOpening();
            this.container.showModal();

            // Since this area *can* scroll, restore the scroll to the top when
            // it's dismissed.
            this.menuParts.contentContainer.scrollTop = 0;
        }

        private menuOpening(): void {
            this.renderCountdownManagementList(this.countdownManager.getCountdownsSnapshot());
                
            // Update the default date in the date field to be 30 days in the
            // future
            this.menuParts.targetDate.value = thirtyDaysFromNow();
        }

        private dismissMenu(): void {
            this.container.close();
        }

        private handleDialogClose(): void {
            this.menuParts.titleTextbox.value = "";
        }
        //#endregion Dialog Infra

        //#region Shortcut Infra
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
        //#endregion Shortcut Infra

        //#region Countdown Management
        private handleAddButtonClick(): void {
            // Note that the value from the date picker is actually a *string*
            // so does need to be parsed.
            const targetDate = new Date((<HTMLInputElement>this.menuParts.targetDate).value);
            const title = (<HTMLInputElement>this.menuParts.titleTextbox).value;

            this.countdownManager.addCountdown(targetDate, title);

            this.dismissMenu();
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
        //#endregion Countdown Management

        //#region Shortcut Handling
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

        private playCelebrationForFirstCountdown() {
            const firstCountdownControl = this.countdownControls[0];
            if (!firstCountdownControl) {
                return;
            }

            firstCountdownControl.playCelebrationAnimation();
        }
        //#endregion Shortcut Handling
    }
}