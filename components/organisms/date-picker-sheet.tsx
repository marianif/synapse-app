import { useEffect, useRef, useState } from "react";
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

export interface DatePickerSheetProps {
  visible: boolean;
  initialDate?: string;
  initialTime?: string;
  onDismiss: () => void;
  onConfirm: (date: string, time: string) => void;
}

type Step = "date" | "time";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

const WHEEL_WIDTH = 64;
const ITEM_HEIGHT = 40;
const WHEEL_HEIGHT = ITEM_HEIGHT * 3;

function parseDate(str: string): Date | null {
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  if (
    isNaN(date.getTime()) ||
    date.getDate() !== dd ||
    date.getMonth() !== mm - 1
  ) {
    return null;
  }
  return date;
}

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateChip(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const day = date.getDate();
  const month = MONTHS[date.getMonth()].slice(0, 3);
  return `${weekday} ${day} ${month}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCalendarDays(viewDate: Date): Date[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const startDate = new Date(year, month, 1 - startDayOfWeek);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000));
  }
  return days;
}

function parseTime(str: string): [string, string] {
  const parts = str.split(":");
  if (parts.length === 2) {
    const h = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const hh = Number(h);
    const mm = Number(m);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return [h, m];
    }
  }
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(Math.round(now.getMinutes() / 5) * 5).padStart(2, "0");
  return [hours, minutes];
}

function VerticalWheel({
  values,
  initialValue,
  onValueChange,
  itemHeight,
  wheelHeight,
  wheelWidth,
}: {
  values: string[];
  initialValue: string;
  onValueChange: (value: string) => void;
  itemHeight: number;
  wheelHeight: number;
  wheelWidth: number;
}): React.ReactElement {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, values.indexOf(initialValue)),
  );
  const centerOffset = Math.max(0, (wheelHeight - itemHeight) / 2);

  useEffect(() => {
    const index = Math.max(0, values.indexOf(initialValue));
    setActiveIndex(index);
    const frame = requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        y: index * itemHeight,
        animated: false,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialValue, itemHeight, values]);

  const updateIndex = (offsetY: number): void => {
    const index = Math.round(offsetY / itemHeight);
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    setActiveIndex(clamped);
  };

  const snapToIndex = (index: number): void => {
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    setActiveIndex(clamped);
    onValueChange(values[clamped]);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: clamped * itemHeight,
        animated: true,
      });
    }
  };

  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    updateIndex(event.nativeEvent.contentOffset.y);
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    const index = Math.round(event.nativeEvent.contentOffset.y / itemHeight);
    snapToIndex(index);
  };

  const handleScrollEndDrag = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ): void => {
    if (event.nativeEvent.velocity && event.nativeEvent.velocity.y !== 0) {
      return;
    }
    const index = Math.round(event.nativeEvent.contentOffset.y / itemHeight);
    snapToIndex(index);
  };

  const itemStyle = (
    index: number,
  ): { color: string; opacity: number; scale: number } => {
    const distance = Math.abs(index - activeIndex);
    if (distance === 0) return { color: colors.ink, opacity: 1, scale: 1 };
    if (distance === 1)
      return { color: colors.inkMuted, opacity: 0.4, scale: 0.82 };
    return { color: colors.inkMuted, opacity: 0.18, scale: 0.7 };
  };

  return (
    <View
      style={[
        styles.wheelContainer,
        { width: wheelWidth, height: wheelHeight },
      ]}
    >
      <View
        style={[
          styles.selectionBar,
          {
            top: centerOffset,
            height: itemHeight,
            width: wheelWidth,
            backgroundColor: colors.glow.faint,
          },
        ]}
      />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={itemHeight}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        contentContainerStyle={{ paddingVertical: centerOffset }}
      >
        {values.map((value, index) => {
          const style = itemStyle(index);
          return (
            <Pressable
              key={value}
              onPress={() => snapToIndex(index)}
              style={[
                styles.wheelItem,
                { height: itemHeight, width: wheelWidth },
              ]}
              accessibilityRole="button"
              accessibilityLabel={value}
              accessibilityState={{ selected: index === activeIndex }}
            >
              <ThemedText
                type="title"
                style={{
                  color: style.color,
                  opacity: style.opacity,
                  transform: [{ scale: style.scale }],
                }}
              >
                {value}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function DatePickerSheet({
  visible,
  initialDate = "",
  initialTime = "",
  onDismiss,
  onConfirm,
}: DatePickerSheetProps): React.ReactElement {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState<Step>("date");
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [initialHour, setInitialHour] = useState("00");
  const [initialMinute, setInitialMinute] = useState("00");
  const [selectedHour, setSelectedHour] = useState("00");
  const [selectedMinute, setSelectedMinute] = useState("00");

  const stepProgress = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    const base = parseDate(initialDate) || new Date();
    const [hour, minute] = parseTime(initialTime);
    setStep("date");
    stepProgress.value = 0;
    setViewDate(base);
    setSelectedDate(base);
    setInitialHour(hour);
    setInitialMinute(minute);
    setSelectedHour(hour);
    setSelectedMinute(minute);
  }, [visible, initialDate, initialTime, stepProgress]);

  const calendarDays = getCalendarDays(viewDate);
  const today = new Date();

  const goToPrevMonth = (): void => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = (): void => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const goToStep = (next: Step): void => {
    setStep(next);
    const target = next === "time" ? 1 : 0;
    stepProgress.value = reducedMotion
      ? target
      : withTiming(target, {
          duration: tokens.motion.duration.base,
          easing: Easing.bezier(...tokens.motion.bezier),
        });
  };

  const handleConfirm = (): void => {
    onConfirm(formatDate(selectedDate), `${selectedHour}:${selectedMinute}`);
  };

  const handleDayPress = (day: Date): void => {
    setSelectedDate(day);
    if (day.getMonth() !== viewDate.getMonth()) {
      setViewDate(new Date(day.getFullYear(), day.getMonth(), 1));
    }
    goToStep("time");
  };

  const dateStepStyle = useAnimatedStyle(() => ({
    opacity: 1 - stepProgress.value,
    transform: [{ translateX: -stepProgress.value * 24 }],
    display: stepProgress.value >= 1 ? "none" : "flex",
  }));

  const timeStepStyle = useAnimatedStyle(() => ({
    opacity: stepProgress.value,
    transform: [{ translateX: (1 - stepProgress.value) * 24 }],
    display: stepProgress.value <= 0 ? "none" : "flex",
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.inkMuted }]} />

          <View style={styles.stepStage}>
            <Animated.View style={dateStepStyle}>
              <View style={styles.header}>
                <Pressable
                  onPress={goToPrevMonth}
                  style={styles.navButton}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                >
                  <IconSymbol
                    name="ChevronLeft"
                    size={16}
                    color={colors.inkMuted}
                  />
                </Pressable>

                <ThemedText type="label" style={{ color: colors.inkMuted }}>
                  {MONTHS[viewDate.getMonth()].slice(0, 3)}{" "}
                  {viewDate.getFullYear()}
                </ThemedText>

                <Pressable
                  onPress={goToNextMonth}
                  style={styles.navButton}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                >
                  <IconSymbol
                    name="ChevronRight"
                    size={16}
                    color={colors.inkMuted}
                  />
                </Pressable>
              </View>

              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((day, index) => (
                  <View key={`${day}-${index}`} style={styles.daySlot}>
                    <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                      {day}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <View style={styles.grid}>
                {[0, 7, 14, 21, 28, 35].map((weekStart) => (
                  <View key={weekStart} style={styles.weekRow}>
                    {calendarDays.slice(weekStart, weekStart + 7).map((day) => {
                      const selected = isSameDay(day, selectedDate);
                      const isToday = isSameDay(day, today);
                      const inMonth = day.getMonth() === viewDate.getMonth();
                      return (
                        <Pressable
                          key={day.getTime()}
                          onPress={() => handleDayPress(day)}
                          hitSlop={{ top: 4, bottom: 4 }}
                          style={({ pressed }) => [
                            styles.daySlot,
                            {
                              backgroundColor: selected
                                ? colors.accent.clay
                                : isToday
                                  ? colors.glow.faint
                                  : "transparent",
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={day.toDateString()}
                          accessibilityState={{ selected }}
                        >
                          <ThemedText
                            type="mono"
                            style={{
                              color: selected
                                ? colors.accent.onClay
                                : isToday
                                  ? colors.ink
                                  : colors.inkMuted,
                              opacity: inMonth ? 1 : 0.5,
                            }}
                          >
                            {day.getDate()}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </Animated.View>
            <Animated.View style={[styles.timeStepOverlay, timeStepStyle]}>
              <View style={styles.timeHeader}>
                <Pressable
                  onPress={() => goToStep("date")}
                  style={styles.backChip}
                  accessibilityRole="button"
                  accessibilityLabel="Change date"
                  hitSlop={8}
                >
                  <IconSymbol
                    name="ChevronLeft"
                    size={14}
                    color={colors.inkMuted}
                  />
                  <ThemedText type="label" style={{ color: colors.inkMuted }}>
                    {formatDateChip(selectedDate)}
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.wheelRow}>
                <VerticalWheel
                  values={HOURS}
                  initialValue={initialHour}
                  onValueChange={setSelectedHour}
                  itemHeight={ITEM_HEIGHT}
                  wheelHeight={WHEEL_HEIGHT}
                  wheelWidth={WHEEL_WIDTH}
                />
                <ThemedText type="title" muted style={styles.wheelColon}>
                  :
                </ThemedText>
                <VerticalWheel
                  values={MINUTES}
                  initialValue={initialMinute}
                  onValueChange={setSelectedMinute}
                  itemHeight={ITEM_HEIGHT}
                  wheelHeight={WHEEL_HEIGHT}
                  wheelWidth={WHEEL_WIDTH}
                />
              </View>
            </Animated.View>
          </View>

          {step === "time" && (
            <View style={styles.footer}>
              <Pressable
                onPress={handleConfirm}
                style={({ pressed }) => [
                  styles.doneButton,
                  styles.fullWidthButton,
                  { backgroundColor: colors.accent.clay },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Confirm date and time"
              >
                <ThemedText
                  type="label"
                  style={{ color: colors.accent.onClay }}
                >
                  Done
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.color.scrim.strong,
  },
  sheet: {
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingBottom: tokens.space.xl,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.lg,
    marginBottom: tokens.space.xs,
  },
  navButton: {
    width: 44,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: tokens.space.lg,
    marginBottom: tokens.space.xs,
  },
  grid: {
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.xs,
  },
  weekRow: {
    flexDirection: "row",
    gap: tokens.space.xs,
  },
  daySlot: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.sm,
  },
  stepStage: {
    position: "relative",
    overflow: "hidden",
    height: 232,
  },
  timeStepOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  timeHeader: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: tokens.space.sm,
    marginBottom: tokens.space.md,
  },
  backChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.pill,
  },
  wheelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.sm,
    paddingBottom: tokens.space.lg,
  },
  wheelColon: {
    marginBottom: tokens.space.xs,
  },
  wheelContainer: {
    justifyContent: "center",
  },
  selectionBar: {
    position: "absolute",
    left: 0,
    borderRadius: tokens.radius.sm,
  },
  wheelItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
  },
  doneButton: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidthButton: {
    width: "100%",
  },
  pressed: {
    opacity: 0.75,
  },
});
