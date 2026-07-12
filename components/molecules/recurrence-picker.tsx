import dayjs from "dayjs";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import {
  ChipRail,
  ChipRow,
  SelectChip,
} from "@/components/atoms/select-chip";
import { CompactCalendar } from "@/components/molecules/compact-calendar";
import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { parseDate, toDisplayDate } from "@/lib/date-utils";
import type { RecurrenceFrequency } from "@/lib/types";

interface RecurrencePickerProps {
  frequency: RecurrenceFrequency | null;
  days: number[];
  endDate: string;
  accentColor: string;
  onFrequencyChange: (freq: RecurrenceFrequency | null) => void;
  onDaysChange: (days: number[]) => void;
  onEndDateChange: (date: string) => void;
}

const RECURRENCE_OPTIONS: {
  value: RecurrenceFrequency;
  label: string;
}[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
];

/**
 * REPEAT control for Add Entry (Todo only). Shares the WhenPicker vocabulary: a
 * borderless panel, a frequency chip rail, a tint-filled weekday row (no borders),
 * and a calendar end-date as progressive disclosure. Off by default — "Never" is
 * the resting state and the whole thing collapses to a single rail.
 */
export function RecurrencePicker({
  frequency,
  days,
  endDate,
  accentColor,
  onFrequencyChange,
  onDaysChange,
  onEndDateChange,
}: RecurrencePickerProps): React.ReactElement {
  const { colors } = useTheme();
  const [endOpen, setEndOpen] = useState(false);

  const endDateValue = parseDate(endDate || null);

  const handleFrequencySelect = (freq: RecurrenceFrequency): void => {
    if (frequency === freq) {
      onFrequencyChange(null);
    } else {
      onFrequencyChange(freq);
      if (freq === "weekly" && days.length === 0) {
        onDaysChange([3]);
      }
    }
  };

  const handleDayToggle = (dayValue: number): void => {
    const isSelected = days.includes(dayValue);
    if (isSelected) {
      onDaysChange(days.filter((d) => d !== dayValue));
    } else {
      onDaysChange([...days, dayValue].sort());
    }
  };

  function pickEndDate(d: Date): void {
    onEndDateChange(toDisplayDate(d));
    setEndOpen(false);
  }

  function clearEndDate(): void {
    onEndDateChange("");
    setEndOpen(false);
  }

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <ThemedText type="label" muted style={styles.kicker}>
          REPEAT
        </ThemedText>
      </View>

      {/* Frequency chip rail */}
      <View style={styles.railWrap}>
        <ChipRail>
          {RECURRENCE_OPTIONS.map((option) => (
            <SelectChip
              key={option.value}
              label={option.label}
              selected={frequency === option.value}
              accentColor={accentColor}
              onPress={() => handleFrequencySelect(option.value)}
            />
          ))}
        </ChipRail>
      </View>

      {/* Weekly day picker — equal-width segmented chips */}
      {frequency === "weekly" && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          layout={LinearTransition.duration(220).easing(Easing.bezier(0.22, 1, 0.36, 1))}
          style={styles.railWrap}
        >
          <ChipRow>
            {WEEKDAY_OPTIONS.map((day) => (
              <SelectChip
                key={day.value}
                label={day.label}
                selected={days.includes(day.value)}
                accentColor={accentColor}
                onPress={() => handleDayToggle(day.value)}
                fill
              />
            ))}
          </ChipRow>
        </Animated.View>
      )}

      {/* End date — calendar progressive disclosure, only when repeating */}
      {frequency && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          layout={LinearTransition.duration(220).easing(Easing.bezier(0.22, 1, 0.36, 1))}
        >
          <Pressable
            onPress={() => setEndOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Set an end date"
            accessibilityState={{ expanded: endOpen }}
            style={({ pressed }) => [
              styles.endRow,
              pressed && { backgroundColor: colors.surfaceSubtle },
            ]}
          >
            <ThemedText type="body" muted={!endDateValue}>
              {endDateValue
                ? `Until ${dayjs(endDateValue).format("D MMM YYYY")}`
                : "Ends never"}
            </ThemedText>
            {endDateValue ? (
              <Pressable
                onPress={clearEndDate}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear end date"
                style={styles.clear}
              >
                <IconSymbol name="close" size={16} color={colors.inkMuted} />
              </Pressable>
            ) : (
              <IconSymbol
                name={endOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.inkMuted}
              />
            )}
          </Pressable>

          {endOpen && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              style={styles.disclosure}
            >
              <CompactCalendar
                value={endDateValue}
                onSelect={pickEndDate}
                accentColor={accentColor}
              />
            </Animated.View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.space.md,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: tokens.space.lg,
  },
  kicker: {
    letterSpacing: 0.8,
  },
  railWrap: {
    paddingTop: tokens.space.md,
  },
  endRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: tokens.space.lg,
    marginTop: tokens.space.md,
  },
  disclosure: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.sm,
  },
  clear: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
