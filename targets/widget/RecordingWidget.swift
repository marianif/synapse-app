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

// MARK: - Shared: keys
//
// The Field Lab action language at widget scale — mirrors
// `components/atoms/disc-button.tsx`: the key carries the shape, the disc
// carries the color, and only the tier-1 key earns the clay slab. Depth is
// one cool shadow per key — no border, no gradient.

private struct DiscKey: View {
    let systemName: String
    let size: CGFloat
    let iconSize: CGFloat

    var body: some View {
        Circle()
            .fill(Color.surface)
            .frame(width: size, height: size)
            .overlay(
                Image(systemName: systemName)
                    .font(.system(size: iconSize, weight: .semibold))
                    .foregroundStyle(Color.ink)
            )
            .keyShadow()
    }
}

private struct SpeakKey: View {
    let height: CGFloat
    let discSize: CGFloat
    let labelSize: CGFloat

    var body: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(Color.clay)
                .frame(width: discSize, height: discSize)
                .overlay(
                    Image(systemName: "mic.fill")
                        .font(.system(size: discSize * 0.42, weight: .semibold))
                        .foregroundStyle(Color.onClay)
                )

            Text("Speak")
                .font(.system(size: labelSize, weight: .semibold))
                .foregroundStyle(Color.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, Spacing.md)
        .frame(maxWidth: .infinity, minHeight: height)
        .background(
            Capsule(style: .continuous)
                .fill(Color.surface)
        )
        .keyShadow()
    }
}

// MARK: - Widget Entry View

struct VoiceInputWidgetEntryView: View {
    var entry: VoiceInputProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallVoiceWidgetView()
                .containerBackground(Color.paper, for: .widget)
        case .systemMedium:
            MediumVoiceWidgetView()
                .containerBackground(Color.paper, for: .widget)
        case .accessoryCircular:
            CircularVoiceWidgetView()
                .containerBackground(for: .widget) { Color.clear }
        case .accessoryRectangular:
            RectangularVoiceWidgetView()
                .containerBackground(for: .widget) { Color.clear }
        default:
            SmallVoiceWidgetView()
                .containerBackground(Color.paper, for: .widget)
        }
    }
}

// MARK: - Small Widget
//
// One composition, not an icon on a card: the tier-1 Speak key up top, its
// two capture companions on the same grid below. Keys sit directly on the
// paper — no tile-in-tile.

struct SmallVoiceWidgetView: View {
    var body: some View {
        VStack(spacing: Spacing.sm) {
            Link(destination: URL(string: "synapseapp:///?capture=voice")!) {
                SpeakKey(height: 58, discSize: 38, labelSize: 20)
            }
            .accessibilityLabel("Speak — start voice capture")

            HStack(spacing: Spacing.sm) {
                Link(destination: URL(string: "synapseapp:///?capture=text")!) {
                    DiscKey(systemName: "keyboard", size: 54, iconSize: 20)
                }
                .accessibilityLabel("Type — capture with the keyboard")

                Link(destination: URL(string: "synapseapp:///list")!) {
                    DiscKey(systemName: "list.bullet", size: 54, iconSize: 22)
                }
                .accessibilityLabel("List — open all entries")
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Medium Widget

struct MediumVoiceWidgetView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Kicker(text: "CAPTURE")

            Spacer(minLength: Spacing.sm)

            HStack(spacing: Spacing.sm) {
                Link(destination: URL(string: "synapseapp:///?capture=voice")!) {
                    SpeakKey(height: 64, discSize: 40, labelSize: 22)
                }
                .accessibilityLabel("Speak — start voice capture")

                Link(destination: URL(string: "synapseapp:///?capture=text")!) {
                    DiscKey(systemName: "keyboard", size: 64, iconSize: 24)
                }
                .accessibilityLabel("Type — capture with the keyboard")

                Link(destination: URL(string: "synapseapp:///list")!) {
                    DiscKey(systemName: "list.bullet", size: 64, iconSize: 26)
                }
                .accessibilityLabel("List — open all entries")
            }
            .frame(maxWidth: .infinity)

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Lock Screen Widgets
//
// Accessory families render in the system's vibrant monochrome material —
// no Field Lab color tokens apply here. SF Symbol + system text only; the
// system handles tinting for both the Lock Screen and StandBy contexts.
// Tapping still deep links into the app, which triggers the same unlock
// prompt as any Lock Screen app launch — see app/(tabs)/(home)/index.tsx's
// `capture=voice` handling for what happens after that.

struct CircularVoiceWidgetView: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///?capture=voice")!) {
            Image(systemName: "mic.fill")
                .font(.system(size: 22, weight: .semibold))
                .widgetLabel("Voice")
        }
    }
}

struct RectangularVoiceWidgetView: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///?capture=voice")!) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: "mic.fill")
                    .font(.system(size: 15, weight: .semibold))

                Text("Capture a thought")
                    .font(.system(size: 13, weight: .medium))
                    .lineLimit(1)
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
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
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

#Preview(as: .accessoryCircular) {
    voiceInputWidget()
} timeline: {
    VoiceInputEntry(date: .now, configuration: ConfigurationAppIntent())
}

#Preview(as: .accessoryRectangular) {
    voiceInputWidget()
} timeline: {
    VoiceInputEntry(date: .now, configuration: ConfigurationAppIntent())
}