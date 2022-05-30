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

        private toolbarParts: {
            add: HTMLButtonElement,
            info: HTMLButtonElement
        };

        constructor(
            private countdownManager: CountdownManager,
            private container: HTMLDialogElement,
            private toolbar: HTMLElement) {

            this.menuParts = locatePartsFromDOM(this.container);
            this.toolbarParts = locatePartsFromDOM(this.toolbar);

            this.container.addEventListener("click", this.handleBackdropClick.bind(this));
            this.menuParts.addButton.addEventListener("click", this.handleAddButtonClick.bind(this));
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

        public toggleMenuVisibility(): void {
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