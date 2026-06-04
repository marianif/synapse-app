// Synapse Design System — "Field Lab"
//
// Your whole brain as a living instrument panel: cool graphite paper, five electric
// type-colors that glow at equal volume across a STAKES + PRESENT board, Host Grotesk + a
// mono signal layer, sharp edges. Activation through presence, not pressure.
// Source of truth: .impeccable/brand-brief.json (direction "Field Lab").

import { Platform } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { EntryType } from "@/lib/types";

// ─── Token system: Field Lab ────────────────────────────────────────────────────

const color = {
  light: {
    paper: "#EEF1F5", // root background — cool crisp paper, never #FFF
    surface: "#F8FAFC", // tile body
    surfaceSubtle: "#E4E8EE", // recessed / gutter — tonal seating, no borders
    ink: "#1A1E25", // primary text — cool near-black, never #000
    inkMuted: "#5A6473", // secondary / metadata — cool grey-blue
  },
  dark: {
    paper: "#171A20", // root background — cool graphite, never #000
    surface: "#1F242C", // tile body
    surfaceSubtle: "#15181D", // recessed / gutter
    ink: "#E9EDF3", // primary text — cool near-white, never #FFF
    inkMuted: "#8A93A3", // secondary / metadata — cool slate-grey
  },
  // Entry-type codes — electric colors for dots, edge-bars, fills. Shared across schemes.
  // Equal volume by design: ideas/someday glow as hard as bills. todo is CYAN not green
  // (green reads "done" and would lie on an open todo — green is completion-only below).
  type: {
    bills: "#FB7185", // coral — STAKES
    ideas: "#FBBF24", // amber — PRESENT
    todo: "#22D3EE", // electric cyan — STAKES
    event: "#A78BFA", // ultraviolet — PRESENT
    someday: "#A3E635", // lime — PRESENT
  },
  // Type codes for the 11px all-caps KICKER text sitting on its tint — scheme-aware,
  // because the tints sit at opposite lightness ends. On the DARK tile, the bright
  // electric `type.*` hue clears AA (5.9–9.5:1, bright-on-dark). On the LIGHT tile,
  // a darkened hue clears AA (≥4.7:1, dark-on-light). Verified by contrast audit.
  // Use via `entryKicker(type, scheme)` / `useEntryKicker(type)` for kicker text only.
  typeKicker: {
    light: {
      bills: "#AF3B51", // 4.74:1 on billsTint.light
      ideas: "#8A6307", // 4.74:1 on ideasTint.light
      todo: "#0B7286", // 4.75:1 on todoTint.light
      event: "#694CC7", // 4.76:1 on eventTint.light
      someday: "#4F750F", // 4.73:1 on somedayTint.light
    },
    dark: {
      bills: "#FB7185", // 5.99:1 on billsTint.dark — the electric code, bright-on-dark
      ideas: "#FBBF24", // 8.98:1 on ideasTint.dark
      todo: "#22D3EE", // 8.32:1 on todoTint.dark
      event: "#A78BFA", // 5.90:1 on eventTint.dark
      someday: "#A3E635", // 9.50:1 on somedayTint.dark
    },
  },
  // Charged tile-body tints per type — light + dark-adapted so the electric codes
  // survive both schemes.
  typeTint: {
    light: {
      bills: "#FCE0E4",
      ideas: "#FBEFCF",
      todo: "#D6F2F7",
      event: "#E7E0FB",
      someday: "#E8F5CE",
    },
    dark: {
      bills: "#2E1C20",
      ideas: "#2E2611",
      todo: "#102A30",
      event: "#241E33",
      someday: "#222E10",
    },
  },
  // Field Lab signature — glow opacity scales with row heat (freshness + urgency);
  // hue is applied per-type at runtime in FieldRow (cyan base shown here). The
  // stalePulse outline (ideas/someday "still here") lands in a later motion pass.
  glow: {
    faint: "rgba(34,211,238,0.10)", // sparse / quiet tile
    strong: "rgba(34,211,238,0.28)", // full, fresh tile
    stalePulse: "rgba(251,191,36,0.45)", // "still here" outline — ideas/someday only
  },
  // Accepted exceptions: overlay scrims + shadow tint. Legitimately non-palette
  // (a modal backdrop and a drop-shadow color are not brand hues).
  scrim: {
    medium: "rgba(0,0,0,0.5)", // menu / popover backdrop
    strong: "rgba(0,0,0,0.6)", // modal / bottom-sheet backdrop
    shadow: "#0A0E14", // why: cool shadowColor base for recording glow
  },
} as const;

