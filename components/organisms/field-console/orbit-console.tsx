import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useReducedMotion,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";

import { ThemedText } from "@/components/atoms/themed-text";
import { FieldSummary } from "@/components/molecules/field-summary";
import { entryColor, entryKicker, tokens, useTheme } from "@/constants/theme";

import { CHANNELS } from "./channels";

import type { FieldRowItem } from "@/components/molecules/field-row";
import type { EntryType } from "@/lib/types";

/**
 * ORBIT variant of the empty field.
 *
 * Metaphor: your scattered mind, in orbit around the one place it can land —
 * capture. The five types circle a central capture point on an SVG ring; tapping
 * any one pulls that type down into a pre-typed capture. A legend below names the
 * five (the dots alone can't carry an AA label), each row also tappable, so the
 * affordance never depends on hitting a small orbiting dot.
 *
 * Motion: dots settle INTO orbit once on mount (ZoomIn), then hold still — no
 * continuous rotation (the design system bans looping motion, and a spinning
 * target is unhittable). Reduced motion drops the settle entirely.
 *
 * Token policy: `entryColor` for the orbiting dots + spokes + legend codes,
 * `entryKicker` for AA-safe legend labels, neutral `accent.clay` for the capture
 * core, `surfaceSubtle` for the ring stroke. No new token values.
 */

/** Orbit geometry — a square SVG canvas with the ring inset from the edge. */
const CANVAS = 240;
const CENTER = CANVAS / 2;
const RING_R = 92; // orbit radius the dots ride
const DOT_R = 9; // orbiting type-dot radius
const CORE_R = 26; // central capture core radius
const HIT = 44; // touch target over each dot (HIG minimum)

/** Polar position of the i-th of n dots, starting at top (12 o'clock). */
function dotPos(i: number, n: number): { x: number; y: number } {
  const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CENTER + RING_R * Math.cos(angle),
    y: CENTER + RING_R * Math.sin(angle),
  };
}

