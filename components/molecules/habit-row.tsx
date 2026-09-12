import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import {
  HabitPresenceStrip,
  type HabitDay,
} from "@/components/atoms/habit-presence-strip";
import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { humanizeRule } from "@/lib/recurrence";
import type { DbHabit } from "@/lib/types";

interface HabitRowProps {
  habit: DbHabit;
  /** Oldest → newest, the last cell is today. */
  days: HabitDay[];
  /** Today's instance is being offered (false for resting habits). */
  dueToday: boolean;
  doneToday: boolean;
  /** The linked project's emoji, when it has one. */
  projectEmoji?: string | null;
  onToggle: (habit: DbHabit) => void;
  onOpen: (habit: DbHabit) => void;
}

/**
 * One habit: its title, the user's reason in the handwritten layer, the recent
 * days as presence, and — when it is due — the completion disc. Tapping the body
 * opens the habit's settings; tapping the disc honors today. No streak, no
 * count, no celebration: completing is met by the user's own words, already on
 * the row.
 */
export function HabitRow({
  habit,
  days,
  dueToday,
  doneToday,
  projectEmoji,
  onToggle,
  onOpen,
}: HabitRowProps): React.ReactElement {
  const { colors } = useTheme();
  const paused = habit.status === "paused";

  const handleToggle = (): void => {
    // Completing is a success beat (soft, not a cheer); un-marking is a quiet
    // correction.
    if (doneToday) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    }
    onToggle(habit);
  };

  return (
    <Pressable
      onPress={() => onOpen(habit)}
      accessibilityRole="button"
      accessibilityLabel={`${habit.title}. ${habit.motivation}`}
      accessibilityHint="Opens habit settings"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.body}>
        <View style={styles.titleRow}>
          {projectEmoji ? (
            <ThemedText type="item" style={styles.emoji}>
              {projectEmoji}
            </ThemedText>
          ) : null}
          <ThemedText type="item" numberOfLines={1} style={styles.title}>
            {habit.title}
          </ThemedText>
          {paused ? (
            <View
              style={[
                styles.pausedChip,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                PAUSED
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* The reason, verbatim, in the companion hand. It is the encouragement
            engine: present on the surface, not hidden in a detail view. */}
        <ThemedText
          type="hand"
          muted
          numberOfLines={1}
          style={styles.reason}
        >
          {habit.motivation}
        </ThemedText>

        <View style={styles.metaRow}>
          <HabitPresenceStrip days={days} muted={paused} />
          <ThemedText type="mono" muted style={styles.cadence}>
            {humanizeRule(habit.cadence)}
          </ThemedText>
        </View>
      </View>

      {dueToday ? (
        <Pressable
          onPress={handleToggle}
          hitSlop={4}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: doneToday }}
          accessibilityLabel={
            doneToday
              ? `Mark ${habit.title} not done today`
              : `Mark ${habit.title} done today`
          }
          style={[
            styles.disc,
            {
              backgroundColor: doneToday
                ? colors.feedback.success
                : colors.surfaceSubtle,
            },
          ]}
        >
          <IconSymbol
            name="Check"
            size={18}
            color={doneToday ? tokens.color.light.ink : colors.inkMuted}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 64,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  pressed: {
    opacity: 0.85,
  },
  body: {
    flex: 1,
    gap: tokens.space.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  emoji: {
    fontSize: 16,
  },
  title: {
    flexShrink: 1,
  },
  pausedChip: {
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
  },
  reason: {
    // Caveat's optical size runs small; the hand step already sizes it up.
    marginTop: -2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    marginTop: tokens.space.xs,
  },
  cadence: {
    flexShrink: 1,
  },
  disc: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
