// Synapse Design System — "The Kinetic Equilibrium"
// All design tokens derived from DESIGN.md

// ─── Surface Hierarchy ────────────────────────────────────────────────────────
// Depth is expressed through tonal layering, never with 1px borders.
export const Surface = {
  base: "#131316", // The infinite void — root background
  containerLow: "#1B1B1E", // Large layout blocks
  container: "#1F1F22", // Interactive Bento cards
  containerHigh: "#2A2A2D", // Elevated sections
  containerHighest: "#353438", // Pop-overs and active states
  containerLowest: "#0E0E11", // Recessed elements inside elevated sections
  bright: "#39393C", // Hover state background
  outlineVariant: "rgba(255,255,255,0.15)", // Ghost border fallback (15% opacity)
} as const;

// ─── Text Colors ──────────────────────────────────────────────────────────────
export const TextColors = {
  primary: "#FAFAFA", // Never pure white — reduces eye strain
  secondary: "#A1A1AA", // Body text — low cognitive load
  tertiary: "#71717A", // Metadata, muted labels
  disabled: "#3F3F46", // Disabled state
} as const;

// ─── Entry Type Accent Colors ─────────────────────────────────────────────────
// Color = Categorization, NOT urgency. Sparks of light in a dark room.
export const EntryAccent = {
  todo: "#6EA8FF", // Blue — todos
  deadline: "#FF6B6B", // Coral/Red — deadlines
  event: "#C084FC", // Purple — events (time-blocked)
  someday: "#FBB040", // Amber — someday/ideas
  today: "#90EE90", // Pastel Green — today
} as const;

// ─── Primary Brand Colors ─────────────────────────────────────────────────────
export const Brand = {
  primary: "#ADC6FF", // Primary action color
  primaryContainer: "#4D8EFF", // Gradient endpoint for CTAs
  fabGlow: "rgba(173,198,255,0.20)", // FAB permanent glow (20% opacity)
} as const;

// ─── Typography Scale ─────────────────────────────────────────────────────────
// Inter exclusively, treated with editorial reverence.
export const FontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const FontSize = {
  displayLg: 48, // Hero counters — the heartbeat of the UI
  displayMd: 32, // Hero counters — the heartbeat of the UI
  headlineSm: 24, // Bento card titles
  bodyMd: 14, // Todo descriptions (0.875rem)
  labelSm: 11, // Metadata / categories (0.6875rem)
  labelXs: 10, // Extra-small labels
} as const;

export const LetterSpacing = {
  displayLg: -0.96, // -2% of 48pt
  labelSm: 0.55, // 5% of 11pt — "technical precision"
} as const;

export const LineHeight = {
  displayLg: 52,
  headlineSm: 30,
  bodyMd: 20,
  labelSm: 14,
} as const;

// ─── Spacing Scale ────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const Radius = {
  sm: 4, // Hover state for todos rows
  md: 6, // Checkboxes (0.35rem)
  lg: 16, // Internal cards
  xl: 24, // Outer Bento containers
  full: 9999, // Pill shapes (FAB)
} as const;

// ─── Elevation / Shadow ───────────────────────────────────────────────────────
// Never use pure black shadows — always tinted.
export const Shadow = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 8,
  },
  fab: {
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

// ─── Colors (light/dark) for React Navigation compatibility ───────────────────
// Only dark scheme is actively used (dark-first design).
export const Colors = {
  dark: {
    text: TextColors.primary,
    background: Surface.base,
    tint: Brand.primary,
    tabIconDefault: TextColors.tertiary,
    tabIconSelected: Brand.primary,
    surface: Surface.container,
    surfaceLow: Surface.containerLow,
    border: Surface.outlineVariant,
  },
  light: {
    // Kept for React Navigation compatibility — app is dark-first
    text: "#0F172A",
    background: "#F8F8FB",
    tint: "#4D8EFF",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: "#4D8EFF",
    surface: "#FFFFFF",
    surfaceLow: "#F3F3F6",
    border: "rgba(0,0,0,0.08)",
  },
} as const;

export type ColorScheme = keyof typeof Colors;
