import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  DirectFilterBar,
  type DirectCounts,
  type DirectFilter,
} from "@/components/molecules/direct-filter-bar";
import { DirectRow } from "@/components/molecules/direct-row";
import { tokens } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { byRunway, doneStatus, isDone } from "@/lib/direct-when";

import type { DbEntry, EntryType } from "@/lib/types";

interface DirectOverviewProps {
  /** Deadlines + todos in any status — the component sorts and filters. */
  entries: DbEntry[];
}

/**
 * Direct overview — the consequence zone: open deadlines + todos at the top in
 * runway order (overdue → soonest → undated), with completed lines settled
 * below, struck through like a crossed-off agenda. The header (DirectFilterBar)
 * doubles as a filter and a live count readout; each DirectRow swipes to reveal
 * mark-done (open rows) and delete. This organism only orchestrates: it sorts,
 * filters, and owns the DB mutations; the row and header are autonomous.
 */
export function DirectOverview({
  entries,
}: DirectOverviewProps): React.ReactElement | null {
  const { updateEntryStatus, deleteEntry } = useDatabase();
  const [filter, setFilter] = useState<DirectFilter>("all");

  // Live counts off the unfiltered set so the header reads the true field, not
  // the current cut. Counts are the whole direct zone (open + done together).
  const counts = useMemo<DirectCounts>(() => {
    let deadline = 0;
    let todo = 0;
    for (const e of entries) {
      if (e.type === "deadline") deadline += 1;
      else if (e.type === "todo") todo += 1;
    }
    return { all: deadline + todo, deadline, todo };
  }, [entries]);

  // Apply the filter, then sort: open items first in runway order, done lines
  // sunk to the bottom (also runway-ordered among themselves).
  const visible = useMemo(() => {
    const cut =
      filter === "all" ? entries : entries.filter((e) => e.type === filter);
    return [...cut].sort((a, b) => {
      const ad = isDone(a);
      const bd = isDone(b);
      if (ad !== bd) return ad ? 1 : -1; // done sinks
      return byRunway(a, b);
    });
  }, [entries, filter]);

  const handleMarkDone = (entry: DbEntry): void => {
    void updateEntryStatus(entry.id, doneStatus(entry.type as EntryType)).catch(
      (err) => console.error("Failed to mark entry done:", err),
    );
  };

  const handleDelete = (entry: DbEntry): void => {
    void deleteEntry(entry.id).catch((err) =>
      console.error("Failed to delete entry:", err),
    );
  };

  if (counts.all === 0) return null;

  return (
    <View style={styles.section}>
      <DirectFilterBar value={filter} counts={counts} onChange={setFilter} />

      <View style={styles.rows}>
        {visible.map((entry) => (
          <DirectRow
            key={entry.id}
            entry={entry}
            onMarkDone={handleMarkDone}
            onDelete={handleDelete}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: tokens.space.md,
  },
  rows: {
    gap: tokens.space.sm,
  },
});
