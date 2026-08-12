import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { useTheme } from "@/constants/theme";
import { formatTime24h, parseTimeToMinutes } from "@/lib/date-utils";

// The app's default trigger time (09:00) — also the parked position when no
// time is set yet; the first step materializes it into the value.
const DEFAULT_MINUTES = 9 * 60;
const MINUTE_STEP = 5;

interface TimeStepperProps {
  /** Stored time — canonical "HH:MM" (24h); leniently accepts "H:MM AM/PM". */
  value: string;
  /** Emits the canonical padded 24h "HH:MM" string. */
  onChange: (value: string) => void;
  /** Entry hue — the AM/PM toggle reads selected in it. */
  accentColor: string;
}

/**
 * Time input as an instrument: two stepper columns (hour · minute) and an
 * AM/PM toggle. Mono numerals, no chrome — the same readout vocabulary as the
 * rows it edits, so setting a time never summons a keyboard.
 */
export function TimeStepper({
  value,
  onChange,
  accentColor,
}: TimeStepperProps): React.ReactElement {
  const { colors } = useTheme();
  const parsed = parseTimeToMinutes(value);
  const minutes = parsed ?? DEFAULT_MINUTES;
  const hasValue = parsed !== null;
  const hour = Math.floor(minutes / 60) % 24;
  const hour12 = ((hour + 11) % 12) + 1;
  const minute = minutes % 60;
  const period = hour >= 12 ? "PM" : "AM";
  const ink = hasValue ? colors.ink : colors.inkMuted;

  const step = (deltaMinutes: number): void => {
    void Haptics.selectionAsync();
    const next = (((minutes + deltaMinutes) % 1440) + 1440) % 1440;
    onChange(formatTime24h(next));
  };

  const stepHour = (delta: number): void => step(delta * 60);
  const stepMinute = (delta: number): void => step(delta * MINUTE_STEP);
  const togglePeriod = (): void => step(period === "AM" ? 12 * 60 : -12 * 60);

  return (
    <View style={styles.stepper}>
      <StepperColumn
        value={String(hour12)}
        ink={ink}
        muted={colors.inkMuted}
        upLabel="Increase hour"
        downLabel="Decrease hour"
        onUp={() => stepHour(1)}
        onDown={() => stepHour(-1)}
      />
      <StepperColumn
        value={String(minute).padStart(2, "0")}
        ink={ink}
        muted={colors.inkMuted}
        upLabel="Increase minutes"
        downLabel="Decrease minutes"
        onUp={() => stepMinute(1)}
        onDown={() => stepMinute(-1)}
      />
      <Pressable
        onPress={togglePeriod}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Toggle AM or PM"
        accessibilityState={{ selected: hasValue }}
        style={styles.periodColumn}
      >
        <ThemedText
          type="mono"
          style={{ color: hasValue ? accentColor : colors.inkMuted }}
        >
          {period}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function StepperColumn({
  value,
  ink,
  muted,
  upLabel,
  downLabel,
  onUp,
  onDown,
}: {
  value: string;
  ink: string;
  muted: string;
  upLabel: string;
  downLabel: string;
  onUp: () => void;
  onDown: () => void;
}): React.ReactElement {
  return (
    <View style={styles.column}>
      <Pressable
        onPress={onUp}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={upLabel}
        style={styles.stepButton}
      >
        <ThemedText type="mono" style={{ color: muted }}>
          +
        </ThemedText>
      </Pressable>
      <View style={styles.valueSlot}>
        <ThemedText
          type="mono"
          style={[styles.valueText, { color: ink }]}
          accessibilityRole="text"
        >
          {value}
        </ThemedText>
      </View>
      <Pressable
        onPress={onDown}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={downLabel}
        style={styles.stepButton}
      >
        <ThemedText type="mono" style={{ color: muted }}>
          −
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    alignItems: "center",
  },
  column: {
    alignItems: "center",
  },
  stepButton: {
    minWidth: 40,
    minHeight: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  valueSlot: {
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    fontSize: 17,
    lineHeight: 22,
  },
  periodColumn: {
    minWidth: 44,
    minHeight: 74,
    alignItems: "center",
    justifyContent: "center",
  },
});
