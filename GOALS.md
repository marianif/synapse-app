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
- Primary actions: open the app; read the field (projects, deadlines, todos, ideas at equal volume); resurface through the narrative voice.

## Critical path

Capture. Everything hangs on the pen key: it owns the tab-bar center, the slab accent, the 5-second window. Glance is what capture preserves — the whole field stays present so nothing captured ever slips out of sight.

## Bans

- No second global add-path. Capture lives on the tab-bar pen key; scoped per-surface FABs are legal only when they arm a pre-classified composer.
- No "today" curation on home. The whole field stays present; filters and "today" views are banned.
- Equal Volume Rule. An idea is as loud as a looming deadline; non-urgent types are never dimmed.
- Diary never appears on the board. Reflective is not actionable; they don't share surfaces.
- Settings never above the fold. Header menu only.
- Destructive actions are tier 3 regardless of frequency. Delete lives in the detail sheet, never as a swipe on the board.
- No gamification. Streaks, badges, confetti are banned as actions and visuals. The "someday" badge is informational, the one sanctioned badge.

## Accent color budget

The scheme-aware neutral slab (`accent.clay`) is spent on the tier-1 capture key, the composer's send/confirm button, and the tier-2 scoped FABs (project FAB, projects-list create FAB). Supporting actions use tonal surfaces plus the 6px EntryDot / mono kicker; they never take the slab. The three electric type-codes (deadline coral, todo cyan, idea amber) are content colors, not action colors — they identify what a row is, never what tapping it does.
