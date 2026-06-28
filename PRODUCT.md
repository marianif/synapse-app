# Product

## Register

product

## App type

companion tool

## Users

A capture-first person who opens the app mid-thought to get something down before it is gone: an idea worth keeping, a note to self, a to-do, a deadline they need to honor ("book the dentist this month"). They are ADHD-adjacent, so out of sight is out of mind: a captured thought that isn't immediately resurfaced is a thought that's gone. They need their projects and their looming deadlines present at a glance, and they need capture to be frictionless enough to survive a five-second window of attention. They open the app one-handed, mid-task, and need to feel switched on, not soothed. This is a second brain, not a task manager: the job is holding everything they can't hold themselves, not grooming a tidy list.

## Product Purpose

Synapse is a second brain for an ADHD mind: a place to dump what's in your head the instant you think it, and a board that talks the dumped material back to you so it never disappears. **Capture is the core action** — the pen key in the tab bar takes any thought and resolves it into the right thing: an idea, a note, a todo, or a deadline. Tap for text, long-press for voice; one trigger, no second add-path. **The core affordance is visibility** — your projects and your live deadlines are present and glanceable the moment you open, never curated down to a "today" view or hidden behind filters. A narrative voice, written in your own handwriting, reads the board back to you: the deadline you've been carrying for ten days, the idea you sketched a week ago and never returned to, last night's diary trace. Projects organize macro life areas; ideas, todos, and deadlines attach to a project or stand free; reflective notes live in the diary, linkable to an idea or a project but never actionable.

## Platform Fidelity

custom-cross-platform (distinct) — one Field Lab language on both iOS and Android. iOS system tint and Android Material You are both overridden: the electric type palette is the product's information system and cannot be re-seeded by the OS.

## Primary Devices

phone-only

## Brand Personality

Activating, charged, direct. Cool and sharp the way an instrument panel is — switched on, never soothed. The narrative layer is **your own handwriting, not the app being cozy**: margin scrawls on the panel, observational statements of fact about time ("The dentist has been waiting 10 days"), never comfort, never nagging, never celebration.

**Is:** activating · charged · alive · direct
**Is not:** warm-cozy · gamified · corporate · sedating

## Anti-references

- Corporate productivity tools (the rejected blue-lavender "Kinetic Equilibrium" system felt corporate)
- Gamified / habit-tracker apps: streaks, badges, confetti, dopamine loops
- Pastel-illustration journaling apps: decorative mush, mascots, spot art
- Editorial-calm planners (the rejected warm "The Field" direction read as sedating, not activating)
- Pure white / pure black interfaces
- Plain task/todo lists where the board is just an unstructured checklist with no projects, no memory, and nothing that resurfaces

## Design Principles

1. **Capture is the core action.** The pen key in the tab bar is the primary affordance: tap for text, long-press for voice. One thumb gesture takes any thought and resolves it into an idea, a note, a todo, or a deadline. No FAB, no second add-path. Anything actionable becomes a todo, deadline, or idea; anything reflective is a diary note. Friction here is the one unforgivable failure.
2. **Show projects and deadlines first.** The core glanceable affordance is an immediate overview of your projects and your live deadlines — present the moment the app opens, never behind a filter or a "today" curation. For this brain, out of sight is gone.
3. **Everything at a glance — narrative is a layer, never a curtain.** Every open item stays visible and tappable. The narrative block references items and reads them back; it never replaces or hides them.
4. **Equal volume.** Every entry type glows in its own electric color at the same intensity. An idea is as alive as a looming deadline; it just glows in a different color and lives in a different zone. Presence, not pressure — never dim the non-urgent, never let urgency drown the board.
5. **Commit to horizons, not fake dates.** A deadline takes a precise date or a window — this week, this month, this year — and warms up as the window closes. A todo with no date is not a failed todo; it's a "someday", marked by a quiet badge, never a color downgrade.
6. **Speak in your own handwriting.** The agenda voice states facts about time, plainly and briefly. It may hold you accountable; it may not shame, nag, comfort, or celebrate.

## Entity Model

The board is built from four things, plus projects and the diary:

- **Project** — a top-level macro life area (a dev project, an art collective). Not a board item itself; referenced by name and shown in the projects overview. Ideas, todos, and deadlines can be attributed to a project or stand autonomous.
- **Idea** — an autonomous capture, promotable into a project. The narrative voice resurfaces stale, unpromoted ideas.
- **Todo** — the actionable spine; autonomous or project-linked. **Deadline** is a flavor of todo that keeps its strong color identity and takes a date or a horizon. A todo with **no date** is the "someday" case: recognizable by a **badge, never by a separate color**.
- **Diary note** — reflective, never actionable, never on the board. Linkable to an idea or a project, or free.

**Events are not part of the model.** The persona does not live event-to-event; the calendar of social plans is out of scope. Any prior event concept is removed.

## Accessibility

- WCAG AA contrast in both light and dark schemes. Type-colored text on tints uses the scheme-aware `typeKicker` shades (verified ≥ 4.7:1).
- True light + dark parity is first-class and live: a persisted System / Light / Dark preference (app menu) drives every surface through `useTheme()`.
- Dynamic Type / Android font scale to 2x with no fixed-height tiles or rows; the Caveat handwritten layer scales with the system like any text.
- Touch targets: 44pt iOS / 48dp Android throughout, including the capture key and item rows.
- The "someday" badge carries an accessible label (not color-only), so the undated state is conveyed to assistive tech.
- `useReducedMotion()` respected: tile re-flow becomes instant, the stale-pulse becomes a static outline ring.
