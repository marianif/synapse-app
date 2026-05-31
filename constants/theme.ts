// Synapse Design System — "The Field"
// migrated to v2 tokens — phase 1
//
// A bento board of your whole brain: warm oat-cream / soot-brown paper, soft pastel
// type-tints with saturated kicker codes, Fraunces serif + Inter, large soft radii.
// Source of truth: .impeccable/brand-brief.json (direction "The Field").
//
// Dual-resident during migration: the new `tokens` object + `useTheme()` are the
// target API; the old named exports (Surface, TextColors, EntryAccent, Brand,
// FontSize, ...) remain below as a COMPAT SHIM re-pointed at the new warm values so
// screens/components keep compiling until the cleanup commit deletes them.

import { Platform } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

// ─── New token system: The Field ──────────────────────────────────────────────

const color = {
  light: {
    paper: "#F4EFE6", // root background — warm oat-cream, never #FFF
    surface: "#FBF7F0", // tile body
    surfaceSubtle: "#EFE8DB", // recessed / gutter — tonal seating, no borders
    ink: "#2A2622", // primary text — warm near-black brown, never #000
    inkMuted: "#6B6358", // secondary / metadata
  },
  dark: {
    paper: "#16140F", // root background — warm soot-brown, never #000
    surface: "#211E18", // tile body
    surfaceSubtle: "#1C1A14", // recessed / gutter
    ink: "#F0EAE0", // primary text — warm cream, never #FFF
    inkMuted: "#A39B8C", // secondary / metadata
  },
  // Entry-type codes — saturated colors for dots, edge-bars, fills. Shared across schemes.
  type: {
    bills: "#D98C6A", // peach-terracotta
    ideas: "#5B86A8", // powder-blue
    todo: "#6E9466", // sage
    event: "#8A6FA6", // lavender
    someday: "#C09A4B", // butter-ochre
  },
  // Darker type codes for the 11px all-caps KICKER text sitting on its soft tint.
  // The saturated `type.*` above fails WCAG AA at small sizes on the pale tints
  // (bills 2.14, todo 2.70, someday 2.13, …); these clear 4.5:1 — verified by audit.
  // Same hue family, darker lightness. Use for kicker/label text only.
  typeKicker: {
    bills: "#8A5943", // 4.71:1 on billsTint
    ideas: "#486B86", // 4.50:1 on ideasTint
    todo: "#516D4B", // 4.52:1 on todoTint
    event: "#6E5884", // 4.66:1 on eventTint
    someday: "#7A622F", // 4.68:1 on somedayTint
  },
  // Soft tile-body tints per type — light + dark-adapted so pastels survive both.
  typeTint: {
    light: {
      bills: "#F7E3D6",
      ideas: "#DDE7F0",
      todo: "#DCE7D6",
      event: "#E6DCEC",
      someday: "#F2E6C9",
    },
    dark: {
      bills: "#3A2A22",
      ideas: "#22303A",
      todo: "#26331F",
      event: "#2E2638",
      someday: "#352B14",
    },
  },
  // Accepted exceptions: overlay scrims + shadow tint. These are legitimately
  // non-palette (a modal backdrop and a drop-shadow color are not brand hues),
  // kept in a clearly-named namespace per the migration cleanup contract.
  scrim: {
    medium: "rgba(0,0,0,0.5)", // menu / popover backdrop
    strong: "rgba(0,0,0,0.6)", // modal / bottom-sheet backdrop
    shadow: "#000", // why: shadowColor base for recording glow
  },
} as const;

const accent = {
  clay: "#D86B3C", // primary action — capture bar, active states
  clayPressed: "#BE5730", // pressed feedback
} as const;

const feedback = {
  success: "#6E9466", // calm sage, not celebratory
  warning: "#C09A4B", // butter-ochre, warm not alarming
  danger: "#C8553D", // deep terracotta-red, warm even when signalling
} as const;

const type = {
  fontFraunces: {
    regular: "Fraunces_400Regular",
    medium: "Fraunces_500Medium",
    semiBold: "Fraunces_600SemiBold",
  },
  fontInter: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semiBold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
  // serif + sans + size carries the hierarchy; color stays calm.
  display: { size: 30, lineHeight: 36, weight: "600" as const, tracking: -0.3 }, // Fraunces — home greeting
  title: { size: 22, lineHeight: 28, weight: "600" as const, tracking: -0.2 }, // Fraunces — tile/section
  item: { size: 17, lineHeight: 23, weight: "500" as const, tracking: 0 }, // Inter — entry titles
  body: { size: 14, lineHeight: 20, weight: "400" as const, tracking: 0 }, // Inter — detail
  kicker: { size: 11, lineHeight: 14, weight: "600" as const, tracking: 0.6 }, // Inter all-caps — the only all-caps
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
  sm: 10, // large soft — tiles feel pickable
  md: 14,
  lg: 18,
  pill: 999,
} as const;

const motion = {
  duration: { fast: 160, base: 240, slow: 360 },
  // Reanimated: withSpring(v, { damping: 16, stiffness: 180 }) — ProMotion-alive.
  // Easing.bezier(0.22, 1, 0.36, 1) for timing. transform + opacity only.
  spring: { damping: 16, stiffness: 180 },
  bezier: [0.22, 1, 0.36, 1] as const,
} as const;

