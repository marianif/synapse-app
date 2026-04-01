import { useContext } from "react";

import type { EntryType } from "@/components/atoms/entry-dot";
import {
  DatabaseContext,
  type CreateEntryInput,
  type CreateIdeaInput,
  type UpdateEntryInput,
} from "@/contexts/database-context";
import type { DbEntry, DbIdea, DbRecurrenceCompletion } from "@/lib/schema";

export interface UseDatabaseReturn {
  entries: DbEntry[];
  ideas: DbIdea[];
  recurrenceCompletions: DbRecurrenceCompletion[];
  isLoading: boolean;
  isCreating: boolean;
  createEntry: (data: CreateEntryInput) => Promise<DbEntry>;
  createIdea: (data: CreateIdeaInput) => Promise<DbIdea>;
  updateEntry: (id: string, data: UpdateEntryInput) => Promise<void>;
  updateEntryStatus: (id: string, status: DbEntry["status"]) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  fetchEntries: (type?: EntryType) => Promise<DbEntry[]>;
  fetchIdeas: () => Promise<DbIdea[]>;
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
    ideas: context.ideas,
    recurrenceCompletions: context.recurrenceCompletions,
    isLoading: context.isLoading,
    isCreating: context.isCreating,
    createEntry: context.createEntry,
    createIdea: context.createIdea,
    updateEntry: context.updateEntry,
    updateEntryStatus: context.updateEntryStatus,
    deleteEntry: context.deleteEntry,
    deleteIdea: context.deleteIdea,
    fetchEntries: context.refetchEntries,
    fetchIdeas: async () => context.ideas,
    completeRecurringInstance: context.completeRecurringInstance,
    uncompleteRecurringInstance: context.uncompleteRecurringInstance,
    skipRecurringInstance: context.skipRecurringInstance,
    deleteRecurringFuture: context.deleteRecurringFuture,
    deleteRecurringSeries: context.deleteRecurringSeries,
  };
}
