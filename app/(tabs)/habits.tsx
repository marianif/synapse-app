import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { HabitRow } from "@/components/molecules/habit-row";
import { ThemedText } from "@/components/atoms/themed-text";
import type { HabitDay } from "@/components/atoms/habit-presence-strip";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { toDisplayDate } from "@/lib/date-utils";
import { expandHabitCadence } from "@/lib/recurrence";

import type { DbHabit } from "@/lib/types";

const PRESENCE_DAYS = 7;

interface DecoratedHabit {
  habit: DbHabit;
  dueToday: boolean;
  doneToday: boolean;
  days: HabitDay[];
  projectEmoji: string | null;
}

/**
 * The Habits tab: the user's chosen cadences, today first, each carrying their
 * own reason instead of a streak. The tab reads and marks; creating and
 * managing happen in the /habit modal, the same compose pattern as /note.
 */
export default function HabitsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    habits,
    habitCompletions,
    habitsLoading,
    projects,
    toggleHabitInstance,
  } = useDatabase();

  // Anchor "now" once per mount so the day window is stable across renders.
  const today = useMemo(() => dayjs().startOf("day").toDate(), []);
  const todayKey = useMemo(() => toDisplayDate(today), [today]);
  const windowStart = useMemo(
    () => dayjs(today).subtract(PRESENCE_DAYS - 1, "day").toDate(),
    [today],
  );

  const doneKeys = useMemo(
    () =>
      new Set(
        habitCompletions.map((c) => `${c.habit_id}::${c.instance_date}`),
      ),
    [habitCompletions],
  );

  const projectEmojis = useMemo(() => {
    const map: Record<string, string> = {};
    for (const project of projects) {
      if (project.emoji) map[project.id] = project.emoji;
    }
    return map;
  }, [projects]);

  const decorated = useMemo<DecoratedHabit[]>(
    () =>
      habits.map((habit) => {
        const dueToday =
          habit.status === "active" &&
          expandHabitCadence(habit, today, today).length > 0;
        const scheduled = new Set(
          expandHabitCadence(habit, windowStart, today),
        );
        const days: HabitDay[] = [];
        for (let i = 0; i < PRESENCE_DAYS; i += 1) {
          const key = toDisplayDate(dayjs(windowStart).add(i, "day").toDate());
          days.push({
            date: key,
            scheduled: scheduled.has(key),
            done: doneKeys.has(`${habit.id}::${key}`),
            today: i === PRESENCE_DAYS - 1,
            future: false,
          });
        }
        return {
          habit,
          dueToday,
          doneToday: doneKeys.has(`${habit.id}::${todayKey}`),
          days,
          projectEmoji: habit.project_id
            ? (projectEmojis[habit.project_id] ?? null)
            : null,
        };
      }),
    [habits, doneKeys, projectEmojis, today, todayKey, windowStart],
  );

  const todayItems = decorated.filter((item) => item.dueToday);
  const restingItems = decorated.filter((item) => !item.dueToday);
  const allDone =
    todayItems.length > 0 && todayItems.every((item) => item.doneToday);

  const openCreate = (): void => {
    router.push("/habit");
  };

  const openEdit = (habit: DbHabit): void => {
    router.push({ pathname: "/habit", params: { id: habit.id } });
  };

  const renderRow = (item: DecoratedHabit): React.ReactElement => (
    <HabitRow
      key={item.habit.id}
      habit={item.habit}
      days={item.days}
      dueToday={item.dueToday}
      doneToday={item.doneToday}
      projectEmoji={item.projectEmoji}
      onToggle={(habit) => {
        void toggleHabitInstance(habit.id, todayKey).catch((error) =>
          console.error("[Habits] toggleHabitInstance failed:", error),
        );
      }}
      onOpen={openEdit}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText
              type="label"
              style={[styles.kicker, { color: colors.inkMuted }]}
            >
              HABITS
            </ThemedText>
            <ThemedText type="display" style={styles.title}>
              What repeats
            </ThemedText>
            {habits.length > 0 ? (
              <ThemedText type="mono" muted style={styles.readout}>
                {`${todayItems.length} due today · ${restingItems.length} resting`}
              </ThemedText>
            ) : null}
          </View>

          {habits.length > 0 ? (
            <Pressable
              onPress={openCreate}
              accessibilityRole="button"
              accessibilityLabel="New habit"
              style={({ pressed }) => [
                styles.newButton,
                { backgroundColor: colors.surfaceSubtle },
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol name="Plus" size={15} color={colors.ink} />
              <ThemedText type="bodyBold" style={{ color: colors.ink }}>
                New
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {habitsLoading && habits.length === 0 ? (
          <ThemedText type="body" muted>
            Checking…
          </ThemedText>
        ) : habits.length === 0 ? (
          <View style={styles.inception}>
            <ThemedText type="label" muted style={styles.kicker}>
              NO HABITS YET
            </ThemedText>
            <ThemedText type="title" style={styles.inceptionTitle}>
              Name one thing you want to repeat
            </ThemedText>
            <ThemedText type="body" muted style={styles.inceptionBody}>
              We&apos;ll ask why it matters, then say it back when it&apos;s due.
              No streaks, no scores.
            </ThemedText>
            <Pressable
              onPress={openCreate}
              accessibilityRole="button"
              accessibilityLabel="New habit"
              style={({ pressed }) => [
                styles.startButton,
                {
                  backgroundColor: pressed
                    ? colors.accent.clayPressed
                    : colors.accent.clay,
                },
              ]}
            >
              <IconSymbol
                name="Plus"
                size={18}
                color={colors.accent.onClay}
              />
              <ThemedText
                type="bodyBold"
                style={{ color: colors.accent.onClay }}
              >
                New habit
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            {todayItems.length > 0 ? (
              <View style={styles.section}>
                <ThemedText type="label" muted style={styles.sectionLabel}>
                  TODAY
                </ThemedText>
                <View style={styles.rows}>{todayItems.map(renderRow)}</View>
                {allDone ? (
                  <ThemedText type="hand" muted style={styles.allDone}>
                    Today&apos;s rhythms are done. That&apos;s the whole ask.
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <View style={styles.section}>
                <ThemedText type="label" muted style={styles.sectionLabel}>
                  TODAY
                </ThemedText>
                <ThemedText type="body" muted style={styles.quiet}>
                  Nothing repeats today. The rest are resting below.
                </ThemedText>
              </View>
            )}

            {restingItems.length > 0 ? (
              <View style={styles.section}>
                <ThemedText type="label" muted style={styles.sectionLabel}>
                  RESTING
                </ThemedText>
                <View style={styles.rows}>{restingItems.map(renderRow)}</View>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
    gap: tokens.space.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.md,
  },
  headerText: {
    flex: 1,
    gap: tokens.space.xs,
  },
  kicker: {
    letterSpacing: 0.8,
  },
  title: {
    letterSpacing: tokens.type.display.tracking,
  },
  readout: {
    marginTop: tokens.space.xs,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 36,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.pill,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    gap: tokens.space.md,
  },
  sectionLabel: {
    letterSpacing: 0.8,
  },
  rows: {
    gap: tokens.space.sm,
  },
  quiet: {
    lineHeight: 20,
  },
  allDone: {
    paddingHorizontal: tokens.space.xs,
  },
  inception: {
    gap: tokens.space.sm,
    paddingTop: tokens.space.lg,
  },
  inceptionTitle: {
    letterSpacing: tokens.type.title.tracking,
  },
  inceptionBody: {
    lineHeight: 20,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    alignSelf: "flex-start",
    minHeight: 52,
    marginTop: tokens.space.sm,
    paddingHorizontal: tokens.space.xxl,
    borderRadius: tokens.radius.lg,
  },
  bottomSpacer: {
    height: 120,
  },
});
