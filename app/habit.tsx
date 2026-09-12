import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { DiscButton } from "@/components/atoms/disc-button";
import { ChipRail, ChipRow, SelectChip } from "@/components/atoms/select-chip";
import { ThemedText } from "@/components/atoms/themed-text";
import { ConfirmSheet } from "@/components/molecules/confirm-sheet";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useConfirm } from "@/hooks/use-confirm";
import { useDatabase } from "@/hooks/use-database/use-database";
import { toDisplayDate } from "@/lib/date-utils";
import { parseRule } from "@/lib/recurrence";
import { ConfirmKey } from "@/lib/settings";

import type {
  DbProject,
  RecurrenceFrequency,
  RecurrenceRule,
} from "@/lib/types";

const CADENCE_OPTIONS: {
  key: RecurrenceFrequency;
  label: string;
  icon: IconSymbolName;
}[] = [
  { key: "daily", label: "Every day", icon: "CalendarDay" },
  { key: "weekdays", label: "Weekdays", icon: "CalendarDays" },
  { key: "weekly", label: "Custom days", icon: "CalendarDays" },
  { key: "monthly", label: "Monthly", icon: "CalendarMark" },
];

// 0 = Sunday, matching RecurrenceRule.days.
const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

// One-tap presets for the custom-days panel. Selecting a preset just fills the
// day set; the user can then add or remove individual days on top of it.
const DAY_PRESETS: { key: string; label: string; days: number[] }[] = [
  { key: "weekdays", label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { key: "weekends", label: "Weekends", days: [0, 6] },
  { key: "all", label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
];

// Quick nudge presets. "Off" is the default — a nudge is opt-in per habit.
const NUDGE_OPTIONS: {
  key: string;
  label: string;
  value: string | null;
  icon: IconSymbolName;
}[] = [
  { key: "off", label: "Off", value: null, icon: "BellOff" },
  { key: "morning", label: "7:00 AM", value: "07:00", icon: "Alarm" },
  { key: "nine", label: "9:00 AM", value: "09:00", icon: "Alarm" },
  { key: "noon", label: "12:00 PM", value: "12:00", icon: "Alarm" },
  { key: "evening", label: "6:00 PM", value: "18:00", icon: "Alarm" },
  { key: "night", label: "9:00 PM", value: "21:00", icon: "Alarm" },
];

/**
 * The habit editor, presented as a native modal (same pattern as /note and
 * /edit). It is deliberately NOT wrapped in a KeyboardAvoidingView: a native
 * pageSheet is not resized for the keyboard, so the keyboard slides over the
 * sheet's lower edge while the header (close / save) stays clear at the top and
 * the scroll body insets itself (`automaticallyAdjustKeyboardInsets`). The
 * composer replaces the old inline bottom sheet and serves both create and edit,
 * including pause / resume and delete.
 */
export default function HabitScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const {
    habits,
    habitsLoading,
    projects,
    createHabit,
    updateHabit,
    deleteHabit,
  } = useDatabase();

  const habit = id ? habits.find((h) => h.id === id) : undefined;
  const editing = Boolean(id);

  const [title, setTitle] = useState("");
  const [motivation, setMotivation] = useState("");
  const [freq, setFreq] = useState<RecurrenceFrequency>("daily");
  const [days, setDays] = useState<number[]>([]);
  const [reminder, setReminder] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteConfirm = useConfirm({ confirmKey: ConfirmKey.deleteHabit });

  // Seed once per habit id so a store round-trip (pause, save) never resets
  // fields the user is typing into.
  const seededId = useRef<string | null>(null);
  useEffect(() => {
    const key = habit?.id ?? null;
    if (seededId.current === key) return;
    if (editing && !habit) return; // wait for the store to resolve the id
    seededId.current = key;
    const rule = habit ? parseRule(habit.cadence) : null;
    setTitle(habit?.title ?? "");
    setMotivation(habit?.motivation ?? "");
    setFreq(rule?.freq ?? "daily");
    setDays(rule?.days ?? []);
    setReminder(habit?.reminder_time ?? null);
    setProjectId(habit?.project_id ?? null);
    setPaused(habit?.status === "paused");
  }, [habit, editing]);

  const valid = title.trim().length > 0 && motivation.trim().length > 0;

  const buildCadence = (): RecurrenceRule => {
    if (freq === "weekly") {
      return { freq, days: days.length > 0 ? days : [new Date().getDay()] };
    }
    return { freq };
  };

  // Picking Custom days with nothing chosen seeds today's weekday so the user
  // lands on a selected day rather than an empty row.
  const selectCadence = (key: RecurrenceFrequency): void => {
    if (key === "weekly" && days.length === 0) {
      setDays([new Date().getDay()]);
    }
    setFreq(key);
  };

  const toggleDay = (day: number): void => {
    setDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const sameDays = (a: number[], b: number[]): boolean =>
    a.length === b.length &&
    [...a].sort((x, y) => x - y).join(",") ===
      [...b].sort((x, y) => x - y).join(",");

  const handleSave = async (): Promise<void> => {
    if (!valid) {
      setError("A name and a reason are both required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (habit) {
        await updateHabit(habit.id, {
          title: title.trim(),
          motivation: motivation.trim(),
          cadence: buildCadence(),
          reminderTime: reminder,
          projectId,
        });
      } else {
        await createHabit({
          title: title.trim(),
          motivation: motivation.trim(),
          cadence: buildCadence(),
          reminderTime: reminder,
          projectId,
          startDate: toDisplayDate(new Date()),
        });
      }
      router.back();
    } catch (saveError) {
      console.error("[habit] save failed:", saveError);
      setError("Could not save this habit. Try again.");
      setSaving(false);
    }
  };

  const handleDelete = (): void => {
    if (!habit) return;
    void deleteConfirm.request(() => {
      void deleteHabit(habit.id).catch((deleteError) =>
        console.error("[habit] delete failed:", deleteError),
      );
      router.back();
    });
  };

  // A deep link to a habit that is no longer here.
  if (editing && !habit && !habitsLoading) {
    return (
      <View style={[styles.gone, { backgroundColor: colors.paper }]}>
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

  const field = (
    label: string,
    child: React.ReactNode,
    note?: string,
  ): React.ReactElement => (
    <View style={styles.field}>
      <ThemedText type="label" muted style={styles.fieldLabel}>
        {label}
      </ThemedText>
      {child}
      {note ? (
        <ThemedText type="caption" muted style={styles.fieldNote}>
          {note}
        </ThemedText>
      ) : null}
    </View>
  );

  const activeProjects: DbProject[] = projects.filter(
    (project) => project.status === "active",
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {/* Header — close / kicker / save. Sits at the top so the keyboard never
          covers the commit. A required-field miss is surfaced inline below. */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close habit editor"
          style={styles.headerBtn}
        >
          <IconSymbol name="X" size={22} color={colors.ink} />
        </Pressable>

        <View style={styles.headerTitle}>
          <ThemedText type="micro" style={{ color: colors.inkMuted }}>
            {editing ? "EDIT HABIT" : "NEW HABIT"}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={editing ? "Save habit" : "Start this habit"}
          accessibilityState={{ disabled: saving }}
          style={styles.headerBtn}
        >
          <IconSymbol
            name="Check"
            size={22}
            color={valid ? colors.ink : colors.inkMuted}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {field(
          "WHAT REPEATS",
          <TextInput
            value={title}
            onChangeText={setTitle}
            autoFocus={!editing}
            placeholder="Stretch, read, call your sister…"
            placeholderTextColor={colors.inkMuted}
            selectionColor={colors.accent.clay}
            style={[styles.titleInput, { color: colors.ink }]}
            accessibilityLabel="Habit title"
            returnKeyType="next"
          />,
        )}

        {field(
          "WHY DOES THIS MATTER?",
          <TextInput
            value={motivation}
            onChangeText={setMotivation}
            placeholder="Your own words. We'll say them back when it's due."
            placeholderTextColor={colors.inkMuted}
            multiline
            textAlignVertical="top"
            selectionColor={colors.accent.clay}
            style={[
              styles.reasonInput,
              { backgroundColor: colors.surfaceSubtle, color: colors.ink },
            ]}
            accessibilityLabel="Why this habit matters"
          />,
          "Required. This is what a nudge will read back to you.",
        )}

        {field(
          "HOW OFTEN",
          <View style={styles.railWrap}>
            <ChipRail>
              {CADENCE_OPTIONS.map((option) => (
                <SelectChip
                  key={option.key}
                  label={option.label}
                  icon={option.icon}
                  selected={freq === option.key}
                  accentColor={colors.accent.clay}
                  onPress={() => selectCadence(option.key)}
                />
              ))}
            </ChipRail>
            {freq === "weekly" ? (
              <View style={styles.weekdayPanel}>
                <ChipRow>
                  {DAY_PRESETS.map((preset) => (
                    <SelectChip
                      key={preset.key}
                      label={preset.label}
                      selected={sameDays(days, preset.days)}
                      accentColor={colors.accent.clay}
                      fill
                      onPress={() => setDays(preset.days)}
                    />
                  ))}
                </ChipRow>
                <ChipRow>
                  {DAY_INITIALS.map((initial, day) => (
                    <SelectChip
                      key={`${initial}-${day}`}
                      label={initial}
                      selected={days.includes(day)}
                      accentColor={colors.accent.clay}
                      fill
                      onPress={() => toggleDay(day)}
                    />
                  ))}
                </ChipRow>
              </View>
            ) : null}
          </View>,
          freq === "weekly" ? "Pick the days this repeats." : undefined,
        )}

        {field(
          "NUDGE ME",
          <View style={styles.railWrap}>
            <ChipRail>
              {NUDGE_OPTIONS.map((option) => (
                <SelectChip
                  key={option.key}
                  label={option.label}
                  icon={option.icon}
                  selected={reminder === option.value}
                  accentColor={colors.accent.clay}
                  onPress={() => setReminder(option.value)}
                />
              ))}
            </ChipRail>
          </View>,
          reminder ? "We'll say your reason, in your words." : undefined,
        )}

        {field(
          "LINK TO A PROJECT",
          <View style={styles.railWrap}>
            <ChipRail>
              <SelectChip
                label="Autonomous"
                selected={projectId === null}
                accentColor={colors.accent.clay}
                onPress={() => setProjectId(null)}
              />
              {activeProjects.map((project) => (
                <SelectChip
                  key={project.id}
                  label={
                    project.emoji
                      ? `${project.emoji} ${project.title}`
                      : project.title
                  }
                  selected={projectId === project.id}
                  accentColor={colors.accent.clay}
                  onPress={() => setProjectId(project.id)}
                />
              ))}
            </ChipRail>
          </View>,
        )}

        {editing && habit ? (
          <View style={styles.manage}>
            <ThemedText type="label" muted style={styles.fieldLabel}>
              MANAGE
            </ThemedText>
            <View style={styles.manageRow}>
              <DiscButton
                icon={paused ? "Play" : "Pause"}
                label={paused ? "Resume" : "Pause"}
                tone="ink"
                fill
                onPress={() => {
                  setPaused((current) => !current);
                  void updateHabit(habit.id, {
                    status: paused ? "active" : "paused",
                  }).catch((pauseError) =>
                    console.error("[habit] togglePause failed:", pauseError),
                  );
                }}
                accessibilityLabel={
                  paused ? `Resume ${habit.title}` : `Pause ${habit.title}`
                }
              />
              <DiscButton
                icon="Trash2"
                label="Delete"
                tone="danger"
                fill
                onPress={handleDelete}
                accessibilityLabel={`Delete ${habit.title}`}
              />
            </View>
          </View>
        ) : null}

        {error ? (
          <ThemedText type="body" style={{ color: tokens.feedback.danger }}>
            {error}
          </ThemedText>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        visible={deleteConfirm.visible}
        kicker="DELETE HABIT"
        message="This removes the habit and its history for good."
        dontAsk={deleteConfirm.dontAsk}
        onToggleDontAsk={deleteConfirm.toggleDontAsk}
        onConfirm={deleteConfirm.confirm}
        onCancel={deleteConfirm.cancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: tokens.space.lg,
  },
  scroll: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.space.md,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.xxxl,
    gap: tokens.space.xl,
  },
  field: {
    gap: tokens.space.sm,
  },
  fieldLabel: {
    letterSpacing: 0.8,
  },
  fieldNote: {
    lineHeight: 16,
  },
  titleInput: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
    letterSpacing: tokens.type.title.tracking,
    padding: 0,
    minHeight: 44,
  },
  reasonInput: {
    minHeight: 80,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.md,
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 20,
    lineHeight: 26,
  },
  // The chip rails carry their own horizontal padding; pull them out so the
  // chips sit flush with the labels (the screen owns the gutter).
  railWrap: {
    marginHorizontal: -tokens.space.lg,
  },
  weekdayPanel: {
    marginTop: tokens.space.sm,
    gap: tokens.space.sm,
  },
  manage: {
    gap: tokens.space.sm,
  },
  manageRow: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  gone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.md,
  },
  goneBack: {
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.xl,
    borderRadius: tokens.radius.pill,
  },
});
