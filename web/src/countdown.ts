import { EventManager, NullableString, removeFromArray } from "./utilities.js";
import { DateTime } from "luxon";

interface IPersistedCountdown {
    title: NullableString;
    targetDate: string;
}

enum SortMode {
    NoSorting = "NoSorting",
    ClosestFirst = "ClosestFirst",
    FurthestFirst = "FurthestFirst"
}

type CountdownChangedHandler = (countdown: Countdown) => void;
type CountdownsChangedHandler = (countdowns: Countdown[]) => void;

function sortClosestFirst(first: Countdown, second: Countdown): number {
    const firstAsMs = first.getTime();
    const secondAsMs = second.getTime();

    return firstAsMs - secondAsMs;
}

function sortFurthestFirst(first: Countdown, second: Countdown): number {
    const firstAsMs = first.getTime();
    const secondAsMs = second.getTime();

    return secondAsMs - firstAsMs;
}

export class Countdown {
    private targetDateAsMs: number;
    private targetDateTime: DateTime;
    private eventSource = new EventManager<Countdown>();
    private _title: string;

    constructor(public readonly targetDate: Date, title: NullableString) {
        this.targetDateAsMs = targetDate.getTime();
        this.targetDateTime = DateTime.fromJSDate(targetDate);
        this._title = title || targetDate.toLocaleDateString();
    }

    get title(): string {
        return this._title!;
    }

    set title(value: string) {
        this._title = value;
        this.eventSource.raise(this);
    }

    get inThePast(): boolean {
        return (Date.now() > this.targetDateAsMs);
    }

    public getTime(): number {
        return this.targetDateAsMs;
    }

    getDateTime(): DateTime {
        return this.targetDateTime;
    }

    toISOString(): string {
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
    private sort: SortMode = SortMode.NoSorting;

    constructor(defaultTargetDate: [Date, NullableString][]) {
        this.loadSortFromStorage();
        this.loadCountdownsFromStorage();

        // Append any additional default dates that have been supplied.
        if (defaultTargetDate.length) {
            let added = false;
            defaultTargetDate.forEach((date) => {
                const [targetDate, title] = date;
                if (this.countdownExistsForTargetDate(targetDate)) {
                    return;
                }

                added = true;
                this.countdowns.push(new Countdown(targetDate, title));
            });

            if (added) {
                this.saveCountdownsToStorage();
            }
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

            if (countdown.inThePast) {
                // Don't capture times that are in the past
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

    private loadSortFromStorage(): void {
        const storageValue = window.localStorage.getItem("sort");
        if (!storageValue) {
            return;
        }

        this.sort = <SortMode>storageValue;
    }

    private saveSortToStorage(): void {
        window.localStorage.setItem("sort", this.sort);
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

    cycleSortOrder(): void {
        switch (this.sort) {
            case SortMode.ClosestFirst:
                this.sort = SortMode.FurthestFirst;
                break;

            case SortMode.FurthestFirst:
                this.sort = SortMode.NoSorting;
                break;

            case SortMode.NoSorting:
            default:
                this.sort = SortMode.ClosestFirst;
                break;
        }

        this.saveSortToStorage();

        this.callChangeHandlers();
    }

    getCountdownsSnapshot(): Countdown[] {
        let countdowns = this.countdowns.slice();

        switch (this.sort) {
            case SortMode.ClosestFirst:
                countdowns.sort(sortClosestFirst);
                break;

            case SortMode.FurthestFirst:
                countdowns.sort(sortFurthestFirst);
                break;


            case SortMode.NoSorting:
            default:
                break;
        }

        return countdowns;
    }

    countdownExistsForTargetDate(targetDate: Date): boolean {
        const has = this.countdowns.some((v) => {
            return v.targetDate.getTime() === targetDate.getTime();
        });

        return has;
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