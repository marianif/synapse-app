import { useRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import DateInput from "@/components/atoms/DateInput";
import { ChipRail, SelectChip } from "@/components/atoms/select-chip";
import { IconPill } from "@/components/atoms/icon-pill";
import { ThemedText } from "@/components/atoms/themed-text";
import TimeInput from "@/components/atoms/TimeInput";
import { DetailNoteBlock } from "@/components/molecules/detail-note-block";
import { RecurrencePicker } from "@/components/molecules/recurrence-picker";
import { tokens, useTheme } from "@/constants/theme";

import type { DbEntry, DueRange, RecurrenceFrequency } from "@/lib/types";

const HORIZON_OPTIONS: { value: DueRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

// The when-cluster draft: date/time map to whichever pair the type uses,
// dueRange holds a deadline horizon (null = a precise day).
export interface WhenDraft {
  date: string;
  time: string;
  dueRange: DueRange | null;
  recurrenceFreq: RecurrenceFrequency | null;
  recurrenceDays: number[];
  recurrenceEndDate: string;
}

type DetailViewMetaProps = {
  entry: DbEntry;
  accent: string;
  charged: boolean;
  whenText: string;
  recurrenceText: string | null;
  done: boolean;
  doneLabel: string;
  reduced: boolean;
  editing: boolean;
  onStartEdit: () => void;
  titleDraft: string;
  onTitleDraftChange: (text: string) => void;
  whenDraft: WhenDraft;
  onWhenDraftChange: (patch: Partial<WhenDraft>) => void;
  onCommitEdit: () => void;
  isDeadlineType: boolean;
  isTodoType: boolean;
  onDelete: () => void;
  onMarkDone: () => void;
};

// View-mode body of the sheet: the title and the WHEN row, together, as one
// editable identity. A single pencil on the title opens both into edit mode;
// a single check commits both and returns to view mode.
export function DetailViewMeta({
  entry,
  accent,
  charged,
  whenText,
  recurrenceText,
  done,
  doneLabel,
  reduced,
  editing,
  onStartEdit,
  titleDraft,
  onTitleDraftChange,
  whenDraft,
  onWhenDraftChange,
  onCommitEdit,
  isDeadlineType,
  isTodoType,
  onDelete,
  onMarkDone,
}: DetailViewMetaProps): React.ReactElement {
  const { colors } = useTheme();
  const titleInputRef = useRef<TextInput>(null);
  const precise = whenDraft.dueRange === null;

  return (
    <Animated.View
      layout={
        reduced
          ? undefined
          : LinearTransition.duration(220).easing(Easing.bezier(0.22, 1, 0.36, 1))
      }
    >
      {/* ── Title — the one edit trigger for the whole identity+when block ── */}
      {editing ? (
        <View
          style={[styles.titleEditRow, { backgroundColor: colors.surfaceSubtle }]}
        >
          <TextInput
            ref={titleInputRef}
            value={titleDraft}
            onChangeText={onTitleDraftChange}
            onSubmitEditing={onCommitEdit}
            placeholder="Title"
            placeholderTextColor={colors.inkMuted}
            style={[styles.titleInput, { color: colors.ink }]}
            multiline
            autoFocus
            returnKeyType="done"
          />
          <IconPill
            icon="check"
            color={accent}
            onPress={onCommitEdit}
            accessibilityLabel="Done editing"
          />
        </View>
      ) : (
        <View style={styles.titleRow}>
          <Pressable
            onPress={onStartEdit}
            style={styles.titleTapArea}
            accessibilityRole="button"
            accessibilityLabel={`Edit: ${entry.title}`}
            hitSlop={4}
          >
            <ThemedText
              type="title"
              style={[
                styles.title,
                { color: colors.ink, textDecorationLine: done ? "line-through" : "none" },
              ]}
            >
              {entry.title}
            </ThemedText>
          </Pressable>
          <IconPill
            icon="pencil-outline"
            color={accent}
            onPress={onStartEdit}
            accessibilityLabel="Edit"
          />
        </View>
      )}

      {entry.subtitle ? (
        <ThemedText type="body" muted style={styles.subtitle}>
          {entry.subtitle}
        </ThemedText>
      ) : null}

      {/* ── Divider ── */}
      <View style={[styles.divider, { backgroundColor: colors.surfaceSubtle }]} />

      {/* ── WHEN — opens together with the title, no row-level edit trigger ── */}
      <View style={styles.meta}>
        {editing ? (
          <Animated.View
            entering={
              reduced
                ? undefined
                : FadeIn.duration(220).easing(Easing.bezier(0.22, 1, 0.36, 1))
            }
            exiting={
              reduced
                ? undefined
                : FadeOut.duration(140).easing(Easing.bezier(0.22, 1, 0.36, 1))
            }
            style={styles.whenEdit}
          >
            <ThemedText type="micro" muted style={styles.metaLabel}>
              WHEN
            </ThemedText>

            {isDeadlineType ? (
              <ChipRail>
                {HORIZON_OPTIONS.map((opt) => (
                  <SelectChip
                    key={opt.value}
                    label={opt.label}
                    selected={whenDraft.dueRange === opt.value}
                    accentColor={accent}
                    onPress={() =>
                      onWhenDraftChange({
                        dueRange: whenDraft.dueRange === opt.value ? null : opt.value,
                      })
                    }
                  />
                ))}
                <SelectChip
                  label="Precise date"
                  selected={precise}
                  accentColor={accent}
                  onPress={() => onWhenDraftChange({ dueRange: null })}
                />
              </ChipRail>
            ) : null}

            {!isDeadlineType || precise ? (
              <View style={styles.dateTimeRow}>
                <DateInput
                  value={whenDraft.date}
                  onChange={(v) => onWhenDraftChange({ date: v })}
                  style={styles.dateInput}
                />
                <TimeInput
                  value={whenDraft.time}
                  onChange={(v) => onWhenDraftChange({ time: v })}
                  style={styles.timeInput}
                />
              </View>
            ) : null}

            {isTodoType ? (
              <RecurrencePicker
                frequency={whenDraft.recurrenceFreq}
                days={whenDraft.recurrenceDays}
                endDate={whenDraft.recurrenceEndDate}
                accentColor={accent}
                onFrequencyChange={(f) => onWhenDraftChange({ recurrenceFreq: f })}
                onDaysChange={(d) => onWhenDraftChange({ recurrenceDays: d })}
                onEndDateChange={(d) => onWhenDraftChange({ recurrenceEndDate: d })}
              />
            ) : null}
          </Animated.View>
        ) : (
          <View style={styles.metaRow}>
            <View style={styles.whenReadout}>
              <ThemedText type="micro" muted style={styles.metaLabel}>
                WHEN
              </ThemedText>
              <ThemedText
                type="mono"
                style={[styles.metaValue, charged && { color: tokens.feedback.danger }]}
              >
                {whenText}
              </ThemedText>
            </View>

            <View style={styles.inlineActions}>
              <IconPill
                icon="trash-can-outline"
                color={tokens.feedback.danger}
                onPress={onDelete}
                accessibilityLabel="Delete"
              />

              {!done ? (
                <IconPill
                  icon="check"
                  color={tokens.feedback.success}
                  onPress={onMarkDone}
                  accessibilityLabel={doneLabel}
                  label={doneLabel}
                />
              ) : null}
            </View>
          </View>
        )}

        {!editing && recurrenceText ? (
          <View style={styles.metaRow}>
            <ThemedText type="micro" muted style={styles.metaLabel}>
              REPEATS
            </ThemedText>
            <ThemedText type="mono" style={styles.metaValue}>
              {recurrenceText}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {/* ── Notes (read-only here — full edit lives on the detail screen) ── */}
      {entry.inspiration ? (
        <DetailNoteBlock label="INSPIRATION" value={entry.inspiration} />
      ) : null}

      {entry.notes ? <DetailNoteBlock label="NOTES" value={entry.notes} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // ── Title ──
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.sm,
    marginBottom: tokens.space.xs,
  },
  titleTapArea: {
    flex: 1,
  },
  title: {
    flex: 1,
  },
  titleEditRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.space.sm,
    marginBottom: tokens.space.xs,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },
  titleInput: {
    flex: 1,
    fontFamily: tokens.type.fontInter.bold,
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
  },
  subtitle: {
    marginBottom: tokens.space.sm,
  },

  // ── Divider ──
  divider: {
    height: 1,
    marginBottom: tokens.space.md,
  },

  // ── Meta / WHEN ──
  meta: {
    gap: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 44,
  },
  whenReadout: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.xs,
  },
  metaLabel: {
    letterSpacing: 0.5,
  },
  metaValue: {
    flex: 1,
  },
  inlineActions: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  whenEdit: {
    gap: tokens.space.sm,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  dateInput: {
    flex: 1,
  },
  timeInput: {
    flex: 1,
  },
});
