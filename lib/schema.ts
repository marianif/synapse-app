import type { EntryType } from "@/components/atoms/entry-dot";

/**
 * SQL schema for the Synapse app database.
 * All CREATE statements to initialize the database.
 */
export const SCHEMA_VERSION = 1;

export const CREATE_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('task', 'deadline', 'event', 'someday')),
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

export const ALL_STATEMENTS = [CREATE_ENTRIES_TABLE, CREATE_IDEAS_TABLE];

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
  created_at: number;
  updated_at: number;
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
