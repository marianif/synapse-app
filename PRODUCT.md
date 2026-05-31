# Product

## Register

product

## App type

tool

## Users

A capture-first person who opens the app mid-thought to get something down before it is gone: a bill to pay, an idea worth keeping, a to-do, an event. They are often ADHD-adjacent, so out of sight is out of mind: they need their entire mental field present and actionable at a glance, not curated down to a "today" view or hidden behind filters. They want few things done well, and they want to feel in charge of the day. Modern, but warm.

## Product Purpose

The Field is a bento board of your whole brain. Open it and everything you are carrying is already there: bills, ideas, to-dos, events, somedays, each in its own soft-tinted tile, color-coded and packed with the real, tappable items rather than a count to click through. A warm Fraunces serif headline greets you like a person, not a dashboard. Capture lives in an always-on clay bar pinned to the bottom, one tap from any screen. Nothing is hidden behind a filter; nothing on screen is a dead label.

## Platform Fidelity

custom-cross-platform (distinct) — one warm editorial design language on both iOS and Android. Not Material 3 defaults, not iOS-stock.

## Primary Devices

phone-only

## Brand Personality

Activating, editorial, warm. Bold the way an editorial page is bold: through confident type and a disciplined pastel system, never through gradients, badges, or decoration. The New Yorker organizing your life. A direct, human voice; calm but not cold.

**Is:** activating · editorial · warm
**Is not:** corporate · gamified · minimalist-empty

## Anti-references

- Corporate productivity tools (the rejected "Kinetic Equilibrium" blue-lavender system felt corporate)
- Gamified / habit-tracker apps: streaks, badges, confetti, dopamine loops
- Pastel-illustration journaling apps: decorative mush, mascots, spot art
- Pure white / pure black interfaces

## Design Principles

1. **Everything at a glance.** The home shows the whole field — every type, actionable items visible, color-coded. No "today" curation, no filters that hide things. Out of sight is out of mind.
2. **Capture is always one tap away.** An always-on clay capture bar, pinned to the bottom on every screen. No FAB.
3. **Bold through type, calm through color.** Hierarchy comes from a Fraunces serif against Inter and from scale, so the pastel system can stay quiet. Color categorizes; it never alarms or decorates.
4. **Warm, never stark.** No pure white, no pure black: warm oat-cream paper in light, warm soot-brown in dark. No 1px structural borders — tonal layering and saturated edge-bars instead.
5. **Speak plainly, warmly.** Direct, human, brief. No celebration, no nagging, no gamification.

## Accessibility

- WCAG AA contrast in both light and dark schemes. Ink-on-tint and saturated kicker-on-tint pairs verified ≥ 4.5:1 (kickers use the darker `typeKicker` token set).
- True light + dark mode parity is a first-class goal. (As of the color migration, components are re-skinned to the warm palette; per-component `useTheme()` light/dark wiring is the active follow-on.)
- Dynamic Type / Android font scale to 2x with no fixed-height tiles.
- Touch targets: 44pt iOS / 48dp Android throughout, including the capture bar and tile items.
