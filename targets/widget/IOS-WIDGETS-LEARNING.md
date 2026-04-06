# iOS Widgets Explained for JavaScript Developers

This guide explains how your app's iOS widgets work, translating Swift concepts into JavaScript equivalents.

---

## The Big Picture

Your widgets are built using **WidgetKit** (Apple's widget framework) and **SwiftUI** (Apple's declarative UI framework). Think of it like React, but for native iOS widgets.

```
JavaScript/React          iOS/SwiftUI
─────────────────────────────────────────
React Component    →     View (struct)
useState           →     @State
props              →     struct properties
useEffect          →     TimelineProvider
render()           →     var body: some View
```

---

## File-by-File Breakdown

### 1. `index.swift` — The Widget Bundle (Entry Point)

```swift
@main
struct exportWidgets: WidgetBundle {
    var body: some Widget {
        widget()
        helloWidget()
        entriesWidget()
        widgetControl()
        WidgetLiveActivity()
    }
}
```

**What it does:** Registers all your widgets with iOS.

| Concept | JavaScript Analogy |
|---------|-------------------|
| `@main` | The app entry point (like `main()` function) |
| `WidgetBundle` | A container that holds multiple widgets |
| `struct` | Like a JavaScript object/class hybrid |

This is the **only** file with `@main` — it tells iOS "here are all the widgets to load."

---

### 2. `AppIntent.swift` — Configurable Widget Settings

```swift
struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Configuration" }
    static var description: IntentDescription { "This is an example widget." }

    @Parameter(title: "Favorite Emoji", default: "😃")
    var favoriteEmoji: String
}
```

**What it does:** Defines a configuration users can customize.

| Concept | JavaScript Analogy |
|---------|-------------------|
| `struct` | A TypeScript interface or type alias |
| `WidgetConfigurationIntent` | An interface the widget system expects |
| `@Parameter` | Like defining props with defaults |
| `LocalizedStringResource` | i18n string key (like `t('key')`) |
| `static var` | Class property (exists on the class, not instances) |

---

### 3. `widget.swift` — Your Main Widget (Static)

```swift
struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: configuration)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        var entries: [SimpleEntry] = []

        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate, configuration: configuration)
            entries.append(entry)
        }

        return Timeline(entries: entries, policy: .atEnd)
    }
}
```

**What it does:** Fetches/prepares data for the widget to display.

| Concept | JavaScript Analogy |
|---------|-------------------|
| `TimelineProvider` | Like a data fetching hook (`useEffect` + `useState`) |
| `placeholder` | Skeleton/loading state |
| `snapshot` | Quick preview for widget gallery |
| `timeline` | The actual data with a refresh policy |
| `Timeline<SimpleEntry>` | Array of entries with a reload strategy |
| `async` | `async/await` — same concept! |
| `..<` | Range operator (`0 ..< 5` = `[0, 1, 2, 3, 4]`) |
| `Calendar.current.date(byAdding:)` | `Date` arithmetic (like `date-fns`) |

### The View Layer

```swift
struct widgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            Text("Time:")
            Text(entry.date, style: .time)
            Text("Favorite Emoji:")
            Text(entry.configuration.favoriteEmoji)
        }
    }
}

struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}
```

| Concept | JavaScript Analogy |
|---------|-------------------|
| `struct X: View` | `function X({ entry })` — a React component |
| `var body: some View` | `return (...)` — the render output |
| `VStack` | `View` with `flexDirection: 'column'` |
| `HStack` | `View` with `flexDirection: 'row'` |
| `Text(...)` | `<Text>` or `<span>` |
| `some WidgetConfiguration` | Return type annotation (like `React.FC`) |

---

### 4. `hello-widget.swift` — Simpler Static Widget

This is identical to `widget.swift` but uses `StaticConfiguration` instead of `AppIntentConfiguration`. Use `StaticConfiguration` when your widget has no user-configurable options.

```swift
StaticConfiguration(kind: kind, provider: HelloProvider()) { entry in
    helloWidgetEntryView(entry: entry)
}
```

vs

```swift
AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
    widgetEntryView(entry: entry)
}
```

| Variant | When to Use |
|---------|-------------|
| `StaticConfiguration` | No user settings needed |
| `AppIntentConfiguration` | User can configure (like picking an emoji) |

---

### 5. `entries-widget.swift` — Widget Reading Shared Data

```swift
struct EntryData: Codable {
    let id: String
    let title: String
    let status: String
}
```

**What it does:** Reads entries from a shared storage (`UserDefaults`) that your main app writes to.

```swift
private func loadEntries() -> [EntryData] {
    let defaults = UserDefaults(suiteName: "group.dev.the-wedge.synapse-app")
    guard let data = defaults?.data(forKey: "widget_entries"),
          let decoded = try? JSONDecoder().decode([EntryData].self, from: data) else {
        return []
    }
    return decoded
}
```

| Concept | JavaScript Analogy |
|---------|-------------------|
| `Codable` | `JSON.parse` / `JSON.stringify` — auto-serialization |
| `UserDefaults` | `localStorage` / `AsyncStorage` |
| `suiteName` | App group identifier for sharing data between app and widget |
| `guard let` | Null check + destructuring (like `if (data)` but safer) |
| `try?` | Optional try-catch (returns `nil` on error) |
| `JSONDecoder().decode()` | `JSON.parse(data)` |
| `\.id` | Property accessor for keypaths (`entry => entry.id`) |

