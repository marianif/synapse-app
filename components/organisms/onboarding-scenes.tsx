import { useEffect, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
  Easing,
  Extrapolation,
  interpolate,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  Canvas,
  Circle,
  Path,
  Rect,
  Skia,
} from "@/components/organisms/onboarding-skia";
import type { ThemeColors } from "@/constants/theme";

import type { SharedValue } from "react-native-reanimated";

/**
 * The onboarding scene layer. Skia draws the atmospheric geometry under the
 * staged React Native UI; every value comes from the read-only Field Lab token
 * set (solid fills only — no gradients, no blur). Motion is timing on the
 * brand bezier; the only continuous loop is the slow "breath" of the Circuit
 * mark, which holds still under reduced motion.
 */

const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const IS_WEB = Platform.OS === "web";

export type SceneProps = {
  width: number;
  height: number;
  progress: SharedValue<number>;
  colors: ThemeColors;
  active: boolean;
};

/** The chapters, in story order (plus the Chapter 00 cold open). */
export type OnboardingStage =
  | "open"
  | "tools"
  | "turn"
  | "capture"
  | "entities"
  | "promise";

/** Picks the Skia scene for a chapter; only the turn and the promise draw. */
export function ChapterScene({
  kind,
  ...props
}: SceneProps & { kind: OnboardingStage }): React.ReactElement | null {
  switch (kind) {
    case "turn":
      return <SceneTurn {...props} />;
    case "capture":
      return <SceneCapture {...props} />;
    case "entities":
      return <SceneEntities {...props} />;
    default:
      return null;
  }
}

/**
 * One chapter's entrance: 0 while inactive (so returning replays the chapter),
 * a single timing run to 1 on activation, instant under reduced motion.
 */
export function useChapterProgress(
  active: boolean,
  duration = 1900,
): SharedValue<number> {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = reduced ? 1 : withTiming(1, { duration, easing: EASE });
  }, [active, duration, progress, reduced]);

  return progress;
}

// ─── Chapter 00 · The cold open — three equal-volume bands sweep the paper ─────

export function ColdOpenWash({
  width,
  height,
  progress,
  colors,
}: SceneProps): React.ReactElement | null {
  if (IS_WEB) {
    return null;
  }
  return (
    <Canvas style={{ width, height }}>
      <WashBand
        start={0.15}
        end={0.52}
        color={colors.type.bills}
        width={width}
        height={height}
        progress={progress}
      />
      <WashBand
        start={0.36}
        end={0.73}
        color={colors.type.todo}
        width={width}
        height={height}
        progress={progress}
      />
      <WashBand
        start={0.57}
        end={0.94}
        color={colors.type.ideas}
        width={width}
        height={height}
        progress={progress}
      />
    </Canvas>
  );
}

function WashBand({
  start,
  end,
  color,
  width,
  height,
  progress,
}: {
  start: number;
  end: number;
  color: string;
  width: number;
  height: number;
  progress: SharedValue<number>;
}): React.ReactElement {
  const bandWidth = width * 0.62;
  const x = useDerivedValue(() =>
    interpolate(
      progress.value,
      [start, end],
      [-bandWidth, width],
      Extrapolation.CLAMP,
    ),
  );
  const opacity = useDerivedValue(() =>
    interpolate(
      progress.value,
      [start, start + 0.12, end - 0.12, end],
      [0, 0.16, 0.16, 0],
      Extrapolation.CLAMP,
    ),
  );

  return (
    <Rect x={x} y={0} width={bandWidth} height={height} color={color} opacity={opacity} />
  );
}

// ─── Chapter 02 · The turn — the Circuit mark ignites into being ────────────────

const MARK = {
  a: { x: 92, y: 23 },
  m: { x: 63, y: 34 },
  b: { x: 80, y: 61 },
  c: { x: 37, y: 76 },
} as const;

export function SceneTurn(props: SceneProps): React.ReactElement {
  if (IS_WEB) {
    return <WebSceneFallback colors={props.colors} />;
  }
  return <TurnCanvas {...props} />;
}

