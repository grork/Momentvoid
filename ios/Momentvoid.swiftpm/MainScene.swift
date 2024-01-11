import SwiftUI

@main
struct MyApp: App {
    @State private var base = Date.now
    @State private var countdowns: [Countdown] = []
    
    private func initializeCountdowns() {
        countdowns = Countdown.getSomeRandomCountdowns(relativeTo: base.addingTimeInterval(-1))
    }
    
    var body: some Scene {
        WindowGroup {
            VStack {
                HStack {
                    Button("Go forward") {
                            base += 800
                    }
                    Button("Reset") {
                        base = Date.now
                        initializeCountdowns()
                    }
                }
                
                CountdownsView(countdowns: countdowns)
                    .environment(\.currentTime, base)
            }
            .ignoresSafeArea(.keyboard)
            .onAppear {
                self.initializeCountdowns()
            }
        }
    }
}