// Primary action color — capture bar, Add key, active states. Deliberately a
// scheme-aware NEUTRAL, not a hue: a cool off-white slab in dark, a cool slate
// slab in light. Why neutral: the old electric-cyan accent was identical to the
// `type.todo` code (#22D3EE), so the action color collided with a content
// category. A neutral can never be confused with a saturated type signal.
// `onClay` is the ink/icon color that sits ON the accent slab (flips per scheme
// for AA: dark text on the off-white slab, light text on the slate slab).
// Keys stay `clay*` so existing call-sites (`colors.accent.clay`) are untouched.
const accent = {
  light: {
    clay: "#3A4250", // cool slate slab
    clayPressed: "#2B313C", // deeper slate — pressed
    onClay: "#EEF1F5", // light ink on the slate slab (8.9:1)
  },
  dark: {
    clay: "#E9EDF3", // cool off-white slab
    clayPressed: "#CDD5E0", // dimmer off-white — pressed
    onClay: "#171A20", // dark ink on the off-white slab (14.8:1)
  },
} as const;

const feedback = {
  success: "#34D399", // cool emerald — the ONLY green (completion means done)
  warning: "#FBBF24", // amber — cool-charged caution
  danger: "#F43F5E", // hot cool-red — the stakes signal at full intensity
} as const;

const type = {
  // `fontFraunces` retained as a KEY so existing call-sites compile — repointed at
  // the heaviest Host Grotesk weights. Fraunces (warm/editorial serif) is fully removed.
  fontFraunces: {
    regular: "HostGrotesk_500Medium",
    medium: "HostGrotesk_600SemiBold",
    semiBold: "HostGrotesk_700Bold",
  },
  // `fontInter` retained as a KEY so existing call-sites compile — repointed at
  // Host Grotesk, the display/body sans. Inter (too neutral/sloppy) is fully removed.
  fontInter: {
    regular: "HostGrotesk_400Regular",
    medium: "HostGrotesk_500Medium",
    semiBold: "HostGrotesk_600SemiBold",
    bold: "HostGrotesk_700Bold",
  },
  // handwritten layer — agenda margin-notes. Caveat reads like a thing you
  // scrawled to remember it; runs ~30% larger than Host Grotesk at the same size, so
  // bump the size at call-sites to keep optical weight in line.
  fontHand: {
    regular: "Caveat_500Medium",
    medium: "Caveat_600SemiBold",
    bold: "Caveat_700Bold",
  },
  // mono signal layer — counts, status line, time, kickers. Instrument-panel feel.
  fontMono: {
    regular: "JetBrainsMono_400Regular",
    medium: "JetBrainsMono_500Medium",
    bold: "JetBrainsMono_700Bold",
  },
  // sans + mono + size + weight carries the hierarchy; no serif warmth.
  display: { size: 28, lineHeight: 34, weight: "700" as const, tracking: -0.2 }, // Host Grotesk — home greeting
  title: { size: 20, lineHeight: 26, weight: "700" as const, tracking: -0.2 }, // Host Grotesk — tile/section
  item: { size: 16, lineHeight: 22, weight: "500" as const, tracking: 0 }, // Host Grotesk — entry titles
  body: { size: 14, lineHeight: 20, weight: "400" as const, tracking: 0 }, // Host Grotesk — detail
  kicker: { size: 11, lineHeight: 14, weight: "600" as const, tracking: 0.8 }, // mono all-caps — the only all-caps
  micro: { size: 10, lineHeight: 13, weight: "600" as const, tracking: 1 }, // mono all-caps — sub-kicker dividers / tertiary metadata
  mono: { size: 13, lineHeight: 18, weight: "500" as const, tracking: 0 }, // mono — counts / status / time, tabular
} as const;

const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

const radius = {
  sm: 6, // sharp — crisp instrument-panel edges
  md: 10,
  lg: 14,
  pill: 999,
} as const;

const motion = {
  duration: { fast: 140, base: 220, slow: 340 },
  // Reanimated: withSpring(v, { damping: 18, stiffness: 220 }) — expressive, ProMotion.
  // Easing.bezier(0.22, 1, 0.36, 1) for timing. transform + opacity only.
  spring: { damping: 18, stiffness: 220 },
  bezier: [0.22, 1, 0.36, 1] as const,
} as const;

