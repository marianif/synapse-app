import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  useReducedMotion,
  useSharedValue,
  withSpring,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";

import { ThemedText } from "@/components/atoms/themed-text";
import { FieldSummary } from "@/components/molecules/field-summary";
import { entryColor, tokens, useTheme } from "@/constants/theme";

import { CHANNELS } from "./channels";
import { FocusLine, segmentsFor } from "./focus-line";
import { OrbitDot } from "./orbit-dot";

import type { FieldRowItem, Heat } from "@/components/molecules/field-row";
import type { EntryType } from "@/lib/types";
import type { SharedValue } from "react-native-reanimated";

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

/** Orbit geometry — a square SVG canvas with the ring inset from the edge.
    Canvas is sized so a fully-grown dot (DOT_R_MAX) plus its hot halo and breath
    swell still clears the edge, the core, and its neighbors — see the clearance
    math in DOT_R_MAX's comment below. */
const CANVAS = 300;
const CENTER = CANVAS / 2;
const RING_R = 100; // orbit radius the dots ride
const DOT_R = 9; // baseline / empty-state type-dot radius
const CORE_R = 26; // central capture core radius
const HIT = 44; // touch target over each dot (HIG minimum)

/**
 * Populated-state dot sizing (Approach A — "the dots breathe").
 *
 * A type's dot radius encodes how MUCH you're carrying of it; a faint same-hue
 * glow halo behind it encodes how PRESSING it is. A type with nothing in the
 * field collapses to a quiet hollow ring — the channel still exists, it's just
 * silent. Five overdue bills read as a fat glowing dot; one stray idea, a pinprick.
 */
const DOT_R_MIN = 5; // a type carrying a single item
// A type that dominates the field (cap). At RING_R 100 on a 300 canvas this still
// leaves ~4px to the edge with a hot halo + breath swell, 46px to the core, and
// 62px between neighbors — the canvas was grown to afford this larger ceiling.
const DOT_R_MAX = 28;
const COUNT_FULL = 8; // item count at which a dot reaches DOT_R_MAX
const HOLLOW_R = 4; // empty channel — a faint ring, not a filled dot
/** Heat→glow-alpha scale (reuses field-row), used here to brighten loaded spokes. */
const GLOW_ALPHA: Record<Heat, number> = { hot: 0.22, warm: 0.12, cool: 0.05 };

/** Aggregate read of one orbiting type once the field has signal. */
type TypeSignal = {
  count: number;
  /** Hottest heat present in this type — drives the glow halo. */
  heat: Heat;
  /** This channel's own rows, in field order — named when it's focused. */
  rows: FieldRowItem[];
};

const HEAT_RANK: Record<Heat, number> = { hot: 3, warm: 2, cool: 1 };

/** Roll the field's rows up into a per-type count + peak heat + the rows
    themselves, so a focused channel can name its real contents. */
function signalFor(type: EntryType, rows: FieldRowItem[]): TypeSignal {
  const own: FieldRowItem[] = [];
  let peak = 0;
  for (const r of rows) {
    if (r.type !== type) continue;
    own.push(r);
    peak = Math.max(peak, HEAT_RANK[r.heat]);
  }
  const heat: Heat = peak >= 3 ? "hot" : peak === 2 ? "warm" : "cool";
  return { count: own.length, heat, rows: own };
}

/** Dot radius for a count — ramps DOT_R_MIN→DOT_R_MAX, hollow when empty. */
function dotRadius(count: number): number {
  if (count === 0) return HOLLOW_R;
  const t = Math.min(count, COUNT_FULL) / COUNT_FULL;
  return DOT_R_MIN + (DOT_R_MAX - DOT_R_MIN) * t;
}

/** Snappier-than-default spring for the press lunge — quick out, quick back. */
const PRESS_SPRING = { damping: 20, stiffness: 320 } as const;

/** Polar position of the i-th of n dots, starting at top (12 o'clock). */
function dotPos(i: number, n: number): { x: number; y: number } {
  const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CENTER + RING_R * Math.cos(angle),
    y: CENTER + RING_R * Math.sin(angle),
  };
}

