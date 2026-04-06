import WidgetKit
import SwiftUI

struct HelloProvider: TimelineProvider {
    func placeholder(in context: Context) -> HelloEntry {
        HelloEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (HelloEntry) -> Void) {
        completion(HelloEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HelloEntry>) -> Void) {
        let entry = HelloEntry(date: Date())
        completion(Timeline(entries: [entry], policy: .atEnd))
    }
}

struct HelloEntry: TimelineEntry {
    let date: Date
}

struct helloWidgetEntryView: View {
    var entry: HelloProvider.Entry

    var body: some View {
        VStack(spacing: 8) {
            Text("Hello")
                .font(.headline)
            Text("World!")
                .font(.title)
                .fontWeight(.bold)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct helloWidget: Widget {
    let kind: String = "helloWidgetV2"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HelloProvider()) { entry in
            helloWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Hello Widget")
        .description("My second awesome widget.")
    }
}

#Preview(as: .systemSmall) {
    helloWidget()
} timeline: {
    HelloEntry(date: .now)
}
