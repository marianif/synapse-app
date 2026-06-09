import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { EntryCluster } from "@/components/atoms/entry-cluster";
import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, entryKicker, tokens, useTheme } from "@/constants/theme";

import { PRESENT_CHANNELS, STAKE_CHANNELS } from "./channels";

import type { Channel } from "./channels";
import type { EntryType } from "@/lib/types";

/**
 * CONSTELLATION variant of the empty field.
 *
 * Metaphor: everything is in your head as one tight cluster; the field is where
 * you scatter it. So the screen opens with the whole-field dot cluster (the
 * EntryCluster atom — all five type-colors clumped together, unsorted), then the
 * five channels fan out below as the lanes that cluster scatters into. Each lane
 * leads with its hand-drawn SketchIcon doodle and is one tap into a pre-typed
 * capture, so the first thing you log teaches the five-type model.
 *
 * Token policy: `EntryCluster`/`SketchIcon` carry the type colors; `entryKicker`
 * the AA-safe lane label; `surface` the lane body; `surfaceSubtle` the scatter
 * spine. No new token values.
 */
export function ConstellationConsole({
  greeting,
}: {
  greeting: string;
}): React.ReactElement {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();

  const openChannel = (type: EntryType): void => {
    router.push({ pathname: "/modal", params: { type } });
  };

  const renderLane = (channel: Channel, order: number): React.ReactElement => {
    const code = entryColor(channel.type);
    const labelColor = entryKicker(channel.type, scheme);

    const entering = reduced
      ? undefined
      : FadeInDown.springify()
          .damping(tokens.motion.spring.damping)
          .stiffness(tokens.motion.spring.stiffness)
          .delay(260 + order * 70);

    return (
      <Animated.View key={channel.type} entering={entering}>
        <Pressable
          onPress={() => openChannel(channel.type)}
          accessibilityRole="button"
          accessibilityLabel={`${channel.label}. Tap to ${channel.invite}.`}
          style={({ pressed }) => [
            styles.lane,
            { backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}
        >
          {/* The type's felt-tip doodle — the lane wears the tile's own glyph. */}
          <View style={styles.glyph}>
            <SketchIcon type={channel.type} size={24} />
          </View>

          <View style={styles.laneBody}>
            <View style={styles.laneTop}>
              <ThemedText
                type="label"
                style={[styles.laneLabel, { color: labelColor }]}
              >
                {channel.label}
              </ThemedText>
              <ThemedText type="body" style={{ color: colors.inkMuted }}>
                {channel.invite}
              </ThemedText>
            </View>
            <ThemedText
              type="mono"
              style={[styles.ghost, { color: colors.inkMuted }]}
            >
              {`e.g. ${channel.ghost}`}
            </ThemedText>
          </View>

          {/* Seed key — a single tap scatters this type into its lane. */}
          <ThemedText type="mono" style={[styles.seed, { color: code }]}>
            +
          </ThemedText>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.wrap}>
      {/* The brain, as one cluster — everything you carry, unsorted. */}
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(tokens.motion.duration.slow)}
        style={styles.head}
      >
        <View style={styles.clusterSlot}>
          <EntryCluster dotSize={11} gap={5} width={42} />
        </View>
        <ThemedText type="display" style={{ color: colors.ink }}>
          {greeting}
        </ThemedText>
        <ThemedText type="body" style={[styles.thesis, { color: colors.inkMuted }]}>
          It&apos;s all one cluster in your head right now. Scatter the first
          thing into the field.
        </ThemedText>
      </Animated.View>

      {/* The scatter spine — a tonal rule the lanes branch off of, no border. */}
      <View style={styles.lanes}>
        <View style={styles.laneGroup}>
          <ThemedText type="label" style={[styles.groupLabel, { color: colors.inkMuted }]}>
            Stakes
          </ThemedText>
          {STAKE_CHANNELS.map((c, i) => renderLane(c, i))}
        </View>

        <View style={styles.laneGroup}>
          <ThemedText type="label" style={[styles.groupLabel, { color: colors.inkMuted }]}>
            Present
          </ThemedText>
          {PRESENT_CHANNELS.map((c, i) =>
            renderLane(c, STAKE_CHANNELS.length + i),
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.xl,
    paddingTop: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  head: {
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  // The cluster sits above the greeting like a sigil — the field's whole palette
  // in one clump before any of it is sorted.
  clusterSlot: {
    marginBottom: tokens.space.xs,
  },
  thesis: {
    marginTop: -tokens.space.xs,
    paddingRight: tokens.space.md,
  },
  lanes: {
    gap: tokens.space.lg,
  },
  laneGroup: {
    gap: tokens.space.xs,
  },
  groupLabel: {
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.xs,
  },
  lane: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    gap: tokens.space.md,
  },
  pressed: {
    opacity: 0.7,
  },
  glyph: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  laneBody: {
    flex: 1,
    gap: tokens.space.xs,
    paddingVertical: tokens.space.md,
  },
  laneTop: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.sm,
  },
  laneLabel: {},
  ghost: {
    opacity: 0.55,
  },
  seed: {
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
  },
});
