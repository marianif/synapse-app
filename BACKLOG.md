# Backlog

The work register: milestones, epics, areas, and typed work items.

<!-- Migrated from the legacy two-register format (PLAN.md + BACKLOG.md); the pre-migration bytes are kept in the renamed legacy files. -->

## Unscheduled

### Area — Detail & editing


### Area — Project surface

- Serves: Goal 2 (See it all at a glance)

### Area — Diary & notes

- Serves: Goal 1 (Capture a thought) / Goal 2 (See it all at a glance)

### Area — Revenue (later)

- [ ] [feature] AI & sync subscription — a monthly auto-renewable add-on (separate entitlement) for AI-powered features and remote DB sync. Open: standalone vs lifetime-gated; metered quota vs unlimited. Only once those features exist. effort: L

## Milestone — Official Release 1.0.0 <!-- flow:ms:m01vl4baw -->

### Area — Onboarding & guidance

- Serves: Goal 1 (Capture a thought) / Goal 2 (See it all at a glance)
- [ ] [feature] per-section how-to sheets — a bottom sheet on each app section explaining what the page does. @month

### Area — Brand & identity

- [ ] [design] `craft splash-screen` — a charged first-load brand moment that clears before the board appears. @month

### Area — Legal & compliance

- [ ] [feature] privacy policy and legal — hosted policy plus in-app links (settings + onboarding). @month — partial: in-app links shipped in Settings → About (2026-09-13); hosted policy URLs still placeholders, no onboarding link; must also cover the lifetime purchase and the future auto-renewing subscription terms

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

### Area — Monetization

- [ ] [design] `define pricing layers` — lock the boundary: 7-day no-card trial → capped free (8 projects · 3 habits · 20 open entries · 5 notes · no export) → `pro` via monthly subscription or lifetime purchase, both removing every cap. Prices locked: $1.99/mo, $19.99 lifetime, and a $9.99 lifetime intro shown only while the trial is active (the same SKU doubles as the active-subscriber crossgrade). Remaining: the copy deck, the "open entries count, completing frees a slot" rule, widgets/watch staying free, and grandfathering for installs already over a cap. effort: M @month
- [ ] [design] `craft paywall` — the upgrade surface in the Field Lab language: a monthly-vs-lifetime selector, trial days left and Pro status, the limits named plainly, one direct action. Monthly $1.99 always; lifetime $19.99, shown struck to $9.99 while the trial is active or the user is an active monthly subscriber. No gamification, no pressure timer. effort: M @month — built 2026-09-13 — real surface at app/paywall.tsx + components/molecules/plan-card.tsx + lib/pricing.ts; monthly/lifetime selector with trial-only or subscriber `$9.99` intro, contextual limit line from the `reason` param; purchase + Restore inert until RevenueCat
- [ ] [feature] trial lifecycle — 7-day trial starts at first launch with every feature on; expiry falls back to the capped free tier; purchase restores full access. effort: M @week — partial 2026-09-13: the trial clock, fallback-to-capped-free, and foreground/expiry refresh shipped (lib/entitlements.ts, contexts/entitlement-context.tsx); purchase-restore waits on RevenueCat
- [ ] [feature] plan & restore settings — a Settings → Plan subroute: trial/Pro status, days left, upgrade CTA, restore purchases, manage (future). effort: S @month — waits on RevenueCat (restore needs a real store product)

### Area — Payments & entitlement

- [ ] [feature] entitlement model — the local source of truth for trial + `pro`: a slice exposing `isPro`, `isTrialActive`, `trialDaysLeft`, the active plan kind (monthly vs lifetime), subscription status (active / grace / expired), and cap helpers; consumed by project/habit/entry/note creation and export. effort: M @week — shipped 2026-09-13 minus RevenueCat: lib/entitlements.ts (pure domain), contexts/entitlement-context.tsx (isPro / isTrialActive / trialDaysLeft / planKind / hasFullAccess), hooks/use-caps.ts, and the Dev · Plan simulator in Settings; the paid plan and subscription status arrive with RevenueCat
- [ ] [feature] cap enforcement — gates on `createProject`, `promoteIdeaToProject`, `createHabit` (store/thunks/habits.ts:34), entry creation, note creation, and `exportData` (lib/export.ts:207). Projects count active rows (the 6 seeded macro-areas included → 2 free slots); entries count open rows only; notes count all `diary_entries`. effort: M @week — shipped 2026-09-13 — gates on project create ((projects)/index.tsx), habit create (create-only; edits pass), note save (draft preserved via the composer's boolean onSave), and export (settings/data.tsx), each opening /paywall directly via useUpgrade with the tripped limit passed as a `reason` param (the interim LimitSheet was removed); `promoteIdeaToProject` still has no screen caller (ungated, harmless), entry capture intentionally ungated
- [x] [task] free-cap seed scenario — a dev fixture landing every cap at once (8 active projects + 1 archived, 3 habits incl. paused, 20 open + 2 closed entries, 5 notes) so the gates are testable in one shot. effort: S @week → shipped 2026-09-13 — `free-caps-full` in lib/dev-seed.ts
- [ ] [feature] RevenueCat integration — SDK + config plugin, one default offering (monthly auto-renewable $1.99, lifetime non-consumable $19.99, intro lifetime $9.99) sharing the `pro` entitlement, purchase flow, restore-on-launch, and error handling. Store intro trial stays off. iOS only for 1.0.0; purchases only exercise in a TestFlight/sandbox build. effort: L @week
- [ ] [feature] subscription lifecycle & crossgrade — renewal, grace period, billing retry, expiry auto-downgrade to the capped free tier, and the active-subscriber upgrade to the discounted lifetime SKU (a separate one-time product surfaced only while monthly is active; the discount is UI-enforced since the store can't prorate). effort: L @week
- [ ] [feature] trial persistence — local `trial_started_at` plus a RevenueCat subscriber-attribute mirror so a reinstall can't reset the 7 days; anonymous RevenueCat ids reset on reinstall, so a stable app user id (IDFV) or future login is required. effort: M @week
- [ ] [task] App Store product & review setup — subscription group + monthly product ($1.99), lifetime non-consumable ($19.99), intro lifetime SKU ($9.99, surfaced only while the trial is active or to active subscribers), metadata, paywall screenshots, and a review note explaining trial → monthly/lifetime and the discounted SKU. effort: S @month

## Milestone — Release 1.1.0 <!-- flow:ms:m01tjqm0q -->

### Area — Settings

- [ ] [design] `shape appearance` — appearance subroute: multiple themes, left/right-hand layout toggle, and more. @month

### Area — Data

- [x] [feature] export your data — one shareable archive of entries, projects, diary notes, tasks, habits, preferences, and attached photos. effort: M @month
- [ ] [feature] import and restore — restore a Synapse archive into the store, with a conflict policy for existing rows. effort: L @month

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


