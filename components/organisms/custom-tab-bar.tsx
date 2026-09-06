import * as Haptics from "expo-haptics";
import { TabTrigger } from "expo-router/ui";
import { forwardRef, useEffect, useMemo, useState } from "react";
import type { View as RNView } from "react-native";
import { AppState, Pressable, StyleSheet, View } from "react-native";

import type { IconSymbolName } from "@/components/ui/icon-symbol";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useGlobalCapture } from "@/contexts/global-capture-context";
import { useDatabase } from "@/hooks/use-database/use-database";
import { agendaPrompts } from "@/lib/agenda-prompts";

type TabButtonProps = {
  icon: IconSymbolName;
  label: string;
  hint?: string;
  /** Waiting count shown as a dot on the icon; hidden while focused. */
  badgeCount?: number;
  // Injected by <TabTrigger asChild> — the focused state comes from real
  // navigator state, so the bar never has to guess from the URL. It must stay
  // optional: TypeScript can't see the prop the Slot forwards at runtime.
  isFocused?: boolean;
};

// A trigger's child must forward its ref and the press handlers the Slot
// injects, so the button is a forwardRef component rather than an inline
// render — otherwise TabTrigger has nothing to attach its press behavior to.
const TabButton = forwardRef<RNView, TabButtonProps>(function TabButton(
  { icon, label, hint, badgeCount, isFocused, ...pressProps },
  ref,
) {
  const { colors } = useTheme();
  const hasWaiting = (badgeCount ?? 0) > 0 && !isFocused;

  return (
    <Pressable
      ref={ref}
      {...pressProps}
      accessibilityRole="button"
      accessibilityLabel={
        hasWaiting ? `${label}, ${badgeCount} waiting` : label
      }
      accessibilityHint={hint}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.tabButton,
        pressed && styles.tabButtonPressed,
      ]}
    >
      <IconSymbol
        name={icon}
        size={24}
        color={isFocused ? colors.accent.clay : colors.inkMuted}
      />
      {hasWaiting ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.feedback.danger,
              borderColor: colors.surfaceSubtle,
            },
          ]}
        />
      ) : null}
    </Pressable>
  );
});

export function CustomTabBar(): React.ReactElement {
  const { colors } = useTheme();
  const cap = useGlobalCapture();
  const { entries, tasks, projects } = useDatabase();

  // Same derivation as the Agenda screen, so the dot appears exactly when the
  // tab has an invitation to show. `now` is anchored once per mount and re-set
  // on focus so a day passing is reflected without recomputing on every render.
  const [now, setNow] = useState(() => Date.now());

  // Re-anchor "now" whenever the app returns to the foreground so the dot
  // reflects the current moment after a day has passed in the background.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => sub.remove();
  }, []);

  const agendaCount = useMemo(
    () => agendaPrompts({ entries, tasks, projects, now }).length,
    [entries, tasks, projects, now],
  );

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
        {/* Name-only triggers: the hidden <TabList> in the tab layout owns the
            href definitions. A TabTrigger switches tabs without performing a
            navigation action, so tapping the same icon repeatedly can never
            stack duplicate screens the way router.push did.

            resetOnFocus returns a tab's nested stack to its root when you tap
            an already-focused tab — so Projects → a project → Projects lands
            back on the shelf, not on the open project. */}
        <View style={styles.side}>
          <TabTrigger name="projects" asChild resetOnFocus>
            <TabButton icon="Folder" label="Projects" />
          </TabTrigger>
          <TabTrigger name="home" asChild resetOnFocus>
            <TabButton icon="Home6" label="Field" />
          </TabTrigger>
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
          <TabTrigger name="notes" asChild resetOnFocus>
            <TabButton icon="Notebook" label="Notes" />
          </TabTrigger>
          <TabTrigger name="agenda" asChild resetOnFocus>
            <TabButton
              icon="DirectNotification2"
              label="Agenda"
              badgeCount={agendaCount}
              hint="What the board has to say about your open items."
            />
          </TabTrigger>
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
  // Waiting dot on the Agenda icon — sits on the tab button, not the icon, so
  // it stays within the 44pt touch target and reads as a badge on the tab.
  badge: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
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
