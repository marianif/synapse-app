/**
 * SQL schema for the Synapse app database.
 * All CREATE statements to initialize the database.
 */
export const SCHEMA_VERSION = 13;

export const CREATE_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('todo', 'deadline', 'idea')),
    subtitle TEXT,
    inspiration TEXT,
    scheduled_date TEXT,
    scheduled_time TEXT,
    due_date TEXT,
    due_time TEXT,
    notes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'active', 'completed', 'pending', 'met', 'overdue')),
    -- Owning project (null = unfiled). FK behaviour (SET NULL on project delete)
    -- is enforced in app code: ADD COLUMN can't carry FK clauses on upgrades.
    project_id TEXT,
    -- Horizon window for deadlines ('week' | 'month' | 'year'). When set,
    -- due_date stores the window's END date so sorting/heat logic is unchanged.
    due_range TEXT,
    -- For ideas: the project this idea was promoted into (provenance).
    promoted_project_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
`;

export const CREATE_PROJECTS_TABLE = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
    -- A single emoji that carries the project's visual identity (header glyph,
    -- home-row leading icon). Null = no emoji picked yet; the UI offers a quiet
    -- "pick one" affordance and falls back to a neutral folder glyph.
    emoji TEXT,
    -- Featured projects are the ones the home overview surfaces. The Project
    -- Shelf (app/projects.tsx) is the only place to toggle this.
    is_featured INTEGER NOT NULL DEFAULT 0,
    -- Last navigation into the project (ms since epoch). Powers the RECENT
    -- sort on the shelf. Null on fresh rows → falls back to updated_at.
    last_opened_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
`;

export const CREATE_DIARY_TABLE = `
  CREATE TABLE IF NOT EXISTS diary_entries (
    id TEXT PRIMARY KEY NOT NULL,
    body TEXT NOT NULL,
    mood TEXT CHECK(mood IN ('calm', 'low', 'charged', 'tired', 'bright')),
    -- Optional link to an action-board entry (an 'idea'). When set, this note is
    -- a reflection ON that idea; when null, it's an autonomous diary note. ON
    -- DELETE SET NULL so deleting the idea keeps the thought, just unlinks it.
    linked_entry_id TEXT REFERENCES entries(id) ON DELETE SET NULL,
    -- Optional link to a project. A note can point to an idea, a project, or
    -- be free. App-side SET NULL on project delete (same pattern as above).
    linked_project_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
`;

/**
 * Subtasks: the checklist under a todo or a deadline. Deliberately the lightest
 * entity in the model — a title, a done flag, an order. No dates, no notes, no
 * project, no status enum. A task is crossed in or crossed out; anything richer
 * is an entry, and an entry that needs entries under it is a project.
 *
 * Not allowed on ideas: an idea with a checklist is a project, and the
 * promotion path (entries.promoted_project_id) already exists for that. The
 * parent-type rule can't live in a CHECK (it spans tables), so it's enforced in
 * the mutation layer (`insertTask`).
 *
 * The CASCADE below is aspirational: expo-sqlite opens connections with
 * `PRAGMA foreign_keys` OFF by default, so it does not actually fire. Tasks are
 * deleted app-side alongside their parent (`deleteTasksForEntry`), mirroring
 * the `unlinkDiaryNotesForEntry` pattern. The clause documents intent and would
 * become live if the pragma is ever switched on.
 */
export const CREATE_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    -- SQLite has no boolean; 0/1, same convention as projects.is_featured.
    done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0, 1)),
    -- Manual ordering within a parent. Sparse and never renumbered on delete;
    -- new tasks land at max(position) + 1.
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
`;

/** Every read is "the tasks of one entry, in order" — index the access path. */
export const CREATE_TASKS_ENTRY_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_tasks_entry_position
    ON tasks(entry_id, position);
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
  CREATE_DIARY_TABLE,
  CREATE_PROJECTS_TABLE,
  CREATE_TASKS_TABLE,
  CREATE_TASKS_ENTRY_INDEX,
  CREATE_SCHEMA_META_TABLE,
];
