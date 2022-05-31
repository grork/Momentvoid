namespace Codevoid.Momentvoid {
    export class Menu {
        private menuParts: {
            contentContainer: HTMLElement;
        };

        private dialog: Dialog;

        constructor(container: HTMLDialogElement) {
            this.menuParts = locatePartsFromDOM(container);
            this.dialog = new Dialog(container);
            this.dialog.registerOpenedCallback(() => {
                // Since this area *can* scroll, restore the scroll to the top when
                // it's dismissed.
                this.menuParts.contentContainer.scrollTop = 0;
            });
        }

        public toggleMenuVisibility(): void {
            this.dialog.toggleVisibility();
        }
    }
}