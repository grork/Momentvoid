import SwiftUI

@main
struct MyApp: App {
    let countdowns = Countdown.getSomeRandomCountdowns()
    
    var body: some Scene {
        WindowGroup {
            CountdownsView(countdowns: countdowns)
        }
    }
}
