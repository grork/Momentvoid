namespace Codevoid.Momentvoid {
    interface IPersistedCountdown {
        title: NullableString;
        targetDate: string;
    }

    type CountdownChangedCallback = (countdown: Countdown) => void;
    type CountdownsChangedCallback = (countdowns: Countdown[]) => void;

    export class Countdown {
        private targetDateAsMs: number;
        private changedHandlers: Map<number, CountdownChangedCallback> = new Map();
        private nextChangeHandlerId = 0;
        private _title: string;

        constructor(private targetDate: Date, title: NullableString) {
            this.targetDateAsMs = targetDate.getTime();
            this._title = title || "";
        }

        get title(): string {
            return this._title!;
        }

        set title(value: string) {
            this._title = value;
            this.callChangeCallbacks();
        }

        getTime() {
            return this.targetDateAsMs;
        }

        toISOString() {
            if (!this.targetDate) {
                return "";
            }

            return this.targetDate.toISOString();
        }

        toLocaleDateString() {
            if (!this.targetDate) {
                return "";
            }

            return this.targetDate.toLocaleDateString();
        }

        registerChangeHandler(callback: CountdownChangedCallback): number {
            var token = (this.nextChangeHandlerId += 1);

            this.changedHandlers.set(token, callback);

            return token;
        }

        unregisterChangeHandler(token: number): void {
            this.changedHandlers.delete(token);
        }

        private callChangeCallbacks() {
            for (const [_, handler] of this.changedHandlers) {
                try {
                    handler(this);
                } catch (e: any) {
                    console.log(`A change handler failed: ${e.toString()}`);
                }
            }
        }

        dispose(): void {
            this.changedHandlers.clear();
        }
    }

    export class CountdownManager {
        private countdowns: Countdown[] = [];
        private countdownsChangedHandlers: Map<number, CountdownsChangedCallback> = new Map();
        private boundCountdownChangeHandler: CountdownChangedCallback = this.handleCountdownChanged.bind(this);
        private nextChangeHandlerId = 0;

        constructor(defaultTargetDate: Date) {
            this.loadCountdownsFromStorage();

            if (!this.countdowns.length) {
                // If we didn't find any persisted countdowns, create a default one
                this.countdowns = [new Countdown(defaultTargetDate, null)];
            }

            this.countdowns.forEach((c) => c.registerChangeHandler(this.boundCountdownChangeHandler));
        }

        private saveCountdownsToStorage(): void {
            const targetTimes: IPersistedCountdown[] = [];

            this.countdowns.forEach((countdown) => {
                const timeAsString = countdown.toISOString();
    
                if (!timeAsString) {
                    // Don't capture invalid countdowns
                    return;
                }
                
                targetTimes.push({
                    targetDate: timeAsString,
                    title: countdown.title
                });
            });
    
            window.localStorage.setItem("countdowns", JSON.stringify(targetTimes));
        }

        private loadCountdownsFromStorage(): void {
            const storageValue = window.localStorage.getItem("countdowns");
            if (!storageValue) {
                return;
            }

            const persistedCountdowns: IPersistedCountdown[] = JSON.parse(storageValue);
            if (!persistedCountdowns) {
                return;
            }

            this.countdowns = persistedCountdowns.map((persistedCountdown) => {
                const time = new Date(persistedCountdown.targetDate);
                const countdown = new Countdown(time, persistedCountdown.title);
                return countdown;
            });
        }

        private handleCountdownChanged(countdown: Countdown): void {
            this.saveCountdownsToStorage();
        }

        addCountdown(targetDate: Date, title: NullableString): Countdown {
            const countdown = new Countdown(targetDate, title);
            countdown.registerChangeHandler(this.boundCountdownChangeHandler);

            this.countdowns.push(countdown);
            
            this.saveCountdownsToStorage();

            this.callChangeCallbacks();
            return countdown;
        }

        removeCountdown(countdown: Countdown): void {
            const countdownsToRemove = this.countdowns.filter((c) => c === countdown);

            countdownsToRemove.forEach((c) => {
                c.dispose();
                removeFromArray(this.countdowns, c);
            });

            this.saveCountdownsToStorage();

            this.callChangeCallbacks();
        }

        getCountdownsSnapshot(): Countdown[] {
            return this.countdowns.slice();
        }

        registerChangeHandler(callback: CountdownsChangedCallback): number {
            var token = (this.nextChangeHandlerId += 1);

            this.countdownsChangedHandlers.set(token, callback);

            return token;
        }

        unregisterChangeHandler(token: number): void {
            this.countdownsChangedHandlers.delete(token);
        }

        private callChangeCallbacks() {
            const snapshot = this.getCountdownsSnapshot();
            for (const [_, handler] of this.countdownsChangedHandlers) {
                try {
                    handler(snapshot);
                } catch (e: any) {
                    console.log(`A change handler failed: ${e.toString()}`);
                }
            }
        }
    }
}