import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CustomTabBar } from "@/components/organisms/custom-tab-bar";
import { AppHeader } from "@/components/organisms/app-header";
import { Surface } from "@/constants/theme";

export default function TabLayout(): React.ReactElement {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
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
          <Tabs.Screen name="calendar" />
        </Tabs>
        <CustomTabBar />
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
