import { useCallback, useEffect, useState } from "react";

import {
  deleteDiaryEntry,
  getDiaryEntries,
  insertDiaryEntry,
  updateDiaryEntry as dbUpdateDiaryEntry,
} from "@/lib/database";

import type { DbDiaryEntry, DiaryMood } from "@/lib/types";

interface UseDiaryResult {
  entries: DbDiaryEntry[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** Insert a new note. Link targets are optional; either, both, or neither. */
  addEntry: (
    body: string,
    mood: DiaryMood | null,
    linkedEntryId?: string | null,
    linkedProjectId?: string | null,
  ) => Promise<void>;
  /** Patch a note. Pass any link target as `null` to clear it. Used by the
   *  project surface to file a free note under a project. */
  updateEntry: (
    id: string,
    data: {
      body?: string;
      mood?: DiaryMood | null;
      linkedEntryId?: string | null;
      linkedProjectId?: string | null;
    },
  ) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
}

/**
 * Self-contained diary store. Deliberately separate from `useDatabase` (which
 * owns the action-item `entries` table) so journaling never leaks into the
 * Field / Incoming / Calendar zones — it reads and writes only `diary_entries`.
 */
export function useDiary(): UseDiaryResult {
  const [entries, setEntries] = useState<DbDiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setEntries(await getDiaryEntries());
    } catch (error) {
      console.error("[useDiary] refresh failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEntry = useCallback(
    async (
      body: string,
      mood: DiaryMood | null,
      linkedEntryId: string | null = null,
      linkedProjectId: string | null = null,
    ): Promise<void> => {
      const trimmed = body.trim();
      if (!trimmed) return;
      try {
        const created = await insertDiaryEntry(
          trimmed,
          mood,
          linkedEntryId,
          linkedProjectId,
        );
        // optimistic prepend — newest first, matching the query order
        setEntries((prev) => [created, ...prev]);
      } catch (error) {
        console.error("[useDiary] addEntry failed:", error);
      }
    },
    [],
  );

  const updateEntry = useCallback(
    async (
      id: string,
      data: {
        body?: string;
        mood?: DiaryMood | null;
        linkedEntryId?: string | null;
        linkedProjectId?: string | null;
      },
    ): Promise<void> => {
      try {
        await dbUpdateDiaryEntry(id, data);
        const now = Math.floor(Date.now() / 1000);
        setEntries((prev) =>
          prev.map((e) =>
            e.id !== id
              ? e
              : {
                  ...e,
                  ...(data.body !== undefined ? { body: data.body } : {}),
                  ...(data.mood !== undefined ? { mood: data.mood } : {}),
                  ...(data.linkedEntryId !== undefined
                    ? { linked_entry_id: data.linkedEntryId }
                    : {}),
                  ...(data.linkedProjectId !== undefined
                    ? { linked_project_id: data.linkedProjectId }
                    : {}),
                  updated_at: now,
                },
          ),
        );
      } catch (error) {
        console.error("[useDiary] updateEntry failed:", error);
      }
    },
    [],
  );

  const removeEntry = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteDiaryEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error("[useDiary] removeEntry failed:", error);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, isLoading, refresh, addEntry, updateEntry, removeEntry };
}
