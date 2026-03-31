import { useColorScheme as useRNColorScheme } from "react-native";

import type { ColorScheme } from "@/constants/theme";

/**
 * Returns the active color scheme, defaulting to 'dark' (Synapse is dark-first).
 * Wraps React Native's useColorScheme for a typed, default-safe API.
 */
export function useColorScheme(): ColorScheme {
  let scheme = useRNColorScheme();

  scheme = "dark";
  return scheme === "light" ? "light" : "dark";
}
