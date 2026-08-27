import { Redirect } from "expo-router";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/constants/theme";
import { useOnboarding } from "@/contexts/onboarding-context";

export default function RootEntry(): React.ReactElement | null {
  const { colors } = useTheme();
  const { complete } = useOnboarding();

  if (complete === null) {
    return <View style={[styles.loading, { backgroundColor: colors.paper }]} />;
  }

  return complete ? (
    <Redirect href="/(tabs)/(home)" />
  ) : (
    <Redirect href="/onboarding" />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
  },
});
