import WidgetKit
import SwiftUI

// MARK: - Voice Input Widget
// A quick-capture widget that deep links to the home board and arms inline
// voice capture there (the standalone voice-input screen was removed).

// MARK: - Timeline Entry

struct VoiceInputEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
}

// MARK: - Timeline Provider

struct VoiceInputProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> VoiceInputEntry {
        VoiceInputEntry(date: Date(), configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> VoiceInputEntry {
        VoiceInputEntry(date: Date(), configuration: configuration)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<VoiceInputEntry> {
        let entry = VoiceInputEntry(date: Date(), configuration: configuration)
        // Update every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
}

// MARK: - Shared: neutral mic disc
//
// The one action color, solid — no gradient, no glow. Color categorizes and
// activates; it never decorates. The disc IS the affordance.

private struct MicButton: View {
    let size: CGFloat
    let iconSize: CGFloat

    var body: some View {
        Circle()
            .fill(Color.clay)
            .frame(width: size, height: size)
            .overlay(
                Image(systemName: "mic.fill")
                    .font(.system(size: iconSize, weight: .semibold))
                    .foregroundStyle(Color.onClay)
            )
    }
}

// MARK: - Widget Entry View

struct VoiceInputWidgetEntryView: View {
    var entry: VoiceInputProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SmallVoiceWidgetView()
            case .systemMedium:
                MediumVoiceWidgetView()
            default:
                SmallVoiceWidgetView()
            }
        }
        .containerBackground(Color.paper, for: .widget)
    }
}

// MARK: - Shared: kicker (the only all-caps element) — mono signal layer.

private struct Kicker: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold, design: .monospaced))
            .tracking(0.8)
            .foregroundStyle(Color.typeTodo)
    }
}

// MARK: - Shared: tonal tile
//
// Structure without a 1px border, without a colored edge-bar — a tonal surface
// lifted off the paper. The 6px dot / mono kicker carry structure, not chrome.

private struct FieldTile<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
                    .fill(Color.surface)
            )
    }
}

// MARK: - Small Widget

struct SmallVoiceWidgetView: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///?capture=voice")!) {
            FieldTile {
                VStack(alignment: .center, spacing: Spacing.md) {
                    Spacer(minLength: 0)

                    MicButton(size: 72, iconSize: 30)

                    Spacer(minLength: 0)

                    Kicker(text: "VOICE")
                }
                .frame(maxWidth: .infinity)
                .padding(Spacing.lg)
            }
        }
    }
}

// MARK: - Medium Widget

struct MediumVoiceWidgetView: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///?capture=voice")!) {
            FieldTile {
                HStack(spacing: Spacing.xl) {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Kicker(text: "VOICE")

                        Text("Capture a thought")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundStyle(Color.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)

                        Text("Tap to start recording, from anywhere.")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundStyle(Color.inkMuted)
                            .lineLimit(2)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    MicButton(size: 56, iconSize: 24)
                }
                .padding(.vertical, Spacing.lg)
                .padding(.leading, Spacing.xl)
                .padding(.trailing, Spacing.lg)
            }
        }
    }
}

// MARK: - Widget Definition

struct voiceInputWidget: Widget {
    let kind: String = "voiceInputWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: VoiceInputProvider()) { entry in
            VoiceInputWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Voice Capture")
        .description("Quickly capture thoughts with your voice.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    voiceInputWidget()
} timeline: {
    VoiceInputEntry(date: .now, configuration: ConfigurationAppIntent())
}

#Preview(as: .systemMedium) {
    voiceInputWidget()
} timeline: {
    VoiceInputEntry(date: .now, configuration: ConfigurationAppIntent())
}