namespace Codevoid.Momentvoid {
    const DEFAULT_TICK_INTERVAL = 1000;

    export interface ITickData {
        getTime(): number;
    }

    export class Clock {
        private timeOffset: number = 0;
        private accelerationFactor: number = 0;
        private eventSource = new EventManager<ITickData>();
        private tickInterval: number = DEFAULT_TICK_INTERVAL;
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

        start(tickInterval?: number): void {
            this.tickInterval = tickInterval || this.tickInterval;
            this.tick();
            
            // Calculate approximate offset to the nearest whole second with
            // a small fudge factor
            var currentSecondOffset = (Date.now() % 1000) - 5;
            
            // Schedule a tick to that offset
            this.intervalToken = setTimeout(() => {
                // Actually start our 'on the second' tick
                this.intervalToken = window.setInterval(this.tick.bind(this), this.tickInterval);
                this.tick();
            }, currentSecondOffset);
        }

        stop(): void {
            if (this.intervalToken) {
                window.clearInterval(this.intervalToken);
                this.intervalToken = -1;
            }
        }

        setClockSpeed(accelerationFactor: number = 1, interval: number = DEFAULT_TICK_INTERVAL): void {
            this.stop();

            this.accelerationFactor = accelerationFactor;

            this.start(interval);
        }

        resumeNormalSpeed(): void {
            this.stop();
            this.accelerationFactor = 0;
            this.tickInterval = DEFAULT_TICK_INTERVAL;

            this.start();
        }

        resetToCurrentTime(): void {
            this.stop();
            this.timeOffset = 0;
            this.resumeNormalSpeed();
        }

        goFaster(): void {
            let newAccelerationFactor = this.accelerationFactor * 10;
            if (newAccelerationFactor === 0) {
                newAccelerationFactor = 1;
            }

            newAccelerationFactor = Math.min(newAccelerationFactor, 10000);

            let newTickInterval = this.tickInterval / 10;
            newTickInterval = Math.max(newTickInterval, 16);

            this.setClockSpeed(newAccelerationFactor, newTickInterval);
        }

        togglePlayPause(): void {
            if (this.intervalToken > -1) {
                this.stop();
                return;
            }

            this.start();
        }
    }
}