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

// ─── When? ──────────────────────────────────────────────────────────────────────
// "When" is a relative human concept for a capture-first user. Quick-pick chips
// answer the common cases in one tap; the day+time wheel below is the precise
// control — a centered selection band, day on the left, time on the right, like a
// single instrument. No keyboard, no fragile parsing.

type RelativeOption = {
  key: string;
  label: string;
  resolve: () => dayjs.Dayjs;
};

const RELATIVE_OPTIONS: RelativeOption[] = [
  { key: "today", label: "Today", resolve: () => dayjs() },
  { key: "tomorrow", label: "Tomorrow", resolve: () => dayjs().add(1, "day") },
  {
    key: "weekend",
    label: "Weekend",
    // The coming Saturday (today if already Sat).
    resolve: () => {
      const d = dayjs();
      return d.add((6 - d.day() + 7) % 7, "day");
    },
  },
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
  /** Date as stored DD/MM/YYYY (or empty). */
  date: string;
  /** Time as stored HH:mm (or empty for all-day). */
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  /** Entry-type tint — colors the selected chip + selection band. */
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
 * wheel (centered selection band) is the precise control, progressive-disclosed.
 */
export function WhenPicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  accentColor,
  dateLabel,
  initiallyOpen = false,
  showQuickOptions = true,
}: WhenPickerProps): React.ReactElement {
  const { colors } = useTheme();
  const [wheelOpen, setWheelOpen] = useState(initiallyOpen);

  const selectedDate = parseDate(date || null);

  // Which relative option (if any) the current date matches.
  const activeRelative = RELATIVE_OPTIONS.find(
    (o) => toDisplayDate(o.resolve().toDate()) === date,
  )?.key;

  function pickRelative(option: RelativeOption): void {
    onDateChange(toDisplayDate(option.resolve().toDate()));
  }

  // Wheel needs a concrete day to land on — default to today if none set yet.
  const wheelDay = date || DAY_ITEMS[0].value;
  // Default the time band to 09:00 until the user commits a time.
  const wheelTime = time || "09:00";

  function openWheel(): void {
    if (!date) onDateChange(DAY_ITEMS[0].value);
    setWheelOpen((v) => !v);
  }

  function clearTime(): void {
    onTimeChange("");
  }

  // Format the stored "HH:mm" into "h:mm A" without fragile string parsing.
  const timeLabel = time
    ? dayjs()
        .hour(Number(time.split(":")[0]))
        .minute(Number(time.split(":")[1]))
        .format("h:mm A")
    : "";
  const echoText = selectedDate
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
                { backgroundColor: selectedDate ? accentColor : "transparent" },
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
                onPress={() => pickRelative(option)}
              />
            ))}
          </ChipRail>
        </View>
      ) : null}

      {/* Day + time wheel — centered selection band, progressive disclosure */}
      {wheelOpen && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          layout={LinearTransition.springify().damping(18).stiffness(220)}
          style={styles.wheelZone}
        >
          {/* The selection band sits behind both wheels, dead-center */}
          <View
            pointerEvents="none"
            style={[
              styles.selectionBand,
              { backgroundColor: accentColor + "1A" },
            ]}
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

          {/* Footer: All day (clear time) on the left, Done (confirm) on the right */}
          <View style={styles.wheelFooter}>
            {time ? (
              <Pressable
                onPress={clearTime}
                accessibilityRole="button"
                accessibilityLabel="Clear time, all day"
                style={({ pressed }) => [
                  styles.allDay,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <ThemedText type="body" muted>
                  All day
                </ThemedText>
              </Pressable>
            ) : (
              <View style={styles.allDay} />
            )}
            <Pressable
              onPress={() => setWheelOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Confirm day and time"
              style={({ pressed }) => [
                styles.doneButton,
                { backgroundColor: accentColor },
                pressed && { opacity: 0.8 },
              ]}
            >
              <ThemedText type="bodyBold" style={{ color: colors.paper }}>
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
  // The band marks the center row both wheels snap into.
  selectionBand: {
    position: "absolute",
    left: tokens.space.lg,
    right: tokens.space.lg,
    height: WHEEL_ROW_HEIGHT,
    top: tokens.space.md + WHEEL_ROW_HEIGHT * 2, // center of a 5-row wheel
    borderRadius: tokens.radius.md,
  },
  wheelRow: {
    flexDirection: "row",
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.md,
  },
  wheelFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm,
    paddingTop: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
  },
  allDay: {
    minHeight: 40,
    justifyContent: "center",
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
