declare interface Document {
    webkitExitFullscreen(): Promise<void>;
    readonly webkitFullscreenElement: Element | null;
}

declare interface HTMLElement {
    webkitRequestFullscreen(options?: FullscreenOptions): void;
}

declare interface StorageManager {
    persist(): Promise<boolean>;
}
