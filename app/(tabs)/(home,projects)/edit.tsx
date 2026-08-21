import {
  Stack,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { EntryDot } from "@/components/atoms/entry-dot";
import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { WhenPicker } from "@/components/molecules/when-picker";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { entryKicker, tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { formatTime12h, parseDate, parseTimeToMinutes } from "@/lib/date-utils";
import { horizonEndDate } from "@/lib/horizons";
import { parseRule } from "@/lib/recurrence";
import type {
  DbEntry,
  DueRange,
  EntryType,
  RecurrenceFrequency,
  RecurrenceRule,
} from "@/lib/types";

type Draft = {
  title: string;
  subtitle: string;
  inspiration: string;
  notes: string;
  date: string;
  time: string;
  dueRange: DueRange | null;
  recurrenceFreq: RecurrenceFrequency | null;
  recurrenceDays: number[];
  recurrenceEndDate: string;
  projectId: string | null;
};

type Row = "when" | "repeat" | "project" | null;

const HORIZONS: { value: DueRange; label: string }[] = [
  { value: "week", label: "this week" },
  { value: "month", label: "this month" },
  { value: "year", label: "this year" },
];

const FREQ_LABEL: Record<RecurrenceFrequency, string> = {
  daily: "every day",
  weekdays: "on weekdays",
  weekly: "every week",
  monthly: "every month",
};

const FREQ_OPTIONS: RecurrenceFrequency[] = ["daily", "weekly", "monthly"];

const WEEKDAY_LETTERS: { value: number; label: string }[] = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];

function draftFromEntry(entry: DbEntry): Draft {
  const deadline = entry.type === "deadline";
  const rule = parseRule(entry.recurrence_rule);

  return {
    title: entry.title,
    subtitle: entry.subtitle ?? "",
    inspiration: entry.inspiration ?? "",
    notes: entry.notes ?? "",
    date: (deadline ? entry.due_date : entry.scheduled_date) ?? "",
    time: (deadline ? entry.due_time : entry.scheduled_time) ?? "",
    dueRange: entry.due_range,
    recurrenceFreq: rule?.freq ?? null,
    recurrenceDays: rule?.days ?? [],
    recurrenceEndDate: entry.recurrence_end_date ?? "",
    projectId: entry.project_id,
  };
}

function patchDraft(
  setDraft: React.Dispatch<React.SetStateAction<Draft | null>>,
  patch: Partial<Draft>,
): void {
  setDraft((current) => (current ? { ...current, ...patch } : current));
}

/**
 * Whether the draft differs from what's persisted, mirroring the exact
 * normalization `persist` applies so untouched screens never write back.
 * An emptied title is deliberately not a diff — it falls back to the stored
 * title on save, matching the old disabled-save-button behavior.
 */
function isDirty(draft: Draft, entry: DbEntry): boolean {
  const isDeadline = entry.type === "deadline";
  const isIdea = entry.type === "idea";
  const rule = parseRule(entry.recurrence_rule);
  const horizon = isDeadline ? draft.dueRange : null;

  if ((draft.title.trim() || entry.title) !== entry.title) return true;
  if (draft.subtitle.trim() !== (entry.subtitle ?? "")) return true;
  if (isIdea && draft.inspiration.trim() !== (entry.inspiration ?? ""))
    return true;
  if (draft.notes.trim() !== (entry.notes ?? "")) return true;
  if (draft.projectId !== entry.project_id) return true;

  if (!isDeadline && !isIdea) {
    if ((draft.date.trim() || null) !== (entry.scheduled_date ?? null))
      return true;
    if (
      parseTimeToMinutes(draft.time) !==
      parseTimeToMinutes(entry.scheduled_time)
    ) {
      return true;
    }
  }

  if (isDeadline) {
    const dueDate = horizon
      ? horizonEndDate(horizon)
      : draft.date.trim() || null;
    if (dueDate !== (entry.due_date ?? null)) return true;
    if (horizon) {
      if (entry.due_time !== null) return true;
    } else if (
      parseTimeToMinutes(draft.time) !== parseTimeToMinutes(entry.due_time)
    ) {
      return true;
    }
    if (horizon !== entry.due_range) return true;
  }

  if (!isIdea) {
    if (draft.recurrenceFreq !== (rule?.freq ?? null)) return true;
    if (
      draft.recurrenceFreq === "weekly" &&
      JSON.stringify(draft.recurrenceDays) !== JSON.stringify(rule?.days ?? [])
    ) {
      return true;
    }
    if (
      (draft.recurrenceEndDate.trim() || null) !==
      (entry.recurrence_end_date ?? null)
    ) {
      return true;
    }
  }

  return false;
}

function typeLabel(type: DbEntry["type"]): string {
  if (type === "deadline") return "DEADLINE";
  if (type === "idea") return "IDEA";
  return "TODO";
}

function whenClause(draft: Draft, isDeadline: boolean): string {
  if (isDeadline && draft.dueRange) {
    return `closes ${horizonEndDate(draft.dueRange)}`;
  }
  if (!draft.date) return "not scheduled — tap to set";
  const parsed = parseDate(draft.date);
  const label = parsed
    ? `${parsed.getDate()}/${parsed.getMonth() + 1}/${parsed.getFullYear()}`
    : draft.date;
  if (!draft.time) return label;
  const minutes = parseTimeToMinutes(draft.time);
  return minutes !== null
    ? `${label} · ${formatTime12h(minutes)}`
    : `${label} · ${draft.time}`;
}

function repeatClause(draft: Draft): string {
  if (!draft.recurrenceFreq) return "never";
  return FREQ_LABEL[draft.recurrenceFreq];
}

function projectClause(
  projectId: string | null,
  projects: { id: string; title: string; emoji: string | null }[],
): string {
  if (!projectId) return "unfiled";
  const project = projects.find((p) => p.id === projectId);
  return project ? project.title : "unfiled";
}

export default function EditScreen(): React.ReactElement {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, scheme } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    entries,
    projects,
    isLoading,
    updateEntry,
    fetchEntries,
    fetchProjects,
  } = useDatabase();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<Row>(null);
  const dirtyRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const persistRef = useRef<() => Promise<boolean>>(async () => true);

  const entry = entries.find((item) => item.id === id);

  useEffect(() => {
    void fetchEntries();
    void fetchProjects();
  }, [fetchEntries, fetchProjects]);

  useEffect(() => {
    if (entry) setDraft(draftFromEntry(entry));
  }, [entry]);

  // Recompute dirtiness whenever the draft or the persisted entry changes.
  useEffect(() => {
    if (!entry || !draft) return;
    dirtyRef.current = isDirty(draft, entry);
  }, [draft, entry]);

  // Persist without navigating — the single write path for every trigger.
  const persist = async (): Promise<boolean> => {
    if (!entry || !draft || saveInFlightRef.current) return true;
    if (!dirtyRef.current) return true;
    saveInFlightRef.current = true;
    setError(null);

    try {
      const isDeadline = entry.type === "deadline";
      const isIdea = entry.type === "idea";
      const recurrenceRule: RecurrenceRule | null = draft.recurrenceFreq
        ? {
            freq: draft.recurrenceFreq,
            days:
              draft.recurrenceFreq === "weekly"
                ? draft.recurrenceDays
                : undefined,
          }
        : null;
      const date = draft.date.trim() || null;
      const time = draft.time.trim() || null;
      const horizon = isDeadline ? draft.dueRange : null;

      await updateEntry(entry.id, {
        title: draft.title.trim() || entry.title,
        subtitle: draft.subtitle.trim() || null,
        inspiration: isIdea ? draft.inspiration.trim() || null : null,
        notes: draft.notes.trim() || null,
        scheduledDate: isDeadline || isIdea ? null : date,
        scheduledTime: isDeadline || isIdea ? null : time,
        dueDate: isDeadline ? (horizon ? horizonEndDate(horizon) : date) : null,
        dueTime: isDeadline && !horizon ? time : null,
        dueRange: horizon,
        recurrenceRule: isIdea ? null : recurrenceRule,
        recurrenceEndDate: isIdea
          ? null
          : draft.recurrenceEndDate.trim() || null,
        projectId: draft.projectId,
      });
      dirtyRef.current = false;
      return true;
    } catch (saveError) {
      console.error("[edit] save failed:", saveError);
      setError("Could not save this entry. Try again.");
      return false;
    } finally {
      saveInFlightRef.current = false;
    }
  };

  // Keep the latest persist (and its draft/entry closure) reachable from the
  // listeners below without re-subscribing them on every keystroke.
  useEffect(() => {
    persistRef.current = persist;
  });

  // Save when the screen is being removed — the header back button, the iOS
  // swipe-back gesture, and hardware back all funnel through beforeRemove.
  // The removal is replayed only once the write lands, so a failed save keeps
  // the user on the screen with the error visible.
  useEffect(() => {
    if (!draft || !entry) return;
    return navigation.addListener("beforeRemove", (e) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      void persistRef.current().then((ok) => {
        if (ok) navigation.dispatch(e.data.action);
      });
    });
  }, [navigation, draft, entry]);

  // Save when the app is backgrounded (or interrupted) so edits survive being
  // killed while suspended.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") void persistRef.current();
    });
    return () => subscription.remove();
  }, []);

  if (isLoading || !entry || !draft) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.paper }]}
        edges={["bottom"]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loading}>
          <ActivityIndicator
            color={entry ? entryKicker(entry.type, scheme) : colors.inkMuted}
          />
        </View>
      </SafeAreaView>
    );
  }

  const accent = entryKicker(entry.type, scheme);
  const isDeadline = entry.type === "deadline";
  const isIdea = entry.type === "idea";
  const activeProjects = projects.filter(
    (project) => project.status === "active",
  );

  const toggleRow = (row: Row): void =>
    setOpenRow((current) => (current === row ? null : row));

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.paper }]}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title="Edit"
              kicker={entry.type.toUpperCase()}
              entryType={entry.type}
              onBack={() => router.back()}
            />
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <View style={styles.content}>
              <View style={styles.hero}>
                <View style={styles.heroIdentity}>
                  <SketchIcon type={entry.type} size={22} />
                  <ThemedText type="micro" style={{ color: accent }}>
                    {typeLabel(entry.type)}
                  </ThemedText>
                </View>
                <TextInput
                  value={draft.title}
                  onChangeText={(title) => patchDraft(setDraft, { title })}
                  multiline
                  autoFocus
                  placeholder="Name the thing"
                  placeholderTextColor={colors.inkMuted}
                  selectionColor={accent}
                  style={[styles.titleInput, { color: colors.ink }]}
                  accessibilityLabel="Entry title"
                />
                <TextInput
                  value={draft.subtitle}
                  onChangeText={(subtitle) =>
                    patchDraft(setDraft, { subtitle })
                  }
                  placeholder="One line of context, if it needs one"
                  placeholderTextColor={colors.inkMuted}
                  selectionColor={accent}
                  style={[styles.subtitleInput, { color: colors.inkMuted }]}
                  accessibilityLabel="Entry subtitle"
                />
              </View>

              <View style={styles.readout}>
                {!isIdea ? (
                  <ReadoutRow
                    entryType={entry.type}
                    label="WHEN"
                    clause={whenClause(draft, isDeadline)}
                    open={openRow === "when"}
                    onPress={() => toggleRow("when")}
                  >
                    {!isDeadline || draft.dueRange === null ? (
                      <View style={styles.expandGap}>
                        <WhenPicker
                          date={draft.date}
                          time={draft.time}
                          onDateChange={(date) =>
                            patchDraft(setDraft, { date })
                          }
                          onTimeChange={(time) =>
                            patchDraft(setDraft, { time })
                          }
                          accentColor={accent}
                          dateLabel={isDeadline ? "DUE DATE" : "DATE"}
                          initiallyOpen
                          showQuickOptions={false}
                        />
                      </View>
                    ) : null}
                  </ReadoutRow>
                ) : null}

                {!isIdea ? (
                  <ReadoutRow
                    label="REPEATS"
                    clause={repeatClause(draft)}
                    open={openRow === "repeat"}
                    onPress={() => toggleRow("repeat")}
                  >
                    <View style={styles.expandGap}>
                      <InlineOptionRail>
                        {FREQ_OPTIONS.map((freq) => (
                          <InlineOption
                            key={freq}
                            label={freq}
                            selected={draft.recurrenceFreq === freq}
                            accentColor={accent}
                            onPress={() => {
                              if (draft.recurrenceFreq === freq) {
                                patchDraft(setDraft, { recurrenceFreq: null });
                                return;
                              }
                              patchDraft(setDraft, {
                                recurrenceFreq: freq,
                                recurrenceDays:
                                  freq === "weekly" &&
                                  draft.recurrenceDays.length === 0
                                    ? [3]
                                    : draft.recurrenceDays,
                              });
                            }}
                          />
                        ))}
                      </InlineOptionRail>

                      {draft.recurrenceFreq === "weekly" ? (
                        <Animated.View
                          entering={FadeIn.duration(180)}
                          exiting={FadeOut.duration(120)}
                          layout={LinearTransition.duration(220).easing(
                            Easing.bezier(0.22, 1, 0.36, 1),
                          )}
                          style={styles.weekdayRow}
                        >
                          {WEEKDAY_LETTERS.map((day) => {
                            const selected = draft.recurrenceDays.includes(
                              day.value,
                            );
                            return (
                              <Pressable
                                key={day.value}
                                onPress={() =>
                                  patchDraft(setDraft, {
                                    recurrenceDays: selected
                                      ? draft.recurrenceDays.filter(
                                          (d) => d !== day.value,
                                        )
                                      : [
                                          ...draft.recurrenceDays,
                                          day.value,
                                        ].sort(),
                                  })
                                }
                                hitSlop={8}
                                style={styles.weekdayCell}
                                accessibilityRole="button"
                                accessibilityLabel={day.label}
                                accessibilityState={{ selected }}
                              >
                                <ThemedText
                                  type="mono"
                                  style={
                                    selected
                                      ? { color: accent }
                                      : { color: colors.inkMuted }
                                  }
                                >
                                  {day.label}
                                </ThemedText>
                              </Pressable>
                            );
                          })}
                        </Animated.View>
                      ) : null}
                    </View>
                  </ReadoutRow>
                ) : null}

                {activeProjects.length > 0 ? (
                  <ReadoutRow
                    label="FILED IN"
                    clause={projectClause(draft.projectId, activeProjects)}
                    open={openRow === "project"}
                    onPress={() => toggleRow("project")}
                  >
                    <View style={styles.expandGap}>
                      <InlineOptionRail>
                        <InlineOption
                          label="unfiled"
                          selected={draft.projectId === null}
                          accentColor={accent}
                          onPress={() =>
                            patchDraft(setDraft, { projectId: null })
                          }
                        />
                        {activeProjects.map((project) => (
                          <InlineOption
                            key={project.id}
                            label={`${project.emoji ? `${project.emoji} ` : ""}${project.title}`}
                            selected={draft.projectId === project.id}
                            accentColor={accent}
                            onPress={() =>
                              patchDraft(setDraft, { projectId: project.id })
                            }
                          />
                        ))}
                      </InlineOptionRail>
                    </View>
                  </ReadoutRow>
                ) : null}
              </View>

              {isIdea ? (
                <TextZone
                  label="WHY IT STAYS"
                  value={draft.inspiration}
                  placeholder="What made this worth keeping?"
                  onChange={(inspiration) =>
                    patchDraft(setDraft, { inspiration })
                  }
                  accent={accent}
                />
              ) : null}

              <TextZone
                label="MEMORY"
                value={draft.notes}
                placeholder="Leave a note for the next time you meet this"
                onChange={(notes) => patchDraft(setDraft, { notes })}
                accent={accent}
              />

              {error ? (
                <ThemedText
                  type="body"
                  style={[styles.error, { color: tokens.feedback.danger }]}
                >
                  {error}
                </ThemedText>
              ) : null}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Readout row — a tonal row: a dot, a mono label, a value clause, a chevron,
