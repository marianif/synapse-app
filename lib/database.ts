import * as SQLite from 'expo-sqlite';

import { ALL_STATEMENTS, CREATE_DIARY_TABLE, CREATE_PROJECTS_TABLE, CREATE_RECURRENCE_COMPLETIONS_TABLE, SCHEMA_VERSION } from './schema';
import type { DbDiaryEntry, DbProject, DiaryMood } from './types';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

/**
 * Opens (or reopens) the SQLite database.
 * On first call, creates all tables defined in the schema and runs any pending migrations.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance && isInitialized) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabaseAsync('synapse.db');

  // Run base schema creation statements
  await dbInstance.withTransactionAsync(async () => {
    for (const statement of ALL_STATEMENTS) {
      await dbInstance!.execAsync(statement);
    }
  });

  // Run migrations
  await runMigrations(dbInstance);

  isInitialized = true;
  return dbInstance;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM schema_meta WHERE key = 'schema_version'",
  );
  const currentVersion = row ? parseInt(row.value, 10) : 1;

  if (currentVersion < 2) {
    await db.withTransactionAsync(async () => {
      try {
        await db.execAsync('ALTER TABLE entries ADD COLUMN recurrence_rule TEXT');
      } catch {
        // column already exists
      }
      try {
        await db.execAsync('ALTER TABLE entries ADD COLUMN recurrence_end_date TEXT');
      } catch {
        // column already exists
      }
      await db.execAsync(CREATE_RECURRENCE_COMPLETIONS_TABLE);
      await db.runAsync(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
        '2',
      );
    });
  }

  if (currentVersion < 3) {
    // Recreate entries table to fix CHECK constraint: 'task' → 'todo'
    await db.withTransactionAsync(async () => {
      // 1. Rename old table
      await db.execAsync('ALTER TABLE entries RENAME TO entries_old');
      // 2. Create new table with correct constraint
      await db.execAsync(`
        CREATE TABLE entries (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('todo', 'deadline', 'event', 'someday')),
          scheduled_date TEXT,
          scheduled_time TEXT,
          due_date TEXT,
          due_time TEXT,
          notes TEXT,
          status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'active', 'completed', 'pending', 'met', 'overdue')),
          recurrence_rule TEXT,
          recurrence_end_date TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
      `);
      // 3. Copy data, remapping 'task' → 'todo'
      await db.execAsync(`
        INSERT INTO entries
          (id, title, type, scheduled_date, scheduled_time, due_date, due_time,
           notes, status, recurrence_rule, recurrence_end_date, created_at, updated_at)
        SELECT
          id, title,
          CASE WHEN type = 'task' THEN 'todo' ELSE type END,
          scheduled_date, scheduled_time, due_date, due_time,
          notes, status, recurrence_rule, recurrence_end_date, created_at, updated_at
        FROM entries_old
      `);
      // 4. Drop old table
      await db.execAsync('DROP TABLE entries_old');
      // 5. Recreate recurrence_completions with updated FK (safe: cascade)
      await db.execAsync(CREATE_RECURRENCE_COMPLETIONS_TABLE);
      // 6. Record version
      await db.runAsync(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
        String(SCHEMA_VERSION),
      );
    });
  }

  if (currentVersion < 4) {
    // Migration 4: Consolidate ideas into entries table
    await db.withTransactionAsync(async () => {
      // 1. Add new columns to entries if they don't exist
      try {
        await db.execAsync('ALTER TABLE entries ADD COLUMN subtitle TEXT');
      } catch {
        // column already exists
      }
      try {
        await db.execAsync('ALTER TABLE entries ADD COLUMN inspiration TEXT');
      } catch {
        // column already exists
      }

      // 2. Check if ideas table exists and has data
      const ideasTableExists = await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='ideas'"
      );

      if (ideasTableExists) {
        // 3. Move ideas to entries (insert as type='someday')
        await db.execAsync(`
          INSERT OR IGNORE INTO entries
            (id, title, subtitle, inspiration, notes, status, created_at, updated_at)
          SELECT id, title, subtitle, inspiration, notes, 'scheduled', created_at, updated_at
          FROM ideas
        `);

        // 4. Drop the ideas table
        await db.execAsync('DROP TABLE IF EXISTS ideas');
      }

      // 5. Update schema version
      await db.runAsync(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
        '4',
      );
    });
  }

  if (currentVersion < 5) {
    // Migration 5: Rebuild entries table to remove 'idea' from type CHECK constraint.
    // SQLite cannot ALTER a CHECK constraint, so we use the rename+copy+drop pattern.
    // Any rows where type='idea' that survived migration 4 are remapped to 'someday'.
    await db.withTransactionAsync(async () => {
      await db.execAsync('ALTER TABLE entries RENAME TO entries_old');
      await db.execAsync(`
        CREATE TABLE entries (
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
          recurrence_rule TEXT,
          recurrence_end_date TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
      `);
      await db.execAsync(`
        INSERT INTO entries
          (id, title, type, subtitle, inspiration, scheduled_date, scheduled_time,
           due_date, due_time, notes, status, recurrence_rule, recurrence_end_date,
           created_at, updated_at)
        SELECT
          id, title,
          CASE WHEN type = 'idea' THEN 'someday' ELSE type END,
          subtitle, inspiration, scheduled_date, scheduled_time,
          due_date, due_time, notes, status, recurrence_rule, recurrence_end_date,
          created_at, updated_at
        FROM entries_old
      `);
      await db.execAsync('DROP TABLE entries_old');
      await db.runAsync(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
        '5',
      );
    });
  }

  if (currentVersion < 6) {
    // Migration 6: Re-introduce 'idea' into the type CHECK constraint.
    // Migration 5 had stripped it out (remapping idea → someday); this restores
    // the ability to store ideas going forward. SQLite cannot ALTER a CHECK
    // constraint, so we use the rename+copy+drop pattern, copying all rows
    // through unchanged.
    // NOTE: ideas previously remapped to 'someday' by migration 5 are
    // indistinguishable from genuine somedays and are NOT restored.
    await db.withTransactionAsync(async () => {
      await db.execAsync('ALTER TABLE entries RENAME TO entries_old');
      await db.execAsync(`
        CREATE TABLE entries (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('todo', 'deadline', 'event', 'someday', 'idea')),
          subtitle TEXT,
          inspiration TEXT,
          scheduled_date TEXT,
          scheduled_time TEXT,
          due_date TEXT,
          due_time TEXT,
          notes TEXT,
          status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'active', 'completed', 'pending', 'met', 'overdue')),
          recurrence_rule TEXT,
          recurrence_end_date TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
      `);
      await db.execAsync(`
        INSERT INTO entries
          (id, title, type, subtitle, inspiration, scheduled_date, scheduled_time,
           due_date, due_time, notes, status, recurrence_rule, recurrence_end_date,
           created_at, updated_at)
        SELECT
          id, title, type, subtitle, inspiration, scheduled_date, scheduled_time,
          due_date, due_time, notes, status, recurrence_rule, recurrence_end_date,
          created_at, updated_at
        FROM entries_old
      `);
      await db.execAsync('DROP TABLE entries_old');
      await db.runAsync(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
        '6',
      );
    });
  }

  if (currentVersion < 7) {
    // Migration 7: add the standalone diary_entries table. Independent of the
    // action-item `entries` table, so no CHECK-constraint rebuild is needed —
    // just create it for installs that predate it.
    await db.withTransactionAsync(async () => {
      await db.execAsync(CREATE_DIARY_TABLE);
      await db.runAsync(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
        "7",
      );
    });
  }

  if (currentVersion < 8) {
    // Migration 8: a diary note can link to an action-board 'idea'. Add the
    // nullable column to pre-8 installs (fresh installs get the full column,
    // incl. its REFERENCES clause, from CREATE_DIARY_TABLE). SQLite ADD COLUMN
    // can't carry a FK clause, so the ON DELETE SET NULL behaviour is enforced
    // in app code (unlinkDiaryNotesForEntry) when an entry is deleted.
    await db.withTransactionAsync(async () => {
      try {
        await db.execAsync(
          "ALTER TABLE diary_entries ADD COLUMN linked_entry_id TEXT",
        );
      } catch {
        // column already exists (fresh installs get it from CREATE_DIARY_TABLE)
      }
      await db.runAsync(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
        "8",
      );
    });
  }

  if (currentVersion < 9) {
    // Migration 9 (pivot "the agenda that talks"): projects as top-level
    // organizing entities + deadline horizons.
    //   - projects table (macro life areas; not entries, never board items)
    //   - entries.project_id        — owning project, null = unfiled
    //   - entries.due_range         — 'week'|'month'|'year' horizon; due_date
    //                                 stores the window END so heat/sort logic
    //                                 keeps working unchanged
    //   - entries.promoted_project_id — idea → project provenance
    //   - diary_entries.linked_project_id — a note can point to a project
    // ADD COLUMN can't carry FK/CHECK clauses; SET-NULL-on-project-delete is
    // enforced in app code (unlinkProjectReferences), same pattern as
    // migration 8's linked_entry_id.
    await db.withTransactionAsync(async () => {
      await db.execAsync(CREATE_PROJECTS_TABLE);
      const addColumn = async (sql: string) => {
        try {
          await db.execAsync(sql);
        } catch {
          // column already exists (fresh installs get it from the CREATE statement)
        }
      };
      await addColumn('ALTER TABLE entries ADD COLUMN project_id TEXT');
      await addColumn('ALTER TABLE entries ADD COLUMN due_range TEXT');
      await addColumn('ALTER TABLE entries ADD COLUMN promoted_project_id TEXT');
      await addColumn('ALTER TABLE diary_entries ADD COLUMN linked_project_id TEXT');
      await db.runAsync(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
        String(SCHEMA_VERSION),
      );
    });
  }

  if (currentVersion < 11) {
    // Migration 10: project emoji — a single-character visual identity that
    // surfaces in the header, on home rows, and anywhere the project is
    // referenced. Nullable so existing projects survive the upgrade without
    // a forced choice; the UI offers a quiet picker affordance.
    await db.withTransactionAsync(async () => {
      try {
        await db.execAsync('ALTER TABLE projects ADD COLUMN emoji TEXT');
      } catch {
        // column already exists (fresh installs got it from CREATE_PROJECTS_TABLE)
      }
      await db.runAsync(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
        String(SCHEMA_VERSION),
      );
    });
  }

  if (currentVersion < 12) {
    // Migration 11: the Project Shelf. Two new columns on projects:
    //   - is_featured  → drives what ProjectsOverview surfaces on home.
    //                    The shelf's star button is the only place this toggles.
    //   - last_opened_at → ms since epoch; bumped on every navigation into
    //                      the project. Powers the shelf's RECENT sort.
    // All existing projects start unfeatured; the user picks featured ones
    // from the Project Shelf on first visit.
    await db.withTransactionAsync(async () => {
      const addColumn = async (sql: string) => {
        try {
          await db.execAsync(sql);
        } catch {
          // column already exists (fresh installs got it from CREATE_PROJECTS_TABLE)
        }
      };
      await addColumn(
        'ALTER TABLE projects ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0',
      );
      await addColumn('ALTER TABLE projects ADD COLUMN last_opened_at INTEGER');
      await db.runAsync(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
        String(SCHEMA_VERSION),
      );
    });
  }
}

// ─── Project helpers ────────────────────────────────────────────────────────────

/** Insert a project, returning the persisted row. Emoji is optional. */
export async function insertProject(
  title: string,
  emoji: string | null = null,
): Promise<DbProject> {
  const db = getDb();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    "INSERT INTO projects (id, title, status, emoji, created_at, updated_at) VALUES (?, ?, 'active', ?, ?, ?)",
    id,
    title,
    emoji,
    now,
    now,
  );
  return {
    id,
    title,
    status: 'active',
    emoji,
    is_featured: 0,
    last_opened_at: null,
    created_at: now,
    updated_at: now,
  };
}

