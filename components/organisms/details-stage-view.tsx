import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
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

import { OptionChip } from "@/components/atoms/option-chip";
import { ExactDateMenu } from "@/components/organisms/exact-date-menu";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import type { Scheme } from "@/constants/theme";
import { tokens } from "@/constants/theme";
import type { DueRange } from "@/lib/types";

type DatedKind = "todo" | "deadline";

type WhenOption =
  | { kind: "concrete"; label: string; icon: IconSymbolName; date: () => string }
  | { kind: "horizon"; label: string; icon: IconSymbolName; range: DueRange };

const WHEN_OPTIONS: WhenOption[] = [
  {
    kind: "concrete",
    label: "tomorrow",
    icon: "CalendarDay",
    date: () => dateStr(1),
  },
  {
    kind: "concrete",
    label: "weekend",
    icon: "Moon",
    date: () => dateStr(daysToWeekend()),
  },
  { kind: "horizon", label: "this week", icon: "Calendar", range: "week" },
  { kind: "horizon", label: "this month", icon: "Calendar2", range: "month" },
  { kind: "horizon", label: "this year", icon: "Infinite", range: "year" },
];

export interface DetailsStageViewProps {
  selected: DatedKind;
  accent: string;
  muted: string;
  raised: string;
  quiet: string;
  ink: string;
  scheme: Scheme;
  exact: boolean;
  setExact: (f: (prev: boolean) => boolean) => void;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  dueRange: DueRange | null;
  setDueRange: (v: DueRange | null) => void;
  projectId: string | null;
  setProjectId: (
    v: ((prev: string | null) => string | null) | string | null,
  ) => void;
  activeProjects: { id: string; title: string; emoji: string | null }[];
  lockedProjectId: string | null;
  projectName: string;
  onBack: () => void;
  onDiscard: () => void;
  onCommit: () => void;
}

