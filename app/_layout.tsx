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
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_700Bold,
} from "@expo-google-fonts/ibm-plex-mono";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Redirect, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider } from "react-redux";
import "react-native-reanimated";

import { ErrorBoundary } from "@/components/error-boundary";
import {
  OnboardingProvider,
  useOnboarding,
} from "@/contexts/onboarding-context";
import { ThemeProvider, useThemeContext } from "@/contexts/theme-context";
import { store } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { initApp } from "@/store/thunks/bootstrap";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ThemeProvider>
          <OnboardingProvider>
            <ThemedNavigationShell />
          </OnboardingProvider>
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

// Inner component: consumes the theme context that RootLayout provides. A
// component cannot read a context it also renders the Provider for, hence the split.
function ThemedNavigationShell(): React.ReactElement | null {
  const { resolvedScheme, isReady } = useThemeContext();
  const { complete: onboardingComplete, isReady: onboardingReady } =
    useOnboarding();
  const segments = useSegments();
  const dispatch = useAppDispatch();

  // Boot the data layer once: seeds, full fetch, notification self-heal, Watch.
  useEffect(() => {
    dispatch(initApp()).catch((error) => {
      console.error("[store] initApp failed:", error);
    });
  }, [dispatch]);

  // Field Lab's hierarchy is sans + mono (Host Grotesk display/body, JetBrains Mono
  // for the signal layer: counts/status/kickers). Load both before the splash clears
  // so the greeting never flashes a fallback.
  const [fontsLoaded] = useFonts({
    HostGrotesk_400Regular,
    HostGrotesk_500Medium,
    HostGrotesk_600SemiBold,
    HostGrotesk_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_700Bold,
    Caveat_500Medium,
    Caveat_600SemiBold,
    Caveat_700Bold,
  });

  // Configure foreground notification display once. Permission is requested when
  // a user creates a deadline, after the notification has a clear purpose.
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
  }, []);

  // Reveal the app only once the persisted theme preference has loaded, so an
  // override never flashes the wrong scheme on cold start.
  useEffect(() => {
    if (isReady && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady, fontsLoaded]);

  if (
    !fontsLoaded ||
    !isReady ||
    !onboardingReady ||
    onboardingComplete === null
  ) {
    return null;
  }

  const isOnboarding = segments[0] === "onboarding";
  if (!onboardingComplete && !isOnboarding) {
    return <Redirect href="/onboarding" />;
  }
  if (onboardingComplete && isOnboarding) {
    return <Redirect href="/(tabs)/(home)" />;
  }

  const isDark = resolvedScheme === "dark";

  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <ErrorBoundary>
        {/* Header default is off; the list & calendar screens opt back in by
            supplying their own `header` via <Stack.Screen> in-screen, so the
            chrome is owned by the navigator (not laid out in the screen body)
            while still reading screen-local, param-driven title/kicker. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="note" options={{ presentation: "modal" }} />
          <Stack.Screen name="edit" options={{ presentation: "modal" }} />
        </Stack>
      </ErrorBoundary>
      <StatusBar style={isDark ? "light" : "dark"} />
    </NavThemeProvider>
  );
}
