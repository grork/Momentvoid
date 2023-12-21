import JSConfetti from "js-confetti";
import { Clock, TickIntervalMs, ITickData } from "./clock.js";
import { Countdown, CountdownManager } from "./countdown.js";
import { cloneIntoWithPartsFromName, collapseIfLessThan1, generateMessage, removeFromArray } from "./utilities.js";

const HIDE_SEGMENT_CLASS = "countdown-element-hide";

export const enum Segments {
    WEEKS = "WEEKS",
    DAYS = "DAYS",
    HOURS = "HOURS",
    MINUTES = "MINUTES",
    SECONDS = "SECONDS"
}

export const AllSegments = [
    Segments.WEEKS,
    Segments.DAYS,
    Segments.HOURS,
    Segments.MINUTES,
    Segments.SECONDS
];

export class CountdownControl {
    private tickToken: number = -1;
    private _currentMessage: string = "";
    private parts: {
        weeks: HTMLElement;
        days: HTMLElement;
        hours: HTMLElement;
        minutes: HTMLElement;
        seconds: HTMLElement;
        container: HTMLElement;
        title: HTMLElement;
        targetReached: HTMLElement;
        play: HTMLButtonElement;
        remove: HTMLButtonElement;
        targetDate: HTMLDivElement;
    };

    customConfettiEmoji: string[] = [];

    public get currentMessage(): string {
        return this._currentMessage;
    }

    constructor(
        container: HTMLElement,
        private visibleSegments: Segments[],
        private clock: Clock,
        public readonly countdown: Countdown,
        private countdownManager: CountdownManager,
        private getConfetti: () => JSConfetti) {

        this.parts = cloneIntoWithPartsFromName("countdown-template", container);

        this.parts.title.textContent = this.countdown.title;
        this.parts.targetDate.textContent = this.countdown.toLocaleDateString();

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

        this.parts.title.addEventListener("blur", () => {
            // Only scroll to beginning if the focus is still inside the
            // document it self
            if (!document.hasFocus()) {
                return;
            }

            this.parts.title.parentElement!.scrollLeft = 0;
        });

        this.parts.remove.addEventListener("click", () => this.countdownManager.removeCountdown(this.countdown));
        this.parts.play.addEventListener("click", () => this.playCelebrationAnimation());
    }

    private tick(tickData: ITickData): void {
        const now = tickData.getTime();
        const remaining = Math.max(this.countdown.getTime() - now, 0);

        // Time calculations for days, hours, minutes and seconds
        const weeks = Math.floor(remaining / TickIntervalMs.Week);
        const days = Math.floor((remaining % TickIntervalMs.Week) / TickIntervalMs.Day);
        const hours = Math.floor((remaining % TickIntervalMs.Day) / TickIntervalMs.Hour);
        const minutes = Math.floor((remaining % TickIntervalMs.Hour) / TickIntervalMs.Minute);

        // This rounds up, not down, to ensure that it ticks to the intuative
        // time on the tick. Specifically, when it ticks to 10s, you want it to
        // display "10" not, 9 (for 9.9) as floor would show you.
        const seconds = Math.ceil((remaining % TickIntervalMs.Minute) / TickIntervalMs.Second);

        // Check if we've reached the target time, and stop ourselves. Note,
        // this is intentionally not using `Countdown.isInPast` because that
        // (intentionally) checks against the real clock. But we might be
        // in fast mode -- where the real time is still Forever In The Future™.
        // So if we check our remaing time we'll show the celebration, and stop
        // listening to the clock. This *does not* remove the countdown from our
        // saved storage 'cause we didn't *actually* reach it yet.
        if (remaining === 0) {
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

    updateSegmentDOMState(): void {
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
}