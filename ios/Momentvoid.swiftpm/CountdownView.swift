import SwiftUI

/// We want the countdowns to be relative to the same reference time.
/// This pushes a singular reference time to all parts of the subtree
struct ReferenceTime: EnvironmentKey {
    static let defaultValue: Date = Date.now
}

/// Convenience accessor for the reference time
extension EnvironmentValues {
    var referenceTime: Date {
        get { self[ReferenceTime.self] }
        set { self[ReferenceTime.self] = newValue }
    }
}

/// Renders a `Countdown` in a vertical list, generating segments that represent
/// the remaining duration to the countdowns target time.
struct CountdownView: View {
    /// Spacer that comes from the container to enable the segments to be
    /// top aligned / vertically centered.
    @Environment(\.topAlignmentSpacerLength) private var spacerHeight
    
    /// Reference time to generate segments 
    @Environment(\.referenceTime) private var referenceTime
    
    /// The countdown (with target time) we're rendering
    let countdown: Countdown
    
    var body: some View {
        // We want the segments to scroll if they're big enough. But, importantly,
        // don't want the scroll indicator to show - it gets very busy very quickly
        ScrollView(.vertical, showsIndicators: false) {
            // The filler view that reads it's size from the shared environment
            // to help align tops of all countdowns.
            Spacer(minLength: spacerHeight)

            VStack(alignment: .leading) {
                Text(countdown.title)
                    .fontWeight(.thin)
                    .lineLimit(1)
                    .padding(.bottom, 8)
                
                ForEach(Segment.getSegments(from: referenceTime, to: countdown.targetDate)) { segment in
                    SegmentView(data: segment)
                }
            }
            // We want to have a minimum width, to minimize the shuffling that happens
            // when all digits have dissappeared from a countdown.
            .frame(minWidth: 125, alignment: .leading)
            .background {
                // To track the size of the sized content -- not the scrollveiwer height -- we need
                // to have a GeometryReader that takes the size from a blank fill, and pushes it
                // up the through through a PreferenceKey
                GeometryReader { proxy in
                    Color.clear.preference(key: MaximumChildHeight.self, value: proxy.size.height)
                }
            }
        }
        // When the height of the spacer changes, lets make sure that movement is animated.
        .animation(.easeInOut, value: spacerHeight)
        .scrollBounceBehavior(.basedOnSize) // Don't allow scrolling if there isn't anything to scroll
    }
}

struct CountdownView_Previews: PreviewProvider {
    /// To provide a realistic representation of how our layout will actually happen
    private struct SpacerWrapperHelper: View {
        let countdown: Countdown
        @State private var childHeight = 0.0
        @State private var containerHeight = 0.0
        
        var body: some View {
            CountdownView(countdown: countdown)
                .environment(\.topAlignmentSpacerLength, (max(containerHeight - childHeight, 0)) / 2)
                .overlay {
                    GeometryReader { proxy in
                        Color.clear.onChange(of: proxy.size.height, initial: true) {
                            containerHeight = proxy.size.height
                        }
                    }
                }
                .onPreferenceChange(MaximumChildHeight.self) { value in
                    childHeight = value
                }
        }
    }
    
    static var previews: some View {
        let now = Date.now
        let countdowns = Countdown.getSomeRandomCountdowns(relativeTo: now)
        ForEach(countdowns) { countdown in
            SpacerWrapperHelper(countdown: countdown)
                .padding([.leading, .trailing])
                .border(.black)
                // Adjust the now so that the time has more than one
                // segment
                .environment(\.referenceTime, now + 1)
                .ignoresSafeArea()
                .previewDisplayName(countdown.title)
                // Disable animations 'cause of the layout calculations
                // causing animations in previews (aka distracting)
                .transaction { t in t.disablesAnimations = true }
        }
    }
}
