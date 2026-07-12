import { StyleSheet, TextInput, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import DateInput from "@/components/atoms/DateInput";
import { ChipRail, SelectChip } from "@/components/atoms/select-chip";
import { ThemedText } from "@/components/atoms/themed-text";
import TimeInput from "@/components/atoms/TimeInput";
import { RecurrencePicker } from "@/components/molecules/recurrence-picker";
import { tokens, useTheme } from "@/constants/theme";

import type { DueRange, EntryType, RecurrenceFrequency } from "@/lib/types";

export interface DetailEditDraft {
  title: string;
  date: string;
  time: string;
  dueRange: DueRange | null;
  notes: string;
  recurrenceFreq: RecurrenceFrequency | null;
  recurrenceDays: number[];
  recurrenceEndDate: string;
}

const HORIZON_OPTIONS: { value: DueRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

type DetailEditFormProps = {
  draft: DetailEditDraft;
  patchDraft: (patch: Partial<DetailEditDraft>) => void;
  type: EntryType;
  isDeadlineType: boolean;
  accent: string;
  reduced: boolean;
};

// The sheet's edit-mode body: WHEN (deadline horizon chips or precise
// date+time), REPEAT (todo only, matches detail.tsx scope), and NOTES.
export function DetailEditForm({
  draft,
  patchDraft,
  type,
  isDeadlineType,
  accent,
  reduced,
}: DetailEditFormProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(180)}
      exiting={reduced ? undefined : FadeOut.duration(120)}
      layout={
        reduced
          ? undefined
          : LinearTransition.springify().damping(18).stiffness(220)
      }
      style={styles.editBlock}
    >
      {/* ── WHEN (deadline: horizon or precise date; else date+time) ── */}
      <ThemedText type="micro" muted style={styles.editLabel}>
        WHEN
      </ThemedText>

      {isDeadlineType ? (
        <ChipRail>
          {HORIZON_OPTIONS.map((opt) => (
            <SelectChip
              key={opt.value}
              label={opt.label}
              selected={draft.dueRange === opt.value}
              accentColor={accent}
              onPress={() =>
                patchDraft({
                  dueRange: draft.dueRange === opt.value ? null : opt.value,
                })
              }
            />
          ))}
          <SelectChip
            label="Precise date"
            selected={draft.dueRange === null}
            accentColor={accent}
            onPress={() => patchDraft({ dueRange: null })}
          />
        </ChipRail>
      ) : null}

      {!isDeadlineType || draft.dueRange === null ? (
        <View style={styles.dateTimeRow}>
          <DateInput
            value={draft.date}
            onChange={(v) => patchDraft({ date: v })}
            style={styles.dateInput}
          />
          <TimeInput
            value={draft.time}
            onChange={(v) => patchDraft({ time: v })}
            style={styles.timeInput}
          />
        </View>
      ) : null}

      {/* ── REPEAT (todo only, matches detail.tsx scope) ── */}
      {type === "todo" ? (
        <RecurrencePicker
          frequency={draft.recurrenceFreq}
          days={draft.recurrenceDays}
          endDate={draft.recurrenceEndDate}
          accentColor={accent}
          onFrequencyChange={(f) => patchDraft({ recurrenceFreq: f })}
          onDaysChange={(d) => patchDraft({ recurrenceDays: d })}
          onEndDateChange={(d) => patchDraft({ recurrenceEndDate: d })}
        />
      ) : null}

      {/* ── NOTES ── */}
      <ThemedText type="micro" muted style={styles.editLabel}>
        NOTES
      </ThemedText>
      <TextInput
        value={draft.notes}
        onChangeText={(t) => patchDraft({ notes: t })}
        placeholder="Add notes…"
        placeholderTextColor={colors.inkMuted}
        style={[
          styles.notesInput,
          {
            backgroundColor: colors.surfaceSubtle,
            color: colors.ink,
          },
        ]}
        multiline
        textAlignVertical="top"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  editBlock: {
    gap: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  editLabel: {
    letterSpacing: 0.5,
    marginTop: tokens.space.xs,
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
  notesInput: {
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 88,
  },
});
