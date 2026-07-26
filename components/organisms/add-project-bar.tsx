import { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import Animated, {
  Easing,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

/**
 * The add-project bar — project creation, and ONLY project creation. It lives on
 * the Project Shelf (`app/projects.tsx`), raised by that screen's create FAB. It
 * is deliberately NOT part of the home capture dock: the home dock is for
 * catching thoughts (ideas / notes / todos / deadlines via the capture bar and
 * resolver), and a project is a macro life-area container, not a caught thought
 * or a board item. Naming a new life area is a slower, deliberate act that
 * belongs where projects live, so it stays here.
 *
 * It's a self-contained bar (own frame, entrance, and slab fill) because it
 * stands alone in the shelf's composer dock — there's no DockShell around it.
 * It rides the NEUTRAL action slab (`accent.clay`), never a type tint — a
 * project belongs to no entry type, and the slab is the surface that means
 * "interface, not content". A mono "NEW PROJECT" kicker is the channel label.
 */
interface AddProjectBarProps {
  /** Create a project from the typed name and (typically) navigate to it. */
  onCreateProject: (title: string) => void;
  /** The input blurred with nothing typed — close the bar. */
  onDismissEmpty: () => void;
  /** Measured height of the overlaid tab bar. The bar visually rests
   *  `tokens.space.lg` above the tab bar, but the keyboard lift is calculated
   *  from the screen bottom, so we need the bar's full height to compute the
   *  correct offset. Matches CaptureDock's restOffset math. */
  tabBarHeight: number;
}

export function AddProjectBar({
  onCreateProject,
  onDismissEmpty,
  tabBarHeight,
}: AddProjectBarProps): React.ReactElement {
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  // The bar lives inside the tab slot, so its visual bottom is only
  // `tokens.space.lg` above the tab bar. But the keyboard reports its height
  // from the screen bottom, below the tab bar. To lift the bar so it lands on
  // top of the keyboard (and not a full tab-bar-height above it), we subtract
  // the bar's full height plus the gap from the keyboard height. The 1.05
  // multiplier matches CaptureDock: it leaves a tiny gap above the keyboard
  // instead of sitting flush against it.
  const restOffset = tabBarHeight + tokens.space.lg;
  const keyboardLift = useSharedValue(0);
  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      const lift = Math.max(0, e.endCoordinates.height - restOffset);
      keyboardLift.value = withTiming(lift, {
        duration: e.duration || 220,
        easing: Easing.out(Easing.cubic),
      });
    });
    const hide = Keyboard.addListener(hideEvt, (e) => {
      keyboardLift.value = withTiming(0, {
        duration: e?.duration || 200,
        easing: Easing.out(Easing.cubic),
      });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [restOffset, keyboardLift]);

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardLift.value * 1.05 }],
  }));

  const [draft, setDraft] = useState("");
  const hasText = draft.trim().length > 0;

  const onSlab = colors.accent.onClay;

  const handleBlur = (): void => {
    if (!hasText) onDismissEmpty();
  };

  const submit = (): void => {
    if (!hasText) return;
    onCreateProject(draft.trim());
    setDraft("");
  };

  return (
    <Animated.View style={[styles.liftContainer, liftStyle]}>
      <Animated.View
        entering={
          reduced
            ? undefined
            : SlideInDown.duration(320).easing(Easing.out(Easing.cubic))
        }
        exiting={reduced ? undefined : FadeOut.duration(110)}
        style={[
          styles.bar,
          { backgroundColor: colors.accent.clay },
          tokens.elevation.capture,
        ]}
      >
        {/* The channel label — mono kicker reading what this line opens. */}
        <ThemedText type="label" style={[styles.kicker, { color: onSlab }]}>
          NEW PROJECT
        </ThemedText>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          onBlur={handleBlur}
          autoFocus
          placeholder="Name a life area"
          placeholderTextColor={withDimmed(onSlab)}
          selectionColor={onSlab}
          returnKeyType="done"
          submitBehavior="submit"
          accessibilityLabel="New project name"
          accessibilityHint="Type a project name and submit to create it."
          style={[styles.input, { color: onSlab }]}
        />

        {hasText ? (
          <Pressable
            onPress={submit}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Create project"
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: onSlab },
              pressed && styles.pressed,
            ]}
          >
            <IconSymbol name="ArrowUp" size={22} color={colors.accent.clay} />
          </Pressable>
        ) : (
          <Pressable
            onPress={onDismissEmpty}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <IconSymbol name="X" size={22} color={onSlab} />
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// The placeholder reads on the slab without competing with typed text: the
// same on-slab ink at reduced alpha (no new token — derived from onClay).
function withDimmed(hex: string): string {
  return `${hex}99`;
}

const styles = StyleSheet.create({
  liftContainer: {
    width: "100%",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderRadius: tokens.radius.pill,
    paddingLeft: tokens.space.lg,
    paddingRight: tokens.space.xs,
    gap: tokens.space.md,
    overflow: "hidden",
  },
  kicker: {
    // The channel label sits flush left as a fixed prefix, not a growing word.
    opacity: 0.9,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: tokens.type.item.size,
    fontFamily: tokens.type.fontInter.medium,
  },
  // The send key — the slab's inverse, an off-slab key. Tight 36pt visual, 44pt
  // via hitSlop.
  sendBtn: {
    width: 36,
    height: 36,
    marginRight: tokens.space.xs,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});
