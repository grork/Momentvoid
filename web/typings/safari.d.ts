// Declarations of Safari specific fullscreen API

declare interface Document {
    webkitExitFullscreen(): Promise<void>;
    readonly webkitFullscreenElement: Element | null;
}

declare interface HTMLElement {
    // Note this deviates from the standard that returns a promise
    webkitRequestFullscreen(options?: FullscreenOptions): void;
}