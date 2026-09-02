import { createSlice } from "@reduxjs/toolkit";

import type { DbEntry } from "@/lib/types";
import {
  createEntry,
  deleteEntry,
  deleteRecurringFuture,
  deleteRecurringSeries,
  fetchEntries,
  updateEntry,
  updateEntryStatus,
} from "@/store/thunks/entries";
import { deleteProject, promoteIdeaToProject } from "@/store/thunks/projects";
import { createTask, deleteTask, updateTaskTitle } from "@/store/thunks/tasks";

interface EntriesState {
  entries: DbEntry[];
  isLoading: boolean;
  isCreating: boolean;
}

const initialState: EntriesState = {
  entries: [],
  isLoading: false,
  isCreating: false,
};

function upsert(entries: DbEntry[], entry: DbEntry): void {
  const index = entries.findIndex((e) => e.id === entry.id);
  if (index >= 0) entries[index] = entry;
}

function touch(entries: DbEntry[], entryId: string, touchedAt: number): void {
  const index = entries.findIndex((e) => e.id === entryId);
  if (index >= 0) entries[index] = { ...entries[index], updated_at: touchedAt };
}

const entriesSlice = createSlice({
  name: "entries",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEntries.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchEntries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.entries = action.payload;
      })
      .addCase(fetchEntries.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(createEntry.pending, (state) => {
        state.isCreating = true;
      })
      .addCase(createEntry.fulfilled, (state, action) => {
        state.isCreating = false;
        state.entries = [action.payload, ...state.entries];
      })
      .addCase(createEntry.rejected, (state) => {
        state.isCreating = false;
      })
      .addCase(updateEntry.fulfilled, (state, action) => {
        upsert(state.entries, action.payload);
      })
      .addCase(updateEntryStatus.fulfilled, (state, action) => {
        upsert(state.entries, action.payload);
      })
      .addCase(deleteEntry.fulfilled, (state, action) => {
        state.entries = state.entries.filter((e) => e.id !== action.payload);
      })
      .addCase(deleteRecurringFuture.fulfilled, (state, action) => {
        upsert(state.entries, action.payload);
      })
      .addCase(deleteRecurringSeries.fulfilled, (state, action) => {
        state.entries = state.entries.filter((e) => e.id !== action.payload);
      })
      .addCase(promoteIdeaToProject.fulfilled, (state, action) => {
        upsert(state.entries, action.payload.updatedIdea);
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        const projectId = action.payload;
        state.entries = state.entries.map((e) => {
          if (e.project_id !== projectId && e.promoted_project_id !== projectId)
            return e;
          return {
            ...e,
            project_id: e.project_id === projectId ? null : e.project_id,
            promoted_project_id:
              e.promoted_project_id === projectId
                ? null
                : e.promoted_project_id,
          };
        });
      })
      .addCase(createTask.fulfilled, (state, action) => {
        touch(state.entries, action.payload.entryId, action.payload.touchedAt);
      })
      .addCase(updateTaskTitle.fulfilled, (state, action) => {
        if (action.payload.entryId) {
          touch(state.entries, action.payload.entryId, action.payload.touchedAt);
        }
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        if (action.payload.entryId) {
          touch(state.entries, action.payload.entryId, action.payload.touchedAt);
        }
      });
  },
});

export default entriesSlice.reducer;