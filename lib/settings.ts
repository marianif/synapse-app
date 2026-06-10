import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * App preferences persisted outside the SQLite entry store. These are small
 * scalars (a single key each), so AsyncStorage is the right home — not the DB.
 */

export type ThemePreference = "system" | "light" | "dark";

const THEME_PREFERENCE_KEY = "theme_preference";

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
} as const;

export type ConfirmKeyValue = (typeof ConfirmKey)[keyof typeof ConfirmKey];
