import SwiftUI

@main
struct MyApp: App {
    @State private var currentTime = Date.now
    @State private var startTime = Date.now
    @State private var countdowns: [Countdown] = []
    
    private func initializeCountdowns() {
        let now = Date.now
        currentTime = now
        startTime = now
        countdowns = Array(Countdown.getSomeRandomCountdowns(relativeTo: currentTime.addingTimeInterval(-1))[...2])
    }
    
    var body: some Scene {
        WindowGroup {
            VStack {
                HStack {
                    Button("Go forward") {
                        currentTime += 800
                    }
                    Button("Reset") {
                        initializeCountdowns()
                    }
                }
                
                CountdownsView(countdowns: countdowns)
                    .environment(\.currentTime, currentTime)
            }.transaction { t in
                t.disablesAnimations = (currentTime == startTime)
            }
            .ignoresSafeArea(.keyboard)
            .onAppear {
                self.initializeCountdowns()
            }
        }
    }
}
