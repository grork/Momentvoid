import SwiftUI

/// Calculates the half-length to center a child view of `childLength` within a
/// container view of `containerLength`. Used to center a countdown along an axis
/// within its container.
/// - Parameters:
///   - containerLength: Length of container within which we wish to center the child
///   - childLength: Length of the view we wish to be centered
/// - Returns: The size required to center the child within the container
func deduceSpacerHeight(containerLength: Double, childLength: Double) -> Double {
    // Don't have a size, so we can't do math. If content is bigger than the view
    // we don't want a spacer.
    if ((containerLength <= 0.0 || childLength <= 0.0) || (childLength >= containerLength)) {
        return 0.0
    }
    
    // Find the remaining space, and then slice it in half -- centered!
    return (containerLength - childLength) / 2.0
}

/// Captures the maximum value of children within a higher level container.
/// Intended to be used within single level of container-child relationship.
struct MaximumChildHeight: PreferenceKey {
    static let defaultValue = 0.0 // Assume the maximum height is zero
    static func reduce(value: inout Double, nextValue: () -> Double) {
        // Captures the value only if it's bigger than the one previously had
        value = max(value, nextValue())
    }
}

/// Compainion value to `MaximumChildHeight` which will contain the size for
/// a spacer to top-align all children, centered vertically relative to the
/// tallest item.
struct TopAlignmentSpacerLength: EnvironmentKey {
    static let defaultValue: Double = 0.0
}

/// Convenience access to the environment value for `TopAlignmentSpacerLength`
extension EnvironmentValues {
    var topAlignmentSpacerLength: Double {
        get { self[TopAlignmentSpacerLength.self] }
        set { self[TopAlignmentSpacerLength.self] = newValue }
    }
}

/// Container view for holding a list of `Countdowns`, leveraging `CountdownView`
/// to displaty those countdowns. It also:
/// - Vertically centers the items by top alignment
/// - Adds animations for removal, resizes etc.
/// - Disables animations during initial load
struct CountdownsView: View {
    /// Largest seen child height
    @State private var tallestChildLength = 0.0
    
    /// Current height of the viewport
    @State private var viewportHeight = 0.0

    /// List of countdowns to render
    let countdowns: [Countdown]
    
    var body: some View {
        // We only want the scroll view to enable horizontal scrolling
        // It is expected that the countdowns themselves willl handle
        // vertical scrolling
        ScrollView(.horizontal) {
            // Layout the countdowns horizontally
            HStack() {
                // Render each countdown
                ForEach(countdowns) { countdown in
                    CountdownView(countdown: countdown)
                        // Pass down the calculated spacer to allow vertical
                        // centering within the countdowns space
                        .environment(\.topAlignmentSpacerLength,
                                      deduceSpacerHeight(containerLength: viewportHeight, 
                                                         childLength: tallestChildLength)
                        )
                        // Animate the removal / addition of the countdowns as they
                        // come and go
                        .transition(
                            .asymmetric(
                                insertion: .move(edge: .top),
                                removal: .move(edge: .bottom)
                            // Combine both with a blur so they don't stick on screen
                            // during the animation
                            ).combined(with: .opacity)
                        )
                }
            }.transaction { t in
                // We don't want to animate if the animations have been
                // disabled in an overarching transaction. Primarily,
                // this is to disable the animation on application startup.
                // Why does it show on startup? Because the `PreferenceKey`
                // and `EnvironmentKey` dance doesn't happen in a single
                // layout pass -- which means when the second part completes
                // an animation is triggered.
                guard !t.disablesAnimations else { return }
                t.animation = .default
            }
        }
        .overlay {
            // Leverage an overlay() to capture the size of our ScrollViewer
            // so we can calculate the size to set a spacer to.
            GeometryReader { proxy in
                // We don't need a real UI element, just something to fill
                // the space so we can detect the change in value
                Color.clear.onChange(of: proxy.size.height, initial: true) {
                    viewportHeight = proxy.size.height
                }
            }
        }
        // Capture the preference key value changea as they happen
        .onPreferenceChange(MaximumChildHeight.self) { value in
            tallestChildLength = value
        }
    }
}

struct CountdownsView_Previews: PreviewProvider {
    static var previews: some View {
        let countdowns = Countdown.getSomeRandomCountdowns()
        CountdownsView(countdowns: countdowns)
            .previewDisplayName("All Countdowns")
        
        CountdownsView(countdowns: [countdowns[0], countdowns[1], countdowns[2]])
            .border(.black)
            .previewDisplayName("First Three")
    }
}
