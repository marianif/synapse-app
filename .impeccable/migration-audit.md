# Migration audit — "The Field"

Date: 2026-05-31 · Scope: app (45 files)

## Color literals (hardcoded-violations)

| Kind | Before | After |
|---|---|---|
| inline-color | 26 | **0** ✓ |
| magic-spacing | 92 | 92 (deferred — geometry/touch-targets, not tokens) |
| magic-fontsize | 64 | 64 (deferred — letterSpacing/lineHeight/near-scale) |
| magic-radius | 8 | 8 (deferred — circles, e.g. 44px button / radius 22) |

All color literals tokenized. Numeric "violations" are deliberately NOT promoted —
they are component geometry, touch targets, and type metrics, not spacing/scale tokens.
Logged so coverage is honest (see substitution-table.json `deferred`).

## WCAG AA contrast (both schemes)

Core text pairs — all PASS AA (4.5:1):

| Pair | Ratio | Verdict |
|---|---|---|
| ink on paper (light) | 13.11 | AA ✓ |
| inkMuted on paper (light) | 5.16 | AA ✓ |
| ink on surface (light) | 14.06 | AA ✓ |
| ink on paper (dark) | 15.38 | AA ✓ |
| inkMuted on paper (dark) | 6.68 | AA ✓ |
| ink on surface (dark) | 13.89 | AA ✓ |
| clay on paper (light) | 3.01 | AA-large ✓ (buttons/large only) |
| clay on paper (dark) | 5.34 | AA ✓ |

Kicker codes — FAILED on tints, FIXED with `typeKicker` tokens:

| Type | type.* on tint (before) | typeKicker.* on tint (after) |
|---|---|---|
| bills | 2.14 ✗ | 4.71 ✓ |
| ideas | 3.09 ✗ | 4.50 ✓ |
| todo | 2.70 ✗ | 4.52 ✓ |
| event | 3.22 ✗ | 4.66 ✓ |
| someday | 2.13 ✗ | 4.68 ✓ |

## Touch targets

No touch-target regressions introduced — the migration touched colors, not dimensions.
Existing 44px controls (e.g. month-navigator buttons) preserved.

## Type checks / lint

- `tsc --noEmit`: 0 errors introduced (4 pre-existing, unrelated: 3× EmptyState
  `accentColor` prop, 1× use-color-scheme dark-lock comparison).
- `eslint`: 0 errors (a few pre-existing unused-var warnings).

## Deferred to follow-on (NOT part of this color migration)

- **Light/dark parity per component** — components still read dark values (via shim
  or `tokens.color.dark.*`); `use-color-scheme.ts` is hardcoded to `"dark"`.
- **Shim deletion** — blocked by dynamic indexed access (`EntryAccent[type]` ×7,
  `Surface[key]`, `Colors[scheme]`); needs typed scheme-aware accessors.
- **Structural redesign** (brief phaseHints) — bento home, always-on capture bar
  (replace FAB), EntryTile, load Fraunces. This is `/flow craft` work, not migration.
- **Numeric token adoption** — the 164 deferred geometry/type literals, if desired.
