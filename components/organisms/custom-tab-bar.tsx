import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

interface TabBarIconProps {
  focused: boolean;
  color: string;
}

function TabIcon({ name, focused, color }: TabBarIconProps & { name: string }) {
  return (
    <IconSymbol
      name={name as "view-grid" | "calendar"}
      size={24}
      color={color}
    />
  );
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
          style={({ pressed }) => [
            styles.tabButton,
            pressed && styles.tabButtonPressed,
          ]}
        >
          <TabIcon
            name="view-grid"
            focused={isHome}
            color={isHome ? colors.accent.clay : colors.inkMuted}
          />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/calendar")}
          style={({ pressed }) => [
            styles.tabButton,
            pressed && styles.tabButtonPressed,
          ]}
        >
          <TabIcon
            name="calendar"
            focused={isCalendar}
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
    paddingHorizontal: 60,
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
});
