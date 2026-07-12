import * as Haptics from "expo-haptics";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Circle, G, Line, Text as SvgText } from "react-native-svg";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens } from "@/constants/theme";
import {
  haloRadius,
  heatOpacity,
  magnetContribution,
  NODE_BODY_R,
  seedFrom,
  swayAmplitude,
  tickLen,
} from "@/lib/idea-node-motion";

import type { IdeaNode } from "@/hooks/use-idea-nodes";
import type { SharedValue } from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

function fireMagnetHaptic(): void {
  void Haptics.selectionAsync();
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

export function NodeReticle({
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
export function NodeInteractive({
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

const styles = StyleSheet.create({
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
});

// fireMagnetHaptic is re-exported for idea-constellation.tsx's canvas pan gesture.
export { fireMagnetHaptic };
