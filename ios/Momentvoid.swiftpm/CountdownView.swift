import SwiftUI
struct CurrentTime: EnvironmentKey {
    static let defaultValue: Date = Date.now
}

extension EnvironmentValues {
    var currentTime: Date {
        get { self[CurrentTime.self] }
        set { self[CurrentTime.self] = newValue }
    }
}

struct CountdownView: View {
    @Environment(\.topAlignmentSpacerLength) private var spacerLength
    @Environment(\.currentTime) private var now
    @State private var activeLayoutAnimation: Animation? = nil
    let countdown: Countdown
    
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            Spacer(minLength: spacerLength)

            VStack(alignment: .leading, spacing: 0) {
                Text(countdown.title)
                    .fontWeight(.thin)
                    .lineLimit(1)
                    .padding(.bottom, 8)
                
                ForEach(Segment.getSegments(from: now, to: countdown.targetDate)) { segment in
                    SegmentView(data: segment)
                }
            }
            .overlay {
                GeometryReader { proxy in
                    Color.clear.preference(key: AlignerKey.self, value: proxy.size.height)
                }
            }
        }
        .animation(activeLayoutAnimation, value: spacerLength)
        .scrollBounceBehavior(.basedOnSize)
        .onChange(of: now) {
            if activeLayoutAnimation == nil {
               activeLayoutAnimation = .easeInOut   
            }
        }
    }
}

struct CountdownView_Previews: PreviewProvider {
    private struct SpacerWrapperHelper: View {
        let countdown: Countdown
        @State private var maxHeight = 0.0
        @State private var viewportHeight = 0.0
        
        var body: some View {
            CountdownView(countdown: countdown)
                .environment(\.topAlignmentSpacerLength, deduceSpacerHeight(viewHeight: viewportHeight, contentHeight: maxHeight))
                .overlay {
                    GeometryReader { proxy in
                        Color.clear.onChange(of: proxy.size.height, initial: true) {
                            viewportHeight = proxy.size.height
                        }
                    }
                }
                .onPreferenceChange(AlignerKey.self) { value in
                    maxHeight = value
                }
        }
    }
    
    static var previews: some View {
        let (base, countdowns) = Countdown.getSomeRandomCountdowns()
        ForEach(countdowns) { countdown in
            SpacerWrapperHelper(countdown: countdown)
                .padding([.leading, .trailing])
                .border(.black)
                .environment(\.currentTime, base)
                .previewDisplayName(countdown.title)
        }
    }
}
