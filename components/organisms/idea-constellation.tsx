import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";
import {
  nowFloorMinute,
  useIdeaNodes,
} from "@/hooks/use-idea-nodes";

import type { DbDiaryEntry, DbEntry } from "@/lib/types";
import type { IdeaNode } from "@/hooks/use-idea-nodes";

const HEIGHT = 288;
const FREE_BAND_HEIGHT = 56;
const IDEA_BAND_HEIGHT = HEIGHT - FREE_BAND_HEIGHT;

/** Node radius by note count. Clamped to keep touch targets sane and prevent
 *  one wildly-popular idea from consuming the frame. */
function nodeRadius(noteCount: number): number {
  const base = 14 + Math.min(4, Math.log2(1 + noteCount)) * 3;
  return Math.round(base);
}

interface IdeaConstellationProps {
  entries: readonly DbEntry[];
  notes: readonly DbDiaryEntry[];
  selectedIdeaId: string | null;
  onSelectIdea: (id: string | null) => void;
  /** How many diary notes are unlinked (free thoughts). Drives the well size. */
  freeNoteCount: number;
  onSelectFree: () => void;
}

/**
 * Constellation lens: ideas as amber nodes sized by note count, positioned
 * once with a lightweight deterministic layout (no live physics). A second
 * "free thoughts" gravity well sits at the bottom for unlinked notes.
 *
 * Layout algorithm: seeded pseudo-random positions per idea id, then a few
 * iterations of gentle repulsion so nothing overlaps. Result is stable across
 * mounts (positions are a function of `id + noteCount + viewportWidth`), so
 * ideas don't hop around on every re-render.
 */
export function IdeaConstellation({
  entries,
  notes,
  selectedIdeaId,
  onSelectIdea,
  freeNoteCount,
  onSelectFree,
}: IdeaConstellationProps): React.ReactElement {
  const { colors } = useTheme();
  const now = useMemo(() => nowFloorMinute(), []);
  const nodes = useIdeaNodes(entries, notes, now);

  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const laidOut = useMemo(() => {
    if (width === 0 || nodes.length === 0) return [];
    return layoutConstellation(nodes, width, IDEA_BAND_HEIGHT);
  }, [nodes, width]);

  const isEmpty = nodes.length === 0;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel={
        isEmpty
          ? "Idea constellation, empty."
          : `Idea constellation, ${nodes.length} ${
              nodes.length === 1 ? "idea" : "ideas"
            }.`
      }
    >
      <View style={styles.header}>
        <ThemedText type="label" style={{ color: colors.ink }}>
          IDEAS · {nodes.length}
        </ThemedText>
        {freeNoteCount > 0 && (
          <ThemedText type="micro" muted>
            + {freeNoteCount} FREE
          </ThemedText>
        )}
      </View>

      <View
        style={[
          styles.canvas,
          {
            backgroundColor: colors.surface,
            borderRadius: tokens.radius.lg,
          },
        ]}
        onLayout={onLayout}
      >
        {isEmpty ? (
          <View style={styles.emptyHolder} pointerEvents="none">
            <ThemedText type="hand" muted style={styles.emptyText}>
              no ideas yet.{"\n"}capture one and watch it settle in.
            </ThemedText>
          </View>
        ) : (
          <>
            {laidOut.map(({ node, x, y }) => (
              <ConstellationNode
                key={node.id}
                node={node}
                x={x}
                y={y}
                selected={selectedIdeaId === node.id}
                faded={
                  selectedIdeaId !== null && selectedIdeaId !== node.id
                }
                onPress={onSelectIdea}
              />
            ))}
            <FreeThoughtsWell
              count={freeNoteCount}
              width={width}
              onPress={onSelectFree}
            />
          </>
        )}
      </View>
    </View>
  );
}

