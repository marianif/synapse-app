import { createSlice } from "@reduxjs/toolkit";

import type { DbHabit, DbHabitCompletion } from "@/lib/types";
import {
  createHabit,
  deleteHabit,
  fetchHabits,
  toggleHabitInstance,
  updateHabit,
} from "@/store/thunks/habits";

interface HabitsState {
  habits: DbHabit[];
  habitCompletions: DbHabitCompletion[];
  isLoading: boolean;
}

const initialState: HabitsState = {
  habits: [],
  habitCompletions: [],
  isLoading: false,
};

const habitsSlice = createSlice({
  name: "habits",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHabits.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchHabits.fulfilled, (state, action) => {
        state.habits = action.payload.habits;
        state.habitCompletions = action.payload.completions;
        state.isLoading = false;
      })
      .addCase(fetchHabits.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(createHabit.fulfilled, (state, action) => {
        state.habits = [...state.habits, action.payload];
      })
      .addCase(updateHabit.fulfilled, (state, action) => {
        state.habits = state.habits.map((habit) =>
          habit.id === action.payload.id ? action.payload : habit,
        );
      })
      .addCase(deleteHabit.fulfilled, (state, action) => {
        const id = action.payload;
        state.habits = state.habits.filter((habit) => habit.id !== id);
        state.habitCompletions = state.habitCompletions.filter(
          (completion) => completion.habit_id !== id,
        );
      })
      .addCase(toggleHabitInstance.fulfilled, (state, action) => {
        const { habitId, instanceDate, done } = action.payload;
        if (!done) {
          state.habitCompletions = state.habitCompletions.filter(
            (completion) =>
              !(
                completion.habit_id === habitId &&
                completion.instance_date === instanceDate
              ),
          );
          return;
        }
        state.habitCompletions = [
          ...state.habitCompletions.filter(
            (completion) =>
              !(
                completion.habit_id === habitId &&
                completion.instance_date === instanceDate
              ),
          ),
          {
            id: `${habitId}::${instanceDate}`,
            habit_id: habitId,
            instance_date: instanceDate,
            status: "completed",
            created_at: Math.floor(Date.now() / 1000),
          },
        ];
      });
  },
});

export default habitsSlice.reducer;
