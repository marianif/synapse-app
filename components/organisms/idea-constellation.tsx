import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";
import {
  nowFloorMinute,
  useIdeaNodes,
} from "@/hooks/use-idea-nodes";
import { useTendrilRegistry } from "@/hooks/use-tendril-registry";

import type { DbDiaryEntry, DbEntry } from "@/lib/types";
import type { IdeaNode } from "@/hooks/use-idea-nodes";
import type { SharedValue } from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const HEIGHT = 288;
const GRID_STEP = 24;

const SWAY_AMPLITUDE = 3.5;
const MAGNET_PULL_MAX = 22;
const MAGNET_RADIUS = 140;

/** Node body radius stays constant (a "measured point" on an instrument); the
 *  visible weight comes from the halo ring around it. */
const NODE_BODY_R = 4.5;

/** Halo ring radius per note count. Zero notes → no halo, just the reticle. */
function haloRadius(noteCount: number): number {
  if (noteCount === 0) return 0;
  return 12 + Math.min(4, Math.log2(1 + noteCount)) * 4;
}

/** Tick-mark length that grows with note count so busy ideas visibly extend
 *  their crosshair — reads like an instrument's calibration marks. */
function tickLen(noteCount: number): number {
  return 6 + Math.min(4, Math.log2(1 + noteCount)) * 2;
}

function swayAmplitude(heat: IdeaNode["heat"]): number {
  switch (heat) {
    case "fresh":
      return SWAY_AMPLITUDE;
    case "warm":
      return SWAY_AMPLITUDE * 0.6;
    case "silent":
      return SWAY_AMPLITUDE * 0.3;
    case "stale":
      return 0;
  }
}

interface IdeaConstellationProps {
  entries: readonly DbEntry[];
  notes: readonly DbDiaryEntry[];
  selectedIdeaId: string | null;
  onSelectIdea: (id: string | null) => void;
  freeNoteCount: number;
  onSelectFree: () => void;
}

/**
 * Idea field, rendered as a Field Lab instrument surface.
 *
 * The whole scene is one SVG canvas: cool graphite grid, corner mono readouts,
 * ghost bezier lines between ideas that share a project, and each idea drawn
 * as a reticle (crosshair + center dot + halo ring sized by note count).
 * Motion, magnet, and tendrils from the previous pass carry over — this is a
 * visual rebuild, not a functional one.
 *
 * Layers, back to front:
 *   1. Grid + vignette (SVG rects + gradient)
 *   2. Project ghost lines (SVG paths, low opacity)
 *   3. Node reticles (SVG group per idea, one useDerivedValue-driven G per node)
 *   4. Tendrils (only when an idea is selected)
 *   5. Corner readouts + free-thoughts gauge (SVG text + RN Pressable overlay)
 */