const elevation = {
  flat: Platform.select({
    ios: {},
    android: { elevation: 0 },
    default: {},
  }),
  // cool-tinted lift per bento tile — depth encodes content, no pure-black shadow.
  tile: Platform.select({
    ios: {
      shadowColor: "#141E2D",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
    },
    android: { elevation: 2 },
    default: {},
  }),
  // pinned always-on capture bar
  capture: Platform.select({
    ios: {
      shadowColor: "#141E2D",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

export const tokens = {
  color,
  colors: color, // alias so `tokens.colors.unresolved.*` (table convention) resolves too
  accent,
  feedback,
  type,
  space,
  radius,
  motion,
  elevation,
} as const;

// ─── useTheme() — single source for the active scheme's resolved colors ─────────
// Components should read color via this hook (light/dark parity); type/space/radius
// are scheme-independent and read from `tokens.*` directly.

export type Scheme = "light" | "dark";

export type ThemeColors = {
  paper: string;
  surface: string;
  surfaceSubtle: string;
  ink: string;
  inkMuted: string;
  type: typeof color.type;
  typeKicker:
    | (typeof color.typeKicker)["light"]
    | (typeof color.typeKicker)["dark"];
  typeTint: (typeof color.typeTint)["light"] | (typeof color.typeTint)["dark"];
  glow: typeof color.glow;
  accent: (typeof accent)["light"] | (typeof accent)["dark"];
  feedback: typeof feedback;
};

function resolveColors(scheme: Scheme): ThemeColors {
  const c = color[scheme];
  return {
    paper: c.paper,
    surface: c.surface,
    surfaceSubtle: c.surfaceSubtle,
    ink: c.ink,
    inkMuted: c.inkMuted,
    type: color.type,
    typeKicker: color.typeKicker[scheme],
    typeTint: color.typeTint[scheme],
    glow: color.glow,
    accent: accent[scheme],
    feedback,
  };
}

export function useTheme(): { scheme: Scheme; colors: ThemeColors } {
  const scheme: Scheme = useColorScheme() === "light" ? "light" : "dark";
  return { scheme, colors: resolveColors(scheme) };
}

// ─── Typed scheme-aware accessors (replace the shim's dynamic indexed access) ───

/**
 * Entry-type → saturated Field color (dot / edge-bar / fill). Maps the entry
 * domain onto the type-code palette. Codes are SHARED across light/dark by
 * design, so this needs no scheme argument.
 */
const ENTRY_TO_TYPE_KEY: Record<EntryType, keyof typeof color.type> = {
  todo: "todo",
  deadline: "bills",
  event: "event",
  someday: "someday",
  idea: "ideas",
};

export function entryColor(type: EntryType): string {
  return color.type[ENTRY_TO_TYPE_KEY[type] ?? "todo"];
}

/**
 * Entry-type → AA-safe kicker shade for the ACTIVE scheme. Use for the 11px
 * all-caps label sitting on the tile tint (the electric `entryColor` only clears
 * AA on the dark tint, not the light one). Scheme-dependent: pass the active
 * scheme, or use `useEntryKicker` inside a component.
 */
export function entryKicker(type: EntryType, scheme: Scheme): string {
  return color.typeKicker[scheme][ENTRY_TO_TYPE_KEY[type] ?? "todo"];
}

export function useEntryKicker(type: EntryType): string {
  const { scheme } = useTheme();
  return entryKicker(type, scheme);
}

/**
 * Entry-type → soft tile-body tint for the ACTIVE scheme. Scheme-dependent, so
 * call inside a component via the `useTheme()` scheme (see `useEntryTint`).
 */
export function entryTint(type: EntryType, scheme: Scheme): string {
  return color.typeTint[scheme][ENTRY_TO_TYPE_KEY[type] ?? "todo"];
}

export function useEntryTint(type: EntryType): string {
  const { scheme } = useTheme();
  return entryTint(type, scheme);
}

/**
 * Foreground for text sitting on a saturated `entryKicker` chip fill. The kicker
 * shades are mid-to-dark in both schemes, so the cool near-white paper
 * (`color.dark.ink`) is the AA-safe pairing regardless of active scheme.
 */
export function chipInk(): string {
  return color.dark.ink;
}

/**
 * Legacy surface-layer name → resolved scheme surface. The old 6-tone tonal
 * stack collapses onto The Field's 3 warm surfaces. Use `useSurfaceColor` in
 * components so the value reacts to the active scheme.
 */
export type SurfaceLayer =
  | "base"
  | "containerLow"
  | "container"
  | "containerHigh"
  | "containerHighest"
  | "containerLowest";

function resolveSurface(layer: SurfaceLayer, colors: ThemeColors): string {
  switch (layer) {
    case "base":
    case "containerLowest":
      return colors.paper;
    case "containerLow":
      return colors.surfaceSubtle;
    case "container":
    case "containerHigh":
    case "containerHighest":
      return colors.surface;
  }
}

export function useSurfaceColor(layer: SurfaceLayer): string {
  const { colors } = useTheme();
  return resolveSurface(layer, colors);
}


// ColorScheme kept as an alias of Scheme — consumed by hooks/use-color-scheme.ts.
export type ColorScheme = Scheme;
