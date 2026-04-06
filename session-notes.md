## Goal

Build iOS widgets for an Expo React Native app using `expo-apple-targets`. The user already has a working widget target and wants to add a second "Hello World" widget to the same target.

## Instructions

- Use one target (`targets/widget/`) with multiple widgets via a single `WidgetBundle` — NOT multiple targets
- Keep `WidgetLiveActivity.swift` and `WidgetControl.swift` in the target (user wants them)
- Run `npx expo prebuild -p ios --clean` after changes to `targets/` folder
- Open project in Xcode with `xed ios`

## Discoveries

- `expo-apple-targets` by Evan Bacon (1.2k GitHub stars) generates native Apple targets for Expo
- Widgets need `.containerBackground(.fill.tertiary, for: .widget)` for iOS 17+ gallery visibility
- Widgets need `.configurationDisplayName()` and `.description()` to appear in gallery
- iOS Simulator is slow to refresh widget gallery; may need to change `kind` string to force refresh (e.g., `helloWidgetV2`)
- Each target is a separate Swift module, so LSP errors about missing types across files are expected during development but resolve after prebuild
- The existing `widget()` uses `AppIntentTimelineProvider` + `AppIntentConfiguration`; the new `helloWidget` was initially changed to `TimelineProvider` + `StaticConfiguration` — these are two different APIs, for simple widgets the latter is ok too.

## Accomplished

- Researched `expo-apple-targets` package capabilities
- Created and deleted incorrect separate `targets/hello-widget/` target (user corrected this approach)
- Added `helloWidget` to `targets/widget/widgets.swift` with `HelloProvider` and `helloWidgetEntryView`
- Updated `targets/widget/index.swift` to export `helloWidget()` in the `WidgetBundle`
- Changed `kind` to `"helloWidgetV2"` to force iOS to register the new widget
- Both widgets now show in Xcode Previews

## Relevant files / directories

```
/Users/federicamariani/Desktop/the-wedge/synapse-app/
├── app.json                                    (has @bacons/apple-targets plugin + App Groups)
├── targets/
│   └── widget/
│       ├── index.swift                         (WidgetBundle exports widget(), helloWidget(), widgetControl(), WidgetLiveActivity())
│       ├── widget.swift                        (original widget: Provider, SimpleEntry, widgetEntryView, widget)
│       ├── hello-widget.swift                  (hello widget: HelloProvider, HelloEntry, helloWidgetEntryView, helloWidget)
│       ├── AppIntent.swift                     (ConfigurationAppIntent shared between widgets)
│       ├── WidgetLiveActivity.swift            (kept)
│       ├── WidgetControl.swift                 (kept)
│       ├── expo-target.config.js               (type: "widget", icon from GitHub)
│       └── Info.plist
```

## Next Steps

1. Run `npx expo prebuild -p ios --clean` after any changes to `targets/` folder
2. Guide user through iOS Simulator widget gallery refresh (long press, restart, delete + rebuild)
3. Once both widgets work, optionally add data sharing between app and widgets using `ExtensionStorage`
