import { useCallback, useEffect, useState } from 'react';

import * as SQLite from 'expo-sqlite';

import { initDatabase, generateId } from '@/lib/database';
import type { DbEntry, DbIdea } from '@/lib/schema';

import type { EntryType } from '@/components/atoms/entry-dot';

// ─── DB singleton ────────────────────────────────────────────────────────────

let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!initPromise) {
    initPromise = initDatabase();
  }
  return initPromise;
}

// ─── Option types ─────────────────────────────────────────────────────────────

export interface UseDatabaseOptions {
  /**
   * When provided the hook will fetch entries of this type on mount and
   * whenever the value changes.  Pass `undefined` to fetch all entry types.
   * Set `fetchEntriesOnMount` to `false` to suppress the automatic fetch.
   */
  entryType?: EntryType;
  /** Automatically load entries when the hook mounts (default: false). */
  fetchEntriesOnMount?: boolean;
  /** Automatically load ideas when the hook mounts (default: false). */
  fetchIdeasOnMount?: boolean;
}

// ─── Return shape ─────────────────────────────────────────────────────────────

export interface UseDatabaseReturn {
  // ── State ─────────────────────────────────────────────────────────────────
  entries: DbEntry[];
  ideas: DbIdea[];
  isLoading: boolean;
  isCreating: boolean;

  // ── Mutations ─────────────────────────────────────────────────────────────
  createEntry: (data: CreateEntryInput) => Promise<DbEntry>;
  createIdea: (data: CreateIdeaInput) => Promise<DbIdea>;
  updateEntryStatus: (id: string, status: DbEntry['status']) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  // ── Queries (imperative, also update local state) ─────────────────────────
  fetchEntries: (entryType?: EntryType) => Promise<DbEntry[]>;
  fetchIdeas: () => Promise<DbIdea[]>;
}

export interface CreateEntryInput {
  title: string;
  type: EntryType;
  scheduledDate?: string;
  scheduledTime?: string;
  dueDate?: string;
  dueTime?: string;
  notes?: string;
}

export interface CreateIdeaInput {
  title: string;
  subtitle?: string;
  inspiration?: string;
  notes?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Single hook that exposes every database operation for the Synapse app.
 *
 * Usage — read-only list screen:
 *   const { entries, isLoading } = useDatabase({ fetchEntriesOnMount: true, entryType: 'task' });
 *
 * Usage — add modal (write-only, no auto-fetch):
 *   const { createEntry, createIdea, isCreating } = useDatabase();
 */
export function useDatabase(options: UseDatabaseOptions = {}): UseDatabaseReturn {
  const {
    entryType,
    fetchEntriesOnMount = false,
    fetchIdeasOnMount = false,
  } = options;

  const [entries, setEntries] = useState<DbEntry[]>([]);
  const [ideas, setIdeas] = useState<DbIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // ── fetchEntries ────────────────────────────────────────────────────────────

  const fetchEntries = useCallback(async (type?: EntryType): Promise<DbEntry[]> => {
    setIsLoading(true);
    try {
      const db = await getDb();
      const rows =
        type !== undefined
          ? await db.getAllAsync<DbEntry>(
              'SELECT * FROM entries WHERE type = ? ORDER BY created_at DESC',
              type,
            )
          : await db.getAllAsync<DbEntry>(
              'SELECT * FROM entries ORDER BY created_at DESC',
            );
      setEntries(rows);
      return rows;
    } catch (error) {
      console.error('[useDatabase] fetchEntries failed:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── fetchIdeas ──────────────────────────────────────────────────────────────

  const fetchIdeas = useCallback(async (): Promise<DbIdea[]> => {
    setIsLoading(true);
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<DbIdea>(
        'SELECT * FROM ideas ORDER BY created_at DESC',
      );
      setIdeas(rows);
      return rows;
    } catch (error) {
      console.error('[useDatabase] fetchIdeas failed:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Auto-fetch on mount ─────────────────────────────────────────────────────

  useEffect(() => {
    if (fetchEntriesOnMount) {
      fetchEntries(entryType);
    }
  }, [fetchEntriesOnMount, entryType, fetchEntries]);

  useEffect(() => {
    if (fetchIdeasOnMount) {
      fetchIdeas();
    }
  }, [fetchIdeasOnMount, fetchIdeas]);

  // ── createEntry ─────────────────────────────────────────────────────────────

  const createEntry = useCallback(async (data: CreateEntryInput): Promise<DbEntry> => {
    setIsCreating(true);
    try {
      const db = await getDb();
      const id = generateId();
      const now = Math.floor(Date.now() / 1000);
      const status = data.type === 'deadline' ? 'pending' : 'scheduled';

      await db.runAsync(
        `INSERT INTO entries
           (id, title, type, scheduled_date, scheduled_time, due_date, due_time, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        data.title,
        data.type,
        data.scheduledDate ?? null,
        data.scheduledTime ?? null,
        data.dueDate ?? null,
        data.dueTime ?? null,
        data.notes ?? null,
        status,
        now,
        now,
      );

      const created = await db.getFirstAsync<DbEntry>(
        'SELECT * FROM entries WHERE id = ?',
        id,
      );

      if (!created) throw new Error('Entry was not persisted');

      // Optimistically prepend to local state so callers see the update immediately.
      setEntries((prev) => [created, ...prev]);
      return created;
    } catch (error) {
      console.error('[useDatabase] createEntry failed:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // ── createIdea ──────────────────────────────────────────────────────────────

  const createIdea = useCallback(async (data: CreateIdeaInput): Promise<DbIdea> => {
    setIsCreating(true);
    try {
      const db = await getDb();
      const id = generateId();
      const now = Math.floor(Date.now() / 1000);

      await db.runAsync(
        `INSERT INTO ideas (id, title, subtitle, inspiration, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        data.title,
        data.subtitle ?? null,
        data.inspiration ?? null,
        data.notes ?? null,
        now,
        now,
      );

      const created = await db.getFirstAsync<DbIdea>(
        'SELECT * FROM ideas WHERE id = ?',
        id,
      );

      if (!created) throw new Error('Idea was not persisted');

      setIdeas((prev) => [created, ...prev]);
      return created;
    } catch (error) {
      console.error('[useDatabase] createIdea failed:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // ── updateEntryStatus ───────────────────────────────────────────────────────

  const updateEntryStatus = useCallback(
    async (id: string, status: DbEntry['status']): Promise<void> => {
      try {
        const db = await getDb();
        const now = Math.floor(Date.now() / 1000);
        await db.runAsync(
          'UPDATE entries SET status = ?, updated_at = ? WHERE id = ?',
          status,
          now,
          id,
        );
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status, updated_at: now } : e)),
        );
      } catch (error) {
        console.error('[useDatabase] updateEntryStatus failed:', error);
        throw error;
      }
    },
    [],
  );

  // ── deleteEntry ─────────────────────────────────────────────────────────────

  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM entries WHERE id = ?', id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error('[useDatabase] deleteEntry failed:', error);
      throw error;
    }
  }, []);

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    entries,
    ideas,
    isLoading,
    isCreating,
    createEntry,
    createIdea,
    updateEntryStatus,
    deleteEntry,
    fetchEntries,
    fetchIdeas,
  };
}
