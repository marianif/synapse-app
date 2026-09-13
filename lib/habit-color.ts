import { contrastRatio, hslToHex } from "@/lib/color";

/**
 * A habit's identity tone, derived from a single user-picked hue. The system
 * owns saturation and lightness so any hue the wheel offers resolves to a
 * cohesive Field Lab tone that clears contrast on the current scheme — the
 * picker never hands the user a choice that can break readability.
 */
export interface HabitTone {
  /** Soft circle fill — the row glyph and the detail hero. */
  tint: string;
  /** Vivid fill — history grid and presence-strip marks, and the picker preview. */
  mark: string;
  /** AA-safe ink on the tint. */
  ink: string;
  /** Ink for a glyph sitting ON the mark (the wheel's center preview). */
  onMark: string;
}

// The resolved paper tones (constants/theme.ts) so the clamp math stays honest
// without importing React or the theme module (no cycle).
const LIGHT_PAPER = "#EEF1F5";
const DARK_PAPER = "#171A20";

// Floors sit a margin above the WCAG thresholds so the tightest hues (yellow,
// cyan) still clear comfortably rather than barely.
const MIN_MARK_CONTRAST = 3.3; // non-text UI mark on paper (WCAG 1.4.11 = 3.0)
const MIN_INK_CONTRAST = 4.8; // text / glyph on the tint (WCAG AA = 4.5)

/** Normalize a hue to [0, 360). */
export function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

/** Hue (degrees) of a point relative to the wheel's centre, 0° at 3 o'clock. */
export function angleToHue(dx: number, dy: number): number {
  return normalizeHue((Math.atan2(dy, dx) * 180) / Math.PI);
}

/** Point on a circle of radius `r` for a hue, matching `angleToHue`. */
export function hueToPoint(hue: number, r: number): { x: number; y: number } {
  const a = (normalizeHue(hue) * Math.PI) / 180;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

/** Darken until the mark clears the non-text contrast floor on the paper. */
function clampMark(hue: number, saturation: number, from: number, bg: string): string {
  for (let l = from; l >= 22; l -= 2) {
    const hex = hslToHex(hue, saturation, l);
    if (contrastRatio(hex, bg) >= MIN_MARK_CONTRAST) return hex;
  }
  return hslToHex(hue, saturation, 22);
}

/** Deepen (light) or brighten (dark) the ink until it clears AA on the tint. */
function clampInk(hue: number, tint: string, scheme: "light" | "dark"): string {
  if (scheme === "dark") {
    for (let l = 82; l <= 96; l += 2) {
      const hex = hslToHex(hue, 55, l);
      if (contrastRatio(hex, tint) >= MIN_INK_CONTRAST) return hex;
    }
    return hslToHex(hue, 55, 96);
  }
  for (let l = 30; l >= 12; l -= 2) {
    const hex = hslToHex(hue, 58, l);
    if (contrastRatio(hex, tint) >= MIN_INK_CONTRAST) return hex;
  }
  return hslToHex(hue, 58, 12);
}

/**
 * Ink that sits ON a mark. Picking whichever of the two cool extremes has the
 * higher contrast (rather than thresholding on luminance) guarantees a legible
 * glyph even for mid-luminance hues, where a threshold fails both ways.
 */
function onMarkInk(mark: string): string {
  return contrastRatio(DARK_PAPER, mark) >= contrastRatio(LIGHT_PAPER, mark)
    ? DARK_PAPER
    : LIGHT_PAPER;
}

/** Resolve a user-picked hue into its roles for the active scheme. */
export function habitTone(hue: number, scheme: "light" | "dark"): HabitTone {
  const h = normalizeHue(hue);
  if (scheme === "dark") {
    const tint = hslToHex(h, 34, 22);
    const mark = hslToHex(h, 62, 64);
    return {
      tint,
      mark,
      ink: clampInk(h, tint, scheme),
      onMark: onMarkInk(mark),
    };
  }
  const tint = hslToHex(h, 44, 91);
  const mark = clampMark(h, 68, 46, LIGHT_PAPER);
  return {
    tint,
    mark,
    ink: clampInk(h, tint, scheme),
    onMark: onMarkInk(mark),
  };
}

/**
 * The wheel's spectrum, sampled evenly around the rim. The final stop repeats
 * the first (hue 360 = hue 0) so the sweep has no seam at 3 o'clock.
 */
const WHEEL_SEGMENTS = 24;
export const HUE_STOPS: string[] = Array.from(
  { length: WHEEL_SEGMENTS + 1 },
  (_, i) => hslToHex((i * 360) / WHEEL_SEGMENTS, 88, 55),
);
