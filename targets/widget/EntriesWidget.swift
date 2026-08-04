import WidgetKit
import SwiftUI

// MARK: - Timeline Entry

struct EntriesEntry: TimelineEntry {
    let date: Date
    let entries: [EntryData]
    let configuration: ConfigurationAppIntent
    
    var isEmpty: Bool { entries.isEmpty }
}

// MARK: - Entry Data Model

struct EntryData: Codable, Identifiable {
    let id: String
    let title: String
    let status: String
    let type: String? // "todo", "deadline", "idea"
}

// MARK: - Timeline Provider

struct EntriesProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> EntriesEntry {
        EntriesEntry(date: Date(), entries: placeholderEntries, configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> EntriesEntry {
        let entries = loadEntries()
        return EntriesEntry(date: Date(), entries: entries, configuration: configuration)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<EntriesEntry> {
        let entries = loadEntries()
        let entry = EntriesEntry(date: Date(), entries: entries, configuration: configuration)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private var placeholderEntries: [EntryData] {
        [
            EntryData(id: "1", title: "Review project proposal", status: "in-progress", type: "todo"),
            EntryData(id: "2", title: "Reply to the studio", status: "scheduled", type: "todo"),
            EntryData(id: "3", title: "Submit quarterly report", status: "pending", type: "deadline"),
            EntryData(id: "4", title: "Research competitor analysis", status: "scheduled", type: "idea"),
            EntryData(id: "5", title: "Fix navigation bug", status: "done", type: "todo"),
        ]
    }

    private func loadEntries() -> [EntryData] {
        guard let defaults = UserDefaults(suiteName: "group.dev.the-wedge.synapse-app"),
              let data = defaults.data(forKey: "widget_entries"),
              let decoded = try? JSONDecoder().decode([EntryData].self, from: data) else {
            return []
        }
        return decoded
    }
}

// MARK: - Widget Entry View

struct EntriesWidgetEntryView: View {
    var entry: EntriesProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SmallWidgetView(entry: entry)
            case .systemMedium:
                MediumWidgetView(entry: entry)
            default:
                SmallWidgetView(entry: entry)
            }
        }
        .containerBackground(Color.paper, for: .widget)
    }
}

// MARK: - Small Widget (2-3 items)

struct SmallWidgetView: View {
    let entry: EntriesEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            WidgetHeader(title: "Entries", icon: "list.bullet.clipboard")
            
            Spacer(minLength: Spacing.sm)
            
            // Content
            if entry.isEmpty {
                EmptyStateView()
            } else {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    ForEach(entry.entries.prefix(3)) { entry in
                        EntryRow(entry: entry)
                    }
                }
            }
            
            Spacer(minLength: Spacing.xs)
        }
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: Radius.lg)
                .fill(Color.surface)
        )
    }
}

// MARK: - Medium Widget (4-5 items + summary)

struct MediumWidgetView: View {
    let entry: EntriesEntry

    private var displayEntries: [EntryData] {
        Array(entry.entries.prefix(5))
    }
    
    private var stats: (done: Int, pending: Int, inProgress: Int) {
        let done = entry.entries.filter { $0.status == "done" || $0.status == "completed" }.count
        let pending = entry.entries.filter { $0.status == "pending" || $0.status == "scheduled" }.count
        let inProgress = entry.entries.filter { $0.status == "in-progress" || $0.status == "inprogress" }.count
        return (done, pending, inProgress)
    }

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            // Left: Header + Entries
            VStack(alignment: .leading, spacing: 0) {
                WidgetHeader(title: "Entries", icon: "list.bullet.clipboard")
                
                Spacer(minLength: Spacing.sm)
                
                if entry.isEmpty {
                    EmptyStateView()
                    Spacer()
                } else {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        ForEach(displayEntries) { entry in
                            EntryRow(entry: entry)
                        }
                    }
                    Spacer(minLength: Spacing.xs)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            // Right: Stats (Bento mini-card)
            if !entry.isEmpty {
                StatsCard(stats: stats)
                    .frame(width: 80)
            }
        }
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: Radius.lg)
                .fill(Color.surface)
        )
    }
}

