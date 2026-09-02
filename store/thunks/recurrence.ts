import { createAsyncThunk } from "@reduxjs/toolkit";

import { ensureDb, generateId } from "@/lib/database";
import type {
  DbEntry,
  DbRecurrenceCompletion,
} from "@/lib/types";

export const fetchRecurrenceCompletions = createAsyncThunk<
  DbRecurrenceCompletion[],
  void
>("recurrence/fetch", async () => {
  const db = await ensureDb();
  return db.getAllAsync<DbRecurrenceCompletion>(
    "SELECT * FROM recurrence_completions",
  );
});

export const completeRecurringInstance = createAsyncThunk<
  DbRecurrenceCompletion,
  {
    entryId: string;
    instanceDate: string;
    status: DbEntry["status"];
  }
>("recurrence/complete", async ({ entryId, instanceDate, status }) => {
  const db = await ensureDb();
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    `INSERT OR REPLACE INTO recurrence_completions (id, entry_id, instance_date, status, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    entryId,
    instanceDate,
    status,
    now,
  );
  return {
    id,
    entry_id: entryId,
    instance_date: instanceDate,
    status: status as DbRecurrenceCompletion["status"],
    created_at: now,
  };
});

export const uncompleteRecurringInstance = createAsyncThunk<
  { entryId: string; instanceDate: string },
  { entryId: string; instanceDate: string }
>("recurrence/uncomplete", async ({ entryId, instanceDate }) => {
  const db = await ensureDb();
  await db.runAsync(
    "DELETE FROM recurrence_completions WHERE entry_id = ? AND instance_date = ?",
    entryId,
    instanceDate,
  );
  return { entryId, instanceDate };
});

export const skipRecurringInstance = createAsyncThunk<
  DbRecurrenceCompletion,
  { entryId: string; instanceDate: string }
>("recurrence/skip", async ({ entryId, instanceDate }, { dispatch }) => {
  return dispatch(
    completeRecurringInstance({ entryId, instanceDate, status: "completed" }),
  ).unwrap();
});