import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        var entries: [SimpleEntry] = []

        // Generate a timeline consisting of five entries an hour apart, starting from the current date.
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate)
            entries.append(entry)
        }

        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
}

struct watchWidgetEntryView: View {
    @Environment(\.widgetFamily) var widgetFamily
    var entry: Provider.Entry

    // Theme Colors
    private let primaryColor = Color(red: 173/255, green: 198/255, blue: 255/255) // #ADC6FF
    private let primaryContainer = Color(red: 77/255, green: 142/255, blue: 255/255) // #4D8EFF
    private let surfaceColor = Color(red: 19/255, green: 19/255, blue: 22/255) // #131316
    private let surfaceContainer = Color(red: 31/255, green: 31/255, blue: 34/255) // #1F1F22

    var body: some View {
        Group {
            switch widgetFamily {
            case .accessoryCircular:
                ZStack {
                    AccessoryWidgetBackground()
                    
                    // Styled Glow/Ring
                    Circle()
                        .stroke(
                            LinearGradient(
                                colors: [primaryColor, primaryContainer],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 3
                        )
                        .padding(2)
                    
                    Image(systemName: "mic.fill")
                        .font(.title2)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [primaryColor, .white],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                }
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        ZStack {
                            Circle()
                                .fill(primaryColor.opacity(0.2))
                                .frame(width: 24, height: 24)
                            Image(systemName: "mic.fill")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(primaryColor)
                        }
                        
                        Text("SYNAPSE")
                            .font(.system(size: 10, weight: .bold))
                            .kerning(1.2)
                            .foregroundColor(primaryColor.opacity(0.8))
                    }
                    
                    Text("Capture Note")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                    
                    Text("TAP TO RECORD")
                        .font(.system(size: 8, weight: .bold))
                        .kerning(0.5)
                        .foregroundColor(.white.opacity(0.4))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 8)
            case .accessoryInline:
                HStack(spacing: 4) {
                    Image(systemName: "mic.fill")
                        .foregroundColor(primaryColor)
                    Text("NEW NOTE")
                        .font(.system(size: 12, weight: .bold))
                        .kerning(1.0)
                }
            default:
                Image(systemName: "mic.fill")
                    .foregroundColor(primaryColor)
            }
        }
        .widgetURL(URL(string: "synapseapp://new-note"))
    }
}



struct watchWidget: Widget {
    let kind: String = "watchWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            watchWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Watch Complication")
        .description("An example watch complication.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
        ])
    }
}

#Preview(as: .accessoryRectangular) {
    watchWidget()
} timeline: {
    SimpleEntry(date: .now)
}
