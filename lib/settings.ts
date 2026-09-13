import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * App preferences persisted outside the SQLite entry store. These are small
 * scalars (a single key each), so AsyncStorage is the right home — not the DB.
 */

export type ThemePreference = "system" | "light" | "dark";

const THEME_PREFERENCE_KEY = "theme_preference";

const ONBOARDING_COMPLETE_KEY = "onboarding-v1-complete";

/** Returns whether the first-run story has been completed or skipped. */
export async function getOnboardingComplete(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)) === "true";
  } catch (error) {
    console.error("[settings] getOnboardingComplete failed:", error);
    return false;
  }
}

/** Persists completion of the first-run story. */
export async function setOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
  } catch (error) {
    console.error("[settings] setOnboardingComplete failed:", error);
  }
}

/** Clears completion so the first-run story can be replayed (dev). */
export async function clearOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  } catch (error) {
    console.error("[settings] clearOnboardingComplete failed:", error);
  }
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/** Returns the saved theme preference, defaulting to "system". */
export async function getThemePreference(): Promise<ThemePreference> {
  try {
    const value = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
    return isThemePreference(value) ? value : "system";
  } catch (error) {
    console.error("[settings] getThemePreference failed:", error);
    return "system";
  }
}

/** Persists the theme preference. */
export async function setThemePreference(
  preference: ThemePreference,
): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
  } catch (error) {
    console.error("[settings] setThemePreference failed:", error);
  }
}

// ─── Destructive-confirm preferences ────────────────────────────────────────
//
// Each destructive action that offers a "don't ask again" affordance gets its
// own boolean key here. The stored value means "skip the confirm" — absence
// (the default) means "always ask", so a fresh install is never surprised by a
// silent delete. Add a new key + getter/setter pair per action; never gate the
// confirm inline in a component.

const CONFIRM_SKIP_PREFIX = "confirm_skip:";

/**
 * Returns whether the confirm prompt for `key` should be skipped (the user
 * checked "don't ask again"). Defaults to `false` — always ask — on any error
 * or missing value, so we never delete silently by accident.
 */
export async function getConfirmSkip(key: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(CONFIRM_SKIP_PREFIX + key);
    return value === "true";
  } catch (error) {
    console.error("[settings] getConfirmSkip failed:", error);
    return false;
  }
}

/** Persists whether the confirm prompt for `key` should be skipped. */
export async function setConfirmSkip(
  key: string,
  skip: boolean,
): Promise<void> {
  try {
    await AsyncStorage.setItem(CONFIRM_SKIP_PREFIX + key, String(skip));
  } catch (error) {
    console.error("[settings] setConfirmSkip failed:", error);
  }
}

/** Stable keys for the confirm-skip preferences. One per destructive action. */
export const ConfirmKey = {
  deleteEntry: "delete_entry",
  deleteNote: "delete_note",
  deleteProject: "delete_project",
  deleteTask: "delete_task",
  deleteHabit: "delete_habit",
} as const;

export type ConfirmKeyValue = (typeof ConfirmKey)[keyof typeof ConfirmKey];

// ─── Off-clock deck memory ──────────────────────────────────────────────────
//
// The last off-clock card the user reached into. The home deck restores it as
// the default-focused sheet on mount, so the field reopens where attention
// last landed — the post-it you were turning over is still face-up.

const LAST_DECK_ID_KEY = "off_clock_last_id";

/** Returns the id of the last-touched off-clock entry, or null. */
export async function getLastDeckId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_DECK_ID_KEY);
  } catch (error) {
    console.error("[settings] getLastDeckId failed:", error);
    return null;
  }
}

/** Persists the last-touched off-clock entry id. */
export async function setLastDeckId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_DECK_ID_KEY, id);
  } catch (error) {
    console.error("[settings] setLastDeckId failed:", error);
  }
}

// ─── Generic UI preferences ─────────────────────────────────────────────────
//
// A small kv slot for arbitrary UI-state-as-preference: which card mode the
// user picked for a given project, which layout a section was last left in,
// etc. Anything that's a string scalar tied to a surface choice. Validators
// at the hook boundary keep values type-safe even though storage is loose.
//
// Keep keys hierarchical and dotted so namespaces stay legible:
//   "projects.card.<id>"   → "numeric" | "preview"
//
// Always use this through `useUiPreference` in components — never read
// AsyncStorage directly.

const UI_PREF_PREFIX = "ui_pref:";

export async function getUiPreference(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(UI_PREF_PREFIX + key);
  } catch (error) {
    console.error("[settings] getUiPreference failed:", error);
    return null;
  }
}

export async function setUiPreference(
  key: string,
  value: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(UI_PREF_PREFIX + key, value);
  } catch (error) {
    console.error("[settings] setUiPreference failed:", error);
  }
}

// ─── Notification preferences ───────────────────────────────────────────────
//
// Two kinds of local notification exist (see lib/notifications.ts): deadline
// reminders and dormant-project return invitations. Each has its own switch in
// Settings. Both default to ON — a missing value means "send", so an existing
// install keeps its current behavior, and the scheduler treats read errors as
// enabled rather than silently dropping reminders.