// and an inline expand-in-place editor. Matches the row-on-tone + EntryDot +
// chevron vocabulary used everywhere else (entry-row, task-checklist,
// project-card) rather than inventing its own bare punch-card style. ────

function ReadoutRow({
  entryType,
  label,
  clause,
  open,
  onPress,
  children,
}: {
  /** Set for the WHEN row so the dot carries the entry's real type color;
   * omitted for neutral metadata rows (REPEATS, FILED IN), which get a
   * muted dot instead — they aren't tied to any entry type. */
  entryType?: EntryType;
  label: string;
  clause: string;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.readoutRow,
          { backgroundColor: pressed ? colors.surface : colors.surfaceSubtle },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${clause}`}
        accessibilityState={{ expanded: open }}
        hitSlop={4}
      >
        {entryType ? (
          <EntryDot type={entryType} size={8} />
        ) : (
          <View
            style={[styles.readoutMark, { backgroundColor: colors.inkMuted }]}
          />
        )}
        <ThemedText type="micro" muted style={styles.readoutLabel}>
          {label}
        </ThemedText>
        <ThemedText
          type="mono"
          style={[styles.readoutClause, { color: colors.ink }]}
          numberOfLines={1}
        >
          {clause}
        </ThemedText>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.inkMuted}
        />
      </Pressable>

      {open ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          layout={LinearTransition.duration(220).easing(
            Easing.bezier(0.22, 1, 0.36, 1),
          )}
        >
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

// ─── Inline option — a bare tap target, no chip fill; selection reads via
// mono weight + accent ink, matching the readout's typographic vocabulary. ──

function InlineOptionRail({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.optionRail}
    >
      {children}
    </ScrollView>
  );
}

function HorizonOptionGrid({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <View style={styles.horizonGrid}>{children}</View>;
}

function HorizonOption({
  label,
  selected,
  accentColor,
  onPress,
}: {
  label: string;
  selected: boolean;
  accentColor: string;
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={styles.horizonOption}
    >
      <View
        style={[
          styles.horizonMark,
          { backgroundColor: selected ? accentColor : colors.inkMuted },
        ]}
      />
      <ThemedText
        type="mono"
        numberOfLines={1}
        style={{ color: selected ? accentColor : colors.inkMuted }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function InlineOption({
  label,
  selected,
  accentColor,
  onPress,
}: {
  label: string;
  selected: boolean;
  accentColor: string;
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={8}
      style={styles.option}
    >
      <ThemedText
        type="mono"
        style={selected ? { color: accentColor } : { color: colors.inkMuted }}
      >
        {selected ? "· " : "  "}
        {label}
      </ThemedText>
    </Pressable>
  );
}

function TextZone({
  label,
  value,
  placeholder,
  onChange,
  accent,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  accent: string;
}): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={styles.textZone}>
      <ThemedText type="micro" muted>
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        selectionColor={accent}
        style={[styles.notesInput, { color: colors.ink }]}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.xl,
    paddingBottom: tokens.space.xxl,
    gap: tokens.space.xxl,
  },
  hero: {
    gap: tokens.space.sm,
  },
  heroIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  titleInput: {
    fontFamily: tokens.type.fontInter.bold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    padding: 0,
    minHeight: 44,
  },
  subtitleInput: {
    fontFamily: tokens.type.fontInter.regular,
    fontSize: 15,
    lineHeight: 22,
    padding: 0,
    minHeight: 32,
  },
  readout: {
    gap: tokens.space.sm,
  },
  readoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 44,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  readoutMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  readoutLabel: {
    flexShrink: 0,
    letterSpacing: 1,
  },
  readoutClause: {
    flex: 1,
  },
  expandGap: {
    paddingTop: tokens.space.md,
    // Aligns under the readout row's clause text: row inset + dot + gap.
    paddingLeft: tokens.space.md + 8 + tokens.space.sm,
    gap: tokens.space.md,
  },
  optionRail: {
    flexDirection: "row",
    gap: tokens.space.md,
  },
  horizonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs,
  },
  horizonOption: {
    width: "48%",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  horizonMark: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  option: {
    minHeight: 32,
    justifyContent: "center",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  weekdayRow: {
    flexDirection: "row",
    gap: tokens.space.md,
  },
  weekdayCell: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  textZone: {
    gap: tokens.space.sm,
  },
  notesInput: {
    minHeight: 84,
    paddingVertical: tokens.space.xs,
    fontFamily: tokens.type.fontInter.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  error: {
    marginTop: -tokens.space.sm,
  },
});
