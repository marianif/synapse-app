import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, tokens, useTheme } from "@/constants/theme";
import { horizonReadout } from "@/lib/horizons";
import type { DbEntry } from "@/lib/types";

interface HorizonStripProps {
  /** Open horizon deadlines whose window closes in the visible month. */
  entries: DbEntry[];
}

/**
 * Horizon commitments pinned to their PERIOD, not faked onto a single day.
 * A calendar cell can't honestly hold "this month"; this strip sits above the
 * grid and carries the window deadlines closing in the visible month, each
 * with its commitment readout ("by Sun", "by 30 Jun").
 */
export function HorizonStrip({ entries }: HorizonStripProps): React.ReactElement | null {
  const { colors } = useTheme();

  if (entries.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <ThemedText type="micro" style={{ color: colors.inkMuted }}>
        CLOSING THIS MONTH
      </ThemedText>
      {entries.map((e) => (
        <Link
          key={e.id}
          href={{ pathname: "/detail", params: { id: e.id, entryType: e.type } }}
          asChild
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${e.title}, ${e.due_range ? horizonReadout(e.due_range, e.due_date) : ""}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View
              style={[styles.edgeBar, { backgroundColor: entryColor(e.type) }]}
            />
            <ThemedText
              type="item"
              numberOfLines={1}
              style={[styles.title, { color: colors.ink }]}
            >
              {e.title}
            </ThemedText>
            <ThemedText type="mono" style={{ color: colors.inkMuted }}>
              {e.due_range ? horizonReadout(e.due_range, e.due_date) : ""}
            </ThemedText>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  edgeBar: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: tokens.radius.pill,
  },
  title: {
    flex: 1,
  },
});
