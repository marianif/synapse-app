import { useContext } from 'react';

import {
  DatabaseContext,
  type CreateEntryInput,
  type CreateIdeaInput,
} from '@/contexts/database-context';
import type { DbEntry, DbIdea } from '@/lib/schema';
import type { EntryType } from '@/components/atoms/entry-dot';

export interface UseDatabaseOptions {
  entryType?: EntryType;
  fetchEntriesOnMount?: boolean;
  fetchIdeasOnMount?: boolean;
}

export interface UseDatabaseReturn {
  entries: DbEntry[];
  ideas: DbIdea[];
  isLoading: boolean;
  isCreating: boolean;
  createEntry: (data: CreateEntryInput) => Promise<DbEntry>;
  createIdea: (data: CreateIdeaInput) => Promise<DbIdea>;
  updateEntryStatus: (id: string, status: DbEntry['status']) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  fetchEntries: (type?: EntryType) => Promise<DbEntry[]>;
  fetchIdeas: () => Promise<DbIdea[]>;
}

export function useDatabase(_options: UseDatabaseOptions = {}): UseDatabaseReturn {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }

  return {
    entries: context.entries,
    ideas: context.ideas,
    isLoading: context.isLoading,
    isCreating: context.isCreating,
    createEntry: context.createEntry,
    createIdea: context.createIdea,
    updateEntryStatus: context.updateEntryStatus,
    deleteEntry: context.deleteEntry,
    deleteIdea: context.deleteIdea,
    fetchEntries: context.refetchEntries,
    fetchIdeas: async () => context.ideas,
  };
}