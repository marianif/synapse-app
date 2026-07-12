import type { IdeaNode } from "@/hooks/use-idea-nodes";
import type { SharedValue } from "react-native-reanimated";

/** Node body radius stays constant (a "measured point" on an instrument); the
 *  visible weight comes from the halo ring around it. */
export const NODE_BODY_R = 4.5;

const SWAY_AMPLITUDE = 3.5;
const MAGNET_PULL_MAX = 22;
const MAGNET_RADIUS = 140;

export function seedFrom(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

/** Halo ring radius per note count. Zero notes → no halo, just the reticle. */
export function haloRadius(noteCount: number): number {
  if (noteCount === 0) return 0;
  return 12 + Math.min(4, Math.log2(1 + noteCount)) * 4;
}

/** Tick-mark length that grows with note count so busy ideas visibly extend
 *  their crosshair — reads like an instrument's calibration marks. */
export function tickLen(noteCount: number): number {
  return 6 + Math.min(4, Math.log2(1 + noteCount)) * 2;
}

export function swayAmplitude(heat: IdeaNode["heat"]): number {
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

export function heatOpacity(heat: IdeaNode["heat"]): number {
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

/** Contribution of the magnet to a node's offset on one axis. Worklet. */
export function magnetContribution(
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
