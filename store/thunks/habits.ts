import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  completeHabitInstance as dbCompleteHabitInstance,
  deleteHabit as dbDeleteHabit,
  ensureDb,
  getHabitCompletions,
  getHabitRow,
  getHabits,
  insertHabit as dbInsertHabit,
  uncompleteHabitInstance as dbUncompleteHabitInstance,
  updateHabit as dbUpdateHabit,
} from "@/lib/database";
import type {
  CreateHabitInput,
  DbHabit,
  DbHabitCompletion,
  UpdateHabitInput,
} from "@/lib/types";
import { run } from "@/store/thunks/utils";

export const fetchHabits = createAsyncThunk<
  { habits: DbHabit[]; completions: DbHabitCompletion[] },
  void
>("habits/fetch", async () => {
  await ensureDb();
  const [habits, completions] = await Promise.all([
    getHabits(),
    getHabitCompletions(),
  ]);
  return { habits, completions };
});

export const createHabit = createAsyncThunk<DbHabit, CreateHabitInput>(
  "habits/create",
  (input) =>
    run("createHabit", async () => {
      await ensureDb();
      return dbInsertHabit(input);
    }),
);

export const updateHabit = createAsyncThunk<
  DbHabit,
  { id: string; data: UpdateHabitInput }
>("habits/update", ({ id, data }) =>
  run("updateHabit", async () => {
    await ensureDb();
    await dbUpdateHabit(id, data);
    return getHabitRow(id);
  }),
);

export const deleteHabit = createAsyncThunk<string, string>(
  "habits/delete",
  (id) =>
    run("deleteHabit", async () => {
      await ensureDb();
      await dbDeleteHabit(id);
      return id;
    }),
);

/**
 * Toggle one habit instance (habit + day). Reads the current completion from
 * the store so the tap is a true toggle; upsert/delete in SQLite accordingly.
 */
export const toggleHabitInstance = createAsyncThunk<
  { habitId: string; instanceDate: string; done: boolean },
  { habitId: string; instanceDate: string }
>("habits/toggleInstance", ({ habitId, instanceDate }, { getState }) =>
  run("toggleHabitInstance", async () => {
    await ensureDb();
    const state = getState() as {
      habits: { habitCompletions: DbHabitCompletion[] };
    };
    const existing = state.habits.habitCompletions.find(
      (c) => c.habit_id === habitId && c.instance_date === instanceDate,
    );
    if (existing) {
      await dbUncompleteHabitInstance(habitId, instanceDate);
      return { habitId, instanceDate, done: false };
    }
    await dbCompleteHabitInstance(habitId, instanceDate);
    return { habitId, instanceDate, done: true };
  }),
);
