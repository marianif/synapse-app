import * as Haptics from "expo-haptics";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";

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
  /**
   * The linked project's emoji — the glyph a project-linked habit inherits.
   * When set it wins over the habit's own emoji (locked inheritance).
   */
  projectEmoji?: string | null;
  onToggle: (habit: DbHabit) => void;
  /** Body tap — opens the read-only detail with the stats and grid. */
  onOpen: (habit: DbHabit) => void;
  /** Swipe action — opens the editor modal directly. */
  onEdit: (habit: DbHabit) => void;
}

/**
 * One habit: its glyph, title, the user's reason in the handwritten layer, the
 * recent days as presence, and — when it is due — the completion disc. Tapping
 * the body opens the read-only detail; swiping reveals a single neutral Edit
 * action that opens the editor. No streak, no count, no celebration: completing
 * is met by the user's own words, already on the row.
 */
export function HabitRow({
  habit,
  days,
  dueToday,
  doneToday,
  projectEmoji,
  onToggle,
  onOpen,
  onEdit,
}: HabitRowProps): React.ReactElement {
  const { colors } = useTheme();
  const paused = habit.status === "paused";
  const swipeableRef = useRef<Swipeable>(null);

  // Glyph precedence: a project-linked habit inherits the project's emoji
  // (locked); otherwise the habit's own emoji; otherwise the Repeat fallback.
  const glyph = projectEmoji ?? habit.emoji ?? null;

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

  const handleEdit = (): void => {
    swipeableRef.current?.close();
    onEdit(habit);
  };

  const renderRightActions = (): React.ReactElement => (
    <RectButton
      style={[styles.editAction, { backgroundColor: colors.surfaceSubtle }]}
      onPress={handleEdit}
      accessibilityLabel={`Edit ${habit.title}`}
    >
      <IconSymbol name="Edit2" size={18} color={colors.ink} />
      <ThemedText type="micro" style={{ color: colors.inkMuted }}>
        EDIT
      </ThemedText>
    </RectButton>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
    >
      <Pressable
        onPress={() => onOpen(habit)}
        accessibilityRole="button"
        accessibilityLabel={`${habit.title}. ${habit.motivation}`}
        accessibilityHint="Opens habit details"
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surface },
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[styles.glyph, { backgroundColor: colors.surfaceSubtle }]}
        >
          {glyph ? (
            <ThemedText type="item">{glyph}</ThemedText>
          ) : (
            <IconSymbol name="Repeat" size={17} color={colors.inkMuted} />
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
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

          {/* The reason, verbatim, in the companion hand. It is the
              encouragement engine: present on the surface, not hidden in a
              detail view. */}
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
    </Swipeable>
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
  glyph: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
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
  // The one swipe action: neutral by design — editing is a correction, not a
  // destructive or completing act, so it never takes the danger/success hues.
  editAction: {
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    width: 72,
    borderRadius: tokens.radius.md,
    marginLeft: tokens.space.sm,
  },
});
