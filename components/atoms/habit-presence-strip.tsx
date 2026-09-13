import { StyleSheet, View } from "react-native";

import { useTheme } from "@/constants/theme";

/** One day in a habit's recent-days window. */
export interface HabitDay {
  /** DD/MM/YYYY */
  date: string;
  /** This day was an instance of the habit's cadence. */
  scheduled: boolean;
  done: boolean;
  today: boolean;
  future: boolean;
}

interface HabitPresenceStripProps {
  /** Oldest → newest. The last cell is today. */
  days: HabitDay[];
  /** Paused habits read at reduced emphasis. */
  muted?: boolean;
  /**
   * Fill for done cells — the habit's mark tone. Defaults to success green,
   * which is what a neutral (un-hued) habit keeps.
   */
  color?: string;
}

/**
 * The recent-days presence strip: one small cell per day, filled when the
 * instance was done. Presence, not a streak — no count is rendered, no run is
 * highlighted, and a missed day is simply an empty cell. Cells that were never
 * scheduled (the habit doesn't repeat that day) are drawn faint, so a missed
 * day reads differently from a day the habit was never on. The accessible label
 * carries the count so assistive tech still gets the fact.
 */
export function HabitPresenceStrip({
  days,
  muted = false,
  color,
}: HabitPresenceStripProps): React.ReactElement {
  const { colors } = useTheme();
  const doneColor = color ?? colors.feedback.success;
  const doneCount = days.filter((day) => day.done).length;
  const scheduledCount = days.filter((day) => day.scheduled).length;

  return (
    <View
      style={[styles.strip, muted && styles.muted]}
      accessible
      accessibilityLabel={`Recent days: ${doneCount} of ${scheduledCount} scheduled done`}
    >
      {days.map((day) => (
        <View
          key={day.date}
          style={[
            styles.cell,
            {
              backgroundColor: day.done
                ? doneColor
                : colors.surfaceSubtle,
            },
            // A day the habit wasn't scheduled on is not an absence — it is
            // simply out of scope, so it fades rather than reading as a miss.
            !day.done && !day.scheduled && styles.unscheduled,
            day.future && styles.future,
            day.today && styles.today,
            day.today && { borderColor: colors.inkMuted },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  muted: {
    opacity: 0.45,
  },
  cell: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  // A ring, not a fill: today is a position in time, not an achievement.
  today: {
    borderWidth: 1,
  },
  future: {
    opacity: 0.45,
  },
  unscheduled: {
    opacity: 0.28,
  },
});
