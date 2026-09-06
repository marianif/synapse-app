import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ConfirmSheet } from "@/components/molecules/confirm-sheet";
import {
  DirectFilterBar,
  type DirectCounts,
} from "@/components/molecules/direct-filter-bar";
import { DirectPager } from "@/components/molecules/direct-pager";
import { DirectRow } from "@/components/molecules/direct-row";
import { EmptyState } from "@/components/molecules/empty-state";
import {
  entryKicker,
  tokens,
  useEntryKicker,
  useTheme,
} from "@/constants/theme";
import { useConfirm } from "@/hooks/use-confirm";
import { useDatabase } from "@/hooks/use-database/use-database";
import {
  doneStatus,
  horizonLabel,
  isDone,
  sortDirect,
  withinHorizon,
} from "@/lib/direct-when";
import { ConfirmKey } from "@/lib/settings";

import type { DirectFilter, DirectScope } from "@/lib/direct-when";
import type { DbEntry, EntryType } from "@/lib/types";

// Rows shown per page — the home holds a fixed, predictable height no matter how
// large the backlog grows; the mono pager flips through the rest.
const PAGE_SIZE = 6;

interface DirectOverviewProps {
  /**
   * Deadlines, todos, and ideas in any status — the component sorts and
   * paginates. Undated ideas sort into the calm band (never charged).
   */
  entries: DbEntry[];
  /**
   * Opens the shared capture composer. Wired from an empty-state CTA so a blank
   * zone can start a capture in place — it reuses the one add-path (the pen), it
   * does not open a second one. An optional `type` seeds the resolver: a
   * specific empty stream (No deadlines / todos / ideas yet) passes its own type
   * so capture opens on that door, while the neutral "all" empty state passes
   * nothing and the resolver stays type-agnostic.
   */
  onCapture?: (type?: EntryType) => void;
  /**
   * The active cut — the resting type axis × an optional temporal horizon. Owned
   * by the parent so the summary voice can drive it (tap a span → scroll here +
   * narrow). `RESTING_SCOPE` behaves exactly like the pre-scope register.
   */
  scope: DirectScope;
  /** Applies a new cut; set by the type tabs and the scope chip's clear. */
  onScopeChange: (scope: DirectScope) => void;
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
  scope,
  onScopeChange,
}: DirectOverviewProps): React.ReactElement | null {
  const router = useRouter();
  const { updateEntryStatus, deleteEntry } = useDatabase();
  const { colors, scheme } = useTheme();
  // AA-safe type shades for the empty-state title + CTA. Hooks must resolve at
  // the top level, so pre-compute both and pick by filter inside the memo.
  const deadlineShade = useEntryKicker("deadline");
  const todoShade = useEntryKicker("todo");
  const ideaShade = useEntryKicker("idea");
  const [page, setPage] = useState(0);
  const deleteConfirm = useConfirm({ confirmKey: ConfirmKey.deleteEntry });
  const filter = scope.type;

  // Live counts off the unfiltered set so the header reads the true field, not
  // the current cut. Counts are the whole direct zone (open + done together).
  const counts = useMemo<DirectCounts>(() => {
    let deadline = 0;
    let todo = 0;
    let idea = 0;
    for (const e of entries) {
      if (e.type === "deadline") deadline += 1;
      else if (e.type === "todo") todo += 1;
      else if (e.type === "idea") idea += 1;
    }
    return { all: deadline + todo + idea, deadline, todo, idea };
  }, [entries]);

  // Scope, then order charged-first. The type cut is the resting axis; the
  // temporal cut (a summary-span drill) narrows before sorting — and because a
  // temporal scope answers "what needs you in this window", settled lines drop
  // out so the visible count matches the summary's spoken count. Pagination
  // slices this ordered list.
  const ordered = useMemo(() => {
    const typed =
      filter === "all" ? entries : entries.filter((e) => e.type === filter);
    if (!scope.horizon) return sortDirect(typed);
    return sortDirect(
      typed.filter((e) => !isDone(e) && withinHorizon(e, scope.horizon)),
    );
  }, [entries, filter, scope.horizon]);

  // When the active cut is empty the rows view would otherwise render a bare
  // gap. Three semantically distinct blanks reach here — resolve which, so the
  // consequence zone always states a fact instead of showing a void:
  //   • zone-empty  — no deadlines/todos exist at all (first-run / cleared board)
  //   • scoped      — items exist but the temporal scope has none in its window
  //   • filtered    — items exist but the active type cut has none
  // (An all-done zone is NOT blank: done rows still render, struck through and
  // sunk to the bottom, so ordered is non-empty and this branch never fires.)
  const empty = useMemo<{
    title: string;
    description: string;
    cta?: string;
    accent: string;
    // The type to seed capture with. Undefined on the neutral "all" state so
    // the resolver stays type-agnostic; set to the active filter's type on a
    // specific empty stream so capture opens straight on that door.
    captureType?: EntryType;
  } | null>(() => {
    if (ordered.length > 0) return null;
    const scopeType = filter === "all" ? null : filter;
    // A temporal scope is active and nothing falls inside its window — offer to
    // widen the lens back out rather than add (the item isn't missing, the
    // window is just empty of it).
    if (scope.horizon && scopeType === null) {
      return {
        title: scope.horizon === "overdue"
          ? "Nothing overdue"
          : `Nothing ${horizonLabel(scope.horizon).toLowerCase()}`,
        description:
          "Widen the lens to see the whole field, or add something new.",
        accent: colors.inkMuted,
      };
    }
    if (scope.horizon && scopeType) {
      return {
        title: scope.horizon === "overdue"
          ? `No ${scopeType}s overdue`
          : `No ${scopeType}s ${horizonLabel(scope.horizon).toLowerCase()}`,
        description: "Widen the lens, or add something to this stretch of time.",
        accent: colors.inkMuted,
      };
    }
    // On "all" with a truly empty board there's no single type to add — point
    // at the pen, which resolves the type from whatever thought lands.
    if (filter === "all") {
      return {
        title: "Nothing pressing",
        description:
          "Tap the pen to get a deadline, todo, or idea out of your head.",
        accent: colors.inkMuted,
      };
    }
    // A specific filter is active and its stream is empty — the user has already
    // said which flavour they want, so offer to add exactly that. An empty
    // stream is an invitation, not a dead end. Title + CTA carry the type's own
    // electric code (AA-safe kicker shade).
    const byType = {
      deadline: {
        title: "No deadlines yet",
        description:
          "Nothing with a date hanging over you. Line one up before it sneaks up.",
        shade: deadlineShade,
      },
      todo: {
        title: "No todos yet",
        description:
          "No todos in play. Drop the next thing you need to do down here.",
        shade: todoShade,
      },
      idea: {
        title: "No ideas yet",
        description:
          "Nothing sketched out yet. Catch the next spark before it slips away.",
        shade: ideaShade,
      },
    }[filter];
    return {
      title: byType.title,
      description: byType.description,
      cta: `Add ${filter}`,
      accent: byType.shade,
      // `filter` here is narrowed to a concrete type (not "all"), so seed
      // capture with it — the CTA opens the resolver already on this door.
      captureType: filter,
    };
  }, [
    ordered.length,
    filter,
    scope.horizon,
    colors.inkMuted,
    deadlineShade,
    todoShade,
    ideaShade,
  ]);

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

  const changeFilter = (next: DirectFilter): void => {
    onScopeChange({ ...scope, type: next });
    setPage(0); // a new cut always opens on its most pressing page
  };

  const clearScope = (): void => {
    onScopeChange({ type: "all", horizon: null });
    setPage(0);
  };

  const handleMarkDone = (entry: DbEntry): void => {
    void updateEntryStatus(entry.id, doneStatus(entry.type as EntryType)).catch(
      (err) => console.error("Failed to mark entry done:", err),
    );
  };

  const handleDelete = (entry: DbEntry): void => {
    void deleteConfirm.request(() => {
      void deleteEntry(entry.id).catch((err) =>
        console.error("Failed to delete entry:", err),
      );
    });
  };

  return (
    <View style={styles.section}>
      <DirectFilterBar value={filter} counts={counts} onChange={changeFilter} />

      {scope.horizon ? (
        <View style={styles.scopeRow}>
          <Pressable
            onPress={clearScope}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${horizonLabel(scope.horizon)} scope`}
            style={({ pressed }) => [
              styles.scopeChip,
              { backgroundColor: colors.surfaceSubtle },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="caption"
              style={[
                styles.scopeLabel,
                { color: filter !== "all" ? entryKicker(filter, scheme) : colors.inkMuted },
              ]}
            >
              {filter !== "all" ? filter : "All"} · {horizonLabel(scope.horizon)}
            </ThemedText>
            <IconSymbol name="X" size={12} color={colors.inkMuted} />
          </Pressable>
        </View>
      ) : null}

      {empty ? (
        <EmptyState
          title={empty.title}
          description={empty.description}
          accentColor={empty.accent}
          ctaLabel={
            empty.cta && onCapture
              ? empty.cta
              : scope.horizon
                ? "Widen the lens"
                : undefined
          }
          onCta={
            scope.horizon
              ? clearScope
              : empty.cta && onCapture
                ? () => onCapture(empty.captureType)
                : undefined
          }
        />
      ) : (
        <>
          <View style={styles.rows}>
            {pageItems.map((entry) => (
              <DirectRow
                key={entry.id}
                entry={entry}
                onPress={(entry) =>
                  router.push({ pathname: "/edit", params: { id: entry.id } })
                }
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

      <ConfirmSheet
        visible={deleteConfirm.visible}
        kicker="DELETE ENTRY"
        message="This removes it from the field for good."
        dontAsk={deleteConfirm.dontAsk}
        onToggleDontAsk={deleteConfirm.toggleDontAsk}
        onConfirm={deleteConfirm.confirm}
        onCancel={deleteConfirm.cancel}
      />
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
  scopeRow: {
    flexDirection: "row",
  },
  scopeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 24,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.pill,
  },
  scopeLabel: {
    textTransform: "capitalize",
  },
  pressed: {
    opacity: 0.7,
  },
});
