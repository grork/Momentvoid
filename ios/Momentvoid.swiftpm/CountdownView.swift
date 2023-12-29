import SwiftUI

struct CountdownView: View {
    let countdown: Countdown
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                Text(countdown.title)
                ForEach(countdown.segments) { segment in
                    SegmentView(data: segment)
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
