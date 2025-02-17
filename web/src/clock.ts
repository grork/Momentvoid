import { EventManager } from "./utilities.js";

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = MS_IN_SECOND * 60;
const MS_IN_HOUR = MS_IN_MINUTE * 60;
const MS_IN_DAY = MS_IN_HOUR * 24;
const MS_IN_WEEK = MS_IN_DAY * 7;

export const enum TickIntervalMs {
    Second = MS_IN_SECOND,
    Minute = MS_IN_MINUTE,
    Hour = MS_IN_HOUR,
    Day = MS_IN_DAY,
    Week = MS_IN_WEEK
}

export interface ITickData {
    getTime(): number;
}

export class Clock {
    private timeOffset: number = 0;
    private accelerationFactor: number = 0;
    private eventSource = new EventManager<ITickData>();
    private tickInterval: number = TickIntervalMs.Second;
    private intervalToken: number = -1;
    private lastTick: ITickData;

    constructor() {
        this.lastTick = this.generateCurrentTickData();
    }

    private tick() {
        const tickData = this.lastTick = this.generateCurrentTickData();

        this.eventSource.raise(tickData);
    }

    // Generates the tickdata to pass to handlers so they are all working
    // of a shared clock, which may or may not be time shifted.
    private generateCurrentTickData(): ITickData {
        const newTime = this.getTime();
        const tickData = {
            getTime: () => newTime
        };

        return tickData;
    }

    getCurrentTickData(): ITickData {
        return this.lastTick;
    }

    // Register a handler for when a tick, ticks.
    registerTick(handler: (_: ITickData) => void): number {
        return this.eventSource.registerHandler(handler);
    }

    unregisterTick(token: number): void {
        this.eventSource.unregisterHandler(token);
    }

    private getTime(): number {
        let time = Date.now();
        if (this.timeOffset || this.accelerationFactor) {
            time += ((this.timeOffset += this.accelerationFactor) * 1000);
        }

        return time;
    }

    start(): void {
        this.stop();

        // Calculate the applied interval. This needs to account for the
        // acceleration factor to make the time not just step more, but *change*
        // more quickly.
        let appliedTickInterval = this.tickInterval;
        if (this.accelerationFactor) {
            // Cap the interval at 16ms, so we don't go faster than 60fps.
            appliedTickInterval = Math.max(appliedTickInterval / this.accelerationFactor, 16);
        }

        this.tick();

        // Calculate approximate offset to the nearest whole second with.
        // Note, this means if we're 345ms past the whole second, we need to
        // subtract that value from 1000 to reach the next whole second tick
        const currentSecondOffset = appliedTickInterval - (Date.now() % appliedTickInterval);

        // Schedule a tick to that offset
        this.intervalToken = setTimeout(() => {
            // Actually start our 'on the second' tick
            this.intervalToken = window.setInterval(this.tick.bind(this), appliedTickInterval);
            this.tick();
        }, currentSecondOffset);
    }

    stop(): void {
        if (this.intervalToken) {
            window.clearInterval(this.intervalToken);
            this.intervalToken = -1;
        }
    }

    setClockSpeed(accelerationFactor: number = 1): void {
        this.stop();

        this.accelerationFactor = accelerationFactor;

        this.start();
    }

    resumeNormalSpeed(): void {
        this.stop();
        this.accelerationFactor = 0;

        this.start();
    }

    resetToCurrentTime(): void {
        this.stop();
        this.timeOffset = 0;
        this.resumeNormalSpeed();
    }

    goFaster(): void {
        let newAccelerationFactor = (this.accelerationFactor *= 3);
        if (newAccelerationFactor < 2) {
            newAccelerationFactor = 2;
        }

        newAccelerationFactor = Math.min(newAccelerationFactor, 10000);
        this.setClockSpeed(newAccelerationFactor);
    }

    togglePlayPause(): void {
        if (this.intervalToken > -1) {
            this.stop();
            return;
        }

        this.start();
    }

    updateTickInterval(newInterval: number): void {
        this.tickInterval = newInterval;
        if (this.intervalToken > -1) {
            this.start();
        }
    }
}