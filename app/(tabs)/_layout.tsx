import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { AppHeader } from "@/components/organisms/app-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Surface } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout(): React.ReactElement {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <AppHeader />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarActiveTintColor: theme.tint,
            tabBarInactiveTintColor: theme.tabIconDefault,
            tabBarStyle: {
              backgroundColor: Surface.containerLow,
              borderTopWidth: 0,
              elevation: 0,
            },
            tabBarShowLabel: false,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              tabBarIcon: ({ color }) => (
                <IconSymbol name="view-grid" size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="calendar"
            options={{
              tabBarIcon: ({ color }) => (
                <IconSymbol name="calendar" size={24} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="settings"
            options={{
              href: null,
              tabBarIcon: ({ color }) => (
                <IconSymbol name="cog-outline" size={24} color={color} />
              ),
            }}
          />
        </Tabs>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
});
