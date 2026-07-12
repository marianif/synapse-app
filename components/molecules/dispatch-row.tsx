import { Pressable, StyleSheet, Text, View } from "react-native";

import { entryKicker, tokens, useTheme } from "@/constants/theme";

import type { Dispatch, DispatchChannel } from "@/lib/agenda-voice";
import type { EntryType } from "@/lib/types";

/**
 * One line of the board reading itself back:
 *
 *   ●  Book the dentist closes this week — 6d left.
 *      DEADLINE  ·  Salute
 *
 * THREE TYPE REGISTERS, three jobs. This is the whole design of the row:
 *
 *   • THE HAND (Caveat, type-colored) — the SUBJECT, and only the subject.
 *     Exactly one per line. It is the thing the sentence is about, scrawled the
 *     way you'd underline a name in a margin.
 *   • THE INSTRUMENT (mono, type-colored) — the MEASURE. Days, counts,
 *     fractions, times. Numbers belong in the mono signal layer, not the hand;
 *     the app already speaks that way in every kicker and counter, and it keeps
 *     the number readable when the hand would blur it.
 *   • THE SENTENCE (grotesk, muted) — everything else. It carries, it doesn't
 *     shout.
 *
 * The earlier draft put BOTH the subject and the number in Caveat, at 22px
 * against a 16px sentence. The result was two competing headlines with a
 * whisper trapped between them, and long lifts orphaned words onto their own
 * line. The hand now sits at 19px against a 17/26 sentence: an inflection
 * inside the line, not a banner over it.
 *
 * HEAT varies SPACE, never color. A hot dispatch (something ran out, something
 * is colliding) breathes wider and runs a slightly larger sentence. Every type
 * still glows at identical intensity — DESIGN.md's Equal Volume rule holds, and
 * the calm lines are never dimmed to make the hot ones look urgent.
 */

interface DispatchRowProps {
  dispatch: Dispatch;
  onPress: (dispatch: Dispatch) => void;
}

/**
 * The channel's color. `note` and `board` are not entry types — they speak in
 * ink, so a pattern or a board-level fact never masquerades as a type code.
 */
function useChannelColor(channel: DispatchChannel): string | null {
  const { scheme } = useTheme();
  if (channel === "note" || channel === "board") return null;
  return entryKicker(channel as EntryType, scheme);
}

export function DispatchRow({
  dispatch,
  onPress,
}: DispatchRowProps): React.ReactElement {
  const { colors } = useTheme();
  const code = useChannelColor(dispatch.channel);
  const hot = dispatch.heat === "hot";

  // A typeless channel still lifts — it just lifts in full ink. The subject is
  // always the loudest thing in the line; only its hue is negotiable.
  const liftColor = code ?? colors.ink;
  const dotColor = code ?? colors.inkMuted;

  // The flattened sentence — what a screen reader should hear, instead of the
  // segment-by-segment stutter of nested <Text> nodes.
  const spoken = dispatch.segments.map((s) => s.text).join("");

  return (
    <Pressable
      onPress={() => onPress(dispatch)}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={`${dispatch.kicker.toLowerCase()}, ${dispatch.context}. Opens it.`}
      style={({ pressed }) => [
        styles.row,
        hot ? styles.rowHot : styles.rowCalm,
        pressed && styles.rowPressed,
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: dotColor },
          hot ? styles.dotHot : styles.dotCalm,
        ]}
      />

      <View style={styles.body}>
        <Text
          style={[
            styles.line,
            hot && styles.lineHot,
            { color: colors.inkMuted },
          ]}
        >
          {dispatch.segments.map((seg, i) => {
            if (seg.kind === "lift") {
              return (
                <Text
                  key={i}
                  style={[styles.lift, hot && styles.liftHot, { color: liftColor }]}
                >
                  {seg.text}
                </Text>
              );
            }
            if (seg.kind === "measure") {
              return (
                <Text key={i} style={[styles.measure, { color: liftColor }]}>
                  {seg.text}
                </Text>
              );
            }
            return <Text key={i}>{seg.text}</Text>;
          })}
        </Text>

        <View style={styles.footer}>
          {/* The kicker takes the channel color so the eye can sort the feed by
              type without reading a word; the context stays muted so the two
              never compete. */}
          <Text style={[styles.kicker, { color: dotColor }]}>
            {dispatch.kicker}
          </Text>
          <Text style={[styles.sep, { color: colors.inkMuted }]}>·</Text>
          <Text
            style={[styles.context, { color: colors.inkMuted }]}
            numberOfLines={1}
          >
            {dispatch.context}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    // The dot hangs in its own gutter, so every sentence starts on one optical
    // left edge however long it runs — the spine of the feed.
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.xs,
    minHeight: 48, // 44pt iOS / 48dp Android
  },
  // Heat is SPACE, not color. Hot lines get room to be read; calm lines sit
  // closer together. Neither is dimmed.
  rowHot: {
    paddingVertical: tokens.space.lg,
  },
  rowCalm: {
    paddingVertical: tokens.space.md,
  },
  rowPressed: {
    opacity: 0.55,
  },
  dot: {
    borderRadius: 4,
    flexShrink: 0,
  },
  dotHot: {
    width: 7,
    height: 7,
    marginTop: 10,
  },
  dotCalm: {
    width: 6,
    height: 6,
    marginTop: 9,
  },
  body: {
    flex: 1,
    gap: tokens.space.sm,
  },
  // The sentence. Generous leading, because the hand and the mono both sit
  // inside it and a tight line would let their ascenders collide.
  line: {
    fontFamily: tokens.type.fontInter.regular,
    fontSize: 16,
    lineHeight: 26,
  },
  lineHot: {
    fontSize: 17,
    lineHeight: 27,
  },
  // The hand — the subject, once per line. Caveat runs optically small, so it
  // is sized up off the sentence step; but it stays close enough to the body
  // that it inflects the line instead of replacing it.
  lift: {
    fontFamily: tokens.type.fontHand.bold,
    fontSize: 19,
    lineHeight: 26,
  },
  liftHot: {
    fontSize: 21,
    lineHeight: 27,
  },
  // The instrument — every number in the feed. Same voice as the counters and
  // kickers everywhere else in the app.
  measure: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: 14,
    lineHeight: 26,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  kicker: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.lineHeight,
    letterSpacing: tokens.type.kicker.tracking,
  },
  sep: {
    fontFamily: tokens.type.fontMono.regular,
    fontSize: tokens.type.kicker.size,
    opacity: 0.5,
  },
  context: {
    flex: 1,
    fontFamily: tokens.type.fontMono.regular,
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.lineHeight,
    letterSpacing: 0.4,
  },
});
