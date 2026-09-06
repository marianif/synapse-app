/**
 * lib/notifications.ts
 *
 * Local notification scheduling for Synapse. Pure module — no React.
 *
 * Design decisions:
 * - Deadlines: single notification AT the scheduled time (not 15 min before),
 *   keeping v1 simple and predictable.
 * - Project returns: one invitation after a dormant project reaches seven days
 *   without opening, only while it still has open work.
 * - Recurring entries: schedule ONLY the next upcoming instance.
 *   iOS caps pending notifications at 64; scheduling the full series would
 *   exhaust that budget quickly.
 * - entryId → notificationId mapping is kept in-memory; rebuilt on each
 *   launch via rescheduleAllEntries(). No new DB column required.
 */

import * as Notifications from "expo-notifications";

import { parseDate } from "@/lib/date-utils";
import { expandRecurringEntry, isRecurringEntry } from "@/lib/recurrence";
import type { DbEntry, DbProject } from "@/lib/types";

// ─── In-memory mapping ────────────────────────────────────────────────────────

/** entryId → notificationId (in-memory, rebuilt on launch). */
const notificationMap = new Map<string, string>();
const projectNotificationMap = new Map<string, string>();
const PROJECT_RETURN_AFTER_DAYS = 7;
const DAY_MS = 86_400_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a DD/MM/YYYY date string + optional "HH:MM" time string into a Date.
 * Defaults to 09:00 local time when no time is provided.
 */
function parseTriggerDate(
  dateStr: string | null,
  timeStr: string | null,
): Date | null {
  const base = parseDate(dateStr);
  if (!base) return null;

  if (timeStr) {
    const [hh, mm] = timeStr.split(":").map(Number);
    if (!isNaN(hh) && !isNaN(mm)) {
      base.setHours(hh, mm, 0, 0);
      return base;
    }
  }

  // Default: 9:00 AM local
  base.setHours(9, 0, 0, 0);
  return base;
}

/**
 * Returns the next upcoming instance date string (DD/MM/YYYY) for a recurring
 * entry, looking ahead up to one year from now. Returns null if none found.
 */
function nextRecurringDate(entry: DbEntry): string | null {
  const now = new Date();
  const oneYearOut = new Date(now);
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);

  const dates = expandRecurringEntry(entry, now, oneYearOut);
  return dates.length > 0 ? dates[0] : null;
}

/**
 * Build a trigger Date for an entry. Returns null when the entry should not
 * receive a notification (wrong type, already done, no date, or in the past).
 */
function buildTriggerDate(entry: DbEntry): Date | null {
  // Only deadlines get notifications (todos/ideas are not time-triggered).
  if (entry.type !== "deadline") return null;

  // Skip completed/met entries
  if (entry.status === "completed" || entry.status === "met") return null;

  let dateStr: string | null;
  let timeStr: string | null;

  if (isRecurringEntry(entry)) {
    // For recurring entries, find the next future instance
    const nextDate = nextRecurringDate(entry);
    if (!nextDate) return null;
    dateStr = nextDate;
    timeStr = entry.due_time;
  } else {
    dateStr = entry.due_date;
    timeStr = entry.due_time;
  }

  const triggerDate = parseTriggerDate(dateStr, timeStr);
  if (!triggerDate) return null;

  // Don't schedule if the trigger is in the past
  if (triggerDate <= new Date()) return null;

  return triggerDate;
}

/** Human-readable notification body line. */
function notificationBody(_entry: DbEntry): string {
  return "Deadline today";
}

function toMs(timestamp: number | null): number | null {
  if (timestamp === null || timestamp === 0) return null;
  return timestamp < 1e11 ? timestamp * 1000 : timestamp;
}

function isDone(entry: DbEntry): boolean {
  return entry.status === "completed" || entry.status === "met";
}

function projectHasOpenWork(project: DbProject, entries: DbEntry[]): boolean {
  return entries.some(
    (entry) => entry.project_id === project.id && !isDone(entry),
  );
}

function projectReturnDate(
  project: DbProject,
  entries: DbEntry[],
): Date | null {
  if (project.status !== "active" || !projectHasOpenWork(project, entries)) {
    return null;
  }

  const lastSeen = toMs(project.last_opened_at) ?? toMs(project.created_at);
  if (lastSeen === null) return null;

  const scheduled = new Date(lastSeen + PROJECT_RETURN_AFTER_DAYS * DAY_MS);
  // If the app was not opened during the return window, surface the reminder
  // shortly after the next launch rather than scheduling into the past.
  return scheduled > new Date() ? scheduled : new Date(Date.now() + 60_000);
}

