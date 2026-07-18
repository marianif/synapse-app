import { forwardRef, useImperativeHandle, useRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens } from "@/constants/theme";

export interface InputStageHandle {
  focus: () => void;
}

export const InputStage = forwardRef<
  InputStageHandle,
  {
    draft: string;
    onDraftChange: (value: string) => void;
    onSubmit: () => void;
    onVoice: () => void;
    onBlur: () => void;
    ink: string;
    muted: string;
    slab: string;
    hasText: boolean;
  }
>(function InputStage(
  { draft, onDraftChange, onSubmit, onVoice, onBlur, ink, muted, slab, hasText },
  ref,
): React.ReactElement {
  const inputRef = useRef<TextInput | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  return (
    <View style={styles.inputStage}>
      {/* Left slab: the text line you fill. It stays transparent so the
          DockShell's clay surface shows through. */}
      <View style={styles.textSlab}>
        <View style={styles.inputSignal}>
          <IconSymbol name="Pen" size={16} color={muted} />
        </View>
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={onDraftChange}
          onSubmitEditing={onSubmit}
          onBlur={onBlur}
          placeholder="Put something in"
          placeholderTextColor={muted}
          selectionColor={ink}
          returnKeyType="done"
          submitBehavior="submit"
          accessibilityLabel="Put something in"
          style={[styles.input, { color: ink }]}
        />
      </View>

      {/* Right slab: the primary action. Empty = voice (a distinct tonal slab
          so recording is no longer a trailing icon). With text = send. */}
      {hasText ? (
        <Pressable
          onPress={onSubmit}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          style={({ pressed }) => [
            styles.actionSlab,
            styles.inverseSlab,
            { backgroundColor: ink },
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol name="ArrowRight" size={20} color={slab} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onVoice}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Capture by voice"
          style={({ pressed }) => [
            styles.actionSlab,
            { backgroundColor: ink + "22" },
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol name="Microphone" size={20} color={ink} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  inputStage: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    padding: tokens.space.xs,
    gap: tokens.space.sm,
  },
  textSlab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 48,
    paddingLeft: tokens.space.sm,
  },
  inputSignal: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
    fontFamily: tokens.type.fontInter.medium,
  },
  // Shared action slab — 40pt visual, pill radius, 44pt touch target via hitSlop.
  // Voice uses a tonal ink tint so it reads as its own slab; send uses the inverse.
  actionSlab: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  inverseSlab: {
    // backgroundColor applied at call-site.
  },
  pressed: {
    opacity: 0.62,
  },
});
