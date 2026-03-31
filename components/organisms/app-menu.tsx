import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";

import {
  EntryAccent,
  FontSize,
  Radius,
  Spacing,
  Surface,
  TextColors,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

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
    accentColor: EntryAccent.todo,
  },
  {
    label: "Add Event",
    icon: "calendar-clock",
    modalParams: { type: "event" },
    accentColor: EntryAccent.event,
  },
  {
    label: "Add Deadline",
    icon: "clock-alert-outline",
    modalParams: { type: "deadline" },
    accentColor: EntryAccent.deadline,
  },
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
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState<"light" | "dark">(
    colorScheme === "dark" ? "dark" : "light",
  );

  const toggleTheme = () => {
    setIsDark((prev) => (prev === "dark" ? "light" : "dark"));
  };

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

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.blurContainer}>
        <View style={styles.menu}>
          <View style={styles.header}>
            <Text style={styles.logo}>Synapse</Text>
            <View style={styles.headerActions}>
              <Pressable onPress={toggleTheme} hitSlop={8}>
                <MaterialCommunityIcons
                  name={isDark ? "weather-sunny" : "weather-night"}
                  size={22}
                  color={TextColors.secondary}
                />
              </Pressable>
              <Pressable onPress={onClose} hitSlop={8}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={TextColors.secondary}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quick Add</Text>
            <View style={styles.quickActions}>
              {quickActions.map((item) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [
                    styles.quickAction,
                    pressed && styles.menuItemPressed,
                  ]}
                  onPress={() => handleItemPress(item)}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={item.accentColor}
                  />
                  <Text style={styles.quickActionLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Views</Text>
            {menuItems.slice(0, 4).map((item) => (
              <MenuRow
                key={item.label}
                item={item}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>App</Text>
            {menuItems.slice(4).map((item) => (
              <MenuRow
                key={item.label}
                item={item}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.version}>v1.0.0</Text>
          </View>
        </View>
      </View>
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
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
      onPress={onPress}
    >
      <MaterialCommunityIcons
        name={item.icon as any}
        size={22}
        color={TextColors.primary}
      />
      <Text style={styles.menuLabel}>{item.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    backgroundColor: Surface.containerLow,
    paddingTop: Spacing.xxxl + Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xxl,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  logo: {
    fontSize: 24,
    fontWeight: "700",
    color: TextColors.primary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: FontSize.labelSm,
    color: TextColors.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Surface.container,
    gap: Spacing.xs,
  },
  quickActionLabel: {
    fontSize: FontSize.labelSm,
    color: TextColors.primary,
    fontWeight: "500",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xs,
  },
  menuItemPressed: {
    backgroundColor: Surface.bright,
  },
  menuLabel: {
    fontSize: FontSize.bodyMd,
    color: TextColors.primary,
    marginLeft: Spacing.md,
  },
  footer: {
    position: "absolute",
    bottom: Spacing.xxl,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  version: {
    fontSize: FontSize.labelXs,
    color: TextColors.tertiary,
    textAlign: "center",
  },
});
