import { createSlice } from "@reduxjs/toolkit";

import type { DbRecurrenceCompletion } from "@/lib/types";
import { deleteRecurringSeries } from "@/store/thunks/entries";
import {
  completeRecurringInstance,
  fetchRecurrenceCompletions,
  uncompleteRecurringInstance,
} from "@/store/thunks/recurrence";

interface RecurrenceState {
  recurrenceCompletions: DbRecurrenceCompletion[];
}

const initialState: RecurrenceState = {
  recurrenceCompletions: [],
};

const recurrenceSlice = createSlice({
  name: "recurrence",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecurrenceCompletions.fulfilled, (state, action) => {
        state.recurrenceCompletions = action.payload;
      })
      .addCase(completeRecurringInstance.fulfilled, (state, action) => {
        const completion = action.payload;
        state.recurrenceCompletions = [
          ...state.recurrenceCompletions.filter(
            (c) =>
              !(
                c.entry_id === completion.entry_id &&
                c.instance_date === completion.instance_date
              ),
          ),
          completion,
        ];
      })
      .addCase(uncompleteRecurringInstance.fulfilled, (state, action) => {
        const { entryId, instanceDate } = action.payload;
        state.recurrenceCompletions = state.recurrenceCompletions.filter(
          (c) =>
            !(c.entry_id === entryId && c.instance_date === instanceDate),
        );
      })
      .addCase(deleteRecurringSeries.fulfilled, (state, action) => {
        state.recurrenceCompletions = state.recurrenceCompletions.filter(
          (c) => c.entry_id !== action.payload,
        );
      });
  },
});

export default recurrenceSlice.reducer;