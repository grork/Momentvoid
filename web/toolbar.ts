namespace Codevoid.Momentvoid {
    export class Toolbar {
        private parts: {
            add: HTMLButtonElement;
            info: HTMLButtonElement;
        };

        constructor(private container: HTMLDivElement,
            showInfo: NakedFunction,
            showAdd: NakedFunction) {
            this.parts = locatePartsFromDOM(container);

            this.parts.info.addEventListener("click", (e) => {
                e.stopPropagation();
                showInfo();
            });

            this.parts.add.addEventListener("click", (e) => {
                e.stopPropagation();
                showAdd();
            });
        }
    }
}