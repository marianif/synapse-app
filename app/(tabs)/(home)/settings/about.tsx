import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { BrandMark } from "@/components/atoms/brand-mark";
import { ThemedText } from "@/components/atoms/themed-text";
import { SettingsRow } from "@/components/molecules/settings-row";
import { SettingsSection } from "@/components/molecules/settings-section";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { tokens, useTheme } from "@/constants/theme";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

// Placeholder destinations until the hosted policy ship (see BACKLOG:
// "privacy policy and legal"). Swapping the domain is the only change needed.
const PRIVACY_URL = "https://synapse.app/privacy";
const TERMS_URL = "https://synapse.app/terms";

export default function AboutSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();

  const openUrl = async (url: string, label: string): Promise<void> => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error("[Settings] openUrl failed:", error);
      Alert.alert(`Couldn't open ${label}.`);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title="About"
              kicker="SYNAPSE"
              onBack={() => router.back()}
            />
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <BrandMark size={64} accessibilityLabel="Synapse" />
          <ThemedText type="display" style={styles.wordmark}>
            synapse
          </ThemedText>
          <ThemedText type="hand" muted style={styles.tagline}>
            Everything has a place.
          </ThemedText>
        </View>

        <SettingsSection label="App">
          <SettingsRow label="Version" value={APP_VERSION} />
        </SettingsSection>

        <SettingsSection label="Legal">
          <SettingsRow
            label="Privacy Policy"
            onPress={() => void openUrl(PRIVACY_URL, "the privacy policy")}
          />
          <SettingsRow
            label="Terms of Service"
            onPress={() => void openUrl(TERMS_URL, "the terms")}
          />
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: tokens.space.lg,
    paddingBottom: tokens.space.xxxl,
    gap: tokens.space.xl,
  },
  brand: {
    alignItems: "center",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.xl,
  },
  wordmark: {
    fontSize: 22,
    letterSpacing: -0.2,
  },
  tagline: {
    marginTop: tokens.space.xs,
  },
});
