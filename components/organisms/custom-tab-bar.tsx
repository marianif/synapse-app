import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Brand, Colors, Radius, Shadow, Surface } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface TabBarIconProps {
  focused: boolean;
  color: string;
}

function TabIcon({ name, focused, color }: TabBarIconProps & { name: string }) {
  return <IconSymbol name={name as "view-grid" | "calendar"} size={24} color={color} />;
}

export function CustomTabBar(): React.ReactElement {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "/(tabs)";
  const isCalendar = pathname === "/(tabs)/calendar";

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => router.push("/")}
          style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
        >
          <TabIcon
            name="view-grid"
            focused={isHome}
            color={isHome ? theme.tint : theme.tabIconDefault}
          />
        </Pressable>

        <Pressable
          onPress={() => router.push("/modal")}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <View style={styles.addButtonGlow} />
          <View style={styles.addButtonInner}>
            <MaterialCommunityIcons name="plus" size={24} color="#1A1A2E" />
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/calendar")}
          style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
        >
          <TabIcon
            name="calendar"
            focused={isCalendar}
            color={isCalendar ? theme.tint : theme.tabIconDefault}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Surface.containerLow,
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
    borderRadius: Radius.md,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  addButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
  },
  addButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  addButtonGlow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Brand.fabGlow,
    opacity: 0.6,
    ...Shadow.fab,
  },
  addButtonInner: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Brand.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.fab,
  },
  addIcon: {
    width: 20,
    height: 3,
    backgroundColor: "#1A1A2E",
    borderRadius: 2,
  },
});
