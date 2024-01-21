import SwiftUI
/**
 A single segment for a unit of time. Displays things in visually
 appealing form, and is aware of dynamic type to adjust the type
 size
 */
struct SegmentView: View {
    /// The `Segment` data to be displayed
    var data: Segment
    
    /// Scaled type size for the numeric part of the segment
    @ScaledMetric(relativeTo: .largeTitle) var digitSize = 100
    
    /// Scaled kerning value for the numeric part of the segment
    @ScaledMetric(relativeTo: .body) var digitKerning = -3.0
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(String(data.value))
                // Using monospaced digits aligns the text so that it doesn't
                // jiggle as values change by fixing the digit width. E.g.,
                // 11 is narrower than 55 without this.
                .font(.system(size: digitSize).monospacedDigit())
                .fontWeight(.heavy)
                .kerning(digitKerning)
                .lineLimit(1)
                .padding([.bottom, .top], -20)
                .contentTransition(.numericText(countsDown: true)) // Animate the digit change
                // Ensure that an animation is played on this view. Without this an animation
                // is only performed when the state change happens within a `withAnimation`
                // block
                .animation(.easeInOut, value: data.value)
                .frame(minWidth: 125, alignment: .leading)
            
            Text(data.title)
                .truncationMode(.tail)
                .font(.title)
                .fontWeight(.ultraLight)
                .lineLimit(1)
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    /// Enable validation that the content transition animation
    /// is working by allowing the preview to toggle the value
    /// within the segment, and see the animation
    struct AnimatedSegmentChangePreviewHelper: View {
        @State var displayedSegment: Segment
        
        var body: some View {
            VStack {
                SegmentView(data: displayedSegment)
                
                Button("Randomize") {
                    displayedSegment = Segment(
                        title: displayedSegment.title, 
                        value: Int.random(in: 1111..<9999),
                        id: displayedSegment.id)
                 }.environment(\.sizeCategory, .medium) // Force fixed size for toggle button
            }
        }
    }
    
    static var previews: some View {
        // Simple segment that follows the natural dynamic type size. Enables
        // the 'palette' view in Xcode to show all the dynamic sizes.
        SegmentView(data: Segment(title: "Natural", value: 7777, id: "natural"))
            .previewDisplayName("Natural")
        
        // Enumerate all the typesizes and render each as it's own preview
        // so that we can flip between them and make sure the layout clips
        // truncates, etc.
        ForEach(ContentSizeCategory.allCases, id: \.hashValue) { size in
            let label = String(reflecting: size)
            let segment = Segment(title: label, value: 7777, id: label)
            
            // Make sure we're using the wrapper so we can hit the toggle
            // button and inspect the animation
            AnimatedSegmentChangePreviewHelper(displayedSegment: segment)
                .environment(\.sizeCategory, size)
                .previewDisplayName(label)
        }
    }
}
