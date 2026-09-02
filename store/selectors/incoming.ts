import { isWithinThisWeek } from "@/lib/date-utils";
import type { DbEntry, EntryType } from "@/lib/types";
import type { RootState } from "@/store";

/** Temporal types that surface in the "Incoming" lane / header badge. */
const TEMPORAL_TYPES: ReadonlySet<EntryType> = new Set(["deadline", "todo"]);

function isOpenTemporalEntry(e: DbEntry, now: Date): boolean {
  if (!TEMPORAL_TYPES.has(e.type)) return false;
  if (e.status === "completed" || e.status === "met") return false;
  // An entry carries either a scheduled date (events/todos) or a due date
  // (deadlines); whichever it has decides whether it lands this week.
  return isWithinThisWeek(e.scheduled_date ?? e.due_date, now);
}

/**
 * Count of approaching, still-open temporal entries (deadlines, events, todos)
 * due or scheduled within the current week. Drives the header tray badge so the
 * user sees an at-a-glance signal of what's incoming. Returns 0 when clear.
 */
export function selectIncomingCount(state: RootState, now: Date): number {
  return state.entries.entries.filter((e) => isOpenTemporalEntry(e, now)).length;
}