/**
 * One press-progress shared value per channel (0 = rest, 1 = pressed). Hooks
 * can't run in a loop, so the five values are declared explicitly — CHANNELS is
 * a fixed-length constant, so this stays in lockstep with it.
 */
function useChannelPresses(): SharedValue<number>[] {
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);
  const d = useSharedValue(0);
  const e = useSharedValue(0);
  return [a, b, c, d, e];
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
  const { scheme, colors } = useTheme();
  const reduced = useReducedMotion();
  const presses = useChannelPresses();

  // Which channel the companion is currently reading aloud. Tapping a populated
  // dot focuses it; tapping the same dot again clears focus. The core's capture
  // is untouched — a dot tap READS the field, the core WRITES to it.
  const [focusedType, setFocusedType] = useState<EntryType | null>(null);

  // A silent channel has nothing to read, so its tap falls back to a pre-typed
  // capture — the only case where a dot still writes instead of reads.
  const openChannel = (type: EntryType): void => {
    router.push({ pathname: "/modal", params: { type } });
  };

  const n = CHANNELS.length;

  // The field is clear when there are no stakes and nothing present. Empty keeps
  // the "brain's in orbit" thesis; populated swaps it for the field summary.
  const empty = stakes.length === 0 && present.length === 0;

  // Per-type rollup that drives the breathing dots. Stakes (deadline/todo) and
  // present (idea/event/someday) are separate streams; a type only ever appears
  // in its own stream, so concatenating is safe and signalFor filters by type.
  const rows = [...stakes, ...present];
  const signals = CHANNELS.map((c) => signalFor(c.type, rows));

  // Live instrument readout: how many types carry pressing (hot) signal, and the
  // total in the field — replacing the idle "5 in orbit · 0 landed".
  const pressing = signals.filter((s) => s.heat === "hot" && s.count > 0).length;
  const inField = rows.length;

  // The focused channel's rows, if any. Focus only "takes" when the channel
  // still has something to read — a channel that's since emptied (or never had
  // rows) yields no segments, so the header falls back to the field summary.
  const focusedSignal = focusedType
    ? signals[CHANNELS.findIndex((c) => c.type === focusedType)]
    : null;
  const hasFocus =
    !!focusedType &&
    !!focusedSignal &&
    segmentsFor(focusedType, focusedSignal.rows) !== null;

  // Toggle focus on a populated dot: re-tapping the focused channel clears it.
  const toggleFocus = (type: EntryType): void => {
    setFocusedType((cur) => (cur === type ? null : type));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        {/* Instrument-panel readout — names the idle orbit state in the mono
            signal voice, so the header carries the metaphor before the SVG. */}
        <ThemedText
          type="label"
          style={[styles.kicker, { color: colors.inkMuted }]}
        >
          {empty
            ? `${n} in orbit · 0 landed`
            : hasFocus
              ? `${focusedType} · tap again to clear`
              : `${pressing} pressing · ${inField} in field`}
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
        ) : hasFocus ? (
          // The companion's read of the poked channel — same muted-body voice as
          // the field summary, with the real items lifted in the agenda hand.
          <FocusLine
            type={focusedType!}
            rows={focusedSignal!.rows}
            scheme={scheme}
            muted={colors.inkMuted}
          />
        ) : (
          <FieldSummary stakes={stakes} present={present} />
        )}
      </View>

      {/* The orbit — SVG ring + spokes, with tappable dots overlaid for hit-area. */}
      <Animated.View
        entering={
          reduced ? undefined : FadeIn.duration(tokens.motion.duration.slow)
        }
        style={styles.orbit}
      >
        <Svg width={CANVAS} height={CANVAS}>
          {/* The ring the mind circles — tonal, not a hard border. Stroked in
              muted ink at low opacity so it reads in BOTH schemes: surfaceSubtle
              goes darker-than-paper in dark mode and all but vanishes, whereas
              inkMuted sits clear of paper either way (dark grey-blue on light,
              light slate on dark). Low opacity keeps it soft, not a border. */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RING_R}
            stroke={colors.inkMuted}
            strokeOpacity={0.22}
            strokeWidth={2}
            fill="none"
          />
          {/* Spokes — faint lines from the core out to each type, the pull-paths.
              When populated, a heavier type grows a thicker, brighter artery. */}
          {CHANNELS.map((c, i) => {
            const { x, y } = dotPos(i, n);
            const s = signals[i];
            const loaded = !empty && s.count > 0;
            // Scale stroke with the dot it feeds; idle/empty keeps the 1.5 baseline.
            const width = loaded ? 1.5 + (dotRadius(s.count) - DOT_R_MIN) * 0.18 : 1.5;
            let opacity = loaded ? 0.18 + GLOW_ALPHA[s.heat] * 0.6 : 0.18;
            // When a channel is focused, its artery brightens and the rest recede,
            // so the eye follows the spoke down to the dot you're reading.
            if (focusedType) {
              opacity =
                focusedType === c.type ? Math.min(opacity * 1.6, 0.6) : opacity * 0.35;
            }
            return (
              <Line
                key={`spoke-${c.type}`}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke={entryColor(c.type)}
                strokeWidth={width}
                strokeOpacity={opacity}
              />
            );
          })}
          {/* Orbiting type-dots, drawn in SVG so they sit exactly on the ring.
              Populated: radius encodes count, a same-hue halo encodes peak heat,
              and an empty channel collapses to a faint hollow ring. */}
          {CHANNELS.map((c, i) => {
            const { x, y } = dotPos(i, n);
            const code = entryColor(c.type);
            const s = signals[i];

            // Empty field — keep the original uniform, fully-filled orbit.
            if (empty) {
              return (
                <Circle key={`dot-${c.type}`} cx={x} cy={y} r={DOT_R} fill={code} />
              );
            }

            // A silent channel: a faint hollow ring, no fill, no halo.
            if (s.count === 0) {
              return (
                <Circle
                  key={`dot-${c.type}`}
                  cx={x}
                  cy={y}
                  r={HOLLOW_R}
                  fill="none"
                  stroke={code}
                  strokeWidth={1.5}
                  strokeOpacity={0.35}
                />
              );
            }

            // Loaded channel — an animated dot that blooms on mount and lunges
            // toward the core on press (radius + halo handled inside OrbitDot).
            return (
              <OrbitDot
                key={`dot-${c.type}`}
                x={x}
                y={y}
                cx={CENTER}
                cy={CENTER}
                radius={dotRadius(s.count)}
                count={s.count}
                heat={s.heat}
                color={code}
                index={i}
                pressed={presses[i]}
                dimmed={focusedType !== null && focusedType !== c.type}
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
          const s = signals[i];
          // Populated dots read their channel aloud on tap; empty/idle keep the
          // invite (those route to a pre-typed capture, since there's nothing to
          // read yet).
          const focusedHere = focusedType === c.type;
          const label =
            empty || s.count === 0
              ? `${c.label}. Tap to ${c.invite}.`
              : focusedHere
                ? `${c.label} focused. Tap to clear.`
                : `${c.label}, ${s.count} in field${
                    s.heat === "hot" ? ", pressing" : ""
                  }. Tap to read it.`;
          // A loaded dot reacts to touch (lunge + flare); empty/idle channels
          // have no animated dot, so they keep the plain opacity-dip feedback.
          const reactive = !empty && s.count > 0;
          const press = presses[i];
          return (
            <Animated.View
              key={`hit-${c.type}`}
              entering={reduced ? undefined : ZoomIn.delay(200 + i * 60)}
              style={[styles.hit, { left: x - HIT / 2, top: y - HIT / 2 }]}
            >
              <Pressable
                onPress={() =>
                  reactive ? toggleFocus(c.type) : openChannel(c.type)
                }
                onPressIn={
                  reactive
                    ? () => {
                        press.value = withSpring(1, PRESS_SPRING);
                      }
                    : undefined
                }
                onPressOut={
                  reactive
                    ? () => {
                        press.value = withSpring(0, PRESS_SPRING);
                      }
                    : undefined
                }
                accessibilityRole="button"
                accessibilityLabel={label}
                style={styles.hitInner}
                hitSlop={6}
              />
            </Animated.View>
          );
        })}
      </Animated.View>
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
