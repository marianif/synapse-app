import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

/** Which slice of the direct zone is shown. */
export type DirectFilter = "all" | "deadline" | "todo" | "idea";

/** Live tally of the whole direct zone (open + done together). */
export interface DirectCounts {
  all: number;
  deadline: number;
  todo: number;
  idea: number;
}

const SEGMENTS: { key: DirectFilter; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "deadline", label: "DEADLINES" },
  { key: "todo", label: "TODOS" },
  { key: "idea", label: "IDEAS" },
];

interface DirectFilterBarProps {
  value: DirectFilter;
  counts: DirectCounts;
  onChange: (filter: DirectFilter) => void;
}

/**
 * The direct-zone header: a filter and a live count readout in one. Mono signal
 * layer; the active segment is carried by ink weight, never a type hue (the
 * action/selection signal must not be confused with a content category). Each
 * segment doubles as a tab and a tabular count.
 */
export function DirectFilterBar({
  value,
  counts,
  onChange,
}: DirectFilterBarProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View
      style={styles.bar}
      accessibilityRole="tablist"
      accessibilityLabel="Filter deadlines, todos, and ideas"
    >
      {SEGMENTS.map(({ key, label }) => {
        const active = value === key;
        const tint = active ? colors.ink : colors.inkMuted;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            hitSlop={8}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${label}, ${counts[key]}`}
            style={styles.segment}
          >
            <ThemedText type="label" style={{ color: tint }}>
              {label}
            </ThemedText>
            <ThemedText type="mono" style={{ color: tint }}>
              {counts[key]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.lg,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 28,
  },
});
