/**
 * lib/notifications.ts
 *
 * Local notification scheduling for Synapse. Pure module — no React.
 *
 * Design decisions:
 * - Deadlines: one-shot reminders at the scheduled time for one-off entries.
 * - Recurring entries and habits: the next `RECURRING_LOOKAHEAD` instances are
 *   pre-armed with deterministic per-instance identifiers, so a series keeps
 *   reminding across days the app is never opened. A foreground resync (driven
 *   by the store middleware) refills the lookahead afterwards.
 * - Project returns: one invitation after a dormant project reaches seven days
 *   without opening, only while it still has open work.
 * - One in-memory registry plus a budget coordinator keeps the pending count
 *   under the iOS 64-notification cap: soonest-firing first, with the kind as
 *   tiebreaker (deadline > habit > project return).
 */

import * as Notifications from "expo-notifications";

import { parseDate } from "@/lib/date-utils";
import { expandCadence, expandRecurringEntry, isRecurringEntry, parseRule } from "@/lib/recurrence";
import { getNotificationPref } from "@/lib/settings";
import type { DbEntry, DbHabit, DbProject } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_RETURN_AFTER_DAYS = 7;
const DAY_MS = 86_400_000;
/** Instances pre-armed per recurring entry / habit. */
const RECURRING_LOOKAHEAD = 8;
/** Headroom under the iOS 64-pending-notification cap. */
const MAX_PENDING_NOTIFICATIONS = 60;
/** How often a foreground resync is allowed to rebuild the schedule. */
export const NOTIFICATION_RESYNC_INTERVAL_MS = 60 * 60 * 1000;

type ManagedKind = "deadline" | "habit" | "project-return";

/** Tiebreaker when two planned reminders land at the same moment. */
const KIND_PRIORITY: Record<ManagedKind, number> = {
  deadline: 0,
  habit: 1,
  "project-return": 2,
};

interface PendingNotification {
  kind: ManagedKind;
  /** entryId / habitId / projectId, depending on kind. */
  entityId: string;
  triggerDate: Date;
}

interface PlannedNotification extends PendingNotification {
  identifier: string;
  content: Notifications.NotificationContentInput;
}

// ─── In-memory registry ───────────────────────────────────────────────────────

/**
 * notificationId → what it is. Rebuilt on launch and kept in step by every
 * schedule/cancel. The deterministic identifiers make re-scheduling idempotent
 * at the OS level; this registry is what lets the budget guard compare and
 * trim pending reminders without parsing native triggers.
 */
const pendingRegistry = new Map<string, PendingNotification>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Stable notification identifiers. Re-using the same identifier makes
 * re-scheduling idempotent at the OS level (iOS replaces the pending request),
 * so an edited entry or reopened project can never stack duplicates — even
 * after a cold start rebuilt an empty in-memory registry.
 */
function entryNotificationId(entryId: string): string {
  return `entry-${entryId}`;
}

function entryInstanceNotificationId(entryId: string, dateKey: string): string {
  return `entry-${entryId}-${dateKey}`;
}

function habitInstanceNotificationId(habitId: string, dateKey: string): string {
  return `habit-${habitId}-${dateKey}`;
}

function projectReturnNotificationId(projectId: string): string {
  return `project-return-${projectId}`;
}

/** DD/MM/YYYY → YYYYMMDD, for compact per-instance identifiers. */
function instanceDateKey(dateStr: string): string {
  const [dd, mm, yyyy] = dateStr.split("/");
  return `${yyyy}${mm}${dd}`;
}

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
  // Only arm a reminder whose window is still ahead. A window that already
  // elapsed either already fired or belongs to a dormancy the user has since
  // returned from; re-arming it as a fresh trigger on every launch fired a
  // burst of stale nudges for every dormant project at once. The next real
  // invitation comes from the next project touch.
  return scheduled > new Date() ? scheduled : null;
}

