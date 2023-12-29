import SwiftUI

struct CountdownsView: View {
    let countdowns: [Countdown]
    var body: some View {
        GeometryReader { proxy in
                // Make things scroll horizontally
                ScrollView(.horizontal) {
                    HStack(alignment: .bottom) {
                        // Spacer at the front so we can have a 'centered' like scrolling vibe. note the numbers here are just 'random'
                        Spacer(minLength: (proxy.size.width / 2) - 100)
                        
                        // Actual Segments
                        ForEach(countdowns) { countdown in
                            CountdownView(countdown: countdown)
                        }
                        // Spacer at the end so we can scroll the last item into the center of the scrolling region. Numbers are just 'random'
                        Spacer(minLength: (proxy.size.width / 2) - 100)
                    }
                    // ^-- make sure that the hstack goes to the full height of the scrollview. Without this while the scrollview itself will be full height, the actual scroll indicator will be with the height of the hstack. e.g. in the middle of the screen.
                }
        }
    }
}

struct CountdownsView_Previews: PreviewProvider {
    static var previews: some View {
        CountdownsView(countdowns: Countdown.getSomeRandomCountdowns())
    }
}
