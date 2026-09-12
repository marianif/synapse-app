# Product

## Register

product

## App type

companion tool

## Users

A capture-first person who opens the app mid-thought to get something down before it is gone: an idea worth keeping, a note to self, a to-do, a deadline they need to honor ("book the dentist this month"). They are ADHD-adjacent, so out of sight is out of mind: a captured thought that isn't immediately resurfaced is a thought that's gone. They need their projects and their looming deadlines present at a glance, and they need capture to be frictionless enough to survive a five-second window of attention. They open the app one-handed, mid-task, and need to feel switched on, not soothed. This is a second brain, not a task manager: the job is holding everything they can't hold themselves, not grooming a tidy list.

## Product Purpose

Synapse is a second brain for an ADHD mind: a place to dump what's in your head the instant you think it, and a board that talks the dumped material back to you so it never disappears. **Capture is the core action** — the pen key in the tab bar takes any thought and resolves it into the right thing: an idea, a note, a todo, or a deadline. Tap for text, long-press for voice. That global capture is one trigger, no second add-path — but inside a project surface, a **scoped FAB** arms the composer by kind (idea / todo / deadline) so a user who already knows what they're adding skips the classify stage. Scoped, per-surface FABs are legal; a second *global* add-path is not. **The core affordance is visibility** — your projects and your live deadlines are present and glanceable the moment you open, never curated down to a "today" view or hidden behind filters. The Agenda is a separate activation surface: it leads with the entries you flagged as your **next actions**, then lists every opening the board actually offers, grouped by kind (return / continue / prepare / decide), instead of narrating the database or hiding real openings behind a count cap. Projects organize macro life areas; ideas, todos, and deadlines attach to a project or stand free; reflective notes live in the diary, linkable to an idea or a project but never actionable.

## Platform Fidelity

custom-cross-platform (distinct) — one Field Lab language on both iOS and Android. iOS system tint and Android Material You are both overridden: the electric type palette is the product's information system and cannot be re-seeded by the OS.

## Primary Devices

phone-only

## Brand Personality

Activating, charged, direct. Cool and sharp the way an instrument panel is — switched on, never soothed. The narrative layer is **your own handwriting, not the app being cozy**: margin scrawls on the panel, a voice that is **on your side** — it holds everything you capture, acknowledges what you did as a plain fact ("that came off the board today", "you came back to it and it moved"), and resurfaces the things you'd forget with a next step small enough to take. Never guilt, never nagging, never empty celebration.

**Is:** activating · charged · alive · direct · on your side
**Is not:** warm-cozy · gamified · corporate · sedating · guilt-tripping

## Anti-references

- Corporate productivity tools (the rejected blue-lavender "Kinetic Equilibrium" system felt corporate)
- Gamified / habit-tracker apps: streaks, badges, confetti, dopamine loops
- Pastel-illustration journaling apps: decorative mush, mascots, spot art
- Editorial-calm planners (the rejected warm "The Field" direction read as sedating, not activating)
- Pure white / pure black interfaces
- Plain task/todo lists where the board is just an unstructured checklist with no projects, no memory, and nothing that resurfaces

## Design Principles

1. **Capture is the core action.** The pen key in the tab bar is the primary affordance: tap for text, long-press for voice. One thumb gesture takes any thought and resolves it into an idea, a note, a todo, or a deadline. No *second global* add-path — but scoped FABs inside a specific surface (a project, the projects list) are legal when they arm a pre-classified composer, since they shorten the path rather than duplicate it. Anything actionable becomes a todo, deadline, or idea; anything reflective is a diary note. Friction here is the one unforgivable failure.
2. **Show projects and deadlines first.** The core glanceable affordance is an immediate overview of your projects and your live deadlines — present the moment the app opens, never behind a filter or a "today" curation. For this brain, out of sight is gone.
3. **Everything at a glance — activation is a layer, never a curtain.** Every open item stays visible and tappable on the Field. The Agenda leads with the entries you flagged as next and lists every available opening (grouped by kind); it never replaces or hides the complete board.
4. **Equal volume.** Every entry type glows in its own electric color at the same intensity. An idea is as alive as a looming deadline; it just glows in a different color. Ideas stay present as direct rows and may receive a decision invitation in the Agenda, so a captured idea is never only a line of prose the eye can skim past. Presence, not pressure — never dim the non-urgent, never let urgency drown the board.
5. **Commit to horizons, not fake dates.** A deadline takes a precise date or a window — this week, this month, this year — and warms up as the window closes. A todo with no date is not a failed todo; it's a "someday", marked by a quiet badge, never a color downgrade.
6. **Make the next move obvious.** The Agenda is activating, not descriptive. It leads with the next actions you flagged for yourself, then gives every other opening a reason, a small next move, and one direct action: return to a quiet project, continue something already started, prepare for what is coming, or decide what an idea wants to become. It never shames, nags, or guilts, and it never floods the user with choices: when it lists every opening, it groups them by kind so the set reads as structure, not a wall.

## Entity Model

The board is built from four things, plus projects and the diary:

- **Project** — a top-level macro life area (a dev project, an art collective). Not a board item itself; referenced by name and shown in the projects overview. Ideas, todos, and deadlines can be attributed to a project or stand autonomous.
- **Idea** — an autonomous capture, promotable into a project. It shows as a direct row in the overview and can receive a decision invitation in the Agenda when it needs a home, a later place, or release.
- **Todo** — the actionable spine; autonomous or project-linked. **Deadline** is a flavor of todo that keeps its strong color identity and takes a date or a horizon. A todo with **no date** is the "someday" case: recognizable by a **badge, never by a separate color**.
- **Diary note** — reflective, never actionable, never on the board. Linkable to an idea or a project, or free.
- **Task (subtask)** — a checklist line owned by a todo or deadline (never an idea). It has no date, no status enum, no project of its own — it's crossed in or crossed out. The UI surfaces progress (e.g. "3/5") only. **Completing every subtask does not complete the parent** — closing the entry stays a deliberate user decision, never automated.
- **Next action** — a user-set STATE on any entry (todo, deadline, or idea): the thing they chose to do next. It is not a type and not a system priority: it never recolors, dims, or reorders the board (Equal Volume holds). It is named in the home greeting (up to three, the rest folded into a count that opens the Agenda) and listed in full at the top of the Agenda. Cleared automatically when the entry is completed. **Not applicable to projects, diary notes, or subtasks.**

**Events are not part of the model.** The persona does not live event-to-event; the calendar of social plans is out of scope. Any prior event concept is removed.

## Accessibility

- WCAG AA contrast in both light and dark schemes. Type-colored text on tints uses the scheme-aware `typeKicker` shades (verified ≥ 4.7:1).
- True light + dark parity is first-class and live: a persisted System / Light / Dark preference (app menu) drives every surface through `useTheme()`.
- Dynamic Type / Android font scale to 2x with no fixed-height tiles or rows; the Caveat handwritten layer scales with the system like any text.
- Touch targets: 44pt iOS / 48dp Android throughout, including the capture key and item rows.
- The "someday" badge carries an accessible label (not color-only), so the undated state is conveyed to assistive tech.
- `useReducedMotion()` respected: tile re-flow becomes instant, the stale-pulse becomes a static outline ring.
