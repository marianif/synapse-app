import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, tokens, useTheme } from "@/constants/theme";

import type { FieldRowItem } from "@/components/molecules/field-row";

interface FieldBriefingProps {
  /** Current time, injected so the molecule stays pure. */
  now: Date;
  /** STAKES rows (deadlines + todos), pre-sorted hottest-first. */
  stakes: FieldRowItem[];
  /** PRESENT rows (ideas + events + someday), pre-sorted hottest-first. */
  present: FieldRowItem[];
}

function greetingFor(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The companion's read of the field. Counts the hot stakes and speaks one true
 * line about them — never imperative, always observational (the brief's
 * "activation ≠ pressure" rule). The "next" chip surfaces the single thing most
 * worth a glance: the hottest stake if any are on the line, otherwise a present
 * thing to keep alive — so the chip never only ever points at pressure.
 */
function brief(
  stakes: FieldRowItem[],
  present: FieldRowItem[],
): { line: string; next: FieldRowItem | null } {
  const total = stakes.length + present.length;
  if (total === 0) {
    return { line: "Your field is clear. Capture the first thing below.", next: null };
  }

  const hot = stakes.filter((s) => s.heat === "hot");

  if (hot.length === 0) {
    // Nothing pressing — point the eye at something present, not a deadline.
    const line =
      present.length > 0
        ? "Nothing's pressing. Your ideas are still here."
        : "Nothing's on the line. Steady field.";
    return { line, next: present[0] ?? stakes[0] ?? null };
  }

  const line =
    hot.length === 1
      ? "One thing's on the line today. The rest can wait."
      : `${hot.length} things are on the line. The rest can wait.`;
  return { line, next: hot[0] };
}

export function FieldBriefing({
  now,
  stakes,
  present,
}: FieldBriefingProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();

  const { line, next } = brief(stakes, present);
  const total = stakes.length + present.length;
  const hotCount = stakes.filter((s) => s.heat === "hot").length;
  const captured = 0; // reserved: "+N today" once capture timestamps are read

  return (
    <View style={styles.wrap}>
      <ThemedText type="display" style={{ color: colors.ink }}>
        {`${greetingFor(now.getHours())}.`}
      </ThemedText>
      <ThemedText type="body" style={[styles.line, { color: colors.inkMuted }]}>
        {line}
      </ThemedText>

      {next ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: "/detail", params: { id: next.id } })
          }
          accessibilityRole="button"
          accessibilityLabel={`Open ${next.title}${next.when ? `, ${next.when}` : ""}`}
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: colors.surface },
            tokens.elevation.tile,
            pressed && styles.chipPressed,
          ]}
        >
          <View
            style={[styles.chipEdge, { backgroundColor: entryColor(next.type) }]}
          />
          <ThemedText
            type="item"
            numberOfLines={1}
            style={[styles.chipTitle, { color: colors.ink }]}
          >
            {next.title}
          </ThemedText>
          {next.when ? (
            <ThemedText
              type="mono"
              style={[styles.chipWhen, { color: colors.inkMuted }]}
            >
              {next.when}
            </ThemedText>
          ) : null}
          <ThemedText
            type="mono"
            style={[styles.chipArrow, { color: entryColor(next.type) }]}
          >
            →
          </ThemedText>
        </Pressable>
      ) : null}

      {total > 0 ? (
        <ThemedText
          type="label"
          style={[styles.readout, { color: colors.inkMuted }]}
        >
          {`${hotCount} HOT · ${present.length} PRESENT${
            captured > 0 ? ` · +${captured} TODAY` : ""
          }`}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.sm,
    paddingTop: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  line: {
    marginTop: -tokens.space.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingLeft: tokens.space.md,
    paddingRight: tokens.space.md,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    marginTop: tokens.space.xs,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipEdge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  chipTitle: {
    flex: 1,
    marginRight: tokens.space.sm,
  },
  chipWhen: {
    marginRight: tokens.space.sm,
  },
  chipArrow: {},
  readout: {
    marginTop: tokens.space.xs,
    paddingHorizontal: tokens.space.xs,
  },
});
