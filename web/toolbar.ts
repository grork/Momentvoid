namespace Codevoid.Momentvoid {
    export class Toolbar {
        private parts: {
            add: HTMLButtonElement,
            info: HTMLButtonElement
        };

        constructor(private container: HTMLDivElement,
            showInfo: NakedFunction,
            showAdd: NakedFunction) {
            this.parts = locatePartsFromDOM(container);

            this.parts.info.addEventListener("click", showInfo);
            this.parts.add.addEventListener("click", showAdd);
        }

        public toggleForceShow(): void {
            if (this.container.contains(document.activeElement)) {
                return;
            }
            
            this.container.classList.toggle("toolbar-force-visible");
        }
    }
}