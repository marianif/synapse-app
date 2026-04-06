import { useContext } from "react";

import type { EntryType } from "@/components/atoms/entry-dot";
import {
  DatabaseContext,
  type CreateEntryInput,
  type UpdateEntryInput,
} from "@/contexts/database-context";
import type { DbEntry, DbRecurrenceCompletion } from "@/lib/types";

export interface UseDatabaseReturn {
  entries: DbEntry[];
  recurrenceCompletions: DbRecurrenceCompletion[];
  isLoading: boolean;
  isCreating: boolean;
  createEntry: (data: CreateEntryInput) => Promise<DbEntry>;
  updateEntry: (id: string, data: UpdateEntryInput) => Promise<void>;
  updateEntryStatus: (id: string, status: DbEntry["status"]) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  fetchEntries: (type?: EntryType) => Promise<DbEntry[]>;
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
    recurrenceCompletions: context.recurrenceCompletions,
    isLoading: context.isLoading,
    isCreating: context.isCreating,
    createEntry: context.createEntry,
    updateEntry: context.updateEntry,
    updateEntryStatus: context.updateEntryStatus,
    deleteEntry: context.deleteEntry,
    fetchEntries: context.refetchEntries,
    completeRecurringInstance: context.completeRecurringInstance,
    uncompleteRecurringInstance: context.uncompleteRecurringInstance,
    skipRecurringInstance: context.skipRecurringInstance,
    deleteRecurringFuture: context.deleteRecurringFuture,
    deleteRecurringSeries: context.deleteRecurringSeries,
  };
}
