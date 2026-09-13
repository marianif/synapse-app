import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

interface HabitStatsProps {
  /** Done instances among the scheduled ones, last 30 days. */
  last30Done: number;
  last30Scheduled: number;
  /** All-time completed instances. */
  total: number;
  /** Completed instances in the current calendar month. */
  thisMonth: number;
}

/**
 * The habit's easy-read record: three tiles, big mono-free numbers, no streaks
 * and no "best" comparisons. It reports what happened, not how the user ranks.
 */
export function HabitStats({
  last30Done,
  last30Scheduled,
  total,
  thisMonth,
}: HabitStatsProps): React.ReactElement {
  const pct =
    last30Scheduled > 0
      ? Math.round((last30Done / last30Scheduled) * 100)
      : 0;

  return (
    <View style={styles.row}>
      <Tile
        value={`${pct}%`}
        label="LAST 30 DAYS"
        detail={
          last30Scheduled > 0 ? `${last30Done} of ${last30Scheduled}` : "—"
        }
      />
      <Tile value={String(total)} label="CHECK-INS" />
      <Tile value={String(thisMonth)} label="THIS MONTH" />
    </View>
  );
}

function Tile({
  value,
  label,
  detail,
}: {
  value: string;
  label: string;
  detail?: string;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface }]}>
      <ThemedText type="display" style={[styles.value, { color: colors.ink }]}>
        {value}
      </ThemedText>
      <ThemedText type="micro" muted style={styles.label}>
        {label}
      </ThemedText>
      {detail ? (
        <ThemedText type="mono" muted style={styles.detail}>
          {detail}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  tile: {
    flex: 1,
    minHeight: 96,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.xs,
    justifyContent: "center",
  },
  value: {
    fontSize: 26,
    lineHeight: 30,
  },
  label: {
    letterSpacing: 0.8,
  },
  detail: {
    fontSize: 11,
  },
});
