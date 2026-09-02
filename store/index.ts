import { configureStore } from "@reduxjs/toolkit";

import { listenerMiddleware } from "@/store/middleware";
import diaryReducer from "@/store/slices/diary-slice";
import entriesReducer from "@/store/slices/entries-slice";
import projectsReducer from "@/store/slices/projects-slice";
import recurrenceReducer from "@/store/slices/recurrence-slice";
import tasksReducer from "@/store/slices/tasks-slice";

export const store = configureStore({
  reducer: {
    entries: entriesReducer,
    projects: projectsReducer,
    tasks: tasksReducer,
    recurrence: recurrenceReducer,
    diary: diaryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;