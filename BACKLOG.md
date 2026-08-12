## BACKLOG

## Open

### Open
- [ ] `craft idea-constellation` — [Goal 2: See it all at a glance] the ideas screen is the right home for frontier interaction components (the old ex-atlas view, a draggable diagram); these never made sense inside projects, but fit ideas naturally. (added 2026-08-12)
- [ ] `flaws direct-detail-sheet` — [Goal 2: See it all at a glance] there are known bugs in the project detail modal. (added 2026-08-12)
- [ ] Revenue model undecided: [Unattributed] no monetization strategy exists yet (free, freemium, subscription, one-time, etc). This is a business decision, not a design command, so it cannot be phrased as a `/flow <verb> <target>` line; it blocks any future paywall, premium-tier, or upsell UI work. Resolve the strategy first, then seed the resulting design commitments (e.g. `craft PaywallScreen`, `enhance SettingsScreen`) as real entries. (added 2026-08-12)

## In progress

- [~] `rethink detail screens (deadline, task, etc.)` — started 2026-08-11: DirectDetailSheet split into view-only + a shared edit route; detail.tsx moved to `app/(tabs)/(home,projects)/`, DetailHero replaced with a compact standing readout + structured metadata rows. Uncommitted changes still in the working tree as of 2026-08-12 (`detail-action-bar.tsx`, `detail-view-meta.tsx`, `task-checklist.tsx`, `direct-detail-sheet.tsx`, `direct-overview.tsx`, new `edit.tsx`).

## Closed

- [x] `clarify diary-filter-bar` → shipped 2026-08-12: the bare 20px "Filters" glyph is now a labeled pill chip ("BY PROJECT · IDEA" in the mono signal layer, resting on `surface`, pressed to `surfaceSubtle`) with a live count of browsable targets; the filter sheet header reads "BY PROJECT · IDEA" instead of "RELATE THIS NOTE" so the filter context no longer reads as note-linking. A11y label updated to "Browse notes by project or idea".
- [x] `optimize use-shared-intake` → fixed 2026-08-12: the share extension now asks the host app (via the public `NSExtensionContext.openURL(_:completionHandler:)` API, not the private responder-chain hack) to open `synapseapp://notes` after writing the payload, foregrounding Synapse on the Notes tab where `useSharedIntake` drains and seeds the composer; falls back to a local notification when the host reports failure. App Group stays the durable channel.
- [x] `polish App.tsx` → withdrawn 2026-07-12: false positive, this is the create-expo-module scaffold example app under speech-recognizer/example/, not Synapse product UI; not wired to the app's theme provider <!-- flow:panel:token-bypass-speech-recognizer-example-app-tsx -->
