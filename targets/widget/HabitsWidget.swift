import WidgetKit
import SwiftUI

// MARK: - Habits Widget
//
// Today's cadences, presence only — no streaks, no scores. Each row carries
// the habit's identity tone and an 8×8 presence cell for today. Tapping a row
// opens the habit's detail; the overflow opens the Habits tab.

// MARK: - Habit Data Model

struct HabitData: Codable, Identifiable {
    let id: String
    let title: String
    let done: Int
    let glyph: String?
    let tintLight: String?
    let tintDark: String?
    let markLight: String?
    let markDark: String?
    let inkLight: String?
    let inkDark: String?

    enum CodingKeys: String, CodingKey {
        case id, title, done, glyph
        case tintLight = "tint_light"
        case tintDark = "tint_dark"
        case markLight = "mark_light"
        case markDark = "mark_dark"
        case inkLight = "ink_light"
        case inkDark = "ink_dark"
    }

    init(
        id: String,
        title: String,
        done: Int,
        glyph: String? = nil,
        tintLight: String? = nil,
        tintDark: String? = nil,
        markLight: String? = nil,
        markDark: String? = nil,
        inkLight: String? = nil,
        inkDark: String? = nil
    ) {
        self.id = id
        self.title = title
        self.done = done
        self.glyph = glyph
        self.tintLight = tintLight
        self.tintDark = tintDark
        self.markLight = markLight
        self.markDark = markDark
        self.inkLight = inkLight
        self.inkDark = inkDark
    }

    /// Deep link to the habit's detail — the only reader of this model.
    var detailURL: URL {
        let encoded = id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? id
        return URL(string: "synapseapp:///detail?id=\(encoded)")!
    }

    func tint(_ scheme: ColorScheme) -> Color {
        hex(scheme == .dark ? tintDark : tintLight) ?? .surfaceSubtle
    }

    /// Neutral habits keep the success green; hued habits carry their mark.
    func mark(_ scheme: ColorScheme) -> Color {
        hex(scheme == .dark ? markDark : markLight) ?? .success
    }

    func ink(_ scheme: ColorScheme) -> Color {
        hex(scheme == .dark ? inkDark : inkLight) ?? .ink
    }

    private func hex(_ value: String?) -> Color? {
        guard let value else { return nil }
        return Color(hex: value)
    }
}

// MARK: - Timeline Entry

struct HabitsEntry: TimelineEntry {
    let date: Date
    let habits: [HabitData]
    /// DD/MM/YYYY the payload was computed for — empty when never synced.
    let dateKey: String
    let configuration: ConfigurationAppIntent

    var doneCount: Int { habits.filter { $0.done == 1 }.count }

    /// The payload belongs to today unless the app hasn't opened since.
    var stale: Bool {
        guard !dateKey.isEmpty else { return false }
        return dateKey != WidgetClock.todayKey
    }
}

// MARK: - Clock helper (DD/MM/YYYY, matching the app's key format)

private enum WidgetClock {
    static var todayKey: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "dd/MM/yyyy"
        return formatter.string(from: Date())
    }
}

// MARK: - Timeline Provider

