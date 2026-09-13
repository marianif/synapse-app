/**
 * lib/notifications.ts
 *
 * Local notification scheduling for Synapse. Pure module — no React.
 *
 * Design decisions:
 * - Deadlines: one-shot reminders, shifted earlier by the user's lead time
 *   (0 = at the deadline). Bodies state the remaining gap and the project.
 * - Recurring entries and habits: the next `RECURRING_LOOKAHEAD` instances are
 *   pre-armed with deterministic per-instance identifiers, so a series keeps
 *   reminding across days the app is never opened. A foreground resync (driven
 *   by the store middleware) refills the lookahead afterwards.
 * - Project returns: one invitation after a dormant project reaches seven days
 *   without opening, only while it still has open work. Once that window has
 *   elapsed the user's dormant behavior decides what happens next: drop,
 *   a single summary, or staggered per-project catch-ups (at most weekly).
 * - One in-memory registry plus a budget coordinator keeps the pending count
 *   under the iOS 64-notification cap: soonest-firing first, with the kind as
 *   tiebreaker (deadline > habit > project return).
 */

import * as Notifications from "expo-notifications";

import { parseDate } from "@/lib/date-utils";
import { expandCadence, expandRecurringEntry, isRecurringEntry, parseRule } from "@/lib/recurrence";
import {
  getArmedDeadlines,
  getDeadlineLeadMinutes,
  getDormancyMarkers,
  getDormantReminderBehavior,
  getNotificationPref,
  setArmedDeadlines,
  setDormancyMarkers,
  type ArmedDeadlines,
  type DormancyMarker,
  type DormantReminderBehavior,
} from "@/lib/settings";
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
/** A dormant project re-surfaces at most this often once its window elapsed. */
const DORMANCY_COOLDOWN_MS = 7 * DAY_MS;
/** Dormant catch-ups land at the next 9:00 local, at least this far out. */
const DORMANCY_QUIET_HOUR = 9;
const DORMANCY_MIN_LEAD_MS = 60 * 60 * 1000;
/** Space between staggered per-project catch-ups. */
const DORMANCY_STAGGER_MS = 30 * 60 * 1000;

type ManagedKind =
  | "deadline"
  | "habit"
  | "project-return"
  | "project-summary";

