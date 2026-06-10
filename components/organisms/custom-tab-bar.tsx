import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import type { IconSymbolName } from "@/components/ui/icon-symbol";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

function TabIcon({ name, color }: { name: IconSymbolName; color: string }) {
  return <IconSymbol name={name} size={24} color={color} />;
}

export function CustomTabBar(): React.ReactElement {
  const { colors } = useTheme();
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "/(tabs)";
  const isDiary = pathname === "/(tabs)/diary" || pathname === "/diary";

  const active = (on: boolean): string =>
    on ? colors.accent.clay : colors.inkMuted;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSubtle }]}>
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => router.push("/")}
          accessibilityRole="button"
          accessibilityLabel="Field"
          style={({ pressed }) => [
            styles.tabButton,
            pressed && styles.tabButtonPressed,
          ]}
        >
          <TabIcon name="view-grid" color={active(isHome)} />
        </Pressable>

        {/* The pen key — THE capture trigger, one thumb gesture from anywhere.
            Tap opens the text composer on the field; long-press starts voice
            capture immediately. Both ride the existing ?capture= deep-link the
            widget already uses, so it works from any tab. Richer entries reach
            /modal through the resolver's MORE… chip. The one neutral-accent
            control in the chrome, so "capture" reads at a glance without
            clashing with any saturated type code. */}
        <Pressable
          onPress={() =>
            router.push({ pathname: "/", params: { capture: "text" } })
          }
          onLongPress={() =>
            router.push({ pathname: "/", params: { capture: "voice" } })
          }
          delayLongPress={350}
          accessibilityRole="button"
          accessibilityLabel="Capture a thought"
          accessibilityHint="Tap to type. Long-press to capture by voice."
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: colors.accent.clay },
            tokens.elevation.capture,
            pressed && styles.addButtonPressed,
          ]}
        >
          <IconSymbol name="pencil" size={26} color={colors.accent.onClay} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/diary")}
          accessibilityRole="button"
          accessibilityLabel="Diary"
          style={({ pressed }) => [
            styles.tabButton,
            pressed && styles.tabButtonPressed,
          ]}
        >
          <TabIcon name="notebook-outline" color={active(isDiary)} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: 0,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: tokens.space.lg,
  },
  tabButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.sm,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  addButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
});
