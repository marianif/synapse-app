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
  const isCalendar = pathname === "/(tabs)/calendar";

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSubtle }]}>
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => router.push("/")}
          accessibilityRole="button"
          accessibilityLabel="Home"
          style={({ pressed }) => [
            styles.tabButton,
            pressed && styles.tabButtonPressed,
          ]}
        >
          <TabIcon
            name="view-grid"
            color={isHome ? colors.accent.clay : colors.inkMuted}
          />
        </Pressable>

        {/* The create-key — richer entries (bills, deadlines, events, dates)
            live here; the home capture bar stays the quick idea line. The one
            neutral-accent control in the chrome, so "make something" reads at a
            glance without clashing with any saturated type code. */}
        <Pressable
          onPress={() => router.push("/modal")}
          accessibilityRole="button"
          accessibilityLabel="Add an entry"
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: colors.accent.clay },
            tokens.elevation.capture,
            pressed && styles.addButtonPressed,
          ]}
        >
          <IconSymbol name="plus" size={28} color={colors.accent.onClay} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/calendar")}
          accessibilityRole="button"
          accessibilityLabel="Calendar"
          style={({ pressed }) => [
            styles.tabButton,
            pressed && styles.tabButtonPressed,
          ]}
        >
          <TabIcon
            name="calendar"
            color={isCalendar ? colors.accent.clay : colors.inkMuted}
          />
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
    paddingHorizontal: 48,
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
