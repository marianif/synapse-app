import { Link, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DateInput from "@/components/atoms/DateInput";
import { ThemedText } from "@/components/atoms/themed-text";
import TimeInput from "@/components/atoms/TimeInput";
import { RecurrencePicker } from "@/components/molecules/recurrence-picker";
import {
  EntryAccent,
  Radius,
  Spacing,
  Surface,
  TextColors,
} from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import type { RecurrenceFrequency } from "@/lib/recurrence";

import type { EntryType } from "@/components/atoms/entry-dot";
import dayjs from "dayjs";

type FormType = "todo" | "deadline" | "event" | "someday";

const TYPE_OPTIONS: { value: FormType; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "deadline", label: "Deadline" },
  { value: "event", label: "Event" },
  { value: "someday", label: "Someday" },
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
  }>();

  const editing = isEditMode(searchParams);

  const [title, setTitle] = useState(searchParams.title ?? "");
  const [type, setType] = useState<FormType>(searchParams.type ?? "todo");
  const [date, setDate] = useState(
    searchParams.date ?? dayjs().format("DD/MM/YYYY"),
  );
  const [time, setTime] = useState(
    searchParams.time ?? dayjs().format("HH:MM"),
  );
  const [notes, setNotes] = useState(searchParams.notes ?? "");
  const [recurrenceFreq, setRecurrenceFreq] =
    useState<RecurrenceFrequency | null>(null);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    searchParams.recurrenceEndDate ?? "",
  );
  const { createEntry, createIdea, updateEntry, isCreating } = useDatabase();

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

  const accentColor =
    type === "todo"
      ? EntryAccent.todo
      : type === "deadline"
        ? EntryAccent.deadline
        : type === "event"
          ? EntryAccent.event
          : EntryAccent.someday;

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
        await updateEntry(searchParams.entryId, {
          title: title.trim(),
          scheduledDate: type !== "deadline" ? date.trim() || null : null,
          scheduledTime: type !== "deadline" ? time.trim() || null : null,
          dueDate: type === "deadline" ? date.trim() || null : null,
          dueTime: type === "deadline" ? time.trim() || null : null,
          notes: notes.trim() || null,
          recurrenceRule: recurrenceRule || null,
          recurrenceEndDate: recurrenceEndDate.trim() || null,
        });
      } else if (type === "someday") {
        await createIdea({
          title: title.trim(),
          inspiration: notes.trim() || undefined,
        });
      } else {
        const recurrenceRule = recurrenceFreq
          ? {
              freq: recurrenceFreq,
              days: recurrenceFreq === "weekly" ? recurrenceDays : undefined,
            }
          : undefined;
        await createEntry({
          title: title.trim(),
          type: type as EntryType,
          scheduledDate: date.trim() || undefined,
          scheduledTime: time.trim() || undefined,
          dueDate: type === "deadline" ? date.trim() : undefined,
          dueTime: type === "deadline" ? time.trim() : undefined,
          notes: notes.trim() || undefined,
          recurrenceRule,
          recurrenceEndDate: recurrenceEndDate.trim() || undefined,
        });
      }
    } catch (error) {
      console.error("Failed to save entry:", error);
    }
    router.back();
  }

  const canSave = title.trim().length > 0 && !isCreating;
  const showDateTime = type !== "someday";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.screen}>
          {/* Header */}
          <View style={styles.header}>
            <Link href="/" dismissTo asChild>
              <Pressable style={styles.headerButton} hitSlop={12}>
                <ThemedText type="body" muted>
                  Cancel
                </ThemedText>
              </Pressable>
            </Link>
            <ThemedText type="headline">
              {editing ? "Edit Entry" : "Add Entry"}
            </ThemedText>
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.headerSaveButton,
                !canSave && styles.headerSaveButtonDisabled,
                pressed && styles.headerSaveButtonPressed,
              ]}
            >
              <ThemedText
                type="bodyBold"
                style={[styles.headerSaveButtonText, { color: accentColor }]}
              >
                {isCreating ? "Saving..." : "Save"}
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
              <ThemedText type="caption" muted style={styles.label}>
                TITLE
              </ThemedText>
              <TextInput
                style={[styles.input, styles.titleInput]}
                value={title}
                onChangeText={setTitle}
                placeholder="What do you need to do?"
                placeholderTextColor={TextColors.disabled}
                autoFocus
                returnKeyType="next"
              />
            </View>

            {/* Type Selector */}
            <View style={styles.field}>
              <ThemedText type="caption" muted style={styles.label}>
                TYPE
              </ThemedText>
              <View style={styles.typeSelector}>
                {TYPE_OPTIONS.map((option) => {
                  const isSelected = type === option.value;
                  const optionAccent =
                    option.value === "todo"
                      ? EntryAccent.todo
                      : option.value === "deadline"
                        ? EntryAccent.deadline
                        : option.value === "event"
                          ? EntryAccent.event
                          : EntryAccent.someday;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setType(option.value)}
                      style={[
                        styles.typeOption,
                        isSelected && {
                          backgroundColor: optionAccent + "20",
                          borderColor: optionAccent,
                        },
                      ]}
                    >
                      <ThemedText
                        type="bodyBold"
                        style={[
                          styles.typeOptionText,
                          isSelected && { color: optionAccent },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Date/Time Fields (hidden for Someday) */}
            {showDateTime && (
              <View style={styles.row}>
                <View style={[styles.field, styles.halfField]}>
                  <ThemedText type="caption" muted style={styles.label}>
                    {type === "deadline" ? "DUE DATE" : "DATE"}
                  </ThemedText>
                  <DateInput
                    value={date}
                    onChange={setDate}
                    style={styles.input}
                  />
                </View>
                <View style={[styles.field, styles.halfField]}>
                  <ThemedText type="caption" muted style={styles.label}>
                    TIME
                  </ThemedText>
                  <TimeInput
                    value={time ?? dayjs().format("HH:MM")}
                    onChange={setTime}
                    style={styles.input}
                  />
                </View>
              </View>
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

            {/* Notes */}
            <View style={styles.field}>
              <ThemedText type="caption" muted style={styles.label}>
                NOTES
              </ThemedText>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any additional notes..."
                placeholderTextColor={TextColors.disabled}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
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
    backgroundColor: Surface.base,
  },
  keyboardView: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Surface.outlineVariant,
  },
  headerButton: {
    minWidth: 60,
  },
  headerSaveButton: {
    minWidth: 50,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Surface.outlineVariant,
  },
  headerSaveButtonDisabled: {
    opacity: 0.5,
  },
  headerSaveButtonPressed: {
    opacity: 0.7,
  },
  headerSaveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: TextColors.primary,
    fontSize: 16,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
  },
  notesInput: {
    minHeight: 100,
  },
  typeSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  typeOption: {
    flex: 1,
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  typeOptionText: {
    color: TextColors.secondary,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  actionBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Surface.outlineVariant,
  },
  saveButton: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonText: {
    color: "#131316",
    fontSize: 16,
    fontWeight: "600",
  },
  weekdayRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  weekdayOption: {
    flex: 1,
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  weekdayOptionText: {
    color: TextColors.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
});
