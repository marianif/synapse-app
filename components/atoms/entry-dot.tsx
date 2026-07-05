import { StyleSheet, View } from "react-native";

import { useEntryKicker } from "@/constants/theme";
import { EntryType } from "@/lib/types";

export type { EntryType };

interface EntryDotProps {
  type: EntryType;
  size?: number;
}

/**
 * 6px colored dot representing an entry type. Uses the scheme-aware kicker shade
 * so the dot reads AA-safe on both light paper and dark graphite — the electric
 * type code is dark-mode-only; light mode gets the darkened AA-safe variant.
 */
export function EntryDot({
  type,
  size = 6,
}: EntryDotProps): React.ReactElement {
  const dotColor = useEntryKicker(type);
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: dotColor,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    flexShrink: 0,
  },
});
