import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

const SWITCH_TRACK_W = 46;
const SWITCH_TRACK_H = 28;
const SWITCH_PAD = 3;
const SWITCH_THUMB = SWITCH_TRACK_H - SWITCH_PAD * 2;
const SWITCH_TRAVEL = SWITCH_TRACK_W - SWITCH_THUMB - SWITCH_PAD * 2;

export interface SettingsRowProps {
  label: string;
  /** Optional second line under the label. */
  description?: string;
  /** Mono readout on the trailing edge, left of the chevron. */
  value?: string;
  /**
   * When set, the row is tappable and shows a trailing chevron. Omit it for a
   * read-only row (e.g. the version number) — then no chevron is rendered and
   * the row is not a press target.
   */
  onPress?: () => void;
  accessibilityHint?: string;
}

/**
 * Settings navigation row: label (and optional description) on the left, an
 * optional mono value + chevron on the right. Pressing pushes the subroute.
 * Trailing value uses the mono signal layer — the instrument-panel readout.
 */
export function SettingsRow({
  label,
  description,
  value,
  onPress,
  accessibilityHint,
}: SettingsRowProps): React.ReactElement {
  const { colors } = useTheme();

  const body = (
    <>
      <View style={styles.copy}>
        <ThemedText type="item" style={{ color: colors.ink }}>
          {label}
        </ThemedText>
        {description ? (
          <ThemedText type="caption" muted style={styles.description}>
            {description}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.trailing}>
        {value ? (
          <ThemedText type="mono" muted>
            {value}
          </ThemedText>
        ) : null}
        {onPress ? (
          <IconSymbol name="ChevronRight" size={18} color={colors.inkMuted} />
        ) : null}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.row, { backgroundColor: colors.surface }]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {body}
    </Pressable>
  );
}

export interface SettingsSwitchRowProps {
  label: string;
  /** Optional second line under the label. */
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityHint?: string;
}

/**
 * Settings toggle row. The whole row is the 48pt+ target and carries the
 * switch semantics, so the visual switch is decorative (`pointerEvents` none)
 * and never a smaller-than-minimum tap target on its own.
 */
export function SettingsSwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  accessibilityHint,
}: SettingsSwitchRowProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.copy}>
        <ThemedText type="item" style={{ color: colors.ink }}>
          {label}
        </ThemedText>
        {description ? (
          <ThemedText type="caption" muted style={styles.description}>
            {description}
          </ThemedText>
        ) : null}
      </View>

      <View pointerEvents="none">
        <SettingsSwitch value={value} />
      </View>
    </Pressable>
  );
}

function SettingsSwitch({ value }: { value: boolean }): React.ReactElement {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pos = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    const next = value ? 1 : 0;
    pos.value = reduced
      ? next
      : withTiming(next, {
          duration: tokens.motion.duration.fast,
          easing: Easing.bezier(...tokens.motion.bezier),
        });
  }, [value, pos, reduced]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.value * SWITCH_TRAVEL }],
  }));

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: value ? colors.accent.clay : colors.surfaceSubtle,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: value ? colors.accent.onClay : colors.inkMuted,
          },
          thumbStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  description: {
    lineHeight: 16,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    flexShrink: 0,
  },
  track: {
    width: SWITCH_TRACK_W,
    height: SWITCH_TRACK_H,
    borderRadius: tokens.radius.pill,
    padding: SWITCH_PAD,
  },
  thumb: {
    width: SWITCH_THUMB,
    height: SWITCH_THUMB,
    borderRadius: tokens.radius.pill,
  },
});
