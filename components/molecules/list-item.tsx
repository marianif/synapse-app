import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { SwipeableRow } from "@/components/organisms/swipeable-row";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  EntryAccent,
  Radius,
  Spacing,
  Surface,
  TextColors,
} from "@/constants/theme";

import type { EntryType } from "@/components/atoms/entry-dot";

export type ItemStatus = "scheduled" | "active" | "completed";

interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Wall-clock time string, e.g. "02:00 PM" */
  time?: string;
  /** Optional compact time chip shown on the right, e.g. "10:00" */
  timeChip?: string;
  entryType: EntryType;
  status?: ItemStatus;
  /** Accent color derived from entryType at the screen level */
  accentColor: string;
  isRecurring?: boolean;
  onToggle?: () => void;
  onPress?: () => void;
  /** Called when user swipes and confirms deletion */
  onDelete?: () => void;
}

/**
 * List-screen todo/deadline/someday row.
 *
 * Todo / Deadline layout: [Circle checkbox] [dot + title + status] [optional time chip]
 * Someday layout:         [Sparkle icon]    [dot + title + subtitle] (no status row)
 *
 * States (todo/deadline only):
 *  - scheduled  → empty circle, normal text
 *  - active     → circle with accent ring, "ACTIVE NOW" status label
 *  - completed  → checkmark circle, strikethrough text, muted colors
 */
export function ListItem({
  title,
  subtitle,
  time,
  timeChip,
  entryType,
  status = "scheduled",
  accentColor,
  isRecurring,
  onToggle,
  onPress,
  onDelete,
}: ListItemProps): React.ReactElement {
  const isSomeday = entryType === "someday";

  const renderContent = (): React.ReactElement => {
    if (isSomeday) {
      return (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Open ${title}`}
        >
          {/* Sparkle icon slot */}
          <View style={styles.sparkleSlot}>
            <IconSymbol
              name="star-four-points"
              size={18}
              color={EntryAccent.someday}
            />
          </View>

          {/* Dot + content */}
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <EntryDot type="someday" size={8} />
              <ThemedText
                type="bodyBold"
                numberOfLines={1}
                style={styles.titleText}
              >
                {title}
              </ThemedText>
            </View>
            {subtitle ? (
              <ThemedText type="caption" muted style={styles.somedaySubtitle}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>

          {/* Amber arrow */}
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={EntryAccent.someday + "80"}
          />
        </Pressable>
      );
    }

    // ── Task / Deadline variant ──────────────────────────────────────────────────
    const isCompleted = status === "completed";
    const isActive = status === "active";

    const statusLabel = isCompleted
      ? "COMPLETED"
      : isActive
        ? "ACTIVE NOW"
        : "SCHEDULED";

    const statusColor = isCompleted
      ? TextColors.tertiary
      : isActive
        ? accentColor
        : TextColors.tertiary;

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {/* Checkbox */}
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          style={[
            styles.checkbox,
            isCompleted && styles.checkboxCompleted,
            isActive && { borderColor: accentColor },
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isCompleted }}
          accessibilityLabel={`Mark "${title}" as ${isCompleted ? "incomplete" : "complete"}`}
        >
          {isCompleted && (
            <MaterialCommunityIcons
              name="check"
              size={16}
              color={TextColors.primary}
            />
          )}
        </Pressable>

        {/* Dot + content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <EntryDot type={entryType} size={8} />
            {isCompleted ? (
              <Text
                style={[styles.titleStrike, { color: TextColors.tertiary }]}
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : (
              <ThemedText
                type="bodyBold"
                numberOfLines={1}
                style={styles.titleText}
              >
                {title}
              </ThemedText>
            )}
          </View>
          <View style={styles.statusRow}>
            {isRecurring && (
              <View
                style={[
                  styles.recurringBadge,
                  { backgroundColor: accentColor + "18" },
                ]}
              >
                <MaterialCommunityIcons
                  name="repeat"
                  size={10}
                  color={accentColor}
                />
                <ThemedText
                  type="caption"
                  style={[styles.recurringBadgeText, { color: accentColor }]}
                >
                  REPEATING
                </ThemedText>
              </View>
            )}
            <View style={styles.statusTextContainer}>
              <ThemedText
                type="caption"
                style={[styles.statusLabel, { color: statusColor }]}
              >
                {statusLabel}
              </ThemedText>
              {time ? (
                <ThemedText type="caption" style={styles.statusTime}>
                  {" • "}
                  {time}
                </ThemedText>
              ) : null}
            </View>
            {subtitle && !time ? (
              <ThemedText type="caption" muted>
                {" • "}
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* Optional time chip (e.g. "10:00") */}
        {timeChip ? (
          <View style={styles.timeChip}>
            <ThemedText type="caption" style={styles.timeChipText}>
              {timeChip}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>
    );
  };

  if (onDelete) {
    return <SwipeableRow onDelete={onDelete}>{renderContent()}</SwipeableRow>;
  }

  return renderContent();
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  rowPressed: {
    opacity: 0.8,
  },
  // Someday-specific
  sparkleSlot: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  somedaySubtitle: {
    paddingLeft: 16, // aligns under dot
  },
  // Task/Deadline
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: TextColors.disabled,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxCompleted: {
    backgroundColor: TextColors.tertiary,
    borderColor: TextColors.tertiary,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  titleText: {
    flex: 1,
  },
  titleStrike: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textDecorationLine: "line-through",
  },
  statusRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
  },
  statusTime: {
    color: TextColors.tertiary,
  },
  statusTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  timeChip: {
    backgroundColor: Surface.containerHigh,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    flexShrink: 0,
  },
  timeChipText: {
    color: TextColors.secondary,
    letterSpacing: 0.2,
  },
  recurringBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    gap: Spacing.xs,
    marginRight: Spacing.sm,
  },
  recurringBadgeText: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
});
