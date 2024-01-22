import Foundation

struct Segment : Identifiable {
    let title: String
    let value: Int
    let id: String
    
    init(title: String, value: Int, id: String) {
        self.title = title
        self.value = value
        self.id = id
    }
    
    static func getSegments(from: Date, to: Date) -> [Segment] {
        let components = Calendar.current.dateComponents([
            .year,
            .month,
            .weekOfYear,
            .day,
            .hour,
            .minute,
            .second
        ], from: from, to: to)
        
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

@Observable
class Countdown: Identifiable {
    public static var parser: ISO8601DateFormatter = {
    private static var parser: ISO8601DateFormatter = {
        let instance = ISO8601DateFormatter()
        instance.formatOptions = .withInternetDateTime
        return instance
    }()
    
    let id: String
    var targetDate: Date
    var title: String
    
    init(isoTarget: String, title: String) {
        self.targetDate = Countdown.parser.date(from: isoTarget)!
        self.title = title
        self.id = title
    }
    
    init(target: Date, title: String)
    {
        self.targetDate = target
        self.title = title
        self.id = title
    }

    static func getSomeRandomCountdowns(relativeTo: Date = Date.now) -> [Countdown] {
        let calendar = Calendar.current
        let threeYears = calendar.date(byAdding: DateComponents(year: 3), to: relativeTo)!
        let sixMonths = calendar.date(byAdding: DateComponents(month: 6), to: relativeTo)!
        let twoWeeks = calendar.date(byAdding: DateComponents(day: 14), to: relativeTo)!
        let aFewDays = calendar.date(byAdding: DateComponents(day: 3), to: relativeTo)!
        let aFewHours = calendar.date(byAdding: DateComponents(hour: 4), to: relativeTo)!
        let aFewMinutes = calendar.date(byAdding: DateComponents(minute: 15), to: relativeTo)!
        let halfAMinute = calendar.date(byAdding: DateComponents(second: 30), to: relativeTo)!
        
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
