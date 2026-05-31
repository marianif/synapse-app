import { StyleSheet, View } from "react-native";

import { StreakBadge } from "@/components/atoms/streak-badge";
import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, useTheme, tokens } from "@/constants/theme";

import type { EntryType } from "@/components/atoms/entry-dot";

interface ListProgressProps {
  completed: number;
  total: number;
  streak: number;
  entryType: EntryType;
}

/**
 * Weekly progress header block for the list screen.
 * Displays "WEEKLY PROGRESS" label, a large "completed / total" counter,
 * and a StreakBadge chip side-by-side.
 */
export function ListProgress({
  completed,
  total,
  streak,
  entryType,
}: ListProgressProps): React.ReactElement {
  const { colors } = useTheme();
  const accentColor = entryColor(entryType);

  return (
    <View style={styles.container}>
      <View style={styles.counterBlock}>
        <ThemedText
          type="caption"
          style={[styles.progressLabel, { color: colors.inkMuted }]}
        >
          WEEKLY PROGRESS
        </ThemedText>
        <View style={styles.counterRow}>
          <ThemedText
            style={[styles.completedNum, { color: accentColor }]}
            numberOfLines={1}
          >
            {completed}
          </ThemedText>
          <ThemedText
            style={[styles.totalNum, { color: colors.inkMuted }]}
            numberOfLines={1}
          >
            {"/ "}
            {total}
          </ThemedText>
        </View>
      </View>

      <StreakBadge count={streak} accentColor={accentColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: tokens.space.sm,
  },
  counterBlock: {
    gap: tokens.space.xs,
  },
  progressLabel: {
    letterSpacing: 0.8,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.space.xs,
  },
  completedNum: {
    fontSize: tokens.type.display.size,
    lineHeight: tokens.type.display.lineHeight,
    letterSpacing: tokens.type.display.tracking,
    fontFamily: "Inter_700Bold",
  },
  totalNum: {
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
    fontFamily: "Inter_400Regular",
    paddingBottom: 4,
  },
});
