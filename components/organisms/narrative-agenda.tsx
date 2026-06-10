import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";
import type { NarrativeLine } from "@/lib/narrative";

interface NarrativeAgendaProps {
  lines: NarrativeLine[];
}

/**
 * The agenda voice — the home's narrative layer, written in your own
 * handwriting (Caveat). It reads the board back to you: yesterday's diary
 * trace, the deadline that's been waiting, the idea you never came back to.
 * Observational statements of fact about time; never a curtain — every line
 * references an item that stays visible and tappable in the zones below.
 * Tapping a line opens what it talks about.
 */
export function NarrativeAgenda({
  lines,
}: NarrativeAgendaProps): React.ReactElement | null {
  const { colors } = useTheme();
  const router = useRouter();
  const reduced = useReducedMotion();

  if (lines.length === 0) return null;

  const open = (line: NarrativeLine): void => {
    if (!line.target) return;
    if (line.target.kind === "diary") {
      router.push("/(tabs)/diary");
    } else {
      router.push({
        pathname: "/detail",
        params: { id: line.target.entryId, entryType: line.target.entryType },
      });
    }
  };

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(tokens.motion.duration.base)}
      style={styles.block}
    >
      {lines.map((line) => (
        <Pressable
          key={line.id}
          onPress={() => open(line)}
          disabled={!line.target}
          accessibilityRole={line.target ? "button" : "text"}
          accessibilityLabel={line.text}
          accessibilityHint={line.target ? "Opens what this line is about" : undefined}
          style={({ pressed }) => [styles.line, pressed && styles.pressed]}
        >
          <ThemedText type="hand" style={{ color: colors.ink }}>
            {line.text}
          </ThemedText>
        </Pressable>
      ))}
      <View style={[styles.rule, { backgroundColor: colors.surfaceSubtle }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: tokens.space.xs,
  },
  line: {
    minHeight: 44,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  // A recessed rule seats the voice above the direct zones — tonal, no border.
  rule: {
    height: 2,
    borderRadius: tokens.radius.pill,
    marginTop: tokens.space.sm,
    width: 56,
  },
});
