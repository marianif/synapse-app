import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { SettingsSwitchRow } from "@/components/molecules/settings-row";
import { SettingsSection } from "@/components/molecules/settings-section";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { tokens, useTheme } from "@/constants/theme";
import {
  ConfirmKey,
  getConfirmSkip,
  setConfirmSkip,
  type ConfirmKeyValue,
} from "@/lib/settings";

const CONFIRM_ROWS: { key: ConfirmKeyValue; label: string }[] = [
  { key: ConfirmKey.deleteEntry, label: "Entries" },
  { key: ConfirmKey.deleteNote, label: "Diary notes" },
  { key: ConfirmKey.deleteProject, label: "Projects" },
  { key: ConfirmKey.deleteTask, label: "Subtasks" },
];

/** The stored value means "skip the prompt", so the UI value is its inverse. */
function toAskState(skip: boolean): boolean {
  return !skip;
}

export default function ConfirmationsSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();

  const [ask, setAsk] = useState<Record<ConfirmKeyValue, boolean>>({
    [ConfirmKey.deleteEntry]: true,
    [ConfirmKey.deleteNote]: true,
    [ConfirmKey.deleteProject]: true,
    [ConfirmKey.deleteTask]: true,
  });
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all(CONFIRM_ROWS.map((row) => getConfirmSkip(row.key)))
        .then((skips) => {
          if (!alive) return;
          const next = {} as Record<ConfirmKeyValue, boolean>;
          CONFIRM_ROWS.forEach((row, index) => {
            next[row.key] = toAskState(skips[index]);
          });
          setAsk(next);
          setReady(true);
        })
        .catch((error) => {
          console.error("[Settings] confirm prefs failed:", error);
          if (alive) setReady(true);
        });
      return () => {
        alive = false;
      };
    }, []),
  );

  const handleToggle = async (
    key: ConfirmKeyValue,
    nextAsk: boolean,
  ): Promise<void> => {
    setAsk((current) => ({ ...current, [key]: nextAsk }));
    await setConfirmSkip(key, !nextAsk);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title="Confirmations"
              kicker="DELETIONS"
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
        {!ready ? (
          <ThemedText type="body" muted>
            Checking…
          </ThemedText>
        ) : (
          <>
            <SettingsSection label="Ask before deleting">
              {CONFIRM_ROWS.map((row) => (
                <SettingsSwitchRow
                  key={row.key}
                  label={row.label}
                  value={ask[row.key]}
                  onValueChange={(next) => void handleToggle(row.key, next)}
                />
              ))}
            </SettingsSection>

            <ThemedText
              type="caption"
              muted
              style={[styles.footnote, { color: colors.inkMuted }]}
            >
              With a prompt off, that delete happens immediately. There is no
              undo.
            </ThemedText>
          </>
        )}
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
  footnote: {
    marginHorizontal: tokens.space.xs,
    lineHeight: 16,
  },
});
