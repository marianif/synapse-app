import type { EntryType } from "@/components/atoms/entry-dot";

/**
 * SQL schema for the Synapse app database.
 * All CREATE statements to initialize the database.
 */
export const SCHEMA_VERSION = 3;

export const CREATE_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('todo', 'deadline', 'event', 'someday')),
    scheduled_date TEXT,
    scheduled_time TEXT,
    due_date TEXT,
    due_time TEXT,
    notes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'active', 'completed', 'pending', 'met', 'overdue')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
`;

export const CREATE_IDEAS_TABLE = `
  CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    inspiration TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
`;

export const CREATE_SCHEMA_META_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

export const CREATE_RECURRENCE_COMPLETIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS recurrence_completions (
    id TEXT PRIMARY KEY NOT NULL,
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    instance_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed'
      CHECK(status IN ('completed', 'met', 'skipped')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(entry_id, instance_date)
  );
`;

export const ALL_STATEMENTS = [
  CREATE_ENTRIES_TABLE,
  CREATE_IDEAS_TABLE,
  CREATE_SCHEMA_META_TABLE,
];

/**
 * TypeScript representation of an entry row from the database.
 */
export interface DbEntry {
  id: string;
  title: string;
  type: EntryType;
  scheduled_date: string | null;
  scheduled_time: string | null;
  due_date: string | null;
  due_time: string | null;
  notes: string | null;
  status: "scheduled" | "active" | "completed" | "pending" | "met" | "overdue";
  recurrence_rule: string | null;
  recurrence_end_date: string | null;
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

/**
 * TypeScript representation of an idea/someday row.
 */
export interface DbIdea {
  id: string;
  title: string;
  subtitle: string | null;
  inspiration: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}
