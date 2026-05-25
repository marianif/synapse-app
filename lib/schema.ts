/**
 * SQL schema for the Synapse app database.
 * All CREATE statements to initialize the database.
 */
export const SCHEMA_VERSION = 5;

export const CREATE_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('todo', 'deadline', 'event', 'someday')),
    subtitle TEXT,
    inspiration TEXT,
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
  CREATE_SCHEMA_META_TABLE,
];
