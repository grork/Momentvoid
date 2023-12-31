import SwiftUI

struct SegmentView: View {
    var data: Segment
    @ScaledMetric(relativeTo: .largeTitle) var digitSize = 100
    @ScaledMetric(relativeTo: .largeTitle) var spacingSize = -25
    @ScaledMetric(relativeTo: .body) var digitKerning = -3.0
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(String(data.value))
                .font(.system(size: digitSize).monospacedDigit())
                .fontWeight(.heavy)
                .kerning(digitKerning)
                .lineLimit(1)
                .padding(.bottom, -20)
                .contentTransition(.numericText())
                    
            Text(data.title)
                .truncationMode(.tail)
                .font(.title)
                .fontWeight(.ultraLight)
                .lineLimit(1)
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    struct Fiddler: View {
        @State var theSegment: Segment
        let size: ContentSizeCategory
        let label: String
        var body: some View {
            VStack {
                SegmentView(data: theSegment)
                    .environment(\.sizeCategory, size)
                Button("Toggle") {
                    withAnimation {
                        theSegment = Segment(title: label, value: Int.random(in: 1111..<9999), id: label)
                    }
                }
            }
        }
    }
    
    static var previews: some View {
        SegmentView(data: Segment(title: "Natural", value: 7777, id: "natural"))
            .previewDisplayName("Natural")
        
        ForEach(ContentSizeCategory.allCases, id: \.hashValue) { size in
            let label = String(reflecting: size)
            let segment = Segment(title: label, value: 7777, id: label)
            Fiddler(theSegment: segment, size: size, label: label)
                .previewDisplayName(label)
        }
    }
}
