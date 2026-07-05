import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { DockShell } from "@/components/organisms/dock-shell";
import type { DockRegister } from "@/components/organisms/dock-shell";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  chipInk,
  entryColor,
  entryKicker,
  tokens,
  useTheme,
} from "@/constants/theme";
import type { Scheme } from "@/constants/theme";
import type { UseCaptureReturn } from "@/hooks/use-capture";
import { horizonEndDate, horizonLabel } from "@/lib/horizons";
import type { DbProject, DueRange, EntryType } from "@/lib/types";

const WAVEFORM_BARS = 9;

type CaptureStage = "capture" | "classify" | "details" | "note-link";
type DatedKind = "todo" | "deadline";

type WhenOption =
  | { kind: "concrete"; label: string; date: () => string }
  | { kind: "horizon"; label: string; range: DueRange };

const WHEN_OPTIONS: WhenOption[] = [
  { kind: "concrete", label: "a day", date: () => dateStr(0) },
  { kind: "concrete", label: "weekend", date: () => dateStr(daysToWeekend()) },
  { kind: "horizon", label: "this week", range: "week" },
  { kind: "horizon", label: "this month", range: "month" },
  { kind: "horizon", label: "this year", range: "year" },
];

interface CaptureComposerProps {
  /**
   * The capture state-machine driving the dock. Both screens create their own
   * via `useCapture()` (home neutral, project pre-locked) and hand the whole
   * instance here. The composer reads its surfaces off it and never owns state.
   */
  cap: UseCaptureReturn;
  /** Active projects offered in the details stage. */
  projects: DbProject[];
}

/**
 * Is a dismissible dock surface up? The dock is summoned, so an outside tap
 * should put it away. A pending thought is deliberately excluded: it has already
 * been caught, so only explicit filing or discard should clear it.
 */
export function isDockDismissible(cap: UseCaptureReturn): boolean {
  return cap.composerOpen || cap.isRecording;
}

/**
 * The outside-tap backdrop: a transparent full-screen catcher that only exists
 * while a dismissible dock surface is up. Tapping off the dock puts it away.
 */
export function CaptureBackdrop({
  cap,
}: {
  cap: UseCaptureReturn;
}): React.ReactElement | null {
  if (!isDockDismissible(cap)) return null;

  const dismiss = (): void => {
    if (cap.isRecording) void cap.cancelRecording();
    cap.setComposerOpen(false);
  };

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={dismiss}
      accessibilityLabel="Dismiss capture"
    />
  );
}

/**
 * One staged capture instrument. The visual surface is intentionally new: the
 * dock keeps one child mounted and slides through
 * capture -> classify -> details. The captured text is not echoed after submit;
 * this is a speed path, so the UI asks only where the thought goes and which
 * metadata that destination needs.
 */
export function CaptureComposer({
  cap,
  projects,
}: CaptureComposerProps): React.ReactElement | null {
  if (!cap.composerOpen && !cap.isRecording && cap.pendingThought === null) {
    return null;
  }

  const register: DockRegister = "slab";

  return (
    <DockShell register={register} contentKey="capture-flow">
      <CaptureFlow cap={cap} projects={projects} />
    </DockShell>
  );
}

