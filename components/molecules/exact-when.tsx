import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { WhenStepper } from "@/components/molecules/when-stepper";
import { tokens } from "@/constants/theme";

dayjs.extend(customParseFormat);

const STORE_FMT = "DD/MM/YYYY";

/**
 * The precise day + time, compacted to a single instrument readout. The date and
 * time are big mono values; bare chevron steppers nudge them (±1 day, ±15 min),
 * press-and-hold to repeat. No wheel, no panel, no chips — the value is the
 * control. The relative quick-picks (tomorrow / weekend) live at the top WHEN level,
 * so they're deliberately absent here.
 *
 * `inkColor` / `mutedColor` are passed in because the resolver workbench is a
 * fixed dark panel in both schemes; its inks don't follow the app scheme.
 */
export function ExactWhen({
  date,
  time,
  accent,
  inkColor,
  mutedColor,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  accent: string;
  inkColor: string;
  mutedColor: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}): React.ReactElement {
  // Default the date to today the moment exact opens with nothing set.
  useEffect(() => {
    if (!date) onDateChange(dayjs().format(STORE_FMT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const day = date ? dayjs(date, STORE_FMT) : dayjs();

  function nudgeDay(delta: number): void {
    const today = dayjs().startOf("day");
    let next = day.add(delta, "day");
    // Never schedule into the past — a big jump backwards floors at today
    // rather than no-op'ing, so a held chevron lands on today instead of stalling.
    if (next.isBefore(today)) {
      if (day.isSame(today, "day")) return; // already at the floor
      next = today;
    }
    onDateChange(next.format(STORE_FMT));
  }

  function nudgeTime(delta: number): void {
    if (!time) {
      onTimeChange(delta > 0 ? "09:00" : "08:45");
      return;
    }
    const [h, m] = time.split(":").map(Number);
    const total = (h * 60 + m + delta * 15 + 24 * 60) % (24 * 60);
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    onTimeChange(
      `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`,
    );
  }

  const timeLabel = time
    ? dayjs()
        .hour(Number(time.split(":")[0]))
        .minute(Number(time.split(":")[1]))
        .format("h:mm A")
    : "all day";

  return (
    <View style={styles.exact}>
      {/* Date stepper — tap nudges ±1 day, hold jumps ±10 days. */}
      <WhenStepper
        accent={accent}
        onLeft={() => nudgeDay(-1)}
        onRight={() => nudgeDay(1)}
        onLeftHold={() => nudgeDay(-10)}
        onRightHold={() => nudgeDay(10)}
        accessibilityLabel="Adjust day"
      >
        <ThemedText type="mono" style={[styles.exactValue, { color: inkColor }]}>
          {day.format("ddd D MMM")}
        </ThemedText>
      </WhenStepper>

      {/* Time stepper — tap nudges ±15 min, hold jumps ±1 hour. Tapping the
          label clears back to all-day. */}
      <WhenStepper
        accent={accent}
        onLeft={() => nudgeTime(-1)}
        onRight={() => nudgeTime(1)}
        onLeftHold={() => nudgeTime(-4)}
        onRightHold={() => nudgeTime(4)}
        accessibilityLabel="Adjust time"
      >
        <Pressable
          onPress={() => time && onTimeChange("")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={time ? "Clear time, all day" : "Time"}
        >
          <ThemedText
            type="mono"
            style={[
              styles.exactValue,
              { color: time ? inkColor : mutedColor },
            ]}
          >
            {timeLabel}
          </ThemedText>
        </Pressable>
      </WhenStepper>
    </View>
  );
}

const styles = StyleSheet.create({
  exact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: tokens.space.xs,
    columnGap: tokens.space.lg,
    paddingVertical: tokens.space.xs,
  },
  exactValue: {
    minWidth: 92,
    textAlign: "center",
  },
});
