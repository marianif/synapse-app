import { useThemeContext } from "@/contexts/theme-context";

import type { ColorScheme } from "@/constants/theme";

/**
 * Returns the active color scheme ("light" | "dark"), resolved from the user's
 * theme preference (System / Light / Dark) by ThemeProvider. This is the single
 * source of truth the design system reads — `tokens` / `useTheme()` in
 * constants/theme.ts depend on it, so changing the preference re-themes the app.
 */
export function useColorScheme(): ColorScheme {
  return useThemeContext().resolvedScheme;
}
