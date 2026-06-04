import Svg, { Circle, Path } from "react-native-svg";

import { entryColor } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

export type { EntryType };

interface SketchIconProps {
  type: EntryType;
  /** Box size in px; the glyph is drawn on a 24×24 canvas and scaled. */
  size?: number;
  /** Override the type color (defaults to `entryColor(type)`). */
  color?: string;
}

/**
 * Hand-drawn, "sketched on paper" glyph for each entry type. Loose wobbly
 * single-weight strokes with rounded caps/joins — a felt-tip doodle, not a
 * geometric icon. Pairs with the Caveat handwriting layer in the type system.
 * Color = categorization (matches `EntryDot`), so the left-of-row glyph reads
 * its type at a glance.
 *
 *   · idea     — lightbulb (amber)
 *   · todo     — checkbox with a tick (cyan)
 *   · deadline — alarm clock, bell ears + hands (coral)
 *   · event    — torn-top calendar page (ultraviolet)
 *   · someday  — sprout, two leaves on a stem (lime)
 *
 * Paths are authored on a 24×24 canvas with intentional asymmetry so no two
 * strokes are perfectly straight; `strokeWidth` scales with `size` to keep the
 * hand-drawn weight constant.
 */
export function SketchIcon({
  type,
  size = 18,
  color,
}: SketchIconProps): React.ReactElement {
  const stroke = color ?? entryColor(type);
  // Keep optical line-weight steady across sizes (~1.6px at the default 18px).
  const sw = (size / 18) * 1.6;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {renderGlyph(type, stroke, sw)}
    </Svg>
  );
}

function renderGlyph(
  type: EntryType,
  stroke: string,
  sw: number,
): React.ReactElement {
  const common = {
    stroke,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  switch (type) {
    // ── idea — lightbulb. Wobbly bulb dome + a little screw base. ──────────────
    case "idea":
      return (
        <>
          <Path
            {...common}
            d="M8.4 13.7 C6.6 12.2 6.1 9.6 7.6 7.7 C9.4 5.4 13 5.2 15.1 7.2 C17 9 17 11.9 15.4 13.6 C14.7 14.4 14.4 15 14.4 15.9 L9.5 16 C9.5 15 9.2 14.4 8.4 13.7 Z"
          />
          <Path {...common} d="M9.7 18 L14.2 18" />
          <Path {...common} d="M10.3 20 L13.6 20" />
        </>
      );

    // ── todo — checkbox with a tick poking past the corner. ────────────────────
    case "todo":
      return (
        <>
          <Path
            {...common}
            d="M5.4 6.6 C5.2 5.7 5.9 5.1 6.8 5.2 L17 5.1 C18 5 18.7 5.7 18.6 6.7 L18.7 17 C18.8 18 18 18.7 17.1 18.6 L6.8 18.7 C5.8 18.8 5.2 18 5.3 17.1 Z"
          />
          <Path
            {...common}
            d="M8.2 12.4 C9.3 13.2 10.4 14.3 11 15.4 C12.5 11.9 14.6 8.9 17.6 6.4"
          />
        </>
      );

    // ── deadline — alarm clock. Round face, bell ears, two hands at ~10:10. ────
    case "deadline":
      return (
        <>
          <Circle {...common} cx="12" cy="13.2" r="6.4" />
          <Path {...common} d="M6.6 7.4 C5.6 6.2 4.8 5.4 3.6 4.7" />
          <Path {...common} d="M17.4 7.3 C18.5 6.1 19.3 5.4 20.5 4.8" />
          <Path {...common} d="M12 13.1 L12 9.3" />
          <Path {...common} d="M12 13.2 L15 14.6" />
          <Path {...common} d="M9.2 19.4 L7.8 21.2" />
          <Path {...common} d="M14.8 19.4 L16.3 21.2" />
        </>
      );

    // ── event — calendar page with a torn top edge + a date line. ──────────────
    case "event":
      return (
        <>
          <Path
            {...common}
            d="M5.3 8.2 C5.1 7.3 5.8 6.7 6.7 6.8 L17.2 6.7 C18.2 6.6 18.9 7.3 18.8 8.3 L18.9 17.4 C19 18.4 18.2 19 17.3 18.9 L6.7 19 C5.7 19.1 5.1 18.3 5.2 17.3 Z"
          />
          <Path
            {...common}
            d="M5.3 10.4 C9 10 15 10.1 18.7 10.3"
          />
          <Path {...common} d="M9 4.8 L9.1 8.2" />
          <Path {...common} d="M15.2 4.7 L15.1 8.1" />
          <Path {...common} d="M8.4 14.4 L15.4 14.2" />
        </>
      );

    // ── someday — sprout. Two leaves on a curved stem in soil. ─────────────────
    case "someday":
      return (
        <>
          <Path {...common} d="M12 20 C11.9 16.5 12 13.6 12.1 10.4" />
          <Path
            {...common}
            d="M12 13.6 C10.5 13.9 8.2 13.2 7 11.6 C8.8 10.7 11 10.9 12 12.4"
          />
          <Path
            {...common}
            d="M12 11.4 C12.6 9.5 14.6 7.9 16.8 7.8 C16.7 9.9 14.9 11.7 12.2 11.9"
          />
          <Path {...common} d="M8.6 20.2 L15.3 20" />
        </>
      );
  }
}