struct HabitsProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> HabitsEntry {
        HabitsEntry(
            date: Date(),
            habits: placeholderHabits,
            dateKey: WidgetClock.todayKey,
            configuration: ConfigurationAppIntent()
        )
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> HabitsEntry {
        HabitsEntry(
            date: Date(),
            habits: loadHabits(),
            dateKey: loadDateKey(),
            configuration: configuration
        )
    }

    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<HabitsEntry> {
        let entry = HabitsEntry(
            date: Date(),
            habits: loadHabits(),
            dateKey: loadDateKey(),
            configuration: configuration
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func loadHabits() -> [HabitData] {
        guard let defaults = UserDefaults(suiteName: WidgetStore.suiteName),
              let data = defaults.data(forKey: "widget_habits"),
              let decoded = try? JSONDecoder().decode([HabitData].self, from: data) else {
            return []
        }
        return decoded
    }

    private func loadDateKey() -> String {
        UserDefaults(suiteName: WidgetStore.suiteName)?
            .string(forKey: "widget_habits_date") ?? ""
    }

    private var placeholderHabits: [HabitData] {
        [
            HabitData(id: "1", title: "Morning walk", done: 1, glyph: "🌿", tintLight: "DBF0EC", tintDark: "1E3634", markLight: "2F8F80", markDark: "5CC9B8", inkLight: "1F5F54", inkDark: "A5E3D8"),
            HabitData(id: "2", title: "Read 20 pages", done: 0, glyph: "📖", tintLight: "F7ECD4", tintDark: "382E18", markLight: "B08A1E", markDark: "DDBB57", inkLight: "6E5410", inkDark: "EFD699"),
            HabitData(id: "3", title: "Stretch", done: 0, glyph: nil, tintLight: "F8E3E7", tintDark: "3A2229", markLight: "B3455E", markDark: "E58BA2", inkLight: "7A2C40", inkDark: "F2B8C6"),
            HabitData(id: "4", title: "Practice scales", done: 0, glyph: "🎹"),
        ]
    }
}

// MARK: - Widget Entry View

struct HabitsWidgetEntryView: View {
    var entry: HabitsProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            switch family {
            case .systemMedium:
                MediumHabitsWidgetView(entry: entry)
            default:
                SmallHabitsWidgetView(entry: entry)
            }
        }
        .containerBackground(Color.paper, for: .widget)
    }
}

// MARK: - Header — kicker + today's presence count.

private struct HabitsHeader: View {
    let entry: HabitsEntry

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Spacing.sm) {
            Kicker(text: "HABITS")

            Spacer(minLength: 0)

            if entry.stale {
                // A day the app was never opened: show the payload's date
                // rather than a "today" that may no longer be true.
                Text(entry.dateKey)
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .tracking(0.8)
                    .foregroundStyle(Color.inkMuted)
            } else if !entry.habits.isEmpty {
                Group {
                    if entry.doneCount == entry.habits.count {
                        Text("ALL DONE")
                            .foregroundStyle(Color.success)
                    } else {
                        Text("\(entry.doneCount)/\(entry.habits.count)")
                            .foregroundStyle(Color.ink)
                    }
                }
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .tracking(0.8)
            }
        }
    }
}

// MARK: - Row — glyph disc, title, and today's presence cell.

private struct HabitRowView: View {
    let habit: HabitData
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        Link(destination: habit.detailURL) {
            HStack(spacing: Spacing.sm) {
                Circle()
                    .fill(habit.tint(scheme))
                    .frame(width: 20, height: 20)
                    .overlay {
                        if let glyph = habit.glyph {
                            Text(glyph)
                                .font(.system(size: 11))
                        } else {
                            Image(systemName: "repeat")
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(habit.ink(scheme))
                        }
                    }

                Text(habit.title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.ink)
                    .lineLimit(1)

                Spacer(minLength: 0)

                // The presence cell, straight from the app's strip language.
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(habit.done == 1 ? habit.mark(scheme) : Color.surfaceSubtle)
                    .frame(width: 8, height: 8)
            }
            .frame(minHeight: 22)
        }
        .accessibilityLabel(
            "\(habit.title), \(habit.done == 1 ? "done today" : "due today")"
        )
    }
}

// MARK: - Small Widget — three rhythms deep.

struct SmallHabitsWidgetView: View {
    let entry: HabitsEntry

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HabitsHeader(entry: entry)

            if entry.habits.isEmpty {
                EmptyHabitsView()
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(entry.habits.prefix(3)) { habit in
                        HabitRowView(habit: habit)
                    }
                }

                Spacer(minLength: 0)

