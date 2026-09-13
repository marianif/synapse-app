import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Capture Controls
//
// Control Center, Action button, and Lock Screen controls for the two capture
// intents. Controls live in the widget extension and are discovered through
// the bundle. iOS 18+, so every type carries the guard.

// MARK: - Speak Control

@available(iOS 18.0, *)
struct speakControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "speakControl") {
            ControlWidgetButton(
                action: OpenURLIntent(URL(string: "synapseapp:///?capture=voice")!)
            ) {
                Label("Speak", systemImage: "mic.fill")
            }
            // The tier-1 action earns the clay slab — same rule as the app.
            .tint(Color.clay)
        }
        .displayName("Voice Capture")
        .description("Start a voice capture from anywhere.")
    }
}

// MARK: - Type Control

@available(iOS 18.0, *)
struct typeControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "typeControl") {
            ControlWidgetButton(
                action: OpenURLIntent(URL(string: "synapseapp:///?capture=text")!)
            ) {
                Label("Type", systemImage: "keyboard")
            }
            .tint(Color.clay)
        }
        .displayName("Type Capture")
        .description("Jot a thought with the keyboard.")
    }
}