/** Tiebreaker when two planned reminders land at the same moment. */
const KIND_PRIORITY: Record<ManagedKind, number> = {
  deadline: 0,
  habit: 1,
  "project-return": 2,
  "project-summary": 2,
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

/** Distance between a reminder's fire instant and its deadline, in words. */
function relativePhrase(gapMs: number): string {
  const minutes = Math.round(gapMs / 60_000);
  if (minutes <= 0) return "Due now";
  if (minutes < 60) {
    return `Due in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `Due in ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(hours / 24);
  return days === 1 ? "Due tomorrow" : `Due in ${days} days`;
}

/**
 * Human-readable notification body: how long until the deadline at the moment
 * the reminder actually fires, plus the owning project so a filed deadline
 * says where it lives. Never the old constant "Deadline today".
 */
function notificationBody(gapMs: number, projectTitle?: string | null): string {
  const phrase = relativePhrase(gapMs);
  return projectTitle ? `${phrase} · ${projectTitle}` : phrase;
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

/**
 * The exact instant a project's dormancy window elapses (`last_seen + 7 days`),
 * regardless of whether that instant is past or future. Null when the project
 * is archived, has no open work, or has no usable timestamp.
 */
function projectReturnWindow(
  project: DbProject,
  entries: DbEntry[],
): Date | null {
  if (project.status !== "active" || !projectHasOpenWork(project, entries)) {
    return null;
  }

  const lastSeen = toMs(project.last_opened_at) ?? toMs(project.created_at);
  if (lastSeen === null) return null;

  return new Date(lastSeen + PROJECT_RETURN_AFTER_DAYS * DAY_MS);
}

/** The future 7-day return invitation, or null once the window has elapsed. */
function projectReturnDate(
  project: DbProject,
  entries: DbEntry[],
): Date | null {
  const windowAt = projectReturnWindow(project, entries);
  if (!windowAt) return null;
  // Only arm a reminder whose window is still ahead. An elapsed window is the
  // dormant catch-up planner's job (drop / summary / staggered) rather than a
  // fresh trigger on every launch, which was the original burst bug.
  return windowAt > new Date() ? windowAt : null;
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
 * Resolve when a deadline's reminder actually fires. Normal case: `lead`
 * minutes before the deadline. If that instant is still ahead, arm it and
 * remember the deadline so a later rebuild knows it was handled. If the lead
 * window already passed while the deadline is still ahead, deliver once right
 * away and record it — never twice, and never dropped.
 */
function resolveTrigger(
  deadline: Date,
  leadMinutes: number,
  notificationId: string,
  armed: ArmedDeadlines,
): Date | null {
  const now = Date.now();
  const deadlineMs = deadline.getTime();
  if (deadlineMs <= now) return null;
  if (leadMinutes <= 0) return deadline;

  const notifyAt = deadlineMs - leadMinutes * 60_000;
  if (notifyAt > now) {
    armed[notificationId] = deadlineMs;
    return new Date(notifyAt);
  }

  if (armed[notificationId] === deadlineMs) return null;
  armed[notificationId] = deadlineMs;
  return new Date(now + 1000);
}

/** Drop ledger entries whose deadline has already passed. */
function pruneArmedDeadlines(armed: ArmedDeadlines, nowMs: number): ArmedDeadlines {
  const next: ArmedDeadlines = {};
  for (const [id, deadlineMs] of Object.entries(armed)) {
    if (deadlineMs >= nowMs) next[id] = deadlineMs;
  }
  return next;
}

/**
 * One-off deadlines fire once at their due time. Recurring deadlines arm the
 * next several instances instead, so the series survives days without an app
 * launch — the same `expandRecurringEntry` math the board renders. The user's
 * lead time shifts each trigger earlier; the body states the remaining gap.
 */
function planEntryNotifications(
  entry: DbEntry,
  leadMinutes: number,
  projectTitle: string | null | undefined,
  armed: ArmedDeadlines,
): PlannedNotification[] {
  // Only deadlines get notifications (todos/ideas are not time-triggered).
  if (entry.type !== "deadline") return [];
  if (isDone(entry)) return [];

  if (!isRecurringEntry(entry)) {
    const deadline = parseTriggerDate(entry.due_date, entry.due_time);
    if (!deadline) return [];
    const identifier = entryNotificationId(entry.id);
    const triggerDate = resolveTrigger(deadline, leadMinutes, identifier, armed);
    if (!triggerDate) return [];
    return [
      {
        kind: "deadline",
        entityId: entry.id,
        triggerDate,
        identifier,
        content: {
          title: entry.title,
          body: notificationBody(
            deadline.getTime() - triggerDate.getTime(),
            projectTitle,
          ),
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
    const deadline = parseTriggerDate(dateStr, entry.due_time);
    if (!deadline) continue;
    const identifier = entryInstanceNotificationId(
      entry.id,
      instanceDateKey(dateStr),
    );
    const triggerDate = resolveTrigger(deadline, leadMinutes, identifier, armed);
    // Consume the lookahead only for instances that can still fire: a past
    // occurrence must not cost a slot.
    if (!triggerDate) continue;
    planned.push({
      kind: "deadline",
      entityId: entry.id,
      triggerDate,
      identifier,
      content: {
        title: entry.title,
        body: notificationBody(
          deadline.getTime() - triggerDate.getTime(),
          projectTitle,
        ),
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
  fireAt: Date,
): PlannedNotification {
  return {
    kind: "project-return",
    entityId: project.id,
    triggerDate: fireAt,
    identifier: projectReturnNotificationId(project.id),
    content: {
      title: `There's a thread waiting in ${project.title}`,
      body: "Open it and choose one thing to move.",
      sound: true,
      data: { kind: "project-return", projectId: project.id },
    },
  };
}

/** One catch-up covering every dormant project in a "summary" pass. */
function planProjectSummaryNotification(
  projects: DbProject[],
  fireAt: Date,
): PlannedNotification {
  const names = projects.slice(0, 3).map((project) => project.title);
  const extra = projects.length - names.length;
  const body =
    extra > 0
      ? `${names.join(", ")} and ${extra} more are still open.`
      : `${names.join(", ")} ${names.length === 1 ? "is" : "are"} still open.`;

  return {
    kind: "project-summary",
    entityId: "project-summary",
    triggerDate: fireAt,
    identifier: "project-summary",
    content: {
      title:
        projects.length === 1 ? "A project is waiting" : "Projects are waiting",
      body,
      sound: true,
      data: {
        kind: "project-summary",
        projectIds: projects.map((project) => project.id),
      },
    },
  };
}

/** Next 9:00 local at least an hour away, so a catch-up never lands "now". */
function nextQuietHour(fromMs: number): number {
  const candidate = new Date(fromMs);
  candidate.setHours(DORMANCY_QUIET_HOUR, 0, 0, 0);
  if (candidate.getTime() < fromMs + DORMANCY_MIN_LEAD_MS) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.getTime();
}

interface DormancyPlan {
  notifications: PlannedNotification[];
  markers: Record<string, DormancyMarker>;
}

/**
 * Decide how every project's dormancy surfaces. Future windows keep their
 * single +7d invitation (re-planned identically on every rebuild). Elapsed
 * windows follow the user's behavior: dropped, gathered into one summary, or
 * nudged one at a time. The returned markers store each armed instant so a
 * pending catch-up is re-planned rather than lost when the coordinator cancels
 * everything, and so a still-dormant project waits out the 7-day cooldown.
 */
function planDormantCatchUps(
  projects: DbProject[],
  entries: DbEntry[],
  behavior: DormantReminderBehavior,
  markers: Record<string, DormancyMarker>,
  nowMs: number,
): DormancyPlan {
  const nextMarkers: Record<string, DormancyMarker> = {};
  const notifications: PlannedNotification[] = [];
  const catchUps: {
    project: DbProject;
    anchorAt: number | null;
    dormantSince: number;
  }[] = [];

  for (const project of projects) {
    const windowAt = projectReturnWindow(project, entries);
    if (!windowAt) continue; // archived, or no open work → marker drops.

    if (windowAt.getTime() > nowMs) {
      notifications.push(planProjectReturnNotification(project, windowAt));
      if (behavior !== "drop") {
        nextMarkers[project.id] = {
          fireAt: windowAt.getTime(),
          mode: "invitation",
        };
      }
      continue;
    }

    if (behavior === "drop") continue;

    const marker = markers[project.id];
    const pendingCatchUp =
      marker !== undefined &&
      marker.mode !== "invitation" &&
      marker.fireAt > nowMs;
    const cooldownUntil = marker ? marker.fireAt + DORMANCY_COOLDOWN_MS : 0;
    if (!pendingCatchUp && nowMs < cooldownUntil) {
      // Still inside the cooldown: keep the marker so the wait is remembered,
      // but do not re-arm anything.
      if (marker) nextMarkers[project.id] = marker;
      continue;
    }

    catchUps.push({
      project,
      anchorAt: pendingCatchUp ? marker.fireAt : null,
      dormantSince: windowAt.getTime(),
    });
  }

  if (catchUps.length === 0) {
    return { notifications, markers: nextMarkers };
  }

  if (behavior === "summary") {
    const fireAt = Math.min(
      ...catchUps.map((item) => item.anchorAt ?? nextQuietHour(nowMs)),
    );
    for (const item of catchUps) {
      nextMarkers[item.project.id] = { fireAt, mode: "summary" };
    }
    notifications.push(
      planProjectSummaryNotification(
        catchUps.map((item) => item.project),
        new Date(fireAt),
      ),
    );
  } else {
    // Oldest dormancy first, one slot each so the nudge never arrives as a burst.
    const ordered = [...catchUps].sort(
      (a, b) => a.dormantSince - b.dormantSince,
    );
    let slot = nextQuietHour(nowMs);
    for (const item of ordered) {
      const fireAt = item.anchorAt ?? slot;
      nextMarkers[item.project.id] = { fireAt, mode: "staggered" };
      notifications.push(
        planProjectReturnNotification(item.project, new Date(fireAt)),
      );
      if (item.anchorAt === null) slot += DORMANCY_STAGGER_MS;
    }
  }

  return { notifications, markers: nextMarkers };
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
 * recurring deadlines get their next several instances. `projectTitle` lets the
 * body name the owning project. Returns the first notification ID, or null if
 * nothing should be scheduled.
 */
export async function scheduleEntryNotification(
  entry: DbEntry,
  projectTitle?: string | null,
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

  const leadMinutes = await getDeadlineLeadMinutes();
  const armed = entry.type === "deadline" ? await getArmedDeadlines() : {};
  const planned = planEntryNotifications(entry, leadMinutes, projectTitle, armed);
  if (entry.type === "deadline") {
    await setArmedDeadlines(pruneArmedDeadlines(armed, Date.now()));
  }
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

  const triggerDate = projectReturnDate(project, entries);
  if (!triggerDate) return null;

  const id = await schedulePlanned(
    planProjectReturnNotification(project, triggerDate),
  );
  await pruneToBudget();

  // Keep the dormancy marker in step so the 7-day cooldown starts from this
  // invitation when the user has opted into catch-ups.
  try {
    const behavior = await getDormantReminderBehavior();
    if (behavior !== "drop") {
      const markers = await getDormancyMarkers();
      markers[project.id] = {
        fireAt: triggerDate.getTime(),
        mode: "invitation",
      };
      await setDormancyMarkers(markers);
    }
  } catch (error) {
    console.warn("[notifications] dormancy marker update failed:", error);
  }

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

  const [
    deadlinesEnabled,
    habitsEnabled,
    projectReturnsEnabled,
    leadMinutes,
    dormantBehavior,
  ] = await Promise.all([
    getNotificationPref("deadlines"),
    getNotificationPref("habits"),
    getNotificationPref("projectReturns"),
    getDeadlineLeadMinutes(),
    getDormantReminderBehavior(),
  ]);

  const projectTitles = new Map(
    input.projects.map((project) => [project.id, project.title]),
  );
  const planned: PlannedNotification[] = [];

  if (deadlinesEnabled) {
    const armed = await getArmedDeadlines();
    for (const entry of input.entries) {
      planned.push(
        ...planEntryNotifications(
          entry,
          leadMinutes,
          entry.project_id ? projectTitles.get(entry.project_id) : null,
          armed,
        ),
      );
    }
    await setArmedDeadlines(pruneArmedDeadlines(armed, Date.now()));
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
        const markers =
          dormantBehavior === "drop" ? {} : await getDormancyMarkers();
        const dormancy = planDormantCatchUps(
          input.projects,
          input.entries,
          dormantBehavior,
          markers,
          Date.now(),
        );
        planned.push(...dormancy.notifications);
        await setDormancyMarkers(dormancy.markers);
      }
    } catch (error) {
      console.warn("[notifications] dormant-project planning failed:", error);
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
