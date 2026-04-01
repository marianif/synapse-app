import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import DateInput from "@/components/atoms/DateInput";
import { ThemedText } from "@/components/atoms/themed-text";
import { Radius, Spacing, Surface, TextColors } from "@/constants/theme";
import type { RecurrenceFrequency } from "@/lib/recurrence";

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
  icon: string;
}[] = [
  { value: "daily", label: "Daily", icon: "calendar" },
  { value: "weekly", label: "Weekly", icon: "calendar-today" },
  { value: "monthly", label: "Monthly", icon: "calendar-month" },
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

export function RecurrencePicker({
  frequency,
  days,
  endDate,
  accentColor,
  onFrequencyChange,
  onDaysChange,
  onEndDateChange,
}: RecurrencePickerProps): React.ReactElement {
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

  return (
    <View style={styles.container}>
      <ThemedText type="caption" muted style={styles.label}>
        REPEAT
      </ThemedText>

      <View style={styles.row}>
        {RECURRENCE_OPTIONS.map((option) => {
          const isSelected = frequency === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => handleFrequencySelect(option.value)}
              style={[
                styles.option,
                isSelected && {
                  backgroundColor: accentColor + "20",
                  borderColor: accentColor,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={
                  option.icon as keyof typeof MaterialCommunityIcons.glyphMap
                }
                size={16}
                color={isSelected ? accentColor : TextColors.tertiary}
              />
              <ThemedText
                type="caption"
                style={[
                  styles.optionLabel,
                  isSelected && { color: accentColor },
                ]}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {frequency === "weekly" && (
        <View style={styles.weekdayRow}>
          {WEEKDAY_OPTIONS.map((day) => {
            const isSelected = days.includes(day.value);
            return (
              <Pressable
                key={day.value}
                onPress={() => handleDayToggle(day.value)}
                style={[
                  styles.weekdayChip,
                  isSelected && {
                    backgroundColor: accentColor + "20",
                    borderColor: accentColor,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[
                    styles.weekdayText,
                    isSelected && { color: accentColor },
                  ]}
                >
                  {day.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}

      {frequency && (
        <View style={styles.endDateRow}>
          <DateInput
            value={endDate}
            onChange={onEndDateChange}
            style={styles.dateInput}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  label: {
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionLabel: {
    color: TextColors.tertiary,
    fontSize: 11,
  },
  weekdayRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  weekdayChip: {
    flex: 1,
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  weekdayText: {
    color: TextColors.tertiary,
    fontWeight: "600",
    fontSize: 10,
  },
  endDateRow: {
    flexDirection: "row",
  },
  dateInput: {
    flex: 1,
    backgroundColor: Surface.containerLow,
    paddingVertical: Spacing.sm,
  },
});
