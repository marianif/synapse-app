import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { SettingsRow } from "@/components/molecules/settings-row";
import { SettingsSection } from "@/components/molecules/settings-section";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  tokens,
  useEntryKicker,
  useTheme,
  type Scheme,
} from "@/constants/theme";
import { useOnboarding } from "@/contexts/onboarding-context";
import { useThemeContext } from "@/contexts/theme-context";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { clearAllData, getDb, seedDefaultProjectsOnce } from "@/lib/database";
import { SCENARIOS, seedScenario, type ScenarioKey } from "@/lib/dev-seed";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

export default function SettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { resolvedScheme, setPreference } = useThemeContext();
  const {
    fetchEntries,
    fetchProjects,
    refetchTasks,
    refetchRecurrenceCompletions,
  } = useDatabase();
  const { refresh: refreshDiary } = useDiary();
  const { resetOnboarding } = useOnboarding();
  const ideaAccent = useEntryKicker("idea");
  const deadlineAccent = useEntryKicker("deadline");

  const refetchAll = async (): Promise<void> => {
    await fetchEntries();
    await fetchProjects();
    await refetchTasks();
    await refetchRecurrenceCompletions();
    await refreshDiary();
  };

  const handleClearDatabase = (): void => {
    Alert.alert(
      "Clear database?",
      "This permanently deletes all entries, projects, and diary notes. Dev only.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllData();
              await seedDefaultProjectsOnce();
              await refetchAll();
            } catch (error) {
              console.error("[Settings] clearAllData failed:", error);
              Alert.alert("Couldn't clear the database.");
            }
          },
        },
      ],
    );
  };

  const handleSeedScenario = (key: ScenarioKey, label: string): void => {
    Alert.alert(
      `Seed "${label}"?`,
      "This wipes the database, then inserts the scenario's fixture. Dev only.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Apply",
          onPress: async () => {
            try {
              await seedScenario(getDb(), key);
              await refetchAll();
            } catch (error) {
              console.error("[Settings] seedScenario failed:", error);
              Alert.alert("Couldn't seed the database.");
            }
          },
        },
      ],
    );
  };

  const handleReplayOnboarding = (): void => {
    // Clear the first-run gate, then open the story immediately. The root
    // layout's onboarding redirect keeps us there until it is finished again.
    void resetOnboarding();
    router.replace("/onboarding");
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader title="Settings" onBack={() => router.back()} />
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection label="Appearance">
          <ThemeToggle
            scheme={resolvedScheme}
            onChange={(next) => setPreference(next)}
          />
        </SettingsSection>

        <SettingsSection label="Preferences">
          <SettingsRow
            label="Notifications"
            description="Deadline reminders and project returns."
            onPress={() => router.push("/settings/notifications")}
          />
          <SettingsRow
            label="Confirmations"
            description="Ask before destructive actions."
            onPress={() => router.push("/settings/confirmations")}
          />
        </SettingsSection>

        <SettingsSection label="About">
          <SettingsRow
            label="About & Legal"
            value={APP_VERSION}
            onPress={() => router.push("/settings/about")}
          />
        </SettingsSection>

        {__DEV__ && (
          <SettingsSection label="Dev · Seed Scenario">
            {SCENARIOS.map((scenario) => (
              <Pressable
                key={scenario.key}
                onPress={() =>
                  handleSeedScenario(scenario.key, scenario.label)
                }
                style={({ pressed }) => [
                  styles.devRow,
                  {
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Seed scenario ${scenario.label}`}
                accessibilityHint={scenario.description}
              >
                <IconSymbol name="Add2" size={16} color={ideaAccent} />
                <View style={styles.devCopy}>
                  <ThemedText type="item" style={{ color: colors.ink }}>
                    {scenario.label}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    muted
                    numberOfLines={2}
                    style={styles.devDescription}
                  >
                    {scenario.description}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </SettingsSection>
        )}

        {__DEV__ && (
          <SettingsSection label="Dev · Onboarding">
            <Pressable
              onPress={handleReplayOnboarding}
              style={({ pressed }) => [
                styles.devRow,
                {
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Show onboarding"
              accessibilityHint="Resets the first-run flag and opens the onboarding story from chapter one."
            >
              <IconSymbol name="PlayCircle" size={16} color={ideaAccent} />
              <View style={styles.devCopy}>
                <ThemedText type="item" style={{ color: colors.ink }}>
                  Show onboarding
                </ThemedText>
                <ThemedText
                  type="caption"
                  muted
                  numberOfLines={2}
                  style={styles.devDescription}
                >
                  Reopens the first-run story from chapter one. Dev only.
                </ThemedText>
              </View>
            </Pressable>
          </SettingsSection>
        )}

        {__DEV__ && (
          <Pressable
            onPress={handleClearDatabase}
            style={({ pressed }) => [
              styles.devButton,
              {
                backgroundColor: colors.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Clear database (dev only)"
          >
            <IconSymbol name="Trash2" size={18} color={deadlineAccent} />
            <ThemedText type="caption" style={{ color: deadlineAccent }}>
              Clear Database
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const TOGGLE_PAD = 4;
const TOGGLE_WELL = 40;
const TOGGLE_TRAVEL = TOGGLE_WELL;

function ThemeToggle({
  scheme,
  onChange,
}: {
  scheme: Scheme;
  onChange: (next: Scheme) => void;
}): React.ReactElement {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const isDark = scheme === "dark";

  const pos = useSharedValue(isDark ? 1 : 0);
  useEffect(() => {
    const next = isDark ? 1 : 0;
    pos.value = reduced
      ? next
      : withTiming(next, {
          duration: tokens.motion.duration.base,
          easing: Easing.bezier(...tokens.motion.bezier),
        });
  }, [isDark, pos, reduced]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.value * TOGGLE_TRAVEL }],
  }));
  const sunStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pos.value, [0, 1], [1, 0.35]),
  }));
  const moonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pos.value, [0, 1], [0.35, 1]),
  }));

  return (
    <Pressable
      onPress={() => onChange(isDark ? "light" : "dark")}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel="Dark appearance"
      hitSlop={8}
      style={[styles.toggleTrack, { backgroundColor: colors.surface }]}
    >
      <Animated.View
        style={[
          styles.toggleKnob,
          { backgroundColor: colors.accent.clay },
          knobStyle,
        ]}
      />
      <Animated.View style={[styles.toggleWell, sunStyle]}>
        <IconSymbol
          name="Sun"
          size={20}
          color={isDark ? colors.inkMuted : colors.accent.onClay}
        />
      </Animated.View>
      <Animated.View style={[styles.toggleWell, moonStyle]}>
        <IconSymbol
          name="Moon"
          size={20}
          color={isDark ? colors.accent.onClay : colors.inkMuted}
        />
      </Animated.View>
    </Pressable>
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
  toggleTrack: {
    alignSelf: "flex-start",
    flexDirection: "row",
    width: TOGGLE_WELL * 2 + TOGGLE_PAD * 2,
    height: TOGGLE_WELL + TOGGLE_PAD * 2,
    padding: TOGGLE_PAD,
    borderRadius: tokens.radius.pill,
  },
  toggleKnob: {
    position: "absolute",
    top: TOGGLE_PAD,
    left: TOGGLE_PAD,
    width: TOGGLE_WELL,
    height: TOGGLE_WELL,
    borderRadius: tokens.radius.pill,
  },
  toggleWell: {
    width: TOGGLE_WELL,
    height: TOGGLE_WELL,
    alignItems: "center",
    justifyContent: "center",
  },
  devRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  devCopy: {
    flex: 1,
    gap: 2,
  },
  devDescription: {
    lineHeight: 16,
  },
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
    minHeight: 44,
    borderRadius: tokens.radius.md,
  },
});