/** Soonest first; kind only breaks exact ties. */
function comparePending(
  a: PendingNotification,
  b: PendingNotification,
): number {
  const byDate = a.triggerDate.getTime() - b.triggerDate.getTime();
  if (byDate !== 0) return byDate;
  return KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
}

// ─── Planning ─────────────────────────────────────────────────────────────────

/**
 * One-off deadlines fire once at their due time. Recurring deadlines arm the
 * next several instances instead, so the series survives days without an app
 * launch — the same `expandRecurringEntry` math the board renders.
 */
function planEntryNotifications(entry: DbEntry): PlannedNotification[] {
  // Only deadlines get notifications (todos/ideas are not time-triggered).
  if (entry.type !== "deadline") return [];
  if (isDone(entry)) return [];

  if (!isRecurringEntry(entry)) {
    const triggerDate = parseTriggerDate(entry.due_date, entry.due_time);
    if (!triggerDate || triggerDate <= new Date()) return [];
    return [
      {
        kind: "deadline",
        entityId: entry.id,
        triggerDate,
        identifier: entryNotificationId(entry.id),
        content: {
          title: entry.title,
          body: notificationBody(entry),
          sound: true,
          data: { kind: "deadline", entryId: entry.id },
        },
      },
    ];
  }

  const now = new Date();
  const oneYearOut = new Date(now);
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
  const dates = expandRecurringEntry(entry, now, oneYearOut);

  const planned: PlannedNotification[] = [];
  for (const dateStr of dates) {
    const triggerDate = parseTriggerDate(dateStr, entry.due_time);
    // Consume the lookahead only for instances that can still fire: today's
    // already-passed occurrence must not cost a slot.
    if (!triggerDate || triggerDate <= now) continue;
    planned.push({
      kind: "deadline",
      entityId: entry.id,
      triggerDate,
      identifier: entryInstanceNotificationId(
        entry.id,
        instanceDateKey(dateStr),
      ),
      content: {
        title: entry.title,
        body: notificationBody(entry),
        sound: true,
        data: { kind: "deadline", entryId: entry.id, instanceDate: dateStr },
      },
    });
    if (planned.length >= RECURRING_LOOKAHEAD) break;
  }
  return planned;
}

/**
 * The next instances of a habit at its reminder time. The body is the user's
 * own reason, verbatim — the encouragement is their words, never a streak.
 */
function planHabitNotifications(habit: DbHabit): PlannedNotification[] {
  if (habit.status !== "active" || !habit.reminder_time) return [];

  const rule = parseRule(habit.cadence);
  if (!rule) return [];

  const now = new Date();
  const oneYearOut = new Date(now);
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);

  // Expand from the start of today so an instance later today is a candidate.
  const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dates = expandCadence(
    { rule, startDate: habit.start_date, endDate: habit.end_date },
    fromDate,
    oneYearOut,
  );

  const planned: PlannedNotification[] = [];
  for (const dateStr of dates) {
    const triggerDate = parseTriggerDate(dateStr, habit.reminder_time);
    if (!triggerDate || triggerDate <= now) continue;
    planned.push({
      kind: "habit",
      entityId: habit.id,
      triggerDate,
      identifier: habitInstanceNotificationId(
        habit.id,
        instanceDateKey(dateStr),
      ),
      content: {
        title: habit.title,
        body: habit.motivation,
        sound: true,
        data: { kind: "habit", habitId: habit.id, instanceDate: dateStr },
      },
    });
    if (planned.length >= RECURRING_LOOKAHEAD) break;
  }
  return planned;
}

function planProjectReturnNotification(
  project: DbProject,
  entries: DbEntry[],
): PlannedNotification | null {
  const triggerDate = projectReturnDate(project, entries);
  if (!triggerDate) return null;

  return {
    kind: "project-return",
    entityId: project.id,
    triggerDate,
    identifier: projectReturnNotificationId(project.id),
    content: {
      title: `There's a thread waiting in ${project.title}`,
      body: "Open it and choose one thing to move.",
      sound: true,
      data: { kind: "project-return", projectId: project.id },
    },
  };
}

