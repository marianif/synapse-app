import { StyleSheet, Text } from "react-native";

import { tokens, useEntryKicker } from "@/constants/theme";

import type { EntryType } from "@/components/atoms/entry-dot";

interface CounterDisplayProps {
  value: number;
  accentType: EntryType;
}

/**
 * 48pt hero counter — the heartbeat of each Bento card.
 * Color is derived from the entry-type kicker shade (scheme-aware, AA-safe on
 * both light paper and dark graphite).
 * Per DESIGN.md: tracking set to -2% to feel confident and tight.
 */
export function CounterDisplay({
  value,
  accentType,
}: CounterDisplayProps): React.ReactElement {
  const shade = useEntryKicker(accentType);
  return (
    <Text style={[styles.counter, { color: shade }]}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  counter: {
    fontSize: tokens.type.display.size - 10,
    lineHeight: tokens.type.display.lineHeight,
    letterSpacing: tokens.type.display.tracking,
    fontWeight: "700",
    includeFontPadding: false,
  },
});
