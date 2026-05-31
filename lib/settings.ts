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
