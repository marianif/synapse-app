import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/atoms/themed-text";
import { RecurrencePicker } from "@/components/molecules/recurrence-picker";
import { WhenPicker } from "@/components/molecules/when-picker";
import {
  entryColor,
  entryKicker,
  entryTint,
  tokens,
  useTheme,
} from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { horizonEndDate, horizonLabel } from "@/lib/horizons";
import type { DueRange, RecurrenceFrequency } from "@/lib/types";

import type { EntryType } from "@/components/atoms/entry-dot";
import dayjs from "dayjs";

type FormType = "todo" | "deadline" | "event" | "someday" | "idea";

const TYPE_OPTIONS: { value: FormType; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "deadline", label: "Deadline" },
  { value: "event", label: "Event" },
  { value: "someday", label: "Someday" },
  { value: "idea", label: "Idea" },
];

const isEditMode = (
  params: ReturnType<typeof useLocalSearchParams>,
): boolean => {
  return !!params.entryId;
};

export default function AddEntryModal(): React.ReactElement {
  const searchParams = useLocalSearchParams<{
    entryId?: string;
    type?: FormType;
    title?: string;
    date?: string;
    time?: string;
    notes?: string;
    recurrence?: string;
    recurrenceEndDate?: string;
    dueRange?: DueRange;
    projectId?: string;
  }>();

  const { colors, scheme } = useTheme();
  const editing = isEditMode(searchParams);

  const [title, setTitle] = useState(searchParams.title ?? "");
  const [type, setType] = useState<FormType>(searchParams.type ?? "todo");
  const [date, setDate] = useState(
    searchParams.date ?? dayjs().format("DD/MM/YYYY"),
  );
  // Empty time = "All day". WhenPicker offers explicit presets so blank stays blank.
  const [time, setTime] = useState(searchParams.time ?? "");
  // Deadline horizon: null = a precise day; otherwise the commitment window.
  // due_date is computed as the window's END at save time.
  const [dueRange, setDueRange] = useState<DueRange | null>(
    searchParams.dueRange ?? null,
  );
  const [notes, setNotes] = useState(searchParams.notes ?? "");
  const [recurrenceFreq, setRecurrenceFreq] =
    useState<RecurrenceFrequency | null>(null);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    searchParams.recurrenceEndDate ?? "",
  );
  // Owning project (todo family + ideas; events stay free). Null = unfiled.
  const [projectId, setProjectId] = useState<string | null>(
    searchParams.projectId ?? null,
  );
  const { createEntry, updateEntry, isCreating, projects } = useDatabase();
  const activeProjects = projects.filter((p) => p.status === "active");

  useEffect(() => {
    if (editing && searchParams.recurrence) {
      try {
        const parsed = JSON.parse(searchParams.recurrence);
        if (parsed && parsed.freq) {
          setRecurrenceFreq(parsed.freq);
          setRecurrenceDays(parsed.days || []);
        }
      } catch (e) {
        console.error("Failed to parse recurrence:", e);
      }
    }
  }, [editing, searchParams.recurrence]);

  const accentColor = entryColor(type);

  async function handleSave(): Promise<void> {
    if (!title.trim() || isCreating) return;

    try {
      if (editing && searchParams.entryId) {
        const recurrenceRule = recurrenceFreq
          ? {
              freq: recurrenceFreq,
              days: recurrenceFreq === "weekly" ? recurrenceDays : undefined,
            }
          : undefined;
        const horizon = type === "deadline" ? dueRange : null;
        await updateEntry(searchParams.entryId, {
          title: title.trim(),
          scheduledDate: type !== "deadline" ? date.trim() || null : null,
          scheduledTime: type !== "deadline" ? time.trim() || null : null,
          dueDate:
            type === "deadline"
              ? horizon
                ? horizonEndDate(horizon)
                : date.trim() || null
              : null,
          dueTime: type === "deadline" && !horizon ? time.trim() || null : null,
          dueRange: horizon,
          notes: notes.trim() || null,
          recurrenceRule: recurrenceRule || null,
          recurrenceEndDate: recurrenceEndDate.trim() || null,
          projectId: type !== "event" ? projectId : null,
        });
      } else {
        const horizon = type === "deadline" ? dueRange : null;
        await createEntry({
          title: title.trim(),
          type: type as EntryType,
          inspiration: notes.trim() || undefined,
          scheduledDate:
            type !== "deadline" ? date.trim() || undefined : undefined,
          scheduledTime:
            type !== "deadline" ? time.trim() || undefined : undefined,
          dueDate:
            type === "deadline"
              ? horizon
                ? horizonEndDate(horizon)
                : date.trim()
              : undefined,
          dueTime: type === "deadline" && !horizon ? time.trim() : undefined,
          dueRange: horizon ?? undefined,
          notes: notes.trim() || undefined,
          recurrenceRule: recurrenceFreq
            ? {
                freq: recurrenceFreq,
                days: recurrenceFreq === "weekly" ? recurrenceDays : undefined,
              }
            : undefined,
          recurrenceEndDate: recurrenceEndDate.trim() || undefined,
          projectId: type !== "event" ? (projectId ?? undefined) : undefined,
        });
      }
      router.back();
    } catch (error) {
      console.error("Failed to save entry:", error);
      Alert.alert(
        "Couldn't save",
        "Something went wrong. Your entry wasn't saved — try again.",
        [{ text: "OK" }],
      );
    }
  }

  function handleCancel(): void {
    if (title.trim().length > 0) {
      Alert.alert(
        "Discard entry?",
        "You've started typing. Leave and lose what you wrote?",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  }

  const canSave = title.trim().length > 0 && !isCreating;
  const showDateTime = type !== "someday" && type !== "idea";

  // Accent slab colors for the save button — mirrors the capture bar CTA pattern.
  const saveBackground = canSave ? accentColor : colors.surfaceSubtle;
  const saveTextColor = canSave ? colors.paper : colors.inkMuted;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.paper }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.screen}>
          {/* Header — flush with paper, no shelf tone. Cancel left, Save right as CTA. */}
          <View style={styles.header}>
            <Pressable
              onPress={handleCancel}
              style={styles.headerButton}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <ThemedText type="body" muted>
                Cancel
              </ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ color: colors.inkMuted }}>
              {editing ? "Edit Entry" : "New Entry"}
            </ThemedText>
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: saveBackground },
                pressed && styles.saveButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isCreating ? "Saving" : "Save entry"}
              accessibilityState={{ disabled: !canSave }}
            >
              <ThemedText
                type="bodyBold"
                style={[styles.saveButtonText, { color: saveTextColor }]}
              >
                {isCreating ? "Saving…" : "Save"}
              </ThemedText>
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title Input */}
            <View style={styles.field}>
              <ThemedText type="label" muted style={styles.label}>
                TITLE
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.titleInput,
                  { backgroundColor: colors.surface, color: colors.ink },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="What do you need to do?"
                placeholderTextColor={colors.inkMuted}
                autoFocus
                returnKeyType="next"
                accessibilityLabel="Entry title"
              />
            </View>

            {/* Type Selector — 5 equal columns, always inline, top edge-bar */}
            <View style={styles.field}>
              <ThemedText type="label" muted style={styles.label}>
                TYPE
              </ThemedText>
              <View style={styles.typeSelector}>
                {TYPE_OPTIONS.map((option) => {
                  const isSelected = type === option.value;
                  // Every option carries its type identity AT REST: soft tint
                  // body, lit dot, kicker-shade label. Selection then reads as a
                  // clear step up — full electric edge-bar + saturated dot/label —
                  // not a leap from grey to color.
                  const optionAccent = entryColor(option.value);
                  const optionTint = entryTint(option.value, scheme);
                  const optionLabelColor = entryKicker(option.value, scheme);

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setType(option.value)}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ selected: isSelected }}
                      style={({ pressed }) => [
                        styles.typeOption,
                        { backgroundColor: optionTint },
                        isSelected && styles.typeOptionSelected,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View
                        style={[
                          styles.typeEdgeBar,
                          {
                            backgroundColor: optionAccent,
                            opacity: isSelected ? 1 : 0.45,
                            width: isSelected ? 20 : 12,
                          },
                        ]}
                      />
                      <ThemedText
                        type="caption"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={[
                          styles.typeOptionText,
                          {
                            color: isSelected ? optionAccent : optionLabelColor,
                            fontWeight: isSelected ? "700" : "600",
                          },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Horizon — deadlines commit to a precise day OR a window
                ("this week/month/year"). A window hides the date picker; the
                window's end date is computed at save time. */}
            {type === "deadline" && (
              <View style={styles.field}>
                <ThemedText type="label" muted style={styles.label}>
                  HORIZON
                </ThemedText>
                <View style={styles.horizonRow}>
                  {(
                    [
                      { value: null, label: "Pick a day" },
                      { value: "week", label: "This week" },
                      { value: "month", label: "This month" },
                      { value: "year", label: "This year" },
                    ] as { value: DueRange | null; label: string }[]
                  ).map((option) => {
                    const isSelected = dueRange === option.value;
                    return (
                      <Pressable
                        key={option.label}
                        onPress={() => setDueRange(option.value)}
                        accessibilityRole="radio"
                        accessibilityLabel={option.label}
                        accessibilityState={{ selected: isSelected }}
                        style={({ pressed }) => [
                          styles.horizonOption,
                          {
                            backgroundColor: isSelected
                              ? accentColor
                              : colors.surface,
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          style={{
                            color: isSelected ? colors.paper : colors.inkMuted,
                            fontWeight: isSelected ? "700" : "600",
                            textAlign: "center",
                          }}
                        >
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                {dueRange ? (
                  <ThemedText type="caption" muted>
                    Close it {horizonLabel(dueRange)} — by{" "}
                    {horizonEndDate(dueRange)}.
                  </ThemedText>
                ) : null}
              </View>
            )}

            {/* When — relative-first date + time (hidden for Someday + Idea,
                and for horizon deadlines, whose date is the window end) */}
            {showDateTime && !(type === "deadline" && dueRange) && (
              <WhenPicker
                date={date}
                time={time}
                onDateChange={setDate}
                onTimeChange={setTime}
                accentColor={accentColor}
                dateLabel={type === "deadline" ? "DUE DATE" : "DATE"}
              />
            )}

            {/* Recurrence (only for Todo) */}
            {type === "todo" && (
              <RecurrencePicker
                frequency={recurrenceFreq}
                days={recurrenceDays}
                endDate={recurrenceEndDate}
                accentColor={accentColor}
                onFrequencyChange={(freq) => {
                  setRecurrenceFreq(freq);
                  setRecurrenceDays([]);
                  setRecurrenceEndDate("");
                }}
                onDaysChange={setRecurrenceDays}
                onEndDateChange={setRecurrenceEndDate}
              />
            )}

            {/* Project — attribution to a macro life area. Events stay free;
                everything else can be filed (or stay unfiled — nothing is
                forced into a project). Hidden until a project exists. */}
            {type !== "event" && activeProjects.length > 0 && (
              <View style={styles.field}>
                <ThemedText type="label" muted style={styles.label}>
                  PROJECT
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.projectRow}
                >
                  <Pressable
                    onPress={() => setProjectId(null)}
                    accessibilityRole="radio"
                    accessibilityLabel="No project"
                    accessibilityState={{ selected: projectId === null }}
                    style={({ pressed }) => [
                      styles.projectChip,
                      {
                        backgroundColor:
                          projectId === null ? accentColor : colors.surface,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color: projectId === null ? colors.paper : colors.inkMuted,
                        fontWeight: "600",
                      }}
                    >
                      Unfiled
                    </ThemedText>
                  </Pressable>
                  {activeProjects.map((p) => {
                    const selected = projectId === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => setProjectId(selected ? null : p.id)}
                        accessibilityRole="radio"
                        accessibilityLabel={`Project ${p.title}`}
                        accessibilityState={{ selected }}
                        style={({ pressed }) => [
                          styles.projectChip,
                          {
                            backgroundColor: selected
                              ? accentColor
                              : colors.surface,
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <ThemedText
                          type="caption"
                          numberOfLines={1}
                          style={{
                            color: selected ? colors.paper : colors.ink,
                            fontWeight: "600",
                          }}
                        >
                          {p.title}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Notes */}
            <View style={styles.field}>
              <ThemedText type="label" muted style={styles.label}>
                NOTES
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.notesInput,
                  { backgroundColor: colors.surface, color: colors.ink },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any additional notes…"
                placeholderTextColor={colors.inkMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Entry notes"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  // Header: flush with paper — no shelf. Title centered in mono body scale.
  // Cancel is muted body; Save is a filled pill that takes the entry-type accent
  // once the title has content, so it lights up as the form becomes saveable.
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
  },
  headerButton: {
    minWidth: 60,
  },
  saveButton: {
    minWidth: 60,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
  },
  saveButtonPressed: {
    opacity: 0.75,
  },
  saveButtonText: {
    fontSize: tokens.type.body.size,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: tokens.space.lg,
    gap: tokens.space.lg,
  },
  field: {
    gap: tokens.space.xs,
  },
  label: {
    letterSpacing: tokens.type.kicker.tracking,
  },
  input: {
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    fontSize: tokens.type.item.size,
  },
  titleInput: {
    fontSize: tokens.type.title.size,
    fontWeight: "700",
  },
  notesInput: {
    minHeight: 100,
    fontSize: tokens.type.body.size,
  },
  // Type selector: 5 equal columns that always fit inline on any width. The
  // edge-bar sits on TOP (not left) so narrow columns never crush the label.
  typeSelector: {
    flexDirection: "row",
    gap: tokens.space.xs,
  },
  typeOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
    minHeight: 56,
    gap: tokens.space.sm,
  },
  // Selection: a tonal lift, no border. The tile floats above its siblings via
  // the bento tile elevation, so the active type reads as "raised + lit".
  typeOptionSelected: {
    transform: [{ translateY: -20 }, { scale: 1.05 }],
  },

  typeEdgeBar: {
    height: 3,
    borderRadius: tokens.radius.pill,
  },
  horizonRow: {
    flexDirection: "row",
    gap: tokens.space.xs,
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  projectChip: {
    minHeight: 44,
    maxWidth: 180,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.lg,
  },
  horizonOption: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.xs,
  },
  typeOptionText: {
    textAlign: "center",
  },
});
