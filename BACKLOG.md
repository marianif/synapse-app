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

## Home — Field Lab Polish

The home board (two-zone Stakes runway + Present cloud/events mosaic + speaking
briefing) is in. These are the next-pass refinements to make it feel alive and
unmistakably ours, not template-grade.

### Section-title sketches

- [ ] Commission/draw custom SVG sketches to bring life to the home section
      titles (`STAKES`, `PRESENT`, the `Coming up` subhead) — hand-drawn marks
      that sit beside or behind the mono kickers, not generic icons
- [ ] Keep them theme-reactive (light/dark) and reduced-motion-safe; tint from
      `entryColor` / `inkMuted`, no new token VALUES
- [ ] Decide: static SVG marks vs. lightly animated (draw-on entrance)

### Present readability

- [ ] PRESENT items text color isn't readable enough — audit chip/tile title
      contrast against the type-tints, esp. faded (ghosted) cloud chips where
      opacity drops to ~0.47
- [ ] Fix: likely raise the freshness opacity floor for the TEXT specifically
      (keep the chip background fading, keep the label legible), or bump the
      ghost floor. Verify WCAG AA on the dimmest visible chip in both schemes

### Capture bar — rethink from scratch

- [ ] The "Capture a thought" bar must be redesigned from scratch (currently a
      cyan pill, the brief's FAB replacement) — it's the primary capture surface
      and the most-touched element; it should feel like the instrument's
      command line, not a generic pill button
- [ ] Reconsider idle vs. recording states, the waveform, and how voice vs. typed
      capture is offered

### Weekly view placement

- [ ] Move the weekly view into the TAB BAR (a destination), not the side menu —
      it's a primary view, not a buried setting
- [ ] (Context: the WeekStrip was already removed from the home scroll; this is
      about where weekly lives in navigation. The DayDetailSheet on home is
      currently orphaned — decide whether to remove it or re-home it here)

### Greeting — make it cooler / more human

- [ ] The briefing greeting ("Good evening.") feels seen-a-thousand-times.
      Redesign it to feel more human, engaging, and distinctly Field Lab —
      companion voice (between Coach and Ops), not a stock time-of-day label
- [ ] Explore: varied/observational lines, time + field-state aware, maybe a
      typographic treatment that isn't just a bold Inter display line

---

## Technical Debt

- [ ] Set up test framework (jest + jest-expo)
- [ ] Performance optimization (list virtualization)

---

## Future Features (Backlog)

- Widget support (iOS/Android home screen widgets)
- Smart Watch widget (Crucial allows live recording)
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

**Home — Field Lab Polish** (parallel design track, not blocking MVP launch):
greeting redesign + capture-bar rethink first (highest-touch, most "seen
before"), then Present readability (a11y), then section-title sketches, then
weekly-in-tabbar.
