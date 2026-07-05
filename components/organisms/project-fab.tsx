import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import type { Scheme, ThemeColors } from "@/constants/theme";
import { entryKicker, entryTint, tokens, useTheme } from "@/constants/theme";

// ─── Types ───────────────────────────────────────────────────────────────────────

interface FabAction {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bgColor: string;
}

interface ProjectFabProps {
  onAction?: (key: string) => void;
  defaultOpen?: boolean;
}

// ─── Default actions per project screen ──────────────────────────────────────────

function getActions(colors: ThemeColors, scheme: Scheme): FabAction[] {
  // Scheme-aware pairing: entryTint for the pill fill, entryKicker for the icon
  // color — the electric type codes only clear AA on the dark tile tints, so on
  // light paper we render the darkened kicker + soft light tint instead.
  return [
    {
      key: "idea",
      label: "Idea",
      icon: "lightbulb-outline",
      color: entryKicker("idea", scheme),
      bgColor: entryTint("idea", scheme),
    },
    {
      key: "todo",
      label: "Todo",
      icon: "check-circle-outline",
      color: entryKicker("todo", scheme),
      bgColor: entryTint("todo", scheme),
    },
    {
      key: "deadline",
      label: "Deadline",
      icon: "clock-outline",
      color: entryKicker("deadline", scheme),
      bgColor: entryTint("deadline", scheme),
    },
    {
      key: "note",
      label: "Note",
      icon: "pencil-outline",
      color: colors.inkMuted,
      bgColor: colors.surface,
    },
  ];
}

// ─── Constants ────────────────────────────────────────────────────────────────────

const PILL_HEIGHT = 44;
const STAGGER_SHIFT = 0.15;
const STAGGER_MULTIPLIER = 1.6;

// ─── Component ────────────────────────────────────────────────────────────────────

export function ProjectFab({
  onAction,
  defaultOpen = false,
}: ProjectFabProps): React.ReactElement {
  const { colors, scheme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = useSharedValue(defaultOpen ? 1 : 0);

  const actions = getActions(colors, scheme);

  const close = useCallback((): void => {
    setOpen(false);
    isOpen.value = withTiming(0, { duration: tokens.motion.duration.base });
  }, [isOpen]);

  const handleToggle = useCallback((): void => {
    const next = !open;
    setOpen(next);
    isOpen.value = withTiming(next ? 1 : 0, {
      duration: tokens.motion.duration.base,
    });
  }, [open, isOpen]);

  const handleAction = useCallback(
    (key: string): void => {
      onAction?.(key);
      close();
    },
    [onAction, close],
  );

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${isOpen.value * 45}deg` }],
  }));

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {open ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />
      ) : null}

      <View style={styles.actionsContainer}>
        {actions.map((action, index) => (
          <ActionPill
            key={action.key}
            action={action}
            index={index}
            isOpen={isOpen}
            onPress={() => handleAction(action.key)}
          />
        ))}
      </View>

      <Animated.View style={[styles.fabShadow, btnStyle]}>
        <Pressable
          onPress={handleToggle}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.accent.clay },
            pressed && styles.fabPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={open ? "Close actions" : "Add to project"}
        >
          <View
            style={[styles.glow, { backgroundColor: colors.accent.clay }]}
          />
          <MaterialCommunityIcons
            name="plus"
            size={28}
            color={colors.accent.onClay}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Action Pill ──────────────────────────────────────────────────────────────────

function ActionPill({
  action,
  index,
  isOpen,
  onPress,
}: {
  action: FabAction;
  index: number;
  isOpen: SharedValue<number>;
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();

  const animStyle = useAnimatedStyle(() => {
    const p = isOpen.value;
    const itemProgress = Math.max(
      0,
      Math.min(1, p * STAGGER_MULTIPLIER - index * STAGGER_SHIFT),
    );
    return {
      opacity: itemProgress,
      transform: [
        { translateY: (1 - itemProgress) * 24 },
        { scale: 0.8 + itemProgress * 0.2 },
      ],
    };
  });

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: action.bgColor },
          pressed && styles.pillPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={action.label}
      >
        <MaterialCommunityIcons
          name={action.icon}
          size={20}
          color={action.color}
        />
        <ThemedText
          type="body"
          style={[styles.pillLabel, { color: colors.ink }]}
        >
          {action.label}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 28,
    right: 20,
    alignItems: "flex-end",
    gap: tokens.space.md,
  },
  actionsContainer: {
    gap: tokens.space.sm,
    paddingBottom: tokens.space.sm,
  },
  fabShadow: {
    ...tokens.elevation.capture,
  },
  glow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: tokens.radius.pill,
    ...tokens.elevation.flat,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    height: PILL_HEIGHT,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.pill,
    ...tokens.elevation.flat,
  },
  pillPressed: {
    opacity: 0.8,
  },
  pillLabel: {
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
  },
});