/** Seeded random from a string id — deterministic across mounts. */
function seedFrom(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function layoutConstellation(
  nodes: IdeaNode[],
  width: number,
  height: number,
): { node: IdeaNode; x: number; y: number }[] {
  const margin = 40;
  const w = Math.max(1, width - margin * 2);
  const h = Math.max(1, height - margin * 2);

  const positioned = nodes.map((n, i) => {
    const s = seedFrom(n.id);
    const sy = seedFrom(n.id + ":y");
    // Bias fresh ideas toward the top (still-alive), stale toward the bottom.
    const heatBias =
      n.heat === "fresh" ? 0.2 : n.heat === "stale" ? 0.8 : 0.5;
    return {
      node: n,
      x: margin + s * w,
      y: margin + (sy * 0.5 + heatBias * 0.5) * h,
      r: nodeRadius(n.noteCount),
      idx: i,
    };
  });

  // Repulsion passes — gentle, only 8 iterations. Cheap and deterministic.
  const iterations = 8;
  const pad = 10;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const a = positioned[i];
        const b = positioned[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const minDist = a.r + b.r + pad;
        if (dist < minDist) {
          const push = (minDist - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }
    // Clamp inside bounds each iter so nothing drifts off-canvas.
    for (const p of positioned) {
      p.x = Math.max(margin, Math.min(width - margin, p.x));
      p.y = Math.max(margin, Math.min(height - margin, p.y));
    }
  }

  return positioned.map(({ node, x, y }) => ({ node, x, y }));
}

interface ConstellationNodeProps {
  node: IdeaNode;
  x: number;
  y: number;
  selected: boolean;
  faded: boolean;
  onPress: (id: string | null) => void;
}

function ConstellationNode({
  node,
  x,
  y,
  selected,
  faded,
  onPress,
}: ConstellationNodeProps): React.ReactElement {
  const { colors } = useTheme();
  const amber = colors.type.ideas;
  const reduced = useReducedMotion();
  const r = nodeRadius(node.noteCount);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.2 : 1, {
      damping: 22,
      stiffness: 220,
    });
  }, [selected, scale]);

  useEffect(() => {
    const target = faded ? 0.3 : heatOpacity(node.heat);
    opacity.value = withTiming(target, {
      duration: tokens.motion.duration.fast,
      easing: Easing.bezier(...tokens.motion.bezier),
    });
  }, [faded, node.heat, opacity]);

  useEffect(() => {
    if (node.heat !== "stale" || reduced) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 2400,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [node.heat, reduced, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulse.value * 0.4,
    transform: [{ scale: 1.3 + pulse.value * 0.3 }],
  }));

  const hollow = node.heat === "silent" || node.heat === "stale";
  const boxSize = Math.max(r * 2, 44);

  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress(node.id);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${node.title}, ${node.noteCount} ${
        node.noteCount === 1 ? "note" : "notes"
      }, ${node.heat}`}
      accessibilityState={{ selected }}
      style={[
        styles.nodeBox,
        {
          left: x - boxSize / 2,
          top: y - boxSize / 2,
          width: boxSize,
          height: boxSize,
        },
      ]}
    >
      {node.heat === "stale" && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              borderColor: colors.glow.stalePulse,
            },
            pulseStyle,
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.dot,
          {
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            backgroundColor: hollow ? "transparent" : amber,
            borderColor: amber,
          },
          dotStyle,
        ]}
      />
      <ThemedText
        type="micro"
        style={[styles.nodeCount, { color: colors.ink }]}
        allowFontScaling={false}
      >
        {node.noteCount}
      </ThemedText>
      <ThemedText
        type="caption"
        numberOfLines={1}
        style={[styles.nodeLabel, { color: colors.inkMuted }]}
      >
        {node.title}
      </ThemedText>
    </Pressable>
  );
}

function heatOpacity(heat: IdeaNode["heat"]): number {
  switch (heat) {
    case "fresh":
      return 1;
    case "warm":
      return 0.8;
    case "silent":
      return 0.65;
    case "stale":
      return 0.55;
  }
}

interface FreeThoughtsWellProps {
  count: number;
  width: number;
  onPress: () => void;
}

function FreeThoughtsWell({
  count,
  width,
  onPress,
}: FreeThoughtsWellProps): React.ReactElement | null {
  const { colors } = useTheme();
  if (count === 0) return null;
  const wellR = Math.min(28, 14 + Math.log2(1 + count) * 3);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${count} free notes, unlinked. Filter to free notes.`}
      style={[
        styles.freeWell,
        {
          left: width / 2 - 60,
          bottom: 8,
          width: 120,
        },
      ]}
    >
      <View
        style={[
          styles.freeDot,
          {
            width: wellR * 2,
            height: wellR * 2,
            borderRadius: wellR,
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.inkMuted,
          },
        ]}
      >
        <ThemedText type="mono" style={{ color: colors.ink }}>
          {count}
        </ThemedText>
      </View>
      <ThemedText type="micro" muted style={styles.freeLabel}>
        FREE THOUGHTS
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.space.xs,
  },
  canvas: {
    height: HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  emptyHolder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.xxl,
  },
  emptyText: {
    textAlign: "center",
  },
  nodeBox: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    borderWidth: 1.5,
  },
  nodeCount: {
    position: "absolute",
    fontVariant: ["tabular-nums"],
  },
  nodeLabel: {
    position: "absolute",
    bottom: -14,
    width: 96,
    textAlign: "center",
  },
  freeWell: {
    position: "absolute",
    alignItems: "center",
    gap: 2,
  },
  freeDot: {
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  freeLabel: {
    marginTop: 2,
  },
});
