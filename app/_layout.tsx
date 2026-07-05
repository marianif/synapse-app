import {
  Caveat_500Medium,
  Caveat_600SemiBold,
  Caveat_700Bold,
} from "@expo-google-fonts/caveat";
import {
  HostGrotesk_400Regular,
  HostGrotesk_500Medium,
  HostGrotesk_600SemiBold,
  HostGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/host-grotesk";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
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
import { DatabaseProvider } from "@/contexts/database-context";
import { ThemeProvider, useThemeContext } from "@/contexts/theme-context";
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
function ThemedNavigationShell(): React.ReactElement | null {
  const { resolvedScheme, isReady } = useThemeContext();

  // Field Lab's hierarchy is sans + mono (Host Grotesk display/body, JetBrains Mono
  // for the signal layer: counts/status/kickers). Load both before the splash clears
  // so the greeting never flashes a fallback.
  const [fontsLoaded] = useFonts({
    HostGrotesk_400Regular,
    HostGrotesk_500Medium,
    HostGrotesk_600SemiBold,
    HostGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    Caveat_500Medium,
    Caveat_600SemiBold,
    Caveat_700Bold,
  });

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
    if (isReady && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady, fontsLoaded]);

  if (!fontsLoaded) return null;

  const isDark = resolvedScheme === "dark";

  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <DatabaseProvider>
        <ErrorBoundary>
          {/* Header default is off; the list & calendar screens opt back in by
              supplying their own `header` via <Stack.Screen> in-screen, so the
              chrome is owned by the navigator (not laid out in the screen body)
              while still reading screen-local, param-driven title/kicker. */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          </Stack>
        </ErrorBoundary>
        <StatusBar style={isDark ? "light" : "dark"} />
      </DatabaseProvider>
    </NavThemeProvider>
  );
}