export type NotificationPref = "deadlines" | "projectReturns" | "habits";

const NOTIFICATION_PREF_PREFIX = "notification_pref:";

/** Returns whether the given notification kind is enabled. Defaults to true. */
export async function getNotificationPref(
  pref: NotificationPref,
): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATION_PREF_PREFIX + pref);
    return value !== "false";
  } catch (error) {
    console.error("[settings] getNotificationPref failed:", error);
    return true;
  }
}

/** Persists whether the given notification kind is enabled. */
export async function setNotificationPref(
  pref: NotificationPref,
  enabled: boolean,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      NOTIFICATION_PREF_PREFIX + pref,
      String(enabled),
    );
  } catch (error) {
    console.error("[settings] setNotificationPref failed:", error);
  }
}

// ─── Deadline lead time ──────────────────────────────────────────────────────
//
// How far ahead of a deadline its reminder fires. Stored in minutes so the
// planner can subtract it directly; 0 means "at the deadline".

export type DeadlineLeadMinutes = 0 | 10 | 30 | 60 | 1440;

/** The offered lead times, in minutes. Order is the display order. */
export const DEADLINE_LEAD_MINUTES: readonly DeadlineLeadMinutes[] = [
  0, 10, 30, 60, 1440,
];

const DEADLINE_LEAD_KEY = "notification_deadline_lead_minutes";

function isDeadlineLead(value: number): value is DeadlineLeadMinutes {
  return (DEADLINE_LEAD_MINUTES as readonly number[]).includes(value);
}

/** Returns the saved deadline lead time in minutes, defaulting to 0. */
export async function getDeadlineLeadMinutes(): Promise<DeadlineLeadMinutes> {
  try {
    const value = await AsyncStorage.getItem(DEADLINE_LEAD_KEY);
    if (value === null) return 0;
    const parsed = Number.parseInt(value, 10);
    return isDeadlineLead(parsed) ? parsed : 0;
  } catch (error) {
    console.error("[settings] getDeadlineLeadMinutes failed:", error);
    return 0;
  }
}

/** Persists the deadline lead time in minutes. */
export async function setDeadlineLeadMinutes(
  value: DeadlineLeadMinutes,
): Promise<void> {
  try {
    await AsyncStorage.setItem(DEADLINE_LEAD_KEY, String(value));
  } catch (error) {
    console.error("[settings] setDeadlineLeadMinutes failed:", error);
  }
}

// ─── Dormant-project reminder behavior ──────────────────────────────────────
//
// What happens to a project whose 7-day window has already elapsed and that
// still has open work: "drop" (default, current behavior), one catch-up
// "summary" for all of them, or individual "staggered" nudges.

export type DormantReminderBehavior = "drop" | "summary" | "staggered";

export const DORMANT_REMINDER_BEHAVIORS: readonly DormantReminderBehavior[] = [
  "drop",
  "summary",
  "staggered",
];

const DORMANT_BEHAVIOR_KEY = "notification_dormant_behavior";

function isDormantBehavior(value: string | null): value is DormantReminderBehavior {
  return value === "summary" || value === "staggered" || value === "drop";
}

/** Returns the saved dormant-project behavior, defaulting to "drop". */
export async function getDormantReminderBehavior(): Promise<DormantReminderBehavior> {
  try {
    const value = await AsyncStorage.getItem(DORMANT_BEHAVIOR_KEY);
    return isDormantBehavior(value) ? value : "drop";
  } catch (error) {
    console.error("[settings] getDormantReminderBehavior failed:", error);
    return "drop";
  }
}

/** Persists the dormant-project behavior. */
export async function setDormantReminderBehavior(
  value: DormantReminderBehavior,
): Promise<void> {
  try {
    await AsyncStorage.setItem(DORMANT_BEHAVIOR_KEY, value);
  } catch (error) {
    console.error("[settings] setDormantReminderBehavior failed:", error);
  }
}

// ─── Dormancy surfacing markers ──────────────────────────────────────────────
//
// One marker per project records when its next dormant-project notification is
// armed, plus which mode armed it. The scheduler rebuilds every pending
// notification on launch/foreground, so a marker whose `fireAt` is still ahead
// is re-planned at the exact same instant — never dropped, never re-nudged
// early. Once `fireAt` passes, the cooldown (`fireAt + 7 days`) gates the next
// catch-up. A project touch overwrites the marker with the new invitation.

export interface DormancyMarker {
  /** Epoch ms the next surface notification is armed for. */
  fireAt: number;
  mode: "invitation" | "summary" | "staggered";
}

const DORMANCY_MARKERS_KEY = "notification_dormancy_markers";

function isDormancyMarker(value: unknown): value is DormancyMarker {
  if (typeof value !== "object" || value === null) return false;
  const marker = value as { fireAt?: unknown; mode?: unknown };
  return (
    typeof marker.fireAt === "number" &&
    (marker.mode === "invitation" ||
      marker.mode === "summary" ||
      marker.mode === "staggered")
  );
}

