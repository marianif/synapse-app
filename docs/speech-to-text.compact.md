Goal
The user wants to implement a Speech-to-Text feature in an Expo React Native app. The feature includes:

1. A custom Expo Native Module wrapping iOS SFSpeechRecognizer to handle audio recording and transcription.
2. A new Voice Input Screen where the transcription UI lives.
3. A Long-Press gesture on the existing Floating Action Button (FAB) on the home screen to navigate to the Voice Input Screen.
4. An iOS Home Screen Widget that, when tapped, deep links to the Voice Input Screen and automatically starts recording.
   Instructions

- Tech Stack: Expo, expo-router, expo-modules-core (for native Swift module), expo-widgets (for iOS widget), @bacons/apple-targets (already in app.json).
- Architecture: New Architecture is enabled ("newArchEnabled": true).
- Routing: App scheme is synapseapp://. The widget should deep link to synapseapp://voice-input?autoStart=true.
- Current Status: Planning phase complete. No code has been written yet.
- Pending User Decisions: Before starting implementation, the next agent should ask or assume defaults for:
  1. Output Destination: Should the transcribed text pre-fill the existing /modal screen, or create a database entry directly?
  2. Widget Size: systemSmall (icon only) or systemMedium (with label)?
  3. Recognition Mode: Cloud-based (higher accuracy, requires internet) or On-device (offline, privacy-focused)?
     Discoveries
- expo-widgets Constraints: The library is in alpha. It uses a 'widget' directive and @expo/ui/swift-ui primitives. Crucially, widgets cannot record audio directly; they must deep link to the main app to trigger native capabilities.
- Project Configuration: app.json already includes @bacons/apple-targets, which will seamlessly support the expo-widgets extension target. The bundle identifier is dev.the-wedge.synapse-app.
- Native Requirements: The Swift module will require SFSpeechRecognizer and AVAudioEngine. Info.plist must include NSSpeechRecognitionUsageDescription and NSMicrophoneUsageDescription.
- FAB Component: The current FAB (components/organisms/fab.tsx) is a simple Pressable with a glow effect. It needs an onLongPress prop added.
  Accomplished
- Documentation Review: Analyzed expo-widgets SDK documentation and mapped its API (createWidget, WidgetEnvironment, @expo/ui/swift-ui) to native SwiftUI concepts.
- Codebase Analysis: Read and analyzed key files to understand current navigation, FAB implementation, and app configuration.
- Feasibility Check: Confirmed the proposed architecture is fully compatible with the existing stack.
- Planning: Developed a 4-phase implementation plan:
  1. Scaffold Native Speech Module (Swift).
  2. Create app/voice-input.tsx and useSpeechToText hook.
  3. Update FAB to support onLongPress.
  4. Configure and build the iOS Widget.
     Relevant files / directories
- /Users/federicamariani/Desktop/synapse-app/app.json (Read: Contains plugin config, bundle ID, and scheme)
- /Users/federicamariani/Desktop/synapse-app/app/(tabs)/index.tsx (Read: Home screen containing the FAB)
- /Users/federicamariani/Desktop/synapse-app/components/organisms/fab.tsx (Read: FAB component to be modified)
- app/voice-input.tsx (To be created: New route for voice input)
- modules/expo-speech-to-text/ (To be created: Expo Native Module directory)
- widgets/ (To be created: Widget source files)