// ─── Low-level scheduling ─────────────────────────────────────────────────────

async function schedulePlanned(
  planned: PlannedNotification,
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: planned.identifier,
      content: planned.content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: planned.triggerDate,
      },
    });
    pendingRegistry.set(notificationId, {
      kind: planned.kind,
      entityId: planned.entityId,
      triggerDate: planned.triggerDate,
    });
    return notificationId;
  } catch (error) {
    console.warn("[notifications] scheduleNotificationAsync failed:", error);
    return null;
  }
}

async function cancelScheduledId(identifier: string): Promise<void> {
  pendingRegistry.delete(identifier);
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.warn(
      "[notifications] cancelScheduledNotificationAsync failed:",
      error,
    );
  }
}

/** Cancel every recorded instance belonging to one entry / habit / project. */
async function cancelEntityNotifications(
  kind: ManagedKind,
  entityId: string,
): Promise<void> {
  for (const [identifier, pending] of Array.from(pendingRegistry.entries())) {
    if (pending.kind === kind && pending.entityId === entityId) {
      await cancelScheduledId(identifier);
    }
  }
}

/**
 * Cancel everything this app scheduled. Used by the full coordinator before it
 * rebuilds: any pending request is one of ours (the share-extension fallback
 * notification is immediate, never pending), including reminders from builds
 * that predate the `kind` tag.
 */
async function cancelAllManagedNotifications(): Promise<void> {
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    for (const request of pending) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  } catch (error) {
    console.warn(
      "[notifications] cancelAllManagedNotifications failed:",
      error,
    );
  }
  pendingRegistry.clear();
}

