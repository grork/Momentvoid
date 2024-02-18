import SwiftUI

/// Toolbar that provides some basic testing controls to allow
/// manual testing of the various countdown scenarios
struct TestingHelperToolbar: View {
    /// Reference to the current time that countdowns will be calculated
    /// against.
    @Binding var currentTime: Date
    
    /// Current set of countdowns
    @Binding var countdowns: [Countdown]
    
    /// Countdowns that have been removed as part of testing
    @State private var removedCountdowns: [Countdown] = []
    
    /// Handler to reset the state of whoever is containing us
    let reset: () -> Void
    
    var body: some View {
        HStack(spacing: 24) { // Make it nicely spaced
            Button("", systemImage: "timer") {
                // tack on 4 seconds to help change the seconds unit to see the animation
                currentTime += (13 /*minutes*/ * 60) + 4 
            }.hoverEffect()
            
            // Reset to fresh new state.
            Button("", systemImage: "trash") {
                reset()
                removedCountdowns = []
            }.hoverEffect()
            
            // Adds the last removed item to the *start* of the coundowns
            Button("", systemImage: "arrowtriangle.right.fill") {
                let toAdd = removedCountdowns.removeLast()
                countdowns.insert(toAdd, at: 0)
            }.hoverEffect().disabled(removedCountdowns.isEmpty)
            
            // Removes items from the *start* of the countdowns list
            // and adds them to the removed list
            Button("", systemImage: "delete.right") {
                let removed = countdowns.removeFirst()
                removedCountdowns.append(removed)
            }.hoverEffect().disabled(countdowns.isEmpty)
            
            // Removes items from the *end* of the countdowns list
            // and adds tehm to the removed list
            Button("", systemImage: "delete.left") {
                let removed = countdowns.removeLast()
                removedCountdowns.append(removed)
            }.hoverEffect().disabled(countdowns.isEmpty)
            
            // Adds the last removed countdown to the *end* of the countdowns
            Button("", systemImage: "arrowtriangle.left.fill") {
                let toAdd = removedCountdowns.removeLast()
                countdowns.append(toAdd)
            }.hoverEffect().disabled(removedCountdowns.isEmpty)
        }.frame(minHeight: 48) // make sure it doesn't sit under the iPadOS split view buttons
    }
}