/** All projects, active first, newest first within each status. */
export async function getProjects(): Promise<DbProject[]> {
  const db = getDb();
  return db.getAllAsync<DbProject>(
    "SELECT * FROM projects ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC",
  );
}

/**
 * The macro life areas seeded on genuine first run. Deliberately broad,
 * one-word, and universal so they fit wildly different users (a dev, an
 * artist, a parent) without reading as a corporate folder tree. `Making` is
 * the catch-all for creative / side work. Emoji are restrained, instrument-
 * panel legible — the user can clear or change any via the project picker.
 *
 * PRODUCT.md principle 2: projects must be present at a glance from the very
 * first launch, never behind a naming-cold-start. Seeding real (editable,
 * deletable) rows beats an empty "Name a project" field for a capture-first,
 * "out of sight is gone" ADHD mind.
 */
const DEFAULT_PROJECTS: { title: string; emoji: string }[] = [
  { title: 'Work', emoji: '💼' },
  { title: 'Home', emoji: '🏠' },
  { title: 'Body', emoji: '🌿' },
  { title: 'Money', emoji: '💰' },
  { title: 'People', emoji: '👥' },
  { title: 'Making', emoji: '🔨' },
];

/**
 * Narrative empty-lines for the seeded macro-areas. When a default project is
 * still empty, its card shows this instead of the generic "Quiet right now." —
 * a short scrawl that "talks" about what the area is for, so the six defaults
 * teach the concept rather than sitting mute. Keyed by the exact seed title:
 * the moment a user renames a default (or fills it), the match drops and the
 * card falls back to the generic quiet line, which is correct — it's no longer
 * a pristine default. Voice per PRODUCT.md principle 6: a plain fact, never a
 * nag, never a cheer. Exported so `ProjectCard` and the seed can't drift.
 */
