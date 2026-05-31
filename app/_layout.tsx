import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider, useThemeContext } from "@/contexts/theme-context";
import { DatabaseProvider } from "@/contexts/database-context";
import { requestNotificationPermissions } from "@/lib/notifications";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemedNavigationShell />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Inner component: consumes the theme context that RootLayout provides. A
// component cannot read a context it also renders the Provider for, hence the split.
function ThemedNavigationShell(): React.ReactElement {
  const { resolvedScheme, isReady } = useThemeContext();

  // Configure foreground notification display and request permissions once.
  // rescheduleAllEntries is handled inside DatabaseProvider after initial load.
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    requestNotificationPermissions().catch((err) => {
      console.warn("[RootLayout] requestNotificationPermissions failed:", err);
    });
  }, []);

  // Reveal the app only once the persisted theme preference has loaded, so an
  // override never flashes the wrong scheme on cold start.
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  const isDark = resolvedScheme === "dark";

  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <DatabaseProvider>
        <ErrorBoundary>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="list" options={{ headerShown: false }} />
            <Stack.Screen name="detail" options={{ headerShown: false }} />
            <Stack.Screen name="voice-input" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", headerShown: false }}
            />
          </Stack>
        </ErrorBoundary>
        <StatusBar style={isDark ? "light" : "dark"} />
      </DatabaseProvider>
    </NavThemeProvider>
  );
}
