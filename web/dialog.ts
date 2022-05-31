namespace Codevoid.Momentvoid {
    export class Dialog {
        private closedCallback?: NakedFunction;
        private openingCallback?: NakedFunction;
        private openedCallback?: NakedFunction;

        constructor(private container: HTMLDialogElement) {
            this.container.addEventListener("click", this.handleBackdropClick.bind(this));
            this.container.addEventListener("close", this.handleDialogClose.bind(this));
        }

        private handleBackdropClick(event: MouseEvent): void {
            // We only want clicks directly on the container element
            if (event.target !== this.container) {
                return;
            }

            this.close();
        }

        private handleDialogClose(): void {
            this.closedCallback?.();
        }

        /**
         * Registers a callback for when the dialog is closed to perform
         * any cleanup.
         * @param callback Callback that will replace any existing callbacks
         */
        public registerClosedCallback(callback: NakedFunction): void {
            this.closedCallback = callback;
        }

        /**
         * Registers a callback for when the dialog is just about to be opened
         * (but has not yet been shown) so any inititalization can be performed
         * @param callback Callback that will replace any existing callbacks
         */
        public registerOpeningCallback(callback: NakedFunction): void {
            this.openingCallback = callback;
        }

        /**
         * Registers a callback for when the dialog is has been displayed, so
         * any rendering-dependent initialization can be performed.
         * @param callback Callback that will replace any existing callbacks
         */
        public registerOpenedCallback(callback: NakedFunction): void {
            this.openedCallback = callback;
        }

        /**
         * Closes the dialog if it's open
         */
        public close(): void {
            this.container.close();
        }

        /**
         * Shows the dialog if it's closed, while also calling the opening &
         * opened callbacks
         */
        public show(): void {
            this.openingCallback?.();

            this.container.showModal();

            this.openedCallback?.();
        }

        /**
         * Opens the dialog if it's closed, and closes it if it's open.
         */
        public toggleVisibility(): void {
            if (this.container.open) {
                this.close();
                return;
            }

            this.show();
        }
    }
}