const elevation = {
  flat: Platform.select({
    ios: {},
    android: { elevation: 0 },
    default: {},
  }),
  // gentle warm-tinted lift per bento tile — no pure-black shadow, no borders.
  tile: Platform.select({
    ios: {
      shadowColor: "#503219",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
    },
    android: { elevation: 2 },
    default: {},
  }),
  // pinned always-on capture bar
  capture: Platform.select({
    ios: {
      shadowColor: "#503219",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.16,
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
  typeKicker: typeof color.typeKicker;
  typeTint: (typeof color.typeTint)["light"] | (typeof color.typeTint)["dark"];
  accent: typeof accent;
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
    typeKicker: color.typeKicker,
    typeTint: color.typeTint[scheme],
    accent,
    feedback,
  };
}

export function useTheme(): { scheme: Scheme; colors: ThemeColors } {
  const scheme: Scheme = useColorScheme() === "light" ? "light" : "dark";
  return { scheme, colors: resolveColors(scheme) };
}

// ════════════════════════════════════════════════════════════════════════════
// @deprecated COMPAT SHIM — old "Kinetic Equilibrium" exports re-pointed at The
// Field values. The color migration is complete; these remain because some
// call-sites use DYNAMIC indexed access that can't be statically renamed:
//   • EntryAccent[entry.type]   (7 files — needs a typed entryColor() accessor)
//   • Surface[surfaceKey]       (themed-view.tsx)
//   • Colors[scheme]            (themed-text.tsx, custom-tab-bar.tsx)
// REMOVE in the useTheme() light/dark parity follow-on: introduce scheme-aware
// indexable accessors on `tokens`, refactor those call-sites, rename the static
// dotted-access (Surface.base → tokens.color.dark.paper, …), then delete this block.
// Do NOT add new usages of these exports — read from `tokens` / `useTheme()`.
// ════════════════════════════════════════════════════════════════════════════

export const Surface = {
  base: color.dark.paper,
  containerLow: color.dark.surfaceSubtle,
  container: color.dark.surface,
  containerHigh: color.dark.surface,
  containerHighest: color.dark.surfaceSubtle,
  containerLowest: color.dark.paper,
  bright: color.dark.surfaceSubtle,
  outlineVariant: color.dark.surfaceSubtle, // no borders — tonal
} as const;

export const TextColors = {
  primary: color.dark.ink,
  secondary: color.dark.inkMuted,
  tertiary: color.dark.inkMuted,
  disabled: color.dark.inkMuted,
} as const;

export const EntryAccent = {
  todo: color.type.todo,
  deadline: color.type.bills,
  event: color.type.event,
  someday: color.type.someday,
  today: color.type.someday, // RETIRED concept — usages removed in phase 2/3
  idea: color.type.ideas,
} as const;

export const Brand = {
  primary: accent.clay,
  primaryContainer: accent.clayPressed, // gradient RETIRED — usages deleted
  fabGlow: accent.clay, // FAB RETIRED — usages deleted
  onPrimary: color.light.paper,
} as const;

export const FontFamily = {
  regular: type.fontInter.regular,
  medium: type.fontInter.medium,
  semiBold: type.fontInter.semiBold,
  bold: type.fontInter.bold,
} as const;

export const FontSize = {
  displayLg: type.display.size,
  displayMd: type.title.size,
  headlineSm: type.title.size,
  bodyMd: type.body.size,
  labelSm: type.kicker.size,
  labelXs: type.kicker.size,
} as const;

export const LetterSpacing = {
  displayLg: type.display.tracking,
  labelSm: type.kicker.tracking,
} as const;

export const LineHeight = {
  displayLg: type.display.lineHeight,
  headlineSm: type.title.lineHeight,
  bodyMd: type.body.lineHeight,
  labelSm: type.kicker.lineHeight,
} as const;

export const Spacing = {
  xs: space.xs,
  sm: space.sm,
  md: space.md,
  lg: space.lg,
  xl: space.xl,
  xxl: space.xxl,
  xxxl: space.xxxl,
  section: space.xxxl, // 40 → 32 rhythm cap
} as const;

export const Radius = {
  sm: radius.sm,
  md: radius.sm,
  lg: radius.md,
  xl: radius.lg,
  full: radius.pill,
} as const;

export const Shadow = {
  card: elevation.tile,
  fab: elevation.capture,
} as const;

export const Colors = {
  dark: {
    text: color.dark.ink,
    background: color.dark.paper,
    tint: accent.clay,
    tabIconDefault: color.dark.inkMuted,
    tabIconSelected: accent.clay,
    surface: color.dark.surface,
    surfaceLow: color.dark.surfaceSubtle,
    border: color.dark.surfaceSubtle,
  },
  light: {
    text: color.light.ink,
    background: color.light.paper,
    tint: accent.clay,
    tabIconDefault: color.light.inkMuted,
    tabIconSelected: accent.clay,
    surface: color.light.surface,
    surfaceLow: color.light.surfaceSubtle,
    border: color.light.surfaceSubtle,
  },
} as const;

export type ColorScheme = keyof typeof Colors;
