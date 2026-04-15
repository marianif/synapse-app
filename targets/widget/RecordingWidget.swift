import WidgetKit
import SwiftUI

// MARK: - Voice Input Widget
// A quick-capture widget that deep links to voice-input screen

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
        .containerBackground(Color.surfaceBase, for: .widget)
    }
}

// MARK: - Small Widget (Main capture button)

struct SmallVoiceWidgetView: View {
    var body: some View {
        Link(destination: URL(string: "synapseapp:///voice-input")!) {
            VStack(spacing: Spacing.sm) {
                // Microphone icon
                ZStack {
                    Circle()
                        .fill(Color.brandPrimaryContainer)
                        .frame(width: 56, height: 56)
                    
                    Image(systemName: "mic.fill")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(Color.surfaceBase)
                }
                
                Text("Voice")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.textSecondary)
                
                Text("Capture")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(Color.textTertiary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

// MARK: - Medium Widget (Capture + recent captures)

struct MediumVoiceWidgetView: View {
    var body: some View {
        HStack(spacing: Spacing.lg) {
            // Main capture button
Link(destination: URL(string: "synapseapp:///voice-input")!) {
                VStack(spacing: Spacing.xs) {
                    ZStack {
                        Circle()
                            .fill(Color.brandPrimaryContainer)
                            .frame(width: 48, height: 48)
                        
                        Image(systemName: "mic.fill")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(Color.surfaceBase)
                    }
                    
                    Text("Record")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color.textSecondary)
                }
            }
            
            // Quick tips
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("QUICK CAPTURE")
                    .font(.system(size: 9, weight: .semibold))
                    .tracking(0.5)
                    .foregroundStyle(Color.textTertiary)
                
                Text("Tap to open voice input")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.textSecondary)
                
                Text("Capture ideas instantly")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Color.textTertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: Radius.lg)
                .fill(Color.surfaceContainer)
        )
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