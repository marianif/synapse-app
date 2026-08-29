import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

import { ScreenHeader } from "@/components/organisms/screen-header";
import {
  tokens,
  useEntryKicker,
  useTheme,
  type Scheme,
} from "@/constants/theme";
import { useThemeContext } from "@/contexts/theme-context";
import { useDatabase } from "@/hooks/use-database/use-database";
import { clearAllData, getDb, seedDefaultProjectsOnce } from "@/lib/database";
import { SCENARIOS, seedScenario, type ScenarioKey } from "@/lib/dev-seed";

export default function SettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { resolvedScheme, setPreference } = useThemeContext();
  const { fetchEntries, fetchProjects } = useDatabase();
  const ideaAccent = useEntryKicker("idea");
  const deadlineAccent = useEntryKicker("deadline");

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
              await fetchEntries();
              await fetchProjects();
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
              await fetchEntries();
              await fetchProjects();
            } catch (error) {
              console.error("[Settings] seedScenario failed:", error);
              Alert.alert("Couldn't seed the database.");
            }
          },
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
            <ScreenHeader title="Settings" onBack={() => router.back()} />
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.inkMuted }]}>
            Appearance
          </Text>
          <ThemeToggle
            scheme={resolvedScheme}
            onChange={(next) => setPreference(next)}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.inkMuted }]}>
            About
          </Text>
          <Text style={[styles.version, { color: colors.inkMuted }]}>
            v1.0.0
          </Text>
        </View>

        {true && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.inkMuted }]}>
              Dev · Seed Scenario
            </Text>
            {SCENARIOS.map((scenario) => (
              <Pressable
                key={scenario.key}
                onPress={() =>
                  handleSeedScenario(scenario.key, scenario.label)
                }
                style={({ pressed }) => [
                  styles.scenarioRow,
                  {
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Seed scenario ${scenario.label}`}
                accessibilityHint={scenario.description}
              >
                <MaterialCommunityIcons
                  name="database-plus-outline"
                  size={16}
                  color={ideaAccent}
                />
                <View style={styles.scenarioCopy}>
                  <Text style={[styles.scenarioLabel, { color: colors.ink }]}>
                    {scenario.label}
                  </Text>
                  <Text
                    style={[
                      styles.scenarioDescription,
                      { color: colors.inkMuted },
                    ]}
                    numberOfLines={2}
                  >
                    {scenario.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
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
            <MaterialCommunityIcons
              name="database-remove-outline"
              size={18}
              color={deadlineAccent}
            />
            <Text style={[styles.devButtonLabel, { color: deadlineAccent }]}>
              Clear Database
            </Text>
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
        <MaterialCommunityIcons
          name="weather-sunny"
          size={20}
          color={isDark ? colors.inkMuted : colors.accent.onClay}
        />
      </Animated.View>
      <Animated.View style={[styles.toggleWell, moonStyle]}>
        <MaterialCommunityIcons
          name="weather-night"
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
  section: {
    gap: tokens.space.md,
  },
  sectionLabel: {
    fontSize: tokens.type.kicker.size,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginLeft: tokens.space.xs,
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
  scenarioRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.xs,
  },
  scenarioCopy: {
    flex: 1,
  },
  scenarioLabel: {
    fontSize: tokens.type.body.size,
    fontWeight: "600",
    marginBottom: 2,
  },
  scenarioDescription: {
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.size * 1.35,
  },
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
    minHeight: 44,
    borderRadius: tokens.radius.md,
  },
  devButtonLabel: {
    fontSize: tokens.type.kicker.size,
    fontWeight: "600",
  },
  version: {
    fontSize: tokens.type.kicker.size,
    marginLeft: tokens.space.xs,
  },
});