async function cancelScheduledProjectNotifications(
  projectId?: string,
): Promise<void> {
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    for (const request of pending) {
      const data = request.content.data as
        | { kind?: unknown; projectId?: unknown }
        | undefined;
      if (
        data?.kind !== "project-return" ||
        (projectId !== undefined && data.projectId !== projectId)
      ) {
        continue;
      }
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  } catch (error) {
    console.warn(
      "[notifications] cancelScheduledProjectNotifications failed:",
      error,
    );
  }

  if (projectId === undefined) {
    projectNotificationMap.clear();
  } else {
    projectNotificationMap.delete(projectId);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Request local notification permissions. Returns true if granted. */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.warn("[notifications] requestNotificationPermissions failed:", error);
    return false;
  }
}

/**
 * Schedule a local notification for a single entry.
 * Returns the notification ID, or null if no notification should be scheduled.
 */
export async function scheduleEntryNotification(
  entry: DbEntry,
): Promise<string | null> {
  const triggerDate = buildTriggerDate(entry);
  if (!triggerDate) return null;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: entry.title,
        body: notificationBody(entry),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    notificationMap.set(entry.id, notificationId);
    return notificationId;
  } catch (error) {
    console.warn("[notifications] scheduleEntryNotification failed:", error);
    return null;
  }
}

/** Cancel a previously scheduled notification by its notification ID. */
export async function cancelEntryNotification(
  notificationId: string,
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn("[notifications] cancelEntryNotification failed:", error);
  }
}

/**
 * Cancel the notification associated with an entry (looked up from the
 * in-memory map). No-op if the entry has no scheduled notification.
 */
export async function cancelNotificationForEntry(entryId: string): Promise<void> {
  const notificationId = notificationMap.get(entryId);
  if (!notificationId) return;
  notificationMap.delete(entryId);
  await cancelEntryNotification(notificationId);
}

/**
 * Cancel all pending notifications, then re-schedule for all provided entries.
 * Called once on app launch to self-heal any stale notification state.
 * Returns a Map of entryId → notificationId for entries that got scheduled.
 */
export async function rescheduleAllEntries(
  entries: DbEntry[],
): Promise<Map<string, string>> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    notificationMap.clear();
  } catch (error) {
    console.warn("[notifications] cancelAllScheduledNotificationsAsync failed:", error);
  }

  for (const entry of entries) {
    await scheduleEntryNotification(entry);
  }

  return new Map(notificationMap);
}

/**
 * Schedule the next return invitation for a project with open work. Existing
 * project-return requests are removed first so a project cannot nag more than
 * once for the same dormant period.
 */
export async function scheduleProjectReturnNotification(
  project: DbProject,
  entries: DbEntry[],
): Promise<string | null> {
  await cancelScheduledProjectNotifications(project.id);
  const triggerDate = projectReturnDate(project, entries);
  if (!triggerDate) return null;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `There's a thread waiting in ${project.title}`,
        body: "Open it and choose one thing to move.",
        sound: true,
        data: { kind: "project-return", projectId: project.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    projectNotificationMap.set(project.id, notificationId);
    return notificationId;
  } catch (error) {
    console.warn(
      "[notifications] scheduleProjectReturnNotification failed:",
      error,
    );
    return null;
  }
}

/** Cancel a project's pending return invitation. */
export async function cancelProjectReturnNotification(
  projectId: string,
): Promise<void> {
  await cancelScheduledProjectNotifications(projectId);
}

/**
 * Rebuild project-return requests without touching deadline notifications.
 * This runs on bootstrap only when notification permission already exists;
 * opening a project is what requests permission for the first time.
 */
export async function rescheduleAllProjectNotifications(
  projects: DbProject[],
  entries: DbEntry[],
): Promise<Map<string, string>> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return new Map();
  } catch (error) {
    console.warn(
      "[notifications] getPermissionsAsync for projects failed:",
      error,
    );
    return new Map();
  }

  await cancelScheduledProjectNotifications();
  for (const project of projects) {
    await scheduleProjectReturnNotification(project, entries);
  }
  return new Map(projectNotificationMap);
}
