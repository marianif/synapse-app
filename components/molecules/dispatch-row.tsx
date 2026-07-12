import { Pressable, StyleSheet, Text, View } from "react-native";

import { entryKicker, tokens, useTheme } from "@/constants/theme";

import type { Dispatch, DispatchChannel } from "@/lib/agenda-voice";
import type { EntryType } from "@/lib/types";

/**
 * One line of the board reading itself back. Three parts, top to bottom:
 *
 *   ●  <lifted thing> has sat for <a week>, still nowhere.
 *      IDEA · Collettivo Arti Visive
 *
 * The dot carries the channel. The sentence is muted grotesk with only the
 * MEANINGFUL bits lifted into Caveat + the type color — the entry title, and
 * the number when the number is the news. The eye lands on the thing first and
 * reads the scaffolding second, which is what makes the feed scannable at a
 * glance instead of a wall of handwriting.
 *
 * The mono footer is the instrument-panel line: what channel this is, and where
 * it lives. It never colors — the dot and the lift already carry the type.
 */

interface DispatchRowProps {
  dispatch: Dispatch;
  onPress: (dispatch: Dispatch) => void;
}

/** The channel's color. `note` is not an entry type, so it speaks in muted ink. */
function useChannelColor(channel: DispatchChannel): string | null {
  const { scheme } = useTheme();
  if (channel === "note") return null;
  return entryKicker(channel as EntryType, scheme);
}

export function DispatchRow({
  dispatch,
  onPress,
}: DispatchRowProps): React.ReactElement {
  const { colors } = useTheme();
  const code = useChannelColor(dispatch.channel);

  // A note has no type code, so its lifts run in full ink — still the loudest
  // thing in the line against the muted scaffolding, just not colored.
  const liftColor = code ?? colors.ink;
  const dotColor = code ?? colors.inkMuted;

  // The full sentence, flattened — what a screen reader should hear instead of
  // the segment-by-segment stutter of nested <Text> nodes.
  const spoken = dispatch.segments.map((s) => s.text).join("");

  return (
    <Pressable
      onPress={() => onPress(dispatch)}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={`${dispatch.kicker.toLowerCase()}, ${dispatch.context}. Opens it.`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />

      <View style={styles.body}>
        <Text style={[styles.line, { color: colors.inkMuted }]}>
          {dispatch.segments.map((seg, i) =>
            seg.lift ? (
              <Text key={i} style={[styles.lift, { color: liftColor }]}>
                {seg.text}
              </Text>
            ) : (
              <Text key={i}>{seg.text}</Text>
            ),
          )}
        </Text>

        <Text style={[styles.footer, { color: colors.inkMuted }]}>
          {dispatch.kicker}
          <Text style={styles.footerSep}>{"  ·  "}</Text>
          {dispatch.context}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    // The dot hangs in its own gutter so every sentence starts on one optical
    // left edge no matter how long the line runs — the spine of the feed.
    gap: tokens.space.md,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.xs,
    minHeight: 48, // 44pt iOS / 48dp Android
  },
  rowPressed: {
    opacity: 0.6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
    // Optical alignment with the first line's cap-height, not its box top.
    marginTop: 9,
  },
  body: {
    flex: 1,
    gap: tokens.space.xs,
  },
  line: {
    fontFamily: tokens.type.fontInter.regular,
    fontSize: tokens.type.item.size,
    lineHeight: 24,
  },
  // The hand. Caveat runs optically small and sits high, so it's sized up off
  // the item step and nudged down onto the grotesk baseline — same treatment as
  // CountClause and FocusLine, so all three surfaces speak in one voice.
  lift: {
    fontFamily: tokens.type.fontHand.bold,
    fontSize: 22,
    lineHeight: 24,
  },
  footer: {
    fontFamily: tokens.type.fontMono.regular,
    fontSize: tokens.type.micro.size,
    lineHeight: tokens.type.micro.lineHeight,
    letterSpacing: tokens.type.micro.tracking,
  },
  footerSep: {
    opacity: 0.5,
  },
});
