import dayjs from "dayjs";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { ChipRail, SelectChip } from "@/components/atoms/select-chip";
import { ThemedText } from "@/components/atoms/themed-text";
import {
  WHEEL_ROW_HEIGHT,
  WheelPicker,
  type WheelItem,
} from "@/components/atoms/wheel-picker";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { parseDate, toDisplayDate } from "@/lib/date-utils";
import { horizonLabel } from "@/lib/horizons";
import type { DueRange } from "@/lib/types";

// ─── When? ──────────────────────────────────────────────────────────────────────
// "When" is a relative human concept for a capture-first user. Quick-pick chips
// answer the common cases in one tap — concrete days (Today/Tomorrow/Weekend)
// and deadline horizons (this week/month/year); the day+time wheel below is the
// precise control — a dot marks the centered selection, day on the left, time on
// the right, like a single instrument. No keyboard, no fragile parsing.

type RelativeOption =
  | { kind: "date"; key: string; label: string; resolve: () => dayjs.Dayjs }
  | { kind: "range"; key: string; label: string; range: DueRange };

const RELATIVE_OPTIONS: RelativeOption[] = [
  {
    kind: "date",
    key: "weekend",
    label: "Weekend",
    // The coming Saturday (today if already Sat).
    resolve: () => {
      const d = dayjs();
      return d.add((6 - d.day() + 7) % 7, "day");
    },
  },
  { kind: "range", key: "week", label: "This week", range: "week" },
  { kind: "range", key: "month", label: "This month", range: "month" },
  { kind: "range", key: "year", label: "This year", range: "year" },
];

// Day wheel spans ~3 months forward — enough for any near-term capture.
const DAY_SPAN = 90;
const DAY_ITEMS: WheelItem[] = Array.from({ length: DAY_SPAN }, (_, i) => {
  const d = dayjs().startOf("day").add(i, "day");
  const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.format("ddd");
  return {
    value: toDisplayDate(d.toDate()),
    label,
    detail: d.format("D MMM"),
  };
});

// Time wheel — every 15 minutes, AM/PM formatted.
const TIME_ITEMS: WheelItem[] = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const label = dayjs().hour(h).minute(m).format("h:mm A");
  return { value, label };
});

type WhenPickerProps = {
  /** Date as stored DD/MM/YYYY (or empty when a horizon is active). */
  date: string;
  /** Time as stored HH:mm (or empty until a time is picked). */
  time: string;
  /** Active deadline horizon (this week/month/year), if any. */
  dueRange: DueRange | null;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onDueRangeChange: (range: DueRange | null) => void;
  /** Entry-type tint — colors the selected chip + a selection dot. */
  accentColor: string;
  /** Label above the panel ("DATE" or "DUE DATE"). */
  dateLabel: string;
  /** Opens the precise wheel immediately when embedded in an editor. */
  initiallyOpen?: boolean;
  /** Hide relative shortcuts when the surrounding screen owns those choices. */
  showQuickOptions?: boolean;
};

/**
 * The "When" control for Add Entry — a compact panel. The resolved date is the
 * headline (echo); quick-pick chips answer common cases in one tap; the day+time
 * wheel (a dot marks the centered selection) is the precise control, progressive-disclosed.
 */