                if entry.habits.count > 3 {
                    HabitsOverflowRow()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Medium Widget — six rhythms, two columns deep.

struct MediumHabitsWidgetView: View {
    let entry: HabitsEntry

    private var items: [HabitData] { Array(entry.habits.prefix(6)) }
    private var leftColumn: [HabitData] { Array(items.prefix(3)) }
    private var rightColumn: [HabitData] { Array(items.dropFirst(3)) }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HabitsHeader(entry: entry)

            if entry.habits.isEmpty {
                EmptyHabitsView()
            } else {
                HStack(alignment: .top, spacing: Spacing.xl) {
                    column(leftColumn)
                    column(rightColumn)
                }

                Spacer(minLength: 0)

                if entry.habits.count > 6 {
                    HabitsOverflowRow()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder
    private func column(_ items: [HabitData]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(items) { habit in
                HabitRowView(habit: habit)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Overflow Row

private struct HabitsOverflowRow: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///habits")!) {
            HStack(spacing: Spacing.xs) {
                Text("All habits")
                    .font(.system(size: 12, weight: .medium))

                Image(systemName: "chevron.right")
                    .font(.system(size: 9, weight: .semibold))
            }
            .foregroundStyle(Color.inkMuted)
        }
        .accessibilityLabel("All habits")
    }
}

// MARK: - Empty State — the quiet day, and the door to adjust it.

private struct EmptyHabitsView: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///habits")!) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("Nothing repeats today")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.ink)

                Text("Open Habits to adjust your cadences.")
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(Color.inkMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
    }
}

// MARK: - Widget Definition

struct habitsWidget: Widget {
    let kind: String = "habitsWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: HabitsProvider()) { entry in
            HabitsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Habits")
        .description("Today's rhythms, presence only.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    habitsWidget()
} timeline: {
    HabitsEntry(
        date: .now,
        habits: [
            HabitData(id: "1", title: "Morning walk", done: 1, glyph: "🌿", tintLight: "DBF0EC", tintDark: "1E3634", markLight: "2F8F80", markDark: "5CC9B8", inkLight: "1F5F54", inkDark: "A5E3D8"),
            HabitData(id: "2", title: "Read 20 pages", done: 0, glyph: "📖", tintLight: "F7ECD4", tintDark: "382E18", markLight: "B08A1E", markDark: "DDBB57", inkLight: "6E5410", inkDark: "EFD699"),
            HabitData(id: "3", title: "Stretch", done: 0, glyph: nil, tintLight: "F8E3E7", tintDark: "3A2229", markLight: "B3455E", markDark: "E58BA2", inkLight: "7A2C40", inkDark: "F2B8C6"),
            HabitData(id: "4", title: "Practice scales", done: 0, glyph: "🎹"),
        ],
        dateKey: "13/09/2026",
        configuration: ConfigurationAppIntent()
    )
}

#Preview(as: .systemMedium) {
    habitsWidget()
} timeline: {
    HabitsEntry(
        date: .now,
        habits: [
            HabitData(id: "1", title: "Morning walk", done: 1, glyph: "🌿", tintLight: "DBF0EC", tintDark: "1E3634", markLight: "2F8F80", markDark: "5CC9B8", inkLight: "1F5F54", inkDark: "A5E3D8"),
            HabitData(id: "2", title: "Read 20 pages", done: 1, glyph: "📖"),
            HabitData(id: "3", title: "Stretch", done: 0, glyph: nil, tintLight: "F8E3E7", tintDark: "3A2229", markLight: "B3455E", markDark: "E58BA2", inkLight: "7A2C40", inkDark: "F2B8C6"),
            HabitData(id: "4", title: "Practice scales", done: 0, glyph: "🎹"),
            HabitData(id: "5", title: "Journal", done: 1, glyph: "✍️", tintLight: "F7ECD4", tintDark: "382E18", markLight: "B08A1E", markDark: "DDBB57", inkLight: "6E5410", inkDark: "EFD699"),
            HabitData(id: "6", title: "Water the plants", done: 0, glyph: "🪴"),
            HabitData(id: "7", title: "Evening tidy", done: 0, glyph: nil),
        ],
        dateKey: "13/09/2026",
        configuration: ConfigurationAppIntent()
    )
}

#Preview(as: .systemSmall) {
    habitsWidget()
} timeline: {
    HabitsEntry(
        date: .now,
        habits: [],
        dateKey: "13/09/2026",
        configuration: ConfigurationAppIntent()
    )
}
