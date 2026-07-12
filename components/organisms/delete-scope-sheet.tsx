import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import type { ThemeColors } from "@/constants/theme";
import { tokens } from "@/constants/theme";

interface DeleteScopeSheetProps {
  visible: boolean;
  onClose: () => void;
  onDeleteThis: () => void;
  onDeleteFuture: () => void;
  onDeleteAll: () => void;
  colors: ThemeColors;
}

export function DeleteScopeSheet({
  visible,
  onClose,
  onDeleteThis,
  onDeleteFuture,
  onDeleteAll,
  colors,
}: DeleteScopeSheetProps): React.ReactElement {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <ThemedText
            type="label"
            style={[styles.sheetTitle, { color: colors.inkMuted }]}
          >
            DELETE RECURRING ENTRY
          </ThemedText>
          <Pressable
            onPress={onDeleteThis}
            style={({ pressed }) => [
              styles.sheetOption,
              pressed && { backgroundColor: colors.surfaceSubtle },
            ]}
          >
            <ThemedText type="body">Delete this occurrence</ThemedText>
          </Pressable>
          <Pressable
            onPress={onDeleteFuture}
            style={({ pressed }) => [
              styles.sheetOption,
              { backgroundColor: colors.surfaceSubtle },
              pressed && { backgroundColor: colors.paper },
            ]}
          >
            <ThemedText type="body">Delete this and all future</ThemedText>
          </Pressable>
          <Pressable
            onPress={onDeleteAll}
            style={({ pressed }) => [
              styles.sheetOption,
              pressed && { backgroundColor: colors.surfaceSubtle },
            ]}
          >
            <ThemedText type="body" style={{ color: tokens.feedback.danger }}>
              Delete entire series
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.sheetOption,
              { backgroundColor: colors.surfaceSubtle },
              pressed && { backgroundColor: colors.paper },
            ]}
          >
            <ThemedText type="bodyBold" muted>
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: tokens.color.scrim.strong,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: tokens.radius.sm,
    borderTopRightRadius: tokens.radius.sm,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl,
  },
  sheetTitle: {
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.md,
    letterSpacing: 0.6,
  },
  sheetOption: {
    paddingVertical: tokens.space.lg,
    paddingHorizontal: tokens.space.xl,
  },
});
