import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, useTheme, tokens } from "@/constants/theme";

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
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.leftBorder,
          { backgroundColor: colors.type.event },
          isActive && { backgroundColor: entryColor("event") },
        ]}
      />
      <View style={styles.content}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {title}
        </ThemedText>
        {timeRange ? (
          <View style={styles.timeRangeRow}>
            <View style={[styles.clockDot, { backgroundColor: colors.inkMuted }]} />
            <ThemedText type="caption" muted>
              {timeRange}
            </ThemedText>
          </View>
        ) : null}
        {subtitle && !timeRange ? (
          <ThemedText type="caption" style={{ color: colors.inkMuted }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {isActive && statusTime ? (
        <View style={styles.statusBlock}>
          <ThemedText type="bodyBold">{statusTime}</ThemedText>
          <ThemedText
            type="label"
            style={[styles.statusLabel, { color: entryColor("todo") }]}
          >
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
    gap: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },
  leftBorder: {
    width: 3,
    height: "100%",
    minHeight: 36,
    borderRadius: tokens.radius.sm,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  timeRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  clockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBlock: {
    alignItems: "flex-end",
    gap: 1,
  },
  statusLabel: {
    letterSpacing: 0.5,
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
    opacity: 0.3,
  },
});
