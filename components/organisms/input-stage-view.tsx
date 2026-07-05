import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { tokens } from "@/constants/theme";

export function InputStage({
  draft,
  onDraftChange,
  onSubmit,
  onVoice,
  onBlur,
  autoFocus,
  ink,
  muted,
  slab,
  hasText,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onVoice: () => void;
  onBlur: () => void;
  autoFocus: boolean;
  ink: string;
  muted: string;
  slab: string;
  hasText: boolean;
}): React.ReactElement {
  return (
    <View style={styles.inputStage}>
      <View style={styles.inputSignal}>
        <MaterialCommunityIcons name="pen" size={16} color={muted} />
      </View>
      <TextInput
        value={draft}
        onChangeText={onDraftChange}
        onSubmitEditing={onSubmit}
        onBlur={onBlur}
        autoFocus={autoFocus}
        placeholder="Put something in"
        placeholderTextColor={muted}
        selectionColor={ink}
        returnKeyType="done"
        submitBehavior="submit"
        accessibilityLabel="Put something in"
        style={[styles.input, { color: ink }]}
      />
      {hasText ? (
        <Pressable
          onPress={onSubmit}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          style={({ pressed }) => [
            styles.primaryRound,
            { backgroundColor: ink },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons name="arrow-right" size={20} color={slab} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onVoice}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Capture by voice"
          style={({ pressed }) => [
            styles.secondaryRound,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons name="microphone" size={20} color={muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputStage: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: tokens.space.sm,
    paddingRight: tokens.space.xs,
    gap: tokens.space.xs,
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
  primaryRound: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryRound: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.62,
  },
});
