import { useEntitlement } from "@/contexts/entitlement-context";
import { useDiary } from "@/hooks/use-diary";
import { useDatabase } from "@/hooks/use-database/use-database";
import { isAtCap, type CapKind } from "@/lib/entitlements";

/**
 * The live cap state: how much of each free limit is in use, and whether each
 * is full. Counts follow the locked rules:
 * - projects: active rows only (archived don't count).
 * - habits: every habit, paused included — a paused habit stays.
 * - entries: open rows only; completing or meeting one frees a slot.
 * - notes: every diary note; deleting frees a slot.
 *
 * Gate creation with `at.*`; `canExport` is the Pro-only export switch.
 */
export interface Caps {
  counts: Record<CapKind, number>;
  at: Record<CapKind, boolean>;
  /** Export is a Pro feature, not a numeric cap. */
  canExport: boolean;
  /** Nothing is capped: Pro or an active trial. */
  hasFullAccess: boolean;
}

export function useCaps(): Caps {
  const entitlement = useEntitlement();
  const { projects, habits, entries } = useDatabase();
  const { entries: notes } = useDiary();

  const counts: Record<CapKind, number> = {
    projects: projects.filter((p) => p.status === "active").length,
    habits: habits.length,
    entries: entries.filter(
      (e) => e.status !== "completed" && e.status !== "met",
    ).length,
    notes: notes.length,
  };

  const at: Record<CapKind, boolean> = {
    projects: isAtCap("projects", counts.projects, entitlement),
    habits: isAtCap("habits", counts.habits, entitlement),
    entries: isAtCap("entries", counts.entries, entitlement),
    notes: isAtCap("notes", counts.notes, entitlement),
  };

  return {
    counts,
    at,
    canExport: entitlement.hasFullAccess,
    hasFullAccess: entitlement.hasFullAccess,
  };
}
