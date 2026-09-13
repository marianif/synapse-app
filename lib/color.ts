/**
 * Shared color math. HSL→hex is the one converter the token system needs for
 * derived hues (tag chips, habit tones); the WCAG helpers let a derived tone
 * prove its contrast rather than guess it.
 */

/** HSL → hex. h∈[0,360), s,l∈[0,100]. */
export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number): number =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (v: number): string =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** Parse a #rrggbb / #rgb color into [r, g, b] 0–255, or null. */
function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, "");
  if (raw.length === 3) {
    return [
      parseInt(raw[0] + raw[0], 16),
      parseInt(raw[1] + raw[1], 16),
      parseInt(raw[2] + raw[2], 16),
    ];
  }
  if (raw.length === 6) {
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ];
  }
  return null;
}

/** WCAG relative luminance of a #rrggbb color. */
export function hexLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const channel = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = rgb;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two #rrggbb colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = hexLuminance(a);
  const lb = hexLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
