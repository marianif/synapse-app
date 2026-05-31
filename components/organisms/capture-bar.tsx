import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

const WAVEFORM_BARS = 9;

interface CaptureBarProps {
  /** Open the capture flow (voice/modal). */
  onPress?: () => void;
  /** Long-press to arm voice capture directly. */
  onLongPress?: () => void;
  isRecording?: boolean;
  transcript?: string;
  onStop?: () => void;
  onCancel?: () => void;
}

/**
 * The Field's always-on capture bar. Pinned to the bottom of every screen so a
 * thought is one thumb-tap from being caught — the brief's replacement for the
 * banned FAB. Idle it invites; recording it shows a live waveform and the
 * streaming transcript, with stop / discard inline.
 */
export function CaptureBar({
  onPress,
  onLongPress,
  isRecording = false,
  transcript = "",
  onStop,
  onCancel,
}: CaptureBarProps): React.ReactElement {
  const { colors } = useTheme();

  if (isRecording) {
    return (
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.accent.clay },
          tokens.elevation.capture,
        ]}
      >
        <Pressable
          onPress={onCancel}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Discard recording"
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="close" size={22} color={colors.paper} />
        </Pressable>

        <View style={styles.center}>
          {transcript ? (
            <ThemedText
              type="item"
              numberOfLines={1}
              style={[styles.transcript, { color: colors.paper }]}
            >
              {transcript}
            </ThemedText>
          ) : (
            <Waveform tint={colors.paper} />
          )}
        </View>

        <Pressable
          onPress={onStop}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Save capture"
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="check" size={24} color={colors.paper} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel="Capture a thought"
      style={({ pressed }) => [
        styles.bar,
        { backgroundColor: colors.accent.clay },
        tokens.elevation.capture,
        pressed && { backgroundColor: colors.accent.clayPressed },
      ]}
    >
      <MaterialCommunityIcons name="plus" size={24} color={colors.paper} />
      <ThemedText type="item" style={[styles.prompt, { color: colors.paper }]}>
        Capture a thought
      </ThemedText>
      <MaterialCommunityIcons
        name="microphone"
        size={22}
        color={colors.paper}
      />
    </Pressable>
  );
}

function Waveform({ tint }: { tint: string }): React.ReactElement {
  return (
    <View style={styles.waveform}>
      {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
        <WaveformBar key={i} index={i} tint={tint} />
      ))}
    </View>
  );
}

function WaveformBar({
  index,
  tint,
}: {
  index: number;
  tint: string;
}): React.ReactElement {
  const h = useSharedValue(6);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      h.value = 14;
      return;
    }
    // deterministic per-bar phase (no Math.random in render path)
    const a = 10 + (index % 4) * 4;
    const b = 6 + (index % 3) * 3;
    h.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 300 + a * 12 }),
        withTiming(b, { duration: 220 + b * 10 }),
        withTiming(16, { duration: 260 }),
        withTiming(6, { duration: 200 }),
      ),
      -1,
      false,
    );
  }, [h, index, reduced]);

  const style = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <Animated.View
      style={[styles.waveformBar, { backgroundColor: tint }, style]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 56,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.pill,
  },
  prompt: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  transcript: {
    alignSelf: "stretch",
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    gap: 4,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
});
