# Goals

## Thesis

Synapse is a second brain for an ADHD mind: you dump what's in your head the instant you think it, and the board talks it back so it never disappears. One thumb gesture on the center tab-bar pen key (tap for text, long-press for voice) takes any thought and resolves it into an idea, a todo, a deadline, or a diary note. The board then reads the dumped material back to you in your own handwriting — the deadline you've carried for ten days, the idea you sketched a week ago, last night's diary trace. We win when a thought that would have been gone is instead held and resurfaced.

## Model journey

companion tool: capture → trust → depend → expand

## Goal 1 — Capture a thought

- Outcome: any thought is dumped and resolved into the right thing before it is gone.
- Measure: a pen-tap or share-in resolves into a classified entry within 5 seconds of opening the app (capture-to-resolution rate).
- Primary actions: tap the pen key for text, long-press for voice; the composer auto-classifies into idea / todo / deadline / diary note; the share extension funnels in through the same capture.

## Goal 2 — See it all at a glance

- Outcome: projects and live deadlines are present the moment the app opens, never curated down to a "today" view.
- Measure: 0-tap scan — a user sees projects + live deadlines without tapping, every open; D7 return.
- Primary actions: open the app; read the field (projects, deadlines, todos, ideas at equal volume); flag an entry as your next action and see it named back in the greeting.

## Goal 3 — Hold a cadence

- Outcome: a repeated intention the user chose is present today and completable in one tap, so keeping it stops depending on memory. Each habit carries the user's own reason, which the app holds back to them instead of rewarding with points.
- Measure: weekly habit-instance completion and return to the Habits tab; encouragement is always the user's own stated reason, never an extrinsic reward.
- Primary actions: open the Habits tab; mark today's instance done; add a habit with a required reason, a cadence, and an optional nudge; link a habit to a project or leave it autonomous.

## Critical path

Capture. Everything hangs on the pen key: it owns the tab-bar center, the slab accent, the 5-second window. Glance is what capture preserves — the whole field stays present so nothing captured ever slips out of sight.

## Bans

- No second global add-path. Capture lives on the tab-bar pen key; scoped per-surface FABs are legal only when they arm a pre-classified composer.
- No "today" curation on home. The whole field stays present; filters and "today" views are banned.
- Equal Volume Rule. An idea is as loud as a looming deadline; non-urgent types are never dimmed.
- Diary never appears on the board. Reflective is not actionable; they don't share surfaces.
- Settings never above the fold. Header menu only.
- Destructive actions are tier 3 regardless of frequency. Delete lives in the detail sheet, never as a swipe on the board.
- No gamification. Streaks, badges, confetti are banned as actions and visuals. The "someday" badge is informational, the one sanctioned badge. **Scoped exception — the Habits cadence surface only:** a habit may encourage the user with their own stated reason for pursuing it, shown verbatim and in their voice. This is intrinsic motivation, not a reward loop; no streak count, flame, badge, points, or confetti appears on Habits or anywhere else.

## Accent color budget

The scheme-aware neutral slab (`accent.clay`) is spent on the tier-1 capture key, the composer's send/confirm button, and the tier-2 scoped FABs (project FAB, projects-list create FAB). Supporting actions use tonal surfaces plus the 6px EntryDot / mono kicker; they never take the slab. The three electric type-codes (deadline coral, todo cyan, idea amber) are content colors, not action colors — they identify what a row is, never what tapping it does.

Habits are a new entity with no electric type-code. A habit's color is a user-picked **hue** (free wheel); the system derives the tint, mark, and ink from it per scheme, so any pick stays readable and cohesive. It is a content color for identity (glyph, presence strip, history grid), never an action color and never the slab. A neutral hue is the default until the user picks one.
