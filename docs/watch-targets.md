This is a technical specification for an **Apple Watch Recording System** using `expo-apple-targets`. It outlines the architecture for a "one-tap" recording experience from a widget, transferring audio to a host iOS app for processing.

---

# Technical Requirements: Watch-to-iOS Voice Recording System

## 1. Project Architecture

The system requires three distinct components working in a shared security context:

- **Host App:** Expo/React Native (iOS) – Handles transcription and long-term data storage.
- **Watch App Target:** Native SwiftUI – Handles active `AVAudioRecorder` sessions.
- **Watch Widget Target:** WidgetKit/SwiftUI – The entry point for the "Record" trigger.

## 2. Capability & Entitlement Requirements

Both the iOS app and Watch targets must share the same **App Group** to access shared file directories and `UserDefaults`.

| Requirement            | Key/Identifier                 | Purpose                                               |
| :--------------------- | :----------------------------- | :---------------------------------------------------- |
| **App Group**          | `group.com.bundle.identifier`  | Shared container for audio files and state.           |
| **Microphone Access**  | `NSMicrophoneUsageDescription` | Required in `Info.plist` for both iOS and Watch.      |
| **Background Audio**   | `UIBackgroundModes: ["audio"]` | Allows recording to continue if the wrist is lowered. |
| **Watch Connectivity** | `WatchConnectivity.framework`  | Required for `WCSession` file transfer.               |

## 3. Communication Flow

### A. The "One-Tap" Trigger

- **Mechanism:** Widget uses a `Link` or `AppIntent` with a custom URL Scheme (e.g., `my-app://record`).
- **Action:** Tapping the widget forces the Watch App to the foreground.
- **Deep Linking:** The Watch App must implement `.onOpenURL` to detect the recording intent and auto-start the session.

### B. Audio Session Configuration

- **Category:** `AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .default, policy: .longFormAudio)`
- **Activation:** Audio session must be activated before the recorder starts.
- **Format:** `.m4a` (AAC) or `.wav` for high-quality transcription compatibility.

### C. Data Transfer Strategy

- **Primary Method:** `WCSession.default.transferFile(fileURL, metadata: [:])`.
- **Benefit:** This is a background-managed task. The system handles the transfer even if the user closes the Watch App.
- **Receiver:** The iOS App implements `session(_:didReceive:file:)` in its `WCSessionDelegate`.

## 4. Specific Target Configurations (`expo-apple-targets`)

### Watch App `expo-target.config.js`

The target must be configured as a `watch-app`.

```javascript
module.exports = {
  type: "watch-app",
  name: "MyWatchApp",
  bundleIdentifier: "com.example.app.watch",
  deploymentTarget: "10.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.example.app"],
  },
  infoPlist: {
    NSMicrophoneUsageDescription:
      "This app needs access to the microphone to record notes.",
    WKBackgroundModes: ["audio"],
  },
};
```

### Watch Widget `expo-target.config.js`

The target must be configured as a `widget`.

```javascript
module.exports = {
  type: "widget",
  name: "MyWatchWidget",
  bundleIdentifier: "com.example.app.widget",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.example.app"],
  },
};
```

## 5. Logic Requirements for AI Code Generation

When generating the Swift code, the AI should prioritize:

1.  **State Management:** Use `@StateObject` to track recording duration and status.
2.  **File Management:** Generate unique filenames using timestamps (e.g., `note_20260415_1230.m4a`).
3.  **WCSession Management:** Ensure `WCSession.isSupported()` and `.activate()` are called at app launch.
4.  **Error Handling:** Graceful handling of microphone permission denial and disk space issues.

---

**Is there a specific part of the Swift recording logic or the Expo configuration you want to dive into first?**
