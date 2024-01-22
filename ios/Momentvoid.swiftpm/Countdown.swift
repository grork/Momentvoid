import Foundation

/// A individual segment for a countdown. Represents a singular component
/// of a unit within the countdowns remaining duration. E.g., the title
/// indicating the units, and the value.
struct Segment : Identifiable {
    /// Displayed label
    let title: String
    /// Displayed value
    let value: Int
    
    /// Id of this segment so when everything recalculated SwiftUI can
    /// verify if a segment has been added or removed from the tree or
    /// if its just changed value.
    let id: String
    
    /// Initializes the Segment with the provided values
    /// - Parameters:
    ///   - title: Label for this segment
    ///   - value: Value to display for this segment
    ///   - id: Unique identifier for this segment so we know when
    ///     its value has changed when comparing lists
    init(title: String, value: Int, id: String) {
        self.title = title
        self.value = value
        self.id = id
    }
    
    /// Given two dates, calculates the difference in time between
    /// the two points, and generates an array of segments representing
    /// the different units of time that make up that time difference
    /// - Parameters:
    ///   - from: Beginning of the time period
    ///   - to: End of the time period
    static func getSegments(from: Date, to: Date) -> [Segment] {
        // Let the platform do the hardwork of calculating the
        // number of years, months et al that make up the difference
        // between the two dates
        let components = Calendar.current.dateComponents([
            .year,
            .month,
            .weekOfYear,
            .day,
            .hour,
            .minute,
            .second
        ], from: from, to: to)
        
        // We only want to capture segments that have a value. If
        // a segment is 0, it's not interesting to display.
        var segments: [Segment] = [];
        
        if let years = components.year, years > 0 {
            segments.append(Segment(
                title: "years",
                value: years,
                id: "years"
            ))
        }
        
        if let months = components.month, months > 0 {
            segments.append(Segment(
                title: "months",
                value: months,
                id: "months"
            ))
        }
        
        if let weeks = components.weekOfYear, weeks > 0 {
            segments.append(Segment(
                title: "weeks",
                value: weeks,
                id: "weeks"
            ))
        }
        
        if let days = components.day, days > 0 {
            segments.append(Segment(
                title: "days",
                value: days,
                id: "days"
            ))
        }
        
        if let hours = components.hour, hours > 0 {
            segments.append(Segment(
                title: "hours",
                value: hours,
                id: "hours"
            ))
        }
        
        if let minutes = components.minute, minutes > 0 {
            segments.append(Segment(
                title: "minutes",
                value: minutes,
                id: "minutes"
            ))
        }
        
        // We do want to capture the 'seconds' if their zero. This is to
        // minimize the 'jiggling' we have every 59 seconds when there are
        // zero seconds of the minute left -- the segment would disappear
        // and reappear, being very jaring.
        // We check for -1 to handle when we roll over on the past the end
        // of the duration -- e.g., we're in the future relative to the
        // countdown target date.
        if let seconds = components.second, seconds > -1 {
            segments.append(Segment(
                title: "seconds",
                value: seconds,
                id: "seconds"
            ))
        }
        
        return segments
    }
}

/// Represents a single countdown, with a target date time that can be used
/// to capture the intent of tracking a target date to show the duration till
/// that target time.
@Observable
class Countdown: Identifiable {
    /// Shared parser for decoding ISO8601 dates. We have a singular format,
    /// and it can be used multiple times.
    private static var parser: ISO8601DateFormatter = {
        let instance = ISO8601DateFormatter()
        instance.formatOptions = .withInternetDateTime
        return instance
    }()

    /// User provided name of this countdown
    let title: String
    
    /// Target date that this countdown is counting towards
    let targetDate: Date
    
    /// Unique ID of this Countdown
    let id: String

    /// Initializes an instance using an ISO8601 formatted string to
    /// represent the target date, along with the title
    /// - Parameters:
    ///   - isoTarget: ISO8601-compliant date & time that will be counted towards
    ///   - title: User displayed title for this countdown
    init(isoTarget: String, title: String) {
        // TODO: For now, we're assuming this can't fail.
        self.targetDate = Countdown.parser.date(from: isoTarget)!
        self.title = title
        self.id = title
    }
    
    /// Initializes an instance with the supplied target date & title
    /// - Paramaters:
    ///   - target: The date to count towards
    ///   - title: User displayed title for this countdown
    init(target: Date, title: String) {
        self.targetDate = target
        self.title = title
        self.id = title
    }

    /// Convenience function intended for testing purposes that will get a set
    /// of `Countdown` instances spread in the future from the `relativeTo` date
    /// or "Now" if a date isn't supplied
    /// - Parameters:
    ///   - relativeTo: A base date that the generated countdowns will be generated
    ///     relative to. If it is not supplied, it will default to `Date.now` at the
    ///     time of invocation.
    /// - Returns: A spread of countdowns in the future from the supplied `relativeTo`
    ///   time.
    static func getSomeRandomCountdowns(relativeTo: Date = Date.now) -> [Countdown] {
        let calendar = Calendar.current
        
        let threeYears = calendar.date(byAdding: DateComponents(year: 3), to: relativeTo)!
        let sixMonths = calendar.date(byAdding: DateComponents(month: 6), to: relativeTo)!
        let twoWeeks = calendar.date(byAdding: DateComponents(day: 14), to: relativeTo)!
        let aFewDays = calendar.date(byAdding: DateComponents(day: 3), to: relativeTo)!
        let aFewHours = calendar.date(byAdding: DateComponents(hour: 4), to: relativeTo)!
        let aFewMinutes = calendar.date(byAdding: DateComponents(minute: 15), to: relativeTo)!
        let halfAMinute = calendar.date(byAdding: DateComponents(second: 30), to: relativeTo)!
        
        // Uses to generate a friendly name for each of the generated countdowns
        let formatter = RelativeDateTimeFormatter();
        formatter.dateTimeStyle = .named
        formatter.unitsStyle = .spellOut
        
        return [
            Countdown(target: halfAMinute, title: formatter.localizedString(for: halfAMinute, relativeTo: relativeTo)),
            Countdown(target: aFewMinutes, title: formatter.localizedString(for: aFewMinutes, relativeTo: relativeTo)),
            Countdown(target: aFewHours, title: formatter.localizedString(for: aFewHours, relativeTo: relativeTo)),
            Countdown(target: aFewDays, title: formatter.localizedString(for: aFewDays, relativeTo: relativeTo)),
            Countdown(target: twoWeeks, title: formatter.localizedString(for: twoWeeks, relativeTo: relativeTo)),
            Countdown(target: sixMonths, title: formatter.localizedString(for: sixMonths, relativeTo: relativeTo)),
            Countdown(target: threeYears, title: formatter.localizedString(for: threeYears, relativeTo: relativeTo))
        ]
    }
}
