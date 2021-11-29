namespace Codevoid.Momentvoid {
    const MS_IN_SECOND = 1000;
    const MS_IN_MINUTE = MS_IN_SECOND * 60;
    const MS_IN_HOUR = MS_IN_MINUTE * 60;
    const MS_IN_DAY = MS_IN_HOUR * 24;
    const MS_IN_WEEK = MS_IN_DAY * 7;

    const HIDE_SEGMENT_CLASS = "countdown-element-hide";

    export const enum Segments {
        WEEKS = "WEEKS",
        DAYS = "DAYS",
        HOURS = "HOURS",
        MINUTES = "MINUTES",
        SECONDS = "SECONDS"
    }

    const AllSegments = [
        Segments.WEEKS,
        Segments.DAYS,
        Segments.HOURS,
        Segments.MINUTES,
        Segments.SECONDS
    ];

    export class CountdownControl {
        private visibleSegments: Segments[] = AllSegments.slice();
        private tickToken: number = -1;
        private _currentMessage: string = "";
        private parts: IImmutableHtmlParts;
        customConfettiEmoji: string[] = [];

        public get currentMessage(): string {
            return this._currentMessage;
        }

        constructor(
            container: HTMLElement,
            private clock: Clock,
            public readonly countdown: Countdown,
            private countdownManager: CountdownManager,
            private getConfetti: () => Promise<JSConfetti>) {
            this.loadSegmentConfigurationFromStorage();

            const template = <HTMLTemplateElement>document.querySelector("[data-template='countdown-template']");
            this.parts = cloneIntoWithParts(template, container, [
                "weeks",
                "days",
                "hours",
                "minutes",
                "seconds",
                "container",
                "title",
                "targetReached",
                "play",
                "remove"
            ]);

            this.parts.title.textContent = this.countdown.title;

            if (!countdown) {
                this.displayInvalidDateError();
                return;
            }

            this.updateSegmentDOMState();

            this.parts.container.addEventListener("input", (e: Event) => {
                const realEvent = <InputEvent>e;
                const newTitle = (<Element>realEvent.target).textContent;

                this.countdown.title = newTitle!;
            });

            this.parts.remove.addEventListener("click", () => {
                this.countdownManager.removeCountdown(this.countdown);
            });

            this.parts.play.addEventListener("click", () => {
                this.playCelebrationAnimation();
            });
        }

        private tick(tickData: ITickData): void {
            const now = tickData.getTime();
            const remaining = this.countdown.getTime() - now;

            // Time calculations for days, hours, minutes and seconds
            var weeks = Math.floor(remaining / MS_IN_WEEK);
            var days = Math.floor((remaining % MS_IN_WEEK) / MS_IN_DAY);
            var hours = Math.floor((remaining % MS_IN_DAY) / MS_IN_HOUR);
            var minutes = Math.floor((remaining % MS_IN_HOUR) / MS_IN_MINUTE);
            var seconds = Math.floor((remaining % MS_IN_MINUTE) / MS_IN_SECOND);

            // Check if we've reached the target time, and stop ourselves:
            if (this.countdown.inThePast) {
                this.stop();
                this.displayTargetTimeReachedMessage();
                return;
            }

            collapseIfLessThan1(weeks, this.parts.weeks);
            collapseIfLessThan1(days, this.parts.days);
            collapseIfLessThan1(hours, this.parts.hours);
            collapseIfLessThan1(minutes, this.parts.minutes);
            
            this.parts.seconds.textContent = <string><unknown>seconds;

            this._currentMessage = generateMessage(weeks, days, hours, minutes, seconds, this.visibleSegments);
        }

        start(): void {
            // Schedule a tick to that offset
            this.tickToken = this.clock.registerTick(this.tick.bind(this));
            this.tick(this.clock.getCurrentTickData());
        }

        stop(): void {
            if (!this.tickToken) {
                return;
            }

            this.clock.unregisterTick(this.tickToken);
            this.tickToken = -1;
        }

        private displayTargetTimeReachedMessage(): void {
            this.visibleSegments = [];
            this.updateSegmentDOMState();

            this.playCelebrationAnimation();

            this.parts.targetReached.classList.remove(HIDE_SEGMENT_CLASS);
            this.parts.container.classList.toggle("countdown-reached", true);
            (<HTMLDivElement>this.parts.title).removeAttribute("contenteditable");

            this._currentMessage = "Target date reached!"
            
        }

        private displayInvalidDateError(): void {
            this.parts.container.textContent = "Invalid date! You need to use an ISO formatted date";
        }

        hideNextSegment(): void {
            this.cycleSegmentVisibility();
            this.updateSegmentDOMState();
            this.saveSegmentConfigurationToStorage();
        }

        private updateSegmentDOMState(): void {
            const secondsVisible = !this.visibleSegments.includes(Segments.SECONDS);
            const minuteVisible = !this.visibleSegments.includes(Segments.MINUTES);
            const hoursVisible = !this.visibleSegments.includes(Segments.HOURS)
            const daysVisible = !this.visibleSegments.includes(Segments.DAYS);
            const weeksVisible = !this.visibleSegments.includes(Segments.WEEKS);

            this.parts.seconds.parentElement?.classList.toggle(HIDE_SEGMENT_CLASS, secondsVisible);
            this.parts.minutes.parentElement?.classList.toggle(HIDE_SEGMENT_CLASS, minuteVisible);
            this.parts.hours.parentElement?.classList.toggle(HIDE_SEGMENT_CLASS, hoursVisible);
            this.parts.days.parentElement?.classList.toggle(HIDE_SEGMENT_CLASS, daysVisible);
            this.parts.weeks.parentElement?.classList.toggle(HIDE_SEGMENT_CLASS, weeksVisible);
        }

        cycleSegmentVisibility(): void {
            const secondsHidden = !this.visibleSegments.includes(Segments.SECONDS);
            const minutesHidden = !this.visibleSegments.includes(Segments.MINUTES);
            const hoursHidden = !this.visibleSegments.includes(Segments.HOURS)
            const daysHidden = !this.visibleSegments.includes(Segments.DAYS);

            if (!secondsHidden) {
                removeFromArray(this.visibleSegments, Segments.SECONDS);
                return;
            }

            if (!minutesHidden) {
                removeFromArray(this.visibleSegments, Segments.MINUTES);
                return;
            }

            if (!hoursHidden) {
                removeFromArray(this.visibleSegments, Segments.HOURS);
                return;
            }

            if (!daysHidden) {
                removeFromArray(this.visibleSegments, Segments.DAYS);
                return;
            }

            if (this.countdown.inThePast) {
                this.visibleSegments = [];
                return;
            }

            this.visibleSegments = AllSegments.slice();
            this.saveSegmentConfigurationToStorage();
        }

        async playCelebrationAnimation(): Promise<void> {
            const confetti = await this.getConfetti();
            let confettiParameters: IAddConfettiConfig = { confettiNumber: 60 };

            const regexpEmojiPresentation = /\p{Emoji_Presentation}/gu;
            let matchingEmoji = <string[]>this.countdown.title.match(regexpEmojiPresentation);

            // If there were no matching emojis, check for a custom set
            if (!matchingEmoji?.length && this.customConfettiEmoji) {
                matchingEmoji = this.customConfettiEmoji;
            }

            if (matchingEmoji?.length) {
                confettiParameters.emojis = matchingEmoji;
                confettiParameters.emojiSize = 100;
            } else {
                confettiParameters.confettiRadius = 12;
            }

            confetti.addConfetti(confettiParameters);

            // Kick off some animations, separated by a delay so as to keep
            // animations smooth. Ish.
            for (let i = 1; i <= 5; i++) {
                setTimeout(() => confetti.addConfetti(confettiParameters), 650 * i);
            }
        }

        private loadSegmentConfigurationFromStorage(): void {
            const storageValue = window.localStorage.getItem("segmentConfig");
            if (storageValue === null) {
                // Nothing persisted, give up
                return;
            }

            const storageConfig = JSON.parse(storageValue);
            if (!Array.isArray(storageConfig) || storageConfig.length < 1) {
                // Not a valid object. we'll stomp it later.
                return;
            }

            this.visibleSegments = storageConfig;
        }

        private saveSegmentConfigurationToStorage(): void {
            window.localStorage.setItem("segmentConfig", JSON.stringify(this.visibleSegments));
        }
    }
}