function TurnCanvas({
  width,
  height,
  progress,
  colors,
}: SceneProps): React.ReactElement {
  const geo = useMemo(() => {
    // Bare on the paper: the mark runs larger than it did on its tile.
    const scale = Math.min(width, height) / 102;
    const originX = width / 2 - 64.5 * scale;
    const originY = height / 2 - 49.5 * scale;
    const point = (p: { x: number; y: number }) => ({
      x: originX + p.x * scale,
      y: originY + p.y * scale,
    });
    return {
      a: point(MARK.a),
      m: point(MARK.m),
      b: point(MARK.b),
      c: point(MARK.c),
      scale,
    };
  }, [width, height]);

  const segmentOne = useMemo(() => {
    const path = Skia.Path.Make();
    path.moveTo(geo.a.x, geo.a.y);
    path.lineTo(geo.m.x, geo.m.y);
    return path;
  }, [geo]);

  const segmentTwo = useMemo(() => {
    const path = Skia.Path.Make();
    path.moveTo(geo.m.x, geo.m.y);
    path.lineTo(geo.b.x, geo.b.y);
    return path;
  }, [geo]);

  const segmentThree = useMemo(() => {
    const path = Skia.Path.Make();
    path.moveTo(geo.b.x, geo.b.y);
    path.lineTo(geo.c.x, geo.c.y);
    return path;
  }, [geo]);

  const segmentOneEnd = useDerivedValue(() =>
    interpolate(progress.value, [0.14, 0.4], [0, 1], Extrapolation.CLAMP),
  );
  const segmentTwoEnd = useDerivedValue(() =>
    interpolate(progress.value, [0.4, 0.62], [0, 1], Extrapolation.CLAMP),
  );
  const segmentThreeEnd = useDerivedValue(() =>
    interpolate(progress.value, [0.62, 0.84], [0, 1], Extrapolation.CLAMP),
  );

  // Equal-volume pulse: all three codes fire to the same brightness at once.
  const pulse = useDerivedValue(() =>
    interpolate(progress.value, [0.9, 0.95, 1], [0, 1, 0], Extrapolation.CLAMP),
  );

  const lineWidth = Math.max(1.5, 2.25 * geo.scale);

  return (
    <Canvas style={{ width, height }}>
      <Path
        path={segmentOne}
        style="stroke"
        strokeWidth={lineWidth}
        strokeCap="round"
        strokeJoin="round"
        color={colors.ink}
        start={0}
        end={segmentOneEnd}
      />
      <Path
        path={segmentTwo}
        style="stroke"
        strokeWidth={lineWidth}
        strokeCap="round"
        strokeJoin="round"
        color={colors.ink}
        start={0}
        end={segmentTwoEnd}
      />
      <Path
        path={segmentThree}
        style="stroke"
        strokeWidth={lineWidth}
        strokeCap="round"
        strokeJoin="round"
        color={colors.ink}
        start={0}
        end={segmentThreeEnd}
      />
      <PingRing
        cx={geo.a.x}
        cy={geo.a.y}
        color={colors.type.bills}
        at={0.14}
        progress={progress}
        scale={geo.scale}
      />
      <PingRing
        cx={geo.b.x}
        cy={geo.b.y}
        color={colors.type.todo}
        at={0.5}
        progress={progress}
        scale={geo.scale}
      />
      <PingRing
        cx={geo.c.x}
        cy={geo.c.y}
        color={colors.type.ideas}
        at={0.74}
        progress={progress}
        scale={geo.scale}
      />
      <IgniteNode
        cx={geo.a.x}
        cy={geo.a.y}
        r={9 * geo.scale}
        color={colors.type.bills}
        from={0.1}
        to={0.28}
        progress={progress}
        pulse={pulse}
      />
      <IgniteNode
        cx={geo.b.x}
        cy={geo.b.y}
        r={9 * geo.scale}
        color={colors.type.todo}
        from={0.46}
        to={0.64}
        progress={progress}
        pulse={pulse}
      />
      <IgniteNode
        cx={geo.c.x}
        cy={geo.c.y}
        r={9 * geo.scale}
        color={colors.type.ideas}
        from={0.7}
        to={0.88}
        progress={progress}
        pulse={pulse}
      />
    </Canvas>
  );
}

/** A one-shot ring that expands off a node as it lights (timing, not a loop). */
function PingRing({
  cx,
  cy,
  color,
  at,
  progress,
  scale,
}: {
  cx: number;
  cy: number;
  color: string;
  at: number;
  progress: SharedValue<number>;
  scale: number;
}): React.ReactElement {
  const radius = useDerivedValue(() =>
    interpolate(progress.value, [at, at + 0.22], [6 * scale, 34 * scale], Extrapolation.CLAMP),
  );
  const opacity = useDerivedValue(() =>
    interpolate(
      progress.value,
      [at, at + 0.05, at + 0.22],
      [0, 0.5, 0],
      Extrapolation.CLAMP,
    ),
  );

  return (
    <Circle
      cx={cx}
      cy={cy}
      r={radius}
      color={color}
      opacity={opacity}
      style="stroke"
      strokeWidth={1.5}
    />
  );
}

