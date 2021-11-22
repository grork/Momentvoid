namespace Codevoid.Momentvoid {
    interface IPersistedCountdown {
        title: NullableString;
        targetDate: string;
    }

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

        constructor(private targetDate: Date, public readonly title: string | null) {
            this.targetDateAsMs = targetDate.getTime();
            this.title = title;
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
    }

    export class CountdownManager {
        private _countdowns: Countdown[] = [];

        constructor(defaultTargetDate: Date) {
            this._countdowns = loadCountdownsFromStorage();

            if (!this._countdowns.length) {
                // If we didn't find any persisted countdowns, create a default one
                this._countdowns = [new Countdown(defaultTargetDate, null)];
            }
        }

        addCountdown(targetDate: Date, title: NullableString): Countdown {
            const countdown = new Countdown(targetDate, title);
            this._countdowns.push(countdown);
            
            saveCountdownsToStorage(this._countdowns);
            return countdown;
        }

        removeCountdown(countdown: Countdown): void {
            const countdownsToRemove = this._countdowns.filter((c) => c === countdown);

            countdownsToRemove.forEach((c) => removeFromArray(this._countdowns, c));

            saveCountdownsToStorage(this._countdowns);
        }

        getCountdownsSnapshot(): Countdown[] {
            return this._countdowns.slice();
        }
    }
}