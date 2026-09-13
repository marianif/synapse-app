import { createAsyncThunk } from "@reduxjs/toolkit";

import { ensureDb, seedDefaultProjectsOnce } from "@/lib/database";
import { seedDevDataIfEmpty } from "@/lib/dev-seed";
import { syncScheduledNotifications } from "@/lib/notifications";
import type {
  DbDiaryEntry,
  DbEntry,
  DbHabit,
  DbProject,
  DbRecurrenceCompletion,
  DbTask,
} from "@/lib/types";
import type { AppDispatch, RootState } from "@/store";
import { startWatchSync } from "@/store/middleware";
import { fetchDiary } from "@/store/thunks/diary";
import { fetchEntries } from "@/store/thunks/entries";
import { fetchHabits } from "@/store/thunks/habits";
import { fetchProjects } from "@/store/thunks/projects";
import { fetchRecurrenceCompletions } from "@/store/thunks/recurrence";
import { fetchTasks } from "@/store/thunks/tasks";

/**
 * One-shot bootstrap, replacing the old DatabaseProvider init effect:
 * open the DB, seed dev/default data, load every collection into the store,
 * then self-heal notifications and arm the Watch pipeline.
 */
export const initApp = createAsyncThunk("app/init", async (_arg, { dispatch, getState }) => {
  const db = await ensureDb();
  // DEV: populate mock data once if the table is empty, then load.
  try {
    await seedDevDataIfEmpty(db);
  } catch (err) {
    console.warn("[store] dev seed failed:", err);
  }
  // PROD + DEV: seed the default macro-area projects exactly once per
  // install (guarded by a persistent flag, delete-safe).
  try {
    await seedDefaultProjectsOnce();
  } catch (err) {
    console.warn("[store] default-project seed failed:", err);
  }

  const [entries, projects, habits] = await Promise.all([
    dispatch(fetchEntries()).unwrap().catch(() => [] as DbEntry[]),
    dispatch(fetchProjects()).unwrap().catch(() => [] as DbProject[]),
    dispatch(fetchHabits())
      .unwrap()
      .catch(() => ({ habits: [] as DbHabit[], completions: [] })),
    dispatch(fetchTasks()).unwrap().catch(() => [] as DbTask[]),
    dispatch(fetchRecurrenceCompletions())
      .unwrap()
      .catch(() => [] as DbRecurrenceCompletion[]),
    dispatch(fetchDiary()).unwrap().catch(() => [] as DbDiaryEntry[]),
  ]);

  // After the initial load, rebuild the whole notification schedule under one
  // shared budget. This self-heals any stale state from a previous launch and
  // keeps the pending count under the iOS cap.
  await syncScheduledNotifications({
    entries,
    projects,
    habits: habits.habits,
  }).catch((err) => {
    console.warn("[store] syncScheduledNotifications failed:", err);
  });

  startWatchSync(dispatch as AppDispatch, () => getState() as RootState);
});
