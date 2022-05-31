namespace Codevoid.Momentvoid {
    export class Dialog {
        private closedCallback?: NakedFunction;
        private openingCallback?: NakedFunction;
        private openedCallback?: NakedFunction;

        private mouseWasDownOnDialogElement = false;

        constructor(private container: HTMLDialogElement) {
            this.container.addEventListener("mousedown", this.handleBackdropMouseDown.bind(this));
            this.container.addEventListener("mouseup", this.handleBackdropMouseUp.bind(this));
            this.container.addEventListener("close", this.handleDialogClose.bind(this));
            this.container.addEventListener("pointerup", (e) => e.stopPropagation());

            const closeButton = document.createElement("button");
            closeButton.addEventListener("click", this.close.bind(this));
            closeButton.classList.add("dialog-close");
            closeButton.classList.add("material-symbols-outlined");
            closeButton.textContent = "close";
            this.container.firstElementChild?.insertBefore(
                closeButton,
                this.container.firstElementChild?.firstElementChild);
        }

        private handleBackdropMouseDown(event: MouseEvent): void {
            // We only want clicks directly on the container element
            if ((event.target !== this.container)) {
                return;
            }

            // So we know when we see 'mouseup' that the mouse sent down on the
            // actual dialog element
            this.mouseWasDownOnDialogElement = true;
        }

        private handleBackdropMouseUp(event: MouseEvent): void {
            // We only want clicks directly on the container element
            if ((event.target !== this.container)) {
                return;
            }

            // If the mouse didn't go down on the dialog element, we don't care
            // about this mouse up
            if (!this.mouseWasDownOnDialogElement) {
                return;
            }

            this.mouseWasDownOnDialogElement = false;
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