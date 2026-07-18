import { forwardRef, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ClassifyStageView } from "@/components/organisms/classify-stage-view";
import { DetailsStageView } from "@/components/organisms/details-stage-view";
import type { InputStageHandle } from "@/components/organisms/input-stage-view";
import { InputStage } from "@/components/organisms/input-stage-view";
import { NoteLinkStageView } from "@/components/organisms/note-link-stage-view";
import { RecordingStage } from "@/components/organisms/recording-stage-view";
import { entryColor, entryKicker, tokens, useTheme } from "@/constants/theme";
import type { UseCaptureReturn } from "@/hooks/use-capture";
import { horizonEndDate } from "@/lib/horizons";
import type { DbProject, DueRange, EntryType } from "@/lib/types";

type CaptureStage = "capture" | "classify" | "details" | "note-link";
type DatedKind = "todo" | "deadline";

interface CaptureFlowProps {
  cap: UseCaptureReturn;
  projects: DbProject[];
}

export const CaptureFlow = forwardRef<InputStageHandle, CaptureFlowProps>(
  function CaptureFlow({ cap, projects }, ref): React.ReactElement {
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
    stage === "capture"
      ? 0
      : stage === "classify"
        ? 1
        : stage === "details"
          ? 2
          : 3;

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
                ref={ref}
                draft={draft}
                onDraftChange={setDraft}
                onSubmit={submitDraft}
                onVoice={cap.startRecording}
                onBlur={closeEmpty}
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
            onLayout={(e) => {
              classifyH.value = e.nativeEvent.layout.height;
            }}
            accessibilityElementsHidden={stage !== "classify"}
            importantForAccessibility={
              stage === "classify" ? "auto" : "no-hide-descendants"
            }
            pointerEvents={stage === "classify" ? "auto" : "none"}
          >
            <ClassifyStageView
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
              { width: trackWidthPx, left: trackWidthPx * 2 },
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
              { width: trackWidthPx, left: trackWidthPx * 3 },
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
  },
);

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
});
