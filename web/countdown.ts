namespace Codevoid.Momentvoid {
    export function saveCountdownsToStorage(countdowns): void {
        const targetTimes = [];

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

    export function loadCountdownsFromStorage() {
        const persistedCountdowns = JSON.parse(window.localStorage.getItem("countdowns"));

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

        constructor(private targetDate: Date, public readonly title?: string) {
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