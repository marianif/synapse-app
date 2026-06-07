import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/organisms/app-header";
import { CustomTabBar } from "@/components/organisms/custom-tab-bar";
import { useTheme } from "@/constants/theme";

export default function TabLayout(): React.ReactElement {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.paper }]}
      edges={["top"]}
    >
      <View style={[styles.container, { backgroundColor: colors.paper }]}>
        <AppHeader />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              display: "none",
            },
            tabBarButton: () => null,
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="diary" />
        </Tabs>
        <CustomTabBar />
      </View>
    </SafeAreaView>
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
