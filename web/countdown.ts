namespace Codevoid.Momentvoid {
    interface IPersistedCountdown {
        title: NullableString;
        targetDate: string;
    }

    export function saveCountdownsToStorage(countdowns: Countdown[]): void {
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

    export function loadCountdownsFromStorage(): Countdown[] {
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
}