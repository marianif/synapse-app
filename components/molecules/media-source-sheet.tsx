import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

interface MediaSourceSheetProps {
  visible: boolean;
  /** Launch the photo-library picker. */
  onPickLibrary: () => void;
  /** Launch the camera capture. */
  onPickCamera: () => void;
  onClose: () => void;
}

/**
 * The photo source chooser for the MediaStrip's add key — a bottom sheet with
 * Photo library / Camera / Cancel, replacing the old inline source row so the
 * strip stays a single clean line of thumbs. Presentational only: the caller
 * owns the picker launches and the file import.
 */
export function MediaSourceSheet({
  visible,
  onPickLibrary,
  onPickCamera,
  onClose,
}: MediaSourceSheetProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={() => {}}
        >
          <ThemedText
            type="label"
            style={[styles.title, { color: colors.inkMuted }]}
          >
            ADD PHOTO
          </ThemedText>

          <Row
            icon="Gallery"
            label="Photo library"
            color={colors.ink}
            onPress={() => {
              onPickLibrary();
              onClose();
            }}
          />
          <Divider colors={colors} />
          <Row
            icon="Camera"
            label="Camera"
            color={colors.ink}
            onPress={() => {
              onPickCamera();
              onClose();
            }}
          />
          <Divider colors={colors} />
          <Row
            icon="X"
            label="Cancel"
            color={colors.inkMuted}
            onPress={onClose}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  label: string;
  color: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <IconSymbol name={icon} size={20} color={color} />
      <ThemedText type="body" style={[styles.rowLabel, { color }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Divider({
  colors,
}: {
  colors: ReturnType<typeof useTheme>["colors"];
}): React.ReactElement {
  return (
    <View style={[styles.divider, { backgroundColor: colors.surfaceSubtle }]} />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: tokens.color.scrim.strong,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl,
  },
  title: {
    letterSpacing: 0.6,
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    paddingVertical: tokens.space.lg,
    paddingHorizontal: tokens.space.xl,
    minHeight: 48,
  },
  rowLabel: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: tokens.space.lg,
  },
  pressed: { opacity: 0.7 },
});