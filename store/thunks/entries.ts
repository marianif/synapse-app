import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  deleteTasksForEntry as dbDeleteTasksForEntry,
  ensureDb,
  generateId,
} from "@/lib/database";
import { serializeRule } from "@/lib/recurrence";
import type {
  CreateEntryInput,
  DbEntry,
  EntryType,
  UpdateEntryInput,
} from "@/lib/types";

import { run } from "@/store/thunks/utils";

export const fetchEntries = createAsyncThunk<DbEntry[], EntryType | undefined>(
  "entries/fetch",
  async (type) => {
    const db = await ensureDb();
    if (type) {
      return db.getAllAsync<DbEntry>(
        "SELECT * FROM entries WHERE type = ? ORDER BY created_at DESC",
        type,
      );
    }
    return db.getAllAsync<DbEntry>("SELECT * FROM entries ORDER BY created_at DESC");
  },
);

export const createEntry = createAsyncThunk<DbEntry, CreateEntryInput>(
  "entries/create",
  (data) =>
    run("createEntry", async () => {
      const db = await ensureDb();
      const id = generateId();
      const now = Math.floor(Date.now() / 1000);
      const status = data.type === "deadline" ? "pending" : "scheduled";

      await db.runAsync(
        `INSERT INTO entries
         (id, title, type, subtitle, inspiration, scheduled_date, scheduled_time, due_date, due_time, notes, status, recurrence_rule, recurrence_end_date, project_id, due_range, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        data.projectId ?? null,
        data.dueRange ?? null,
        now,
        now,
      );

      const created = await db.getFirstAsync<DbEntry>(
        "SELECT * FROM entries WHERE id = ?",
        id,
      );
      if (!created) throw new Error("Entry was not persisted");
      return created;
    }),
);

export const updateEntry = createAsyncThunk<
  DbEntry,
  { id: string; data: UpdateEntryInput }
>("entries/update", ({ id, data }) =>
  run("updateEntry", async () => {
    const db = await ensureDb();
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
    if (data.subtitle !== undefined) {
      updates.push("subtitle = ?");
      values.push(data.subtitle);
    }
    if (data.inspiration !== undefined) {
      updates.push("inspiration = ?");
      values.push(data.inspiration);
    }
    if (data.projectId !== undefined) {
      updates.push("project_id = ?");
      values.push(data.projectId);
    }
    if (data.dueRange !== undefined) {
      updates.push("due_range = ?");
      values.push(data.dueRange);
    }

    if (updates.length > 0) {
      updates.push("updated_at = ?");
      values.push(now);
      values.push(id);
      await db.runAsync(
        `UPDATE entries SET ${updates.join(", ")} WHERE id = ?`,
        ...values,
      );
    }

    const updated = await db.getFirstAsync<DbEntry>(
      "SELECT * FROM entries WHERE id = ?",
      id,
    );
    if (!updated) throw new Error(`Entry ${id} not found`);
    return updated;
  }),
);

export const updateEntryStatus = createAsyncThunk<
  DbEntry,
  { id: string; status: DbEntry["status"] }
>("entries/updateStatus", ({ id, status }) =>
  run("updateEntryStatus", async () => {
    const db = await ensureDb();
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      "UPDATE entries SET status = ?, updated_at = ? WHERE id = ?",
      status,
      now,
      id,
    );
    const updated = await db.getFirstAsync<DbEntry>(
      "SELECT * FROM entries WHERE id = ?",
      id,
    );
    if (!updated) throw new Error(`Entry ${id} not found`);
    return updated;
  }),
);

export const deleteEntry = createAsyncThunk<string, string>(
  "entries/delete",
  (id) =>
    run("deleteEntry", async () => {
      const db = await ensureDb();
      // App-side ON DELETE SET NULL for linked diary notes (the FK clause can't
      // be added by ADD COLUMN) — a reflection survives as an autonomous note.
      await db.runAsync(
        "UPDATE diary_entries SET linked_entry_id = NULL WHERE linked_entry_id = ?",
        id,
      );
      // App-side ON DELETE CASCADE for subtasks: expo-sqlite leaves
      // `PRAGMA foreign_keys` off, so the clause on `tasks` never fires.
      await dbDeleteTasksForEntry(id);
      await db.runAsync("DELETE FROM entries WHERE id = ?", id);
      return id;
    }),
);

export const deleteRecurringFuture = createAsyncThunk<
  DbEntry,
  { id: string; fromDate: string }
>("entries/deleteRecurringFuture", ({ id, fromDate }) =>
  run("deleteRecurringFuture", async () => {
    const db = await ensureDb();
    // Set recurrence_end_date to the day before fromDate
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
      id,
    );
    const updated = await db.getFirstAsync<DbEntry>(
      "SELECT * FROM entries WHERE id = ?",
      id,
    );
    if (!updated) throw new Error(`Entry ${id} not found`);
    return updated;
  }),
);

export const deleteRecurringSeries = createAsyncThunk<string, string>(
  "entries/deleteRecurringSeries",
  (id) =>
    run("deleteRecurringSeries", async () => {
      const db = await ensureDb();
      await db.runAsync(
        "UPDATE diary_entries SET linked_entry_id = NULL WHERE linked_entry_id = ?",
        id,
      );
      await dbDeleteTasksForEntry(id);
      await db.runAsync("DELETE FROM entries WHERE id = ?", id);
      return id;
    }),
);