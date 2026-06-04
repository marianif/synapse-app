import * as SQLite from 'expo-sqlite';

import { ALL_STATEMENTS, CREATE_DIARY_TABLE, CREATE_ENTRIES_TABLE, CREATE_RECURRENCE_COMPLETIONS_TABLE, SCHEMA_VERSION } from './schema';
import type { DbDiaryEntry, DiaryMood } from './types';

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
      await db.execAsync(
        "ALTER TABLE diary_entries ADD COLUMN linked_entry_id TEXT",
      );
      await db.runAsync(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)",
        String(SCHEMA_VERSION),
      );
    });
  }
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
): Promise<DbDiaryEntry> {
  const db = getDb();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    'INSERT INTO diary_entries (id, body, mood, linked_entry_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    body,
    mood,
    linkedEntryId,
    now,
    now,
  );
  return {
    id,
    body,
    mood,
    linked_entry_id: linkedEntryId,
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