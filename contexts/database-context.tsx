import dayjs from "dayjs";
import React, { createContext, useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import * as SQLite from "expo-sqlite";

import { generateId, initDatabase } from "@/lib/database";
import { seedDevDataIfEmpty } from "@/lib/dev-seed";
import {
  cancelNotificationForEntry,
  rescheduleAllEntries,
  scheduleEntryNotification,
} from "@/lib/notifications";
import { serializeRule } from "@/lib/recurrence";
import type {
  DbEntry,
  DbRecurrenceCompletion,
  RecurrenceRule,
} from "@/lib/types";

import type { EntryType } from "@/components/atoms/entry-dot";
import { SpeechRecognizerModule } from "@/modules/speech-recognizer";
import * as WatchConnectivity from "@/modules/watch-connectivity";
import { ExtensionStorage } from "@bacons/apple-targets";

const storage = new ExtensionStorage("group.dev.the-wedge.synapse-app");

function syncEntriesToWidget(entries: DbEntry[]): void {
  try {
    const widgetEntries = entries.slice(0, 10).map((e) => ({
      id: e.id,
      title: e.title,
      status: e.status,
    }));
    storage.set("widget_entries", widgetEntries);
    ExtensionStorage.reloadWidget("entriesWidget");
  } catch (error) {
    console.error("[DatabaseContext] syncEntriesToWidget failed:", error);
  }
}

interface DatabaseContextValue {
  entries: DbEntry[];
  recurrenceCompletions: DbRecurrenceCompletion[];
  isLoading: boolean;
  isCreating: boolean;
  createEntry: (data: CreateEntryInput) => Promise<DbEntry>;
  updateEntry: (id: string, data: UpdateEntryInput) => Promise<void>;
  updateEntryStatus: (id: string, status: DbEntry["status"]) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
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
  subtitle?: string;
  inspiration?: string;
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
  subtitle?: string | null;
  inspiration?: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  notes?: string | null;
  recurrenceRule?: RecurrenceRule | null;
  recurrenceEndDate?: string | null;
}

let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!initPromise) {
    initPromise = initDatabase();
  }
  return initPromise;
}

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({
  children,
}: DatabaseProviderProps): React.ReactElement {
  const [entries, setEntries] = useState<DbEntry[]>([]);
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
        syncEntriesToWidget(rows);
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
    (async () => {
      // DEV: populate mock data once if the table is empty, then load.
      try {
        const db = await getDb();
        await seedDevDataIfEmpty(db);
      } catch (err) {
        console.warn("[DatabaseContext] dev seed failed:", err);
      }
      fetchEntries();
      fetchRecurrenceCompletions();
    })();
  }, [fetchEntries, fetchRecurrenceCompletions]);

  // After the initial load, rebuild all scheduled notifications from scratch.
  // This self-heals any stale state from a previous launch.
  useEffect(() => {
    if (entries.length > 0 && !isLoading) {
      rescheduleAllEntries(entries).catch((err) => {
        console.warn("[DatabaseContext] rescheduleAllEntries failed:", err);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]); // intentionally runs once when initial load completes

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
           (id, title, type, subtitle, inspiration, scheduled_date, scheduled_time, due_date, due_time, notes, status, recurrence_rule, recurrence_end_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          data.title,
          data.type,
          data.subtitle ?? null,
          data.inspiration ?? null,
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
          syncEntriesToWidget(next);
          return next;
        });

        // Schedule notification — failures must not block the mutation
        scheduleEntryNotification(created).catch((err) => {
          console.warn("[DatabaseContext] scheduleEntryNotification failed:", err);
        });

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

  const syncPendingNotes = useCallback(async () => {
    try {
      // get() returns a JSON string (e.g. '["note1","note2"]') because
      // ExtensionStorage.get deserializes Data→JSON→string. Parse it manually.
      const raw = storage.get("pending_notes") as string | null;
      console.log("[DatabaseContext] pending_notes raw from Watch:", raw);
      if (!raw) return;

      let pendingNotes: string[] = [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed))
          pendingNotes = parsed.filter((v) => typeof v === "string");
      } catch {
        console.error(
          "[DatabaseContext] failed to parse pending_notes JSON:",
          raw,
        );
        return;
      }

      if (pendingNotes.length === 0) return;

      console.log(
        `[DatabaseContext] found ${pendingNotes.length} pending note(s) from Watch`,
      );

      for (const title of pendingNotes) {
        await createEntry({
          title,
          type: "todo",
          scheduledDate: dayjs().format("DD/MM/YYYY"),
        });
      }

      // Clear by writing an empty JSON array as Data (matching Watch write format)
      storage.remove("pending_notes");
      console.log(
        `[DatabaseContext] synced ${pendingNotes.length} Watch note(s)`,
      );
    } catch (error) {
      console.error("[DatabaseContext] syncPendingNotes failed:", error);
    }
  }, [createEntry]);

  useEffect(() => {
    syncPendingNotes();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        syncPendingNotes();
      }
    });

    // Listen for real-time messages from Watch
    const watchMsgSub = WatchConnectivity.addWatchMessageListener((message) => {
      console.log("[DatabaseContext] Received Watch message:", message);
      if (message.notes && Array.isArray(message.notes)) {
        message.notes.forEach((title: string) => {
          createEntry({
            title,
            type: "todo",
            scheduledDate: dayjs().format("DD/MM/YYYY"),
          });
        });
      }
    });

    // Listen for context updates (more reliable for background sync)
    const watchCtxSub = WatchConnectivity.addWatchContextListener((context) => {
      console.log("[DatabaseContext] Received Watch context:", context);
      if (context.notes && Array.isArray(context.notes)) {
        context.notes.forEach((title: string) => {
          createEntry({
            title,
            type: "todo",
            scheduledDate: dayjs().format("DD/MM/YYYY"),
          });
        });
      }
    });

    // Listen for audio files from Watch
    const watchFileSub = WatchConnectivity.addWatchFileListener(
      async (file) => {
        console.log("[DatabaseContext] Received Watch file event:", file);
        if (!file.url) {
          console.warn("[DatabaseContext] Received file event without URL");
          return;
        }

        try {
          console.log(
            "[DatabaseContext] Triggering transcription for:",
            file.url,
          );
          const transcript = await SpeechRecognizerModule.transcribeFile(
            file.url,
          );
          console.log("[DatabaseContext] Transcription result:", transcript);
          if (transcript) {
            createEntry({
              title: transcript,
              type: "todo",
              scheduledDate: dayjs().format("DD/MM/YYYY"),
            });
          }
        } catch (error) {
          console.error("[DatabaseContext] Transcription failed:", error);
        }
      },
    );

    const interval = setInterval(syncPendingNotes, 30000);

    return () => {
      subscription.remove();
      watchMsgSub.remove();
      watchCtxSub.remove();
      watchFileSub.remove();
      clearInterval(interval);
    };
  }, [syncPendingNotes, createEntry]);

  // Push latest notes to Watch for bidirectional sync
  useEffect(() => {
    if (entries.length > 0) {
      const titles = entries.slice(0, 20).map((e) => e.title);
      WatchConnectivity.updateWatchContext({ phone_notes: titles }).catch((err) => {
        console.warn("[DatabaseContext] Failed to sync to Watch:", err.message);
      });
    }
  }, [entries]);

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
        let updatedEntry: DbEntry | undefined;
        setEntries((prev) => {
          const next = prev.map((e) => {
            if (e.id === id) {
              updatedEntry = { ...e, status, updated_at: now };
              return updatedEntry;
            }
            return e;
          });
          syncEntriesToWidget(next);
          return next;
        });

        // Re-schedule notification with updated status — failures must not block
        if (updatedEntry) {
          scheduleEntryNotification(updatedEntry).catch((err) => {
            console.warn("[DatabaseContext] scheduleEntryNotification (status) failed:", err);
          });
        }
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

        let updatedEntry: DbEntry | undefined;
        setEntries((prev) => {
          const next = prev.map((e) => {
            if (e.id === id) {
              updatedEntry = { ...e, ...data, updated_at: now };
              return updatedEntry;
            }
            return e;
          });
          syncEntriesToWidget(next);
          return next;
        });

        // Re-schedule notification with updated fields — failures must not block
        if (updatedEntry) {
          scheduleEntryNotification(updatedEntry).catch((err) => {
            console.warn("[DatabaseContext] scheduleEntryNotification (update) failed:", err);
          });
        }
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
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        syncEntriesToWidget(next);
        return next;
      });

      // Cancel any pending notification — failures must not block
      cancelNotificationForEntry(id).catch((err) => {
        console.warn("[DatabaseContext] cancelNotificationForEntry failed:", err);
      });
    } catch (error) {
      console.error("[DatabaseContext] deleteEntry failed:", error);
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
        setEntries((prev) => {
          const next = prev.map((e) =>
            e.id === entryId
              ? { ...e, recurrence_end_date: endDate, updated_at: now }
              : e,
          );
          syncEntriesToWidget(next);
          return next;
        });
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
        setEntries((prev) => {
          const next = prev.filter((e) => e.id !== entryId);
          syncEntriesToWidget(next);
          return next;
        });
        setRecurrenceCompletions((prev) =>
          prev.filter((c) => c.entry_id !== entryId),
        );

        // Cancel any pending notification — failures must not block
        cancelNotificationForEntry(entryId).catch((err) => {
          console.warn("[DatabaseContext] cancelNotificationForEntry (series) failed:", err);
        });
      } catch (error) {
        console.error("[DatabaseContext] deleteRecurringSeries failed:", error);
        throw error;
      }
    },
    [],
  );

  const value: DatabaseContextValue = {
    entries,
    recurrenceCompletions,
    isLoading,
    isCreating,
    createEntry,
    updateEntry,
    updateEntryStatus,
    deleteEntry,
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
