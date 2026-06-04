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

// MARK: - Shared: Gradient mic button

private struct MicButton: View {
    let size: CGFloat
    let iconSize: CGFloat

    var body: some View {
        ZStack {
            // Ambient glow — tinted brand halo, not a black shadow
            Circle()
                .fill(Color.brandPrimary.opacity(0.20))
                .frame(width: size + 16, height: size + 16)
                .blur(radius: 10)

            // Primary CTA gradient (135° brand → brandContainer per DESIGN.md)
            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color.brandPrimary, Color.brandPrimaryContainer],
                        startPoint: UnitPoint(x: 0.15, y: 0.15), // ~135°
                        endPoint: UnitPoint(x: 0.85, y: 0.85)
                    )
                )
                .frame(width: size, height: size)

            Image(systemName: "mic.fill")
                .font(.system(size: iconSize, weight: .semibold))
                .foregroundStyle(Color.surfaceBase)
        }
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
        .containerBackground(Color.surfaceContainerLow, for: .widget)
    }
}

// MARK: - Small Widget

struct SmallVoiceWidgetView: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///?capture=voice")!) {
            VStack(spacing: Spacing.sm) {
                MicButton(size: 60, iconSize: 26)

                VStack(spacing: 2) {
                    Text("Voice Capture")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.textPrimary)

                    Text("TAP TO RECORD")
                        .font(.system(size: 9, weight: .semibold))
                        .tracking(0.55)
                        .foregroundStyle(Color.textTertiary)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

// MARK: - Medium Widget

struct MediumVoiceWidgetView: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///?capture=voice")!) {
            HStack(spacing: Spacing.xl) {
                MicButton(size: 56, iconSize: 22)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("VOICE CAPTURE")
                        .font(.system(size: 9, weight: .semibold))
                        .tracking(0.55)
                        .foregroundStyle(Color.textTertiary)

                    Text("Capture a thought.")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.textPrimary)

                    Text("Tap to start recording instantly.")
                        .font(.system(size: 11, weight: .regular))
                        .foregroundStyle(Color.textSecondary)
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(Spacing.lg)
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