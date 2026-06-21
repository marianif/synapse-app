import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";
import { useUiPreference } from "@/hooks/use-ui-preference";

import type { DbProject } from "@/lib/types";

/**
 * Atlas — a two-axis priority surface for active projects.
 *
 *   X (left → right):  light energy  →  heavy energy
 *   Y (top  → bottom): now / soon    →  later
 *
 * Where a project sits IS information. The narrative voice can read it back
 * ("'Album art' has sat in heavy · later for three weeks"). Position is no
 * longer just spatial memory — it's the user's own answer to "when do I have
 * the right window for this, and what does it cost me?"
 *
 * Persistence: useUiPreference per project, key `projects.atlas.<id>`,
 * value `"x,y"` floats in [0,1]. Storage shape is unchanged from the prior
 * "remember where I parked it" model — old positions stay valid, they just
 * mean something now.
 *
 * Archived projects do NOT appear on the field. Position only carries meaning
 * for active work.
 */

const CANVAS_HEIGHT = 360;
const TILE_W = 96;
const TILE_H = 72;

export function AtlasCanvas({
  projects,
}: {
  projects: DbProject[];
}): React.ReactElement {
  const { colors } = useTheme();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const active = useMemo(
    () => projects.filter((p) => p.status !== "archived"),
    [projects],
  );

  const onLayout = useCallback((e: LayoutChangeEvent): void => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  // Auto-layout fallback positions so first-paint tiles aren't all stacked
  // on (0,0). Deterministic by project id index — never the storage answer,
  // just the starting answer.
  const fallbackPos = (index: number, total: number): { x: number; y: number } => {
    if (total <= 0) return { x: 0.5, y: 0.5 };
    const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(total))));
    const rows = Math.ceil(total / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      x: (col + 0.5) / cols,
      y: (row + 0.5) / rows,
    };
  };

  return (
    <View
      onLayout={onLayout}
      style={[styles.canvas, { backgroundColor: colors.paper }]}
    >
      <QuadrantAxes />
      <QuadrantLabels />
      {size
        ? active.map((p, i) => (
            <AtlasTile
              key={p.id}
              project={p}
              fallback={fallbackPos(i, active.length)}
              canvas={size}
            />
          ))
        : null}
    </View>
  );
}

// ─── Axes & labels ─────────────────────────────────────────────────────────

/**
 * Tonal cross-hair at 50/50 — no 1px structural borders (Field Lab rule).
 * The lines are 1pt slabs in `surfaceSubtle`, sitting on `paper`. They read
 * as a divider, not a frame.
 */
function QuadrantAxes(): React.ReactElement {
  const { colors } = useTheme();
  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.axisVertical, { backgroundColor: colors.surfaceSubtle }]}
      />
      <View
        pointerEvents="none"
        style={[styles.axisHorizontal, { backgroundColor: colors.surfaceSubtle }]}
      />
    </>
  );
}

/**
 * Four mono kicker corner labels — the legend that explains the gesture.
 * Low contrast (`inkMuted`) so they sit under the tiles, not over them.
 */
function QuadrantLabels(): React.ReactElement {
  const { colors } = useTheme();
  const labelStyle = [styles.quadrantLabel, { color: colors.inkMuted }];
  return (
    <>
      <ThemedText style={[labelStyle, styles.quadrantTopLeft]}>
        NOW · LIGHT
      </ThemedText>
      <ThemedText style={[labelStyle, styles.quadrantTopRight]}>
        NOW · HEAVY
      </ThemedText>
      <ThemedText style={[labelStyle, styles.quadrantBottomLeft]}>
        LATER · LIGHT
      </ThemedText>
      <ThemedText style={[labelStyle, styles.quadrantBottomRight]}>
        LATER · HEAVY
      </ThemedText>
    </>
  );
}

// ─── Tile ──────────────────────────────────────────────────────────────────

/**
 * One draggable project tile. Long-press lifts it (scale + shadow); dragging
 * places it on the energy × urgency field; release springs it to the nearest
 * in-bounds position and commits the normalized (x, y) to storage. A short
 * tap navigates to the project.
 *
 * Reduced-motion: scale-lift becomes instant; spring settle becomes instant.
 */
