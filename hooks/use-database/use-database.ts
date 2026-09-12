import { useMemo } from "react";

import type { EntryType } from "@/components/atoms/entry-dot";
import type {
  CreateEntryInput,
  CreateHabitInput,
  DbEntry,
  DbHabit,
  DbHabitCompletion,
  DbProject,
  DbRecurrenceCompletion,
  DbTask,
  UpdateEntryInput,
  UpdateHabitInput,
} from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createEntry as createEntryThunk,
  deleteEntry as deleteEntryThunk,
  deleteRecurringFuture as deleteRecurringFutureThunk,
  deleteRecurringSeries as deleteRecurringSeriesThunk,
  fetchEntries as fetchEntriesThunk,
  setEntryNext as setEntryNextThunk,
  updateEntry as updateEntryThunk,
  updateEntryStatus as updateEntryStatusThunk,
} from "@/store/thunks/entries";
import {
  createProject as createProjectThunk,
  deleteProject as deleteProjectThunk,
  fetchProjects as fetchProjectsThunk,
  promoteIdeaToProject as promoteIdeaToProjectThunk,
  setProjectFeatured as setProjectFeaturedThunk,
  touchProject as touchProjectThunk,
  updateProject as updateProjectThunk,
} from "@/store/thunks/projects";
import {
  completeRecurringInstance as completeRecurringInstanceThunk,
  fetchRecurrenceCompletions as fetchRecurrenceCompletionsThunk,
  skipRecurringInstance as skipRecurringInstanceThunk,
  uncompleteRecurringInstance as uncompleteRecurringInstanceThunk,
} from "@/store/thunks/recurrence";
import {
  createTask as createTaskThunk,
  deleteTask as deleteTaskThunk,
  fetchTasks as fetchTasksThunk,
  reorderTasks as reorderTasksThunk,
  setTaskDone as setTaskDoneThunk,
  updateTaskTitle as updateTaskTitleThunk,
} from "@/store/thunks/tasks";
import {
  createHabit as createHabitThunk,
  deleteHabit as deleteHabitThunk,
  fetchHabits as fetchHabitsThunk,
  toggleHabitInstance as toggleHabitInstanceThunk,
  updateHabit as updateHabitThunk,
} from "@/store/thunks/habits";

