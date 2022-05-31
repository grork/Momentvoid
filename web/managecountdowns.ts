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

    export class ManageCountdowns {
        private parts: {
            countdownList: HTMLDivElement,
            targetDate: HTMLInputElement,
            titleTextbox: HTMLInputElement,
            addButton: HTMLButtonElement
        };
        private dialog: Dialog;

        constructor(container: HTMLDialogElement,
            private countdownManager: CountdownManager) {
            this.parts = locatePartsFromDOM(<HTMLElement>container.firstElementChild);

            this.dialog = new Dialog(container);
            this.dialog.registerOpeningCallback(this.dialogOpening.bind(this));
            this.dialog.registerClosedCallback(this.dialogClosed.bind(this));
            countdownManager.registerChangeHandler(this.renderCountdownManagementList.bind(this));

            this.parts.addButton.addEventListener("click", this.handleAddButtonClick.bind(this));
        }

        private renderCountdownManagementList(currentCountdowns: Countdown[]): void {
            this.parts.countdownList.innerHTML = "";

            if (currentCountdowns.length === 1) {
                return;
            }

            const template = <HTMLTemplateElement>document.querySelector("[data-template='countdown-list-template'");

            currentCountdowns.forEach(countdown => {
                const parts: {
                    label: HTMLElement;
                    remove: HTMLButtonElement;
                } = cloneIntoWithParts(template, this.parts.countdownList);

                const title = countdown.title || "";
                parts.label.textContent = `${title} (${countdown.toLocaleDateString()})`;
                parts.remove.addEventListener("click", () => this.countdownManager.removeCountdown(countdown));
            });
        }

        private handleAddButtonClick(): void {
            // Note that the value from the date picker is actually a *string*
            // so does need to be parsed.
            const targetDate = new Date((<HTMLInputElement>this.parts.targetDate).value);
            const title = (<HTMLInputElement>this.parts.titleTextbox).value;

            this.countdownManager.addCountdown(targetDate, title);

            this.close();
        }

        private dialogOpening(): void {
            this.renderCountdownManagementList(this.countdownManager.getCountdownsSnapshot());
            this.parts.targetDate.value = thirtyDaysFromNow();
        }

        private dialogClosed(): void {
            this.parts.titleTextbox.value = "";
        }

        public show(): void {
            this.dialog.show();
        }

        public close(): void {
            this.dialog.close();
        }

        public toggleVisibility(): void {
            this.dialog.toggleVisibility();
        }
    }
}