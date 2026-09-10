import { useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { CaptureConsole } from "@/components/organisms/capture-console";
import {
  MOCK_PROJECTS,
  useScriptedCapture,
} from "@/components/organisms/onboarding-scripted";
import { ProjectEmptyFabPointer } from "@/components/organisms/project-empty-sketch";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { tokens, type ThemeColors } from "@/constants/theme";

import type { OnboardingStage } from "@/components/organisms/onboarding-scenes";
import type { EntryType } from "@/lib/types";
import type { AnimatedStyle, SharedValue } from "react-native-reanimated";

/**
 * The staged React Native half of each chapter. Where a real Field Lab product
 * surface exists (the capture console, the project FAB and its pointers), the
 * showcase drives the REAL component; the rest is built from the same atoms and
 * tokens. Entrances run on the chapter's shared progress (timing on the brand
 * bezier, never a spring).
 */

export type StageProps = {
  width: number;
  height: number;
  progress: SharedValue<number>;
  colors: ThemeColors;
  active: boolean;
};

/** Staggered entrance derived from the chapter progress. */
export function useEnterStyle(
  progress: SharedValue<number>,
  start: number,
  end: number,
  rise = 10,
): AnimatedStyle<ViewStyle> {
  return useAnimatedStyle(() => {
    const t = interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: t,
      transform: [{ translateY: (1 - t) * rise }],
    };
  });
}

/** Picks the staged UI for a chapter; turn and promise are scene-only. */
export function ChapterStage({
  kind,
  ...props
}: StageProps & { kind: OnboardingStage }): React.ReactElement | null {
  switch (kind) {
    case "tools":
      return <StageTools {...props} />;
    case "capture":
      return <StageCaptureConsole {...props} />;
    case "entities":
      return <StageEntities {...props} />;
    default:
      return null;
  }
}

// ─── Chapter 01 · The tools — two failures and the nagging ─────────────────────

