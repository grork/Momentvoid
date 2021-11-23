namespace Codevoid.Momentvoid {
    interface IPersistedCountdown {
        title: NullableString;
        targetDate: string;
    }

    type CountdownChangedHandler = (countdown: Countdown) => void;
    type CountdownsChangedHandler = (countdowns: Countdown[]) => void;

    export class Countdown {
        private targetDateAsMs: number;
        private eventSource = new EventManager<Countdown>();
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
            this.eventSource.raise(this);
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

        registerChangeHandler(handler: CountdownChangedHandler): number {
            return this.eventSource.registerHandler(handler);
        }

        unregisterChangeHandler(token: number): void {
            this.eventSource.unregisterHandler(token);
        }

        dispose(): void {
            this.eventSource.reset();
        }
    }

    export class CountdownManager {
        private countdowns: Countdown[] = [];
        private boundCountdownChangeHandler: CountdownChangedHandler = this.handleCountdownChanged.bind(this);
        private eventSource = new EventManager<Countdown[]>();

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

            this.callChangeHandlers();
            return countdown;
        }

        removeCountdown(countdown: Countdown): void {
            const countdownsToRemove = this.countdowns.filter((c) => c === countdown);

            countdownsToRemove.forEach((c) => {
                c.dispose();
                removeFromArray(this.countdowns, c);
            });

            this.saveCountdownsToStorage();

            this.callChangeHandlers();
        }

        getCountdownsSnapshot(): Countdown[] {
            return this.countdowns.slice();
        }

        registerChangeHandler(handler: CountdownsChangedHandler): number {
            return this.eventSource.registerHandler(handler);
        }

        unregisterChangeHandler(token: number): void {
            this.eventSource.unregisterHandler(token);
        }

        private callChangeHandlers() {
            const snapshot = this.getCountdownsSnapshot();
            this.eventSource.raise(snapshot);
        }
    }
}