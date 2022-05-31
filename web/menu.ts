namespace Codevoid.Momentvoid {
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

        private dialog: Dialog;

        constructor(container: HTMLDialogElement,
            private countdownManager: CountdownManager) {

            this.menuParts = locatePartsFromDOM(container);
            this.dialog = new Dialog(container);
            this.dialog.registerClosedCallback(this.handleDialogClose.bind(this));
            this.dialog.registerOpeningCallback(this.menuOpening.bind(this));
            this.dialog.registerOpenedCallback(() => {
                // Since this area *can* scroll, restore the scroll to the top when
                // it's dismissed.
                this.menuParts.contentContainer.scrollTop = 0;
            });

            this.menuParts.addButton.addEventListener("click", this.handleAddButtonClick.bind(this));
            countdownManager.registerChangeHandler(this.renderCountdownManagementList.bind(this));
        }

        //#region Dialog Infra   
        public toggleMenuVisibility(): void {
            this.dialog.toggleVisibility();
        }

        private menuOpening(): void {
            this.renderCountdownManagementList(this.countdownManager.getCountdownsSnapshot());
                
            // Update the default date in the date field to be 30 days in the
            // future
            this.menuParts.targetDate.value = thirtyDaysFromNow();
        }

        private dismissMenu(): void {
            this.dialog.close();
        }

        private handleDialogClose(): void {
            this.menuParts.titleTextbox.value = "";
        }
        //#endregion Dialog Infra

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
    }
}