export function IdeaConstellation({
  entries,
  notes,
  selectedIdeaId,
  onSelectIdea,
  freeNoteCount,
  onSelectFree,
}: IdeaConstellationProps): React.ReactElement {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const now = useMemo(() => nowFloorMinute(), []);
  const nodes = useIdeaNodes(entries, notes, now);
  const registry = useTendrilRegistry();

  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const laidOut = useMemo(() => {
    if (width === 0 || nodes.length === 0) return [];
    return layoutConstellation(nodes, width, HEIGHT);
  }, [nodes, width]);

  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    "worklet";
    if (reduced) return;
    clock.value += (frame.timeSincePreviousFrame ?? 16) / 1000;
  }, !reduced);

  const magnetX = useSharedValue(-1);
  const magnetY = useSharedValue(-1);

  const linkedNotes = useMemo(() => {
    if (!selectedIdeaId) return [] as DbDiaryEntry[];
    return notes.filter((n) => n.linked_entry_id === selectedIdeaId);
  }, [notes, selectedIdeaId]);

  const selectedLayout = useMemo(() => {
    if (!selectedIdeaId) return null;
    return laidOut.find((n) => n.node.id === selectedIdeaId) ?? null;
  }, [selectedIdeaId, laidOut]);

  // Project-share edges: pairs of nodes whose ideas share a non-null project_id.
  // Rendered as ghost bezier lines behind the reticles. Undated entries with a
  // null project_id contribute nothing — the graph doesn't guess relationships.
  const projectEdges = useMemo(() => {
    if (laidOut.length < 2) return [];
    const byProject = new Map<string, typeof laidOut>();
    for (const p of laidOut) {
      const source = entries.find((e) => e.id === p.node.id);
      const pid = source?.project_id;
      if (!pid) continue;
      const list = byProject.get(pid) ?? [];
      list.push(p);
      byProject.set(pid, list);
    }
    const edges: {
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }[] = [];
    for (const [pid, group] of byProject) {
      // Chain within a project — sequential connectors, not full mesh, so a
      // hub with 5 sibling ideas doesn't drown the field in ghost lines.
      for (let i = 1; i < group.length; i++) {
        edges.push({
          key: `${pid}:${group[i - 1].node.id}:${group[i].node.id}`,
          x1: group[i - 1].x,
          y1: group[i - 1].y,
          x2: group[i].x,
          y2: group[i].y,
        });
      }
    }
    return edges;
  }, [laidOut, entries]);

  const canvasPan = useMemo(() => {
    return Gesture.Pan()
      .minDistance(1)
      .maxPointers(1)
      .activateAfterLongPress(250)
      .onBegin((e) => {
        magnetX.value = e.x;
        magnetY.value = e.y;
        runOnJS(fireMagnetHaptic)();
      })
      .onUpdate((e) => {
        magnetX.value = e.x;
        magnetY.value = e.y;
      })
      .onEnd(() => {
        magnetX.value = withSpring(-1, { damping: 22, stiffness: 220 });
        magnetY.value = withSpring(-1, { damping: 22, stiffness: 220 });
      })
      .onFinalize(() => {
        magnetX.value = withSpring(-1, { damping: 22, stiffness: 220 });
        magnetY.value = withSpring(-1, { damping: 22, stiffness: 220 });
      });
  }, [magnetX, magnetY]);

  const isEmpty = nodes.length === 0;
  const amber = colors.type.ideas;
  const gridColor = colors.surfaceSubtle;
  const inkFaint = scheme === "dark" ? "rgba(233,237,243,0.35)" : "rgba(26,30,37,0.35)";

  // Field readouts — mono strings at corners of the panel, instrument-style.
  const readoutTL = "IDEAS";
  const readoutTR = `N=${nodes.length}`;
  const staleCount = nodes.filter((n) => n.heat === "stale").length;
  const freshCount = nodes.filter((n) => n.heat === "fresh").length;
  const readoutBL = `${freshCount} FRESH · ${staleCount} STALE`;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel={
        isEmpty
          ? "Idea field, empty."
          : `Idea field, ${nodes.length} ${
              nodes.length === 1 ? "idea" : "ideas"
            }, ${freshCount} fresh, ${staleCount} stale.`
      }
    >
      <GestureDetector gesture={canvasPan}>
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
          {width > 0 && (
            <Svg width={width} height={HEIGHT} style={StyleSheet.absoluteFill}>
              <Defs>
                {/* Vignette darkens the corners so the field reads as a
                    surface with depth, not a flat rectangle. */}
                <RadialGradient
                  id="vignette"
                  cx="50%"
                  cy="50%"
                  rx="70%"
                  ry="70%"
                >
                  <Stop
                    offset="0"
                    stopColor={colors.surface}
                    stopOpacity={0}
                  />
                  <Stop
                    offset="1"
                    stopColor={colors.surfaceSubtle}
                    stopOpacity={0.6}
                  />
                </RadialGradient>
                {/* Amber halo gradient — used by each node's halo ring so the
                    glow feels physical, not a flat translucent circle. */}
                <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={amber} stopOpacity={0} />
                  <Stop offset="0.55" stopColor={amber} stopOpacity={0.14} />
                  <Stop offset="1" stopColor={amber} stopOpacity={0} />
                </RadialGradient>
              </Defs>

              {/* Grid — vertical + horizontal tick lines, low opacity, so the
                  field reads as a coordinate space you can find yourself on. */}
              <GridLayer width={width} color={gridColor} />

              {/* Vignette on top of the grid so the corners fade. */}
              <Rect
                x={0}
                y={0}
                width={width}
                height={HEIGHT}
                fill="url(#vignette)"
              />

              {/* Project ghost lines. */}
              {projectEdges.map((e) => (
                <Path
                  key={e.key}
                  d={ghostBezier(e.x1, e.y1, e.x2, e.y2)}
                  stroke={amber}
                  strokeOpacity={0.14}
                  strokeWidth={1}
                  strokeLinecap="round"
                  fill="none"
                />
              ))}

              {/* Node reticles. Each one is its own animated group so sway +
                  magnet transforms stay UI-thread. */}
              {laidOut.map(({ node, x, y }) => (
                <NodeReticle
                  key={node.id}
                  node={node}
                  homeX={x}
                  homeY={y}
                  clock={clock}
                  magnetX={magnetX}
                  magnetY={magnetY}
                  selected={selectedIdeaId === node.id}
                  faded={
                    selectedIdeaId !== null && selectedIdeaId !== node.id
                  }
                  amber={amber}
                  inkColor={colors.ink}
                  inkMutedColor={colors.inkMuted}
                  stalePulseColor={colors.glow.stalePulse}
                />
              ))}

              {/* Tendrils. */}
              {registry && selectedLayout && linkedNotes.length > 0 && (
                <TendrilLayer
                  originX={selectedLayout.x}
                  originY={selectedLayout.y}
                  width={width}
                  height={HEIGHT}
                  linkedNoteIds={linkedNotes.map((n) => n.id)}
                  scrollY={registry.scrollY}
                  stripBottomY={registry.stripBottomY}
                  getNoteY={registry.peekNote}
                  amber={amber}
                />
              )}

              {/* Corner readouts. Mono, small, deliberately positioned. */}
              <SvgText
                x={12}
                y={18}
                fill={inkFaint}
                fontSize={10}
                fontFamily={tokens.type.fontMono.medium}
                letterSpacing={1.4}
              >
                {readoutTL}
              </SvgText>
              <SvgText
                x={width - 12}
                y={18}
                fill={inkFaint}
                fontSize={10}
                fontFamily={tokens.type.fontMono.medium}
                letterSpacing={1.4}
                textAnchor="end"
              >
                {readoutTR}
              </SvgText>
              <SvgText
                x={12}
                y={HEIGHT - 12}
                fill={inkFaint}
                fontSize={10}
                fontFamily={tokens.type.fontMono.medium}
                letterSpacing={1.4}
              >
                {readoutBL}
              </SvgText>
            </Svg>
          )}

          {isEmpty && (
            <View style={styles.emptyHolder} pointerEvents="none">
              <ThemedText type="hand" muted style={styles.emptyText}>
                no ideas yet.{"\n"}capture one and watch it settle in.
              </ThemedText>
            </View>
          )}

          {/* RN overlay for interactive elements: node labels and hit targets
              sit on top of the SVG. This gives us real Text rendering (for
              Dynamic Type) and proper Pressable ergonomics. */}
          {laidOut.map(({ node, x, y }) => (
            <NodeInteractive
              key={node.id}
              node={node}
              homeX={x}
              homeY={y}
              clock={clock}
              magnetX={magnetX}
              magnetY={magnetY}
              selected={selectedIdeaId === node.id}
              onPress={onSelectIdea}
              inkColor={colors.ink}
              inkMutedColor={colors.inkMuted}
            />
          ))}

          {/* Free thoughts gauge, right-bottom corner. */}
          {freeNoteCount > 0 && (
            <FreeThoughtsGauge
              count={freeNoteCount}
              onPress={onSelectFree}
              width={width}
              amber={amber}
              inkColor={colors.ink}
              inkMutedColor={colors.inkMuted}
            />
          )}
        </View>
      </GestureDetector>
    </View>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

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
  // Leave room for the corner readouts at top/bottom, and for the free-thoughts
  // gauge at bottom-right.
  const marginTop = 44;
  const marginBottom = 44;
  const marginX = 40;
  const w = Math.max(1, width - marginX * 2);
  const h = Math.max(1, height - marginTop - marginBottom);

  const positioned = nodes.map((n, i) => {
    const s = seedFrom(n.id);
    const sy = seedFrom(n.id + ":y");
    const heatBias =
      n.heat === "fresh" ? 0.25 : n.heat === "stale" ? 0.75 : 0.5;
    return {
      node: n,
      x: marginX + s * w,
      y: marginTop + (sy * 0.5 + heatBias * 0.5) * h,
      r: haloRadius(n.noteCount) + 6,
      idx: i,
    };
  });

  const iterations = 10;
  const pad = 14;
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
    for (const p of positioned) {
      p.x = Math.max(marginX, Math.min(width - marginX, p.x));
      p.y = Math.max(marginTop, Math.min(height - marginBottom, p.y));
    }
  }

  return positioned.map(({ node, x, y }) => ({ node, x, y }));
}

