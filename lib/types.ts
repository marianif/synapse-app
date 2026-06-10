export type EntryType = "todo" | "deadline" | "event" | "someday" | "idea";

/**
 * Horizon window for a deadline: instead of a fake precise date, the user
 * commits to closing it within a window ("this week/month/year"). When set,
 * `due_date` stores the window's END date so all existing sorting, heat, and
 * notification logic keeps working unchanged.
 */
export type DueRange = "week" | "month" | "year";

/**
 * TypeScript representation of an entry row from the database.
 */
export interface DbEntry {
  id: string;
  title: string;
  type: EntryType;
  subtitle: string | null;
  inspiration: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  due_date: string | null;
  due_time: string | null;
  notes: string | null;
  status: "scheduled" | "active" | "completed" | "pending" | "met" | "overdue";
  recurrence_rule: string | null;
  recurrence_end_date: string | null;
  /** Owning project, or null for unfiled. Nothing is forced into a project. */
  project_id: string | null;
  /** Horizon window for deadlines; null = precise date (or undated). */
  due_range: DueRange | null;
  /**
   * For ideas only: the project this idea was promoted into. The idea row
   * survives as provenance; the narrative layer stops resurfacing it.
   */
  promoted_project_id: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * A project: a macro life area (developer project, art collective, …) that
 * todos/deadlines/ideas can be attributed to. Lives in its own table; it is
 * NOT an entry and never appears as a board item itself — it is referenced by
 * name in the narrative zone and has its own detail view.
 */
export interface DbProject {
  id: string;
  title: string;
  status: "active" | "archived";
  created_at: number;
  updated_at: number;
}

/** A small, calm affective layer for diary entries. Optional. */
export type DiaryMood = "calm" | "low" | "charged" | "tired" | "bright";

/**
 * A diary / journal entry. Lives in its own `diary_entries` table, deliberately
 * separate from action-item `entries` so it never surfaces in the Field,
 * Incoming, or Calendar zones. A free body, an auto timestamp, an optional mood.
 */
export interface DbDiaryEntry {
  id: string;
  body: string;
  mood: DiaryMood | null;
  /**
   * Optional link to an action-board `entries` row (an 'idea'). Set → this note
   * is a reflection ON that idea; null → an autonomous diary note.
   */
  linked_entry_id: string | null;
  /**
   * Optional link to a project. A note can point to an idea, a project, or be
   * free — notes are never actionable and never appear on the home field.
   */
  linked_project_id: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * TypeScript representation of a recurrence_completions row.
 */
export interface DbRecurrenceCompletion {
  id: string;
  entry_id: string;
  instance_date: string;
  status: "completed" | "met" | "skipped";
  created_at: number;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecurrenceFrequency = "daily" | "weekdays" | "weekly" | "monthly";

export interface RecurrenceRule {
  freq: RecurrenceFrequency;
  /** Only used when freq = 'weekly'. 0=Sun, 1=Mon, …, 6=Sat. */
  days?: number[];
}

export interface RecurringInstance {
  entry: DbEntry;
  /** DD/MM/YYYY */
  instanceDate: string;
  completion: DbRecurrenceCompletion | null;
  effectiveStatus: DbEntry["status"];
  /** true if this instance is completed or skipped */
  isDone: boolean;
}
