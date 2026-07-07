import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CaptureDock } from "@/components/organisms/capture-dock";
import { CustomTabBar } from "@/components/organisms/custom-tab-bar";
import { tokens, useTheme } from "@/constants/theme";
import { GlobalCaptureContext } from "@/contexts/global-capture-context";
import { useCapture } from "@/hooks/use-capture";
import { useDatabase } from "@/hooks/use-database/use-database";

// Fallback tab-bar height (custom-tab-bar.tsx's paddingTop 8 + addButton 52 +
// paddingBottom 20) used only for the first frame; the bar reports its real
// measured height through the capture context and surfaces rest on that.
const TAB_BAR_HEIGHT_FALLBACK = 8 + 52 + 20;

export default function TabLayout(): React.ReactElement {
  const { colors } = useTheme();
  const { projects } = useDatabase();

  // The neutral capture instance, owned here so the tab bar's pen key can
  // drive it directly from any tab — see contexts/global-capture-context.tsx.
  const cap = useCapture();

  return (
    <GlobalCaptureContext.Provider value={cap}>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.paper }]}
        edges={["top"]}
      >
        <View style={[styles.container, { backgroundColor: colors.paper }]}>
          <Tabs
            screenOptions={{
              headerShown: false,

              tabBarStyle: {
                display: "none",
              },
              tabBarButton: () => null,
            }}
          >
            <Tabs.Screen name="(home)" />
            <Tabs.Screen name="notes" />
          </Tabs>

          <CustomTabBar />

          {/* Rendered AFTER the tab bar so it paints on top — the dock rests in
              the band above the bar (restOffset), and its keyboard-lift and
              backdrop must sit over the chrome, not behind it. */}
          <CaptureDock
            cap={cap}
            projects={projects}
            restOffset={
              (cap.tabBarHeight || TAB_BAR_HEIGHT_FALLBACK) + tokens.space.lg
            }
          />
        </View>
      </SafeAreaView>
    </GlobalCaptureContext.Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
