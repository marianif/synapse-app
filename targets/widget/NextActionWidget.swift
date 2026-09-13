import WidgetKit
import SwiftUI

// MARK: - Next Action Widget
//
// The one entry the user flagged as their next action — a single focused
// thing, no choice paralysis. Tapping deep links into the entry editor.

// MARK: - Timeline Entry

struct NextActionEntry: TimelineEntry {
    let date: Date
    let entry: EntryData?
    let configuration: ConfigurationAppIntent
}

// MARK: - Timeline Provider

struct NextActionProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> NextActionEntry {
        NextActionEntry(
            date: Date(),
            entry: EntryData(
                id: "1",
                title: "Reply to the studio",
                status: "active",
                type: "todo",
                isNext: 1,
                dueDate: "16/09/2026"
            ),
            configuration: ConfigurationAppIntent()
        )
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> NextActionEntry {
        NextActionEntry(date: Date(), entry: loadNextAction(), configuration: configuration)
    }

    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<NextActionEntry> {
        let entry = NextActionEntry(date: Date(), entry: loadNextAction(), configuration: configuration)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    /// The flagged entry, unless it is already done — the app clears the flag
    /// on completion, this is the defensive half of that contract.
    private func loadNextAction() -> EntryData? {
        WidgetStore.entries().first {
            $0.isNext == 1 && $0.status != "completed" && $0.status != "met"
        }
    }
}

// MARK: - Widget Entry View

struct NextActionWidgetEntryView: View {
    var entry: NextActionProvider.Entry

    var body: some View {
        NextActionSmallView(entry: entry.entry)
            .containerBackground(Color.paper, for: .widget)
    }
}

// MARK: - Small Widget — a poster for one task.
//
// Kicker up top, then the anchor row — clay kind-disc, type label, due chip —
// and the task itself weight-bearing at the bottom. The flex sits above the
// anchor so short titles never leave a dead band under the kicker.

private struct NextActionSmallView: View {
    let entry: EntryData?

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Kicker(text: "NEXT")

            if let entry {
                Link(destination: entry.editURL) {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Spacer(minLength: 0)

                        HStack(spacing: Spacing.sm) {
                            KindDisc(type: entry.type)

                            Text(entry.type?.uppercased() ?? "ENTRY")
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .tracking(0.8)
                                .foregroundStyle(entry.kickerColor)

                            Spacer(minLength: Spacing.sm)

                            if let due = entry.dueLabel {
                                Text(due.uppercased())
                                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                    .tracking(0.8)
                                    .foregroundStyle(entry.dueTint)
                            }
                        }

                        Text(entry.title)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(Color.ink)
                            .lineLimit(3)
                            .minimumScaleFactor(0.85)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                }
                .accessibilityLabel("Next: \(entry.title)")
            } else {
                EmptyNextView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Kind disc — the clay seal marking what this thing is.

private struct KindDisc: View {
    let type: String?

    private var systemName: String {
        switch type?.lowercased() {
        case "todo": return "checkmark"
        case "deadline": return "clock"
        case "idea": return "lightbulb"
        default: return "circle"
        }
    }

    var body: some View {
        Circle()
            .fill(Color.clay)
            .frame(width: 30, height: 30)
            .overlay(
                Image(systemName: systemName)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.onClay)
            )
            .keyShadow()
    }
}

// MARK: - Empty State — sends the user to the board to pick one.

private struct EmptyNextView: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///")!) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Spacer(minLength: 0)

                Circle()
                    .fill(Color.surface)
                    .frame(width: 30, height: 30)
                    .overlay(
                        Image(systemName: "arrow.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color.ink)
                    )
                    .keyShadow()

                Text("Nothing next")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.ink)

                Text("Mark your next action on the board.")
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(Color.inkMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
    }
}

// MARK: - Widget Definition

struct nextActionWidget: Widget {
    let kind: String = "nextActionWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: NextActionProvider()) { entry in
            NextActionWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Next Action")
        .description("Your one chosen next action, front and center.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    nextActionWidget()
} timeline: {
    NextActionEntry(
        date: .now,
        entry: EntryData(
            id: "1",
            title: "Reply to the studio about the rebrand scope",
            status: "active",
            type: "todo",
            isNext: 1,
            dueDate: "16/09/2026"
        ),
        configuration: ConfigurationAppIntent()
    )
}

#Preview(as: .systemSmall) {
    nextActionWidget()
} timeline: {
    NextActionEntry(date: .now, entry: nil, configuration: ConfigurationAppIntent())
}
