import { StyleSheet, View } from "react-native";

import { SectionTabs, type SectionTab } from "@/components/molecules/section-tabs";
import { entryKicker, tokens, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

/** Incoming's type lens — the temporal types, plus "everything". */
export type ListTypeFilter = "all" | "todo" | "deadline";

/** Incoming's status lens — live (not yet done) or done, or everything. */
export type ListStatusFilter = "all" | "live" | "done";

const TYPE_OPTIONS: SectionTab<ListTypeFilter>[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "Todos", accessibilityLabel: "Show todos" },
  { value: "deadline", label: "Deadlines", accessibilityLabel: "Show deadlines" },
];

const STATUS_OPTIONS: SectionTab<ListStatusFilter>[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live", accessibilityLabel: "Show live entries" },
  { value: "done", label: "Done", accessibilityLabel: "Show done entries" },
];

interface ListFilterBarProps {
  type: ListTypeFilter;
  onType: (value: ListTypeFilter) => void;
  status: ListStatusFilter;
  onStatus: (value: ListStatusFilter) => void;
}

/**
 * Incoming's persistent filter affordance — two editorial label rows (type, then
 * status) on the shared SectionTabs voice: a line of section labels, the active
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

  const typeOptions = TYPE_OPTIONS.map((option) => ({
    ...option,
    accent:
      option.value === "all"
        ? colors.ink
        : entryKicker(option.value as EntryType, scheme),
  }));

  return (
    <View style={styles.bar}>
      {/* Type lens — active underline borrows the type code (neutral for "All"). */}
      <SectionTabs
        value={type}
        options={typeOptions}
        onChange={onType}
        accessibilityLabel="Filter by type"
        wrap
      />
      {/* Status lens — neutral ink; a quieter sub-line under the type row. */}
      <SectionTabs
        value={status}
        options={STATUS_OPTIONS}
        onChange={onStatus}
        accessibilityLabel="Filter by status"
        variant="mono"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.xs,
  },
});