/** Drop the furthest-firing, lowest-priority reminders past the iOS budget. */
async function pruneToBudget(): Promise<void> {
  if (pendingRegistry.size <= MAX_PENDING_NOTIFICATIONS) return;

  const ordered = Array.from(pendingRegistry.entries()).sort(([, a], [, b]) =>
    comparePending(a, b),
  );
  const overflow = ordered.slice(MAX_PENDING_NOTIFICATIONS);
  console.log(
    `[notifications] pending cap reached, dropping ${overflow.length} request(s)`,
  );
  for (const [identifier] of overflow) {
    await cancelScheduledId(identifier);
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
 * Schedule the reminders for a single entry. One-offs get a single request;
 * recurring deadlines get their next several instances. Returns the first
 * notification ID, or null if nothing should be scheduled.
 */
export async function scheduleEntryNotification(
  entry: DbEntry,
): Promise<string | null> {
  // User preference gates deadline reminders. When disabled, also drop any
  // already-scheduled reminder for this entry so a mid-flight toggle sticks.
  if (!(await getNotificationPref("deadlines"))) {
    await cancelNotificationForEntry(entry.id);
    return null;
  }

  // Replace every existing reminder for this entry before scheduling, and do
  // it before the trigger checks so a moved/past/completed deadline drops all
  // its stale reminders instead of leaving them pending. The deterministic
  // identifiers make the re-schedule idempotent; the explicit cancel
  // guarantees it on platforms where replacement by identifier isn't.
  await cancelNotificationForEntry(entry.id);

  const planned = planEntryNotifications(entry);
  let firstId: string | null = null;
  for (const item of planned) {
    const id = await schedulePlanned(item);
    if (id !== null && firstId === null) firstId = id;
  }
  await pruneToBudget();
  return firstId;
}

/** Cancel a previously scheduled notification by its notification ID. */
export async function cancelEntryNotification(
  notificationId: string,
): Promise<void> {
  await cancelScheduledId(notificationId);
}

/**
 * Cancel every reminder associated with an entry. Registry-backed (works for
 * a multi-instance recurring series) plus the one-off deterministic identifier
 * so it works even when the in-memory registry is cold. No-op if the entry has
 * no scheduled notification.
 */
export async function cancelNotificationForEntry(entryId: string): Promise<void> {
  await cancelEntityNotifications("deadline", entryId);
  await cancelScheduledId(entryNotificationId(entryId));
}

/**
 * Schedule the next nudge for one habit. Gated by the `habits` preference and
 * by the habit having a reminder time and being active.
 */
export async function scheduleHabitNotification(
  habit: DbHabit,
): Promise<string | null> {
  if (!(await getNotificationPref("habits"))) {
    await cancelHabitNotification(habit.id);
    return null;
  }

  // Replace any existing nudge before re-planning, so an edited cadence can't
  // leave earlier instances armed.
  await cancelHabitNotification(habit.id);

  const planned = planHabitNotifications(habit);
  let firstId: string | null = null;
  for (const item of planned) {
    const id = await schedulePlanned(item);
    if (id !== null && firstId === null) firstId = id;
  }
  await pruneToBudget();
  return firstId;
}

/** Cancel every pending nudge for a habit. */
export async function cancelHabitNotification(habitId: string): Promise<void> {
  await cancelEntityNotifications("habit", habitId);
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
  await cancelProjectReturnNotification(project.id);

  // User preference gates dormant-project invitations. Cancel above already
  // clears any pending one, so a mid-flight toggle-off sticks.
  if (!(await getNotificationPref("projectReturns"))) return null;

  const invitation = planProjectReturnNotification(project, entries);
  if (!invitation) return null;

  const id = await schedulePlanned(invitation);
  await pruneToBudget();
  return id;
}

/** Cancel a project's pending return invitation. */
export async function cancelProjectReturnNotification(
  projectId: string,
): Promise<void> {
  await cancelEntityNotifications("project-return", projectId);
  await cancelScheduledId(projectReturnNotificationId(projectId));
}

export interface NotificationSyncInput {
  entries: DbEntry[];
  projects: DbProject[];
  habits: DbHabit[];
}

/**
 * Rebuild the whole schedule from scratch under one shared budget: cancel
 * every pending request, plan deadlines, habit nudges, and project returns,
 * then arm the soonest `MAX_PENDING_NOTIFICATIONS` of them. Runs on bootstrap,
 * on a Settings resync, and (throttled) when the app returns to foreground so
 * a delivered recurring instance is replaced by the next one.
 */
export async function syncScheduledNotifications(
  input: NotificationSyncInput,
): Promise<void> {
  await cancelAllManagedNotifications();

  const [deadlinesEnabled, habitsEnabled, projectReturnsEnabled] =
    await Promise.all([
      getNotificationPref("deadlines"),
      getNotificationPref("habits"),
      getNotificationPref("projectReturns"),
    ]);

  const planned: PlannedNotification[] = [];

  if (deadlinesEnabled) {
    for (const entry of input.entries) {
      planned.push(...planEntryNotifications(entry));
    }
  }
  if (habitsEnabled) {
    for (const habit of input.habits) {
      planned.push(...planHabitNotifications(habit));
    }
  }
  if (projectReturnsEnabled) {
    // A project-return invitation is the one notification permission was
    // requested for; only rebuild them once it has been granted.
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") {
        for (const project of input.projects) {
          const invitation = planProjectReturnNotification(
            project,
            input.entries,
          );
          if (invitation) planned.push(invitation);
        }
      }
    } catch (error) {
      console.warn(
        "[notifications] getPermissionsAsync for projects failed:",
        error,
      );
    }
  }

  planned.sort(comparePending);

  const toSchedule = planned.slice(0, MAX_PENDING_NOTIFICATIONS);
  for (const item of toSchedule) {
    await schedulePlanned(item);
  }
  console.log(
    `[notifications] synced ${toSchedule.length} of ${planned.length} planned reminder(s)`,
  );
}
