import * as Haptics from "expo-haptics";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import type { IconSymbolName } from "@/components/ui/icon-symbol";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useGlobalCapture } from "@/contexts/global-capture-context";

function TabIcon({ name, color }: { name: IconSymbolName; color: string }) {
  return <IconSymbol name={name} size={24} color={color} />;
}

export function CustomTabBar(): React.ReactElement {
  const { colors } = useTheme();
  const pathname = usePathname();
  const cap = useGlobalCapture();

  const isHome = pathname === "/" || pathname === "/(tabs)";
  const isNotes = pathname === "/(tabs)/notes" || pathname === "/notes";
  const isAgenda = pathname === "/(tabs)/agenda" || pathname === "/agenda";
  const isProjects =
    pathname === "/(tabs)/(projects)" || pathname.startsWith("/(projects)");

  const active = (on: boolean): string =>
    on ? colors.accent.clay : colors.inkMuted;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surfaceSubtle }]}
      // Report the bar's real height so surfaces that rest above it (the global
      // dock, the notes composer) sit on the measured value instead of a
      // hardcoded estimate that drifts per device.
      onLayout={(e) => cap.setTabBarHeight(e.nativeEvent.layout.height)}
    >
      <View style={styles.tabBar}>
        {/* Two destinations per side so the pen key stays optically centered.
            Field is the board itself; Notes is the reflective layer. */}
        <View style={styles.side}>
          <Pressable
            onPress={() => router.push("/(tabs)/(projects)")}
            accessibilityRole="button"
            accessibilityLabel="Projects"
            accessibilityState={{ selected: isProjects }}
            style={({ pressed }) => [
              styles.tabButton,
              pressed && styles.tabButtonPressed,
            ]}
          >
            <TabIcon name="Folder" color={active(isProjects)} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/")}
            accessibilityRole="button"
            accessibilityLabel="Field"
            accessibilityState={{ selected: isHome }}
            style={({ pressed }) => [
              styles.tabButton,
              pressed && styles.tabButtonPressed,
            ]}
          >
            <TabIcon name="Grid" color={active(isHome)} />
          </Pressable>
        </View>

        {/* The pen key — one thumb gesture from anywhere, two registers. TAP
            opens the "Put something in" capture bar: type a thought, the
            resolver decides what it is (todo / deadline / idea / note). This is
            the brand's ONE headline verb — the central control is capture, not
            a type- or project-specific fork. LONG-PRESS arms VOICE capture:
            catch a thought now, resolve it later. The dock is owned by the tab
            layout (GlobalCaptureContext), so both drive it directly and it
            works identically from any tab — no navigation involved. The one
            neutral-accent control in the chrome, so it reads at a glance
            without clashing with any saturated type code. */}
        <Pressable
          onPress={() => cap.requestCapture()}
          onLongPress={() => {
            // Voice capture is a bigger gesture than a tap — confirm it in the hand.
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            cap.requestVoiceCapture();
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
          {/* A four-point spark, not a plus — the pen key catches a thought,
              it doesn't "add a row." Rendered in the surface tone on the clay
              accent so it stays the one neutral, type-agnostic control in the
              chrome (no entry-code color leaking into the headline verb). */}
          <IconSymbol name="Sparkles" size={26} color={colors.surface} />
        </Pressable>

        <View style={styles.side}>
          {/* The board's voice — a waveform, because this tab is the board
              talking, not another place to put things. */}
          <Pressable
            onPress={() => router.push("/(tabs)/notes")}
            accessibilityRole="button"
            accessibilityLabel="Notes"
            accessibilityState={{ selected: isNotes }}
            style={({ pressed }) => [
              styles.tabButton,
              pressed && styles.tabButtonPressed,
            ]}
          >
            <TabIcon name="Notebook" color={active(isNotes)} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/agenda")}
            accessibilityRole="button"
            accessibilityLabel="Agenda"
            accessibilityHint="What the board has to say about your open items."
            accessibilityState={{ selected: isAgenda }}
            style={({ pressed }) => [
              styles.tabButton,
              pressed && styles.tabButtonPressed,
            ]}
          >
            <TabIcon name="DirectNotification2" color={active(isAgenda)} />
          </Pressable>
        </View>
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
    alignItems: "flex-end",
    paddingHorizontal: tokens.space.lg,
  },
  // Equal-weight flanks: the pen key sits in the true center of the bar no
  // matter how many destinations each side carries.
  side: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-evenly",
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
