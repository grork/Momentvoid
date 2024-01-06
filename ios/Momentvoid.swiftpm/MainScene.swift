import SwiftUI

struct NoReason: View {
    @State private var base = Date.now
    @State private var countdowns: [Countdown] = []
    
    var body: some View {
        VStack {
            HStack {
                Button("Go forward") {
                    withAnimation {
                        base += 59
                    }
                }
                Button("Reset") {
                    withAnimation {
                        base = Date.now
                    }
                }
            }
            
            
            CountdownsView(countdowns: countdowns)
                .environment(\.currentTime, base)
        }.ignoresSafeArea()
            .onAppear {
                countdowns = Countdown.getSomeRandomCountdowns(relativeTo: base.addingTimeInterval(-1))
            }
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
