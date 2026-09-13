# Backlog

The work register: milestones, epics, areas, and typed work items.

<!-- Migrated from the legacy two-register format (PLAN.md + BACKLOG.md); the pre-migration bytes are kept in the renamed legacy files. -->

## Unscheduled

### Area — Detail & editing


### Area — Project surface

- Serves: Goal 2 (See it all at a glance)

### Area — Diary & notes

- Serves: Goal 1 (Capture a thought) / Goal 2 (See it all at a glance)

## Milestone — Official Release 1.0.0 <!-- flow:ms:m01vl4baw -->

### Area — Onboarding & guidance

- Serves: Goal 1 (Capture a thought) / Goal 2 (See it all at a glance)
- [ ] [feature] per-section how-to sheets — a bottom sheet on each app section explaining what the page does. @month

### Area — Brand & identity

- [ ] [design] `craft splash-screen` — a charged first-load brand moment that clears before the board appears. @month

### Area — Legal & compliance

- [ ] [feature] privacy policy and legal — hosted policy plus in-app links (settings + onboarding). @month — partial: in-app links shipped in Settings → About (2026-09-13); hosted policy URLs still placeholders, no onboarding link

### Area — Localization

- [ ] [feature] internationalization — i18n infrastructure, string extraction, locale switch. effort: L @week

### Area — Widgets

- Serves: Goal 2 (See it all at a glance)
- [x] [design] `redesign entries-widget` — bring the home-screen entries widget up to the Field Lab language. @month
- [x] [design] `redesign recording-widget` — align the recording widget with the Field Lab language. @month
- [x] [feature] habits home-screen widget — today's cadences as presence only, each row carrying the habit's identity tone; no streaks. effort: M @month → shipped 2026-09-13 — HabitsWidget.swift plus the widget_habits store wiring
- [x] [feature] next-action widget — the one entry the user flagged as next, one focused thing with no choice paralysis. effort: S @month → shipped 2026-09-13 — NextActionWidget.swift
- [x] [feature] iOS 18 capture controls — speak and type control-center widgets. effort: S @month → shipped 2026-09-13 — CaptureControl.swift

### Area — Settings

- [x] [design] `shape settings` — split settings into meaningful subroutes instead of one flat screen. @month → shipped 2026-09-10 — settings hub + Notifications / Confirmations / About subroutes shipped

### Area — Notifications

- Serves: Goal 2 (See it all at a glance)
- [x] [bug] duplicate deadline reminders on edit — editing a deadline re-scheduled without cancelling the prior request, so reminders stacked. → shipped 2026-09-12 — deterministic identifiers plus cancel-before-schedule
- [x] [bug] completed deadlines kept firing — completing or meeting an entry re-scheduled but never cancelled its reminder. → shipped 2026-09-12 — entry listener cancels on completed or met
- [x] [bug] launch reschedule wiped project-return reminders — the global cancel took every pending notification, not just deadlines. → shipped 2026-09-12 — scoped cancel preserves project returns, clears legacy untagged
- [x] [bug] recurring reminders fire once and never re-arm — the next instance is only scheduled at launch, never after a delivery. → shipped 2026-09-13 — next eight instances pre-armed per series with deterministic per-instance ids; a throttled foreground resync refills the lookahead
- [x] [bug] 64-pending-notification cap unmanaged — many deadlines can overflow the iOS limit with no priority or cap. → shipped 2026-09-13 — one coordinator plans deadlines, habits, and project returns, arming the soonest 60
- [x] [bug] dormant-project reminder burst — every active project past its 7-day window fired about 60s after launch, all at once. @month → shipped 2026-09-12 — stale return windows are dropped instead of re-armed; a future window still schedules normally
- [x] [bug] project returns re-arm on every entry change — any entry mutation reschedules all projects; the 7-day window is keyed to last_opened_at, so the clock itself no longer resets. → shipped 2026-09-13 — the entry listener syncs only the project(s) the entry left or joined, read from getOriginalState
- [x] [feature] configurable deadline lead time — let the user choose to be notified ahead of a deadline, not only at its time. → shipped 2026-09-13 — Remind me setting (at time / 10m / 30m / 1h / 1 day); an armed-deadline ledger keeps a missed lead a once-only immediate nudge
- [x] [feature] configurable dormant-project reminder behavior — a Settings choice of drop, one summary, or staggered decides how elapsed windows surface; drop is the current default. → shipped 2026-09-13 — dormancy markers re-surface a still-quiet project at most weekly
- [x] [feature] deadline reminder deep-link — tapping a deadline reminder should open its entry, not just the app. → shipped 2026-09-13 — response handler routes deadline taps to /edit and clears the cold-start response
- [x] [design] `clarify deadline-reminder-copy` — the body always reads "Deadline today", even when it fires days out or points at a project. → shipped 2026-09-13 — body states the remaining gap and the owning project

## Milestone — Release 1.1.0 <!-- flow:ms:m01tjqm0q -->

### Area — Settings

- [ ] [design] `shape appearance` — appearance subroute: multiple themes, left/right-hand layout toggle, and more. @month

### Area — Habits

- Serves: Goal 3 (Hold a cadence)
- [x] [feature] habits data model — the habits table (title, required reason, cadence, reminder, project link) and habit_completions, with migration, types, slice and thunks. effort: L @week → shipped 2026-09-12 — schema v22 plus store slice and thunks
- [x] [feature] habit capture door — a fifth resolver door ("every day") arming the reason, cadence and reminder workbench. effort: M @week → superseded 2026-09-12 — replaced by the /habit modal editor
- [x] [feature] habit notifications — a habits preference, next-instance scheduler, settings switch, deep-link, and the reason shown verbatim in the body. effort: M @week → shipped 2026-09-12 — scheduleHabitNotification plus the settings toggle
- [x] [design] `craft habits` — the cadence surface: today list, presence strip, the reason resurfaced, and the empty state. @week → shipped 2026-09-12 — Habits tab built, agenda tab removed
- [x] [feature] habit FAB and composer — a scoped per-surface FAB opening a composer with the required reason field. effort: M @week → superseded 2026-09-12 — no FAB per DESIGN; the /habit modal editor shipped instead
- [ ] [feature] project screen habit section — when a project has linked habits, show them on the project screen with their cadence and presence; render nothing when it has none. effort: M @month
- [x] [task] remove the Agenda concept — route, tab trigger, icon, and the dead getTodayAgenda helper. effort: S @week → shipped 2026-09-12 — done; the goldie marketing flow is tracked separately below
- [x] [task] generalize recurrence expansion — let cadence-only habits reuse expandRecurringEntry without a DbEntry. effort: S @week → shipped 2026-09-12 — expandCadence plus expandHabitCadence
- [x] [feature] habit detail — read-only info, easy-read stats, and a month/year history grid; row tap opens it, swipe Edit opens the editor. effort: M @week → shipped 2026-09-12
- [x] [feature] habit emoji — autonomous glyph with a locked project-emoji inheritance when linked. effort: S @week → shipped 2026-09-12 — schema v23
- [ ] [task] goldie agenda flow — point the store screenshot flow at the Habits tab. @month
- [x] [design] `colorize habits` — habit color selection: a per-habit color picker plus the token support, applied to the history grid and the habit row glyph. @week → shipped 2026-09-12 — free Skia hue wheel; tint/mark/ink derived per scheme, hue stored as an int


