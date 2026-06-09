---
name: The Field
description: "Warm oat-cream / soot-brown paper, soft pastel type-tints with saturated edge-codes, Fraunces serif + Inter, large soft radii — an editorial bento board of your whole brain, full light/dark parity."
---

# Design System: The Field

## Overview

**Creative North Star: "The New Yorker organizing your life."**

The Field is a bento board of everything you are carrying. Each entry type lives in its own soft-tinted tile, color-coded and packed with real, tappable items — never a dead count. A warm Fraunces serif headline greets you like a person. Capture is an always-on clay bar pinned to the bottom. Bold through confident type and a disciplined pastel system, calm through restraint — never gradients, badges, or decoration.

Source of truth for token values: `constants/theme.ts` (the `tokens` object + `useTheme()`).

**Key characteristics:**

- Full light + dark parity is a first-class goal. Each type has a soft light tile-tint and a dark-adapted tint of the same hue, so pastels survive both schemes. Resolve via a single `useTheme()` hook, not scattered `colorScheme` ternaries.
- No pure white, no pure black — warm oat-cream paper (light) and warm soot-brown (dark).
- No 1px structural borders — tonal layering + saturated edge-bars carry structure.
- Fraunces (serif) for display/headline/kicker; Inter (sans) for body/UI. Hierarchy = serif-vs-sans + size, so color stays calm.
- One action color: clay terracotta, used sparingly (capture bar, active states).
- Color categorizes; it never alarms or decorates.

---

## Color

Warm extremes, never `#FFF`/`#000`. Light and dark are both first-class.

### Surfaces

| Token | Light | Dark | Why |
|---|---|---|---|
| `color.{scheme}.paper` | `#F4EFE6` | `#16140F` | Root background. Warm oat-cream / warm soot-brown — never pure. |
| `color.{scheme}.surface` | `#FBF7F0` | `#211E18` | Tile body. Soft so 5 tiles never read busy; color lives in kicker + edge-bar. |
| `color.{scheme}.surfaceSubtle` | `#EFE8DB` | `#1C1A14` | Recessed / gutter. Seats tiles tonally without borders. |

### Text

| Token | Light | Dark | Why |
|---|---|---|---|
| `color.{scheme}.ink` | `#2A2622` | `#F0EAE0` | Primary text. Warm near-black brown / warm cream. |
| `color.{scheme}.inkMuted` | `#6B6358` | `#A39B8C` | Secondary / metadata. Warm taupe / warm sand. |

### Entry-type system

Each type has a soft tile-tint (body), a saturated code (dots / edge-bars / fills), and a darker kicker shade (the 11px all-caps label, for WCAG AA on the tint).

| Type | code `color.type.*` | kicker `color.typeKicker.*` | tint light | tint dark |
|---|---|---|---|---|
| bills (deadline) | `#D98C6A` peach | `#8A5943` | `#F7E3D6` | `#3A2A22` |
| ideas (idea) | `#5B86A8` powder-blue | `#486B86` | `#DDE7F0` | `#22303A` |
| todo | `#6E9466` sage | `#516D4B` | `#DCE7D6` | `#26331F` |
| event | `#8A6FA6` lavender | `#6E5884` | `#E6DCEC` | `#2E2638` |
| someday | `#C09A4B` butter | `#7A622F` | `#F2E6C9` | `#352B14` |

**Why two code shades:** the saturated `type.*` color fails AA at 11px on the pale tint (bills 2.14, someday 2.13, …). `typeKicker.*` is the same hue, darker, and clears 4.5:1 on its tint — verified by audit. Kicker/label text uses `typeKicker`; dots/edge-bars/fills use `type`.

### Accent & feedback

| Token | Value | Why |
|---|---|---|
| `accent.clay` | `#D86B3C` | The one action color — capture bar, active states. Used sparingly. |
| `accent.clayPressed` | `#BE5730` | Pressed feedback. |
| `feedback.success` | `#6E9466` | Reuses sage — completion is calm, not celebratory. |
| `feedback.warning` | `#C09A4B` | Butter-ochre, warm not alarming. |
| `feedback.danger` | `#C8553D` | Deep terracotta-red — warm even when signalling. |