export const DEFAULT_PROJECT_NARRATIVES: Record<string, string> = {
  Work: 'Where the work lands.',
  Home: 'The place you come back to.',
  Body: 'Sleep, food, moving.',
  Money: 'What comes in, what goes out.',
  People: 'The ones you keep up with.',
  Making: 'Whatever you build for you.',
};

/**
 * Seed the default macro-area projects, exactly once in the lifetime of an
 * install. Guarded by a persistent `schema_meta` flag — NOT by "is the table
 * empty" — so a user who deletes every default is never re-seeded on the next
 * launch. Their board is theirs. Returns true only when it actually seeded.
 *
 * Seeded rows are `is_featured = 1` so they surface on the home grid
 * immediately (principle 2). Runs in production, not just __DEV__.
 */
export async function seedDefaultProjectsOnce(): Promise<boolean> {
  const db = getDb();
  const flag = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM schema_meta WHERE key = 'did_seed_default_projects'",
  );
  if (flag?.value === '1') return false;

  const now = Math.floor(Date.now() / 1000);
  await db.withTransactionAsync(async () => {
    for (const { title, emoji } of DEFAULT_PROJECTS) {
      await db.runAsync(
        "INSERT INTO projects (id, title, status, emoji, is_featured, created_at, updated_at) VALUES (?, ?, 'active', ?, 1, ?, ?)",
        generateId(),
        title,
        emoji,
        now,
        now,
      );
    }
    await db.runAsync(
      "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('did_seed_default_projects', '1')",
    );
  });
  return true;
}