export function WhenPicker({
  date,
  time,
  dueRange,
  onDateChange,
  onTimeChange,
  onDueRangeChange,
  accentColor,
  dateLabel,
  initiallyOpen = false,
  showQuickOptions = true,
}: WhenPickerProps): React.ReactElement {
  const { colors } = useTheme();
  const [wheelOpen, setWheelOpen] = useState(initiallyOpen);

  const selectedDate = parseDate(date || null);

  // Which relative option (if any) the current selection matches.
  const activeRelative = RELATIVE_OPTIONS.find((o) => {
    if (o.kind === "range") return dueRange === o.range;
    return dueRange === null && toDisplayDate(o.resolve().toDate()) === date;
  })?.key;

  function pickRelative(option: RelativeOption): void {
    if (option.kind === "range") {
      onDateChange("");
      onTimeChange("");
      onDueRangeChange(option.range);
      return;
    }
    onDateChange(toDisplayDate(option.resolve().toDate()));
    onTimeChange("");
    onDueRangeChange(null);
  }

  // Wheel needs a concrete day to land on — default to today if none set yet.
  const wheelDay = date || DAY_ITEMS[0].value;
  // Default the time band to 09:00 until the user commits a time.
  const wheelTime = time || "09:00";

  function openWheel(): void {
    if (!date) onDateChange(DAY_ITEMS[0].value);
    if (dueRange) onDueRangeChange(null);
    setWheelOpen((v) => !v);
  }

  // Format the stored "HH:mm" into "h:mm A" without fragile string parsing.
  const timeLabel = time
    ? dayjs()
        .hour(Number(time.split(":")[0]))
        .minute(Number(time.split(":")[1]))
        .format("h:mm A")
    : "";
  const echoText = dueRange
    ? horizonLabel(dueRange)
    : selectedDate
      ? dayjs(selectedDate).format("ddd, D MMM") +
        (timeLabel ? ` · ${timeLabel}` : "")
      : "When?";

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface }]}>
      {/* Header: kicker + echo headline, with a wheel toggle on the right */}
      <View style={styles.headerRow}>
        <View style={styles.echoZone}>
          <ThemedText type="label" muted style={styles.kicker}>
            {dateLabel}
          </ThemedText>
          <View style={styles.echoRow}>
            <View
              style={[
                styles.echoBar,
                {
                  backgroundColor:
                    selectedDate || dueRange ? accentColor : "transparent",
                },
              ]}
            />
            <ThemedText type="title" numberOfLines={1} style={styles.echo}>
              {echoText}
            </ThemedText>
          </View>
        </View>

        <Pressable
          onPress={openWheel}
          accessibilityRole="button"
          accessibilityLabel="Adjust day and time"
          accessibilityState={{ expanded: wheelOpen }}
          style={({ pressed }) => [
            styles.adjustButton,
            { backgroundColor: colors.surfaceSubtle },
            wheelOpen && { backgroundColor: accentColor + "22" },
            pressed && { opacity: 0.7 },
          ]}
        >
          <IconSymbol
            name={wheelOpen ? "ChevronUp" : "SliderH"}
            size={18}
            color={wheelOpen ? accentColor : colors.inkMuted}
          />
        </Pressable>
      </View>

      {showQuickOptions ? (
        <View style={styles.railWrap}>
          <ChipRail>
            {RELATIVE_OPTIONS.map((option) => (
              <SelectChip
                key={option.key}
                label={option.label}
                selected={activeRelative === option.key}
                accentColor={accentColor}
                compact
                onPress={() => pickRelative(option)}
              />
            ))}
          </ChipRail>
        </View>
      ) : null}

      {/* Day + time wheel — a dot marks the centered selection, progressive disclosure */}
      {wheelOpen && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          layout={LinearTransition.springify().damping(18).stiffness(220)}
          style={styles.wheelZone}
        >
          {/* A single leading dot marks the center row — the same EntryDot
              vocabulary used for selection elsewhere in the app, not a
              filled band or an accent bar/tick. */}
          <View
            pointerEvents="none"
            style={[styles.selectionDot, { backgroundColor: accentColor }]}
          />
          <View style={styles.wheelRow}>
            <WheelPicker
              items={DAY_ITEMS}
              selectedValue={wheelDay}
              onChange={onDateChange}
              accentColor={accentColor}
              align="split"
              flex={1.4}
            />
            <WheelPicker
              items={TIME_ITEMS}
              selectedValue={wheelTime}
              onChange={onTimeChange}
              accentColor={accentColor}
              align="center"
              flex={1}
            />
          </View>

          {/* Footer: Done (confirm) on the right */}
          <View style={styles.wheelFooter}>
            <Pressable
              onPress={() => setWheelOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Confirm day and time"
              style={({ pressed }) => [
                styles.doneButton,
                {
                  backgroundColor: pressed
                    ? colors.accent.clayPressed
                    : colors.accent.clay,
                },
              ]}
            >
              <ThemedText
                type="bodyBold"
                style={{ color: colors.accent.onClay }}
              >
                Done
              </ThemedText>
            </Pressable>
          </View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.md,
  },
  echoZone: {
    flex: 1,
    gap: tokens.space.xs,
  },
  kicker: {
    letterSpacing: 0.8,
  },
  echoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  echoBar: {
    width: 3,
    height: 20,
    borderRadius: tokens.radius.pill,
    marginRight: tokens.space.md,
  },
  echo: {
    flex: 1,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  railWrap: {
    paddingTop: tokens.space.md,
  },
  wheelZone: {
    paddingTop: tokens.space.md,
    justifyContent: "center",
  },
  // A single dot marks the center row both wheels snap into — EntryDot's own
  // size (8px), not a filled band or an accent bar/tick pair.
  selectionDot: {
    position: "absolute",
    left: tokens.space.md,
    top:
      tokens.space.md +
      WHEEL_ROW_HEIGHT * 2 + // center of a 5-row wheel
      (WHEEL_ROW_HEIGHT - 8) / 2, // vertically center an 8px dot in the row
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  wheelRow: {
    flexDirection: "row",
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.md,
  },
  wheelFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.space.sm,
    paddingTop: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
  },
  doneButton: {
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.sm,
    minHeight: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
