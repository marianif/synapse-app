import { useContext } from "react";

import type { EntryType } from "@/components/atoms/entry-dot";
import {
  DatabaseContext,
  type CreateEntryInput,
  type UpdateEntryInput,
} from "@/contexts/database-context";
import type {
  DbEntry,
  DbProject,
  DbRecurrenceCompletion,
  DbTask,
} from "@/lib/types";

export interface UseDatabaseReturn {
  entries: DbEntry[];
  projects: DbProject[];
  /** Every subtask across every entry. Filter by `entry_id` at the call site. */
  tasks: DbTask[];
  recurrenceCompletions: DbRecurrenceCompletion[];
  isLoading: boolean;
  isCreating: boolean;
  createEntry: (data: CreateEntryInput) => Promise<DbEntry>;
  updateEntry: (id: string, data: UpdateEntryInput) => Promise<void>;
  updateEntryStatus: (id: string, status: DbEntry["status"]) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  fetchEntries: (type?: EntryType) => Promise<DbEntry[]>;
  fetchProjects: () => Promise<void>;
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
    },
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setProjectFeatured: (id: string, value: boolean) => Promise<void>;
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
}

export function useDatabase(): UseDatabaseReturn {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error("useDatabase must be used within DatabaseProvider");
  }

  return {
    entries: context.entries,
    projects: context.projects,
    tasks: context.tasks,
    recurrenceCompletions: context.recurrenceCompletions,
    isLoading: context.isLoading,
    isCreating: context.isCreating,
    createEntry: context.createEntry,
    updateEntry: context.updateEntry,
    updateEntryStatus: context.updateEntryStatus,
    deleteEntry: context.deleteEntry,
    fetchEntries: context.refetchEntries,
    fetchProjects: context.refetchProjects,
    createTask: context.createTask,
    setTaskDone: context.setTaskDone,
    updateTaskTitle: context.updateTaskTitle,
    deleteTask: context.deleteTask,
    reorderTasks: context.reorderTasks,
    createProject: context.createProject,
    updateProject: context.updateProject,
    deleteProject: context.deleteProject,
    setProjectFeatured: context.setProjectFeatured,
    touchProject: context.touchProject,
    promoteIdeaToProject: context.promoteIdeaToProject,
    completeRecurringInstance: context.completeRecurringInstance,
    uncompleteRecurringInstance: context.uncompleteRecurringInstance,
    skipRecurringInstance: context.skipRecurringInstance,
    deleteRecurringFuture: context.deleteRecurringFuture,
    deleteRecurringSeries: context.deleteRecurringSeries,
  };
}
