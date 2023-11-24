import { Dialog } from "./dialog.js";
import { locatePartsFromDOM } from "./utilities.js";

export class Menu {
    private menuParts: {
        contentContainer: HTMLElement;
        closeButton: HTMLButtonElement;
    };

    private dialog: Dialog;

    constructor(container: HTMLDialogElement) {
        this.menuParts = locatePartsFromDOM(container);
        this.dialog = new Dialog(container, this.menuParts.closeButton);
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