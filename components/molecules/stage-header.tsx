import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens } from "@/constants/theme";

export function StageHeader({
  label,
  onBack,
  onDiscard,
  onCommit,
  ink,
  muted,
  accent,
}: {
  label: string;
  onBack: () => void;
  onDiscard: () => void;
  onCommit?: () => void;
  ink: string;
  muted: string;
  accent?: string;
}): React.ReactElement {
  return (
    <View style={styles.stageHeader}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.headerButton}
      >
        <IconSymbol name="ChevronLeft" size={18} color={muted} />
      </Pressable>
      <ThemedText type="label" style={[styles.stageLabel, { color: muted }]}>
        {label}
      </ThemedText>
      {onCommit ? (
        <Pressable
          onPress={onCommit}
          accessibilityRole="button"
          accessibilityLabel="Save"
          style={styles.headerButton}
        >
          <IconSymbol name="Check" size={18} color={accent ?? ink} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onDiscard}
          accessibilityRole="button"
          accessibilityLabel="Discard"
          style={styles.headerButton}
        >
          <IconSymbol name="X" size={16} color={muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stageHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  headerButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stageLabel: {
    flex: 1,
  },
});
