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

### Greeting — make it cooler / more human

- [x] The briefing greeting ("Good evening.") feels seen-a-thousand-times.
      Redesign it to feel more human, engaging, and distinctly Field Lab —
      companion voice (between Coach and Ops), not a stock time-of-day label
- [x] Explore: varied/observational lines, time + field-state aware, maybe a
      typographic treatment that isn't just a bold Inter display line
      → Landed the "conversational count sentence": keep the greeting opener,
      then one flowing line that inlines the real per-type counts, each colored
      by its AA-safe type shade (`entryKicker`). Stakes "need you this week",
      present things "are still here". Plurals + subject-verb agreement handled.

---

## Home — Field Lab Polish, pass 2

Structural/navigation pass. The board and capture surfaces are in; this pass is
about where things LIVE (sidebar vs. settings, weekly→incoming as a tab) and
re-cutting the two heaviest content surfaces (Stakes, Detail).

### Appearance — dark-default, drop "system"

- [ ] Default scheme must be **dark** (the Field Lab instrument-panel look reads
      dark-first). New installs land in dark, not "system".
- [ ] User can only toggle **Light ⇄ Dark**; remove the "System" option entirely
      from the appearance control. `ThemePreference` drops `"system"` (becomes
      `"light" | "dark"`), default `"dark"`; migrate any persisted `"system"`
      value to the resolved scheme (or just to dark) on read.
- [ ] Touches `lib/*theme*` preference storage, `contexts/theme-context.tsx`
      (default + no system resolution), and the appearance switcher (currently a
      3-segment control in `app-menu.tsx` → becomes a 2-state toggle).

### Weekly → "Incoming" screen (tab destination)

- [ ] The planned weekly view becomes an **Incoming** screen: still scoped to
      THIS WEEK, but shows everything with a date this week — **deadlines, todos,
      AND events** together (not just one type), time-ordered.
- [ ] Make it a real tab-bar destination (the long-planned "weekly in tab bar"
      item — now resolved as Incoming). Decide the tab layout: Home · Add ·
      Incoming · Calendar, or fold Calendar in. Resolve the orphaned
      `DayDetailSheet` and the old `weekly-overview-card` / `week-strip` here.
- [ ] Empty state when nothing's dated this week (observational, on-brand).

### Stakes — redesign

- [ ] The Stakes zone (currently the time-to-edge runway of fuel gauges) needs a
      rethink — decide whether the runway metaphor earns its complexity or a
      simpler, denser readout serves the "what's on the line" job better.
- [ ] Hold the Field Lab vocabulary (mono readouts, edge-bars, electric type
      codes, sharp corners); brand tokens read-only. WCAG AA in both schemes.

### Detail screen — redesign

- [ ] `app/detail.tsx` needs a from-scratch redesign to match the Field Lab
      language (it predates the rebrand). Per-type treatment (deadline vs. todo
      vs. idea/someday vs. event), the metadata rows, and the action bar.
- [ ] Reuse the established atoms/molecules (edge-bars, mono metadata,
      `entryColor`/`entryKicker`); no new token values.

### Home header — suppress top-left icon, move settings out

- [ ] Decide the fate of the home header's top-left icon (currently a `menu`
      button opening `AppMenu`, the de-facto sidebar). Likely **suppress it** and
      relocate everything it holds (appearance, etc.) into a dedicated Settings
      screen.
- [ ] If the menu/sidebar goes away, re-home its contents (appearance toggle, any
      actions) and remove `AppMenu` or repurpose it as the Settings screen body.

### Settings screen — conceptualize

- [ ] Define a proper **Settings screen** (destination, not a popover). First
      cut of sections: Appearance (Light/Dark toggle), Notifications, BYOK / API
      key (ties to the AI Integration track), About. Where it's reached from:
      a Settings entry in the tab bar or an avatar/profile tap in the header.
- [ ] This absorbs the old `app-menu` appearance control and becomes the home for
      future config (the "Settings Enhancements" priority item).

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
pass 1 done — greeting redesign, capture-bar rethink, Present readability. The
accent token was also de-conflicted (was identical to `type.todo` cyan → now a
scheme-aware neutral; capture bar wears the ideas/amber code).

**Home — Field Lab Polish, pass 2** order: appearance dark-default + drop system
(small, unblocks the look) → settings screen + suppress header menu (where config
lives) → Incoming tab (weekly resolved) → Stakes redesign → Detail redesign
(largest). Section-title sketches remain the lowest-priority polish.
