import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

import { tagTone } from "@/lib/tags";

type TagChipVariant = "hue" | "neutral" | "ghost";
type TagChipSize = "sm" | "md";
type TagChipTrailing = "remove" | "add";

interface TagChipProps {
  /** The tag label (rendered with a leading `#`). */
  label: string;
  /** Palette. `hue` derives a two-tone pastel palette from the tag's text
   *  (feed, editor); `ghost` keeps the same text color but drops the fill
   *  (quiet on cards, where a well would fight the surface); `neutral` uses
   *  the quiet surface tone (filter rail). */
  variant?: TagChipVariant;
  /** Footprint + text size. `sm` is the dense filter-rail pill; `md` the
   *  feed/editor chip. */
  size?: TagChipSize;
  /** Trailing glyph — an X (remove) or a + (add). Omit for a label-only chip. */
  trailing?: TagChipTrailing;
  /** Trailing count label (e.g. the rail's note count). */
  count?: number;
  /** Selected state — renders a tinted well + full ink in the chip's own
   *  color, matching the app's chip-selection grammar. */
  selected?: boolean;
  /** Accent used for the neutral variant's selected state. */
  accentColor?: string;
  /** Tap handler; omit to render the chip as a static label. */
  onPress?: () => void;
  /** Accessibility label override — defaults to `#<label>`. */
  accessibilityLabel?: string;
}

/**
 * A tag chip — the one tag-shaped element in the system. Renders `#tag` with
 * a configurable palette — per-tag hue tones (`hue`), the same hue ink with
 * no fill (`ghost`), or the neutral surface tone (`neutral`) — a dense or
 * regular footprint, an optional trailing glyph (remove/add) or count, and an
 * optional selected state. Omit `onPress` for a static label; supply it to
 * make the whole chip a tap target. The single source for tag chips in the
 * feed, the note editor, and the filter rail, so every surface agrees on
 * shape, size, and color semantics.
 */
export function TagChip({
  label,
  variant = "hue",
  size = "md",
  trailing,
  count,
  selected = false,
  accentColor,
  onPress,
  accessibilityLabel,
}: TagChipProps): React.ReactElement {
  const { colors, scheme } = useTheme();

  const tone = variant !== "neutral" ? tagTone(label, scheme) : null;
  const accent = accentColor ?? colors.inkMuted;
  const backgroundColor =
    variant === "hue"
      ? selected
        ? `${tone!.fg}22`
        : tone!.bg
      : variant === "ghost"
        ? selected
          ? `${tone!.fg}1f`
          : "transparent"
        : selected
          ? `${accent}22`
          : colors.surfaceSubtle;
  const foreground =
    variant === "hue"
      ? tone!.fg
      : variant === "ghost"
        ? tone!.fg
        : selected
          ? accent
          : colors.inkMuted;

  const content = (
    <>
      <ThemedText
        type="caption"
        numberOfLines={1}
        style={[
          styles.label,
          size === "sm" && styles.labelSm,
          { color: foreground },
          selected && styles.selectedLabel,
        ]}
      >
        #{label}
      </ThemedText>
      {count !== undefined ? (
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={[
            styles.count,
            size === "sm" && styles.countSm,
            { color: foreground },
          ]}
        >
          {count}
        </ThemedText>
      ) : null}
      {trailing ? (
        <IconSymbol
          name={trailing === "remove" ? "X" : "Plus"}
          size={trailing === "remove" ? 12 : 11}
          color={foreground}
        />
      ) : null}
    </>
  );

  const chipStyle = [
    size === "sm" ? styles.pillSm : styles.pill,
    // Ghost chips have no well to give the height meaning — let them hug the
    // text line so a card row of ghost tags doesn't read as a tall empty band.
    variant === "ghost" && styles.pillGhost,
    { backgroundColor },
  ];

  if (!onPress) {
    return <View style={chipStyle}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `#${label}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [chipStyle, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 26,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.pill,
  },
  pillSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minHeight: 22,
    paddingHorizontal: tokens.space.xs,
    borderRadius: tokens.radius.pill,
  },
  pillGhost: {
    minHeight: 16,
  },
  label: {
    maxWidth: 140,
  },
  labelSm: {
    fontSize: 10,
    lineHeight: 12,
  },
  count: {
    opacity: 0.6,
  },
  countSm: {
    fontSize: 10,
    lineHeight: 12,
  },
  selectedLabel: {
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },
});
