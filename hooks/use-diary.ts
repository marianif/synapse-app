import { useMemo } from "react";

import type { DbDiaryEntry, DiaryMood } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addDiaryEntry as addDiaryEntryThunk,
  deleteDiaryEntry as deleteDiaryEntryThunk,
  fetchDiary as fetchDiaryThunk,
  updateDiaryEntry as updateDiaryEntryThunk,
} from "@/store/thunks/diary";

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
 * Diary store backed by the shared Redux diary slice. Every consumer now reads
 * the SAME instance (the old hook duplicated per call site, so edits on one
 * screen could go stale on another until a refresh).
 */
export function useDiary(): UseDiaryResult {
  const entries = useAppSelector((state) => state.diary.entries);
  const isLoading = useAppSelector((state) => state.diary.isLoading);
  const dispatch = useAppDispatch();

  const actions = useMemo(
    () => {
      /** Shrink any result promise to Promise<void> to match the hook shape. */
      const toVoid = <T,>(promise: Promise<T>): Promise<void> =>
        promise.then(() => undefined);

      return {
        refresh: (): Promise<void> =>
          toVoid(
            dispatch(fetchDiaryThunk()).unwrap().catch((error) => {
              console.error("[store] fetchDiary failed:", error);
            }),
          ),
        addEntry: (
          body: string,
          mood: DiaryMood | null,
          linkedEntryId: string | null = null,
          linkedProjectId: string | null = null,
        ): Promise<void> =>
          toVoid(
            dispatch(
              addDiaryEntryThunk({
                body,
                mood,
                linkedEntryId,
                linkedProjectId,
              }),
            )
              .unwrap()
              .catch((error) => {
                console.error("[useDiary] addEntry failed:", error);
              }),
          ),
        updateEntry: (
          id: string,
          data: {
            body?: string;
            mood?: DiaryMood | null;
            linkedEntryId?: string | null;
            linkedProjectId?: string | null;
          },
        ): Promise<void> =>
          toVoid(
            dispatch(updateDiaryEntryThunk({ id, data }))
              .unwrap()
              .catch((error) => {
                console.error("[useDiary] updateEntry failed:", error);
              }),
          ),
        removeEntry: (id: string): Promise<void> =>
          toVoid(
            dispatch(deleteDiaryEntryThunk(id))
              .unwrap()
              .catch((error) => {
                console.error("[useDiary] removeEntry failed:", error);
              }),
          ),
      };
    },
    [dispatch],
  );

  return { entries, isLoading, ...actions };
}