import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
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

import { entryColor, type Scheme, tokens, useTheme } from "@/constants/theme";
import { useThemeContext } from "@/contexts/theme-context";
import { useDatabase } from "@/hooks/use-database/use-database";
import { clearAllData, getDb } from "@/lib/database";
import { seedDevDataIfEmpty } from "@/lib/dev-seed";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

type RouteString = "/" | "/list" | "/calendar" | "/stats" | "/settings";

interface AppMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  icon: string;
  route?: RouteString;
  dividerAfter?: boolean;
  accentColor?: string;
}

const menuItems: MenuItem[] = [
  { label: "Settings", icon: "cog-outline", route: "/settings" },
  { label: "About", icon: "information-outline" },
];

export function AppMenu({
  visible,
  onClose,
}: AppMenuProps): React.ReactElement | null {
  const router = useRouter();
  const { colors } = useTheme();
  const { resolvedScheme, setPreference } = useThemeContext();
  const { fetchEntries, fetchProjects } = useDatabase();
  const translateX = useSharedValue(MENU_WIDTH);

  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, { duration: 300 });
    } else {
      translateX.value = withTiming(MENU_WIDTH, { duration: 250 });
    }
  }, [visible, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!visible) return null;

  const handleItemPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as any);
    }
    onClose();
  };

  const handleClearDatabase = () => {
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
              await fetchEntries();
              await fetchProjects();
              onClose();
            } catch (error) {
              console.error("[AppMenu] clearAllData failed:", error);
              Alert.alert("Couldn't clear the database.");
            }
          },
        },
      ],
    );
  };

  const handleSeedDatabase = () => {
    Alert.alert(
      "Seed database?",
      "Inserts mock entries across all types. Only runs when the database is empty. Dev only.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Seed",
          onPress: async () => {
            try {
              const inserted = await seedDevDataIfEmpty(getDb());
              if (inserted) {
                await fetchEntries();
                onClose();
              } else {
                Alert.alert("Nothing seeded", "Clear the database first.");
              }
            } catch (error) {
              console.error("[AppMenu] seedDevData failed:", error);
              Alert.alert("Couldn't seed the database.");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.blurContainer, animatedStyle]}>
        <View style={[styles.menu, { backgroundColor: colors.surfaceSubtle }]}>
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.ink }]}>Settings</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.inkMuted}
              />
            </Pressable>
          </View>

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
              Views
            </Text>
            {menuItems.slice(0, 4).map((item) => (
              <MenuRow
                key={item.label}
                item={item}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </View>

          <View style={styles.footer}>
            {__DEV__ && (
              <Pressable
                onPress={handleSeedDatabase}
                style={({ pressed }) => [
                  styles.devButton,
                  {
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Seed database (dev only)"
              >
                <MaterialCommunityIcons
                  name="database-plus-outline"
                  size={18}
                  color={entryColor("idea")}
                />
                <Text
                  style={[styles.devButtonLabel, { color: entryColor("idea") }]}
                >
                  Seed Database
                </Text>
              </Pressable>
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
                  color={entryColor("deadline")}
                />
                <Text
                  style={[
                    styles.devButtonLabel,
                    { color: entryColor("deadline") },
                  ]}
                >
                  Clear Database
                </Text>
              </Pressable>
            )}
            <Text style={[styles.version, { color: colors.inkMuted }]}>
              v1.0.0
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function MenuRow({
  item,
  onPress,
}: {
  item: MenuItem;
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && { backgroundColor: colors.surfaceSubtle },
      ]}
      onPress={onPress}
    >
      <MaterialCommunityIcons
        name={item.icon as any}
        size={22}
        color={colors.ink}
      />
      <Text style={[styles.menuLabel, { color: colors.ink }]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

// Track geometry, declared once so the component and styles agree on the math.
const TOGGLE_PAD = 4;
const TOGGLE_WELL = 40; // each glyph well — the knob matches this
const TOGGLE_TRAVEL = TOGGLE_WELL; // knob slides exactly one well over

/**
 * Light/dark switch — one control, not two tabs. A clay knob slides between a
 * sun well and a moon well; tapping anywhere flips to the opposite scheme. The
 * slide IS the affordance: it reads as a physical switch, the glyph under the
 * knob lit, the other dimmed. No labels, no system option.
 */
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

  // 0 = light (knob left), 1 = dark (knob right). Follows the resolved scheme.
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
  // Each glyph lights as the knob arrives over it, dims as it leaves.
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.color.scrim.medium,
    zIndex: 100,
  },
  blurContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: MENU_WIDTH,
    zIndex: 100,
  },
  menu: {
    flex: 1,
    paddingTop: tokens.space.xxxl + tokens.space.lg,
    paddingHorizontal: tokens.space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.space.xxl,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
  },
  logo: {
    fontSize: 24,
    fontWeight: "700",
  },
  section: {
    marginBottom: tokens.space.xl,
  },
  sectionLabel: {
    fontSize: tokens.type.kicker.size,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: tokens.space.md,
    marginLeft: tokens.space.xs,
  },
  // A self-contained switch: a pill track sized to exactly two wells + padding,
  // so it never stretches edge-to-edge like a tab bar.
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
  quickActions: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  quickAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.md,
    gap: tokens.space.xs,
  },
  quickActionLabel: {
    fontSize: tokens.type.kicker.size,
    fontWeight: "500",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.xs,
  },
  menuLabel: {
    fontSize: tokens.type.body.size,
    marginLeft: tokens.space.md,
  },
  footer: {
    position: "absolute",
    bottom: tokens.space.xxl,
    left: tokens.space.lg,
    right: tokens.space.lg,
  },
  version: {
    fontSize: tokens.type.kicker.size,
    textAlign: "center",
  },
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
    minHeight: 44,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.md,
  },
  devButtonLabel: {
    fontSize: tokens.type.kicker.size,
    fontWeight: "600",
  },
});
