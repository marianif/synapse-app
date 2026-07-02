import type { DbEntry, EntryType } from "./types";

/**
 * The core ontology as a logic layer over the DB type strings.
 *
 *   todo family : todo (plain) · deadline (flavor)
 *                 — autonomous or project-linked, the actionable spine.
 *                 A todo with no date is a "someday" (see isSomeday) — a
 *                 render-time STATE, not a separate type.
 *   idea        : autonomous, promotable to a project
 *
 * The DB keeps 'todo' | 'deadline' | 'idea'; consumers read the ontology
 * through these helpers instead of switching on raw type strings.
 */

export type TodoFlavor = "plain" | "deadline";

const TODO_FAMILY: ReadonlySet<EntryType> = new Set(["todo", "deadline"]);

/** Is this entry type a flavor of todo (plain todo or deadline)? */
export function isTodoFamily(type: EntryType): boolean {
  return TODO_FAMILY.has(type);
}

/** The flavor of a todo-family type. Throws on non-todo-family types. */
export function todoFlavor(type: EntryType): TodoFlavor {
  switch (type) {
    case "todo":
      return "plain";
    case "deadline":
      return "deadline";
    default:
      throw new Error(`todoFlavor called with non-todo-family type '${type}'`);
  }
}

/** Can this entry be attributed to a project? (All current types can.) */
export function isProjectAttributable(type: EntryType): boolean {
  return isTodoFamily(type) || type === "idea";
}

/**
 * An undated todo IS a "someday": present, not pressing. Detected at render
 * time from null dates — never a separate type or color. Surfaced by the
 * SOMEDAY badge (components/molecules/someday-badge.tsx).
 */
export function isSomeday(entry: DbEntry): boolean {
  return entry.type === "todo" && !entry.scheduled_date && !entry.due_date;
}

/**
 * An idea carries the NARRATIVE voice (the greeting resurfaces stale ones). It
 * is also a DIRECT row in the overview now — narrative-bearing is additive, not
 * exclusive. Deadlines and todos are direct-only.
 */
export function isNarrativeType(type: EntryType): boolean {
  return type === "idea";
}

/** An idea that was already promoted to a project — the narrative stops resurfacing it. */
export function isPromotedIdea(entry: DbEntry): boolean {
  return entry.type === "idea" && entry.promoted_project_id != null;
}
