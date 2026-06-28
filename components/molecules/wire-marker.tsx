import { StyleSheet, Text, View } from "react-native";

import { tokens, useTheme } from "@/constants/theme";

interface WireMarkerProps {
  kind: "now" | "band" | "terminator";
  /** "NOW · 22:31" for the now-node; the band kicker otherwise. */
  label: string;
  /** Danger tone for the RAN OVER band kicker. */
  tone?: "default" | "danger";
}

/**
 * Punctuation on the wire. Three marks share the rail gutter so the trace
 * never breaks: the NOW node (a neutral accent diamond — the instrument's
 * needle, never a content color), band kickers (the only all-caps voice), and
 * the terminator where the clocked wire ends and the open field begins.
 */
export function WireMarker({
  kind,
  label,
  tone = "default",
}: WireMarkerProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.gutter}>
        <View
          style={[
            styles.rail,
            kind === "terminator" && styles.railEnding,
            { backgroundColor: colors.surfaceSubtle },
          ]}
        />
        {kind === "now" && (
          <View style={[styles.nowBacking, { backgroundColor: colors.paper }]}>
            <View
              style={[
                styles.nowDiamond,
                { backgroundColor: colors.accent.clay },
              ]}
            />
          </View>
        )}
        {kind === "band" && (
          <View
            style={[styles.notch, { backgroundColor: colors.surfaceSubtle }]}
          />
        )}
        {kind === "terminator" && (
          <View
            style={[styles.endCap, { backgroundColor: colors.surfaceSubtle }]}
          />
        )}
      </View>
      <Text
        style={[
          kind === "now" ? styles.nowLabel : styles.kicker,
          {
            color:
              kind === "now"
                ? colors.ink
                : tone === "danger"
                  ? colors.feedback.danger
                  : colors.inkMuted,
          },
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const GUTTER_WIDTH = 32;

const styles = StyleSheet.create({
  row: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  gutter: {
    width: GUTTER_WIDTH,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  rail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
  },
  // the wire stops at the terminator's cap, not the row's edge
  railEnding: {
    bottom: "50%",
  },
  nowBacking: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  nowDiamond: {
    width: 10,
    height: 10,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  notch: {
    width: 8,
    height: 2,
  },
  endCap: {
    width: 10,
    height: 2,
    alignSelf: "center",
    position: "absolute",
    top: "50%",
    marginTop: -1,
  },
  nowLabel: {
    fontFamily: tokens.type.fontMono.bold,
    fontSize: tokens.type.mono.size,
    lineHeight: tokens.type.mono.lineHeight,
    letterSpacing: tokens.type.kicker.tracking,
    paddingLeft: tokens.space.sm,
  },
  kicker: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.lineHeight,
    letterSpacing: tokens.type.kicker.tracking,
    paddingLeft: tokens.space.sm,
  },
});