function StageTools({ progress, colors }: StageProps): React.ReactElement {
  const left = useEnterStyle(progress, 0.06, 0.28, 10);
  const right = useEnterStyle(progress, 0.16, 0.38, 10);
  const guilt = useEnterStyle(progress, 0.52, 0.72, 8);
  const strike = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: interpolate(progress.value, [0.66, 0.88], [0, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View style={styles.toolsWrap}>
      <View style={styles.toolsRow}>
        <Animated.View style={[styles.toolPane, { backgroundColor: colors.surface }, left]}>
          <ThemedText type="label" muted>
            NOTES
          </ThemedText>
          <View style={styles.scatter}>
            <View
              style={[
                styles.scatterBar,
                {
                  backgroundColor: colors.surfaceSubtle,
                  width: "82%",
                  transform: [{ rotate: "-4deg" }],
                },
              ]}
            />
            <View
              style={[
                styles.scatterBar,
                styles.scatterOffset,
                {
                  backgroundColor: colors.typeTint.ideas,
                  width: "70%",
                  transform: [{ rotate: "5deg" }],
                },
              ]}
            />
            <View
              style={[
                styles.scatterBar,
                styles.scatterOffsetTwo,
                {
                  backgroundColor: colors.surfaceSubtle,
                  width: "56%",
                  transform: [{ rotate: "-2deg" }],
                },
              ]}
            />
          </View>
          <ThemedText type="hand" muted style={styles.toolCaption}>
            fast, then scattered
          </ThemedText>
        </Animated.View>

        <Animated.View style={[styles.toolPane, { backgroundColor: colors.surface }, right]}>
          <ThemedText type="label" muted>
            PROJECTS
          </ThemedText>
          <View style={styles.rigidGrid}>
            <View style={[styles.rigidBlock, { backgroundColor: colors.typeTint.todo }]} />
            <View style={[styles.rigidBlock, { backgroundColor: colors.surfaceSubtle }]} />
            <View style={[styles.rigidBlock, { backgroundColor: colors.surfaceSubtle }]} />
            <View style={[styles.rigidBlock, { backgroundColor: colors.surfaceSubtle }]} />
          </View>
          <ThemedText type="hand" muted style={styles.toolCaption}>
            powerful, then rigid
          </ThemedText>
        </Animated.View>
      </View>

      <Animated.View style={[styles.guiltRow, guilt]}>
        <View style={[styles.guiltChip, { backgroundColor: colors.surface }]}>
          <ThemedText type="micro" muted>
            12-DAY STREAK
          </ThemedText>
          <Animated.View
            style={[styles.strike, { backgroundColor: colors.feedback.danger }, strike]}
          />
        </View>
        <View style={[styles.guiltChip, { backgroundColor: colors.surface }]}>
          <ThemedText type="micro" style={{ color: colors.feedback.danger }}>
            3 OVERDUE
          </ThemedText>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Chapter 03 · One key — the real capture console, running itself ────────────

function StageCaptureConsole({
  progress,
  active,
}: StageProps): React.ReactElement {
  const reduced = useReducedMotion();
  // Hold the idle readout through the arrival, then let the console run itself.
  const cap = useScriptedCapture(active, reduced, 1500);
  const intro = useAnimatedStyle(() => {
    const t = interpolate(progress.value, [0.08, 0.52], [0, 1], Extrapolation.CLAMP);
    const eased = 1 - Math.pow(1 - t, 3);
    return {
      opacity: Math.min(1, t * 1.6),
      transform: [
        { translateY: (1 - eased) * 72 },
        { scale: 0.95 + eased * 0.05 },
      ],
    };
  });

  return (
    <View style={styles.captureWrap}>
      <Animated.View style={intro}>
        <CaptureConsole cap={cap} projects={MOCK_PROJECTS} />
      </Animated.View>
    </View>
  );
}

// ─── Chapter 04 · What it holds — the project FAB fans out its actions ──────────

type FabActionSpec = {
  key: string;
  label: string;
  icon: IconSymbolName;
  type: EntryType | "note";
};

const FAB_ACTIONS: readonly FabActionSpec[] = [
  { key: "idea", label: "Idea", icon: "Sparkles", type: "idea" },
  { key: "todo", label: "Todo", icon: "CheckSquare", type: "todo" },
  { key: "deadline", label: "Deadline", icon: "Clock", type: "deadline" },
  { key: "note", label: "Note", icon: "Note2", type: "note" },
];

function StageEntities({ progress, colors, active }: StageProps): React.ReactElement {
  const [pointerVisible, setPointerVisible] = useState(false);

  // The pointers annotate the pills, so they only arrive once the fan is out.
  useAnimatedReaction(
    () => progress.value > 0.72,
    (isOpen, previous) => {
      if (isOpen !== previous) runOnJS(setPointerVisible)(isOpen);
    },
  );

  const fabIn = useAnimatedStyle(() => {
    const t = interpolate(progress.value, [0.08, 0.26], [0, 1], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ scale: 0.9 + t * 0.1 }] };
  });
  const rotate = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0.34, 0.6], [0, 45], Extrapolation.CLAMP)}deg`,
      },
    ],
  }));

  return (
    <View style={styles.entitiesWrap}>
      {/* The real empty-project narration: a Caveat scrawl + arrow per pill. */}
      <ProjectEmptyFabPointer visible={active && pointerVisible} />

      <Animated.View style={[styles.fabWrapper, fabIn]}>
        <View style={styles.fabActions}>
          {FAB_ACTIONS.map((action, index) => (
            <FabPill
              key={action.key}
              action={action}
              index={index}
              progress={progress}
              colors={colors}
            />
          ))}
        </View>
        <Animated.View style={[styles.fabShadow, rotate]}>
          <View style={[styles.fabButton, { backgroundColor: colors.accent.clay }]}>
            <IconSymbol name="Plus" size={28} color={colors.accent.onClay} />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function FabPill({
  action,
  index,
  progress,
  colors,
}: {
  action: FabActionSpec;
  index: number;
  progress: SharedValue<number>;
  colors: ThemeColors;
}): React.ReactElement {
  const start = 0.34 + index * 0.09;
  const style = useAnimatedStyle(() => {
    const t = interpolate(
      progress.value,
      [start, start + 0.2],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: t,
      transform: [{ translateY: (1 - t) * 24 }, { scale: 0.8 + t * 0.2 }],
    };
  });

  const tone = fabTone(action.type, colors);

  return (
    <Animated.View style={style}>
      <View style={[styles.fabPill, { backgroundColor: tone.bg }]}>
        <IconSymbol name={action.icon} size={20} color={tone.fg} />
        <ThemedText type="body" style={[styles.fabPillLabel, { color: colors.ink }]}>
          {action.label}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

function fabTone(
  type: EntryType | "note",
  colors: ThemeColors,
): { bg: string; fg: string } {
  switch (type) {
    case "idea":
      return { bg: colors.typeTint.ideas, fg: colors.typeKicker.ideas };
    case "todo":
      return { bg: colors.typeTint.todo, fg: colors.typeKicker.todo };
    case "deadline":
      return { bg: colors.typeTint.bills, fg: colors.typeKicker.bills };
    default:
      return { bg: colors.surface, fg: colors.inkMuted };
  }
}

const styles = StyleSheet.create({
  // Chapter 01
  toolsWrap: {
    flex: 1,
    justifyContent: "center",
    gap: tokens.space.md,
  },
  toolsRow: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  toolPane: {
    flex: 1,
    minHeight: 142,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.sm,
  },
  scatter: {
    flex: 1,
    justifyContent: "center",
    gap: tokens.space.xs,
    paddingVertical: tokens.space.xs,
  },
  scatterBar: {
    height: 12,
    borderRadius: tokens.radius.sm,
  },
  scatterOffset: {
    marginLeft: tokens.space.md,
  },
  scatterOffsetTwo: {
    marginLeft: -tokens.space.xs,
  },
  rigidGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
    gap: tokens.space.xs,
    paddingVertical: tokens.space.xs,
  },
  rigidBlock: {
    width: "46%",
    height: 26,
    borderRadius: tokens.radius.sm,
  },
  toolCaption: {
    fontSize: 18,
    lineHeight: 22,
  },
  guiltRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.sm,
  },
  guiltChip: {
    minHeight: 30,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  strike: {
    position: "absolute",
    left: tokens.space.xs,
    right: tokens.space.xs,
    height: 2,
    borderRadius: 1,
    transformOrigin: "left",
  },

  // Chapter 03
  captureWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: tokens.space.lg,
  },

  // Chapter 04
  entitiesWrap: {
    flex: 1,
  },
  fabWrapper: {
    position: "absolute",
    bottom: 28,
    right: 20,
    alignItems: "flex-end",
    gap: tokens.space.md,
  },
  fabActions: {
    gap: tokens.space.sm,
    paddingBottom: tokens.space.sm,
  },
  fabShadow: {
    ...tokens.elevation.capture,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  fabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    height: 44,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.pill,
  },
  fabPillLabel: {
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
  },
});