export interface UseDatabaseReturn {
  entries: DbEntry[];
  projects: DbProject[];
  /** Every subtask across every entry. Filter by `entry_id` at the call site. */
  tasks: DbTask[];
  /** All habits, active first. */
  habits: DbHabit[];
  /** Every habit completion, for resolving whether a given instance is done. */
  habitCompletions: DbHabitCompletion[];
  /** True while the habits collection is being loaded. */
  habitsLoading: boolean;
  recurrenceCompletions: DbRecurrenceCompletion[];
  isLoading: boolean;
  isCreating: boolean;
  createEntry: (data: CreateEntryInput) => Promise<DbEntry>;
  updateEntry: (id: string, data: UpdateEntryInput) => Promise<void>;
  updateEntryStatus: (id: string, status: DbEntry["status"]) => Promise<void>;
  /**
   * Set or clear the user's "next action" mark on an entry. A user-set state;
   * cleared automatically when the entry is completed. Entries only.
   */
  setEntryNext: (id: string, value: boolean) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  fetchEntries: (type?: EntryType) => Promise<DbEntry[]>;
  fetchProjects: () => Promise<void>;
  /** Reload the whole subtask table (e.g. after a dev wipe). */
  refetchTasks: () => Promise<void>;
  /** Reload recurrence completions (e.g. after a dev wipe). */
  refetchRecurrenceCompletions: () => Promise<void>;
  /** Append a subtask. Throws if the parent is an idea — promote it instead. */
  createTask: (entryId: string, title: string) => Promise<DbTask>;
  /** Cross a task in or out. Deliberately does NOT bump the parent's updated_at. */
  setTaskDone: (id: string, done: boolean) => Promise<void>;
  updateTaskTitle: (id: string, title: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  /** Persist a drag-reorder. `orderedIds` is one entry's checklist, top to bottom. */
  reorderTasks: (orderedIds: string[]) => Promise<void>;
  createProject: (title: string, emoji?: string | null) => Promise<DbProject>;
  updateProject: (
    id: string,
    data: {
      title?: string;
      status?: DbProject["status"];
      emoji?: string | null;
      description?: string | null;
    },
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  /** Toggle the home-overview feature flag for a project. */
  setProjectFeatured: (id: string, value: boolean) => Promise<void>;
  /** Mark a project as just-opened. Fire-and-forget; errors only logged. */
  touchProject: (id: string) => Promise<void>;
  promoteIdeaToProject: (ideaId: string) => Promise<DbProject>;
  completeRecurringInstance: (
    entryId: string,
    instanceDate: string,
    status: DbEntry["status"],
  ) => Promise<void>;
  uncompleteRecurringInstance: (
    entryId: string,
    instanceDate: string,
  ) => Promise<void>;
  skipRecurringInstance: (
    entryId: string,
    instanceDate: string,
  ) => Promise<void>;
  deleteRecurringFuture: (entryId: string, fromDate: string) => Promise<void>;
  deleteRecurringSeries: (entryId: string) => Promise<void>;
  /** Create a habit. Requires a motivation; throws if it is empty. */
  createHabit: (data: CreateHabitInput) => Promise<DbHabit>;
  updateHabit: (id: string, data: UpdateHabitInput) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  /** Toggle one habit instance (habit + DD/MM/YYYY day) done / not done. */
  toggleHabitInstance: (habitId: string, instanceDate: string) => Promise<void>;
  /** Reload habits + completions (e.g. after a dev wipe). */
  refetchHabits: () => Promise<void>;
}

/**
 * Facade over the Redux store, shaped like the old DatabaseContext so call
 * sites are untouched. Each selector subscribes to one slice, so a component
 * that reads only `projects` no longer re-renders when `entries` change.
 */
export function useDatabase(): UseDatabaseReturn {
  const entries = useAppSelector((state) => state.entries.entries);
  const projects = useAppSelector((state) => state.projects.projects);
  const tasks = useAppSelector((state) => state.tasks.tasks);
  const recurrenceCompletions = useAppSelector(
    (state) => state.recurrence.recurrenceCompletions,
  );
  const habits = useAppSelector((state) => state.habits.habits);
  const habitCompletions = useAppSelector(
    (state) => state.habits.habitCompletions,
  );
  const habitsLoading = useAppSelector((state) => state.habits.isLoading);
  const isLoading = useAppSelector((state) => state.entries.isLoading);
  const isCreating = useAppSelector((state) => state.entries.isCreating);
  const dispatch = useAppDispatch();

  const actions = useMemo(
    () => {
      /** Shrink any result promise to Promise<void> to match the facade shape. */
      const toVoid = <T,>(promise: Promise<T>): Promise<void> =>
        promise.then(() => undefined);

      return {
        createEntry: (data: CreateEntryInput) =>
          dispatch(createEntryThunk(data)).unwrap(),
        updateEntry: (id: string, data: UpdateEntryInput) =>
          toVoid(dispatch(updateEntryThunk({ id, data })).unwrap()),
        updateEntryStatus: (id: string, status: DbEntry["status"]) =>
          toVoid(dispatch(updateEntryStatusThunk({ id, status })).unwrap()),
        setEntryNext: (id: string, value: boolean) =>
          toVoid(dispatch(setEntryNextThunk({ id, value })).unwrap()),
        deleteEntry: (id: string) =>
          toVoid(dispatch(deleteEntryThunk(id)).unwrap()),
        fetchEntries: (type?: EntryType) =>
          dispatch(fetchEntriesThunk(type))
            .unwrap()
            .catch((error) => {
              console.error("[store] fetchEntries failed:", error);
              return [] as DbEntry[];
            }),
        fetchProjects: () =>
          toVoid(
            dispatch(fetchProjectsThunk()).unwrap().catch((error) => {
              console.error("[store] fetchProjects failed:", error);
            }),
          ),
        refetchTasks: () =>
          toVoid(
            dispatch(fetchTasksThunk()).unwrap().catch((error) => {
              console.error("[store] fetchTasks failed:", error);
            }),
          ),
        refetchRecurrenceCompletions: () =>
          toVoid(
            dispatch(fetchRecurrenceCompletionsThunk())
              .unwrap()
              .catch((error) => {
                console.error(
                  "[store] fetchRecurrenceCompletions failed:",
                  error,
                );
              }),
          ),
        createTask: (entryId: string, title: string) =>
          dispatch(createTaskThunk({ entryId, title }))
            .unwrap()
            .then((result) => result.task),
        setTaskDone: (id: string, done: boolean) =>
          toVoid(dispatch(setTaskDoneThunk({ id, done })).unwrap()),
        updateTaskTitle: (id: string, title: string) =>
          toVoid(dispatch(updateTaskTitleThunk({ id, title })).unwrap()),
        deleteTask: (id: string) =>
          toVoid(dispatch(deleteTaskThunk(id)).unwrap()),
        reorderTasks: (orderedIds: string[]) =>
          toVoid(dispatch(reorderTasksThunk(orderedIds)).unwrap()),
        createProject: (title: string, emoji?: string | null) =>
          dispatch(createProjectThunk({ title, emoji })).unwrap(),
        updateProject: (
          id: string,
          data: {
            title?: string;
            status?: DbProject["status"];
            emoji?: string | null;
          },
        ) => toVoid(dispatch(updateProjectThunk({ id, data })).unwrap()),
        deleteProject: (id: string) =>
          toVoid(dispatch(deleteProjectThunk(id)).unwrap()),
        setProjectFeatured: (id: string, value: boolean) =>
          toVoid(dispatch(setProjectFeaturedThunk({ id, value })).unwrap()),
        touchProject: (id: string) =>
          toVoid(dispatch(touchProjectThunk(id)).unwrap()),
        promoteIdeaToProject: (ideaId: string) =>
          dispatch(promoteIdeaToProjectThunk(ideaId))
            .unwrap()
            .then((result) => result.project),
        completeRecurringInstance: (
          entryId: string,
          instanceDate: string,
          status: DbEntry["status"],
        ) =>
          toVoid(
            dispatch(
              completeRecurringInstanceThunk({ entryId, instanceDate, status }),
            ).unwrap(),
          ),
        uncompleteRecurringInstance: (
          entryId: string,
          instanceDate: string,
        ) =>
          toVoid(
            dispatch(
              uncompleteRecurringInstanceThunk({ entryId, instanceDate }),
            ).unwrap(),
          ),
        skipRecurringInstance: (entryId: string, instanceDate: string) =>
          toVoid(
            dispatch(
              skipRecurringInstanceThunk({ entryId, instanceDate }),
            ).unwrap(),
          ),
        deleteRecurringFuture: (entryId: string, fromDate: string) =>
          toVoid(
            dispatch(deleteRecurringFutureThunk({ id: entryId, fromDate }))
              .unwrap(),
          ),
        deleteRecurringSeries: (entryId: string) =>
          toVoid(dispatch(deleteRecurringSeriesThunk(entryId)).unwrap()),
        createHabit: (data: CreateHabitInput) =>
          dispatch(createHabitThunk(data)).unwrap(),
        updateHabit: (id: string, data: UpdateHabitInput) =>
          toVoid(dispatch(updateHabitThunk({ id, data })).unwrap()),
        deleteHabit: (id: string) =>
          toVoid(dispatch(deleteHabitThunk(id)).unwrap()),
        toggleHabitInstance: (habitId: string, instanceDate: string) =>
          toVoid(
            dispatch(toggleHabitInstanceThunk({ habitId, instanceDate })).unwrap(),
          ),
        refetchHabits: () =>
          toVoid(
            dispatch(fetchHabitsThunk()).unwrap().catch((error) => {
              console.error("[store] fetchHabits failed:", error);
            }),
          ),
      };
    },
    [dispatch],
  );

  return {
    entries,
    projects,
    tasks,
    recurrenceCompletions,
    habits,
    habitCompletions,
    habitsLoading,
    isLoading,
    isCreating,
    ...actions,
  };
}