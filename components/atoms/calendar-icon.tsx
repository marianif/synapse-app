import Svg, { Path, Rect } from "react-native-svg";

import { entryKicker, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

interface CalendarIconProps {
  /** Box size in px; drawn on a 24×24 canvas and scaled. */
  size?: number;
  /**
   * Entry types whose colors fill the day cells, left-to-right / top-to-bottom.
   * Defaults to the brand order used by EntryCluster so the calendar glyph
   * speaks the same color shorthand as the rest of the field.
   */
  days?: EntryType[];
}

/** Brand order — mirrors EntryCluster's default so the palettes line up. */
const DAY_TYPES: EntryType[] = ["deadline", "todo", "idea"];

/**
 * A simple calendar glyph — a rounded frame with two binding tabs and a grid of
 * small day squares inside. The days aren't generic ink: each cell is tinted
 * with an entry-type color (deadline / todo / idea), so the
 * icon carries the brand palette instead of a flat Material glyph. Color =
 * categorization, matching EntryDot / EntryCluster.
 *
 * Drawn on a 24×24 canvas: a 6-cell grid (3 across × 2 down). With five brand
 * colors the sixth cell falls back to a muted ink square so the grid stays even.
 */
export function CalendarIcon({
  size = 24,
  days = DAY_TYPES,
}: CalendarIconProps): React.ReactElement {
  const { colors, scheme } = useTheme();
  const frame = colors.ink;
  const sw = (size / 24) * 1.6;

  // 3×2 grid of day cells inside the frame. Cell origins on the 24-canvas.
  const cells: { x: number; y: number }[] = [
    { x: 6.5, y: 12 },
    { x: 11, y: 12 },
    { x: 15.5, y: 12 },
    { x: 6.5, y: 16 },
    { x: 11, y: 16 },
    { x: 15.5, y: 16 },
  ];
  const cell = 2.4;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Frame */}
      <Rect
        x={4}
        y={5.5}
        width={16}
        height={15}
        rx={2.4}
        stroke={frame}
        strokeWidth={sw}
        fill="none"
      />
      {/* Header rule under the binding tabs */}
      <Path
        d="M4 9.6 H20"
        stroke={frame}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      {/* Binding tabs */}
      <Path
        d="M8 3.5 V6.5"
        stroke={frame}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <Path
        d="M16 3.5 V6.5"
        stroke={frame}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      {/* Day cells — entry-type colors fill the grid. */}
      {cells.map((c, i) => {
        const type = days[i];
        const fill = type ? entryKicker(type, scheme) : colors.inkMuted;
        return (
          <Rect
            key={`${c.x}-${c.y}`}
            x={c.x}
            y={c.y}
            width={cell}
            height={cell}
            rx={0.7}
            fill={fill}
          />
        );
      })}
    </Svg>
  );
}
