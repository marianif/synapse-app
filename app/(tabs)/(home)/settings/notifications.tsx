import * as Notifications from "expo-notifications";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import {
  SettingsRow,
  SettingsSwitchRow,
} from "@/components/molecules/settings-row";
import { SettingsSection } from "@/components/molecules/settings-section";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import {
  requestNotificationPermissions,
  rescheduleAllEntries,
  rescheduleAllProjectNotifications,
} from "@/lib/notifications";
import {
  getNotificationPref,
  setNotificationPref,
  type NotificationPref,
} from "@/lib/settings";

type PermissionStatus = Notifications.PermissionStatus;

export default function NotificationsSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { entries, projects } = useDatabase();

  const [status, setStatus] = useState<PermissionStatus>(
    Notifications.PermissionStatus.UNDETERMINED,
  );
  const [prefs, setPrefs] = useState<Record<NotificationPref, boolean>>({
    deadlines: true,
    projectReturns: true,
  });
  const [ready, setReady] = useState(false);

  const loadStatus = useCallback(async (): Promise<void> => {
    try {
      const { status: current } = await Notifications.getPermissionsAsync();
      setStatus(current);
    } catch (error) {
      console.error("[Settings] getPermissionsAsync failed:", error);
    }
  }, []);

  const resync = useCallback(async (): Promise<void> => {
    await rescheduleAllEntries(entries).catch((error) => {
      console.warn("[Settings] rescheduleAllEntries failed:", error);
    });
    await rescheduleAllProjectNotifications(projects, entries).catch((error) => {
      console.warn("[Settings] rescheduleAllProjectNotifications failed:", error);
    });
  }, [entries, projects]);

  // Re-read on focus so a change made in system Settings is reflected on return.
  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus]),
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([
        getNotificationPref("deadlines"),
        getNotificationPref("projectReturns"),
      ])
        .then(([deadlines, projectReturns]) => {
          if (alive) {
            setPrefs({ deadlines, projectReturns });
            setReady(true);
          }
        })
        .catch((error) => {
          console.error("[Settings] notification prefs failed:", error);
          if (alive) setReady(true);
        });
      return () => {
        alive = false;
      };
    }, []),
  );

  const handlePermissionPress = async (): Promise<void> => {
    try {
      if (status === Notifications.PermissionStatus.UNDETERMINED) {
        const granted = await requestNotificationPermissions();
        await loadStatus();
        if (granted) await resync();
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.error("[Settings] permission action failed:", error);
      Alert.alert("Couldn't update notification permission.");
    }
  };

  const handleToggle = async (
    pref: NotificationPref,
    next: boolean,
  ): Promise<void> => {
    setPrefs((current) => ({ ...current, [pref]: next }));
    await setNotificationPref(pref, next);
    await resync();
  };

  const permissionValue =
    status === Notifications.PermissionStatus.GRANTED
      ? "Allowed"
      : status === Notifications.PermissionStatus.DENIED
        ? "Off"
        : "Not asked";
  const permissionLabel =
    status === Notifications.PermissionStatus.DENIED || status === Notifications.PermissionStatus.UNDETERMINED
      ? "Enable notifications"
      : "System permission";

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title="Notifications"
              kicker="ALERTS"
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
            <SettingsSection label="Permission">
              <SettingsRow
                label={permissionLabel}
                value={permissionValue}
                onPress={() => void handlePermissionPress()}
                accessibilityHint={
                  status === Notifications.PermissionStatus.UNDETERMINED
                    ? "Asks the system for notification permission"
                    : "Opens system notification settings"
                }
              />
            </SettingsSection>

            <SettingsSection label="Notify me about">
              <SettingsSwitchRow
                label="Deadline reminders"
                description="One alert at a deadline's time."
                value={prefs.deadlines}
                disabled={status !== Notifications.PermissionStatus.GRANTED}
                onValueChange={(next) => void handleToggle("deadlines", next)}
              />
              <SettingsSwitchRow
                label="Project returns"
                description="A nudge when a quiet project still has open work."
                value={prefs.projectReturns}
                disabled={status !== Notifications.PermissionStatus.GRANTED}
                onValueChange={(next) =>
                  void handleToggle("projectReturns", next)
                }
              />
            </SettingsSection>

            <ThemedText
              type="caption"
              muted
              style={[styles.footnote, { color: colors.inkMuted }]}
            >
              Synapse sends reminders from this device only. No account, no
              server.
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
