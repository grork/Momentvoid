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
    @Environment(\.currentTime) private var currentTime
    let countdown: Countdown
    
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            Spacer(minLength: spacerLength)

            VStack(alignment: .leading) {
                Text(countdown.title)
                    .fontWeight(.thin)
                    .lineLimit(1)
                    .padding(.bottom, 8)
                
                ForEach(Segment.getSegments(from: currentTime, to: countdown.targetDate)) { segment in
                    SegmentView(data: segment)
                }
            }
            .frame(minWidth: 125, alignment: .leading)
            .background {
                GeometryReader { proxy in
                    Color.clear.preference(key: AlignerKey.self, value: proxy.size.height)
                }
            }
        }
        .animation(.easeInOut, value: spacerLength)
        .scrollBounceBehavior(.basedOnSize)
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
        let now = Date.now
        let countdowns = Countdown.getSomeRandomCountdowns(relativeTo: now)
        ForEach(countdowns) { countdown in
            SpacerWrapperHelper(countdown: countdown)
                .padding([.leading, .trailing])
                .border(.black)
                .environment(\.currentTime, now + 1)
                .ignoresSafeArea()
                .previewDisplayName(countdown.title)
        }
    }
}