/** Gentle S-shape between two points — organic connective tissue, not a
 *  straight ruler line. */
function ghostBezier(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  // Perpendicular offset so the curve bulges to one side deterministically.
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const bulge = Math.min(40, len * 0.18);
  const c1x = midX + nx * bulge;
  const c1y = midY + ny * bulge;
  return `M ${x1} ${y1} Q ${c1x} ${c1y} ${x2} ${y2}`;
}

// ─── Grid ────────────────────────────────────────────────────────────────────

function GridLayer({
  width,
  color,
}: {
  width: number;
  color: string;
}): React.ReactElement {
  const verticals: React.ReactElement[] = [];
  const horizontals: React.ReactElement[] = [];
  for (let x = GRID_STEP; x < width; x += GRID_STEP) {
    verticals.push(
      <Line
        key={`v${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={HEIGHT}
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={0.5}
      />,
    );
  }
  for (let y = GRID_STEP; y < HEIGHT; y += GRID_STEP) {
    horizontals.push(
      <Line
        key={`h${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={0.5}
      />,
    );
  }
  return (
    <G>
      {verticals}
      {horizontals}
    </G>
  );
}

// ─── Reticle (SVG-drawn part of a node) ──────────────────────────────────────

interface NodeReticleProps {
  node: IdeaNode;
  homeX: number;
  homeY: number;
  clock: SharedValue<number>;
  magnetX: SharedValue<number>;
  magnetY: SharedValue<number>;
  selected: boolean;
  faded: boolean;
  amber: string;
  inkColor: string;
  inkMutedColor: string;
  stalePulseColor: string;
}

function NodeReticle({
  node,
  homeX,
  homeY,
  clock,
  magnetX,
  magnetY,
  selected,
  faded,
  amber,
  inkColor,
  inkMutedColor,
  stalePulseColor,
}: NodeReticleProps): React.ReactElement {
  const reduced = useReducedMotion();
  const halo = haloRadius(node.noteCount);
  const tick = tickLen(node.noteCount);
  const amp = swayAmplitude(node.heat);
  const phase = useMemo(
    () => seedFrom(node.id + ":phase") * Math.PI * 2,
    [node.id],
  );
  const speed = useMemo(
    () => 0.6 + seedFrom(node.id + ":speed") * 0.4,
    [node.id],
  );

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const pulse = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.25 : 1, {
      damping: 22,
      stiffness: 220,
    });
  }, [selected, scale]);

  useEffect(() => {
    const target = faded ? 0.25 : heatOpacity(node.heat);
    opacity.value = withTiming(target, {
      duration: tokens.motion.duration.fast,
      easing: Easing.bezier(...tokens.motion.bezier),
    });
  }, [faded, node.heat, opacity]);

  // Stale pulse loop.
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

  // Fresh shimmer — subtle expansion of the halo, driven at a different beat
  // than sway so freshness reads independently.
  useEffect(() => {
    if (node.heat !== "fresh" || reduced) {
      cancelAnimation(shimmer);
      shimmer.value = 0;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, {
        duration: 3200,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(shimmer);
  }, [node.heat, reduced, shimmer]);

  const offset = useDerivedValue(() => {
    "worklet";
    let sx = 0;
    let sy = 0;
    if (!reduced && !selected) {
      sx = Math.cos(clock.value * speed + phase) * amp;
      sy = Math.sin(clock.value * speed + phase) * amp;
    }
    const mx = magnetContribution(homeX, homeY, magnetX, magnetY, "x");
    const my = magnetContribution(homeX, homeY, magnetX, magnetY, "y");
    return { x: sx + mx, y: sy + my };
  });

  const groupProps = useAnimatedProps(() => {
    "worklet";
    const s = scale.value;
    const o = opacity.value;
    const t = `translate(${homeX + offset.value.x} ${
      homeY + offset.value.y
    }) scale(${s})`;
    return {
      transform: t,
      opacity: o,
    } as const;
  });

  const pulseProps = useAnimatedProps(() => {
    "worklet";
    return {
      opacity: 0.35 + pulse.value * 0.45,
      r: halo + 4 + pulse.value * 4,
    } as const;
  });

  const shimmerProps = useAnimatedProps(() => {
    "worklet";
    return {
      opacity: 0.25 + shimmer.value * 0.35,
      r: halo + 2 + shimmer.value * 5,
    } as const;
  });

  const hollow = node.heat === "silent" || node.heat === "stale";

  return (
    <AnimatedG animatedProps={groupProps}>
      {/* Halo — only if this idea has notes. Radial gradient gives real depth. */}
      {halo > 0 && (
        <Circle cx={0} cy={0} r={halo} fill="url(#halo)" />
      )}

      {/* Fresh shimmer ring — a thin amber ring that breathes. */}
      {node.heat === "fresh" && (
        <AnimatedCircle
          animatedProps={shimmerProps}
          cx={0}
          cy={0}
          fill="none"
          stroke={amber}
          strokeWidth={1}
        />
      )}

      {/* Stale pulse ring. */}
      {node.heat === "stale" && (
        <AnimatedCircle
          animatedProps={pulseProps}
          cx={0}
          cy={0}
          fill="none"
          stroke={stalePulseColor}
          strokeWidth={1}
        />
      )}

      {/* Crosshair — 4 tick marks radiating from the center. Length grows
          with note count so a rich idea has visibly longer marks. */}
      <Line
        x1={-tick}
        y1={0}
        x2={-tick * 0.5}
        y2={0}
        stroke={amber}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <Line
        x1={tick * 0.5}
        y1={0}
        x2={tick}
        y2={0}
        stroke={amber}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <Line
        x1={0}
        y1={-tick}
        x2={0}
        y2={-tick * 0.5}
        stroke={amber}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <Line
        x1={0}
        y1={tick * 0.5}
        x2={0}
        y2={tick}
        stroke={amber}
        strokeWidth={1.2}
        strokeLinecap="round"
      />

      {/* Node body. Filled amber for fresh/warm, hollow amber for silent/stale. */}
      <Circle
        cx={0}
        cy={0}
        r={NODE_BODY_R}
        fill={hollow ? "transparent" : amber}
        stroke={amber}
        strokeWidth={1.4}
      />

      {/* Selected ring — a crisp outer ring on selection so the eye finds it
          immediately even with dozens of nodes. */}
      {selected && (
        <Circle
          cx={0}
          cy={0}
          r={halo + 8}
          fill="none"
          stroke={amber}
          strokeWidth={1.2}
          strokeOpacity={0.9}
        />
      )}

      {/* Mono note-count readout, only when > 0. Sits at 1 o'clock. */}
      {node.noteCount > 0 && (
        <SvgText
          x={halo + 4}
          y={-halo - 2}
          fill={inkColor}
          fontSize={10}
          fontFamily={tokens.type.fontMono.bold}
          letterSpacing={0.4}
        >
          {String(node.noteCount)}
        </SvgText>
      )}

      {/* Heat kicker under the count. */}
      {node.noteCount > 0 && (
        <SvgText
          x={halo + 4}
          y={-halo + 10}
          fill={inkMutedColor}
          fontSize={8}
          fontFamily={tokens.type.fontMono.medium}
          letterSpacing={1.2}
        >
          {node.heat.toUpperCase()}
        </SvgText>
      )}
    </AnimatedG>
  );
}

/** Contribution of the magnet to a node's offset on one axis. Worklet. */
function magnetContribution(
  hx: number,
  hy: number,
  mx: SharedValue<number>,
  my: SharedValue<number>,
  axis: "x" | "y",
): number {
  "worklet";
  if (mx.value < 0 || my.value < 0) return 0;
  const dx = mx.value - hx;
  const dy = my.value - hy;
  const dist = Math.max(1, Math.hypot(dx, dy));
  if (dist > MAGNET_RADIUS) return 0;
  const falloff = 1 - dist / MAGNET_RADIUS;
  const pull = MAGNET_PULL_MAX * falloff * falloff;
  return axis === "x" ? (dx / dist) * pull : (dy / dist) * pull;
}

function heatOpacity(heat: IdeaNode["heat"]): number {
  switch (heat) {
    case "fresh":
      return 1;
    case "warm":
      return 0.85;
    case "silent":
      return 0.7;
    case "stale":
      return 0.6;
  }
}

function fireMagnetHaptic(): void {
  void Haptics.selectionAsync();
}

// ─── Interactive layer (label + Pressable) ───────────────────────────────────

interface NodeInteractiveProps {
  node: IdeaNode;
  homeX: number;
  homeY: number;
  clock: SharedValue<number>;
  magnetX: SharedValue<number>;
  magnetY: SharedValue<number>;
  selected: boolean;
  onPress: (id: string | null) => void;
  inkColor: string;
  inkMutedColor: string;
}

/** Native View overlay on top of the SVG: real Text (Dynamic Type friendly) +
 *  Pressable with proper hit-slop. Position follows the same sway+magnet math
 *  so the label stays under its reticle. */
function NodeInteractive({
  node,
  homeX,
  homeY,
  clock,
  magnetX,
  magnetY,
  selected,
  onPress,
  inkColor,
  inkMutedColor,
}: NodeInteractiveProps): React.ReactElement {
  const reduced = useReducedMotion();
  const halo = haloRadius(node.noteCount);
  const amp = swayAmplitude(node.heat);
  const phase = useMemo(
    () => seedFrom(node.id + ":phase") * Math.PI * 2,
    [node.id],
  );
  const speed = useMemo(
    () => 0.6 + seedFrom(node.id + ":speed") * 0.4,
    [node.id],
  );

  const offsetX = useDerivedValue(() => {
    "worklet";
    let sx = 0;
    if (!reduced && !selected) {
      sx = Math.cos(clock.value * speed + phase) * amp;
    }
    return sx + magnetContribution(homeX, homeY, magnetX, magnetY, "x");
  });
  const offsetY = useDerivedValue(() => {
    "worklet";
    let sy = 0;
    if (!reduced && !selected) {
      sy = Math.sin(clock.value * speed + phase) * amp;
    }
    return sy + magnetContribution(homeX, homeY, magnetX, magnetY, "y");
  });

  const labelStyle = useAnimatedProps(() => {
    "worklet";
    return {
      transform: [
        { translateX: offsetX.value },
        { translateY: offsetY.value },
      ],
    };
  });

  // Hit target: 44pt square centered on the reticle.
  const hitSize = Math.max(halo * 2 + 16, 44);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.nodeOverlay,
        {
          left: homeX - hitSize / 2,
          top: homeY - hitSize / 2,
          width: hitSize,
          height: hitSize,
        },
        labelStyle,
      ]}
    >
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
        style={styles.nodePress}
        hitSlop={8}
      />
      <View
        pointerEvents="none"
        style={[
          styles.labelHolder,
          {
            // Label at 5 o'clock — offset diagonally from the reticle by the
            // halo radius so it never sits on top of the crosshair.
            transform: [
              { translateX: halo * 0.75 + 6 },
              { translateY: halo * 0.75 + 6 },
            ],
          },
        ]}
      >
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={[styles.labelText, { color: selected ? inkColor : inkMutedColor }]}
        >
          {node.title}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

