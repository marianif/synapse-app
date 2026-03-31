import React, { createContext, useCallback, useEffect, useState } from 'react';

import * as SQLite from 'expo-sqlite';

import { initDatabase, generateId } from '@/lib/database';
import type { DbEntry, DbIdea } from '@/lib/schema';

import type { EntryType } from '@/components/atoms/entry-dot';

interface DatabaseContextValue {
  entries: DbEntry[];
  ideas: DbIdea[];
  isLoading: boolean;
  isCreating: boolean;
  createEntry: (data: CreateEntryInput) => Promise<DbEntry>;
  createIdea: (data: CreateIdeaInput) => Promise<DbIdea>;
  updateEntryStatus: (id: string, status: DbEntry['status']) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  refetchEntries: () => Promise<DbEntry[]>;
}

export const DatabaseContext = createContext<DatabaseContextValue | null>(null);

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

let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!initPromise) {
    initPromise = initDatabase();
  }
  return initPromise;
}

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({
  children,
}: DatabaseProviderProps): React.ReactElement {
  const [entries, setEntries] = useState<DbEntry[]>([]);
  const [ideas, setIdeas] = useState<DbIdea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchEntries = useCallback(async (): Promise<DbEntry[]> => {
    setIsLoading(true);
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<DbEntry>(
        'SELECT * FROM entries ORDER BY created_at DESC',
      );
      setEntries(rows);
      return rows;
    } catch (error) {
      console.error('[DatabaseContext] fetchEntries failed:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      console.error('[DatabaseContext] fetchIdeas failed:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchIdeas();
  }, [fetchEntries, fetchIdeas]);

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

      setEntries((prev) => [created, ...prev]);
      return created;
    } catch (error) {
      console.error('[DatabaseContext] createEntry failed:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, []);

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
      console.error('[DatabaseContext] createIdea failed:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, []);

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
        console.error('[DatabaseContext] updateEntryStatus failed:', error);
        throw error;
      }
    },
    [],
  );

  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM entries WHERE id = ?', id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error('[DatabaseContext] deleteEntry failed:', error);
      throw error;
    }
  }, []);

  const deleteIdea = useCallback(async (id: string): Promise<void> => {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM ideas WHERE id = ?', id);
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error('[DatabaseContext] deleteIdea failed:', error);
      throw error;
    }
  }, []);

  const value: DatabaseContextValue = {
    entries,
    ideas,
    isLoading,
    isCreating,
    createEntry,
    createIdea,
    updateEntryStatus,
    deleteEntry,
    deleteIdea,
    refetchEntries: fetchEntries,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabaseContext(): DatabaseContextValue {
  const context = React.useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
}