function AtlasTile({
  project,
  fallback,
  canvas,
}: {
  project: DbProject;
  fallback: { x: number; y: number };
  canvas: { w: number; h: number };
}): React.ReactElement {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const [storedPos, setStoredPos, loaded] = useUiPreference<string>(
    `projects.atlas.${project.id}`,
    `${fallback.x},${fallback.y}`,
    isNormPosString,
  );
  const persisted = parseNormPos(storedPos) ?? fallback;

  const maxX = Math.max(0, canvas.w - TILE_W);
  const maxY = Math.max(0, canvas.h - TILE_H);

  const tx = useSharedValue(persisted.x * maxX);
  const ty = useSharedValue(persisted.y * maxY);
  const lift = useSharedValue(0); // 0 = at rest, 1 = lifted

  useEffect(() => {
    tx.value = persisted.x * maxX;
    ty.value = persisted.y * maxY;
  }, [loaded, persisted.x, persisted.y, maxX, maxY, tx, ty]);

  const originX = useSharedValue(tx.value);
  const originY = useSharedValue(ty.value);

  const commit = useCallback(
    (xPx: number, yPx: number): void => {
      const cx = Math.min(Math.max(0, xPx), maxX);
      const cy = Math.min(Math.max(0, yPx), maxY);
      const nx = maxX === 0 ? 0 : cx / maxX;
      const ny = maxY === 0 ? 0 : cy / maxY;
      setStoredPos(`${nx.toFixed(4)},${ny.toFixed(4)}`);
    },
    [maxX, maxY, setStoredPos],
  );

  const moved = useRef(false);

  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      originX.value = tx.value;
      originY.value = ty.value;
      lift.value = reducedMotion ? 1 : withTiming(1, { duration: 140 });
      runOnJS(setMoved)(moved, false);
      runOnJS(liftHaptic)();
    })
    .onUpdate((e) => {
      const nextX = originX.value + e.translationX;
      const nextY = originY.value + e.translationY;
      tx.value = nextX;
      ty.value = nextY;
      if (Math.abs(e.translationX) > 4 || Math.abs(e.translationY) > 4) {
        runOnJS(setMoved)(moved, true);
      }
    })
    .onEnd(() => {
      const settledX = Math.min(Math.max(0, tx.value), maxX);
      const settledY = Math.min(Math.max(0, ty.value), maxY);
      if (reducedMotion) {
        tx.value = settledX;
        ty.value = settledY;
        lift.value = 0;
      } else {
        tx.value = withSpring(settledX, { damping: 18, stiffness: 220 });
        ty.value = withSpring(settledY, { damping: 18, stiffness: 220 });
        lift.value = withTiming(0, { duration: 180 });
      }
      runOnJS(commit)(settledX, settledY);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 + lift.value * 0.06;
    return {
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { scale },
      ],
      shadowOpacity: 0.4 + lift.value * 0.25,
      shadowRadius: 10 + lift.value * 8,
      elevation: 2 + lift.value * 6,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.tileWrap, tokens.elevation.tile, animatedStyle]}
      >
        <Link
          href={{ pathname: "/project", params: { id: project.id } }}
          asChild
        >
          <Pressable
            onPress={(e) => {
              if (moved.current) e.preventDefault?.();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Project ${project.title}. Long-press to move on the energy and urgency field.`}
            style={StyleSheet.flatten([
              styles.tile,
              { backgroundColor: colors.surface },
            ])}
          >
            <ThemedText
              style={[
                styles.tileGlyph,
                !project.emoji && { color: colors.inkMuted },
              ]}
            >
              {project.emoji ?? "·"}
            </ThemedText>
            <ThemedText
              type="mono"
              numberOfLines={1}
              style={[styles.tileTitle, { color: colors.ink }]}
            >
              {project.title}
            </ThemedText>
          </Pressable>
        </Link>
      </Animated.View>
    </GestureDetector>
  );
}

function setMoved(ref: React.MutableRefObject<boolean>, v: boolean): void {
  ref.current = v;
}

function liftHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

function isNormPosString(value: string | null): value is string {
  if (!value) return false;
  return parseNormPos(value) !== null;
}

function parseNormPos(s: string): { x: number; y: number } | null {
  const parts = s.split(",");
  if (parts.length !== 2) return null;
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x, y };
}

/**
 * Quadrant readout for a normalized (x, y) on the Atlas.
 * X: light (≤0.5) | heavy (>0.5). Y: now (≤0.5) | later (>0.5).
 * The narrative voice uses this to read positions back to the user.
 */
export type AtlasQuadrant = "now·light" | "now·heavy" | "later·light" | "later·heavy";

export function quadrantFor(x: number, y: number): AtlasQuadrant {
  const heavy = x > 0.5;
  const later = y > 0.5;
  if (!later && !heavy) return "now·light";
  if (!later && heavy) return "now·heavy";
  if (later && !heavy) return "later·light";
  return "later·heavy";
}

const QUADRANT_INSET = tokens.space.sm;

const styles = StyleSheet.create({
  canvas: {
    height: CANVAS_HEIGHT,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    position: "relative",
  },
  axisVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
  },
  axisHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
  },
  quadrantLabel: {
    position: "absolute",
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.micro.size,
    lineHeight: tokens.type.micro.lineHeight,
    letterSpacing: tokens.type.micro.tracking,
  },
  quadrantTopLeft: {
    top: QUADRANT_INSET,
    left: QUADRANT_INSET,
  },
  quadrantTopRight: {
    top: QUADRANT_INSET,
    right: QUADRANT_INSET,
  },
  quadrantBottomLeft: {
    bottom: QUADRANT_INSET,
    left: QUADRANT_INSET,
  },
  quadrantBottomRight: {
    bottom: QUADRANT_INSET,
    right: QUADRANT_INSET,
  },
  tileWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    width: TILE_W,
    height: TILE_H,
  },
  tile: {
    flex: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
    gap: tokens.space.xs,
    justifyContent: "space-between",
  },
  tileGlyph: {
    fontSize: 22,
    lineHeight: 26,
  },
  tileTitle: {
    fontSize: 11,
    lineHeight: 14,
  },
});