/** Returns the per-project dormancy markers, defaulting to an empty map. */
export async function getDormancyMarkers(): Promise<
  Record<string, DormancyMarker>
> {
  try {
    const raw = await AsyncStorage.getItem(DORMANCY_MARKERS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const markers: Record<string, DormancyMarker> = {};
    for (const [projectId, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (isDormancyMarker(value)) markers[projectId] = value;
    }
    return markers;
  } catch (error) {
    console.error("[settings] getDormancyMarkers failed:", error);
    return {};
  }
}

/** Persists the per-project dormancy markers. */
export async function setDormancyMarkers(
  markers: Record<string, DormancyMarker>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(DORMANCY_MARKERS_KEY, JSON.stringify(markers));
  } catch (error) {
    console.error("[settings] setDormancyMarkers failed:", error);
  }
}

// ─── Armed deadline ledger ───────────────────────────────────────────────────
//
// notificationId → the deadline instant (ms) its reminder was armed for. The
// scheduler rebuilds the whole schedule on launch/foreground, so without this
// a reminder whose lead window already passed would be re-armed and re-delivered
// on every pass. A matching entry means "this deadline's reminder was already
// armed", so the late path stays a once-only catch-up. Entries whose deadline
// has passed are pruned by the caller.

export type ArmedDeadlines = Record<string, number>;

const ARMED_DEADLINES_KEY = "notification_armed_deadlines";

/** Returns the armed-deadline ledger, defaulting to an empty map. */
export async function getArmedDeadlines(): Promise<ArmedDeadlines> {
  try {
    const raw = await AsyncStorage.getItem(ARMED_DEADLINES_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const armed: ArmedDeadlines = {};
    for (const [id, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof value === "number") armed[id] = value;
    }
    return armed;
  } catch (error) {
    console.error("[settings] getArmedDeadlines failed:", error);
    return {};
  }
}

/** Persists the armed-deadline ledger. */
export async function setArmedDeadlines(
  armed: ArmedDeadlines,
): Promise<void> {
  try {
    await AsyncStorage.setItem(ARMED_DEADLINES_KEY, JSON.stringify(armed));
  } catch (error) {
    console.error("[settings] setArmedDeadlines failed:", error);
  }
}

// ─── Entitlement: trial clock ────────────────────────────────────────────────
//
// The 7-day trial is app-level: StoreKit and Play have no trial for a
// non-consumable, so the start instant is ours to keep. Stored as epoch ms.
// Absent means the trial has never started; the entitlement provider stamps it
// on first launch. Mirrored to RevenueCat later so a reinstall can't reset it.

const TRIAL_STARTED_AT_KEY = "entitlement_trial_started_at";

/** Returns the trial start instant in epoch ms, or null if never started. */
export async function getTrialStartedAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(TRIAL_STARTED_AT_KEY);
    if (raw === null) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : null;
  } catch (error) {
    console.error("[settings] getTrialStartedAt failed:", error);
    return null;
  }
}

/** Persists the trial start instant in epoch ms. */
export async function setTrialStartedAt(at: number): Promise<void> {
  try {
    await AsyncStorage.setItem(TRIAL_STARTED_AT_KEY, String(at));
  } catch (error) {
    console.error("[settings] setTrialStartedAt failed:", error);
  }
}

/** Clears the trial clock so it restarts on the next launch (dev). */
export async function clearTrialStartedAt(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TRIAL_STARTED_AT_KEY);
  } catch (error) {
    console.error("[settings] clearTrialStartedAt failed:", error);
  }
}

// ─── Entitlement: dev plan override ──────────────────────────────────────────
//
// "auto" follows the real derivation. The rest force a state so cap behavior
// and the paywall can be exercised without RevenueCat. Dev only — the provider
// ignores this outside __DEV__.

export type PlanOverride = "auto" | "trial" | "free" | "monthly" | "lifetime";

export const PLAN_OVERRIDES: readonly PlanOverride[] = [
  "auto",
  "trial",
  "free",
  "monthly",
  "lifetime",
];

const PLAN_OVERRIDE_KEY = "entitlement_plan_override";

function isPlanOverride(value: string | null): value is PlanOverride {
  return (
    value === "auto" ||
    value === "trial" ||
    value === "free" ||
    value === "monthly" ||
    value === "lifetime"
  );
}

/** Returns the saved plan override, defaulting to "auto". */
export async function getPlanOverride(): Promise<PlanOverride> {
  try {
    const value = await AsyncStorage.getItem(PLAN_OVERRIDE_KEY);
    return isPlanOverride(value) ? value : "auto";
  } catch (error) {
    console.error("[settings] getPlanOverride failed:", error);
    return "auto";
  }
}

/** Persists the dev plan override. */
export async function setPlanOverride(value: PlanOverride): Promise<void> {
  try {
    await AsyncStorage.setItem(PLAN_OVERRIDE_KEY, value);
  } catch (error) {
    console.error("[settings] setPlanOverride failed:", error);
  }
}
