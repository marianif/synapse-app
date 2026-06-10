import type { DbEntry, EntryType } from "./types";

/**
 * The pivot ontology ("the agenda that talks") as a logic layer over the
 * stable DB type strings — no data migration, zero risk to existing rows.
 *
 *   todo family : todo (plain) · deadline (flavor) · someday (flavor)
 *                 — autonomous or project-linked, the actionable spine
 *   idea        : autonomous, promotable to a project
 *   event       : direct item, deliberately compact on the home
 *
 * The DB keeps 'todo' | 'deadline' | 'event' | 'someday' | 'idea'; consumers
 * that need the new ontology read it through these helpers instead of
 * switching on raw type strings.
 */

export type TodoFlavor = "plain" | "deadline" | "someday";

const TODO_FAMILY: ReadonlySet<EntryType> = new Set(["todo", "deadline", "someday"]);

/** Is this entry type a flavor of todo (plain todo, deadline, someday)? */
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
    case "someday":
      return "someday";
    default:
      throw new Error(`todoFlavor called with non-todo-family type '${type}'`);
  }
}

/** Can this entry be attributed to a project? (todo family + ideas; events stay free.) */
export function isProjectAttributable(type: EntryType): boolean {
  return isTodoFamily(type) || type === "idea";
}

/**
 * Home registers per the pivot: events and deadlines are DIRECT items (clear,
 * tappable, never summarized); projects, ideas and someday belong to the
 * NARRATIVE voice. Plain todos sit in the direct zone with deadlines.
 */
export function isNarrativeType(type: EntryType): boolean {
  return type === "idea" || type === "someday";
}

/** An idea that was already promoted to a project — the narrative stops resurfacing it. */
export function isPromotedIdea(entry: DbEntry): boolean {
  return entry.type === "idea" && entry.promoted_project_id != null;
}