/** Update a project's title, status, and/or emoji. Pass `emoji: null` to clear. */
export async function updateProject(
  id: string,
  data: {
    title?: string;
    status?: DbProject['status'];
    emoji?: string | null;
  },
): Promise<void> {
  const db = getDb();
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  if (data.title !== undefined) {
    updates.push('title = ?');
    values.push(data.title);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.emoji !== undefined) {
    updates.push('emoji = ?');
    values.push(data.emoji);
  }
  if (updates.length === 0) return;
  updates.push('updated_at = ?');
  values.push(Math.floor(Date.now() / 1000));
  values.push(id);
  await db.runAsync(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, ...values);
}

/**
 * Toggle a project's featured flag. Featured projects are the set that
 * `ProjectsOverview` on home surfaces; the Project Shelf is the only UI
 * that flips this. Does NOT bump updated_at — feature-state is metadata,
 * not edit-state.
 */
export async function setProjectFeatured(
  id: string,
  value: boolean,
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'UPDATE projects SET is_featured = ? WHERE id = ?',
    value ? 1 : 0,
    id,
  );
}

/**
 * Stamp last_opened_at = now (ms). Called whenever the user navigates into
 * the project from anywhere. Powers the shelf's RECENT sort. Does NOT bump
 * updated_at — opening isn't editing.
 */
export async function touchProject(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'UPDATE projects SET last_opened_at = ? WHERE id = ?',
    Date.now(),
    id,
  );
}

/**
 * App-side SET NULL for everything pointing at a project (ADD COLUMN can't
 * carry FK clauses). Entries become unfiled; promoted ideas lose provenance;
 * linked notes survive as free notes. Call before deleting a project.
 */
export async function unlinkProjectReferences(projectId: string): Promise<void> {
  const db = getDb();
  await db.runAsync('UPDATE entries SET project_id = NULL WHERE project_id = ?', projectId);
  await db.runAsync(
    'UPDATE entries SET promoted_project_id = NULL WHERE promoted_project_id = ?',
    projectId,
  );
  await db.runAsync(
    'UPDATE diary_entries SET linked_project_id = NULL WHERE linked_project_id = ?',
    projectId,
  );
}

