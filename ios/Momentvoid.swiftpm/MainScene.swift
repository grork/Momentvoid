import SwiftUI

struct NoReason: View {
    @State private var base = Date.now.addingTimeInterval(1)
    @State private var countdowns = Countdown.getSomeRandomCountdowns()
    
    var body: some View {
        VStack {
            Button("Go forward") {
                withAnimation {
                    base += 59
                }
            }
            
            CountdownsView(countdowns: countdowns.countdowns)
                .environment(\.currentTime, base)
        }
        .ignoresSafeArea()
    }
}

@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            NoReason()
        }
    }
}
