import React, { createContext, useCallback, useEffect, useState } from "react";

import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

import { generateId, initDatabase } from "@/lib/database";
import { serializeRule, type RecurrenceRule } from "@/lib/recurrence";
import type { DbEntry, DbIdea, DbRecurrenceCompletion } from "@/lib/schema";

import type { EntryType } from "@/components/atoms/entry-dot";
import { syncWidgetEntries } from "@/modules/widget-bridge";

interface DatabaseContextValue {
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
  refetchEntries: (type?: EntryType) => Promise<DbEntry[]>;
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

export const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export interface CreateEntryInput {
  title: string;
  type: EntryType;
  scheduledDate?: string;
  scheduledTime?: string;
  dueDate?: string;
  dueTime?: string;
  notes?: string;
  recurrenceRule?: RecurrenceRule;
  recurrenceEndDate?: string;
}

export interface UpdateEntryInput {
  title?: string;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  notes?: string | null;
  recurrenceRule?: RecurrenceRule | null;
  recurrenceEndDate?: string | null;
}

export interface CreateIdeaInput {
  title: string;
  subtitle?: string;
  inspiration?: string;
  notes?: string;
}

let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!initPromise) {
    initPromise = initDatabase();
  }
  return initPromise;
}

async function syncToWidget(db: SQLite.SQLiteDatabase): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    // ISO date for comparison: scheduled_date is stored as DD/MM/YYYY
    const [dd, mm, yyyy] = [
      String(new Date().getDate()).padStart(2, "0"),
      String(new Date().getMonth() + 1).padStart(2, "0"),
      String(new Date().getFullYear()),
    ];
    const todayFormatted = `${dd}/${mm}/${yyyy}`;
    const rows = await db.getAllAsync<DbEntry>(
      `SELECT * FROM entries
       WHERE (scheduled_date = ? OR due_date = ?)
         AND status NOT IN ('completed', 'met')
       ORDER BY scheduled_date ASC, due_date ASC
       LIMIT 10`,
      todayFormatted,
      todayFormatted,
    );
    await syncWidgetEntries(
      rows.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        status: e.status,
        scheduled_date: e.scheduled_date,
        due_date: e.due_date,
      })),
    );
  } catch (error) {
    console.error("[DatabaseContext] syncToWidget failed:", error);
  }
}

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({
  children,
}: DatabaseProviderProps): React.ReactElement {
  const [entries, setEntries] = useState<DbEntry[]>([]);
  const [ideas, setIdeas] = useState<DbIdea[]>([]);
  const [recurrenceCompletions, setRecurrenceCompletions] = useState<
    DbRecurrenceCompletion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchEntries = useCallback(
    async (type?: EntryType): Promise<DbEntry[]> => {
      setIsLoading(true);
      try {
        const db = await getDb();
        let rows: DbEntry[];
        if (type) {
          rows = await db.getAllAsync<DbEntry>(
            "SELECT * FROM entries WHERE type = ? ORDER BY created_at DESC",
            type,
          );
        } else {
          rows = await db.getAllAsync<DbEntry>(
            "SELECT * FROM entries ORDER BY created_at DESC",
          );
        }
        setEntries(rows);
        return rows;
      } catch (error) {
        console.error("[DatabaseContext] fetchEntries failed:", error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const fetchIdeas = useCallback(async (): Promise<DbIdea[]> => {
    setIsLoading(true);
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<DbIdea>(
        "SELECT * FROM ideas ORDER BY created_at DESC",
      );
      setIdeas(rows);
      return rows;
    } catch (error) {
      console.error("[DatabaseContext] fetchIdeas failed:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRecurrenceCompletions = useCallback(async (): Promise<void> => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<DbRecurrenceCompletion>(
        "SELECT * FROM recurrence_completions",
      );
      setRecurrenceCompletions(rows);
    } catch (error) {
      console.error(
        "[DatabaseContext] fetchRecurrenceCompletions failed:",
        error,
      );
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchIdeas();
    fetchRecurrenceCompletions();
  }, []);

  const createEntry = useCallback(
    async (data: CreateEntryInput): Promise<DbEntry> => {
      setIsCreating(true);
      try {
        const db = await getDb();
        const id = generateId();
        const now = Math.floor(Date.now() / 1000);
        const status = data.type === "deadline" ? "pending" : "scheduled";

        await db.runAsync(
          `INSERT INTO entries
           (id, title, type, scheduled_date, scheduled_time, due_date, due_time, notes, status, recurrence_rule, recurrence_end_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          data.title,
          data.type,
          data.scheduledDate ?? null,
          data.scheduledTime ?? null,
          data.dueDate ?? null,
          data.dueTime ?? null,
          data.notes ?? null,
          status,
          data.recurrenceRule ? serializeRule(data.recurrenceRule) : null,
          data.recurrenceEndDate ?? null,
          now,
          now,
        );

        const created = await db.getFirstAsync<DbEntry>(
          "SELECT * FROM entries WHERE id = ?",
          id,
        );

        if (!created) throw new Error("Entry was not persisted");

        setEntries((prev) => {
          const next = [created, ...prev];
          return next;
        });
        await syncToWidget(db);
        return created;
      } catch (error) {
        console.error("[DatabaseContext] createEntry failed:", error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  const createIdea = useCallback(
    async (data: CreateIdeaInput): Promise<DbIdea> => {
      setIsCreating(true);
      try {
        const db = await getDb();
        const id = generateId();
        const now = Math.floor(Date.now() / 1000);

        await db.runAsync(
          `INSERT INTO ideas (id, title, subtitle, inspiration, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
          id,
          data.title,
          data.subtitle ?? null,
          data.inspiration ?? null,
          data.notes ?? null,
          now,
          now,
        );

        const created = await db.getFirstAsync<DbIdea>(
          "SELECT * FROM ideas WHERE id = ?",
          id,
        );

        if (!created) throw new Error("Idea was not persisted");

        setIdeas((prev) => [created, ...prev]);
        return created;
      } catch (error) {
        console.error("[DatabaseContext] createIdea failed:", error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  const updateEntryStatus = useCallback(
    async (id: string, status: DbEntry["status"]): Promise<void> => {
      try {
        const db = await getDb();
        const now = Math.floor(Date.now() / 1000);
        await db.runAsync(
          "UPDATE entries SET status = ?, updated_at = ? WHERE id = ?",
          status,
          now,
          id,
        );
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, status, updated_at: now } : e,
          ),
        );
        await syncToWidget(db);
      } catch (error) {
        console.error("[DatabaseContext] updateEntryStatus failed:", error);
        throw error;
      }
    },
    [],
  );

  const updateEntry = useCallback(
    async (id: string, data: UpdateEntryInput): Promise<void> => {
      try {
        const db = await getDb();
        const now = Math.floor(Date.now() / 1000);

        const updates: string[] = [];
        const values: (string | number | null)[] = [];

        if (data.title !== undefined) {
          updates.push("title = ?");
          values.push(data.title);
        }
        if (data.scheduledDate !== undefined) {
          updates.push("scheduled_date = ?");
          values.push(data.scheduledDate);
        }
        if (data.scheduledTime !== undefined) {
          updates.push("scheduled_time = ?");
          values.push(data.scheduledTime);
        }
        if (data.dueDate !== undefined) {
          updates.push("due_date = ?");
          values.push(data.dueDate);
        }
        if (data.dueTime !== undefined) {
          updates.push("due_time = ?");
          values.push(data.dueTime);
        }
        if (data.notes !== undefined) {
          updates.push("notes = ?");
          values.push(data.notes);
        }
        if (data.recurrenceRule !== undefined) {
          updates.push("recurrence_rule = ?");
          values.push(
            data.recurrenceRule ? serializeRule(data.recurrenceRule) : null,
          );
        }
        if (data.recurrenceEndDate !== undefined) {
          updates.push("recurrence_end_date = ?");
          values.push(data.recurrenceEndDate);
        }

        if (updates.length === 0) return;

        updates.push("updated_at = ?");
        values.push(now);
        values.push(id);

        await db.runAsync(
          `UPDATE entries SET ${updates.join(", ")} WHERE id = ?`,
          ...values,
        );

        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, ...data, updated_at: now } : e,
          ),
        );
        await syncToWidget(db);
      } catch (error) {
        console.error("[DatabaseContext] updateEntry failed:", error);
        throw error;
      }
    },
    [],
  );

  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    try {
      const db = await getDb();
      await db.runAsync("DELETE FROM entries WHERE id = ?", id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      await syncToWidget(db);
    } catch (error) {
      console.error("[DatabaseContext] deleteEntry failed:", error);
      throw error;
    }
  }, []);

  const deleteIdea = useCallback(async (id: string): Promise<void> => {
    try {
      const db = await getDb();
      await db.runAsync("DELETE FROM ideas WHERE id = ?", id);
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error("[DatabaseContext] deleteIdea failed:", error);
      throw error;
    }
  }, []);

  const completeRecurringInstance = useCallback(
    async (
      entryId: string,
      instanceDate: string,
      status: DbEntry["status"],
    ): Promise<void> => {
      try {
        const db = await getDb();
        const id = generateId();
        const now = Math.floor(Date.now() / 1000);
        await db.runAsync(
          `INSERT OR REPLACE INTO recurrence_completions (id, entry_id, instance_date, status, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          id,
          entryId,
          instanceDate,
          status,
          now,
        );
        setRecurrenceCompletions((prev) => {
          const filtered = prev.filter(
            (c) =>
              !(c.entry_id === entryId && c.instance_date === instanceDate),
          );
          return [
            ...filtered,
            {
              id,
              entry_id: entryId,
              instance_date: instanceDate,
              status: status as DbRecurrenceCompletion["status"],
              created_at: now,
            },
          ];
        });
      } catch (error) {
        console.error(
          "[DatabaseContext] completeRecurringInstance failed:",
          error,
        );
        throw error;
      }
    },
    [],
  );

  const uncompleteRecurringInstance = useCallback(
    async (entryId: string, instanceDate: string): Promise<void> => {
      try {
        const db = await getDb();
        await db.runAsync(
          "DELETE FROM recurrence_completions WHERE entry_id = ? AND instance_date = ?",
          entryId,
          instanceDate,
        );
        setRecurrenceCompletions((prev) =>
          prev.filter(
            (c) =>
              !(c.entry_id === entryId && c.instance_date === instanceDate),
          ),
        );
      } catch (error) {
        console.error(
          "[DatabaseContext] uncompleteRecurringInstance failed:",
          error,
        );
        throw error;
      }
    },
    [],
  );

  const skipRecurringInstance = useCallback(
    async (entryId: string, instanceDate: string): Promise<void> => {
      return completeRecurringInstance(entryId, instanceDate, "completed");
    },
    [completeRecurringInstance],
  );

  const deleteRecurringFuture = useCallback(
    async (entryId: string, fromDate: string): Promise<void> => {
      // Set recurrence_end_date to the day before fromDate
      try {
        const db = await getDb();
        const parts = fromDate.split("/");
        const d = new Date(
          parseInt(parts[2], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[0], 10),
        );
        d.setDate(d.getDate() - 1);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        const endDate = `${dd}/${mm}/${yyyy}`;
        const now = Math.floor(Date.now() / 1000);
        await db.runAsync(
          "UPDATE entries SET recurrence_end_date = ?, updated_at = ? WHERE id = ?",
          endDate,
          now,
          entryId,
        );
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? { ...e, recurrence_end_date: endDate, updated_at: now }
              : e,
          ),
        );
      } catch (error) {
        console.error("[DatabaseContext] deleteRecurringFuture failed:", error);
        throw error;
      }
    },
    [],
  );

  const deleteRecurringSeries = useCallback(
    async (entryId: string): Promise<void> => {
      try {
        const db = await getDb();
        await db.runAsync("DELETE FROM entries WHERE id = ?", entryId);
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
        setRecurrenceCompletions((prev) =>
          prev.filter((c) => c.entry_id !== entryId),
        );
      } catch (error) {
        console.error("[DatabaseContext] deleteRecurringSeries failed:", error);
        throw error;
      }
    },
    [],
  );

  const value: DatabaseContextValue = {
    entries,
    ideas,
    recurrenceCompletions,
    isLoading,
    isCreating,
    createEntry,
    createIdea,
    updateEntry,
    updateEntryStatus,
    deleteEntry,
    deleteIdea,
    refetchEntries: fetchEntries,
    completeRecurringInstance,
    uncompleteRecurringInstance,
    skipRecurringInstance,
    deleteRecurringFuture,
    deleteRecurringSeries,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}
