# Actions

## Thesis

Synapse is a second brain for an ADHD mind — dump what's in your head the instant you think it, and the board talks it back so it doesn't disappear. The wow is **capture**: one thumb gesture on the center tab-bar pen key (tap for text, long-press for voice) takes any thought and resolves it into an idea, todo, deadline, or diary note. The wow's silent partner is **glanceable presence** — projects and live deadlines are on-screen the second the app opens, never curated down to a "today" view.

## Tier 1 — Primary

The wow moment. One or two actions; never more.

| Action | Surfaces | Affordance | Success signal |
| --- | --- | --- | --- |
| Capture a thought | Center tab-bar key on every screen (Field, Notes, Project, Projects) | `capture-composer` / `capture-flow` — tap = text, long-press = voice; auto-classifies to idea / todo / deadline / note | User dumped something within 5 s of opening |
| See it all at a glance | Field (`(tabs)/(home)/index.tsx`), Project (`project.tsx`), Projects (`projects.tsx`) | Direct overview + narrative voice, equal-volume, no filters, no "today" curation | User opens app and sees projects + live deadlines instantly, without tapping |

## Tier 2 — Secondary

Useful services. Discoverable but not promoted.

| Action | Surfaces | Affordance | Why tier 2, not tier 1 |
| --- | --- | --- | --- |
| Add an entry to a project by kind | `project.tsx` | `ProjectFab` — scoped FAB that arms `project-composer` pre-classified as idea / todo / deadline | A shortcut on top of tier 1 capture; only reachable once you're inside a project, so it's a service to the wow, not a rival |
| Create a project | `projects.tsx` | `create-fab` reveals `add-project-bar` composer band | Organization scaffold — the board is the point; projects are how it's grouped |
| Open a project | `projects.tsx` → `project.tsx` | Stack push from row | Navigation into the board's macro slice |
| Reflect in the diary | `notes.tsx` + `notes-composer` bottom bar | Peer tab + floating composer | Reflective, deliberately isolated from the actionable board |
| Link a note to a project or idea | Note detail → `link-sheet` / `note-link-stage-view` | Inline action inside the note | Enriches capture; not the capture itself |
| Complete / skip / edit an entry | Board rows via `swipeable-row` + `direct-detail-sheet` | Swipe action + tap-through to detail | Board grooming — necessary but not why you open |
| Check off / add / reorder subtasks | `direct-detail-sheet` via `task-checklist` (todo/deadline only) | Inline checklist with progress readout (e.g. "3/5") | Refinement inside an already-captured entry; completing every subtask never auto-completes the parent |
| Pull an entry into a project | Notes screen + project screen | Inline row action | Post-capture curation |
| Promote an idea to a project | Idea detail / `idea-constellation` | Inline action | Advancement flow, rare relative to capture |
| Set a date or horizon on a todo | Detail sheet + `recurrence-picker` | Inline picker inside detail | Refinement of a captured thing |
| Browse the full list | `app/list.tsx` | Route from `app-header` | Alternative read of the board |
| Browse the calendar | `app/calendar.tsx` | Route from `app-header` | Alternative read of the board |

## Tier 3 — Tertiary

Plumbing and edges. Standard locations, smallest viable affordance.

- Open settings — `(home)/settings.tsx` from `app-header`
- Change theme (System / Light / Dark) — settings
- Notifications preferences — settings
- Delete an entry — destructive row inside `direct-detail-sheet` (confirm)
- Delete a project — project header menu (confirm)
- Delete a diary note — swipe action on note row (confirm + undo)
- Recover from denied speech-recognizer permission — inline banner in composer
- Watch pairing status — settings
- Export / import data — settings (future)

## Cross-tier rules

- **No second global add-path.** Capture lives on the tab-bar pen key. Scoped per-surface FABs (project, projects list) are legal because they arm a pre-classified composer — they shorten the path, they don't duplicate it. A global "+" anywhere else is banned.
- **No "today" curation on home.** The whole field stays present; filters and "today" views are banned.
- **Equal Volume Rule.** An idea is as loud as a deadline. Non-urgent types are never dimmed. This is a hard action-hierarchy rule, not just a visual one.
- **Diary never appears on the board.** Reflective ≠ actionable; they don't share surfaces.
- **Settings never above the fold.** Header menu only.
- **Destructive actions are tier 3 regardless of frequency.** Delete-entry lives in the detail sheet, never as a swipe on the board.
- **No gamification affordances.** Streaks, badges, confetti are banned as actions, not just as visuals. The "someday" badge is informational, not a reward — it's the one sanctioned badge.

## Accent color budget

The scheme-aware **neutral slab** accent (`accent.clay`) is spent on the tier-1 capture key, the composer's send/confirm button, and the tier-2 scoped FABs (`ProjectFab`, projects-list create FAB) — these are the app's committed action affordances and they earn the slab. Tier-2 row-level actions (swipe, tap-through, inline pickers) use tonal surfaces + the 6px `EntryDot` / mono kicker for identity; they never take the slab. Tier 3 lives in `inkMuted`. The three electric type-codes (deadline coral, todo cyan, idea amber) are **content colors, not action colors** — they identify what a row *is*, never what tapping it *does*.
