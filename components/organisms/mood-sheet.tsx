import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { MoodGlyph } from "@/components/atoms/mood-glyph";
import { tokens, useTheme } from "@/constants/theme";

import type { DiaryMood } from "@/lib/types";

export interface MoodOption {
  value: DiaryMood;
  label: string;
  /** Resolved electric code for the glyph + active fill. */
  color: string;
}

interface MoodSheetProps {
  visible: boolean;
  /** Currently-selected mood, or null. Picking it again clears the tag. */
  selected: DiaryMood | null;
  options: MoodOption[];
  onSelect: (mood: DiaryMood | null) => void;
  onClose: () => void;
}

/**
 * Bottom sheet for tagging a diary entry's mood. Replaces the inline chip row in
 * the composer — keeps the "what happened" line uncluttered, surfaces the moods
 * as a calm full-width list only when the writer reaches for it. Selecting the
 * active mood again clears it (mood is always optional).
 */
export function MoodSheet({
  visible,
  selected,
  options,
  onSelect,
  onClose,
}: MoodSheetProps): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.surfaceSubtle }]}>
          <View style={[styles.handle, { backgroundColor: colors.inkMuted }]} />

          <View style={styles.header}>
            <ThemedText type="label" style={{ color: colors.inkMuted }}>
              HOW DID IT FEEL
            </ThemedText>
          </View>

          <View style={styles.list}>
            {options.map((m) => {
              const active = selected === m.value;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => {
                    onSelect(active ? null : m.value);
                    onClose();
                  }}
                  style={[
                    styles.row,
                    { backgroundColor: colors.surface },
                    active && { backgroundColor: m.color + "24" },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Mood: ${m.label}`}
                >
                  <MoodGlyph mood={m.value} color={m.color} size={26} />
                  <ThemedText
                    style={[
                      styles.rowLabel,
                      { color: active ? colors.ink : colors.inkMuted },
                    ]}
                  >
                    {m.label}
                  </ThemedText>
                  {active ? (
                    <View
                      style={[styles.activeDot, { backgroundColor: m.color }]}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.color.scrim.strong,
  },
  sheet: {
    borderTopLeftRadius: tokens.radius.lg + 8,
    borderTopRightRadius: tokens.radius.lg + 8,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.md,
  },
  header: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.md,
  },
  list: {
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 52,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.md,
  },
  rowLabel: {
    fontFamily: tokens.type.fontHand.medium,
    fontSize: 22,
    lineHeight: 26,
    flex: 1,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
