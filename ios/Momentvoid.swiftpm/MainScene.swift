import SwiftUI

@main
struct MyApp: App {
    @State private var currentTime = Date.now
    @State private var startTime = Date.now
    @State private var countdowns: [Countdown] = []
    @State private var removedCountdowns: [Countdown] = []
    
    private func initializeCountdowns() {
        let now = Date.now
        currentTime = now
        startTime = now
        countdowns = Countdown.getSomeRandomCountdowns(relativeTo: currentTime.addingTimeInterval(-1))
        removedCountdowns = []
    }
    
    var body: some Scene {
        WindowGroup {
            VStack {
                HStack {
                    Button {
                        currentTime += 800
                    } label: {
                        Image(systemName: "timer").frame(minWidth: 48, minHeight: 48)
                    }
                    Button {
                        initializeCountdowns()
                    } label: {
                        Image(systemName: "trash").frame(minWidth: 48, minHeight: 48)
                    }
                    Button {
                        let toAdd = removedCountdowns.removeLast()
                        countdowns.insert(toAdd, at: 0)
                    } label: {
                        Image(systemName: "arrowtriangle.right.fill").frame(minWidth: 48, minHeight: 48)
                    }.disabled(removedCountdowns.isEmpty)
                    Button {
                        let removed = countdowns.removeFirst()
                        removedCountdowns.append(removed)
                    } label: {
                        Image(systemName: "delete.right").frame(minWidth: 48, minHeight: 48)
                    }.disabled(countdowns.isEmpty)
                    Button {
                        let removed = countdowns.removeLast()
                        removedCountdowns.append(removed)
                    } label: {
                        Image(systemName: "delete.left").frame(minWidth: 48, minHeight: 48)
                    }.disabled(countdowns.isEmpty)
                    Button {
                        let toAdd = removedCountdowns.removeLast()
                        countdowns.append(toAdd)
                    } label: {
                        Image(systemName: "arrowtriangle.left.fill").frame(minWidth: 48, minHeight: 48)
                    }.disabled(removedCountdowns.isEmpty)
                }
                
                CountdownsView(countdowns: countdowns)
                    .environment(\.referenceTime, currentTime)
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
