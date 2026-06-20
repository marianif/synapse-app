import { Link } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";
import { useUiPreference } from "@/hooks/use-ui-preference";

import type { DbProject } from "@/lib/types";

/**
 * Atlas — a free-form 2D canvas of project tiles. Spatial memory, not
 * alphabetical scanning. Each tile remembers a normalized (x, y) in [0, 1]
 * so the layout survives device rotation and screen-size changes.
 *
 * Why: the persona builds spatial mental maps faster than alphabetical ones.
 * "Dev project lives top-left, art collective bottom-right." That's the
 * literal product framing — a second brain, not a list.
 *
 * Persistence: useUiPreference per project, key `projects.atlas.<id>`,
 * value `"x,y"` floats. Archived projects keep their position (fade in
 * place) so the spatial memory survives archival.
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
    // Add a small inset so tiles don't kiss the canvas edges.
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
      {size
        ? projects.map((p, i) => (
            <AtlasTile
              key={p.id}
              project={p}
              fallback={fallbackPos(i, projects.length)}
              canvas={size}
            />
          ))
        : null}
    </View>
  );
}

// ─── Tile ──────────────────────────────────────────────────────────────────

/**
 * One draggable project tile. Long-press lifts it; dragging moves it; release
 * springs it to the nearest in-bounds position and commits the normalized
 * (x, y) to storage. A short tap (no drag) navigates to the project.
 *
 * Two ways the tile can be in motion:
 *   • Active drag — translateX/Y follow the gesture from a captured origin.
 *   • Settle — withSpring to the committed coordinates after release.
 *
 * Reduced-motion: spring is replaced by an instant set (motion is presence,
 * not pulse — but vestibular safety wins over expression).
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
  const archived = project.status === "archived";

  // Persisted position as "x,y" floats in [0,1]. The validator narrows the
  // raw string from storage; an invalid value falls back to the auto-layout
  // coordinate so the tile is never invisible.
  const [storedPos, setStoredPos] = useUiPreference<string>(
    `projects.atlas.${project.id}`,
    `${fallback.x},${fallback.y}`,
    isNormPosString,
  );
  const persisted = parseNormPos(storedPos) ?? fallback;

  // Maximum (x, y) in pixels that keeps the tile fully inside the canvas.
  const maxX = Math.max(0, canvas.w - TILE_W);
  const maxY = Math.max(0, canvas.h - TILE_H);

  // Pixel position drives the visual transform. We seed it from the stored
  // normalized coords and keep it in sync via the gesture below.
  const tx = useSharedValue(persisted.x * maxX);
  const ty = useSharedValue(persisted.y * maxY);

  // Origin captured at gesture start so finger-relative motion works even
  // after multiple drags.
  const originX = useSharedValue(tx.value);
  const originY = useSharedValue(tx.value);

  const commit = useCallback(
    (xPx: number, yPx: number): void => {
      // Clamp into bounds, then normalize. The clamp also defends against
      // a canvas resize mid-drag.
      const cx = Math.min(Math.max(0, xPx), maxX);
      const cy = Math.min(Math.max(0, yPx), maxY);
      const nx = maxX === 0 ? 0 : cx / maxX;
      const ny = maxY === 0 ? 0 : cy / maxY;
      setStoredPos(`${nx.toFixed(4)},${ny.toFixed(4)}`);
    },
    [maxX, maxY, setStoredPos],
  );

  // Track "did the user actually drag, or just tap?" — short displacements
  // are treated as taps so the underlying <Link> wins. The threshold is a
  // few pixels of slop; below that, even a slightly imperfect tap navigates.
  const moved = useRef(false);

  const pan = Gesture.Pan()
    .activateAfterLongPress(180) // long-press to lift — tap stays for navigation
    .onStart(() => {
      originX.value = tx.value;
      originY.value = ty.value;
      runOnJS(setMoved)(moved, false);
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
      // Settle into the clamped position.
      const settledX = Math.min(Math.max(0, tx.value), maxX);
      const settledY = Math.min(Math.max(0, ty.value), maxY);
      if (reducedMotion) {
        tx.value = settledX;
        ty.value = settledY;
      } else {
        tx.value = withSpring(settledX, { damping: 18, stiffness: 220 });
        ty.value = withSpring(settledY, { damping: 18, stiffness: 220 });
      }
      runOnJS(commit)(settledX, settledY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  // The tile itself is a Link (tap = open). The GestureDetector wraps it to
  // catch the long-press-drag without stealing the short tap.
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.tileWrap, animatedStyle]}>
        <Link
          href={{ pathname: "/project", params: { id: project.id } }}
          asChild
        >
          <Pressable
            onPress={(e) => {
              // If the user dragged, the press still fires on some platforms;
              // suppress navigation in that case so a drag never feels like a
              // mis-open.
              if (moved.current) e.preventDefault?.();
            }}
            accessibilityRole="button"
            accessibilityLabel={
              archived
                ? `Archived project ${project.title}. Long-press to move.`
                : `Project ${project.title}. Long-press to move.`
            }
            style={StyleSheet.flatten([
              styles.tile,
              {
                backgroundColor: archived
                  ? colors.surfaceSubtle
                  : colors.surface,
              },
              tokens.elevation.tile,
            ])}
          >
            <ThemedText
              style={[
                styles.tileGlyph,
                (!project.emoji || archived) && { color: colors.inkMuted },
              ]}
            >
              {project.emoji ?? "·"}
            </ThemedText>
            <ThemedText
              type="mono"
              numberOfLines={1}
              style={[
                styles.tileTitle,
                { color: archived ? colors.inkMuted : colors.ink },
              ]}
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

const styles = StyleSheet.create({
  canvas: {
    height: CANVAS_HEIGHT,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    position: "relative",
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
