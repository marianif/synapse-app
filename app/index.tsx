import { Redirect, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/constants/theme";
import { useOnboarding } from "@/contexts/onboarding-context";

export default function RootEntry(): React.ReactElement | null {
  const { colors } = useTheme();
  const { complete } = useOnboarding();
  // The widget deep link (synapseapp:///?capture=voice) lands on this gate
  // route; forward the param so the home screen can arm voice capture after
  // the redirect — expo-router's Redirect doesn't carry search params.
  const { capture } = useLocalSearchParams<{ capture?: string }>();

  if (complete === null) {
    return <View style={[styles.loading, { backgroundColor: colors.paper }]} />;
  }

  return complete ? (
    <Redirect
      href={{
        pathname: "/(tabs)/(home)",
        params: capture ? { capture } : {},
      }}
    />
  ) : (
    <Redirect href="/onboarding" />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
  },
});
