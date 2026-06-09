# BACKLOG — Synapse App

> Ordered roughly by priority. Each item carries enough context to start cold.
> Aesthetic north star: **"written by hand, agenda-like"** — the field-summary /
> field-briefing voice is becoming the app's signature. Lean into it everywhere.

---

## 🔴 Now — Monetization & First-Run (business-critical)

### Freemium model

The core: **everything is free until a threshold, then we ask for money.** Two
gates to design and define precisely before building.

- [ ] **Define the entry gate.** Free up to _N_ active entries (propose N, e.g.
      ~50–100), then a soft paywall on _creating_ new ones. Reading, editing,
      completing existing entries must stay free forever — never hold a user's
      own data hostage.
- [ ] **Define the AI gate explicitly.** AI is a paid capability. Enumerate
      exactly what counts as "AI" so the line is unambiguous:
  - Voice → structured entry parsing (the OpenAI flow in _AI Integration_ below)
  - Natural-language capture resolution (`capture-resolver.tsx`)
  - Any future smart-reminder / summarization features
- [ ] **Entitlement layer.** A `useEntitlement()` hook + `lib/entitlement.ts`
      reading from AsyncStorage (mirror `lib/settings.ts` pattern) and, later,
      the store receipt. Single source of truth — never gate inline in UI.
- [ ] **Store integration.** `expo-in-app-purchases` or RevenueCat. Decide
      one-time unlock vs. subscription (recommend subscription for AI cost
      pass-through; one-time for the entry cap).
- [ ] **Paywall surface.** A sheet in the field aesthetic (mono readouts, agenda
      voice) triggered at the gate — not a generic modal. Count-aware copy:
      "You're at 47 of 50 stakes."
- [ ] **Restore purchases** + receipt validation.

### Onboarding (first-run)

High importance — sets the whole tone. The app's voice is editorial/agenda;
onboarding must teach the field metaphor without a tutorial-overlay feel.

- [ ] Define the 3–4 screen arc: what is "the field", what are the type codes
      (todo / deadline / event / someday / idea + their colors), how capture
      works (tab-bar key vs. home capture bar), the diary.
- [ ] Permission priming **before** the OS prompt — explain _why_ mic /
      notifications matter, then trigger the real prompt.
- [ ] Persist completion in `lib/settings.ts`
      (`getOnboardingComplete` / `setOnboardingComplete`); route from
      `app/index.tsx`.
- [ ] Optional: seed one example stake + one diary note so the empty field
      isn't a cold start, with a one-tap "clear examples".

### Finish Settings

- [ ] Build out the settings screen (only `theme_preference` is wired today).
      Sections: Appearance (theme toggle — already a component), Capture
      (default entry type — infra exists), Confirmations (see #1 below),
      Notifications, Account / Subscription (ties to freemium), About.
- [ ] Each new preference goes through `lib/settings.ts`, one key each.

---

## 🟡 Next — UX & Interaction

### 1. Custom confirm-alert with "don't ask again" preference ✅ DONE

Replace ad-hoc `Alert.alert` confirms with a branded sheet whose result can be
remembered to local storage.

- [x] Reusable confirm sheet in the field aesthetic
      (`components/molecules/confirm-sheet.tsx`) — replaces the OS `Alert.alert`.
- [x] **"Don't ask me again"** checkbox; persisted via `lib/settings.ts`
      (`getConfirmSkip` / `setConfirmSkip`, keyed by `ConfirmKey`).
- [x] **Adopted:** Home + Diary swipe-to-delete (via `SwipeableRow`, which now
      owns the sheet through `hooks/use-confirm.ts`) and the detail screen's
      non-recurring delete. When the pref is set, delete fires immediately.
- [x] Generic per-key design — diary notes and entries carry independent
      "don't ask" prefs; future destructive actions add a new `ConfirmKey`.

### 9. Inline editing in detail screen (no modal) ✅ DONE

Editing previously bounced to `/modal`. Now in place.

- [x] Detail fields **directly editable in place** — the EDIT action enters an
      inline edit mode: title becomes a display-scale `TextInput` in the signal
      rail's title slot; notes become an inline textarea.
- [x] In-screen metadata editors reuse the existing pickers (`WhenPicker`,
      `RecurrencePicker`) — no modal route. Save/Cancel pair replaces the action
      bar while editing.
- [x] `/modal` is now creation-only (`buildEditParams` removed); detail is a
      true view↔edit surface. Type stays a creation-level decision in `/modal`.

### 4. Incoming / list screen — real filtering & hierarchy ✅ DONE

`app/list.tsx` Incoming lane is now genuinely filtered, not a flat dump.

- [x] Grouped by time horizon (This Week → Later) with the type + status lenses
      composing on top.
- [x] Persistent filter affordances (`components/molecules/list-filter-bar.tsx`)
      in the editorial `diary-filter-bar.tsx` voice — label rows with the active
      one underlined (type underline borrows the type code), no pills. Two
      lenses: type (All / Todos / Events / Deadlines) and status (All / Live /
      Done).
- [x] Section headers already in the agenda voice; filtered-empty state keeps
      the bar visible with a "Clear filters" CTA so the lens can reopen.

---

## 🎨 Aesthetic — "agenda, written by hand"

### 2. Rethink Stakes Runway in the hand-written agenda voice

The field-summary / field-briefing established a beautiful "written like an
agenda" feel. `stakes-runway.tsx` is already title-first / mono-when-label, but
should be pushed further toward that hand-written editorial vibe.

- [ ] Restyle Stakes Runway to read like a printed/handwritten agenda, matching
      `field-summary.tsx` and `field-briefing.tsx`.
- [ ] Keep the established token policy (danger on overdue, sage on done, tonal
      rule not 1px border — see component header doc). No new token values.
- [ ] This "agenda feel" is becoming the app's core aesthetic — treat this as a
      reference implementation other zones follow.

---

## 🧪 Experimental — explore before committing

### 5. An "ideas" orbit in the Diary

Very experimental. Brainstorm whether the orbit-console metaphor (the
breathing-dots channel reads from `field-console/orbit-console.tsx`) could host
**ideas inside the Diary**.

- [ ] Prototype: do ideas deserve their own orbit/channel in the diary surface?
- [ ] Define the interaction — does it read aloud (tap-to-read like the field
      orbit) or just cluster/visualize idea notes?
- [ ] Decide keep / kill after a throwaway prototype; don't over-invest early.

---

## 🤖 AI Integration

### OpenAI API Integration

> **Gated behind the freemium AI tier** — see Monetization above.

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

## 🧱 Technical Debt

- [ ] Performance optimization (list virtualization)

---

## 🔮 Future Features

- Widget support (iOS/Android home-screen widgets) — _iOS in progress_
- Smart Watch widget (crucial: allows live recording)
- Calendar sync (Google Calendar, Apple Calendar)
- Collaboration features (share lists)
- Smart reminders based on location / context
