// Declarations of Safari specific fullscreen API

interface Document {
    webkitExitFullscreen(): Promise<void>;
    readonly webkitFullscreenElement: Element | null;
}

interface HTMLElement {
    // Note this deviates from the standard that returns a promise
    webkitRequestFullscreen(options?: FullscreenOptions): void;
}