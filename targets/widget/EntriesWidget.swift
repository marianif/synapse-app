import WidgetKit
import SwiftUI

// MARK: - Timeline Entry

struct EntriesEntry: TimelineEntry {
    let date: Date
    let entries: [EntryData]
    /// Open count across the WHOLE list — `entries` is capped at 10, so the
    /// header must never derive its number from just the synced slice.
    let openCount: Int
    let configuration: ConfigurationAppIntent

    var isEmpty: Bool { entries.isEmpty }
}

// MARK: - Timeline Provider

struct EntriesProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> EntriesEntry {
        EntriesEntry(
            date: Date(),
            entries: placeholderEntries,
            openCount: 4,
            configuration: ConfigurationAppIntent()
        )
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> EntriesEntry {
        let entries = WidgetStore.entries()
        return EntriesEntry(
            date: Date(),
            entries: entries,
            openCount: WidgetStore.openCount(fallback: entries),
            configuration: configuration
        )
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<EntriesEntry> {
        let entries = WidgetStore.entries()
        let entry = EntriesEntry(
            date: Date(),
            entries: entries,
            openCount: WidgetStore.openCount(fallback: entries),
            configuration: configuration
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private var placeholderEntries: [EntryData] {
        [
            EntryData(id: "1", title: "Review project proposal", status: "active", type: "todo"),
            EntryData(id: "2", title: "Reply to the studio", status: "scheduled", type: "todo"),
            EntryData(id: "3", title: "Submit quarterly report", status: "pending", type: "deadline"),
            EntryData(id: "4", title: "Research competitor analysis", status: "scheduled", type: "idea"),
            EntryData(id: "5", title: "Fix navigation bug", status: "completed", type: "todo"),
        ]
    }
}

// MARK: - Widget Entry View

struct EntriesWidgetEntryView: View {
    var entry: EntriesProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            switch family {
            case .systemMedium:
                MediumWidgetView(entry: entry)
            default:
                SmallWidgetView(entry: entry)
            }
        }
        .containerBackground(Color.paper, for: .widget)
    }
}

// MARK: - Small Widget — the board, three rows deep.
//
// Rows sit directly on the paper: no container tile, no stats card. The
// kicker carries the only chrome the widget gets.

struct SmallWidgetView: View {
    let entry: EntriesEntry

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HeaderRow(openCount: entry.openCount, isEmpty: entry.isEmpty)

            if entry.isEmpty {
                EmptyStateView()
            } else {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    ForEach(entry.entries.prefix(3)) { item in
                        EntryRow(entry: item)
                    }
                }

                Spacer(minLength: 0)

                if entry.entries.count > 3 {
                    OverflowRow()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Medium Widget — same board, two columns deep.

struct MediumWidgetView: View {
    let entry: EntriesEntry

    private var items: [EntryData] { Array(entry.entries.prefix(6)) }
    private var leftColumn: [EntryData] { Array(items.prefix(3)) }
    private var rightColumn: [EntryData] { Array(items.dropFirst(3)) }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HeaderRow(openCount: entry.openCount, isEmpty: entry.isEmpty)

            if entry.isEmpty {
                EmptyStateView()
            } else {
                HStack(alignment: .top, spacing: Spacing.xl) {
                    column(leftColumn)
                    column(rightColumn)
                }

                Spacer(minLength: 0)

                if entry.entries.count > 6 {
                    OverflowRow()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder
    private func column(_ items: [EntryData]) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            ForEach(items) { item in
                EntryRow(entry: item)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Header — kicker + one honest number.

private struct HeaderRow: View {
    let openCount: Int
    let isEmpty: Bool

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Spacing.sm) {
            Kicker(text: "ENTRIES")

            Spacer(minLength: 0)

            if !isEmpty {
                Group {
                    if openCount > 0 {
                        Text("\(openCount) OPEN")
                            .foregroundStyle(Color.ink)
                    } else {
                        Text("ALL CLEAR")
                            .foregroundStyle(Color.success)
                    }
                }
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .tracking(0.8)
            }
        }
    }
}

// MARK: - Entry Row — a real, tappable row.

private struct EntryRow: View {
    let entry: EntryData

    var body: some View {
        Link(destination: entry.editURL) {
            HStack(spacing: Spacing.sm) {
                Circle()
                    .fill(entry.accentColor)
                    .frame(width: 6, height: 6)

                Text(entry.title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.ink)
                    .lineLimit(1)

                Spacer(minLength: 0)
            }
            .frame(minHeight: 20)
        }
        .accessibilityLabel(entry.title)
    }
}

// MARK: - Overflow Row

private struct OverflowRow: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///")!) {
            HStack(spacing: Spacing.xs) {
                Text("Open board")
                    .font(.system(size: 12, weight: .medium))

                Image(systemName: "chevron.right")
                    .font(.system(size: 9, weight: .semibold))
            }
            .foregroundStyle(Color.inkMuted)
        }
        .accessibilityLabel("Open the board")
    }
}

// MARK: - Empty State — teaches the next move, and takes it.

private struct EmptyStateView: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///?capture=voice")!) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Nothing yet")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.ink)

                Text("Tap to capture a thought.")
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(Color.inkMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
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
        .description("Your board at a glance — tap any entry to open it.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    entriesWidget()
} timeline: {
    EntriesEntry(date: .now, entries: [
        EntryData(id: "1", title: "Review quarterly report", status: "active", type: "todo"),
        EntryData(id: "2", title: "Reply to the studio", status: "scheduled", type: "todo"),
        EntryData(id: "3", title: "Submit invoices", status: "pending", type: "deadline"),
    ], openCount: 7, configuration: ConfigurationAppIntent())
}

#Preview(as: .systemMedium) {
    entriesWidget()
} timeline: {
    EntriesEntry(date: .now, entries: [
        EntryData(id: "1", title: "Review quarterly report", status: "active", type: "todo"),
        EntryData(id: "2", title: "Reply to the studio", status: "scheduled", type: "todo"),
        EntryData(id: "3", title: "Submit invoices", status: "pending", type: "deadline"),
        EntryData(id: "4", title: "Renew the lease", status: "pending", type: "deadline"),
        EntryData(id: "5", title: "Update documentation", status: "scheduled", type: "todo"),
        EntryData(id: "6", title: "Sketch the offsite plan", status: "scheduled", type: "idea"),
        EntryData(id: "7", title: "Book the flights", status: "scheduled", type: "todo"),
    ], openCount: 9, configuration: ConfigurationAppIntent())
}
