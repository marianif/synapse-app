# Product

## Register

product

## App type

companion tool

## Users

A capture-first person who opens the app mid-thought to get something down before it is gone: a bill to pay, an idea worth keeping, a to-do, a horizon commitment ("book the dentist this month"). They are often ADHD-adjacent, so out of sight is out of mind: they need their entire mental field present and actionable at a glance, not curated down to a "today" view or hidden behind filters. They open it one-handed, mid-task, and need to feel switched on, not soothed. They don't go out five times a week; events matter but are secondary to commitments and ideas.

## Product Purpose

Synapse is your whole brain as a living instrument panel that has learned to talk. The home has two registers. A **direct zone**: deadlines and todos with stakes, plus a compact "coming up" strip of events — clear, tappable, color-coded items, nothing summarized away. A **narrative zone**: an agenda voice written in your own handwriting that reads the board back to you — yesterday's diary trace, the deadline you've been carrying for ten days, the idea you sketched a week ago and never returned to. Projects organize macro life areas; ideas can be promoted into them; reflective notes live in the diary, linkable to ideas or projects but never actionable. Capture is one thumb gesture from anywhere: tap the pen for text, long-press for voice.

## Platform Fidelity

custom-cross-platform (distinct) — one Field Lab language on both iOS and Android. iOS system tint and Android Material You are both overridden: the five-type electric palette is the product's information system and cannot be re-seeded by the OS.

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
- Urgency-only task managers where the board collapses into "only deadlines matter"

## Design Principles

1. **Everything at a glance — narrative is a layer, never a curtain.** Every open item stays visible and tappable on the home. The narrative block sits above the direct zones and references items; it never replaces or hides them. No "today" curation, no filters that hide things. Out of sight is gone.
2. **Equal volume.** Every entry type glows in its own electric color at the same intensity. An idea is as alive as an overdue bill; it just glows in a different color and lives in a different zone. Presence, not pressure — never dim the non-urgent, never let urgency drown the board.
3. **Capture is one thumb gesture.** The pen key in the tab bar: tap for text, long-press for voice. No FAB, no second add-path. Anything actionable resolves to a todo or idea; anything reflective is a diary note.
4. **Commit to horizons, not fake dates.** A deadline takes a precise date or a window — this week, this month, this year — and warms up as the window closes.
5. **Speak in your own handwriting.** The agenda voice states facts about time, plainly and briefly. It may hold you accountable; it may not shame, nag, comfort, or celebrate.

## Accessibility

- WCAG AA contrast in both light and dark schemes. Type-colored text on tints uses the scheme-aware `typeKicker` shades (verified ≥ 4.7:1).
- True light + dark parity is first-class and live: a persisted System / Light / Dark preference (app menu) drives every surface through `useTheme()`.
- Dynamic Type / Android font scale to 2x with no fixed-height tiles or rows; the Caveat handwritten layer scales with the system like any text.
- Touch targets: 44pt iOS / 48dp Android throughout, including the capture key and item rows.
- `useReducedMotion()` respected: tile re-flow becomes instant, the stale-pulse becomes a static outline ring.
