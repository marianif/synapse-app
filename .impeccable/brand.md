---
name: Field Lab
description: "Cool graphite instrument-panel ground, five electric type-colors that glow at equal volume, Inter + mono, sharp edges — a charged, living bento board of your whole brain. Activation through presence, not pressure. Full light/dark parity."
---

# Brand: Field Lab

**Creative North Star: "Your whole brain as a living instrument panel — switched on, never soothed."**

The previous system (The Field) was warm oat-cream paper, soft pastels, Fraunces serif: editorial calm. For an ADHD user that read as *sedating*, not *activating*. Field Lab keeps the right bones — the bento board and the always-on capture bar — and flips everything else cool, sharp, and charged. The board is alive: tiles glow and resize by what's in them, so it looks different day to day and your brain never tunes it out.

## Position

An ADHD person opens the app mid-thought needing to feel switched-on, not soothed. They want their whole mental field present and alive on screen — every type pulling its own weight — so nothing they're carrying quietly disappears.

**The core principle: activation is presence, not pressure.** Every entry type glows in its own electric color at equal volume. An idea is as alive as an overdue bill — it just glows in a different color and lives in a different zone. The board is organized into two charged neighborhoods: a **STAKES** zone (bills, due todos) and a **PRESENT** zone (ideas, somedays, events). Both lit. Neither dimmed. Nothing fades, because for an ADHD brain, out of sight is gone.

- **Is:** activating · charged · alive
- **Is not:** warm · calm · static
- **First 3 seconds:** switched-on and oriented — my whole field is here, lit, and I can see what has stakes vs. what's just present, without anything shouting or anything fading.
- **Wrong to feel:** soothed/sleepy (a warm place to relax), OR alarmed/stressed (as if only deadlines matter).
- **App type:** companion — a voice that reads the board back to you, direct and stakes-aware.

## Axes

| Axis | Value |
|---|---|
| Temperature | **cool** |
| Density | generous |
| Voice | direct |
| Posture | **expressive** |
| Era | timeless |
| Convention | distinct |

## Ruled Out

- No warm tones anywhere — no oat-cream, no soot-brown-warm, no orange/terracotta. Cool only.
- No serif (Fraunces removed) — Inter + mono only.
- No pure black or pure white — cool extremes only.
- No FAB — capture stays an always-on bottom bar.
- No 1px structural borders — tonal layering, edge-bars, and glow carry structure.
- **No dimming non-urgent types** — ideas/somedays glow at equal volume. Presence, not pressure.
- **No urgency-only signaling** — the board must not collapse into "only deadlines matter."
- No uniform identical-card grid — tile size/glow varies by content (bounded), but every type keeps a visible minimum slot so nothing drops off.
- No dead count-only tiles — every tile shows real, tappable items.
- No "today" curation or filters that hide things — whole field always present.
- No streaks, badges, confetti, gamification, celebration.
- No gradients — glow is solid-color opacity, not a gradient ramp.
- **Green is completion-only** — never a type color, so cyan-todo never reads as "done."
- Stale-pulse only on untouched ideas/somedays (7d+), kept rare so it stays noticed.
- Rotation / AI resurfacing is OUT of this rebrand — parked for MVP 2.

## Tokens

### Color

Cool extremes, never `#FFF`/`#000`. Light and dark both first-class and both cool/sharp.

**Surfaces**

| Token | Dark | Light |
|---|---|---|
| paper | `#171A20` | `#EEF1F5` |
| surface | `#1F242C` | `#F8FAFC` |
| surfaceSubtle | `#15181D` | `#E4E8EE` |

**Text**

| Token | Dark | Light |
|---|---|---|
| ink | `#E9EDF3` | `#1A1E25` |
| inkMuted | `#8A93A3` | `#5A6473` |

**Entry-type system** — five electric colors, equal volume. Code = dots/edge-bars/fills; kicker = darker shade for AA on tint.

| Type | Zone | code `type.*` | kicker `typeKicker.*` | tint dark | tint light |
|---|---|---|---|---|---|
| bills (deadline) | STAKES | `#FB7185` coral | `#C2415A` | `#2E1C20` | `#FCE0E4` |
| todo | STAKES | `#22D3EE` cyan | `#0E8FA8` | `#102A30` | `#D6F2F7` |
| ideas | PRESENT | `#FBBF24` amber | `#A87908` | `#2E2611` | `#FBEFCF` |
| someday | PRESENT | `#A3E635` lime | `#5E8B12` | `#222E10` | `#E8F5CE` |
| event | PRESENT | `#A78BFA` violet | `#6D4FCF` | `#241E33` | `#E7E0FB` |

> **Color logic:** todo is cyan, **not** green — green reads as done/completed and would lie on an open todo. Green appears only as `feedback.success`. Ideas (amber) and someday (lime) live in the PRESENT zone and glow just as hard as the STAKES colors — that's the whole point.

**Accent & feedback**

| Token | Value | Role |
|---|---|---|
| `accent.signal` | `#22D3EE` | The one action color — capture active, primary actions. (Shared with todo as "go.") |
| `accent.signalPressed` | `#0EA5C4` | Pressed feedback. |
| `feedback.success` | `#34D399` | Completion — the only green. |
| `feedback.warning` | `#FBBF24` | Cool-charged caution (reuses amber). |
| `feedback.danger` | `#F43F5E` | Stakes signal at full intensity. |

