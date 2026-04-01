import * as SQLite from 'expo-sqlite';

import { ALL_STATEMENTS, CREATE_RECURRENCE_COMPLETIONS_TABLE, SCHEMA_VERSION } from './schema';

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