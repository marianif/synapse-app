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

- [x] PRESENT items text color isn't readable enough — audit chip/tile title
      contrast against the type-tints, esp. faded (ghosted) cloud chips where
      opacity drops to ~0.47
- [x] Fix: likely raise the freshness opacity floor for the TEXT specifically
      (keep the chip background fading, keep the label legible), or bump the
      ghost floor. Verify WCAG AA on the dimmest visible chip in both schemes
      → Decoupled in `present-constellation.tsx`: freshness now fades a separate
      absolute background layer (`bgOpacity` 0.28→1.0) + the type-dot, while the
      label holds a legible floor (`labelOpacity` 0.74→1.0). Dimmest visible chip
      measures 6.6:1 (light) / 8.3:1 (dark) — well past AA. Cloud chips only carry
      idea/someday types, so the audited tints are ideas + someday.

### Capture bar — rethink from scratch

- [x] The "Capture a thought" bar must be redesigned from scratch (currently a
      cyan pill, the brief's FAB replacement) — it's the primary capture surface
      and the most-touched element; it should feel like the instrument's
      command line, not a generic pill button
      → Rebuilt as the board's COMMAND LINE: sharp `radius.md` corner + a 4px
      clay edge-bar (the board's structural signature), a blinking mono `›`
      caret, and a left-aligned mono placeholder. Dropped the full-clay idle
      slab — clay now goes full-bleed ONLY when recording, so the color shift is
      itself the "listening" signal.
- [x] Reconsider idle vs. recording states, the waveform, and how voice vs. typed
      capture is offered
      → Settled the bar's ROLE: it is the quick IDEA line, both routes inline.
      Idle is a live `TextInput` — type a note + ↵ (or the clay send-key that
      appears once there's text) saves it straight as an `idea` into the Present
      cloud, no navigation. The mic (shown when empty) arms voice; the spoken
      transcript also lands as an idea on stop. Richer entries (bills, deadlines,
      events, dates, recurrence) moved OUT of the bar to a center Add key in the
      tab bar (opens the existing add-modal). Keyboard handled via
      `KeyboardAvoidingView` on the dock. Fixed a pre-existing AA failure:
      recording text was paper-on-cyan (1.6:1) — now cool-near-black on cyan
      (9.6:1). Idle glyphs fall back to inkMuted in light (clay fails AA on the
      light surface); clay identity rides the edge-bar. Same on-clay ink on the
      tab-bar Add key.

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
