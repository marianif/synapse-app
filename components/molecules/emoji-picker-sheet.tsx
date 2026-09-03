import { Modal, Pressable, StyleSheet } from "react-native";

import { EmojiPicker } from "@/components/molecules/emoji-picker";
import { tokens, useTheme } from "@/constants/theme";

/**
 * Emoji-only bottom sheet — the project identity glyph affordance.
 *
 * The tier-3 overflow sheet was cut down to just this: pick, clear, or cancel.
 * Selection and clear commit immediately and close the sheet, so choosing an
 * emoji is a single tap. Tap outside or the picker's Cancel dismisses without
 * changing anything.
 */
export function EmojiPickerSheet({
  visible,
  selected,
  onSelect,
  onClear,
  onClose,
}: {
  visible: boolean;
  /** Current project emoji — highlighted in the grid and gates the Clear action. */
  selected: string | null;
  onSelect: (next: string) => void;
  onClear: () => void;
  onClose: () => void;
}): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Inner pressable swallows the tap so taps inside the sheet body
            don't close it. The outer one handles backdrop-tap-to-dismiss. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={() => {}}
        >
          <EmojiPicker
            selected={selected}
            onSelect={(next) => {
              onSelect(next);
              onClose();
            }}
            onClear={() => {
              onClear();
              onClose();
            }}
            onCancel={onClose}
          />
        </Pressable>
      </Pressable>
    </Modal>
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
});