/** Delete a project, unlinking all references first. Its entries survive unfiled. */
export async function deleteProject(id: string): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await unlinkProjectReferences(id);
    await db.runAsync('DELETE FROM projects WHERE id = ?', id);
  });
}

// ─── Diary helpers ──────────────────────────────────────────────────────────────

/**
 * Insert a diary entry, returning the persisted row. `linkedEntryId` ties the
 * note to an action-board entry (an 'idea') — a reflection ON that idea; null
 * for an autonomous note.
 */
export async function insertDiaryEntry(
  body: string,
  mood: DiaryMood | null,
  linkedEntryId: string | null = null,
  linkedProjectId: string | null = null,
): Promise<DbDiaryEntry> {
  const db = getDb();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    'INSERT INTO diary_entries (id, body, mood, linked_entry_id, linked_project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    body,
    mood,
    linkedEntryId,
    linkedProjectId,
    now,
    now,
  );
  return {
    id,
    body,
    mood,
    linked_entry_id: linkedEntryId,
    linked_project_id: linkedProjectId,
    created_at: now,
    updated_at: now,
  };
}

/** All diary entries, newest first. */
export async function getDiaryEntries(): Promise<DbDiaryEntry[]> {
  const db = getDb();
  return db.getAllAsync<DbDiaryEntry>(
    'SELECT * FROM diary_entries ORDER BY created_at DESC',
  );
}

/** Delete a diary entry by id. */
export async function deleteDiaryEntry(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM diary_entries WHERE id = ?', id);
}

/**
 * Update a diary entry's body, mood, or link targets. Pass `linkedProjectId`
 * or `linkedEntryId` as `null` to clear. Bumps updated_at.
 */
export async function updateDiaryEntry(
  id: string,
  data: {
    body?: string;
    mood?: DiaryMood | null;
    linkedEntryId?: string | null;
    linkedProjectId?: string | null;
  },
): Promise<void> {
  const db = getDb();
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  if (data.body !== undefined) {
    updates.push('body = ?');
    values.push(data.body);
  }
  if (data.mood !== undefined) {
    updates.push('mood = ?');
    values.push(data.mood);
  }
  if (data.linkedEntryId !== undefined) {
    updates.push('linked_entry_id = ?');
    values.push(data.linkedEntryId);
  }
  if (data.linkedProjectId !== undefined) {
    updates.push('linked_project_id = ?');
    values.push(data.linkedProjectId);
  }
  if (updates.length === 0) return;
  updates.push('updated_at = ?');
  values.push(Math.floor(Date.now() / 1000));
  values.push(id);
  await db.runAsync(
    `UPDATE diary_entries SET ${updates.join(', ')} WHERE id = ?`,
    ...values,
  );
}

/**
 * Unlink any diary notes that point at the given entry — the app-side stand-in
 * for `ON DELETE SET NULL` (the FK clause can't be added by ADD COLUMN, so we
 * enforce it here). Call before deleting an entry so linked reflections survive
 * as autonomous notes instead of dangling.
 */
export async function unlinkDiaryNotesForEntry(entryId: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'UPDATE diary_entries SET linked_entry_id = NULL WHERE linked_entry_id = ?',
    entryId,
  );
}

/**
 * Wipes every row from the data tables, leaving the schema (and schema_version)
 * intact. Starts from a genuine first-run slate. Order respects FK references —
 * diary first (it points at entries/projects), then completions, then the
 * entries themselves, then projects.
 *
 * Also clears the `did_seed_default_projects` flag so "clear everything" truly
 * resets to first-run state: the caller (or the next launch) re-runs
 * `seedDefaultProjectsOnce()` and the six default macro-areas come back, exactly
 * as a fresh install would. Without this, a clear would leave the projects
 * table empty AND blocked from ever re-seeding.
 */
export async function clearAllData(): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM diary_entries');
    await db.execAsync('DELETE FROM recurrence_completions');
    await db.execAsync('DELETE FROM entries');
    await db.execAsync('DELETE FROM projects');
    await db.execAsync(
      "DELETE FROM schema_meta WHERE key = 'did_seed_default_projects'",
    );
  });
}

/**
 * Returns the initialized database instance.
 * Throws if called before initDatabase() has completed.
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance || !isInitialized) {
    throw new Error(
      'Database not initialized. Call initDatabase() first and await it.',
    );
  }
  return dbInstance;
}

/**
 * Helper to generate a UUID v4.
 * Uses crypto.randomUUID if available, falls back to a simple implementation.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for React Native / environments without crypto
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}