import SwiftUI

/// Contains the basic lifecycle, and core state for the application
/// plus some simple housekeeping state to enable the correct UI to
/// be displayed -- e.g., disable first run animation.
@main
struct MyApp: App {
    /// Time we're currently counting against. This intended to control
    /// for the actual time we're counting down from.
    @State private var currentTime = Date.now
    
    /// The time when we started counting the app. This is soley to provide
    /// a reference point to disable animations if there hasn't been a tick
    /// yet. No tick? Means we're still on intial start.
    @State private var startTime = Date.now
    
    /// Countdowns that we will be displaying
    @State private var countdowns: [Countdown] = []
    
    /// Reset all state to be 'fresh', like on startup. This can be called
    /// multiple times in the life of an application, but all prior state
    /// is dropped.
    private func initializeCountdowns() {
        // Don't try to put these on one line; you can't 'cause they're @State's.
        let now = Date.now
        currentTime = now
        startTime = now
        
        // Rather than force us to generate them every time 'cause thinking up
        // times n names is hard -- and slow! -- just generate some using the
        // test helper function
        countdowns = Countdown.getSomeRandomCountdowns(relativeTo: currentTime.addingTimeInterval(-1))
    }
    
    var body: some Scene {
        WindowGroup {
            VStack {
                TestingHelperToolbar(currentTime: $currentTime,
                                      countdowns: $countdowns,
                                          // Just reset *stuff* ⬇️
                                          reset: self.initializeCountdowns)
                
                // The actual countdowns being rendered
                CountdownsView(countdowns: countdowns)
                    // Set the ambient time that will be used to calculate the
                    // remaining time. This is externally set because the
                    // actual time needs to be managed independently from the
                    // display of the countdowns.
                    .environment(\.referenceTime, currentTime)
            }.transaction { t in
                // During first render by SwiftUI, animations aren't played.
                // However, since we do a *dance* deep in the layout to enable
                // things to be vertically centered, this causes a layout pass
                // (i think) in SwiftUI to be run, so that when the actual size
                // is stable, an animation gets applied because it happened in
                // a second layout pass. Ooops.
                //
                // So, use a transaction to disable the animation at a framework
                // level if our 'startTime' is the same as our current time. This
                // means that when the first tick happens the animations will play
                t.disablesAnimations = (currentTime == startTime)
            }
            // Don't care about adjusting for the keyboard since we're a non-text
            // entry experience
            .ignoresSafeArea(.keyboard)
            .onAppear {
                self.initializeCountdowns()
            }
        }
    }
}
