import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import type { DbEntry, EntryType } from "@/lib/types";

dayjs.extend(customParseFormat);

// Pure when/runway/status logic for the direct zone (deadlines + todos + ideas;
// undated ideas fall into the calm band, never charged). Kept React-free so the
// row and the section can share it without a hook.

const TODAY_START = (): dayjs.Dayjs => dayjs().startOf("day");

/** Days from today until an entry's date; null if undated. Negative = overdue. */
export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return dayjs(dateStr, "DD/MM/YYYY").startOf("day").diff(TODAY_START(), "day");
}

/**
 * Absolute when-label sized to distance: "Someday" when undated, time today,
 * weekday this week, else date. An undated entry is a "someday" — surfaced as a
 * plain when-label like any other, not a separate badge.
 */
export function whenLabel(
  dateStr: string | null,
  time: string | null,
  days: number | null,
): string {
  if (days === null) return "Someday";
  const d = dayjs(dateStr!, "DD/MM/YYYY");
  if (days < 0) return `${Math.abs(days)}d over`;
  if (days === 0) return time ?? "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return d.format("ddd");
  if (d.isSame(TODAY_START(), "year")) return d.format("D MMM");
  return d.format("MMM YYYY");
}

/**
 * Is this entry close enough in time that its when-label should run in the type
 * color rather than muted ink? True when approaching (inside the next week) or
 * expired (overdue). A date comfortably out (≥7 days) reads muted — present,
 * not pressing. Undated has no date pressure at all, so never charged.
 */
export function isWhenCharged(days: number | null): boolean {
  if (days === null) return false;
  return days < 7; // < 0 = expired, 0..6 = approaching
}

/** Order: most burnt-down first (overdue → soonest), undated last. */
export function byRunway(a: DbEntry, b: DbEntry): number {
  const da = daysUntil(a.due_date ?? a.scheduled_date ?? null);
  const db = daysUntil(b.due_date ?? b.scheduled_date ?? null);
  if (da === null && db === null) return 0;
  if (da === null) return 1;
  if (db === null) return -1;
  return da - db;
}

/** A completed/met entry — done, regardless of its date. */
export function isDone(e: DbEntry): boolean {
  return e.status === "completed" || e.status === "met";
}

/** A todo completes to "completed", a deadline to "met" (its done status). */
export function doneStatus(type: EntryType): DbEntry["status"] {
  return type === "deadline" ? "met" : "completed";
}

/** The open counterpart of a done status: a todo reopens to "active", a
 *  deadline to "pending". Ideas have no done/undo toggle — handled by Archive. */
export function openStatus(type: EntryType): DbEntry["status"] {
  return type === "deadline" ? "pending" : "active";
}

/**
 * One ordered sequence for the paged direct zone: charged items first (overdue
 * → soonest), then the calm remainder, with done lines last. Page 1 therefore
 * always opens on the most pressing work; later pages drift toward calm and
 * done — "deadlines first" without a separately pinned band.
 */
export function sortDirect(entries: DbEntry[]): DbEntry[] {
  return [...entries].sort((a, b) => {
    // 1. done sinks below everything open
    const ad = isDone(a);
    const bd = isDone(b);
    if (ad !== bd) return ad ? 1 : -1;

    // 2. among open, charged (approaching/expired) rises above calm
    if (!ad) {
      const ac = isWhenCharged(daysUntil(a.due_date ?? a.scheduled_date ?? null));
      const bc = isWhenCharged(daysUntil(b.due_date ?? b.scheduled_date ?? null));
      if (ac !== bc) return ac ? -1 : 1;
    }

    // 3. within a band, runway order (overdue → soonest → undated)
    return byRunway(a, b);
  });
}

