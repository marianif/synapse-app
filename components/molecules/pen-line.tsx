import Svg, { Path } from "react-native-svg";

/**
 * The "filing" mark — a hand-drawn pen with a written line trailing under its
 * nib. Reads as the narrative agenda gesture (writing the thought down) rather
 * than a form label. Matches the loose single-weight strokes of SketchIcon.
 */
export function PenLine({
  color,
  size = 18,
}: {
  color: string;
  size?: number;
}): React.ReactElement {
  const sw = (size / 18) * 1.6;
  const common = {
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Pen body, slanted top-right → mid, with a little nib at the bottom. */}
      <Path d="M20 4.2 L11.4 12.9 L10 16 L13.1 14.6 L21.7 5.9 Z" {...common} />
      {/* Ink split on the nib. */}
      <Path d="M11.4 12.9 L13.1 14.6" {...common} />
      {/* The written line, trailing under the nib with a hand wobble. */}
      <Path
        d="M3 19.4 C6 18.6 9 20 12 19.2 C14.4 18.6 16 19.4 18 19"
        {...common}
      />
    </Svg>
  );
}
