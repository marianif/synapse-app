import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useHabitTone, useTheme } from "@/constants/theme";
import { HUE_STOPS } from "@/lib/habit-color";

interface HabitColorWheelProps {
  hue: number | null;
  onChange: (hue: number) => void;
  onClear: () => void;
  /** Renders the glyph inside the preview, receiving ink that reads on it. */
  renderCenter?: (ink: string) => React.ReactNode;
}

/**
 * Web fallback for the hue wheel: the same contract (hue in, live preview
 * showing the actual pick, neutral reset), rendered as a tappable spectrum bar
 * so the web bundle never imports Skia / CanvasKit. Native uses the Skia wheel.
 */
export function HabitColorWheel({
  hue,
  onChange,
  onClear,
  renderCenter,
}: HabitColorWheelProps): React.ReactElement {
  const { colors } = useTheme();
  const tone = useHabitTone(hue);

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.preview,
          { backgroundColor: tone?.mark ?? colors.surfaceSubtle },
        ]}
      >
        {renderCenter?.(tone?.onMark ?? colors.inkMuted)}
      </View>

      <View style={styles.spectrum}>
        {HUE_STOPS.map((stop, index) => {
          const stopHue = (index * 360) / (HUE_STOPS.length - 1);
          const selected = hue !== null && Math.abs(hue - stopHue) < 8;
          return (
            <Pressable
              key={stop}
              onPress={() => onChange(stopHue)}
              accessibilityRole="button"
              accessibilityLabel={`Hue ${Math.round(stopHue)}`}
              accessibilityState={{ selected }}
              style={[
                styles.segment,
                { backgroundColor: stop },
                selected && { borderColor: colors.ink, borderWidth: 2 },
              ]}
            />
          );
        })}
      </View>

      <Pressable
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel="Neutral habit color"
        accessibilityState={{ selected: hue === null }}
        style={({ pressed }) => [
          styles.neutralChip,
          {
            backgroundColor:
              hue === null ? `${colors.inkMuted}22` : colors.surfaceSubtle,
          },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.neutralDot, { backgroundColor: colors.inkMuted }]} />
        <ThemedText type="caption" muted={hue !== null}>
          Neutral
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: tokens.space.md,
  },
  preview: {
    width: 92,
    height: 92,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  spectrum: {
    flexDirection: "row",
    width: "100%",
    height: 34,
    borderRadius: tokens.radius.pill,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    height: "100%",
  },
  neutralChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 32,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.pill,
  },
  neutralDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