// ─── Free thoughts gauge ─────────────────────────────────────────────────────

interface FreeThoughtsGaugeProps {
  count: number;
  onPress: () => void;
  width: number;
  amber: string;
  inkColor: string;
  inkMutedColor: string;
}

function FreeThoughtsGauge({
  count,
  onPress,
  width,
  amber,
  inkColor,
  inkMutedColor,
}: FreeThoughtsGaugeProps): React.ReactElement {
  const size = 36;
  const arcSize = 44;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${count} free notes, unlinked. Filter to free notes.`}
      style={[
        styles.gauge,
        {
          right: 12,
          bottom: 8,
        },
      ]}
      hitSlop={12}
    >
      <View style={{ width: arcSize, height: size, alignItems: "center" }}>
        <Svg width={arcSize} height={size}>
          {/* Semicircle track */}
          <Path
            d={`M 4 ${size - 4} A ${(arcSize - 8) / 2} ${(arcSize - 8) / 2} 0 0 1 ${
              arcSize - 4
            } ${size - 4}`}
            stroke={inkMutedColor}
            strokeOpacity={0.35}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
          {/* Amber arc fills proportionally to log(count). */}
          <Path
            d={freeArcPath(count, arcSize, size)}
            stroke={amber}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            opacity={0.9}
          />
          <SvgText
            x={arcSize / 2}
            y={size - 8}
            fill={inkColor}
            fontSize={12}
            fontFamily={tokens.type.fontMono.bold}
            textAnchor="middle"
          >
            {String(count)}
          </SvgText>
        </Svg>
      </View>
      <ThemedText
        type="micro"
        muted
        style={styles.gaugeLabel}
        allowFontScaling={false}
      >
        FREE
      </ThemedText>
      {/* width prop referenced to satisfy TS; the gauge is positioned via
          `right` so width isn't needed for math — but callers pass it so it's
          available for future symmetric-layout tweaks. */}
      {width < 0 ? null : null}
    </Pressable>
  );
}

function freeArcPath(count: number, arcSize: number, size: number): string {
  const fill = Math.min(1, Math.log2(1 + count) / 4);
  const r = (arcSize - 8) / 2;
  const cx = arcSize / 2;
  const cy = size - 4;
  const theta = Math.PI * (1 - fill);
  const endX = cx + r * Math.cos(theta);
  const endY = cy - r * Math.sin(theta);
  const startX = 4;
  const startY = size - 4;
  return `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;
}

