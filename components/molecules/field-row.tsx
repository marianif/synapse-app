import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, tokens, useTheme } from "@/constants/theme";

import type { EntryType } from "@/lib/types";
import type { Href } from "expo-router";

/** How alive a row reads — drives glow intensity, never its position. */
export type Heat = "hot" | "warm" | "cool";

export interface FieldRowItem {
  id: string;
  type: EntryType;
  title: string;
  /** Absolute when-label: "Tomorrow", "2d overdue", "Thu", "Aug". */
  when?: string;
  heat: Heat;
}

interface FieldRowProps {
  item: FieldRowItem;
  href: Href;
}

/**
 * One entry on the Field Lab board. The saturated type-color edge-bar IS the
 * type signal (no border, no icon) and a faint same-hue glow behind the bar
 * makes the row read as charged, not listed — a hot row glows visibly, a cool
 * one barely. Every type glows on the same scale: an idea is as alive as a bill.
 * The mono when-label on the right reads like an instrument readout.
 */
export function FieldRow({ item, href }: FieldRowProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const code = entryColor(item.type);

  // Glow opacity encodes aliveness, not rank — hot rows pull the eye
  // pre-attentively. Built from the row's own type hue so the charge is colored.
  const glowAlpha =
    item.heat === "hot" ? 0.22 : item.heat === "warm" ? 0.12 : 0.05;

  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${item.when ? `, ${item.when}` : ""}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      hitSlop={6}
    >
      {/* same-hue glow wash behind the bar — the Field Lab charge */}
      <View
        style={[
          styles.glow,
          { backgroundColor: code, opacity: glowAlpha },
        ]}
      />
      <View style={[styles.edge, { backgroundColor: code }]} />

      <ThemedText
        type={item.heat === "hot" ? "item" : "body"}
        numberOfLines={1}
        style={[styles.title, { color: colors.ink }]}
      >
        {item.title}
      </ThemedText>

      {item.when ? (
        <ThemedText
          type="mono"
          style={[
            styles.when,
            { color: item.heat === "hot" ? code : colors.inkMuted },
          ]}
        >
          {item.when}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingVertical: tokens.space.sm,
    paddingLeft: tokens.space.md,
    paddingRight: tokens.space.md,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.7,
  },
  // colored charge bleeding from the edge-bar — clipped to the row radius
  glow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 96,
  },
  // saturated edge-bar replaces a 1px border (DESIGN.md)
  edge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  title: {
    flex: 1,
    marginRight: tokens.space.sm,
  },
  when: {
    textAlign: "right",
  },
});
