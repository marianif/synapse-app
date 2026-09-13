import dayjs from "dayjs";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { HabitMonthGrid } from "@/components/molecules/habit-month-grid";
import { HabitStats } from "@/components/molecules/habit-stats";
import { HabitYearHeatmap } from "@/components/molecules/habit-year-heatmap";
import { SelectChip } from "@/components/atoms/select-chip";
import { ThemedText } from "@/components/atoms/themed-text";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { formatTime12h, parseDate, parseTimeToMinutes } from "@/lib/date-utils";
import { expandHabitCadence, humanizeRule } from "@/lib/recurrence";

import type { DbHabit } from "@/lib/types";

type GridMode = "month" | "year";

/**
 * A habit opened up, read-only: the reason as the hero, the settings as a
 * static readout, the easy-read stats, and the history grid (month default,
 * year switch). Editing is a deliberate second step — the body CTA or the
 * header pencil opens the /habit editor modal. Nothing on this screen writes.
 */
export default function HabitDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { habits, habitCompletions, habitsLoading, projects } = useDatabase();

  const [gridMode, setGridMode] = useState<GridMode>("month");
  const [monthOffset, setMonthOffset] = useState(0);

  const today = useMemo(() => dayjs().startOf("day"), []);

  const habit: DbHabit | undefined = id
    ? habits.find((h) => h.id === id)
    : undefined;

  const done = useMemo(() => {
    if (!habit) return new Set<string>();
    return new Set(
      habitCompletions
        .filter((c) => c.habit_id === habit.id)
        .map((c) => c.instance_date),
    );
  }, [habit, habitCompletions]);

  const stats = useMemo(() => {
    if (!habit) {
      return { last30Done: 0, last30Scheduled: 0, total: 0, thisMonth: 0 };
    }
    const scheduled30 = expandHabitCadence(
      habit,
      today.subtract(29, "day").toDate(),
      today.toDate(),
    );
    const scheduledMonth = expandHabitCadence(
      habit,
      today.startOf("month").toDate(),
      today.toDate(),
    );
    return {
      last30Done: scheduled30.filter((k) => done.has(k)).length,
      last30Scheduled: scheduled30.length,
      total: done.size,
      thisMonth: scheduledMonth.filter((k) => done.has(k)).length,
    };
  }, [habit, done, today]);

  if (!habit && habitsLoading) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.paper }]}>
        <ActivityIndicator color={colors.inkMuted} />
      </View>
    );
  }

  if (!habit) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.paper }]}>
        <ThemedText type="hand" muted>
          This habit is gone.
        </ThemedText>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.goneBack, { backgroundColor: colors.surfaceSubtle }]}
        >
          <ThemedText type="micro" style={{ color: colors.ink }}>
            GO BACK
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  const project = habit.project_id
    ? (projects.find((p) => p.id === habit.project_id) ?? null)
    : null;
  // Glyph precedence: project emoji (locked when linked) → habit emoji →
  // Repeat fallback.
  const glyph = project?.emoji ?? habit.emoji ?? null;
  const cadence = humanizeRule(habit.cadence);
  const nudge = habit.reminder_time
    ? formatTime12h(parseTimeToMinutes(habit.reminder_time) ?? 0)
    : "Off";
  const startDate = parseDate(habit.start_date);
  const since = startDate ? dayjs(startDate).format("D MMM YYYY") : habit.start_date;

  const openEditor = (): void => {
    router.push({ pathname: "/habit", params: { id: habit.id } });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen
        options={{
          header: () => (
            <ScreenHeader
              title={habit.title}
              kicker={cadence}
              glyph={
                <IconSymbol name="Repeat" size={22} color={colors.inkMuted} />
              }
              onBack={() => router.back()}
              headerRight={
                <Pressable
                  onPress={openEditor}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${habit.title}`}
                  style={styles.headerButton}
                >
                  <IconSymbol name="Edit2" size={20} color={colors.ink} />
                </Pressable>
              }
            />
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity — the glyph, the name, and the user's own reason as the
            hero. The reason is the one thing this screen must never bury. */}
        <View style={styles.identity}>
          <View
            style={[styles.glyph, { backgroundColor: colors.surfaceSubtle }]}
          >
            {glyph ? (
              <ThemedText type="title">{glyph}</ThemedText>
            ) : (
              <IconSymbol name="Repeat" size={24} color={colors.inkMuted} />
            )}
          </View>
          <ThemedText type="title" style={styles.title}>
            {habit.title}
          </ThemedText>
          <ThemedText type="hand" muted style={styles.reason}>
            {habit.motivation}
          </ThemedText>
          {habit.status === "paused" ? (
            <View
              style={[styles.pausedChip, { backgroundColor: colors.surfaceSubtle }]}
            >
              <ThemedText type="micro" muted>
                PAUSED
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* The one action on the page. Editing is deliberate, not ambient. */}
        <Pressable
          onPress={openEditor}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${habit.title}`}
          style={({ pressed }) => [
            styles.editButton,
            {
              backgroundColor: pressed
                ? colors.accent.clayPressed
                : colors.accent.clay,
            },
          ]}
        >
          <IconSymbol name="Edit2" size={18} color={colors.accent.onClay} />
          <ThemedText type="bodyBold" style={{ color: colors.accent.onClay }}>
            Edit habit
          </ThemedText>
        </Pressable>

        {/* Static readout — what this habit is, exactly as configured. */}
        <View style={styles.readout}>
          <Readout label="HOW OFTEN" value={cadence} />
          <Readout label="NUDGE" value={nudge} />
          <Readout
            label="PROJECT"
            value={
              project
                ? `${project.emoji ? `${project.emoji} ` : ""}${project.title}`
                : "Autonomous"
            }
          />
          <Readout
            label="STATUS"
            value={habit.status === "paused" ? "Paused" : "Active"}
          />
          <Readout label="SINCE" value={since} />
        </View>

        {/* Stats — easy-read counts, no streaks, no bests. */}
        <View style={styles.section}>
          <ThemedText type="label" muted style={styles.sectionLabel}>
            STATS
          </ThemedText>
          <HabitStats
            last30Done={stats.last30Done}
            last30Scheduled={stats.last30Scheduled}
            total={stats.total}
            thisMonth={stats.thisMonth}
          />
        </View>

        {/* History grid — month default, year on switch. */}
        <View style={styles.section}>
          <View style={styles.gridHeader}>
            <ThemedText type="label" muted style={styles.sectionLabel}>
              HISTORY
            </ThemedText>
            <View style={styles.segment}>
              <SelectChip
                label="Month"
                selected={gridMode === "month"}
                accentColor={colors.accent.clay}
                compact
                onPress={() => setGridMode("month")}
              />
              <SelectChip
                label="Year"
                selected={gridMode === "year"}
                accentColor={colors.accent.clay}
                compact
                onPress={() => setGridMode("year")}
              />
            </View>
          </View>

          {gridMode === "month" ? (
            <HabitMonthGrid
              habit={habit}
              done={done}
              monthOffset={monthOffset}
              onChangeMonth={setMonthOffset}
            />
          ) : (
            <HabitYearHeatmap habit={habit} done={done} />
          )}

          <View style={styles.legend}>
            <Legend color={colors.feedback.success} label="Done" />
            <Legend color={colors.inkMuted} label="Missed" opacity={0.3} />
            <Legend color={colors.inkMuted} label="Off cadence" opacity={0.12} />
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function Readout({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={styles.readoutRow}>
      <ThemedText type="micro" muted style={styles.readoutLabel}>
        {label}
      </ThemedText>
      <ThemedText
        type="mono"
        numberOfLines={1}
        style={[styles.readoutValue, { color: colors.ink }]}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function Legend({
  color,
  label,
  opacity = 1,
}: {
  color: string;
  label: string;
  opacity?: number;
}): React.ReactElement {
  return (
    <View style={styles.legendItem}>
      <View
        style={[styles.legendSwatch, { backgroundColor: color, opacity }]}
      />
      <ThemedText type="caption" muted>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.md,
  },
  goneBack: {
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.xl,
    borderRadius: tokens.radius.pill,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
    gap: tokens.space.xxl,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    gap: tokens.space.sm,
    alignItems: "flex-start",
  },
  glyph: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    letterSpacing: tokens.type.title.tracking,
  },
  reason: {
    marginTop: -tokens.space.xs,
  },
  pausedChip: {
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.sm,
    minHeight: 52,
    borderRadius: tokens.radius.lg,
  },
  readout: {
    gap: tokens.space.xs,
  },
  readoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md,
    minHeight: 40,
  },
  readoutLabel: {
    letterSpacing: 1,
  },
  readoutValue: {
    flexShrink: 1,
    textAlign: "right",
  },
  section: {
    gap: tokens.space.md,
  },
  sectionLabel: {
    letterSpacing: 0.8,
  },
  gridHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md,
  },
  segment: {
    flexDirection: "row",
    gap: tokens.space.xs,
  },
  legend: {
    flexDirection: "row",
    gap: tokens.space.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  bottomSpacer: {
    height: 120,
  },
});
