# Substitution Plan — "The Field" migration

**Scope:** app (6 screens + 39 components = 45 files)
**Styling approach:** `stylesheet` (StyleSheet.create)
**Source brief:** `.impeccable/brand-brief.json` (direction "The Field")
**Generated:** 2026-05-31

> Read this, then confirm or edit `.impeccable/substitution-table.json` before phase 1 runs.
> Nothing has been written to source files yet.

---

## How this migration works (read first)

`constants/theme.ts` is **replaced wholesale in phase 1** with a new `tokens` object,
a `useTheme()` hook, and a **compat shim** that keeps the old named exports
(`Surface`, `TextColors`, `EntryAccent`, `Brand`, `FontSize`, `Spacing`, `Radius`, `Shadow`)
alive — re-pointed at the new warm values — until the cleanup commit. That means:

- Every screen/component keeps compiling at every phase (dual-resident safety net).
- The **re-skin lands immediately**: old `Surface.base` now resolves to warm `#16140F`, etc.
- Phases 2–3 rename call-sites from the old exports to the new `tokens.*` paths.
- **Light/dark parity** beyond the re-skin (wiring components to `useTheme()`) is an
  explicit **follow-on pass**, per your decision — not done by the rename rules.

---

## 1. Rename rules — 52 rules (the largest footprint)

Old named export → new `tokens.*` path. Value change is baked into the new token.

### Surfaces (warm re-skin, collapses 8 tonal steps → 3 warm surfaces)
| Old | New | Note |
|---|---|---|
| `Surface.base` (7 files) | `tokens.color.dark.paper` | `#131316` → `#16140F` soot |
| `Surface.containerLow` (19) | `tokens.color.dark.surfaceSubtle` | gutter/seat |
| `Surface.container` (3) | `tokens.color.dark.surface` | tile body `#211E18` |
| `Surface.containerHigh` (8) | `tokens.color.dark.surface` | collapsed → tile body |
| `Surface.containerHighest` (1) | `tokens.color.dark.surfaceSubtle` | popover → seat |
| `Surface.containerLowest` (1) | `tokens.color.dark.paper` | recessed → paper |
| `Surface.bright` (1) | `tokens.color.dark.surfaceSubtle` | press bg |
| `Surface.outlineVariant` (3) | `tokens.color.dark.surfaceSubtle` | **ghost border → tonal** (no borders) |

### Text (collapses 4 tiers → ink + muted)
| Old | New |
|---|---|
| `TextColors.primary` (12) | `tokens.color.dark.ink` (`#F0EAE0`) |
| `TextColors.secondary` (19) | `tokens.color.dark.inkMuted` |
| `TextColors.tertiary` (18) | `tokens.color.dark.inkMuted` |
| `TextColors.disabled` (7) | `tokens.color.dark.inkMuted` |

### Entry-type accents (re-coded to The Field pastels — **categories change color**)
| Old | New | Hue change |
|---|---|---|
| `EntryAccent.todo` (6) | `tokens.color.type.todo` | blue → **sage** `#6E9466` |
| `EntryAccent.deadline` (6) | `tokens.color.type.bills` | coral → **peach** `#D98C6A` |
| `EntryAccent.event` (5) | `tokens.color.type.event` | purple → **lavender** `#8A6FA6` |
| `EntryAccent.someday` (4) | `tokens.color.type.someday` | mint → **butter** `#C09A4B` |
| `EntryAccent.idea` | `tokens.color.type.ideas` | amber → **powder-blue** `#5B86A8` |
| `EntryAccent.today` (2) | `tokens.color.type.someday` | ⚠️ **see ambiguous amb-1** |

### Brand → clay accent
| Old | New | Note |
|---|---|---|
| `Brand.primary` (8) | `tokens.accent.clay` | blue-lavender → **clay** `#D86B3C` |
| `Brand.primaryContainer` (1) | `tokens.accent.clayPressed` | ⚠️ gradient retired — **see amb-2** |
| `Brand.fabGlow` (3) | `tokens.accent.clay` | ⚠️ FAB retired — **see amb-2** |
| `Brand.onPrimary` (2) | `tokens.color.light.paper` | ink-on-clay → warm paper |

