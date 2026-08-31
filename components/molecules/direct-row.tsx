import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useEntryKicker, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
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
  onPress: (entry: DbEntry) => void;
  onMarkDone: (entry: DbEntry) => void;
  onDelete: (entry: DbEntry) => void;
}

/**
 * One direct-zone row: a minimal 6px type dot, the title, and a mono when-label
 * readout on the right ("Someday" when undated — treated as a plain when-label,
 * not a separate badge). The when-label runs in the entry's type color when the
 * date is approaching or expired, and in muted ink when it's comfortably out or
 * undated — date pressure shows as color, not position.
 * A line carrying subtasks grows two readouts: a muted mono "N subtasks" count
 * right-justified on the title line, and a bottom-edge completion thread whose
 * type-shaded fill + right-hand percentage show how far the checklist is. Both
 * stay sub-visual (never louder than the dot or the when-label) and dim with a
 * done line.
 * Swiping reveals actions — an open row can be marked done OR deleted; a done
 * row can only be deleted (it's already crossed off, completing it again is
 * meaningless). A done row reads like a struck-through agenda line: muted ink,
 * line-through title, dimmed dot.
 */
export function DirectRow({
  entry,
  onPress,
  onMarkDone,
  onDelete,
}: DirectRowProps): React.ReactElement {
  const { colors } = useTheme();
  const { tasks } = useDatabase();
  const swipeableRef = useRef<Swipeable>(null);
  const done = isDone(entry);

  const type = entry.type as EntryType;
  const dateStr = entry.due_date ?? entry.scheduled_date ?? null;
  const time = entry.scheduled_time ?? entry.due_time ?? null;
  const days = daysUntil(dateStr);
  const when = entry.due_range
    ? horizonLabel(entry.due_range)
    : whenLabel(dateStr, time, days);

  // When-label color: charged (scheme-aware type shade) when approaching or
  // expired, muted when comfortably out. A done line is settled — always muted,
  // never charged.
  const typeShade = useEntryKicker(type);
  const whenColor = !done && isWhenCharged(days) ? typeShade : colors.inkMuted;

  // Subtask rollup for this row. Todos and deadlines are the only taskable
  // types; ideas always roll up to zero, so the meta stays hidden for them.
  // The count phrase sits on the title line; the completion thread + percentage
  // live on the row's bottom edge.
  const subtasks = tasks.filter((t) => t.entry_id === entry.id);
  const subtaskTotal = subtasks.length;
  const subtaskDone = subtasks.filter((t) => t.done === 1).length;
  const pct =
    subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

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
        onPress={() => onPress(entry)}
        accessibilityRole="button"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${entry.title}, ${when}${done ? ", done" : ""}`}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surface },
          pressed && styles.pressed,
        ]}
      >
        {/* Title line: minimal 6px type dot, the title, the mono when-label,
            and — when the line carries subtasks — the "N subtasks" count,
            right-justified on the same line. */}
        <View style={[styles.body, { minHeight: subtaskTotal ? 38 : 48 }]}>
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
        </View>

        {/* Completion thread along the bottom edge, with the percentage beside
            it on the right. Rendered only when the line carries subtasks; a
            done line dims the whole readout with the struck-through title. */}
        {subtaskTotal > 0 ? (
          <View style={[styles.footer, done && styles.footerDone]}>
            <View
              style={[styles.track, { backgroundColor: colors.surfaceSubtle }]}
              accessibilityLabel={`${pct} percent of subtasks done`}
            >
              <View
                style={[
                  styles.fill,
                  {
                    width: `${pct}%`,
                    backgroundColor: typeShade,
                    boxShadow: [
                      {
                        offsetX: 0,
                        offsetY: 0,
                        blurRadius: 2,
                        color: typeShade,
                      },
                    ],
                  },
                ]}
              />
            </View>
            <ThemedText type="mono" muted style={styles.pct}>
              {`${pct}%`}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  // Tile: a column stack of the title line + the optional completion footer.
  // Horizontal padding is shared so the bottom thread aligns with the title.
  row: {
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.lg,
  },
  pressed: {
    opacity: 0.8,
  },

  // Title line — keeps the 48pt touch target; the title flexes so the mono
  // readouts sit right-justified on the same line.
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
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
  taskCount: {
    textAlign: "right",
    // Muted monospace count — the signal layer owns numbers. No extra styling.
  },

  // Bottom-edge completion thread: a tonal track + a type-shaded fill, with the
  // percentage beside it on the right. Compact enough to read as a baseline,
  // not a second line of content.
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingBottom: tokens.space.sm,
  },
  footerDone: {
    opacity: 0.35,
  },
  track: {
    flex: 1,
    height: 2,
    borderRadius: tokens.radius.pill,
  },
  fill: {
    height: "100%",
    borderRadius: tokens.radius.pill,
  },
  pct: {
    minWidth: 32,
    textAlign: "right",
    fontSize: 11,
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
