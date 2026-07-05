import * as Haptics from "expo-haptics";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import type { IconSymbolName } from "@/components/ui/icon-symbol";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { EntryCluster } from "../atoms/entry-cluster";

function TabIcon({ name, color }: { name: IconSymbolName; color: string }) {
  return <IconSymbol name={name} size={24} color={color} />;
}

export function CustomTabBar(): React.ReactElement {
  const { colors } = useTheme();
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "/(tabs)";
  const isNotes = pathname === "/(tabs)/notes" || pathname === "/notes";

  const active = (on: boolean): string =>
    on ? colors.accent.clay : colors.inkMuted;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSubtle }]}>
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => router.push("/")}
          accessibilityRole="button"
          accessibilityLabel="Field"
          style={({ pressed }) => [
            styles.tabButton,
            pressed && styles.tabButtonPressed,
          ]}
        >
          <TabIcon name="view-grid" color={active(isHome)} />
        </Pressable>

        {/* The pen key — one thumb gesture from anywhere, two registers. TAP
            opens the "Put something in" capture bar: type a thought, the
            resolver decides what it is (todo / deadline / idea / note). This is
            the brand's ONE headline verb — the central control is capture, not
            a type- or project-specific fork. LONG-PRESS arms VOICE capture:
            catch a thought now, resolve it later. Both ride the existing
            ?capture= deep-link the widget already uses, so it works from any
            tab. The one neutral-accent control in the chrome, so it reads at a
            glance without clashing with any saturated type code. */}
        <Pressable
          onPress={() =>
            router.push({ pathname: "/", params: { capture: "text" } })
          }
          onLongPress={() => {
            // Voice capture is a bigger gesture than a tap — confirm it in the hand.
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({ pathname: "/", params: { capture: "voice" } });
          }}
          delayLongPress={350}
          accessibilityRole="button"
          accessibilityLabel="Capture a thought"
          accessibilityHint="Tap to put something in. Long-press to capture by voice."
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: colors.accent.clay },
            tokens.elevation.capture,
            pressed && styles.addButtonPressed,
          ]}
        >
          <EntryCluster
            types={["deadline", "todo", "idea"]}
            dotSize={7}
            gap={3}
            width={24}
          />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/notes")}
          accessibilityRole="button"
          accessibilityLabel="Notes"
          style={({ pressed }) => [
            styles.tabButton,
            pressed && styles.tabButtonPressed,
          ]}
        >
          <TabIcon name="notebook-outline" color={active(isNotes)} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: 0,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: tokens.space.lg,
  },
  tabButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.sm,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  addButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
});
