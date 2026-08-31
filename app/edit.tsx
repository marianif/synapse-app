import * as Haptics from "expo-haptics";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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

import { EntryDot } from "@/components/atoms/entry-dot";
import { ChipRail, SelectChip } from "@/components/atoms/select-chip";
import { ThemedText } from "@/components/atoms/themed-text";
import { ConfirmSheet } from "@/components/molecules/confirm-sheet";
import { DetailHeaderRow } from "@/components/molecules/detail-header-row";
import { TaskChecklist } from "@/components/molecules/task-checklist";
import { WhenPicker } from "@/components/molecules/when-picker";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { entryKicker, tokens, useTheme } from "@/constants/theme";
import { useConfirm } from "@/hooks/use-confirm";
import { useDatabase } from "@/hooks/use-database/use-database";
import { formatTime12h, parseDate, parseTimeToMinutes } from "@/lib/date-utils";
import { daysUntil, doneStatus, isDone } from "@/lib/direct-when";
import { horizonEndDate } from "@/lib/horizons";
import { parseRule } from "@/lib/recurrence";
import { ConfirmKey } from "@/lib/settings";
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

const FREQ_LABEL: Record<RecurrenceFrequency, string> = {
  daily: "every day",
  weekdays: "on weekdays",
  weekly: "every week",
  monthly: "every month",
};

const FREQ_OPTIONS: RecurrenceFrequency[] = ["daily", "weekly", "monthly"];

// FREQ_OPTIONS never includes "weekdays" (that variant has no UI entry
// point here), but the map keys off the wider RecurrenceFrequency type.
const FREQ_ICON: Record<RecurrenceFrequency, IconSymbolName> = {
  daily: "CalendarDay",
  weekdays: "CalendarDays",
  weekly: "CalendarDays",
  monthly: "CalendarMark",
};

