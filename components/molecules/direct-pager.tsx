import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

interface DirectPagerProps {
  /** 0-based current page. */
  page: number;
  /** Total page count (>= 1). */
  pageCount: number;
  onChange: (page: number) => void;
}

/**
 * Page control for the direct zone — a mono readout flanked by chevrons, like an
 * instrument panel paging a register. Neutral ink, never a type hue (the control
 * must not read as a content category). Arrows disable at the ends. Renders
 * nothing for a single page (no chrome when there's nothing to page).
 */
export function DirectPager({
  page,
  pageCount,
  onChange,
}: DirectPagerProps): React.ReactElement | null {
  const { colors } = useTheme();
  if (pageCount <= 1) return null;

  const atStart = page <= 0;
  const atEnd = page >= pageCount - 1;

  return (
    <View
      style={styles.pager}
      accessibilityRole="adjustable"
      accessibilityLabel={`Page ${page + 1} of ${pageCount}`}
    >
      <Pressable
        onPress={() => onChange(page - 1)}
        disabled={atStart}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        accessibilityState={{ disabled: atStart }}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={22}
          color={atStart ? colors.surfaceSubtle : colors.inkMuted}
        />
      </Pressable>

      <ThemedText type="mono" style={[styles.readout, { color: colors.inkMuted }]}>
        {page + 1} / {pageCount}
      </ThemedText>

      <Pressable
        onPress={() => onChange(page + 1)}
        disabled={atEnd}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Next page"
        accessibilityState={{ disabled: atEnd }}
        style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={atEnd ? colors.surfaceSubtle : colors.inkMuted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.md,
    minHeight: 44,
  },
  arrow: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.5,
  },
  readout: {
    minWidth: 56,
    textAlign: "center",
  },
});
