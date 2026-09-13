import * as Notifications from "expo-notifications";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import {
  ChoiceSheet,
  type ChoiceOption,
} from "@/components/molecules/choice-sheet";
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
  syncScheduledNotifications,
} from "@/lib/notifications";
import {
  DEADLINE_LEAD_MINUTES,
  getDeadlineLeadMinutes,
  getDormantReminderBehavior,
  getNotificationPref,
  setDeadlineLeadMinutes,
  setDormantReminderBehavior,
  setNotificationPref,
  type DeadlineLeadMinutes,
  type DormantReminderBehavior,
  type NotificationPref,
} from "@/lib/settings";

type PermissionStatus = Notifications.PermissionStatus;

const LEAD_LABELS: Record<DeadlineLeadMinutes, string> = {
  0: "At the time",
  10: "10 minutes before",
  30: "30 minutes before",
  60: "1 hour before",
  1440: "1 day before",
};

const LEAD_OPTIONS: ChoiceOption[] = DEADLINE_LEAD_MINUTES.map((value) => ({
  value: String(value),
  label: LEAD_LABELS[value],
}));

const DORMANT_OPTIONS: ChoiceOption[] = [
  {
    value: "drop",
    label: "Drop them",
    description: "A quiet project stays quiet until you return.",
  },
  {
    value: "summary",
    label: "One summary",
    description: "A single note about the projects still waiting.",
  },
  {
    value: "staggered",
    label: "Staggered",
    description: "One note per project, spaced apart.",
  },
];

const DORMANT_LABELS: Record<DormantReminderBehavior, string> = {
  drop: "Drop them",
  summary: "One summary",
  staggered: "Staggered",
};

export default function NotificationsSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { entries, projects, habits } = useDatabase();

  const [status, setStatus] = useState<PermissionStatus>(
    Notifications.PermissionStatus.UNDETERMINED,
  );
  const [prefs, setPrefs] = useState<Record<NotificationPref, boolean>>({
    deadlines: true,
    projectReturns: true,
    habits: true,
  });
  const [lead, setLead] = useState<DeadlineLeadMinutes>(0);
  const [dormant, setDormant] = useState<DormantReminderBehavior>("drop");
  const [sheet, setSheet] = useState<"lead" | "dormant" | null>(null);
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
    await syncScheduledNotifications({ entries, projects, habits }).catch(
      (error) => {
        console.warn("[Settings] syncScheduledNotifications failed:", error);
      },
    );
  }, [entries, projects, habits]);

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
        getNotificationPref("habits"),
        getDeadlineLeadMinutes(),
        getDormantReminderBehavior(),
      ])
        .then(
          ([
            deadlines,
            projectReturns,
            habitsPref,
            leadPref,
            dormantPref,
          ]) => {
            if (alive) {
              setPrefs({ deadlines, projectReturns, habits: habitsPref });
              setLead(leadPref);
              setDormant(dormantPref);
              setReady(true);
            }
          },
        )
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

  const handleLeadSelect = async (value: string): Promise<void> => {
    const next = Number.parseInt(value, 10) as DeadlineLeadMinutes;
    setLead(next);
    setSheet(null);
    await setDeadlineLeadMinutes(next);
    await resync();
  };

  const handleDormantSelect = async (value: string): Promise<void> => {
    const next = value as DormantReminderBehavior;
    setDormant(next);
    setSheet(null);
    await setDormantReminderBehavior(next);
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
                description="An alert as a deadline approaches."
                value={prefs.deadlines}
                disabled={status !== Notifications.PermissionStatus.GRANTED}
                onValueChange={(next) => void handleToggle("deadlines", next)}
              />
              {prefs.deadlines ? (
                <SettingsRow
                  label="Remind me"
                  value={LEAD_LABELS[lead]}
                  onPress={() => setSheet("lead")}
                  accessibilityHint="Choose how far ahead deadline reminders fire"
                />
              ) : null}
              <SettingsSwitchRow
                label="Project returns"
                description="A nudge when a quiet project still has open work."
                value={prefs.projectReturns}
                disabled={status !== Notifications.PermissionStatus.GRANTED}
                onValueChange={(next) =>
                  void handleToggle("projectReturns", next)
                }
              />
              {prefs.projectReturns ? (
                <SettingsRow
                  label="When a project goes quiet"
                  value={DORMANT_LABELS[dormant]}
                  onPress={() => setSheet("dormant")}
                  accessibilityHint="Choose how elapsed project windows surface"
                />
              ) : null}
              <SettingsSwitchRow
                label="Habit nudges"
                description="A habit's own reason, at the time you set."
                value={prefs.habits}
                disabled={status !== Notifications.PermissionStatus.GRANTED}
                onValueChange={(next) => void handleToggle("habits", next)}
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

      <ChoiceSheet
        visible={sheet === "lead"}
        title="REMIND ME"
        options={LEAD_OPTIONS}
        selected={String(lead)}
        onSelect={(value) => void handleLeadSelect(value)}
        onClose={() => setSheet(null)}
      />
      <ChoiceSheet
        visible={sheet === "dormant"}
        title="WHEN A PROJECT GOES QUIET"
        options={DORMANT_OPTIONS}
        selected={dormant}
        onSelect={(value) => void handleDormantSelect(value)}
        onClose={() => setSheet(null)}
      />
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