const WEEKDAY_LETTERS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const STATUS_LABELS: Record<DbEntry["status"], string> = {
  scheduled: "Scheduled",
  active: "Active",
  completed: "Done",
  pending: "Pending",
  met: "Met",
  overdue: "Overdue",
};

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
    const scheduledDate = draft.dueRange
      ? horizonEndDate(draft.dueRange)
      : draft.date.trim() || null;
    if (scheduledDate !== (entry.scheduled_date ?? null)) return true;
    if (
      draft.dueRange === null &&
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
  if (draft.dueRange) {
    const end = horizonEndDate(draft.dueRange);
    if (isDeadline) return `closes ${end}`;
    const parsed = parseDate(end);
    return parsed
      ? `${parsed.getDate()}/${parsed.getMonth() + 1}/${parsed.getFullYear()}`
      : end;
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

function doneLabel(type: DbEntry["type"]): string {
  if (type === "deadline") return "Mark met";
  if (type === "idea") return "Archive";
  return "Complete";
}

// Only surfaces a narrative line when it adds information the status row
// doesn't already carry: a settled entry's closure, and a stale idea's age.
function narrativeFor(entry: DbEntry): string | null {
  if (isDone(entry)) return "Settled";

  if (entry.type === "idea") {
    const age = Math.floor((Date.now() - entry.created_at) / 86_400_000);
    if (age > 7) return `Sketched ${age} days ago`;
  }

  return null;
}

function urgencyTag(
  entry: DbEntry,
  typeShade: string,
): { text: string; color: string } | null {
  if (isDone(entry)) return null;

  const days = daysUntil(entry.due_date ?? entry.scheduled_date ?? null);
  if (days !== null) {
    if (days < 0)
      return {
        text: `Over by ${Math.abs(days)}d`,
        color: tokens.feedback.danger,
      };
    // days === 0 is skipped here — the WHEN row already reads "Today" in the
    // same danger color, so a chip saying the same word would just repeat it.
    if (days > 0) return { text: `${days}d left`, color: typeShade };
  }

  return null;
}

function statusColor(status: DbEntry["status"]): string | null {
  if (status === "overdue") return tokens.feedback.danger;
  if (status === "completed" || status === "met")
    return tokens.feedback.success;
  return null;
}

/**
 * The combined detail + edit surface for a single entry, presented as a native
 * modal (`presentation: "fullScreenModal"` in the root stack). It replaces the
 * old two-hop flow — a read-only detail sheet that pushed a separate /edit —
 * so opening a row lands on one surface that shows the entry's state (status,
 * urgency, narrative) and edits it in place.
 *
 * Everything autosaves: closing via the X, the native dismissal, the back
 * gesture, or backgrounding the app all funnel through the `beforeRemove` /
 * `AppState` listeners below, so the draft is never left behind. Mark-done and
 * delete (with confirmation) live in the bottom action bar.
 */
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
    updateEntryStatus,
    deleteEntry,
    fetchEntries,
    fetchProjects,
  } = useDatabase();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<Row>(null);
  const dirtyRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const persistRef = useRef<() => Promise<boolean>>(async () => true);
  const deleteConfirm = useConfirm({ confirmKey: ConfirmKey.deleteEntry });
  // Lets the checklist's open swipe row be dismissed when the editor scrolls.
  const taskSwipe = useRef<{ close: () => void } | null>(null);

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
      const date = draft.dueRange
        ? horizonEndDate(draft.dueRange)
        : draft.date.trim() || null;
      const time = draft.dueRange ? null : draft.time.trim() || null;
      const horizon = isDeadline ? draft.dueRange : null;

      await updateEntry(entry.id, {
        title: draft.title.trim() || entry.title,
        subtitle: draft.subtitle.trim() || null,
        inspiration: isIdea ? draft.inspiration.trim() || null : null,
        notes: draft.notes.trim() || null,
        scheduledDate: isDeadline || isIdea ? null : date,
        scheduledTime: isDeadline || isIdea ? null : time,
        dueDate: isDeadline ? date : null,
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

  // Save when the screen is being removed — the X close, the iOS swipe-back
  // gesture, and hardware back all funnel through beforeRemove. The removal is
  // replayed only once the write lands, so a failed save keeps the user on the
  // screen with the error visible.
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

  // Blur-time autosave safety net: whatever dismissal path closes the modal
  // (X, back, native gesture), the screen blurs as it's removed and this
  // cleanup persists the latest draft. `beforeRemove` is the primary path —
  // it blocks dismissal until the write lands — and `persist` is idempotent
  // (dirtyRef / saveInFlightRef guards), so a close that reaches both paths
  // writes at most once.
  useFocusEffect(
    useCallback(() => {
      return () => {
        void persistRef.current();
      };
    }, []),
  );

  if (isLoading || !entry || !draft) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.paper }]}
        edges={["top", "bottom"]}
      >
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
  const done = isDone(entry);
  const urgency = urgencyTag(entry, accent);
  const statColor = statusColor(entry.status);
  const narrative = narrativeFor(entry);

  const toggleRow = (row: Row): void =>
    setOpenRow((current) => (current === row ? null : row));

  const handleMarkDone = (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void updateEntryStatus(entry.id, doneStatus(entry.type)).catch((err) =>
      console.error("Failed to mark entry done:", err),
    );
    router.back();
  };

  const handleDelete = (): void => {
    void deleteConfirm.request(() => {
      void deleteEntry(entry.id).catch((err) =>
        console.error("Failed to delete entry:", err),
      );
      router.back();
    });
  };

  const canComplete = !done && entry.type !== "idea";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.paper }]}
      edges={["top", "bottom"]}
    >
      {/* Modal header — close + type kicker, with complete + delete as icon-only
          actions. Closing autosaves (beforeRemove); complete uses the shared
          success color for every entry type that can be completed. */}
      <View style={styles.modalHeader}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close entry editor"
          style={styles.headerBtn}
        >
          <IconSymbol name="X" size={22} color={colors.ink} />
        </Pressable>

        <View style={styles.headerTitle}>
          <ThemedText type="micro" style={{ color: accent }}>
            {typeLabel(entry.type)}
          </ThemedText>
        </View>

        <View style={styles.headerActions}>
          {canComplete ? (
            <Pressable
              onPress={handleMarkDone}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={doneLabel(entry.type)}
              style={styles.headerBtn}
            >
              <IconSymbol
                name="Check"
                size={22}
                color={tokens.feedback.success}
              />
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleDelete}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Delete entry"
            style={styles.headerBtn}
          >
            <IconSymbol name="Trash" size={22} color={tokens.feedback.danger} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          scrollEventThrottle={16}
          onScroll={() => taskSwipe.current?.close()}
        >
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <View style={styles.content}>
              <View style={styles.hero}>
                {/* Detail glance — identity + status/urgency + narrative. The
                    "read-only" half of the surface; everything below edits. */}
                <DetailHeaderRow
                  type={entry.type}
                  accent={accent}
                  urgency={urgency}
                  statusLabel={STATUS_LABELS[entry.status].toUpperCase()}
                  statusColor={statColor}
                />

                {narrative ? (
                  <ThemedText type="mono" muted style={styles.narrative}>
                    {narrative}
                  </ThemedText>
                ) : null}

                <TextInput
                  value={draft.title}
                  onChangeText={(title) => patchDraft(setDraft, { title })}
                  multiline
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
                    <View style={styles.expandGap}>
                      <WhenPicker
                        date={draft.date}
                        time={draft.time}
                        dueRange={draft.dueRange}
                        onDateChange={(date) =>
                          patchDraft(setDraft, { date })
                        }
                        onTimeChange={(time) =>
                          patchDraft(setDraft, { time })
                        }
                        onDueRangeChange={(dueRange) =>
                          patchDraft(setDraft, { dueRange })
                        }
                        accentColor={accent}
                        dateLabel={isDeadline ? "DUE DATE" : "DATE"}
                        initiallyOpen
                      />
                    </View>
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
                      <View style={styles.freqRow}>
                        {FREQ_OPTIONS.map((freq) => (
                          <FreqChip
                            key={freq}
                            freq={freq}
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
                      </View>

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
                                style={({ pressed }) => [
                                  styles.weekdayCell,
                                  {
                                    backgroundColor: selected
                                      ? accent + "22"
                                      : colors.surfaceSubtle,
                                  },
                                  pressed && !selected && { opacity: 0.6 },
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={day.label}
                                accessibilityState={{ selected }}
                              >
                                <ThemedText
                                  type="mono"
                                  numberOfLines={1}
                                  style={
                                    selected
                                      ? { color: accent, fontWeight: "700" }
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
                      <ChipRail>
                        <SelectChip
                          label="unfiled"
                          selected={draft.projectId === null}
                          accentColor={accent}
                          onPress={() =>
                            patchDraft(setDraft, { projectId: null })
                          }
                        />
                        {activeProjects.map((project) => (
                          <SelectChip
                            key={project.id}
                            label={`${project.emoji ? `${project.emoji} ` : ""}${project.title}`}
                            selected={draft.projectId === project.id}
                            accentColor={accent}
                            onPress={() =>
                              patchDraft(setDraft, { projectId: project.id })
                            }
                          />
                        ))}
                      </ChipRail>
                    </View>
                  </ReadoutRow>
                ) : null}
              </View>

              {/* Subtasks: todo and deadline only. An idea that grows a
                  checklist is a project — promote it instead. */}
              {!isIdea ? (
                <TaskChecklist entryId={entry.id} accent={accent} swipeController={taskSwipe} />
              ) : null}

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

      <ConfirmSheet
        visible={deleteConfirm.visible}
        kicker="DELETE ENTRY"
        message="This removes it from the field for good."
        dontAsk={deleteConfirm.dontAsk}
        onToggleDontAsk={deleteConfirm.toggleDontAsk}
        onConfirm={deleteConfirm.confirm}
        onCancel={deleteConfirm.cancel}
      />
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
        <IconSymbol
          name={open ? "ChevronUp" : "ChevronDown"}
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

// ─── Frequency chip — a real tap target with room to breathe: icon over
// label, filled on selection. Three options only, so they split the row
// evenly rather than scroll in a rail. ──────────────────────────────────

function FreqChip({
  freq,
  selected,
  accentColor,
  onPress,
}: {
  freq: RecurrenceFrequency;
  selected: boolean;
  accentColor: string;
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={freq}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.freqChip,
        {
          backgroundColor: selected ? accentColor + "22" : colors.surfaceSubtle,
        },
        pressed && !selected && { opacity: 0.6 },
      ]}
    >
      <IconSymbol
        name={FREQ_ICON[freq]}
        size={22}
        color={selected ? accentColor : colors.inkMuted}
      />
      <ThemedText
        type="body"
        style={
          selected
            ? { color: accentColor, fontWeight: "700" }
            : { color: colors.inkMuted }
        }
      >
        {freq}
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
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.sm,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
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
  narrative: {
    marginBottom: tokens.space.xs,
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
  freqRow: {
    flexDirection: "row",
    gap: tokens.space.sm,
    // Chips should span the row's full width, not sit inset under the
    // readout's clause-text alignment inherited from expandGap.
    marginLeft: -(tokens.space.md + 8 + tokens.space.sm),
  },
  freqChip: {
    flex: 1,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  weekdayRow: {
    flexDirection: "row",
    gap: tokens.space.xs,
    // Same full-width treatment as freqRow — spans the row, not inset
    // under the readout's clause-text alignment inherited from expandGap.
    marginLeft: -(tokens.space.md + 8 + tokens.space.sm),
  },
  weekdayCell: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.sm,
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