function IgniteNode({
  cx,
  cy,
  r,
  color,
  from,
  to,
  progress,
  pulse,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  from: number;
  to: number;
  progress: SharedValue<number>;
  pulse?: SharedValue<number>;
}): React.ReactElement {
  const radius = useDerivedValue(() => {
    const t = interpolate(progress.value, [from, to], [0, 1], Extrapolation.CLAMP);
    const bump = 1 + 0.4 * (pulse ? pulse.value : 0);
    return r * (0.35 + 0.65 * t) * bump;
  });
  const opacity = useDerivedValue(() =>
    interpolate(
      progress.value,
      [from, from + (to - from) * 0.5],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  );

  return <Circle cx={cx} cy={cy} r={radius} color={color} opacity={opacity} />;
}

// ─── Chapter 03 · One key — the console lands with a signal ─────────────────────

export function SceneCapture(props: SceneProps): React.ReactElement {
  if (IS_WEB) {
    return <WebSceneFallback colors={props.colors} />;
  }
  return <CaptureCanvas {...props} />;
}

function CaptureCanvas({
  width,
  height,
  progress,
  colors,
}: SceneProps): React.ReactElement {
  const cx = width / 2;
  const cy = height / 2;
  const reach = Math.max(width, height) * 0.5;

  const scanX = useDerivedValue(() =>
    interpolate(progress.value, [0.52, 0.78], [-2, width + 2], Extrapolation.CLAMP),
  );
  const scanOpacity = useDerivedValue(() =>
    interpolate(
      progress.value,
      [0.52, 0.58, 0.78],
      [0, 0.3, 0],
      Extrapolation.CLAMP,
    ),
  );

  return (
    <Canvas style={{ width, height }}>
      <LandingRing cx={cx} cy={cy} reach={reach} at={0.5} strokeWidth={1.5} color={colors.ink} progress={progress} />
      <LandingRing cx={cx} cy={cy} reach={reach} at={0.59} strokeWidth={1.2} color={colors.ink} progress={progress} />
      <LandingRing cx={cx} cy={cy} reach={reach} at={0.68} strokeWidth={1} color={colors.ink} progress={progress} />
      <Rect x={scanX} y={0} width={2} height={height} color={colors.ink} opacity={scanOpacity} />
    </Canvas>
  );
}

function LandingRing({
  cx,
  cy,
  reach,
  at,
  strokeWidth,
  color,
  progress,
}: {
  cx: number;
  cy: number;
  reach: number;
  at: number;
  strokeWidth: number;
  color: string;
  progress: SharedValue<number>;
}): React.ReactElement {
  const radius = useDerivedValue(() =>
    interpolate(progress.value, [at, at + 0.22], [10, reach], Extrapolation.CLAMP),
  );
  const opacity = useDerivedValue(() =>
    interpolate(
      progress.value,
      [at, at + 0.04, at + 0.22],
      [0, 0.4, 0],
      Extrapolation.CLAMP,
    ),
  );

  return (
    <Circle
      cx={cx}
      cy={cy}
      r={radius}
      color={color}
      opacity={opacity}
      style="stroke"
      strokeWidth={strokeWidth}
    />
  );
}

// ─── Chapter 04 · What it holds — the FAB hub pings as it opens ─────────────────

export function SceneEntities(props: SceneProps): React.ReactElement {
  if (IS_WEB) {
    return <WebSceneFallback colors={props.colors} />;
  }
  return <EntitiesCanvas {...props} />;
}

function EntitiesCanvas({
  width,
  height,
  progress,
  colors,
}: SceneProps): React.ReactElement {
  // Mirror ProjectFab's geometry: bottom:28, right:20, a 56px button — so the
  // ping fires from the hub exactly where the real FAB sits.
  const cx = width - 20 - 28;
  const cy = height - 28 - 28;

  const radius = useDerivedValue(() =>
    interpolate(progress.value, [0.34, 0.6], [8, 46], Extrapolation.CLAMP),
  );
  const opacity = useDerivedValue(() =>
    interpolate(
      progress.value,
      [0.34, 0.4, 0.6],
      [0, 0.4, 0],
      Extrapolation.CLAMP,
    ),
  );

  return (
    <Canvas style={{ width, height }}>
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        color={colors.ink}
        opacity={opacity}
        style="stroke"
        strokeWidth={1.5}
      />
    </Canvas>
  );
}

// ─── Web fallbacks — static, no canvas, no CanvasKit requirement ───────────────

function WebSceneFallback({ colors }: { colors: ThemeColors }): React.ReactElement {
  return (
    <View style={styles.webFallback} pointerEvents="none">
      <View
        style={[
          styles.webLink,
          {
            backgroundColor: colors.inkMuted,
            top: "36%",
            left: "28%",
            width: "34%",
            transform: [{ rotate: "18deg" }],
          },
        ]}
      />
      <View
        style={[
          styles.webLink,
          {
            backgroundColor: colors.inkMuted,
            top: "58%",
            left: "38%",
            width: "30%",
            transform: [{ rotate: "-26deg" }],
          },
        ]}
      />
      <View
        style={[
          styles.webNode,
          { backgroundColor: colors.type.bills, top: "24%", left: "58%" },
        ]}
      />
      <View
        style={[
          styles.webNode,
          { backgroundColor: colors.type.todo, top: "52%", left: "44%" },
        ]}
      />
      <View
        style={[
          styles.webNode,
          { backgroundColor: colors.type.ideas, top: "72%", left: "22%" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webFallback: {
    ...StyleSheet.absoluteFillObject,
  },
  webLink: {
    position: "absolute",
    height: 2,
    borderRadius: 1,
    opacity: 0.3,
  },
  webNode: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