export function DetailsStageView({
  selected,
  accent,
  muted,
  quiet,
  ink,
  exact,
  setExact,
  date,
  setDate,
  time,
  setTime,
  dueRange,
  setDueRange,
  projectId,
  setProjectId,
  activeProjects,
  lockedProjectId,
  onBack,
  onCommit,
}: DetailsStageViewProps): React.ReactElement {
  const [substage, setSubstage] = useState<"when" | "project">("when");
  const [stageWidth, setStageWidth] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerSnapshot, setPickerSnapshot] = useState<{
    exact: boolean;
    date: string;
    time: string;
    dueRange: DueRange | null;
  } | null>(null);
  const [anchorRect, setAnchorRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const stageRef = useRef<View | null>(null);
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();

  const hasProjectSubstage = !lockedProjectId && activeProjects.length > 0;

  useEffect(() => {
    setSubstage("when");
    setDatePickerOpen(false);
    setPickerSnapshot(null);
    progress.value = reduced
      ? 0
      : withTiming(0, {
          duration: tokens.motion.duration.base,
          easing: Easing.out(Easing.cubic),
        });
  }, [selected, progress, reduced]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * stageWidth }],
  }));

  const goToProject = (): void => {
    setSubstage("project");
    progress.value = reduced
      ? 1
      : withTiming(1, {
          duration: tokens.motion.duration.base,
          easing: Easing.out(Easing.cubic),
        });
  };

  const goToWhen = (): void => {
    setSubstage("when");
    progress.value = reduced
      ? 0
      : withTiming(0, {
          duration: tokens.motion.duration.base,
          easing: Easing.out(Easing.cubic),
        });
  };

  const selectWhenOption = (callback: () => void): void => {
    callback();
    if (hasProjectSubstage) {
      goToProject();
    }
  };

  const handleBack = (): void => {
    setDatePickerOpen(false);
    goToWhen();
    onBack();
  };

  const openDatePicker = (): void => {
    setPickerSnapshot({ exact, date, time, dueRange });
    setExact(() => true);
    setDueRange(null);
    Keyboard.dismiss();
    stageRef.current?.measureInWindow((x, y, w, h) => {
      setAnchorRect({ x, y, w, h });
      setDatePickerOpen(true);
    });
  };

  const handleDatePickerConfirm = (
    nextDate: string,
    nextTime: string,
  ): void => {
    setDate(nextDate);
    setTime(nextTime);
    setDatePickerOpen(false);
    setPickerSnapshot(null);
    if (hasProjectSubstage) {
      goToProject();
    }
  };

  const handleDatePickerDismiss = (): void => {
    if (pickerSnapshot) {
      setExact(() => pickerSnapshot.exact);
      setDate(pickerSnapshot.date);
      setTime(pickerSnapshot.time);
      setDueRange(pickerSnapshot.dueRange);
    }
    setDatePickerOpen(false);
    setPickerSnapshot(null);
  };

  const renderWhenOptions = (): React.ReactElement => (
    <>
      <OptionChip
        label="exact"
        icon="Target"
        selected={exact}
        ink={ink}
        muted={muted}
        raised={quiet}
        onPress={openDatePicker}
      />
      {WHEN_OPTIONS.map((option) =>
        option.kind === "concrete" ? (
          <OptionChip
            key={option.label}
            label={option.label}
            icon={option.icon}
            selected={!exact && dueRange === null && date === option.date()}
            ink={ink}
            muted={muted}
            raised={quiet}
            onPress={() =>
              selectWhenOption(() => {
                setExact(() => false);
                setDueRange(null);
                setDate(option.date());
                setTime("");
              })
            }
          />
        ) : (
          <OptionChip
            key={option.label}
            label={option.label}
            icon={option.icon}
            selected={!exact && dueRange === option.range}
            ink={ink}
            muted={muted}
            raised={quiet}
            onPress={() =>
              selectWhenOption(() => {
                setExact(() => false);
                setDueRange(option.range);
                setDate("");
                setTime("");
              })
            }
          />
        ),
      )}
    </>
  );

  const renderProjectOptions = (): React.ReactElement => (
    <>
      <OptionChip
        label="unfiled"
        icon="Folder"
        selected={projectId === null}
        ink={ink}
        muted={muted}
        raised={quiet}
        onPress={() => setProjectId(null)}
      />
      {activeProjects.map((project) => (
        <OptionChip
          key={project.id}
          label={project.title}
          emoji={project.emoji}
          selected={projectId === project.id}
          ink={ink}
          muted={muted}
          raised={quiet}
          onPress={() =>
            setProjectId((id) => (id === project.id ? null : project.id))
          }
        />
      ))}
    </>
  );

  return (
    <View
      ref={stageRef}
      style={styles.detailsStage}
      onLayout={(e) => setStageWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <View
          style={[styles.substage, { width: stageWidth }]}
          pointerEvents={substage === "when" ? "auto" : "none"}
          accessibilityElementsHidden={substage !== "when"}
          importantForAccessibility={
            substage === "when" ? "auto" : "no-hide-descendants"
          }
        >
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.headerButton}
          >
            <IconSymbol name="ChevronLeft" size={18} color={muted} />
          </Pressable>
          <ScrollView
            horizontal
            style={styles.optionScroll}
            contentContainerStyle={styles.optionRail}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderWhenOptions()}
          </ScrollView>
          {!hasProjectSubstage ? (
            <Pressable
              onPress={onCommit}
              accessibilityRole="button"
              accessibilityLabel="Save"
              style={styles.headerButton}
            >
              <IconSymbol name="Check" size={18} color={accent} />
            </Pressable>
          ) : null}
        </View>

        <View
          style={[styles.substage, { width: stageWidth }]}
          pointerEvents={substage === "project" ? "auto" : "none"}
          accessibilityElementsHidden={substage !== "project"}
          importantForAccessibility={
            substage === "project" ? "auto" : "no-hide-descendants"
          }
        >
          <Pressable
            onPress={goToWhen}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.headerButton}
          >
            <IconSymbol name="ChevronLeft" size={18} color={muted} />
          </Pressable>
          <ScrollView
            horizontal
            style={styles.optionScroll}
            contentContainerStyle={styles.optionRail}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderProjectOptions()}
          </ScrollView>
          <Pressable
            onPress={onCommit}
            accessibilityRole="button"
            accessibilityLabel="Save"
            style={styles.headerButton}
          >
            <IconSymbol name="Check" size={18} color={accent} />
          </Pressable>
        </View>
      </Animated.View>

      <ExactDateMenu
        visible={datePickerOpen}
        initialDate={date}
        initialTime={time}
        accentColor={accent}
        anchor={anchorRect}
        onDismiss={handleDatePickerDismiss}
        onConfirm={handleDatePickerConfirm}
      />
    </View>
  );
}

function dateStr(addDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function daysToWeekend(): number {
  const day = new Date().getDay();
  return (6 - day + 7) % 7;
}

const styles = StyleSheet.create({
  detailsStage: {
    overflow: "hidden",
  },
  track: {
    flexDirection: "row",
  },
  substage: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.size.dockBar,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    gap: tokens.space.xs,
  },
  headerButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  optionScroll: {
    flex: 1,
  },
  optionRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
});