function CaptureFlow({
  cap,
  projects,
}: CaptureComposerProps): React.ReactElement {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [stage, setStage] = useState<CaptureStage>("capture");
  const [selected, setSelected] = useState<DatedKind>("todo");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dueRange, setDueRange] = useState<DueRange | null>(null);
  const [projectId, setProjectId] = useState<string | null>(
    cap.lockedProjectId,
  );
  const [exact, setExact] = useState(false);
  const [trackWidthPx, setTrackWidthPx] = useState(0);

  const progress = useSharedValue(0);
  const trackWidth = useSharedValue(0);
  const captureH = useSharedValue(0);
  const classifyH = useSharedValue(0);
  const detailsH = useSharedValue(0);
  const noteH = useSharedValue(0);

  const activeProjects = projects.filter((p) => p.status === "active");
  const hasText = draft.trim().length > 0;
  const onSlab = colors.accent.onClay;
  const muted = `${onSlab}A6`;
  const quiet = `${onSlab}24`;
  const raised = `${onSlab}1F`;
  const panel = colors.accent.clayPressed;

  useEffect(() => {
    if (cap.pendingThought === null) {
      setStage("capture");
      setSelected("todo");
      setDate("");
      setTime("");
      setDueRange(null);
      setProjectId(cap.lockedProjectId);
      setExact(false);
      return;
    }

    if (cap.seedType === "todo" || cap.seedType === "deadline") {
      setSelected(cap.seedType);
      setStage("details");
      return;
    }

    setStage("classify");
  }, [cap.pendingThought, cap.seedType, cap.lockedProjectId]);

  const stageIndex =
    stage === "capture" ? 0 : stage === "classify" ? 1 : stage === "details" ? 2 : 3;

  useEffect(() => {
    progress.value = reduced
      ? stageIndex
      : withTiming(stageIndex, {
          duration: tokens.motion.duration.base,
          easing: Easing.out(Easing.cubic),
        });
  }, [stageIndex, reduced, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -progress.value * trackWidth.value }],
  }));

  const viewportStyle = useAnimatedStyle(() => {
    const heights = [
      captureH.value,
      classifyH.value,
      detailsH.value,
      noteH.value,
    ];
    const from = Math.floor(progress.value);
    const to = Math.min(from + 1, heights.length - 1);
    const localProgress = progress.value - from;
    const fromH = heights[from] || heights[stageIndex] || 0;
    const toH = heights[to] || fromH;
    const h = fromH + (toH - fromH) * localProgress;
    return h ? { height: h } : {};
  });

  const layout = reduced
    ? undefined
    : LinearTransition.duration(tokens.motion.duration.fast).easing(
        Easing.out(Easing.quad),
      );

  const submitDraft = (): void => {
    if (!hasText) return;
    cap.capture(draft.trim());
    setDraft("");
  };

  const closeEmpty = (): void => {
    if (!hasText) cap.setComposerOpen(false);
  };

  const discard = (): void => {
    cap.dismissPending();
    cap.setComposerOpen(false);
  };

  const selectType = (type: EntryType | "note"): void => {
    if (type === "idea") {
      cap.resolveCapture({ kind: "idea" });
      cap.setComposerOpen(false);
      return;
    }
    if (type === "note") {
      if (cap.recentIdeas.length > 0) {
        setStage("note-link");
        return;
      }
      cap.resolveCapture({ kind: "note" });
      cap.setComposerOpen(false);
      return;
    }

    setSelected(type);
    setStage("details");
  };

  const commitDated = (): void => {
    if (selected === "deadline") {
      cap.resolveCapture({
        kind: "deadline",
        dueDate: dueRange ? horizonEndDate(dueRange) : date.trim() || undefined,
        dueTime: dueRange ? undefined : time.trim() || undefined,
        dueRange: dueRange ?? undefined,
        projectId: projectId ?? undefined,
      });
    } else {
      cap.resolveCapture({
        kind: "todo",
        scheduledDate: dueRange
          ? horizonEndDate(dueRange)
          : date.trim() || undefined,
        scheduledTime: dueRange ? undefined : time.trim() || undefined,
        projectId: projectId ?? undefined,
      });
    }
    cap.setComposerOpen(false);
  };

  const fileFreeNote = (): void => {
    cap.resolveCapture({ kind: "note" });
    cap.setComposerOpen(false);
  };

  const fileNoteOn = (entryId: string): void => {
    cap.resolveCapture({ kind: "note-on", entryId });
    cap.setComposerOpen(false);
  };

  const back = (): void => {
    if (stage === "details" || stage === "note-link") {
      setStage("classify");
      return;
    }
    if (stage === "classify") discard();
  };

  const accent = typedTextColor(selected, scheme);
  const projectName =
    projectId === null
      ? "unfiled"
      : (activeProjects.find((p) => p.id === projectId)?.title ?? "unfiled");

  return (
    <Animated.View
      layout={layout}
      style={styles.root}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        trackWidth.value = w;
        setTrackWidthPx(w);
      }}
    >
      <Animated.View style={[styles.viewport, viewportStyle]}>
        <Animated.View style={[styles.track, trackStyle]}>
          <View
            style={[styles.stage, { width: trackWidthPx, left: 0 }]}
            onLayout={(e) => {
              captureH.value = e.nativeEvent.layout.height;
            }}
            accessibilityElementsHidden={stage !== "capture"}
            importantForAccessibility={
              stage === "capture" ? "auto" : "no-hide-descendants"
            }
            pointerEvents={stage === "capture" ? "auto" : "none"}
          >
            {cap.isRecording ? (
              <RecordingStage
                transcript={cap.transcript}
                onCancel={cap.cancelRecording}
                onStop={cap.stopRecording}
                ink={onSlab}
              />
            ) : (
              <InputStage
                draft={draft}
                onDraftChange={setDraft}
                onSubmit={submitDraft}
                onVoice={cap.startRecording}
                onBlur={closeEmpty}
                autoFocus={cap.composerOpen}
                ink={onSlab}
                muted={muted}
                slab={colors.accent.clay}
                hasText={hasText}
              />
            )}
          </View>

          <View
            style={[
              styles.stage,
              styles.classifyStage,
              { width: trackWidthPx, left: trackWidthPx },
            ]}
            onLayout={(e) => {
              classifyH.value = e.nativeEvent.layout.height;
            }}
            accessibilityElementsHidden={stage !== "classify"}
            importantForAccessibility={
              stage === "classify" ? "auto" : "no-hide-descendants"
            }
            pointerEvents={stage === "classify" ? "auto" : "none"}
          >
            <StageHeader
              label="File it as"
              onBack={back}
              onDiscard={discard}
              ink={onSlab}
              muted={muted}
            />
            <View style={styles.typeGrid}>
              <TypeLane
                type="idea"
                label="Idea"
                caption="keep it alive"
                scheme={scheme}
                muted={muted}
                raised={raised}
                onPress={() => selectType("idea")}
              />
              <TypeLane
                type="todo"
                label="Todo"
                caption="make it actionable"
                scheme={scheme}
                muted={muted}
                raised={raised}
                onPress={() => selectType("todo")}
              />
              <TypeLane
                type="deadline"
                label="Deadline"
                caption="give it a horizon"
                scheme={scheme}
                muted={muted}
                raised={raised}
                onPress={() => selectType("deadline")}
              />
              <NoteLane
                ink={onSlab}
                muted={muted}
                raised={raised}
                onPress={() => selectType("note")}
              />
            </View>
          </View>

          <View
            style={[
              styles.stage,
              styles.detailStage,
              {
                width: trackWidthPx,
                left: trackWidthPx * 2,
                backgroundColor: panel,
              },
            ]}
            onLayout={(e) => {
              detailsH.value = e.nativeEvent.layout.height;
            }}
            accessibilityElementsHidden={stage !== "details"}
            importantForAccessibility={
              stage === "details" ? "auto" : "no-hide-descendants"
            }
            pointerEvents={stage === "details" ? "auto" : "none"}
          >
            <StageHeader
              label={selected === "deadline" ? "Deadline" : "Todo"}
              onBack={back}
              onDiscard={discard}
              onCommit={commitDated}
              ink={onSlab}
              muted={muted}
              accent={accent}
            />
            <View style={styles.detailStack}>
              <OptionRow label="WHEN" muted={muted}>
                {WHEN_OPTIONS.map((option) =>
                  option.kind === "concrete" ? (
                    <OptionChip
                      key={option.label}
                      label={option.label}
                      selected={
                        !exact &&
                        dueRange === null &&
                        date === option.date()
                      }
                      color={accent}
                      muted={muted}
                      raised={quiet}
                      onPress={() => {
                        setExact(false);
                        setDueRange(null);
                        setDate(option.date());
                        setTime("");
                      }}
                    />
                  ) : (
                    <OptionChip
                      key={option.label}
                      label={option.label}
                      selected={!exact && dueRange === option.range}
                      color={accent}
                      muted={muted}
                      raised={quiet}
                      onPress={() => {
                        setExact(false);
                        setDueRange(option.range);
                        setDate("");
                        setTime("");
                      }}
                    />
                  ),
                )}
                <OptionChip
                  label="exact"
                  selected={exact}
                  color={accent}
                  muted={muted}
                  raised={quiet}
                  onPress={() => {
                    setExact((value) => !value);
                    setDueRange(null);
                  }}
                />
              </OptionRow>

              {exact ? (
                <ExactInline
                  date={date}
                  time={time}
                  color={accent}
                  muted={muted}
                  raised={quiet}
                  onDateChange={setDate}
                  onTimeChange={setTime}
                />
              ) : dueRange ? (
                <ThemedText type="micro" style={{ color: muted }}>
                  {selected === "deadline" ? "Close it" : "Land it"}{" "}
                  {horizonLabel(dueRange)} · {horizonEndDate(dueRange)}
                </ThemedText>
              ) : null}

              {!cap.lockedProjectId && activeProjects.length > 0 ? (
                <OptionRow label="PROJECT" muted={muted}>
                  <OptionChip
                    label="unfiled"
                    selected={projectId === null}
                    color={accent}
                    muted={muted}
                    raised={quiet}
                    onPress={() => setProjectId(null)}
                  />
                  {activeProjects.map((project) => (
                    <OptionChip
                      key={project.id}
                      label={project.title}
                      selected={projectId === project.id}
                      color={accent}
                      muted={muted}
                      raised={quiet}
                      onPress={() =>
                        setProjectId((id) =>
                          id === project.id ? null : project.id,
                        )
                      }
                    />
                  ))}
                </OptionRow>
              ) : null}

              <View style={styles.commitReadout}>
                <View
                  style={[
                    styles.commitDot,
                    { backgroundColor: entryColor(selected) },
                  ]}
                />
                <ThemedText type="mono" style={{ color: muted }}>
                  {projectName}
                </ThemedText>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.stage,
              styles.detailStage,
              {
                width: trackWidthPx,
                left: trackWidthPx * 3,
                backgroundColor: panel,
              },
            ]}
            onLayout={(e) => {
              noteH.value = e.nativeEvent.layout.height;
            }}
            accessibilityElementsHidden={stage !== "note-link"}
            importantForAccessibility={
              stage === "note-link" ? "auto" : "no-hide-descendants"
            }
            pointerEvents={stage === "note-link" ? "auto" : "none"}
          >
            <StageHeader
              label="Note"
              onBack={back}
              onDiscard={discard}
              ink={onSlab}
              muted={muted}
            />
            <View style={styles.noteChoices}>
              <Pressable
                onPress={fileFreeNote}
                accessibilityRole="button"
                accessibilityLabel="File as free note"
                style={({ pressed }) => [
                  styles.freeNote,
                  { backgroundColor: raised },
                  pressed && styles.pressed,
                ]}
              >
                <IconSymbol name="note-text-outline" size={18} color={onSlab} />
                <ThemedText type="bodyBold" style={{ color: onSlab }}>
                  Free note
                </ThemedText>
              </Pressable>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.ideaRail}
              >
                {cap.recentIdeas.map((idea) => (
                  <Pressable
                    key={idea.id}
                    onPress={() => fileNoteOn(idea.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Note on idea: ${idea.title}`}
                    style={({ pressed }) => [
                      styles.ideaChip,
                      { backgroundColor: quiet },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.ideaDot,
                        { backgroundColor: entryColor("idea") },
                      ]}
                    />
                    <ThemedText
                      type="body"
                      numberOfLines={1}
                      style={[styles.ideaLabel, { color: onSlab }]}
                    >
                      {idea.title}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

function InputStage({
  draft,
  onDraftChange,
  onSubmit,
  onVoice,
  onBlur,
  autoFocus,
  ink,
  muted,
  slab,
  hasText,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onVoice: () => void;
  onBlur: () => void;
  autoFocus: boolean;
  ink: string;
  muted: string;
  slab: string;
  hasText: boolean;
}): React.ReactElement {
  return (
    <View style={styles.inputStage}>
      <View style={styles.inputSignal}>
        <MaterialCommunityIcons name="pen" size={18} color={muted} />
      </View>
      <TextInput
        value={draft}
        onChangeText={onDraftChange}
        onSubmitEditing={onSubmit}
        onBlur={onBlur}
        autoFocus={autoFocus}
        placeholder="Put something in"
        placeholderTextColor={muted}
        selectionColor={ink}
        returnKeyType="done"
        submitBehavior="submit"
        accessibilityLabel="Put something in"
        style={[styles.input, { color: ink }]}
      />
      {hasText ? (
        <Pressable
          onPress={onSubmit}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          style={({ pressed }) => [
            styles.primaryRound,
            { backgroundColor: ink },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons name="arrow-right" size={22} color={slab} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onVoice}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Capture by voice"
          style={({ pressed }) => [
            styles.secondaryRound,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons name="microphone" size={22} color={muted} />
        </Pressable>
      )}
    </View>
  );
}

function RecordingStage({
  transcript,
  onCancel,
  onStop,
  ink,
}: {
  transcript: string;
  onCancel: () => Promise<void>;
  onStop: () => Promise<void>;
  ink: string;
}): React.ReactElement {
  return (
    <View style={styles.recordingStage}>
      <Pressable
        onPress={() => void onCancel()}
        accessibilityRole="button"
        accessibilityLabel="Discard recording"
        style={styles.recordingButton}
      >
        <MaterialCommunityIcons name="close" size={22} color={ink} />
      </Pressable>
      <View style={styles.recordingCenter}>
        {transcript ? (
          <ThemedText
            type="item"
            numberOfLines={1}
            style={[styles.transcript, { color: ink }]}
          >
            {transcript}
          </ThemedText>
        ) : (
          <Waveform tint={ink} />
        )}
      </View>
      <Pressable
        onPress={() => void onStop()}
        accessibilityRole="button"
        accessibilityLabel="Continue"
        style={styles.recordingButton}
      >
        <MaterialCommunityIcons name="arrow-right" size={23} color={ink} />
      </Pressable>
    </View>
  );
}

function StageHeader({
  label,
  onBack,
  onDiscard,
  onCommit,
  ink,
  muted,
  accent,
}: {
  label: string;
  onBack: () => void;
  onDiscard: () => void;
  onCommit?: () => void;
  ink: string;
  muted: string;
  accent?: string;
}): React.ReactElement {
  return (
    <View style={styles.stageHeader}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.headerButton}
      >
        <IconSymbol name="chevron-left" size={22} color={muted} />
      </Pressable>
      <ThemedText type="label" style={[styles.stageLabel, { color: muted }]}>
        {label}
      </ThemedText>
      {onCommit ? (
        <Pressable
          onPress={onCommit}
          accessibilityRole="button"
          accessibilityLabel="Save"
          style={styles.headerButton}
        >
          <IconSymbol name="check" size={22} color={accent ?? ink} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onDiscard}
          accessibilityRole="button"
          accessibilityLabel="Discard"
          style={styles.headerButton}
        >
          <IconSymbol name="close" size={18} color={muted} />
        </Pressable>
      )}
    </View>
  );
}

function TypeLane({
  type,
  label,
  caption,
  scheme,
  muted,
  raised,
  onPress,
}: {
  type: EntryType;
  label: string;
  caption: string;
  scheme: Scheme;
  muted: string;
  raised: string;
  onPress: () => void;
}): React.ReactElement {
  const color = entryColor(type);
  const kicker = typedTextColor(type, scheme);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`File as ${label}`}
      style={({ pressed }) => [
        styles.typeLane,
        { backgroundColor: raised },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.typeBar, { backgroundColor: color }]} />
      <View style={styles.typeCopy}>
        <ThemedText type="bodyBold" style={{ color: kicker }}>
          {label}
        </ThemedText>
        <ThemedText type="caption" numberOfLines={1} style={{ color: muted }}>
          {caption}
        </ThemedText>
      </View>
      <MaterialCommunityIcons name={typeIcon(type)} size={20} color={color} />
    </Pressable>
  );
}

function NoteLane({
  ink,
  muted,
  raised,
  onPress,
}: {
  ink: string;
  muted: string;
  raised: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="File as note"
      style={({ pressed }) => [
        styles.typeLane,
        { backgroundColor: raised },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.typeBar, { backgroundColor: muted }]} />
      <View style={styles.typeCopy}>
        <ThemedText type="bodyBold" style={{ color: ink }}>
          Note
        </ThemedText>
        <ThemedText type="caption" numberOfLines={1} style={{ color: muted }}>
          diary trace
        </ThemedText>
      </View>
      <MaterialCommunityIcons name="note-text-outline" size={20} color={muted} />
    </Pressable>
  );
}

function OptionRow({
  label,
  muted,
  children,
}: {
  label: string;
  muted: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={styles.optionRow}>
      <ThemedText type="micro" style={[styles.optionLabel, { color: muted }]}>
        {label}
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.optionRail}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function OptionChip({
  label,
  selected,
  color,
  muted,
  raised,
  onPress,
}: {
  label: string;
  selected: boolean;
  color: string;
  muted: string;
  raised: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.optionChip,
        { backgroundColor: selected ? color : raised },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="mono"
        numberOfLines={1}
        style={{ color: selected ? chipInk() : muted }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ExactInline({
  date,
  time,
  color,
  muted,
  raised,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  color: string;
  muted: string;
  raised: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}): React.ReactElement {
  return (
    <View style={styles.exactInline}>
      <TextInput
        value={date}
        onChangeText={onDateChange}
        placeholder="DD/MM/YYYY"
        placeholderTextColor={muted}
        selectionColor={color}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel="Exact date"
        style={[styles.exactInput, { color, backgroundColor: raised }]}
      />
      <TextInput
        value={time}
        onChangeText={onTimeChange}
        placeholder="HH:MM"
        placeholderTextColor={muted}
        selectionColor={color}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel="Exact time"
        style={[styles.exactInput, styles.timeInput, { color, backgroundColor: raised }]}
      />
    </View>
  );
}

function Waveform({ tint }: { tint: string }): React.ReactElement {
  return (
    <View style={styles.waveform}>
      {Array.from({ length: WAVEFORM_BARS }).map((_, index) => (
        <WaveformBar key={index} index={index} tint={tint} />
      ))}
    </View>
  );
}

function WaveformBar({
  index,
  tint,
}: {
  index: number;
  tint: string;
}): React.ReactElement {
  const h = useSharedValue(6);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      h.value = 14;
      return;
    }
    const a = 10 + (index % 4) * 4;
    const b = 6 + (index % 3) * 3;
    h.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 300 + a * 12 }),
        withTiming(b, { duration: 220 + b * 10 }),
        withTiming(16, { duration: 260 }),
        withTiming(6, { duration: 200 }),
      ),
      -1,
      false,
    );
  }, [h, index, reduced]);

  const style = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <Animated.View
      style={[styles.waveformBar, { backgroundColor: tint }, style]}
    />
  );
}

function typedTextColor(type: EntryType, scheme: Scheme): string {
  return scheme === "dark" ? entryKicker(type, "light") : entryColor(type);
}

function typeIcon(type: EntryType): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (type) {
    case "deadline":
      return "calendar-clock";
    case "idea":
      return "lightbulb-on-outline";
    case "todo":
      return "checkbox-marked-circle-outline";
  }
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
  root: {
    overflow: "hidden",
  },
  viewport: {
    overflow: "hidden",
  },
  track: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stage: {
    position: "absolute",
    top: 0,
  },
  inputStage: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: tokens.space.md,
    paddingRight: tokens.space.sm,
    gap: tokens.space.sm,
  },
  inputSignal: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: tokens.type.item.size,
    lineHeight: tokens.type.item.lineHeight,
    fontFamily: tokens.type.fontInter.medium,
  },
  primaryRound: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryRound: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingStage: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.space.md,
    gap: tokens.space.md,
  },
  recordingButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  transcript: {
    alignSelf: "stretch",
    textAlign: "center",
  },
  classifyStage: {
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.sm,
    paddingBottom: tokens.space.md,
    gap: tokens.space.sm,
  },
  detailStage: {
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.sm,
    paddingBottom: tokens.space.md,
    gap: tokens.space.sm,
  },
  stageHeader: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  stageLabel: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  typeLane: {
    width: "48.7%",
    minHeight: 76,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: tokens.space.sm,
  },
  typeBar: {
    width: 4,
    alignSelf: "stretch",
  },
  typeCopy: {
    flex: 1,
    paddingLeft: tokens.space.md,
    paddingRight: tokens.space.xs,
    gap: 2,
  },
  detailStack: {
    gap: tokens.space.sm,
  },
  optionRow: {
    gap: tokens.space.xs,
  },
  optionLabel: {
    paddingLeft: tokens.space.xs,
  },
  optionRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingRight: tokens.space.md,
  },
  optionChip: {
    minHeight: 38,
    maxWidth: 180,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.md,
    alignItems: "center",
    justifyContent: "center",
  },
  exactInline: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  exactInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.md,
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.mono.size,
    lineHeight: tokens.type.mono.lineHeight,
  },
  timeInput: {
    flex: 0.56,
  },
  commitReadout: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingLeft: tokens.space.xs,
  },
  commitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  noteChoices: {
    gap: tokens.space.sm,
  },
  freeNote: {
    minHeight: 48,
    borderRadius: tokens.radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
  },
  ideaRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingRight: tokens.space.md,
  },
  ideaChip: {
    minHeight: 46,
    maxWidth: 220,
    borderRadius: tokens.radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
  },
  ideaDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  ideaLabel: {
    maxWidth: 170,
  },
  pressed: {
    opacity: 0.62,
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    gap: 4,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
});
