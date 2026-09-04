import { ScrollView, StyleSheet } from "react-native";

import { TagChip } from "@/components/atoms/tag-chip";
import { tokens, useTheme } from "@/constants/theme";

import type { TagCount } from "@/lib/tags";

interface DiaryTagRailProps {
  /** Distinct tags with note counts, sorted by count desc then alpha. */
  tags: TagCount[];
  /** The tags currently filtered to — any of them matches (multi-select). */
  selected: string[];
  /** Tap to add/remove a tag from the filter. */
  onToggle: (tag: string) => void;
}

/**
 * The tag filter rail on the notes tab — every distinct tag with its note
 * count, multi-selectable (any selected tag matches). Pills wear the quiet
 * neutral tone (a control, not content: the tag hues are reserved for the
 * feed and editor chips), dense footprint with a matching small text step,
 * and the clay selected state so the active filters read without shouting.
 * Wraps to at most two lines; past that the whole rail scrolls horizontally
 * so the filter line never swallows the feed. Renders nothing when no note
 * carries tags.
 */
export function DiaryTagRail({
  tags,
  selected,
  onToggle,
}: DiaryTagRailProps): React.ReactElement | null {
  const { colors } = useTheme();

  if (tags.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.scroller}
      contentContainerStyle={styles.rail}
    >
      {tags.map(({ tag, count }) => {
        const active = selected.includes(tag);
        return (
          <TagChip
            key={tag}
            label={tag}
            variant="neutral"
            size="sm"
            count={count}
            selected={active}
            accentColor={colors.accent.clay}
            onPress={() => onToggle(tag)}
            accessibilityLabel={`${active ? "Remove" : "Add"} tag ${tag} ${count} ${count === 1 ? "note" : "notes"}`}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Horizontal scroller: the wrapped content is capped at two pill rows
  // (minHeight 22 + xs gap), so anything past the second line is reached by
  // swiping the rail sideways instead of stacking into the feed.
  scroller: {
    flexGrow: 0,
  },
  rail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.xs,
    maxHeight: 22 * 2 + tokens.space.xs,
  },
});
