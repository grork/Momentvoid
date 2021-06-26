(function () {
    const DEFAULT_TARGET = new Date("2021-11-30T23:59:59").getTime();
    
    const MS_IN_SECOND = 1000;
    const MS_IN_MINUTE = MS_IN_SECOND * 60;
    const MS_IN_HOUR = MS_IN_MINUTE * 60;
    const MS_IN_DAY = MS_IN_HOUR * 24;
    const MS_IN_WEEK = MS_IN_DAY * 7;

    function collapseIfLessThan1(value, element) {
        var parent = element.parentElement;

        if(value > 0) {
            element.textContent = value;
            parent.style.display = "";
            return;
        }

        element.textContent = "-";
        parent.style.display = "none"
    }
    
    class Countdown {
        constructor(containerElement) {
            this.containerElement = containerElement;
            this.targetDate = DEFAULT_TARGET;

            const params = new URLSearchParams(window.location.search);
            let targetParam = params.get("target");
            if(targetParam) {   
                const targetAsDate = new Date(targetParam);
                this.targetDate = targetAsDate.getTime(); 
                if(isNaN(this.targetDate)) {
                    this.displayInvalidDateError();
                    return;
                }
            }

            this.weeksElement = this.containerElement.querySelector("[data-countdown-part='weeks'");
            this.daysElement = this.containerElement.querySelector("[data-countdown-part='days'");
            this.hoursElement = this.containerElement.querySelector("[data-countdown-part='hours'");
            this.minutesElement = this.containerElement.querySelector("[data-countdown-part='minutes'");
            this.secondsElement = this.containerElement.querySelector("[data-countdown-part='seconds'");

            this.intervalToken = window.setInterval(this.tick.bind(this), 1000);

            this.tick();
        }

        tick() {
            const now = new Date().getTime();
            const remaining = this.targetDate - now;

            // Time calculations for days, hours, minutes and seconds
            var weeks = Math.floor(remaining / MS_IN_WEEK);
            var days = Math.floor( (remaining % MS_IN_WEEK) / MS_IN_DAY);
            var hours = Math.floor( (remaining % MS_IN_DAY ) / MS_IN_HOUR);
            var minutes = Math.floor( (remaining % MS_IN_HOUR) / MS_IN_MINUTE);
            var seconds = Math.floor( (remaining % MS_IN_MINUTE) / MS_IN_SECOND);

            // Check if we've reached the target time, and stop ourselves:
            if((weeks < 1)
             && (days < 1)
             && (hours < 1)
             && (minutes < 1)
             && (seconds < 1)) {
                 this.stop();
                 this.displayTargetTimeReachedMessage();
                 return;
            }

            collapseIfLessThan1(weeks, this.weeksElement);
            collapseIfLessThan1(days, this.daysElement);
            collapseIfLessThan1(hours, this.hoursElement);
            collapseIfLessThan1(minutes, this.minutesElement);
            
            this.secondsElement.textContent = seconds;
        }

        stop() {
            if(this.intervalToken) {
                window.clearInterval(this.intervalToken);
            }
        }

        displayTargetTimeReachedMessage()
        {
            this.containerElement.textContent = "You are living in the future";
        }

        displayInvalidDateError() {
            this.containerElement.textContent = "Invalid date! You need to use an ISO formatted date";
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        window.Countdown = new Countdown(document.getElementById("primary-countdown"));
    });
})();
