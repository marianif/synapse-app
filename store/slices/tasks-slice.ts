import { createSlice } from "@reduxjs/toolkit";

import type { DbTask } from "@/lib/types";
import { deleteEntry, deleteRecurringSeries } from "@/store/thunks/entries";
import {
  createTask,
  deleteTask,
  fetchTasks,
  reorderTasks,
  setTaskDone,
  updateTaskTitle,
} from "@/store/thunks/tasks";

interface TasksState {
  tasks: DbTask[];
}

const initialState: TasksState = {
  tasks: [],
};

function upsert(tasks: DbTask[], task: DbTask): void {
  const index = tasks.findIndex((t) => t.id === task.id);
  if (index >= 0) tasks[index] = task;
}

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.tasks = action.payload;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks = [...state.tasks, action.payload.task];
      })
      .addCase(setTaskDone.fulfilled, (state, action) => {
        upsert(state.tasks, action.payload);
      })
      .addCase(updateTaskTitle.fulfilled, (state, action) => {
        upsert(state.tasks, action.payload.task);
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((t) => t.id !== action.payload.taskId);
      })
      .addCase(reorderTasks.fulfilled, (state, action) => {
        state.tasks = action.payload;
      })
      .addCase(deleteEntry.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((t) => t.entry_id !== action.payload);
      })
      .addCase(deleteRecurringSeries.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter((t) => t.entry_id !== action.payload);
      });
  },
});

export default tasksSlice.reducer;