---

### 6. `WidgetLiveActivity.swift` — Live Activities (Dynamic Island)

Live Activities show real-time info on the Lock Screen and Dynamic Island (iPhone 14 Pro+).

```swift
struct WidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var emoji: String
    }
    var name: String
}
```

| Concept | JavaScript Analogy |
|---------|-------------------|
| `ActivityAttributes` | A "schema" for your live activity data |
| `ContentState` | Dynamic data that changes during the activity |
| `Hashable` | Must be hashable (like using an object as a Map key) |

```swift
ActivityConfiguration(for: WidgetAttributes.self) { context in
    // Lock screen UI
} dynamicIsland: { context in
    // Dynamic Island UI
}
```

| Region | Description |
|--------|-------------|
| `DynamicIslandExpandedRegion(.leading)` | Left side when expanded |
| `DynamicIslandExpandedRegion(.trailing)` | Right side when expanded |
| `DynamicIslandExpandedRegion(.bottom)` | Bottom section when expanded |
| `compactLeading` | Left side in collapsed state |
| `compactTrailing` | Right side in collapsed state |
| `minimal` | Tiny version when multiple activities |

---

### 7. `WidgetControl.swift` — Interactive Widget Controls

Control widgets let users interact directly with your widget (like toggles, buttons).

```swift
struct widgetControl: ControlWidget {
    static let kind: String = "com.developer.example.widget"

    var body: some WidgetConfiguration {
        AppIntentControlConfiguration(...) { value in
            ControlWidgetToggle(
                "Start Timer",
                isOn: value.isRunning,
                action: StartTimerIntent(value.name)
            )
        }
    }
}
```

| Concept | JavaScript Analogy |
|---------|-------------------|
| `ControlWidget` | Interactive widget type |
| `ControlWidgetToggle` | Toggle switch component |
| `SetValueIntent` | Action triggered by user interaction |
| `ControlConfigurationIntent` | Settings for the control |

---

## Swift Syntax Quick Reference

### Type Annotations

```swift
// Variable declaration
let immutable = "can't change"  // const
var mutable = "can change"       // let (in JS)

// Type annotation
let name: String = "John"
let count: Int = 42
let items: [String] = ["a", "b"]
let config: ConfigurationAppIntent = ConfigurationAppIntent()

// Without annotation (type inferred)
let name = "John"  // String
let count = 42     // Int
```

### Structs (Data Containers)

```swift
// Like a TypeScript interface
struct EntryData {
    let id: String
    let title: String
    var status: String  // var = can be modified
}

// Creating an instance
let entry = EntryData(id: "1", title: "Hello", status: "done")
```

### Functions and Closures

```swift
// Function
func loadEntries() -> [EntryData] {
    return []
}

// Closure (like arrow function)
let add = { (a: Int, b: Int) -> Int in
    return a + b
}

// Closure with shorthand
let add: (Int, Int) -> Int = { $0 + $1 }
```

### Optionals (Null Safety)

```swift
// Optional type (can be nil)
var name: String? = nil

// Force unwrap (crashes if nil — don't do this!)
let forced = name!

// Safe unwrap with guard
guard let safe = name else {
    return  // exit early if nil
}

// Optional chaining
let length = name?.count

// Nil coalescing
let length = name?.count ?? 0
```

### Property Wrappers

```swift
@Parameter(title: "Favorite Emoji", default: "😃")
var favoriteEmoji: String
```

| Wrapper | Purpose |
|---------|---------|
| `@Parameter` | User-configurable setting |
| `@State` | Local component state |
| `@Binding` | Two-way binding |
| `@Published` | Observable property |
| `@Environment` | Injected dependency |

---

## How Widget Data Flow Works

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR MAIN APP                          │
│  (React Native / Expo)                                      │
│                                                              │
│  1. User completes an entry                                  │
│  2. App writes data to UserDefaults (app group)             │
│  3. App calls WidgetCenter.shared.reloadAllTimelines()       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (shared storage)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     WIDGET EXTENSION                         │
│  (Native Swift)                                              │
│                                                              │
│  1. TimelineProvider fetches from UserDefaults               │
│  2. Decodes JSON to EntryData structs                        │
│  3. Renders SwiftUI views                                    │
│  4. iOS displays widget on Home Screen                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Common Tasks

### Reload Widget Data from Your App

```typescript
// In your React Native app
import { WidgetCenter } from '@react-native-ios/widgets';

// Reload all widgets
WidgetCenter.reloadAllTimelines();

// Or reload a specific kind
WidgetCenter.reloadTimelines(ofKind: 'entriesWidget');
```

### Debug Widgets

1. Open Xcode
2. Select your widget scheme
3. Add breakpoints in Swift files
4. Use `print()` for logging (shows in Xcode console)

---

## Glossary

| Term | Definition |
|------|------------|
| WidgetKit | Apple's framework for creating widgets |
| SwiftUI | Apple's declarative UI framework (like React) |
| Timeline | A list of entries with a refresh policy |
| Entry | A snapshot of data at a point in time |
| App Intent | User-configurable parameters for widgets |
| Live Activity | Real-time updates on Lock Screen/Dynamic Island |
| App Group | Shared storage between app and extensions |
| Widget Bundle | Container that holds multiple widgets |

---

## Further Learning

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [App Intents Framework](https://developer.apple.com/documentation/appintents)
- [Swift Language Guide](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/)
