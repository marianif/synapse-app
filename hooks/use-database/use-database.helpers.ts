import dayjs from "dayjs";

import type { EntryType } from "@/components/atoms/entry-dot";
import type { DbEntry, DbRecurrenceCompletion } from "@/lib/schema";
import { buildRecurringInstances, isRecurringEntry } from "@/lib/recurrence";
import { isSameDay, toDisplayDate } from "@/lib/date-utils";

// ─── Status normalization ─────────────────────────────────────────────────────

export function normalizeEntryStatus(
  raw: string | undefined,
): "scheduled" | "active" | "completed" {
  if (raw === "completed" || raw === "met") return "completed";
  if (raw === "active" || raw === "overdue") return "active";
  return "scheduled";
}

// ─── Entry transformations ────────────────────────────────────────────────────

export interface DayEntry {
  id: string;
  title: string;
  type: EntryType;
  date: string;
  time: string | null;
}

export function getEntriesForDay(
  entries: DbEntry[],
  completions: DbRecurrenceCompletion[],
  date: Date,
): DayEntry[] {
  const key = toDisplayDate(date);

  const nonRecurring = entries
    .filter(
      (e) =>
        !isRecurringEntry(e) &&
        isSameDay(e.scheduled_date ?? e.due_date, date),
    )
    .map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type as EntryType,
      date: key,
      time: e.scheduled_time ?? e.due_time ?? null,
    }));

  const recurring = buildRecurringInstances(
    entries.filter(isRecurringEntry),
    completions,
    date,
    date,
  )
    .filter((inst) => !inst.isDone)
    .map((inst) => ({
      id: `${inst.entry.id}::${inst.instanceDate}`,
      title: inst.entry.title,
      type: inst.entry.type as EntryType,
      date: key,
      time: inst.entry.scheduled_time ?? inst.entry.due_time ?? null,
    }));

  return [...nonRecurring, ...recurring];
}

// ─── Weekly todos ─────────────────────────────────────────────────────────────

export interface WeeklyTodoItem {
  day: string;
  title?: string;
  entryType: "todo";
  status?: "scheduled" | "active" | "completed";
}

export function getWeeklyTodos(
  entries: DbEntry[],
  weekDays: { abbr: string; date: Date }[],
): WeeklyTodoItem[] {
  const taskEntries = entries.filter((e) => e.type === "todo");
  return weekDays.map(({ abbr, date }) => {
    const entry = taskEntries.find((e) => isSameDay(e.scheduled_date, date));
    return {
      day: abbr,
      title: entry?.title,
      entryType: "todo" as const,
      status: normalizeEntryStatus(entry?.status),
    };
  });
}

// ─── Deadlines ────────────────────────────────────────────────────────────────

export interface DeadlineItem {
  day: string;
  title: string;
  status?: "scheduled" | "active" | "completed";
}

export function getDeadlines(entries: DbEntry[]): DeadlineItem[] {
  return entries
    .filter((e) => e.type === "deadline" && e.due_date)
    .sort(
      (a, b) =>
        dayjs(a.due_date!, "DD/MM/YYYY").unix() -
        dayjs(b.due_date!, "DD/MM/YYYY").unix(),
    )
    .map((entry) => ({
      day: dayjs(entry.due_date!, "DD/MM/YYYY").format("DD/MM"),
      title: entry.title,
      status: normalizeEntryStatus(entry.status),
    }));
}

// ─── Today events ─────────────────────────────────────────────────────────────

export interface TodayEventItem {
  id: string;
  title: string;
  timeRange?: string;
  isActive: boolean;
}

export function getTodayEvents(
  entries: DbEntry[],
  today: Date,
): TodayEventItem[] {
  return entries
    .filter((e) => e.type === "event" && isSameDay(e.scheduled_date, today))
    .map((e) => ({
      id: e.id,
      title: e.title,
      timeRange: e.scheduled_time ?? undefined,
      isActive: e.status === "active",
    }));
}

// ─── Today agenda ─────────────────────────────────────────────────────────────

export interface TodayAgendaItem {
  id: string;
  title: string;
  time?: string;
  entryType: EntryType;
}

export function getTodayAgenda(
  entries: DbEntry[],
  completions: DbRecurrenceCompletion[],
  today: Date,
): TodayAgendaItem[] {
  const recurringInstances = buildRecurringInstances(
    entries.filter(isRecurringEntry),
    completions,
    today,
    today,
  ).filter((inst) => !inst.isDone);

  return [
    ...entries
      .filter(
        (e) => !isRecurringEntry(e) && isSameDay(e.scheduled_date, today),
      )
      .map((e) => ({
        id: e.id,
        title: e.title,
        time: e.scheduled_time ?? e.due_time ?? undefined,
        entryType: e.type,
      })),
    ...recurringInstances.map((inst) => ({
      id: `${inst.entry.id}::${inst.instanceDate}`,
      title: inst.entry.title,
      time: inst.entry.scheduled_time ?? inst.entry.due_time ?? undefined,
      entryType: inst.entry.type,
    })),
  ];
}