export function OrbitConsole({
  greeting,
  stakes,
  present,
}: {
  greeting: string;
  stakes: FieldRowItem[];
  present: FieldRowItem[];
}): React.ReactElement {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();

  const openChannel = (type: EntryType): void => {
    router.push({ pathname: "/modal", params: { type } });
  };

  const n = CHANNELS.length;

  // The field is clear when there are no stakes and nothing present. Empty keeps
  // the "brain's in orbit" thesis; populated swaps it for the field summary.
  const empty = stakes.length === 0 && present.length === 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        {/* Instrument-panel readout — names the idle orbit state in the mono
            signal voice, so the header carries the metaphor before the SVG. */}
        <ThemedText type="label" style={[styles.kicker, { color: colors.inkMuted }]}>
          {`${n} in orbit · 0 landed`}
        </ThemedText>
        <ThemedText type="display" style={{ color: colors.ink }}>
          {greeting}
        </ThemedText>
        {empty ? (
          <ThemedText
            type="body"
            style={[styles.thesis, { color: colors.inkMuted }]}
          >
            Your whole brain&apos;s in orbit. Pull the first thing down into the
            field.
          </ThemedText>
        ) : (
          <FieldSummary stakes={stakes} present={present} />
        )}
      </View>

      {/* The orbit — SVG ring + spokes, with tappable dots overlaid for hit-area. */}
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(tokens.motion.duration.slow)}
        style={styles.orbit}
      >
        <Svg width={CANVAS} height={CANVAS}>
          {/* The ring the mind circles — tonal, not a hard border. */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RING_R}
            stroke={colors.surfaceSubtle}
            strokeWidth={2}
            fill="none"
          />
          {/* Spokes — faint lines from the core out to each type, the pull-paths. */}
          {CHANNELS.map((c, i) => {
            const { x, y } = dotPos(i, n);
            return (
              <Line
                key={`spoke-${c.type}`}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke={entryColor(c.type)}
                strokeWidth={1.5}
                strokeOpacity={0.18}
              />
            );
          })}
          {/* Orbiting type-dots, drawn in SVG so they sit exactly on the ring. */}
          {CHANNELS.map((c, i) => {
            const { x, y } = dotPos(i, n);
            return (
              <Circle
                key={`dot-${c.type}`}
                cx={x}
                cy={y}
                r={DOT_R}
                fill={entryColor(c.type)}
              />
            );
          })}
        </Svg>

        {/* Central capture core — the gravity well everything lands in. Tapping it
            opens a free capture (no pre-typed type), like the always-on bar. */}
        <Animated.View
          entering={reduced ? undefined : ZoomIn.delay(160)}
          style={styles.coreSlot}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={() => router.push("/modal")}
            accessibilityRole="button"
            accessibilityLabel="Capture anything"
            style={({ pressed }) => [
              styles.core,
              { backgroundColor: colors.accent.clay },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="title"
              style={[styles.corePlus, { color: colors.accent.onClay }]}
            >
              +
            </ThemedText>
          </Pressable>
        </Animated.View>

        {/* Invisible 44pt hit-targets over each orbiting dot — the real affordance.
            Kept separate from the SVG so each gets a proper touch size + label. */}
        {CHANNELS.map((c, i) => {
          const { x, y } = dotPos(i, n);
          return (
            <Animated.View
              key={`hit-${c.type}`}
              entering={reduced ? undefined : ZoomIn.delay(200 + i * 60)}
              style={[
                styles.hit,
                { left: x - HIT / 2, top: y - HIT / 2 },
              ]}
            >
              <Pressable
                onPress={() => openChannel(c.type)}
                accessibilityRole="button"
                accessibilityLabel={`${c.label}. Tap to ${c.invite}.`}
                style={styles.hitInner}
                hitSlop={6}
              />
            </Animated.View>
          );
        })}
      </Animated.View>

      {/* Legend — the five types named, each row tappable so the affordance never
          rides on hitting a small dot. Code dot + AA-safe kicker label. */}
      <View style={styles.legend}>
        {CHANNELS.map((c, i) => {
          const entering = reduced
            ? undefined
            : FadeInDown.springify()
                .damping(tokens.motion.spring.damping)
                .stiffness(tokens.motion.spring.stiffness)
                .delay(360 + i * 50);
          return (
            <Animated.View key={c.type} entering={entering}>
              <Pressable
                onPress={() => openChannel(c.type)}
                accessibilityRole="button"
                accessibilityLabel={`${c.label}. Tap to ${c.invite}.`}
                style={({ pressed }) => [styles.legendRow, pressed && styles.pressed]}
              >
                <View style={[styles.legendDot, { backgroundColor: entryColor(c.type) }]} />
                <ThemedText
                  type="label"
                  style={[styles.legendLabel, { color: entryKicker(c.type, scheme) }]}
                >
                  {c.label}
                </ThemedText>
                <ThemedText type="body" style={{ color: colors.inkMuted }}>
                  {c.invite}
                </ThemedText>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.lg,
    paddingTop: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  head: {
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  kicker: {
    marginBottom: -tokens.space.xs,
  },
  thesis: {
    marginTop: -tokens.space.xs,
    paddingRight: tokens.space.md,
  },
  orbit: {
    width: CANVAS,
    height: CANVAS,
    alignSelf: "center",
  },
  // Center the core over the SVG midpoint.
  coreSlot: {
    position: "absolute",
    left: CENTER - CORE_R,
    top: CENTER - CORE_R,
    width: CORE_R * 2,
    height: CORE_R * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  core: {
    width: CORE_R * 2,
    height: CORE_R * 2,
    borderRadius: CORE_R,
    alignItems: "center",
    justifyContent: "center",
    ...tokens.elevation.tile,
  },
  corePlus: {
    lineHeight: CORE_R * 2,
  },
  hit: {
    position: "absolute",
    width: HIT,
    height: HIT,
  },
  hitInner: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  legend: {
    gap: tokens.space.xs,
    paddingTop: tokens.space.xs,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.md,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  legendLabel: {
    width: 64,
  },
});
