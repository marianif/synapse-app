import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  deleteDiaryEntry as dbDeleteDiaryEntry,
  ensureDb,
  getDiaryEntries,
  getDiaryEntry,
  insertDiaryEntry,
  updateDiaryEntry as dbUpdateDiaryEntry,
} from "@/lib/database";
import type { DbDiaryEntry, DiaryMood } from "@/lib/types";

export const fetchDiary = createAsyncThunk<DbDiaryEntry[], void>(
  "diary/fetch",
  async () => {
    await ensureDb();
    return getDiaryEntries();
  },
);

export const addDiaryEntry = createAsyncThunk<
  DbDiaryEntry,
  {
    body: string;
    mood: DiaryMood | null;
    linkedEntryId: string | null;
    linkedProjectId: string | null;
    tags?: string[];
  }
>("diary/add", async ({ body, mood, linkedEntryId, linkedProjectId, tags }) => {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Cannot add an empty diary note");
  return insertDiaryEntry(
    trimmed,
    mood,
    linkedEntryId,
    linkedProjectId,
    tags ?? [],
  );
});

export const updateDiaryEntry = createAsyncThunk<
  DbDiaryEntry,
  {
    id: string;
    data: {
      body?: string;
      mood?: DiaryMood | null;
      linkedEntryId?: string | null;
      linkedProjectId?: string | null;
      tags?: string[];
    };
  }
>("diary/update", async ({ id, data }) => {
  await dbUpdateDiaryEntry(id, data);
  return getDiaryEntry(id);
});

export const deleteDiaryEntry = createAsyncThunk<string, string>(
  "diary/delete",
  async (id) => {
    await dbDeleteDiaryEntry(id);
    return id;
  },
);