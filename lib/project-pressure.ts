import type { DbEntry, DbProject } from "@/lib/types";

import { daysUntil, isDone } from "@/lib/direct-when";

/**
 * "What's pressing right now?" — per-project pressure classification used by
 * the Workshop list. Tight cutoff: HOT means a deadline due within a week OR
 * an overdue todo. Anything else is STEADY. The tightness is on purpose: if
 * every project is HOT, the NOW LINE has no weight and the screen turns into
 * just another inventory.
 */
export type ProjectPressure = {
  /** "hot" = above the NOW LINE; "steady" = below it. */
  band: "hot" | "steady";
  /**
   * One short fact line, written for the handwritten Caveat voice on the HOT
   * row. Empty string when band === "steady" (the steady row doesn't speak).
   * Phrasing is statement-of-fact, never nag: "Dentist deadline in 3 days."
   */
  fact: string;
  /**
   * For HOT rows: which entry type drove the pressure, so the row can tint to
   * the responsible color (deadline-pressure → bills tint; todo-pressure →
   * todo tint). Null for steady rows.
   */
  source: "deadline" | "todo" | null;
  /**
   * Days until the most pressing item. Negative = overdue. Used for sorting
   * the HOT band so the most urgent project sits on top.
   */
  sortKey: number;
};

const STEADY: ProjectPressure = {
  band: "steady",
  fact: "",
  source: null,
  sortKey: Number.POSITIVE_INFINITY,
};

/**
 * Compute pressure for one project from its open entries.
 * - Worst overdue deadline wins; otherwise nearest deadline ≤7d wins;
 *   otherwise any overdue todo qualifies the project as HOT.
 * - Ties broken by smallest `daysUntil` so the row order is deterministic.
 */
export function projectPressure(
  project: DbProject,
  entries: DbEntry[],
): ProjectPressure {
  if (project.status === "archived") return STEADY;

  const open = entries.filter(
    (e) => e.project_id === project.id && !isDone(e),
  );
  if (open.length === 0) return STEADY;

  // Track the best (= most pressing) deadline and todo candidate separately so
  // the deadline lane outranks an overdue todo of equal severity.
  let bestDeadline: { entry: DbEntry; days: number } | null = null;
  let worstOverdueTodo: { entry: DbEntry; days: number } | null = null;

  for (const e of open) {
    const dateStr = e.due_date ?? e.scheduled_date ?? null;
    const days = daysUntil(dateStr);
    if (days === null) continue;

    if (e.type === "deadline") {
      // HOT-eligible: overdue OR within the next 7 days.
      if (days <= 7 && (bestDeadline === null || days < bestDeadline.days)) {
        bestDeadline = { entry: e, days };
      }
    } else if (e.type === "todo" && days < 0) {
      // Overdue todo: keep the most overdue (most-negative days).
      if (worstOverdueTodo === null || days < worstOverdueTodo.days) {
        worstOverdueTodo = { entry: e, days };
      }
    }
  }

  if (bestDeadline) {
    const { entry, days } = bestDeadline;
    return {
      band: "hot",
      fact: deadlineFact(entry.title, days),
      source: "deadline",
      sortKey: days,
    };
  }
  if (worstOverdueTodo) {
    const { entry, days } = worstOverdueTodo;
    return {
      band: "hot",
      fact: todoFact(entry.title, days),
      source: "todo",
      sortKey: days,
    };
  }
  return STEADY;
}

function deadlineFact(title: string, days: number): string {
  const t = truncate(title);
  if (days < 0) return `${t} is ${Math.abs(days)}d overdue.`;
  if (days === 0) return `${t} is due today.`;
  if (days === 1) return `${t} is due tomorrow.`;
  return `${t} is due in ${days}d.`;
}

function todoFact(title: string, days: number): string {
  return `${truncate(title)} slipped ${Math.abs(days)}d ago.`;
}

/** Keep the handwritten line readable on small screens. */
function truncate(s: string, max = 36): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
