import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { useTheme, tokens } from "@/constants/theme";

export interface ReadoutLine {
  /** Mono all-caps key, e.g. "DATE". */
  key: string;
  /** Mono value, e.g. "12 JUN 2026". */
  value: string;
  /**
   * Optional signal dot color. When set, a 6px filled dot precedes the value —
   * used for the STATUS line so status reads as a single saturated signal,
   * matching the dot-coded items on the home Field.
   */
  dotColor?: string;
}

interface DetailReadoutProps {
  lines: ReadoutLine[];
}

/**
 * Instrument-panel telemetry block for the detail screen.
 *
 * Date / time / status / repeat are exactly the signal the mono layer exists
 * for, so the readout speaks in `type === "mono"` throughout — the Field Lab
 * instrument voice, applied where it fits hardest. Each line is a mono key on
 * the left and a mono value on the right, seated on the recessed surface with
 * tonal layering (no borders). The STATUS line carries a saturated signal dot.
 */
export function DetailReadout({ lines }: DetailReadoutProps): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={[styles.block, { backgroundColor: colors.surfaceSubtle }]}>
      {lines.map((line) => (
        <View key={line.key} style={styles.line}>
          <ThemedText type="mono" muted style={styles.key}>
            {line.key}
          </ThemedText>
          <View style={styles.valueSlot}>
            {line.dotColor ? (
              <View style={[styles.dot, { backgroundColor: line.dotColor }]} />
            ) : null}
            <ThemedText type="mono" style={styles.value} numberOfLines={2}>
              {line.value}
            </ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Glance telemetry, not a reading surface — dense rows so a deadline's
  // STATUS / DUE / TIME / REPEAT reads as a compact strip, not a tall slab.
  block: {
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: tokens.space.xs,
    gap: tokens.space.lg,
  },
  key: {
    letterSpacing: 0.6,
  },
  valueSlot: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: tokens.space.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  value: {
    textAlign: "right",
    flexShrink: 1,
  },
});
