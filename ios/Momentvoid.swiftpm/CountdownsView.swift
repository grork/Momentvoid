import SwiftUI

func deduceSpacerHeight(viewHeight: Double, contentHeight: Double) -> Double {
    // Don't have a size, so we can't do math. If content is bigger than the view
    // we don't want a spacer.
    if((viewHeight <= 0.0 || contentHeight <= 0.0) || (contentHeight >= viewHeight)) {
        return 0.0
    }
    return (viewHeight - contentHeight) / 2.0
}

struct AlignerKey: PreferenceKey {
    static let defaultValue = 0.0
    static func reduce(value: inout Double, nextValue: () -> Double) { value = max(value, nextValue()) }
}

struct TopAlignmentSpacerLength: EnvironmentKey {
    static let defaultValue: Double = 0.0
}

extension EnvironmentValues {
    var topAlignmentSpacerLength: Double {
        get { self[TopAlignmentSpacerLength.self] }
        set { self[TopAlignmentSpacerLength.self] = newValue }
    }
}


struct CountdownsView: View {
    @State var maxContentHeight = 0.0
    @State var viewportHeight = 0.0
    @State var horizontalCenteringSpacerLength = 0.0
    
    let countdowns: [Countdown]
    var body: some View {
        // Make things scroll horizontally
        ScrollView(.horizontal) {
            HStack() {
                // Spacer at the front so we can have a 'centered' like scrolling vibe. note the numbers here are just 'random'
                Spacer(minLength: horizontalCenteringSpacerLength)
                
                // Actual Segments
                ForEach(countdowns) { countdown in
                    CountdownView(countdown: countdown)
                        .environment(\.topAlignmentSpacerLength, deduceSpacerHeight(viewHeight: viewportHeight, contentHeight: maxContentHeight))
                }
                // Spacer at the end so we can scroll the last item into the center of the scrolling region. Numbers are just 'random'
                Spacer(minLength: horizontalCenteringSpacerLength)
            }
        }.overlay {
            GeometryReader { proxy in
                Color.clear.onChange(of: proxy.size.height, initial: true) {
                    viewportHeight = proxy.size.height
                }
            }
        }
        .onPreferenceChange(AlignerKey.self) { value in
            maxContentHeight = value
        }
    }
}

struct CountdownsView_Previews: PreviewProvider {
    static var previews: some View {
        CountdownsView(countdowns: Countdown.getSomeRandomCountdowns())
    }
}
