import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
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
import { useThemeContext } from "@/contexts/theme-context";
import { useCaps } from "@/hooks/use-caps";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { useUpgrade } from "@/hooks/use-upgrade";
import type { SynapseExportCounts } from "@/lib/export-format";
import { exportData, type ExportProgress } from "@/lib/export";
import {
  ImportCancelledError,
  ImportValidationError,
  importData,
  type ImportProgress,
} from "@/lib/import";
import { syncScheduledNotifications } from "@/lib/notifications";

type BusyKind = "export" | "import";

function exportProgressLabel(progress: ExportProgress): string {
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

function importProgressLabel(progress: ImportProgress): string {
  switch (progress.stage) {
    case "picking":
      return "Waiting for you to pick an archive…";
    case "reading":
      return "Reading the archive…";
    case "extracting":
      return "Opening the archive…";
    case "media":
      return progress.total > 0
        ? `Restoring photos ${progress.done} of ${progress.total}…`
        : "Restoring photos…";
    case "restoring":
      return "Rebuilding your store…";
  }
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function summaryCopy(counts: SynapseExportCounts): string {
  const parts = [
    plural(counts.entries, "entry", "entries"),
    plural(counts.projects, "project", "projects"),
    plural(counts.diaryEntries, "note", "notes"),
    plural(counts.tasks, "task", "tasks"),
    plural(counts.habits, "habit", "habits"),
    counts.media > 0 ? plural(counts.media, "photo", "photos") : null,
  ].filter((part): part is string => part !== null);
  return `Restored ${parts.join(", ")}.`;
}

export default function DataSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { setPreference } = useThemeContext();
  const {
    fetchEntries,
    fetchProjects,
    refetchTasks,
    refetchRecurrenceCompletions,
    refetchHabits,
  } = useDatabase();
  const { refresh: refreshDiary } = useDiary();
  const [busy, setBusy] = useState<BusyKind | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(
    null,
  );
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(
    null,
  );
  const [summary, setSummary] = useState<string | null>(null);
  const caps = useCaps();
  const { showUpgrade } = useUpgrade();

  const refetchAll = async (): Promise<void> => {
    await fetchEntries();
    await fetchProjects();
    await refetchTasks();
    await refetchRecurrenceCompletions();
    await refetchHabits();
    await refreshDiary();
  };

  const handleExport = async (): Promise<void> => {
    if (busy) return;
    // Export is a Pro feature; the free plan opens the paywall instead.
    if (!caps.canExport) {
      showUpgrade("export");
      return;
    }
    setBusy("export");
    try {
      await exportData({ onProgress: setExportProgress });
    } catch (error) {
      console.error("[Data] export failed:", error);
      Alert.alert(
        "Couldn't export your data.",
        "Nothing was changed. Try again in a moment.",
      );
    } finally {
      setBusy(null);
      setExportProgress(null);
    }
  };

  const runImport = async (): Promise<void> => {
    setBusy("import");
    setSummary(null);
    try {
      const result = await importData({ onProgress: setImportProgress });
      setSummary(summaryCopy(result.counts));
      setPreference(result.preferences.theme);
      // Refresh is best-effort and must not masquerade as an import failure:
      // the store has already been replaced by the time we get here.
      try {
        await refetchAll();
        // Reschedule from the imported rows directly: the store selectors have
        // not re-rendered yet, and the old schedule references deleted ids.
        await syncScheduledNotifications({
          entries: result.entries,
          projects: result.projects,
          habits: result.habits,
        });
      } catch (refreshError) {
        console.error("[Data] post-import refresh failed:", refreshError);
      }
    } catch (error) {
      if (error instanceof ImportCancelledError) return;
      console.error("[Data] import failed:", error);
      if (!(error instanceof ImportValidationError)) {
        await refetchAll().catch((refetchError) => {
          console.error("[Data] refetch after failed import:", refetchError);
        });
      }
      Alert.alert(
        "Couldn't import the archive.",
        error instanceof ImportValidationError
          ? error.message
          : "Nothing was changed. Try again in a moment.",
      );
    } finally {
      setBusy(null);
      setImportProgress(null);
    }
  };

  const handleImport = (): void => {
    if (busy) return;
    // Import rides the same Pro data-portability gate as export.
    if (!caps.hasFullAccess) {
      showUpgrade("import");
      return;
    }
    Alert.alert(
      "Replace everything?",
      "Importing restores the archive over this device: everything here is deleted first. Export a backup if you might want it back.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Back up first", onPress: () => void handleExport() },
        {
          text: "Replace",
          style: "destructive",
          onPress: () => void runImport(),
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title="Your data"
              kicker="BACKUP"
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
          Everything you capture lives on this device. Export it all as one file
          you own, or restore an archive over this device.
        </ThemedText>

        <SettingsSection label="Archive">
          <Pressable
            onPress={() => void handleExport()}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Export everything"
            accessibilityHint="Builds a Synapse archive and opens the share sheet."
            accessibilityState={{ disabled: busy !== null }}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: colors.surface,
                opacity: busy !== null ? 0.6 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <IconSymbol name="Download" size={18} color={colors.ink} />
            <View style={styles.actionCopy}>
              <ThemedText type="item" style={{ color: colors.ink }}>
                {busy === "export" ? "Preparing…" : "Export everything"}
              </ThemedText>
              <ThemedText type="caption" muted numberOfLines={2}>
                {busy === "export" && exportProgress
                  ? exportProgressLabel(exportProgress)
                  : "Creates a ZIP archive and opens the share sheet."}
              </ThemedText>
            </View>
            {busy === "export" ? (
              <ActivityIndicator color={colors.inkMuted} />
            ) : null}
          </Pressable>

          {Platform.OS !== "web" ? (
            <Pressable
              onPress={handleImport}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel="Import from archive"
              accessibilityHint="Replaces everything on this device with a Synapse archive."
              accessibilityState={{ disabled: busy !== null }}
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: colors.surface,
                  opacity: busy !== null ? 0.6 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <IconSymbol name="Import" size={18} color={colors.ink} />
              <View style={styles.actionCopy}>
                <ThemedText type="item" style={{ color: colors.ink }}>
                  {busy === "import" ? "Restoring…" : "Import from archive"}
                </ThemedText>
                <ThemedText type="caption" muted numberOfLines={2}>
                  {busy === "import" && importProgress
                    ? importProgressLabel(importProgress)
                    : "Replaces this device with the archive's contents."}
                </ThemedText>
              </View>
              {busy === "import" ? (
                <ActivityIndicator color={colors.inkMuted} />
              ) : null}
            </Pressable>
          ) : null}
        </SettingsSection>

        {summary ? (
          <ThemedText type="caption" muted style={styles.footnote}>
            {summary}
          </ThemedText>
        ) : null}

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
