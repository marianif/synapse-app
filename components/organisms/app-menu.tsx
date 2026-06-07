import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { entryColor, tokens, useTheme } from "@/constants/theme";
import { useThemeContext } from "@/contexts/theme-context";
import { useDatabase } from "@/hooks/use-database/use-database";
import { clearAllData } from "@/lib/database";
import type { ThemePreference } from "@/lib/settings";

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
  modalParams?: { type: "todo" | "deadline" | "event" };
}

const quickActions: MenuItem[] = [
  {
    label: "Add Todo",
    icon: "checkbox-marked-outline",
    modalParams: { type: "todo" },
    accentColor: entryColor("todo"),
  },
  {
    label: "Add Event",
    icon: "calendar-clock",
    modalParams: { type: "event" },
    accentColor: entryColor("event"),
  },
  {
    label: "Add Deadline",
    icon: "clock-alert-outline",
    modalParams: { type: "deadline" },
    accentColor: entryColor("deadline"),
  },
];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] =
  [
    { value: "system", label: "System", icon: "cellphone" },
    { value: "light", label: "Light", icon: "weather-sunny" },
    { value: "dark", label: "Dark", icon: "weather-night" },
  ];

const menuItems: MenuItem[] = [
  { label: "Today", icon: "clock-outline", route: "/" },
  { label: "Incoming", icon: "calendar-week", route: "/list" },
  { label: "Calendar", icon: "calendar-month", route: "/calendar" },
  { label: "Stats", icon: "chart-bar", route: "/stats", dividerAfter: true },
  { label: "Settings", icon: "cog-outline", route: "/settings" },
  { label: "About", icon: "information-outline" },
];

export function AppMenu({
  visible,
  onClose,
}: AppMenuProps): React.ReactElement | null {
  const router = useRouter();
  const { colors } = useTheme();
  const { preference, setPreference } = useThemeContext();
  const { fetchEntries } = useDatabase();
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
    if (item.modalParams) {
      const params = new URLSearchParams(item.modalParams as any);
      router.push(`/modal?${params.toString()}`);
    } else if (item.route) {
      router.push(item.route as any);
    }
    onClose();
  };

  const handleClearDatabase = () => {
    Alert.alert(
      "Clear database?",
      "This permanently deletes all entries and diary notes. Dev only.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllData();
              await fetchEntries();
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

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.blurContainer, animatedStyle]}>
        <View style={[styles.menu, { backgroundColor: colors.surfaceSubtle }]}>
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.ink }]}>Synapse</Text>
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

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.inkMuted }]}>
              App
            </Text>
            {menuItems.slice(4).map((item) => (
              <MenuRow
                key={item.label}
                item={item}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.inkMuted }]}>
              Appearance
            </Text>
            <View
              style={[
                styles.segmented,
                { backgroundColor: colors.surface },
              ]}
            >
              {THEME_OPTIONS.map((opt) => {
                const active = preference === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPreference(opt.value)}
                    style={[
                      styles.segment,
                      active && { backgroundColor: colors.accent.clay },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${opt.label} appearance`}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon as any}
                      size={18}
                      color={active ? colors.accent.onClay : colors.inkMuted}
                    />
                    <Text
                      style={[
                        styles.segmentLabel,
                        { color: active ? colors.accent.onClay : colors.inkMuted },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.footer}>
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
                  style={[styles.devButtonLabel, { color: entryColor("deadline") }]}
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
  segmented: {
    flexDirection: "row",
    borderRadius: tokens.radius.sm,
    padding: tokens.space.xs,
    gap: tokens.space.xs,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
    minHeight: 44,
    borderRadius: tokens.radius.sm,
  },
  segmentLabel: {
    fontSize: tokens.type.kicker.size,
    fontWeight: "600",
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
