import SwiftUI

// MARK: - Shared entry payload
//
// Mirrors what `syncEntriesToWidget` writes into the app group. One model for
// every widget that renders entries, so the shape only changes in one place.

struct EntryData: Codable, Identifiable {
    let id: String
    let title: String
    let status: String
    let type: String? // "todo", "deadline", "idea"
    let isNext: Int?  // 0/1 — the user's chosen next action
    let dueDate: String? // "dd/MM/yyyy" — the horizon window's end date

    enum CodingKeys: String, CodingKey {
        case id, title, status, type
        case isNext = "is_next"
        case dueDate = "due_date"
    }

    init(
        id: String,
        title: String,
        status: String,
        type: String? = nil,
        isNext: Int? = nil,
        dueDate: String? = nil
    ) {
        self.id = id
        self.title = title
        self.status = status
        self.type = type
        self.isNext = isNext
        self.dueDate = dueDate
    }

    /// Deep link back into the app's entry editor.
    var editURL: URL {
        let encoded = id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? id
        return URL(string: "synapseapp:///edit?id=\(encoded)")!
    }

    /// Completed/met reads success green; everything else wears its type code.
    /// The old mapping checked values the database never writes — "done",
    /// "in-progress" — so every dot fell through to muted ink.
    var accentColor: Color {
        switch status.lowercased() {
        case "completed", "met":
            return .success
        default:
            switch type?.lowercased() {
            case "todo": return .typeTodo
            case "deadline": return .typeBills
            case "idea": return .typeIdea
            default: return .inkMuted
            }
        }
    }
}

// MARK: - Dates and type voice, mirrored from the app

extension EntryData {
    /// AA-safe kicker shade for this entry's type — mirrors `useEntryKicker`.
    var kickerColor: Color {
        switch type?.lowercased() {
        case "todo": return .kickerTodo
        case "deadline": return .kickerBills
        case "idea": return .kickerIdea
        default: return .inkMuted
        }
    }

    /// Days from today to the due date; negative = overdue, nil = undated.
    /// `due_date` is stored DD/MM/YYYY (see `use-database.helpers.ts`).
    var daysUntilDue: Int? {
        guard let due = dueDateValue else { return nil }
        let calendar = Calendar.current
        return calendar.dateComponents(
            [.day],
            from: calendar.startOfDay(for: Date()),
            to: calendar.startOfDay(for: due)
        ).day
    }

    /// The app's when-label voice, mirrored from `lib/direct-when.ts`:
    /// "3d over" / "Today" / "Tomorrow" / weekday under a week / "12 Sep".
    var dueLabel: String? {
        guard let days = daysUntilDue, let due = dueDateValue else { return nil }
        if days < 0 { return "\(-days)d over" }
        if days == 0 { return "Today" }
        if days == 1 { return "Tomorrow" }

        let formatter = DateFormatter()
        formatter.locale = .current
        formatter.dateFormat = days < 7 ? "EEE" : "d MMM"
        return formatter.string(from: due)
    }

    /// Charged inside the week (overdue included), muted beyond — the same
    /// threshold as `isWhenCharged`. Overdue reads danger, not the type code.
    var dueTint: Color {
        guard let days = daysUntilDue else { return .inkMuted }
        if days < 0 { return .danger }
        return days < 7 ? kickerColor : .inkMuted
    }

    private var dueDateValue: Date? {
        guard let dueDate else { return nil }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "dd/MM/yyyy"
        return formatter.date(from: dueDate)
    }
}

// MARK: - Shared app-group reader

enum WidgetStore {
    static let suiteName = "group.dev.the-wedge.synapse-app"

    static func entries() -> [EntryData] {
        guard let defaults = UserDefaults(suiteName: suiteName),
              let data = defaults.data(forKey: "widget_entries"),
              let decoded = try? JSONDecoder().decode([EntryData].self, from: data) else {
            return []
        }
        return decoded
    }

    /// Prefers the true open count the app syncs alongside the slice; falls
    /// back to counting the slice for payloads written before that key existed.
    static func openCount(fallback entries: [EntryData]) -> Int {
        if let defaults = UserDefaults(suiteName: suiteName),
           defaults.object(forKey: "widget_open_count") != nil {
            return defaults.integer(forKey: "widget_open_count")
        }
        return entries.filter { $0.status != "completed" && $0.status != "met" }.count
    }
}
