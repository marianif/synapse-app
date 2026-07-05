import { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

/**
 * The empty-project narration layer. Anchored to the LEFT of each fanned-out
 * FAB pill (idea · todo · deadline · note), a Caveat scrawl explains what
 * belongs there — every affordance is spoken for before the user picks one.
 *
 * Geometry is measured from the FAB, not from an arbitrary canvas: the FAB
 * sits at bottom:28 right:20, is 56px wide, pills are 44px tall stacked
 * bottom-up with 8px gap (see ProjectFab styles). The overlay computes
 * pill centers from those numbers so arrows always land right.
 *
 * The component is a full-screen `pointerEvents="none"` overlay, so the
 * fanned-out FAB below stays fully tappable. Renders NOTHING by itself when
 * invisible — no z-fight with real content.
 */

// Mirror ProjectFab's layout constants exactly.
const FAB_BOTTOM = 28;
const FAB_RIGHT = 20;
const FAB_SIZE = 56;
const PILL_HEIGHT = 44;
const PILL_GAP = tokens.space.sm; // 8
const ACTIONS_PAD_BOTTOM = tokens.space.sm; // 8, actionsContainer paddingBottom

// The four pills, top-down as ProjectFab renders them (idea first).
const PILL_ORDER = ["idea", "todo", "deadline", "note"] as const;

// Compute each pill's vertical center distance from the screen bottom.
// FAB occupies [FAB_BOTTOM, FAB_BOTTOM + FAB_SIZE]. actionsContainer sits on
// top of it, then paddingBottom, then pills stack upward with gap.
function pillCenterFromBottom(index: number): number {
  const bottomOfPills = FAB_BOTTOM + FAB_SIZE + ACTIONS_PAD_BOTTOM;
  // pills[N-1] is the bottom-most (note). Index 0 (idea) is on top.
  // distance from bottom of pill-stack to bottom of pill[index]:
  const flipped = PILL_ORDER.length - 1 - index;
  const pillBottom = bottomOfPills + flipped * (PILL_HEIGHT + PILL_GAP);
  return pillBottom + PILL_HEIGHT / 2;
}

type Anno = {
  key: (typeof PILL_ORDER)[number];
  label: string;
  hint: string;
};

const ANNOS: Anno[] = [
  { key: "idea", label: "a spark", hint: "worth keeping." },
  { key: "todo", label: "on the line", hint: "something to do." },
  { key: "deadline", label: "a horizon", hint: "the clock is chasing." },
  { key: "note", label: "a margin note", hint: "just a thought." },
];

// Approximate right edge of pill in px from the screen's right edge.
// Widest pill is "Deadline" (~110px). We anchor labels to a stable x
// left of the widest pill so nothing collides.
const PILL_WIDEST = 118;
const PILL_LEFT_EDGE_FROM_RIGHT = FAB_RIGHT + PILL_WIDEST; // ~138

// Where the label block ends (right edge). Give an 18px breathing gap
// between label and pill so the arrow has room to draw.
const LABEL_RIGHT = PILL_LEFT_EDGE_FROM_RIGHT + 18;
const LABEL_WIDTH = 200;
const LABEL_HEIGHT = 44;

// Arrow: short horizontal squiggle from label's right edge into pill's
// left edge. Drawn per row in a small SVG (width = LABEL_RIGHT - FAB_RIGHT - PILL_WIDEST, height = LABEL_HEIGHT).
const ARROW_W = LABEL_RIGHT - PILL_LEFT_EDGE_FROM_RIGHT; // 18
const ARROW_H = 20;
// Hand-tremored squiggle with arrowhead — from (2, 10) to (16, 10)
const ARROW_D =
  "M 2 10 Q 6 8 10 11 T 15 10 M 11 6 L 16 10 L 11 14";

export function ProjectEmptyFabPointer({
  visible,
}: {
  visible: boolean;
}): React.ReactElement | null {
  const { colors } = useTheme();
  const { height: screenH } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: reducedMotion ? 0 : 280,
    });
  }, [visible, opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible && opacity.value === 0) return null;

  // Top of the annotation stack: sits above the top-most pill (idea).
  const topAnnoCenterFromBottom = pillCenterFromBottom(0);
  const headlineBottom = topAnnoCenterFromBottom + LABEL_HEIGHT + 40;

  return (
    <Animated.View
      style={[styles.overlay, animatedStyle]}
      pointerEvents="none"
    >
      {/* Handwritten headline sits above the top-most pill's label. */}
      <View
        style={[
          styles.headline,
          { bottom: headlineBottom, right: LABEL_RIGHT - LABEL_WIDTH + 8 },
        ]}
      >
        <ThemedText
          type="hand"
          style={[styles.headlineText, { color: colors.ink }]}
        >
          An empty project.
        </ThemedText>
        <ThemedText
          type="hand"
          style={[styles.headlineSub, { color: colors.inkMuted }]}
        >
          Pick what belongs here.
        </ThemedText>
      </View>

      {/* One label + arrow per pill. */}
      {ANNOS.map((a, i) => {
        const centerY = pillCenterFromBottom(i);
        return (
          <View
            key={a.key}
            style={[
              styles.row,
              {
                bottom: centerY - LABEL_HEIGHT / 2,
                right: FAB_RIGHT + PILL_WIDEST,
                width: LABEL_WIDTH + ARROW_W,
                height: LABEL_HEIGHT,
              },
            ]}
          >
            <View style={styles.labelBlock}>
              <ThemedText
                type="hand"
                style={[styles.label, { color: colors.ink }]}
              >
                {a.label}
              </ThemedText>
              <ThemedText
                type="hand"
                style={[styles.hint, { color: colors.inkMuted }]}
              >
                {a.hint}
              </ThemedText>
            </View>
            <Svg
              width={ARROW_W}
              height={ARROW_H}
              viewBox={`0 0 ${ARROW_W} ${ARROW_H}`}
              style={styles.arrow}
            >
              <Path
                d={ARROW_D}
                fill="none"
                stroke={colors.inkMuted}
                strokeOpacity={0.7}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        );
      })}

      {/* Suppress the unused screenH so lint doesn't complain — we keep
          the hook so the overlay re-renders on rotation. */}
      <View style={{ height: 0, width: screenH * 0 }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headline: {
    position: "absolute",
    width: 240,
    alignItems: "flex-end",
    gap: tokens.space.xs,
  },
  headlineText: {
    fontSize: 26,
    lineHeight: 30,
    textAlign: "right",
  },
  headlineSub: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: "right",
  },
  row: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
  },
  labelBlock: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: tokens.space.sm,
  },
  label: {
    fontSize: 20,
    lineHeight: 22,
    textAlign: "right",
  },
  hint: {
    fontSize: 15,
    lineHeight: 18,
    textAlign: "right",
    marginTop: 1,
  },
  arrow: {
    marginBottom: 2,
  },
});
