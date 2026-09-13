import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { SettingsSection } from "@/components/molecules/settings-section";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useCaps } from "@/hooks/use-caps";
import { useUpgrade } from "@/hooks/use-upgrade";
import { exportData, type ExportProgress } from "@/lib/export";

function progressLabel(progress: ExportProgress): string {
  switch (progress.stage) {
    case "reading":
      return "Reading your data…";
    case "media":
      return progress.total > 0
        ? `Bundling photos ${progress.done} of ${progress.total}…`
        : "Bundling photos…";
    case "archiving":
      return "Compressing the archive…";
    case "sharing":
      return "Opening the share sheet…";
  }
}

export default function DataSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const caps = useCaps();
  const { showUpgrade } = useUpgrade();

  const handleExport = async (): Promise<void> => {
    if (busy) return;
    // Export is a Pro feature; the free plan opens the paywall instead.
    if (!caps.canExport) {
      showUpgrade("export");
      return;
    }
    setBusy(true);
    try {
      await exportData({ onProgress: setProgress });
    } catch (error) {
      console.error("[Data] export failed:", error);
      Alert.alert(
        "Couldn't export your data.",
        "Nothing was changed. Try again in a moment.",
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title="Your data"
              kicker="EXPORT"
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
        <ThemedText type="body" muted style={styles.intro}>
          Everything you capture lives on this device. Export puts it all in one
          file you own: entries, projects, diary notes, tasks, habits,
          preferences, and attached photos.
        </ThemedText>

        <SettingsSection label="Archive">
          <Pressable
            onPress={() => void handleExport()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Export everything"
            accessibilityHint="Builds a Synapse archive and opens the share sheet."
            accessibilityState={{ disabled: busy }}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: colors.surface,
                opacity: busy ? 0.6 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <IconSymbol name="Download" size={18} color={colors.ink} />
            <View style={styles.actionCopy}>
              <ThemedText type="item" style={{ color: colors.ink }}>
                {busy ? "Preparing…" : "Export everything"}
              </ThemedText>
              <ThemedText type="caption" muted numberOfLines={2}>
                {busy && progress
                  ? progressLabel(progress)
                  : "Creates a ZIP archive and opens the share sheet."}
              </ThemedText>
            </View>
            {busy ? <ActivityIndicator color={colors.inkMuted} /> : null}
          </Pressable>
        </SettingsSection>

        <ThemedText type="caption" muted style={styles.footnote}>
          Nothing leaves this device unless you choose a destination in the
          share sheet.
        </ThemedText>
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
  intro: {
    marginHorizontal: tokens.space.xs,
    lineHeight: 20,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
    minHeight: 56,
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  footnote: {
    marginHorizontal: tokens.space.xs,
    lineHeight: 16,
  },
});
