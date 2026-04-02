# BACKLOG — Synapse App

## Native Modules

### Android Speech Recognizer

- [ ] Create Android native module (`modules/speech-recognizer/`) mirroring iOS implementation
- [ ] Implement `SpeechRecognizerModule.kt` with Speech Recognition API
- [ ] Create `SpeechRecognizer.podspec` equivalent for Android (not needed, but create gradle config)
- [ ] Add required Android permissions in plugin
- [ ] Test speech-to-text functionality on Android

---

## AI Integration

### OpenAI API Integration

- [ ] Connect voice-input results to OpenAI API
- [ ] Define JSON schema for entry prefilling:
  ```typescript
  type ParsedEntry = {
    type: "task" | "event" | "someday" | "deadline";
    title: string;
    description?: string;
    date?: string; // ISO date
    time?: string; // HH:mm
    duration?: number; // minutes
    recurrence?: "daily" | "weekly" | "monthly" | "yearly";
    priority?: "high" | "medium" | "low";
    tags?: string[];
  };
  ```
- [ ] Implement API client with retry/error handling
- [ ] Add loading state and error feedback in UI
- [ ] Create streaming response handler for real-time feedback

---

## Settings & Configuration

### BYOK (Bring Your Own Key) Support

- [ ] Add API key input field in Settings screen
- [ ] Secure storage for API key (expo-secure-store)
- [ ] Toggle to enable/disable AI features
- [ ] Usage tracking (optional: display quota usage)
- [ ] Validate API key on save

### Settings Enhancements

- [ ] Theme selection (Dark Sanctuary / Light / System)
- [ ] Haptic feedback toggle
- [ ] Data export (JSON/CSV)

---

## UI/UX Improvements

### Voice Input Screen

- [ ] Redesign with more polished aesthetics
- [ ] Add animated waveform/visualizer during recording
- [ ] Improve processing state UI (spinner, progress)
- [ ] Add result preview before confirmation
- [ ] Smooth transitions between states (idle → recording → processing → result)

### General UI Polish

- [ ] Consistent spacing using design tokens
- [ ] Refine glassmorphism effects
- [ ] Add micro-animations for delight
- [ ] Accessibility improvements (VoiceOver/TalkBack support)

---

## Technical Debt

- [ ] Set up test framework (jest + jest-expo)
- [ ] Performance optimization (list virtualization)

---

## Future Features (Backlog)

- Widget support (iOS/Android home screen widgets)
- Smart Watch widget
- Calendar sync (Google Calendar, Apple Calendar)
- Collaboration features (share lists)
- Smart reminders based on location/context

---

## Priority Order

1. **Android Speech Recognizer** — Core functionality parity
2. **OpenAI Integration** — Core value proposition
3. **BYOK Settings** — Enables MVP launch
4. **Voice Input UI** — User experience
5. **Settings Enhancements** — Configuration
