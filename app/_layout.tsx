import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { ErrorBoundary } from "@/components/error-boundary";
import { DatabaseProvider } from "@/contexts/database-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { requestNotificationPermissions } from "@/lib/notifications";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
          <StatusBar style="light" />
        </DatabaseProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
