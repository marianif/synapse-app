import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, entryKicker, tokens, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

/**
 * The empty-field state, designed as a POWERED-ON CONSOLE rather than a vacancy.
 *
 * At zero entries the home has nothing to show, so instead of two grey "·0"
 * hint-slabs it shows the latent structure of the field itself: the five entry
 * channels, lit at equal volume (Field Lab's core rule), grouped under the same
 * STAKES / PRESENT divisions the populated board uses. Each channel is a single
 * tap that pre-opens capture for that type, and each carries a faint GHOST of a
 * real example — so the empty board also narrates what a full one looks like.
 *
 * Token policy: `entryColor` rides each channel's lit edge-code + seed key (the
 * "powered-on, no signal yet" read, at equal volume per type); `entryKicker`
 * rides the AA-safe channel label; `surface` is the slot body, `surfaceSubtle`
 * the tonal divider rule. Sharp `radius.sm` slots, mono signal layer. No new
 * token values.
 */

/** One lit channel: a type, its plain-language invite, and a ghost example. */
type Channel = {
  type: EntryType;
  /** All-caps channel name (mono kicker). */
  label: string;
  /** What a tap does, in plain words. */
  invite: string;
  /** A faint example of what this channel would hold, once it has signal. */
  ghost: string;
};

/** STAKES channels — things with consequence. */
const STAKE_CHANNELS: Channel[] = [
  {
    type: "deadline",
    label: "Bills",
    invite: "log something due",
    ghost: "Electric bill · 3d",
  },
  {
    type: "todo",
    label: "Todo",
    invite: "log a task",
    ghost: "Reply to Sam · now",
  },
];

/** PRESENT channels — things that must stay visible. */
const PRESENT_CHANNELS: Channel[] = [
  {
    type: "idea",
    label: "Ideas",
    invite: "catch a thought",
    ghost: "Podcast about cities",
  },
  {
    type: "event",
    label: "Event",
    invite: "pin a date",
    ghost: "Dentist · Fri 9:00",
  },
  {
    type: "someday",
    label: "Someday",
    invite: "park a maybe",
    ghost: "Learn to sail",
  },
];

interface FieldConsoleProps {
  /** Greeting line, already time-resolved by the parent (keeps this pure). */
  greeting: string;
}

export function FieldConsole({
  greeting,
}: FieldConsoleProps): React.ReactElement {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();

  // Pre-open capture for a channel: the modal reads `type` and lands ready to
  // type into the right category, so the very first capture teaches the model.
  const openChannel = (type: EntryType): void => {
    router.push({ pathname: "/modal", params: { type } });
  };

  const renderChannel = (channel: Channel, order: number): React.ReactElement => {
    const code = entryColor(channel.type);
    const labelColor = entryKicker(channel.type, scheme);

    const entering = reduced
      ? undefined
      : FadeInDown.springify()
          .damping(tokens.motion.spring.damping)
          .stiffness(tokens.motion.spring.stiffness)
          .delay(120 + order * 60);

    return (
      <Animated.View key={channel.type} entering={entering}>
        <Pressable
          onPress={() => openChannel(channel.type)}
          accessibilityRole="button"
          accessibilityLabel={`${channel.label} channel. Tap to ${channel.invite}.`}
          style={({ pressed }) => [
            styles.channel,
            { backgroundColor: colors.surface },
            pressed && styles.channelPressed,
          ]}
        >
          {/* Lit edge-code — the channel's electric identity, at equal volume. */}
          <View style={[styles.edge, { backgroundColor: code }]} />

          <View style={styles.channelBody}>
            <View style={styles.channelTop}>
              <ThemedText
                type="label"
                style={[styles.channelLabel, { color: labelColor }]}
              >
                {channel.label}
              </ThemedText>
              <ThemedText type="body" style={{ color: colors.inkMuted }}>
                {channel.invite}
              </ThemedText>
            </View>

            {/* Ghost example — what signal on this channel looks like. */}
            <ThemedText
              type="mono"
              style={[styles.ghost, { color: colors.inkMuted }]}
            >
              {`e.g. ${channel.ghost}`}
            </ThemedText>
          </View>

          {/* The seed key — a single tap arms capture for this type. */}
          <ThemedText type="mono" style={[styles.plus, { color: code }]}>
            +
          </ThemedText>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.wrap}>
      <ThemedText type="display" style={{ color: colors.ink }}>
        {greeting}
      </ThemedText>
      <ThemedText type="body" style={[styles.thesis, { color: colors.inkMuted }]}>
        Your whole brain on one board. Five channels, lit and waiting — tap one
        to put the first thing on it.
      </ThemedText>

      <View style={styles.group}>
        <Division label="Stakes" caption="What burns down." colors={colors} />
        {STAKE_CHANNELS.map((c, i) => renderChannel(c, i))}
      </View>

      <View style={styles.group}>
        <Division
          label="Present"
          caption="What to keep alive."
          colors={colors}
        />
        {PRESENT_CHANNELS.map((c, i) =>
          renderChannel(c, STAKE_CHANNELS.length + i),
        )}
      </View>
    </View>
  );
}

/** A zone divider — mirrors the populated board's STAKES / PRESENT headers. */
function Division({
  label,
  caption,
  colors,
}: {
  label: string;
  caption: string;
  colors: ReturnType<typeof useTheme>["colors"];
}): React.ReactElement {
  return (
    <View style={styles.division}>
      <ThemedText type="label" style={{ color: colors.inkMuted }}>
        {label}
      </ThemedText>
      <View
        style={[styles.divisionRule, { backgroundColor: colors.surfaceSubtle }]}
      />
      <ThemedText type="caption" style={{ color: colors.inkMuted }}>
        {caption}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.md,
    paddingTop: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  thesis: {
    marginTop: -tokens.space.xs,
    paddingRight: tokens.space.md,
  },
  group: {
    gap: tokens.space.xs,
    marginTop: tokens.space.sm,
  },
  // Zone divider: inline kicker + tonal rule, no border — the board's idiom.
  division: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.xs,
  },
  divisionRule: {
    flex: 1,
    height: 2,
    borderRadius: tokens.radius.pill,
  },
  // A channel slot: sharp instrument-panel edge, lit edge-code, ghost readout.
  channel: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    borderRadius: tokens.radius.sm,
    overflow: "hidden",
    paddingRight: tokens.space.lg,
  },
  channelPressed: {
    opacity: 0.7,
  },
  edge: {
    width: 4,
    alignSelf: "stretch",
  },
  channelBody: {
    flex: 1,
    gap: tokens.space.xs,
    paddingVertical: tokens.space.md,
    paddingLeft: tokens.space.md,
  },
  channelTop: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.sm,
  },
  channelLabel: {},
  // Ghost: dimmed mono — reads as a faint sample, not real data.
  ghost: {
    opacity: 0.55,
  },
  // The seed key — large, in the channel's own electric hue.
  plus: {
    fontSize: tokens.type.title.size,
    lineHeight: tokens.type.title.lineHeight,
  },
});
