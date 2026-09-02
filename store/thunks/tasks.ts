import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  deleteTask as dbDeleteTask,
  ensureDb,
  getTasks,
  insertTask as dbInsertTask,
  reorderTasks as dbReorderTasks,
  setTaskDone as dbSetTaskDone,
  updateTaskTitle as dbUpdateTaskTitle,
} from "@/lib/database";
import type { DbTask } from "@/lib/types";

import type { RootState } from "@/store";
import { run } from "@/store/thunks/utils";

/** Bump one entry's updated_at in SQLite; returns the new timestamp. */
async function touchEntry(entryId: string): Promise<number> {
  const db = await ensureDb();
  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    "UPDATE entries SET updated_at = ? WHERE id = ?",
    now,
    entryId,
  );
  return now;
}

async function fetchTaskRow(id: string): Promise<DbTask> {
  const db = await ensureDb();
  const row = await db.getFirstAsync<DbTask>("SELECT * FROM tasks WHERE id = ?", id);
  if (!row) throw new Error(`Task ${id} not found`);
  return row;
}

export const fetchTasks = createAsyncThunk<DbTask[], void>(
  "tasks/fetch",
  async () => {
    await ensureDb();
    return getTasks();
  },
);

export const createTask = createAsyncThunk<
  { task: DbTask; entryId: string; touchedAt: number },
  { entryId: string; title: string }
>("tasks/create", async ({ entryId, title }) => {
  await ensureDb();
  const task = await dbInsertTask(entryId, title);
  const touchedAt = await touchEntry(entryId);
  return { task, entryId, touchedAt };
});

export const setTaskDone = createAsyncThunk<
  DbTask,
  { id: string; done: boolean }
>("tasks/setDone", ({ id, done }) =>
  run("setTaskDone", async () => {
    await ensureDb();
    await dbSetTaskDone(id, done);
    return fetchTaskRow(id);
  }),
);

export const updateTaskTitle = createAsyncThunk<
  { task: DbTask; entryId: string | undefined; touchedAt: number },
  { id: string; title: string }
>("tasks/updateTitle", async ({ id, title }, { getState }) => {
  const state = getState() as RootState;
  const entryId = state.tasks.tasks.find((t) => t.id === id)?.entry_id;
  await dbUpdateTaskTitle(id, title);
  const task = await fetchTaskRow(id);
  const touchedAt = entryId ? await touchEntry(entryId) : 0;
  return { task, entryId, touchedAt };
});

export const deleteTask = createAsyncThunk<
  { taskId: string; entryId: string | undefined; touchedAt: number },
  string
>("tasks/delete", async (id, { getState }) => {
  const state = getState() as RootState;
  // Read the parent before the row is gone — after the delete there is
  // nothing left to tell us which entry to touch.
  const entryId = state.tasks.tasks.find((t) => t.id === id)?.entry_id;
  await dbDeleteTask(id);
  const touchedAt = entryId ? await touchEntry(entryId) : 0;
  return { taskId: id, entryId, touchedAt };
});

export const reorderTasks = createAsyncThunk<DbTask[], string[]>(
  "tasks/reorder",
  (orderedIds) =>
    run("reorderTasks", async () => {
      await ensureDb();
      await dbReorderTasks(orderedIds);
      const db = await ensureDb();
      return db.getAllAsync<DbTask>("SELECT * FROM tasks");
    }),
);