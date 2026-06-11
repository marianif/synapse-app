import { useContext } from "react";

import type { EntryType } from "@/components/atoms/entry-dot";
import {
  DatabaseContext,
  type CreateEntryInput,
  type UpdateEntryInput,
} from "@/contexts/database-context";
import type { DbEntry, DbProject, DbRecurrenceCompletion } from "@/lib/types";

export interface UseDatabaseReturn {
  entries: DbEntry[];
  projects: DbProject[];
  recurrenceCompletions: DbRecurrenceCompletion[];
  isLoading: boolean;
  isCreating: boolean;
  createEntry: (data: CreateEntryInput) => Promise<DbEntry>;
  updateEntry: (id: string, data: UpdateEntryInput) => Promise<void>;
  updateEntryStatus: (id: string, status: DbEntry["status"]) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  fetchEntries: (type?: EntryType) => Promise<DbEntry[]>;
  fetchProjects: () => Promise<void>;
  createProject: (title: string) => Promise<DbProject>;
  updateProject: (
    id: string,
    data: { title?: string; status?: DbProject["status"] },
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
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
    recurrenceCompletions: context.recurrenceCompletions,
    isLoading: context.isLoading,
    isCreating: context.isCreating,
    createEntry: context.createEntry,
    updateEntry: context.updateEntry,
    updateEntryStatus: context.updateEntryStatus,
    deleteEntry: context.deleteEntry,
    fetchEntries: context.refetchEntries,
    fetchProjects: context.refetchProjects,
    createProject: context.createProject,
    updateProject: context.updateProject,
    deleteProject: context.deleteProject,
    promoteIdeaToProject: context.promoteIdeaToProject,
    completeRecurringInstance: context.completeRecurringInstance,
    uncompleteRecurringInstance: context.uncompleteRecurringInstance,
    skipRecurringInstance: context.skipRecurringInstance,
    deleteRecurringFuture: context.deleteRecurringFuture,
    deleteRecurringSeries: context.deleteRecurringSeries,
  };
}