### Type, spacing, radius (names → new scale; values shift)
- `FontFamily.*` → `tokens.type.fontInter.*`; `FontSize.displayLg` 48→`tokens.type.display.size` 30; `headlineSm`/`displayMd` → `title` 22; `labelSm`/`labelXs` → `kicker` 11; `bodyMd` → `body` 14.
- `LetterSpacing.*` / `LineHeight.*` → the matching `tokens.type.<step>.tracking` / `.lineHeight`.
- `Spacing.{xs..xxxl}` → `tokens.space.{xs..xxxl}` (4pt rhythm preserved); `Spacing.section` 40 → `tokens.space.xxxl` 32.
- `Radius.sm/md` 4/6 → `tokens.radius.sm` **10** (sharp → soft); `lg` 16→`md` 14; `xl` 24→`lg` 18; `full` → `pill`.
- `Shadow.fab` → `tokens.elevation.capture`.

---

## 2. Literal promotions — 30 (auto-applied)

### Colors promoted by intent — 5
| Literal | → Token | Why |
|---|---|---|
| `#FF6B6B` (3 files) | `tokens.feedback.danger` | old destructive red → warm terracotta |
| `#FF4444` (3) | `tokens.feedback.danger` | destructive red |
| `#FAFAFA` (1) | `tokens.color.dark.ink` | old primary text |
| `#131316` (2) | `tokens.color.dark.paper` | old base surface |
| `#52C87A` (2) | `tokens.feedback.success` | completion green → sage |

### Numeric snaps — 25 distinct (spacing/radius/fontSize within tolerance)
Spacing (padding/margin/gap/pos only): `paddingLeft: 14→md`, `gap: 3→xs`, etc.
Radius: `borderRadius: 22→lg(18)`, `17→lg(18)`.
fontSize: `28→display(30)`, `13/15→body(14)`, `16/18→item(17)`, `20/24→title(22)`, `9/10→kicker(11)`.

---

## 3. Unresolved promotions — 11 (legacy tokens, resolved at cleanup)

Overlays, scrims, and `#000` that have no opaque match in the warm palette. Each gets a
`colors.unresolved.*` token in `constants/theme.ts` and is resolved (or accepted as an
exception) **before** the cleanup commit:

`rgba(0,0,0,0.5/0.6)` (modal scrims), `rgba(255,255,255,0.04/0.05/0.06/0.08)` (tonal dividers),
`rgba(192,132,252,0.3)`, `rgba(255,107,107,0.2)`, `rgba(144,238,144,0.15)`, `#000`.

> Most are dividers/scrims the No-Border rule wants converted to tonal surfaces — the
> cleanup pass should map them to `tokens.color.dark.surfaceSubtle` or remove them.

---

## 4. Ambiguous — 2 (your call before phase 1)

- **amb-1 — `EntryAccent.today`** (2 files): The Field **retires** the "today" color
  (today is expressed via the headline + tile ordering, not a hue). The rule currently
  maps it to `someday` butter as a safe placeholder, but the agent should likely **remove**
  the today-color usage in the requiresAgent pass. Confirm: recolor or remove?
- **amb-2 — `Brand.fabGlow` + `Brand.primaryContainer`**: both belong to the **retired FAB
  and gradient CTA**. Renamed to clay so nothing breaks, but the real fix is to **delete**
  these usages (FAB → always-on capture bar; no gradients). Confirm: delete usages?

---

## 5. Deliberately NOT changed (honest coverage)

- **85 geometry values** — `width`/`height`/`minWidth`/`minHeight`, `borderRadius: 50`
  (circles), and `44`/`48` touch-target dims. These are component geometry, **not** spacing
  tokens; snapping them would break layouts and touch targets. Left as-is by design.
- **32 type-bundled literals** — `letterSpacing`/`lineHeight` and off-scale font sizes.
  Mostly subsumed when `fontSize` references migrate to `tokens.type.*` (which bundle
  lineHeight + tracking). The agent reviews any residue per file.

---

## requiresAgent (handled in each phase's agent pass, not by rename rules)

- `components/organisms/app-menu.tsx`, `components/organisms/custom-tab-bar.tsx` — inline
  `colorScheme ===` ternaries; rewire to `useTheme()`.
- `app/_layout.tsx` (out of scope but the provider) — wire the `useTheme()` provider + load
  **Fraunces** via `expo-font` before splash (phase 1 / phase 2 prerequisite).
