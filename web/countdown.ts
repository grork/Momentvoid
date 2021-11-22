namespace Codevoid.Momentvoid {
    interface IPersistedCountdown {
        title: NullableString;
        targetDate: string;
    }

    type CountdownChangedCallback = (countdown: Countdown) => void;

    function saveCountdownsToStorage(countdowns: Countdown[]): void {
        const targetTimes: IPersistedCountdown[] = [];

        countdowns.forEach((countdown) => {
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

    function loadCountdownsFromStorage(): Countdown[] {
        const storageValue = window.localStorage.getItem("countdowns");
        if (!storageValue) {
            return [];
        }

        const persistedCountdowns: IPersistedCountdown[] = JSON.parse(storageValue);
        if (!persistedCountdowns) {
            return [];
        }

        return persistedCountdowns.map((persistedCountdown) => {
            const time = new Date(persistedCountdown.targetDate);
            const countdown = new Countdown(time, persistedCountdown.title);
            return countdown;
        });
    }

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
        private _countdowns: Countdown[] = [];
        private _boundChangeHandler: CountdownChangedCallback = this.handleCountdownChanged.bind(this);

        constructor(defaultTargetDate: Date) {
            this._countdowns = loadCountdownsFromStorage();

            if (!this._countdowns.length) {
                // If we didn't find any persisted countdowns, create a default one
                this._countdowns = [new Countdown(defaultTargetDate, null)];
            }

            this._countdowns.forEach((c) => c.registerChangeHandler(this._boundChangeHandler));
        }

        private handleCountdownChanged(countdown: Countdown): void {
            saveCountdownsToStorage(this._countdowns);
        }

        addCountdown(targetDate: Date, title: NullableString): Countdown {
            const countdown = new Countdown(targetDate, title);
            countdown.registerChangeHandler(this._boundChangeHandler);

            this._countdowns.push(countdown);
            
            saveCountdownsToStorage(this._countdowns);
            return countdown;
        }

        removeCountdown(countdown: Countdown): void {
            const countdownsToRemove = this._countdowns.filter((c) => c === countdown);

            countdownsToRemove.forEach((c) => {
                c.dispose();
                removeFromArray(this._countdowns, c);
            });

            saveCountdownsToStorage(this._countdowns);
        }

        getCountdownsSnapshot(): Countdown[] {
            return this._countdowns.slice();
        }
    }
}