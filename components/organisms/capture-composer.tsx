import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { WaveformVisualizer } from "@/components/atoms/waveform-bar";
import {
  ClassifyStageView,
  DetailsStageView,
  NoteLinkStageView,
} from "@/components/molecules/capture-stage-views";
import { DockShell } from "@/components/organisms/dock-shell";
import { entryColor, entryKicker, tokens, useTheme } from "@/constants/theme";
import type { UseCaptureReturn } from "@/hooks/use-capture";
import { horizonEndDate } from "@/lib/horizons";
import type { DbProject, DueRange, EntryType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type CaptureStage = "capture" | "classify" | "details" | "note-link";
type DatedKind = "todo" | "deadline";

const WAVEFORM_BARS = 9;

interface CaptureComposerProps {
  cap: UseCaptureReturn;
  projects: DbProject[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isDockDismissible(cap: UseCaptureReturn): boolean {
  return cap.composerOpen || cap.isRecording;
}

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

export function CaptureComposer({
  cap,
  projects,
}: CaptureComposerProps): React.ReactElement | null {
  if (!cap.composerOpen && !cap.isRecording && cap.pendingThought === null) {
    return null;
  }

  return (
    <DockShell register="slab" contentKey="capture-flow">
      <CaptureFlow cap={cap} projects={projects} />
    </DockShell>
  );
}

// ---------------------------------------------------------------------------
// CaptureFlow — stage-orchestrating viewport
// ---------------------------------------------------------------------------

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
    const heights = [captureH.value, classifyH.value, detailsH.value, noteH.value];
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

  const accentColor =
    scheme === "dark" ? entryKicker(selected, "light") : entryColor(selected);

  const projectName =
    projectId === null
      ? "unfiled"
      : (activeProjects.find((p) => p.id === projectId)?.title ?? "unfiled");

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

  const back = (): void => {
    if (stage === "details" || stage === "note-link") {
      setStage("classify");
      return;
    }
    if (stage === "classify") discard();
  };

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

          {/* ── Stage 0: Capture ─────────────────────────────────── */}
          <View
            style={[styles.stage, { width: trackWidthPx, left: 0 }]}
            onLayout={(e) => { captureH.value = e.nativeEvent.layout.height; }}
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

          {/* ── Stage 1: Classify ────────────────────────────────── */}
          <View
            style={[styles.stage, { width: trackWidthPx, left: trackWidthPx }]}
            onLayout={(e) => { classifyH.value = e.nativeEvent.layout.height; }}
            accessibilityElementsHidden={stage !== "classify"}
            importantForAccessibility={
              stage === "classify" ? "auto" : "no-hide-descendants"
            }
            pointerEvents={stage === "classify" ? "auto" : "none"}
          >
            <ClassifyStageView
              scheme={scheme}
              ink={onSlab}
              muted={muted}
              raised={raised}
              onBack={back}
              onDiscard={discard}
              onSelectType={selectType}
            />
          </View>

          {/* ── Stage 2: Details ─────────────────────────────────── */}
          <View
            style={[
              styles.stage,
              { width: trackWidthPx, left: trackWidthPx * 2, backgroundColor: panel },
            ]}
            onLayout={(e) => { detailsH.value = e.nativeEvent.layout.height; }}
            accessibilityElementsHidden={stage !== "details"}
            importantForAccessibility={
              stage === "details" ? "auto" : "no-hide-descendants"
            }
            pointerEvents={stage === "details" ? "auto" : "none"}
          >
            <DetailsStageView
              selected={selected}
              accent={accentColor}
              muted={muted}
              raised={raised}
              quiet={quiet}
              ink={onSlab}
              scheme={scheme}
              exact={exact}
              setExact={setExact}
              date={date}
              setDate={setDate}
              time={time}
              setTime={setTime}
              dueRange={dueRange}
              setDueRange={setDueRange}
              projectId={projectId}
              setProjectId={setProjectId}
              activeProjects={activeProjects}
              lockedProjectId={cap.lockedProjectId}
              projectName={projectName}
              onBack={back}
              onDiscard={discard}
              onCommit={commitDated}
            />
          </View>

          {/* ── Stage 3: Note-link ──────────────────────────────── */}
          <View
            style={[
              styles.stage,
              { width: trackWidthPx, left: trackWidthPx * 3, backgroundColor: panel },
            ]}
            onLayout={(e) => { noteH.value = e.nativeEvent.layout.height; }}
            accessibilityElementsHidden={stage !== "note-link"}
            importantForAccessibility={
              stage === "note-link" ? "auto" : "no-hide-descendants"
            }
            pointerEvents={stage === "note-link" ? "auto" : "none"}
          >
            <NoteLinkStageView
              ink={onSlab}
              muted={muted}
              raised={raised}
              quiet={quiet}
              recentIdeas={cap.recentIdeas}
              onBack={back}
              onDiscard={discard}
              onFileFree={() => {
                cap.resolveCapture({ kind: "note" });
                cap.setComposerOpen(false);
              }}
              onFileOnIdea={(entryId) => {
                cap.resolveCapture({ kind: "note-on", entryId });
                cap.setComposerOpen(false);
              }}
            />
          </View>

        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Stage 0 sub-components
// ---------------------------------------------------------------------------

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
        <MaterialCommunityIcons name="pen" size={16} color={muted} />
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
          <MaterialCommunityIcons name="arrow-right" size={20} color={slab} />
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
          <MaterialCommunityIcons name="microphone" size={20} color={muted} />
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
        <MaterialCommunityIcons name="close" size={20} color={ink} />
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
          <WaveformVisualizer barCount={WAVEFORM_BARS} color={ink} />
        )}
      </View>
      <Pressable
        onPress={() => void onStop()}
        accessibilityRole="button"
        accessibilityLabel="Continue"
        style={styles.recordingButton}
      >
        <MaterialCommunityIcons name="arrow-right" size={20} color={ink} />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles — capture-stage only (stage-view styles live in stage-views file)
// ---------------------------------------------------------------------------

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
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: tokens.space.sm,
    paddingRight: tokens.space.xs,
    gap: tokens.space.xs,
  },
  inputSignal: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
    fontFamily: tokens.type.fontInter.medium,
  },
  primaryRound: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryRound: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingStage: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.space.sm,
    gap: tokens.space.sm,
  },
  recordingButton: {
    width: 36,
    height: 36,
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
  pressed: {
    opacity: 0.62,
  },
});
