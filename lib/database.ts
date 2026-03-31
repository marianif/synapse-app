import * as SQLite from 'expo-sqlite';

import { ALL_STATEMENTS } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

/**
 * Opens (or reopens) the SQLite database.
 * On first call, creates all tables defined in the schema.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance && isInitialized) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabaseAsync('synapse.db');

  // Run all schema creation statements
  await dbInstance.withTransactionAsync(async () => {
    for (const statement of ALL_STATEMENTS) {
      await dbInstance!.execAsync(statement);
    }
  });

  isInitialized = true;
  return dbInstance;
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