**Glow (NEW — Field Lab signature)**

| Token | Value | Role |
|---|---|---|
| `glow.faint` | `rgba(34,211,238,0.10)` | Sparse/quiet tile (hue is per-type at runtime). |
| `glow.strong` | `rgba(34,211,238,0.28)` | Full, fresh tile — the board reflects what's in it. |
| `glow.stalePulse` | `rgba(251,191,36,0.45)` | Faint outline pulse on untouched ideas/somedays — "still here." |

### Type

**Inter (UI/body/display) + a mono (counts, kickers, status line).** Fraunces is gone — serif is warm/editorial, the opposite of activating. Hierarchy = size + weight + sans/mono contrast.

| Step | Size / line | Weight | Use |
|---|---|---|---|
| display | 28 / 34 | 700 | Greeting / companion headline (Inter) |
| title | 20 / 26 | 700 | Tile / section headers (Inter) |
| item | 16 / 22 | 500 | Entry titles (Inter) |
| body | 14 / 20 | 400 | Detail / supporting (Inter) |
| kicker | 11 / 14 | 600 | All-caps type label, +0.8 tracking (mono) |
| mono | 13 / 18 | 500 | Counts, status line, time — tabular (mono) |

### Spacing

4pt base. Rhythm `{xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32}`. Generous between zones, tight inside tiles. Strict gutter rhythm so the resizing board stays legible.

### Radius

Sharp: `{sm:6, md:10, lg:14, pill:999}`. Crisp instrument-panel edges — surgical, not soft. Just above pure-sharp so resizing tiles read as movable cards on a map.

### Motion

Expressive. `duration {fast:140, base:220, slow:340}`, spring `{damping:18, stiffness:220}`, bezier `(0.22, 1, 0.36, 1)`. Tiles re-flow/resize with a quick spring when content changes — the living board. The **stale-pulse** (untouched ideas/somedays) is the *one* sanctioned continuous motion — it's content, not decoration. Reduced-motion: resizing becomes instant, stale-pulse becomes a static outline ring. Banned: gradient-glow decoration, bounce/elastic on nav, confetti, warm/floaty drift.

### Elevation

Layered, cool-tinted. `tile` cool shadow `rgba(20,30,45,0.40)` y6 blur18 (android 2) — fuller tiles lift slightly more, so depth encodes content. `capture` `rgba(20,30,45,0.50)` y-2 blur16 (android 8). No warm or pure-black shadow.

## Rules

- **Dark mode:** full light + dark parity, both cool and sharp. Per-scheme paper/surface/ink and type-tints; type codes shared across schemes. Resolved through the existing `useTheme()` / `ThemeProvider` System-Light-Dark preference.
- **Accessibility:** WCAG AA in both schemes. Kicker-on-tint pairs use the darker `typeKicker` set.

## Migration Hints

The structural shell already exists (bento board, always-on capture bar, `useTheme()`/`ThemeProvider`, `entryColor`/`useSurfaceColor`, `FieldTile`/`CaptureBar`/`FieldGreeting`) — **kept**. This rebrand is mostly a token-value swap (temperature flip, Inter+mono replacing Fraunces+Inter, sharper radii) plus three net-new behaviors on the existing components:

1. **Bounded tile resizing** by content density, with a per-type visible minimum slot.
2. **Per-type glow** opacity scaling with density + freshness.
3. **Stale-pulse** outline on untouched ideas/somedays only, respecting `useReducedMotion()`.

Suggested phasing: (1) swap color/type/radius/motion/elevation values → (2) drop Fraunces from `expo-font`, wire mono → (3) glow + bounded-resize on `FieldTile` → (4) stale-pulse → (5) re-verify WCAG AA on all kicker-on-tint pairs, both schemes. Tokenize the 200 hardcoded values flagged by forensics in the same pass or they won't respond to the new system.

## ASCII Mockup — Home (Field Lab, dark)

```
┌──────────────────────────────┐ #171A20 graphite ground
│ 09:24                        │  mono status line, inkMuted
│ 9 ideas. One since March.    │  Inter 28/700 — companion voice
│                              │
│ ── STAKES ──────────────────  │  mono kicker
│ ┌──────────────┐ ┌─────────┐ │  size = content density (bounded)
│ │▎BILLS      2 │ │▎TODO  3 │ │  ▎coral edge-bar  ▎cyan
│ │ Rent  Phone  │ │ Email…  │ │  coral glows (full + due)
│ └──────────────┘ └─────────┘ │
│ ── PRESENT ─────────────────  │
│ ┌────────────────────────┐   │  IDEAS biggest — 9 in it
│ │▎IDEAS              9    │   │  amber, strong glow
│ │ App idea ◌still here    │   │  ◌ = stale outline pulse
│ │ Newsletter  Logo  …     │   │
│ └────────────────────────┘   │
│ ┌─────────┐ ┌──────────────┐ │
│ │▎SDAY  3 │ │▎EVENTS     2 │ │  lime / violet — equal volume
│ └─────────┘ └──────────────┘ │  (min slot even if near-empty)
│                              │
│ ┌──────────────────────────┐ │
│ │ ▸ Capture            [↵] │ │  cyan signal when active
│ └──────────────────────────┘ │
└──────────────────────────────┘
```
