## BACKLOG

## Open

### Open
- [ ] `optimize use-shared-intake` — [Tier 1: Capture] sharing text/links into the app from another app never foregrounds Synapse; the share extension (`targets/share/ShareViewController.swift`) deliberately skips `openURL` and only writes the payload to the App Group, so nothing brings the host app forward and the user has to manually reopen it. The app already registers an unused `synapseapp` URL scheme that could drive an explicit foreground call, with a local-notification fallback if iOS blocks it. (added 2026-08-12)
- [ ] `clarify diary-filter-bar` — [Tier 1: Glanceable presence] the only way to browse ideas from the Notes screen is a bare 20px unlabeled "Filters" glyph in the header with no visual cue it leads to an idea/project browser; needs a real affordance (e.g. a labeled idea chip row or a distinct entry point) instead of hiding ideas behind a generic filter icon. (added 2026-08-12)
- [ ] `craft idea-constellation` — [Tier 2] the ideas screen is the right home for frontier interaction components (the old ex-atlas view, a draggable diagram); these never made sense inside projects, but fit ideas naturally. (added 2026-08-12)
- [ ] `flaws direct-detail-sheet` — [Tier 2] there are known bugs in the project detail modal. (added 2026-08-12)
- [ ] Revenue model undecided: [Unattributed] no monetization strategy exists yet (free, freemium, subscription, one-time, etc). This is a business decision, not a design command, so it cannot be phrased as a `/flow <verb> <target>` line; it blocks any future paywall, premium-tier, or upsell UI work. Resolve the strategy first, then seed the resulting design commitments (e.g. `craft PaywallScreen`, `enhance SettingsScreen`) as real entries. (added 2026-08-12)

## In progress

- [~] `rethink detail screens (deadline, task, etc.)` — started 2026-08-11: DirectDetailSheet split into view-only + a shared edit route; detail.tsx moved to `app/(tabs)/(home,projects)/`, DetailHero replaced with a compact standing readout + structured metadata rows. Uncommitted changes still in the working tree as of 2026-08-12 (`detail-action-bar.tsx`, `detail-view-meta.tsx`, `task-checklist.tsx`, `direct-detail-sheet.tsx`, `direct-overview.tsx`, new `edit.tsx`).

## Closed

- [x] `polish App.tsx` → withdrawn 2026-07-12: false positive, this is the create-expo-module scaffold example app under speech-recognizer/example/, not Synapse product UI; not wired to the app's theme provider <!-- flow:panel:token-bypass-speech-recognizer-example-app-tsx -->
