import WidgetKit
import SwiftUI

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        if context.isPreview {
            return SimpleEntry(date: Date(), configuration: configuration, previewEntries: Provider.mockEntries())
        }
        return SimpleEntry(date: Date(), configuration: configuration)
    }

    static func mockEntries() -> [EntryItem] {
        [
            EntryItem(id: "1", title: "Review design mockups",  type: "task",     scheduledDate: nil, scheduledTime: "09:00", dueDate: nil, dueTime: nil,   notes: nil, status: "pending", recurrenceRule: nil, recurrenceEndDate: nil, createdAt: 0, updatedAt: 0),
            EntryItem(id: "2", title: "Submit Q2 report",       type: "deadline", scheduledDate: nil, scheduledTime: nil,    dueDate: nil, dueTime: "17:00", notes: nil, status: "pending", recurrenceRule: nil, recurrenceEndDate: nil, createdAt: 0, updatedAt: 0),
            EntryItem(id: "3", title: "Team standup",            type: "event",    scheduledDate: nil, scheduledTime: "10:30", dueDate: nil, dueTime: nil,   notes: nil, status: "pending", recurrenceRule: nil, recurrenceEndDate: nil, createdAt: 0, updatedAt: 0),
            EntryItem(id: "4", title: "Read WWDC session notes", type: "someday",  scheduledDate: nil, scheduledTime: nil,    dueDate: nil, dueTime: nil,    notes: nil, status: "pending", recurrenceRule: nil, recurrenceEndDate: nil, createdAt: 0, updatedAt: 0),
            EntryItem(id: "5", title: "Fix onboarding bug",      type: "task",     scheduledDate: nil, scheduledTime: "14:00", dueDate: nil, dueTime: nil,   notes: nil, status: "pending", recurrenceRule: nil, recurrenceEndDate: nil, createdAt: 0, updatedAt: 0),
            EntryItem(id: "6", title: "Deploy hotfix to prod",   type: "deadline", scheduledDate: nil, scheduledTime: nil,    dueDate: nil, dueTime: "18:00", notes: nil, status: "pending", recurrenceRule: nil, recurrenceEndDate: nil, createdAt: 0, updatedAt: 0),
        ]
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        var entries: [SimpleEntry] = []

        // Generate a timeline consisting of five entries an hour apart, starting from the current date.
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate, configuration: configuration)
            entries.append(entry)
        }

        return Timeline(entries: entries, policy: .atEnd)
    }

//    func relevances() async -> WidgetRelevances<ConfigurationAppIntent> {
//        // Generate a list containing the contexts this widget is relevant in.
//    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
    var previewEntries: [EntryItem]? = nil
}

struct EntryItem: Codable {
    let id: String
    let title: String
    let type: String
    let scheduledDate: String?
    let scheduledTime: String?
    let dueDate: String?
    let dueTime: String?
    let notes: String?
    let status: String
    let recurrenceRule: String?
    let recurrenceEndDate: String?
    let createdAt: Int
    let updatedAt: Int
}

private extension Color {
    static let taskAccent     = Color(red: 0.43, green: 0.66, blue: 1.00) // #6EA8FF
    static let deadlineAccent = Color(red: 1.00, green: 0.42, blue: 0.42) // #FF6B6B
    static let eventAccent    = Color(red: 0.75, green: 0.52, blue: 0.99) // #C084FC
    static let somedayAccent  = Color(red: 0.98, green: 0.69, blue: 0.25) // #FBB040
    static let surfaceBase    = Color(red: 0.07, green: 0.07, blue: 0.09) // #131316
    static let surface2       = Color(red: 0.11, green: 0.11, blue: 0.12) // #1B1B1E
    static let primaryText    = Color(red: 0.98, green: 0.98, blue: 0.98) // #FAFAFA
}

private func entryAccentColor(for type: String) -> Color {
    switch type {
    case "task":     return .taskAccent
    case "deadline": return .deadlineAccent
    case "event":    return .eventAccent
    default:         return .somedayAccent
    }
}

private func entryTypeIcon(for type: String) -> String {
    switch type {
    case "task":     return "checkmark.circle"
    case "deadline": return "exclamationmark.circle"
    case "event":    return "calendar"
    default:         return "archivebox"
    }
}

private func displayTime(for item: EntryItem) -> String? {
    if let t = item.scheduledTime ?? item.dueTime, !t.isEmpty { return t }
    if let d = item.scheduledDate ?? item.dueDate, !d.isEmpty { return d }
    return nil
}

struct EntryRowView: View {
    let item: EntryItem
    let accent: Color

    var body: some View {
        HStack(spacing: 7) {
            Circle()
                .fill(accent)
                .frame(width: 6, height: 6)

            Image(systemName: entryTypeIcon(for: item.type))
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(accent)
                .frame(width: 12)

            Text(item.title)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.primaryText)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            if let time = displayTime(for: item) {
                Text(time)
                    .font(.system(size: 10, weight: .regular))
                    .foregroundStyle(Color.primaryText.opacity(0.45))
                    .lineLimit(1)
            }
        }
    }
}

struct widgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var entries: [EntryItem] {
        if let preview = entry.previewEntries { return preview }
        let defaults = UserDefaults(suiteName: "group.dev.the-wedge.synapse-app")
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return (
            defaults?.data(forKey: "widget_entries").flatMap {
                try? decoder.decode([EntryItem].self, from: $0)
            }
        ) ?? []
    }

    var maxRows: Int {
        switch family {
        case .systemSmall:  return 3
        case .systemLarge:  return 8
        default:            return 5
        }
    }

    var body: some View {
        ZStack {
            if entries.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "calendar.badge.plus")
                        .font(.title2)
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color(red: 0.68, green: 0.78, blue: 1.0),
                                         Color(red: 0.30, green: 0.56, blue: 1.0)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    Text("Plan your day")
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text("Add entries in the app to get started")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    HStack {
                        Text("TODAY")
                            .font(.system(size: 11, weight: .semibold))
                            .kerning(0.55)
                            .foregroundStyle(Color.primaryText.opacity(0.45))
                        Spacer()
                        Text("\(entries.count) entries")
                            .font(.system(size: 11, weight: .regular))
                            .foregroundStyle(Color.primaryText.opacity(0.30))
                    }
                    .padding(.bottom, 8)

                    // Entry rows
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(entries.prefix(maxRows), id: \.id) { item in
                            EntryRowView(item: item, accent: entryAccentColor(for: item.type))
                        }
                    }

                    Spacer(minLength: 0)

                    // Overflow indicator
                    if entries.count > maxRows {
                        Text("+\(entries.count - maxRows) more")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color.primaryText.opacity(0.30))
                            .padding(.top, 6)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

extension ConfigurationAppIntent {
    fileprivate static var smiley: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "😀"
        return intent
    }
    
    fileprivate static var starEyes: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "🤩"
        return intent
    }
}

#Preview(as: .systemSmall)  { widget() } timeline: { SimpleEntry(date: .now, configuration: .smiley, previewEntries: Provider.mockEntries()) }
#Preview(as: .systemMedium) { widget() } timeline: { SimpleEntry(date: .now, configuration: .smiley, previewEntries: Provider.mockEntries()) }
#Preview(as: .systemLarge)  { widget() } timeline: { SimpleEntry(date: .now, configuration: .smiley, previewEntries: Provider.mockEntries()) }