// MARK: - Widget Header

struct WidgetHeader: View {
    let title: String
    var icon: String = "" // retained for call-site compatibility; no longer rendered

    var body: some View {
        // The kicker is the only all-caps element — mono signal layer, muted
        // ink (the neutral accent is reserved for the primary action, not chrome).
        Text(title.uppercased())
            .font(.system(size: 11, weight: .semibold, design: .monospaced))
            .tracking(0.8)
            .foregroundStyle(Color.inkMuted)
    }
}

// MARK: - Entry Row

struct EntryRow: View {
    let entry: EntryData

    var body: some View {
        HStack(spacing: Spacing.sm) {
            // Status/Type dot
            Circle()
                .fill(accentColor)
                .frame(width: 6, height: 6)

            // Title — the actual content, so primary ink, not muted.
            Text(entry.title)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.ink)
                .lineLimit(1)

            Spacer()
        }
    }

    private var accentColor: Color {
        if entry.status == "done" || entry.status == "completed" {
            return .success
        }

        if let type = entry.type?.lowercased() {
            switch type {
            case "todo": return .typeTodo
            case "deadline": return .typeBills
            case "idea": return .typeIdea
            default: return .typeTodo
            }
        }

        return statusColor
    }

    private var statusColor: Color {
        switch entry.status.lowercased() {
        case "done", "completed":
            return .success
        case "in-progress", "inprogress":
            return .typeTodo
        case "deadline", "urgent":
            return .typeBills
        default:
            return .inkMuted
        }
    }
}

// MARK: - Stats Card (Medium widget)

struct StatsCard: View {
    let stats: (done: Int, pending: Int, inProgress: Int)

    var body: some View {
        VStack(spacing: Spacing.sm) {
            StatItem(count: stats.done, label: "Done", color: .success)
            StatItem(count: stats.pending, label: "Pending", color: .inkMuted)
            StatItem(count: stats.inProgress, label: "Active", color: .typeTodo)
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radius.md)
                .fill(Color.surfaceSubtle)
        )
    }
}

// MARK: - Stat Item

struct StatItem: View {
    let count: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            // Display numeral — mono signal layer, tabular.
            Text("\(count)")
                .font(.system(size: 18, weight: .semibold, design: .monospaced))
                .foregroundStyle(color)

            Text(label.uppercased())
                .font(.system(size: 8, weight: .semibold, design: .monospaced))
                .tracking(0.4)
                .foregroundStyle(Color.inkMuted)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Empty State

struct EmptyStateView: View {
    var body: some View {
        // Plain, instrument-panel — no sparkles, no mascot. Teach the next move.
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("Nothing yet")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color.ink)

            Text("Capture a thought to fill the field.")
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(Color.inkMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

// MARK: - Widget Definition

struct entriesWidget: Widget {
    let kind: String = "entriesWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: EntriesProvider()) { entry in
            EntriesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Entries")
        .description("View your recent entries at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    entriesWidget()
} timeline: {
    EntriesEntry(date: .now, entries: [
        EntryData(id: "1", title: "Review quarterly report", status: "in-progress", type: "todo"),
        EntryData(id: "2", title: "Reply to the studio", status: "scheduled", type: "todo"),
        EntryData(id: "3", title: "Submit invoices", status: "done", type: "deadline"),
    ], configuration: ConfigurationAppIntent())
}

#Preview(as: .systemMedium) {
    entriesWidget()
} timeline: {
    EntriesEntry(date: .now, entries: [
        EntryData(id: "1", title: "Review quarterly report", status: "in-progress", type: "todo"),
        EntryData(id: "2", title: "Reply to the studio", status: "scheduled", type: "todo"),
        EntryData(id: "3", title: "Submit invoices", status: "done", type: "deadline"),
        EntryData(id: "4", title: "Renew the lease", status: "pending", type: "deadline"),
        EntryData(id: "5", title: "Update documentation", status: "in-progress", type: "todo"),
    ], configuration: ConfigurationAppIntent())
}