// ─── Tendrils ────────────────────────────────────────────────────────────────

interface TendrilLayerProps {
  originX: number;
  originY: number;
  width: number;
  height: number;
  linkedNoteIds: string[];
  scrollY: SharedValue<number>;
  stripBottomY: SharedValue<number>;
  getNoteY: (noteId: string) => SharedValue<number> | undefined;
  amber: string;
}

function TendrilLayer({
  originX,
  originY,
  width,
  height,
  linkedNoteIds,
  scrollY,
  stripBottomY,
  getNoteY,
  amber,
}: TendrilLayerProps): React.ReactElement {
  return (
    <G>
      {linkedNoteIds.map((id, i) => {
        const noteY = getNoteY(id);
        if (!noteY) return null;
        return (
          <Tendril
            key={id}
            index={i}
            total={linkedNoteIds.length}
            originX={originX}
            originY={originY}
            width={width}
            height={height}
            noteY={noteY}
            scrollY={scrollY}
            stripBottomY={stripBottomY}
            amber={amber}
          />
        );
      })}
    </G>
  );
}

interface TendrilProps {
  index: number;
  total: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  noteY: SharedValue<number>;
  scrollY: SharedValue<number>;
  stripBottomY: SharedValue<number>;
  amber: string;
}

function Tendril({
  index,
  total,
  originX,
  originY,
  width,
  height,
  noteY,
  scrollY,
  stripBottomY,
  amber,
}: TendrilProps): React.ReactElement {
  const trace = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    trace.value = 0;
    if (reduced) {
      trace.value = 1;
      return;
    }
    trace.value = withTiming(1, {
      duration: 420 + index * 60,
      easing: Easing.out(Easing.quad),
    });
  }, [trace, reduced, index]);

  const terminalX = useMemo(() => {
    if (total === 1) return width / 2;
    const spread = Math.min(width - 40, total * 22);
    return width / 2 - spread / 2 + (index * spread) / (total - 1);
  }, [total, width, index]);

  const animatedProps = useAnimatedProps(() => {
    "worklet";
    const stripViewportBottom = stripBottomY.value - scrollY.value;
    const noteViewportY = noteY.value - scrollY.value;
    const distBelow = noteViewportY - stripViewportBottom;
    const clampedDist = Math.max(-40, Math.min(220, distBelow));
    const endYSvg = height + clampedDist;

    let opacity = 1;
    if (distBelow < 0) opacity = 0.15;
    else if (distBelow < 12) opacity = 0.4;
    else if (distBelow > 160)
      opacity = Math.max(0.2, 1 - (distBelow - 160) / 60);

    const midY = (originY + endYSvg) / 2;
    const c1x = originX;
    const c1y = midY;
    const c2x = terminalX;
    const c2y = midY;
    const path = `M ${originX} ${originY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${terminalX} ${endYSvg}`;

    const dy = endYSvg - originY;
    const roughLen = Math.hypot(terminalX - originX, dy) * 1.6;
    const dashOffset = roughLen * (1 - trace.value);

    return {
      d: path,
      strokeOpacity: opacity * trace.value,
      strokeDasharray: `${roughLen} ${roughLen}`,
      strokeDashoffset: dashOffset,
    } as const;
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      stroke={amber}
      strokeWidth={1.4}
      strokeLinecap="round"
      fill="none"
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.sm,
  },
  canvas: {
    height: HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  emptyHolder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.xxl,
  },
  emptyText: {
    textAlign: "center",
  },
  nodeOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  nodePress: {
    ...StyleSheet.absoluteFillObject,
  },
  labelHolder: {
    position: "absolute",
    maxWidth: 100,
  },
  labelText: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  gauge: {
    position: "absolute",
    alignItems: "center",
    gap: 2,
  },
  gaugeLabel: {
    marginTop: 2,
  },
});
