import WidgetKit
import SwiftUI

struct EntriesEntry: TimelineEntry {
    let date: Date
    let entries: [EntryData]
    let configuration: ConfigurationAppIntent
}

struct EntryData: Codable {
    let id: String
    let title: String
    let status: String
}

struct EntriesProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> EntriesEntry {
        EntriesEntry(date: Date(), entries: [], configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> EntriesEntry {
        let entries = loadEntries()
        return EntriesEntry(date: Date(), entries: entries, configuration: configuration)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<EntriesEntry> {
        let entries = loadEntries()
        let entry = EntriesEntry(date: Date(), entries: entries, configuration: configuration)
        return Timeline(entries: [entry], policy: .after(Calendar.current.date(byAdding: .minute, value: 15, to: Date())!))
    }

    private func loadEntries() -> [EntryData] {
        let defaults = UserDefaults(suiteName: "group.dev.the-wedge.synapse-app")
        guard let data = defaults?.data(forKey: "widget_entries"),
              let decoded = try? JSONDecoder().decode([EntryData].self, from: data) else {
            return []
        }
        return decoded
    }
}

struct entriesWidgetEntryView: View {
    var entry: EntriesProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "list.bullet.clipboard")
                    .font(.caption)
                Text("Entries")
                    .font(.caption)
                    .fontWeight(.semibold)
            }
            
            if entry.entries.isEmpty {
                Text("No entries yet")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(entry.entries.prefix(3), id: \.id) { entry in
                    HStack {
                        Circle()
                            .fill(statusColor(entry.status))
                            .frame(width: 6, height: 6)
                        Text(entry.title)
                            .font(.caption2)
                            .lineLimit(1)
                    }
                }
            }
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }

    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "done", "completed":
            return .green
        case "in-progress", "inprogress":
            return .orange
        default:
            return .gray
        }
    }
}

struct entriesWidget: Widget {
    let kind: String = "entriesWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: EntriesProvider()) { entry in
            entriesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Entries")
        .description("Shows your recent database entries.")
    }
}

#Preview(as: .systemSmall) {
    entriesWidget()
} timeline: {
    EntriesEntry(date: .now, entries: [
        EntryData(id: "1", title: "Buy groceries", status: "pending"),
        EntryData(id: "2", title: "Walk the dog", status: "done"),
        EntryData(id: "3", title: "Call mom", status: "in-progress")
    ], configuration: ConfigurationAppIntent())
}
