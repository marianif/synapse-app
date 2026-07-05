import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryKicker, tokens, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

/** Incoming's type lens — the temporal types, plus "everything". */
export type ListTypeFilter = "all" | "todo" | "deadline";

/** Incoming's status lens — live (not yet done) or done, or everything. */
export type ListStatusFilter = "all" | "live" | "done";

const TYPE_OPTIONS: { value: ListTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "Todos" },
  { value: "deadline", label: "Deadlines" },
];

const STATUS_OPTIONS: { value: ListStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "done", label: "Done" },
];

interface ListFilterBarProps {
  type: ListTypeFilter;
  onType: (value: ListTypeFilter) => void;
  status: ListStatusFilter;
  onStatus: (value: ListStatusFilter) => void;
}

/**
 * Incoming's persistent filter affordance — two editorial label rows (type, then
 * status), in the diary-filter-bar voice: a line of section labels, the active
 * one full-ink with a thin underline rule, the rest muted with none. No pills, no
 * fills. The type row tints its active underline with the type's own code so the
 * filter speaks the same color language as the entries it narrows; the status row
 * stays neutral ink. Both lenses compose — type AND status — so the user can read
 * "live deadlines" or "done todos" as one focused view.
 */
export function ListFilterBar({
  type,
  onType,
  status,
  onStatus,
}: ListFilterBarProps): React.ReactElement {
  const { colors, scheme } = useTheme();

  return (
    <View style={styles.bar}>
      {/* Type lens — active underline borrows the type code (neutral for "All"). */}
      <View style={styles.row}>
        {TYPE_OPTIONS.map((o) => {
          const active = type === o.value;
          const activeHue =
            o.value === "all" ? colors.ink : entryKicker(o.value as EntryType, scheme);
          return (
            <Pressable
              key={o.value}
              onPress={() => onType(o.value)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Show ${o.label.toLowerCase()}`}
              style={styles.item}
            >
              <ThemedText
                style={[
                  styles.label,
                  { color: active ? colors.ink : colors.inkMuted },
                ]}
              >
                {o.label}
              </ThemedText>
              <View
                style={[
                  styles.rule,
                  { backgroundColor: active ? activeHue : "transparent" },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Status lens — neutral ink; a quieter sub-line under the type row. */}
      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map((o) => {
          const active = status === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onStatus(o.value)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Show ${o.label.toLowerCase()} entries`}
              style={styles.item}
            >
              <ThemedText
                type="mono"
                style={{ color: active ? colors.ink : colors.inkMuted }}
              >
                {o.label}
              </ThemedText>
              <View
                style={[
                  styles.rule,
                  { backgroundColor: active ? colors.ink : "transparent" },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.space.lg,
    flexWrap: "wrap",
  },
  // Status sits a tonal step below the type line — same voice, quieter scale.
  statusRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.space.lg,
  },
  item: {
    alignItems: "flex-start",
    gap: 5,
  },
  label: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  // Shared active-state underline — width tracks the label above it.
  rule: {
    alignSelf: "stretch",
    height: 2,
    borderRadius: tokens.radius.pill,
  },
});
