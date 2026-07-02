import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  DirectFilterBar,
  type DirectCounts,
  type DirectFilter,
} from "@/components/molecules/direct-filter-bar";
import { DirectPager } from "@/components/molecules/direct-pager";
import { DirectRow } from "@/components/molecules/direct-row";
import { EmptyState } from "@/components/molecules/empty-state";
import { tokens, useEntryKicker, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { doneStatus, sortDirect } from "@/lib/direct-when";

import type { DbEntry, EntryType } from "@/lib/types";

// Rows shown per page — the home holds a fixed, predictable height no matter how
// large the backlog grows; the mono pager flips through the rest.
const PAGE_SIZE = 6;

interface DirectOverviewProps {
  /** Deadlines + todos in any status — the component sorts and paginates. */
  entries: DbEntry[];
  /**
   * Opens the shared capture composer. Wired from an empty-state CTA so a blank
   * zone can start a capture in place — it reuses the one add-path (the pen), it
   * does not open a second one.
   */
  onCapture?: () => void;
}

/**
 * Direct overview — the consequence zone as a paged register. The full set is
 * ordered charged-first (overdue → soonest → calm → done), then windowed into
 * fixed-height pages so a growing backlog never lengthens the home: page 1 is
 * always the most pressing work, and the mono pager (‹ 1 / N ›) flips to the
 * rest. Nothing is hidden — the header (DirectFilterBar) reports the true total
 * and every item is at most a page-flip away. This organism only orchestrates:
 * it sorts, paginates, and owns the DB mutations; the row, header, and pager
 * are autonomous.
 */
export function DirectOverview({
  entries,
  onCapture,
}: DirectOverviewProps): React.ReactElement | null {
  const { updateEntryStatus, deleteEntry } = useDatabase();
  const { colors } = useTheme();
  // AA-safe type shades for the empty-state title + CTA. Hooks must resolve at
  // the top level, so pre-compute both and pick by filter inside the memo.
  const deadlineShade = useEntryKicker("deadline");
  const todoShade = useEntryKicker("todo");
  const [filter, setFilter] = useState<DirectFilter>("all");
  const [page, setPage] = useState(0);

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

  // Filter, then order charged-first. Pagination slices this ordered list.
  const ordered = useMemo(() => {
    const cut =
      filter === "all" ? entries : entries.filter((e) => e.type === filter);
    return sortDirect(cut);
  }, [entries, filter]);

  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  // Clamp during render so a deletion on the last page (or a filter change)
  // can't strand us on a page that no longer exists.
  const safePage = Math.min(page, pageCount - 1);
  // Reconcile the render-time clamp back into state so a later change (e.g. items
  // added back) resumes from the page the user is actually viewing, not a stale
  // out-of-range page.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);
  const pageItems = ordered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  // When the ordered cut is empty the rows view would otherwise render a bare
  // gap. Two semantically distinct blanks reach here — resolve which, so the
  // consequence zone always states a fact instead of showing a void:
  //   • zone-empty — no deadlines/todos exist at all (first-run / cleared board)
  //   • filtered   — items exist but the active cut has none
  // (An all-done zone is NOT blank: done rows still render, struck through and
  // sunk to the bottom, so ordered is non-empty and this branch never fires.)
  const empty = useMemo<{
    title: string;
    description: string;
    cta?: string;
    accent: string;
  } | null>(() => {
    if (ordered.length > 0) return null;
    // On "all" with a truly empty board there's no single type to add — point
    // at the pen, which resolves the type from whatever thought lands.
    if (filter === "all") {
      return {
        title: "Nothing pressing",
        description: "Tap the pen to get a deadline or todo out of your head.",
        accent: colors.inkMuted,
      };
    }
    // A specific filter is active and its stream is empty — the user has already
    // said which flavour they want, so offer to add exactly that. An empty
    // stream is an invitation, not a dead end.
    const single = filter === "deadline" ? "deadline" : "todo";
    return {
      title: `No ${single}s yet`,
      description:
        filter === "deadline"
          ? "Nothing with a date hanging over you. Line one up before it sneaks up."
          : "No todos in play. Drop the next thing you need to do down here.",
      cta: `Add ${single}`,
      // Title + CTA carry the type's own electric code (AA-safe kicker shade).
      accent: filter === "deadline" ? deadlineShade : todoShade,
    };
  }, [ordered.length, filter, colors.inkMuted, deadlineShade, todoShade]);

  const changeFilter = (next: DirectFilter): void => {
    setFilter(next);
    setPage(0); // a new cut always opens on its most pressing page
  };

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

  return (
    <View style={styles.section}>
      <DirectFilterBar value={filter} counts={counts} onChange={changeFilter} />

      {empty ? (
        <EmptyState
          title={empty.title}
          description={empty.description}
          accentColor={empty.accent}
          ctaLabel={empty.cta && onCapture ? empty.cta : undefined}
          onCta={empty.cta && onCapture ? onCapture : undefined}
        />
      ) : (
        <>
          <View style={styles.rows}>
            {pageItems.map((entry) => (
              <DirectRow
                key={entry.id}
                entry={entry}
                onMarkDone={handleMarkDone}
                onDelete={handleDelete}
              />
            ))}
          </View>

          <DirectPager
            page={safePage}
            pageCount={pageCount}
            onChange={(p) => setPage(Math.max(0, Math.min(p, pageCount - 1)))}
          />
        </>
      )}
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
