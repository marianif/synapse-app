import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { EntryAccent, Radius, Spacing, TextColors } from "@/constants/theme";

interface TodayEventRowProps {
  title: string;
  subtitle?: string;
  /** Formatted time range, e.g. "10:30 - 11:15 AM" */
  timeRange?: string;
  /** Short live status label, e.g. "12M LEFT" */
  statusLabel?: string;
  /** Time displayed next to status, e.g. "10:42" */
  statusTime?: string;
  isActive?: boolean;
}

/**
 * Event row for the Today section.
 * A left-border accent (event purple) identifies it as time-blocked.
 * When active, shows a live status badge on the right.
 */
export function TodayEventRow({
  title,
  subtitle,
  timeRange,
  statusLabel,
  statusTime,
  isActive = false,
}: TodayEventRowProps): React.ReactElement {
  return (
    <View style={styles.row}>
      <View style={[styles.leftBorder, isActive && styles.leftBorderActive]} />
      <View style={styles.content}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {title}
        </ThemedText>
        {timeRange ? (
          <View style={styles.timeRangeRow}>
            <View style={styles.clockDot} />
            <ThemedText type="caption" muted>
              {timeRange}
            </ThemedText>
          </View>
        ) : null}
        {subtitle && !timeRange ? (
          <ThemedText type="caption" style={{ color: TextColors.tertiary }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {isActive && statusTime ? (
        <View style={styles.statusBlock}>
          <ThemedText type="bodyBold">{statusTime}</ThemedText>
          <ThemedText type="label" style={styles.statusLabel}>
            {statusLabel}
          </ThemedText>
        </View>
      ) : null}
      {!isActive ? <View style={styles.iconPlaceholder} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  leftBorder: {
    width: 3,
    height: "100%",
    minHeight: 36,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(192,132,252,0.3)", // event color, dimmed
  },
  leftBorderActive: {
    backgroundColor: EntryAccent.event,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  timeRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  clockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TextColors.tertiary,
  },
  statusBlock: {
    alignItems: "flex-end",
    gap: 1,
  },
  statusLabel: {
    color: EntryAccent.todo, // blue accent for urgency-free status
    letterSpacing: 0.5,
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
    opacity: 0.3,
  },
});
