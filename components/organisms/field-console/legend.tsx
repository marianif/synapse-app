import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, entryKicker, tokens, useTheme } from "@/constants/theme";

import { CHANNELS } from "./channels";

import type { EntryType } from "@/lib/types";

/**
 * The field legend — the five entry types named, each row tappable so the
 * affordance never rides on hitting a small dot. A code dot + AA-safe kicker
 * label + the plain invite. Extracted from OrbitConsole so it can stand alone
 * as the empty-field's roster of channels.
 *
 * Each row opens a pre-typed capture for its type, so the first thing logged
 * teaches the five-type model. Motion: rows settle in once on mount (staggered
 * FadeInDown); reduced motion drops the stagger.
 *
 * Token policy: `entryColor` for the code dots, `entryKicker` for AA-safe
 * labels, `inkMuted` for the invite copy. No new token values.
 */
export function FieldLegend(): React.ReactElement {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();

  const openChannel = (type: EntryType): void => {
    router.push({ pathname: "/modal", params: { type } });
  };

  return (
    <View style={styles.legend}>
      {CHANNELS.map((c, i) => {
        const entering = reduced
          ? undefined
          : FadeInDown.springify()
              .damping(tokens.motion.spring.damping)
              .stiffness(tokens.motion.spring.stiffness)
              .delay(360 + i * 50);
        return (
          <Animated.View key={c.type} entering={entering}>
            <Pressable
              onPress={() => openChannel(c.type)}
              accessibilityRole="button"
              accessibilityLabel={`${c.label}. Tap to ${c.invite}.`}
              style={({ pressed }) => [styles.legendRow, pressed && styles.pressed]}
            >
              <View style={[styles.legendDot, { backgroundColor: entryColor(c.type) }]} />
              <ThemedText
                type="label"
                style={[styles.legendLabel, { color: entryKicker(c.type, scheme) }]}
              >
                {c.label}
              </ThemedText>
              <ThemedText type="body" style={{ color: colors.inkMuted }}>
                {c.invite}
              </ThemedText>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    gap: tokens.space.xs,
    paddingTop: tokens.space.xs,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.md,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  legendLabel: {
    width: 64,
  },
  pressed: {
    opacity: 0.6,
  },
});
