import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  deleteDiaryEntry as dbDeleteDiaryEntry,
  ensureDb,
  getDiaryEntries,
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
  }
>("diary/add", async ({ body, mood, linkedEntryId, linkedProjectId }) => {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Cannot add an empty diary note");
  return insertDiaryEntry(trimmed, mood, linkedEntryId, linkedProjectId);
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
    };
  }
>("diary/update", async ({ id, data }) => {
  await dbUpdateDiaryEntry(id, data);
  const db = await ensureDb();
  const row = await db.getFirstAsync<DbDiaryEntry>(
    "SELECT * FROM diary_entries WHERE id = ?",
    id,
  );
  if (!row) throw new Error(`Diary entry ${id} not found`);
  return row;
});

export const deleteDiaryEntry = createAsyncThunk<string, string>(
  "diary/delete",
  async (id) => {
    await dbDeleteDiaryEntry(id);
    return id;
  },
);