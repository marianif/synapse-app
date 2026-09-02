import { createSlice } from "@reduxjs/toolkit";

import type { DbDiaryEntry } from "@/lib/types";
import {
  addDiaryEntry,
  deleteDiaryEntry,
  fetchDiary,
  updateDiaryEntry,
} from "@/store/thunks/diary";

interface DiaryState {
  entries: DbDiaryEntry[];
  isLoading: boolean;
}

const initialState: DiaryState = {
  entries: [],
  isLoading: false,
};

function upsert(entries: DbDiaryEntry[], entry: DbDiaryEntry): void {
  const index = entries.findIndex((e) => e.id === entry.id);
  if (index >= 0) entries[index] = entry;
}

const diarySlice = createSlice({
  name: "diary",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDiary.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDiary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.entries = action.payload;
      })
      .addCase(fetchDiary.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(addDiaryEntry.fulfilled, (state, action) => {
        // optimistic prepend — newest first, matching the query order
        state.entries = [action.payload, ...state.entries];
      })
      .addCase(updateDiaryEntry.fulfilled, (state, action) => {
        upsert(state.entries, action.payload);
      })
      .addCase(deleteDiaryEntry.fulfilled, (state, action) => {
        state.entries = state.entries.filter((e) => e.id !== action.payload);
      });
  },
});

export default diarySlice.reducer;