### Scrim (accepted exceptions)

`color.scrim.medium` `rgba(0,0,0,0.5)`, `color.scrim.strong` `rgba(0,0,0,0.6)`, `color.scrim.shadow` `#000` — legitimately non-palette overlays (modal/menu backdrops, shadow base).

---

## Typography

**Fraunces (display/headline/kicker) + Inter (body/UI).** Hierarchy reads as serif-vs-sans plus size, so color can stay calm. The kicker is the only all-caps element.

| Step | Size / line | Weight | Use |
|---|---|---|---|
| `type.display` | 30 / 36 | 600 | Home greeting headline (Fraunces) |
| `type.title` | 22 / 28 | 600 | Tile / section headers (Fraunces) |
| `type.item` | 17 / 23 | 500 | Entry titles inside tiles (Inter) |
| `type.body` | 14 / 20 | 400 | Entry detail / supporting (Inter) |
| `type.kicker` | 11 / 14 | 600 | All-caps type label, +0.6 tracking (Inter) |

Load Fraunces via `expo-font` before the splash clears. Inter carries the dense tile content.

---

## Spacing

4pt base. Rhythm: `space.{xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32}`.
**Why:** the codebase was already 4pt-based; enforcing the rhythm fixes the off-beat 3px/14px values the forensics flagged. Vary by zone — tighter inside tiles, generous between sections.

## Radius

Large soft: `radius.{sm:10, md:14, lg:18, pill:999}`.
**Why:** large radii make tiles feel like cards you could pick up — graphic and tactile. Replaces the old sharp 4/6px corners.

## Motion

Expressive: `motion.duration.{fast:160, base:240, slow:360}`, spring `{damping:16, stiffness:180}`, bezier `(0.22, 1, 0.36, 1)`.
**Why:** tiles spring in subtly on open to feel alive on ProMotion. Transform + opacity only; respect `useReducedMotion()`. Banned: gradient-glow pulses, bounce/elastic on navigation, continuous looping motion, confetti.

## Elevation

Layered, warm-tinted: `elevation.tile` (warm soft shadow `rgba(80,50,30,0.10)`, y8, blur20 / elevation 2) and `elevation.capture` (`rgba(80,50,30,0.16)`, y-2, blur16 / elevation 8).
**Why:** gentle warm lift per tile gives the bento depth without borders. No pure-black shadows.

---

## Ruled out

- No FAB — capture is an always-on bottom bar.
- No gradients anywhere (no LinearGradient buttons or glows).
- No pure white (`#FFFFFF`) or pure black (`#000000`) — warm extremes only.
- No 1px structural borders — tonal layering + edge-bars only.
- No streaks, badges, confetti, or any gamification.
- No dead count-only tiles — every tile shows real, tappable items.
- No curating the home down to "today" — everything stays present and visible.
- No pastel-illustration mascots or decorative spot art.
- Kicker is the only all-caps text; no all-caps body or buttons.

---

## Theming API

The whole app reads color through **`useTheme()`** (returns `{ scheme, colors }` for the
active scheme) and the typed accessors **`entryColor(type)`** (shared entry-type code) and
**`useSurfaceColor(layer)`**. Scheme-independent values (`tokens.space/radius/type`) are
read directly from `tokens`. The old compat shim (`Surface`/`TextColors`/`EntryAccent`/… )
has been **deleted** — there is one token API.

**Light/dark switching is live and first-class.** A `ThemeProvider` (`contexts/theme-context.tsx`)
holds a persisted **System / Light / Dark** preference (AsyncStorage), resolves "system"
against the device, and feeds `useColorScheme()` — so every `useTheme()` consumer reacts.
The switcher is the Appearance control in the app menu. Cold start is splash-gated on the
preference load to avoid a flash. Entry-type codes are shared across schemes by design;
the soft tile-tints differ per scheme.

**Out of scope (future):** structural redesign from the brief — bento home, always-on
capture bar (replacing the FAB), `EntryTile`, loading Fraunces via expo-font.
