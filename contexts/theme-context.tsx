import * as SplashScreen from "expo-splash-screen";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import type { Scheme } from "@/constants/theme";
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@/lib/settings";

// Hold the native splash until the persisted preference loads, so a user with
// an active override (e.g. system=dark but they chose light) never sees a flash.
// Failures are non-fatal — the gate is released in ThemedNavigationShell.
SplashScreen.preventAutoHideAsync().catch(() => {});

type ThemeContextValue = {
  /** The user's choice: follow system, or force a scheme. Persisted. */
  preference: ThemePreference;
  /** The scheme to actually render — "system" resolved against the device. */
  resolvedScheme: Scheme;
  /** Update + persist the preference. */
  setPreference: (preference: ThemePreference) => void;
  /** True once the persisted preference has been read. */
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // RN's own hook (NOT @/hooks/use-color-scheme — that one reads THIS context).
  const systemScheme = useRNColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getThemePreference().then((saved) => {
      if (!cancelled) {
        setPreferenceState(saved);
        setIsReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = (next: ThemePreference): void => {
    setPreferenceState(next); // optimistic
    setThemePreference(next).catch((err) =>
      console.error("[ThemeProvider] persist failed:", err),
    );
  };

  const resolvedScheme: Scheme =
    preference === "system"
      ? systemScheme === "light"
        ? "light"
        : "dark"
      : preference;

  const value = useMemo(
    () => ({ preference, resolvedScheme, setPreference, isReady }),
    [preference, resolvedScheme, isReady],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return context;
}
