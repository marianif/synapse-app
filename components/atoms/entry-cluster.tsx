import { StyleSheet, View } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";

import type { EntryType } from "@/lib/types";

export type { EntryType };

/** The whole field as a cluster — every type, by default, in board order. */
export const ALL_TYPES: EntryType[] = [
  "deadline",
  "todo",
  "idea",
  "event",
  "someday",
];

interface EntryClusterProps {
  /** Types to plot as dots. Defaults to the full field. */
  types?: EntryType[];
  /** Diameter of each dot. */
  dotSize?: number;
  /** Space between dots (drives how tight the cluster reads). */
  gap?: number;
  /**
   * Max width before dots wrap to the next line — this is what turns a row of
   * dots into a *cluster* (a tight 2-up/3-up clump) rather than a line. Tune it
   * to ~`Math.ceil(types.length / 2) * (dotSize + gap)` for a balanced clump.
   */
  width?: number;
}

/**
 * A small clump of entry-type dots — the whole field, abstracted to its colors.
 *
 * It reads as "all your types, together, unsorted": the brain before it's filed
 * into lanes. Born in the list header's mixed "Incoming" view (no single type
 * owns the screen, so show them all as a constellation), pulled out here so the
 * empty-field console can speak the same shorthand. Color = categorization, never
 * urgency (the EntryDot contract), so a cluster is always calm, never alarming.
 */
export function EntryCluster({
  types = ALL_TYPES,
  dotSize = 7,
  gap = 3,
  width = 24,
}: EntryClusterProps): React.ReactElement {
  return (
    <View style={[styles.cluster, { width, gap }]}>
      {types.map((t) => (
        <EntryDot key={t} type={t} size={dotSize} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
});
