import SwiftUI

struct CountdownView: View {
    @Environment(\.topAlignmentSpacerLength) private var spacerLength
    let countdown: Countdown
    
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            Spacer(minLength: spacerLength)
            VStack(alignment: .leading, spacing: 0) {
                Text(countdown.title)
                ForEach(countdown.segments) { segment in
                    SegmentView(data: segment)
                }
            }.overlay {
                GeometryReader { proxy in
                    Color.clear.preference(key: AlignerKey.self, value: proxy.size.height)
                }
            }
        }
        .scrollBounceBehavior(.basedOnSize)
    }
}

struct CountdownView_Previews: PreviewProvider {
    static var previews: some View {
        let countdowns = Countdown.getSomeRandomCountdowns()
        ForEach(countdowns) { countdown in
            CountdownView(countdown: countdown)
                .previewDisplayName(countdown.title)
        }
    }
}
