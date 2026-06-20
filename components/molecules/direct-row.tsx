import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, tokens, useTheme } from "@/constants/theme";
import { daysUntil, isDone, isWhenCharged, whenLabel } from "@/lib/direct-when";
import { horizonLabel } from "@/lib/horizons";

import type { DbEntry, EntryType } from "@/lib/types";

// The delete action sits on the bright danger code; its icon must be a fixed
// cool-near-black in both schemes (4.75:1). colors.ink fails AA in dark on the
// mid-red. The done action sits on emerald success; same near-black reads AA on
// it (4.9:1). Reuses the dark-paper token value (mirrors SwipeableRow).
const ON_ACTION = tokens.color.dark.paper;

interface DirectRowProps {
  entry: DbEntry;
  onMarkDone: (entry: DbEntry) => void;
  onDelete: (entry: DbEntry) => void;
}

/**
 * One direct-zone row: a minimal 6px type dot, the title, and a mono when-label
 * readout on the right ("Someday" when undated — treated as a plain when-label,
 * not a separate badge). The when-label runs in the entry's type color when the
 * date is approaching or expired, and in muted ink when it's comfortably out or
 * undated — date pressure shows as color, not position.
 * Swiping reveals actions — an open row can be marked done OR deleted; a done
 * row can only be deleted (it's already crossed off, completing it again is
 * meaningless). A done row reads like a struck-through agenda line: muted ink,
 * line-through title, dimmed dot.
 */
export function DirectRow({
  entry,
  onMarkDone,
  onDelete,
}: DirectRowProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);
  const done = isDone(entry);

  const type = entry.type as EntryType;
  const dateStr = entry.due_date ?? entry.scheduled_date ?? null;
  const time = entry.scheduled_time ?? entry.due_time ?? null;
  const days = daysUntil(dateStr);
  const when = entry.due_range
    ? horizonLabel(entry.due_range)
    : whenLabel(dateStr, time, days);

  // When-label color: charged (type color) when approaching or expired, muted
  // when comfortably out. A done line is settled — always muted, never charged.
  const whenColor =
    !done && isWhenCharged(days) ? entryColor(type) : colors.inkMuted;

  const handleMarkDone = (): void => {
    swipeableRef.current?.close();
    onMarkDone(entry);
  };

  const handleDelete = (): void => {
    swipeableRef.current?.close();
    onDelete(entry);
  };

  const renderRightActions = (): React.ReactElement => (
    <View style={styles.actions}>
      {/* An open row can be marked done; a done one is already crossed off. */}
      {!done ? (
        <RectButton
          style={[styles.action, { backgroundColor: colors.feedback.success }]}
          onPress={handleMarkDone}
          accessibilityLabel={`Mark ${entry.title} done`}
        >
          <MaterialCommunityIcons name="check" size={22} color={ON_ACTION} />
        </RectButton>
      ) : null}
      <RectButton
        style={[styles.action, { backgroundColor: colors.feedback.danger }]}
        onPress={handleDelete}
        accessibilityLabel={`Delete ${entry.title}`}
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={22}
          color={ON_ACTION}
        />
      </RectButton>
    </View>
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
        onPress={() =>
          router.push({
            pathname: "/detail",
            params: { id: entry.id, entryType: entry.type },
          })
        }
        accessibilityRole="button"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${entry.title}, ${when}${done ? ", done" : ""}`}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surface },
        ]}
      >
        {/* minimal 6px type dot — color is categorization, dimmed on a done line */}
        <View style={done ? styles.dotDone : undefined}>
          <EntryDot type={type} />
        </View>

        <ThemedText
          type="body"
          numberOfLines={1}
          style={[
            styles.title,
            {
              color: done ? colors.inkMuted : colors.ink,
              textDecorationLine: done ? "line-through" : "none",
            },
          ]}
        >
          {entry.title}
        </ThemedText>

        <ThemedText type="mono" style={[styles.when, { color: whenColor }]}>
          {when}
        </ThemedText>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 48,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.md,
  },

  // a done line's dot quiets down — settled, not pressing
  dotDone: {
    opacity: 0.35,
  },
  title: {
    flex: 1,
  },
  when: {
    textAlign: "right",
  },
  // swipe actions sit flush behind the row; the row body slides to reveal them
  actions: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 50,
    borderRadius: tokens.radius.pill,
    marginLeft: tokens.space.sm,
  },
});
