import Svg, { Circle, Path } from "react-native-svg";

import type { DiaryMood } from "@/lib/types";

interface MoodGlyphProps {
  mood: DiaryMood;
  /** Box size in px; drawn on a 24×24 canvas and scaled. */
  size?: number;
  color: string;
}

/**
 * Hand-drawn affective face for each diary mood — loose felt-tip strokes that
 * pair with the Caveat handwriting layer and the SketchIcon entry glyphs. Color
 * is supplied by the call-site (the mood→type-code mapping lives in the diary
 * screen), so the glyph reads its mood at a glance without inventing a token.
 *
 *   · bright  — wide open eyes, big upward grin
 *   · calm    — gentle closed eyes, soft level smile
 *   · charged — raised brows, springy open smile
 *   · tired   — half-lidded eyes, flat mouth
 *   · low     — lowered eyes, downward curve
 */
export function MoodGlyph({
  mood,
  size = 20,
  color,
}: MoodGlyphProps): React.ReactElement {
  // Keep optical line-weight steady across sizes (~1.6px at the default 20px).
  const sw = (size / 20) * 1.6;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {renderFace(mood, color, sw)}
    </Svg>
  );
}

function renderFace(
  mood: DiaryMood,
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

  switch (mood) {
    // ── bright — wide eyes, big upward grin. ──────────────────────────────────
    case "bright":
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8.4" />
          <Circle cx="9" cy="10.2" r="1" fill={stroke} />
          <Circle cx="15.1" cy="10.2" r="1" fill={stroke} />
          <Path {...common} d="M7.8 13.6 C9.4 16.6 14.7 16.7 16.3 13.5" />
        </>
      );

    // ── calm — soft closed eyes, level smile. ─────────────────────────────────
    case "calm":
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8.4" />
          <Path {...common} d="M7.6 10.4 C8.3 11.1 9.4 11.2 10.2 10.5" />
          <Path {...common} d="M13.8 10.4 C14.6 11.1 15.7 11.2 16.4 10.5" />
          <Path {...common} d="M8.6 14.4 C10.4 15.7 13.7 15.7 15.5 14.4" />
        </>
      );

    // ── charged — raised brows, springy open smile. ───────────────────────────
    case "charged":
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8.4" />
          <Path {...common} d="M7.6 8.4 C8.4 7.7 9.5 7.8 10.2 8.6" />
          <Path {...common} d="M13.8 8.6 C14.5 7.8 15.7 7.7 16.4 8.5" />
          <Circle cx="9" cy="10.8" r="1" fill={stroke} />
          <Circle cx="15.1" cy="10.8" r="1" fill={stroke} />
          <Path {...common} d="M7.9 13.2 C9.5 16.4 14.7 16.5 16.2 13.1" />
        </>
      );

    // ── tired — half-lidded eyes, flat mouth. ─────────────────────────────────
    case "tired":
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8.4" />
          <Path {...common} d="M7.7 10.8 C8.6 10.4 9.6 10.4 10.4 10.8" />
          <Path {...common} d="M13.6 10.8 C14.5 10.4 15.5 10.4 16.3 10.8" />
          <Path {...common} d="M8.8 14.8 C10.7 14.4 13.4 14.4 15.2 14.8" />
        </>
      );

    // ── low — lowered eyes, downward curve. ───────────────────────────────────
    case "low":
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="8.4" />
          <Circle cx="9" cy="11" r="1" fill={stroke} />
          <Circle cx="15.1" cy="11" r="1" fill={stroke} />
          <Path {...common} d="M8.4 15.6 C10.2 13.9 13.7 13.9 15.5 15.7" />
        </>
      );
  }
}
