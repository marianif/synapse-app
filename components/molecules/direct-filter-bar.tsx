import { SectionTabs, type SectionTab } from "@/components/molecules/section-tabs";

/** Which slice of the direct zone is shown. */
export type DirectFilter = "all" | "deadline" | "todo" | "idea";

/** Live tally of the whole direct zone (open + done together). */
export interface DirectCounts {
  all: number;
  deadline: number;
  todo: number;
  idea: number;
}

const SEGMENTS: SectionTab<DirectFilter>[] = [
  { value: "all", label: "All" },
  { value: "deadline", label: "Deadlines" },
  { value: "todo", label: "Todos" },
  { value: "idea", label: "Ideas" },
];

interface DirectFilterBarProps {
  value: DirectFilter;
  counts: DirectCounts;
  onChange: (filter: DirectFilter) => void;
}

/**
 * The direct-zone header: a filter and a live count readout in one, on the
 * shared SectionTabs row. Each tab doubles as a tab and a tabular count; the
 * active one is full-ink with a thin underline. The action/selection signal is
 * carried by ink weight, never a type hue (the selection must not be confused
 * with a content category).
 */
export function DirectFilterBar({
  value,
  counts,
  onChange,
}: DirectFilterBarProps): React.ReactElement {
  const options = SEGMENTS.map((segment) => ({
    ...segment,
    count: counts[segment.value],
    accessibilityLabel: `${segment.label}, ${counts[segment.value]}`,
  }));

  return (
    <SectionTabs
      value={value}
      options={options}
      onChange={onChange}
      accessibilityLabel="Filter deadlines, todos, and ideas"
      tabs
    />
  );
}