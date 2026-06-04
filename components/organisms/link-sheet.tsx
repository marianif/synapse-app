import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useTheme } from "@/constants/theme";

export interface LinkableIdea {
  id: string;
  title: string;
}

interface LinkSheetProps {
  visible: boolean;
  /** Currently-linked idea id, or null (a free note). */
  selected: string | null;
  ideas: LinkableIdea[];
  /** Pick an idea to link, or null to make the note free. */
  onSelect: (entryId: string | null) => void;
  onClose: () => void;
}

/**
 * Bottom sheet for relating a diary note to an idea — the diary's organizing
 * gesture (it replaced mood). A note is either ON an idea or FREE. The first row
 * is always "Free note" (clears any link); the rest are your ideas, newest-first.
 * Reuses the MoodSheet shell + the amber idea identity so the diary and the
 * action-board read as one system.
 */
export function LinkSheet({
  visible,
  selected,
  ideas,
  onSelect,
  onClose,
}: LinkSheetProps): React.ReactElement {
  const { colors } = useTheme();
  const idea = colors.type.ideas;

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
              RELATE THIS NOTE
            </ThemedText>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {/* Free note — always first; clears the link. */}
            <Pressable
              onPress={() => {
                onSelect(null);
                onClose();
              }}
              style={[
                styles.row,
                { backgroundColor: colors.surface },
                selected === null && { backgroundColor: colors.inkMuted + "1F" },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === null }}
              accessibilityLabel="Free note, not related to any idea"
            >
              <View style={[styles.freeDot, { borderColor: colors.inkMuted }]} />
              <ThemedText
                style={[styles.rowLabel, { color: colors.ink }]}
                numberOfLines={1}
              >
                Free note
              </ThemedText>
              {selected === null ? (
                <View style={[styles.activeDot, { backgroundColor: colors.inkMuted }]} />
              ) : null}
            </Pressable>

            {ideas.length === 0 ? (
              <View style={styles.emptyHint}>
                <ThemedText type="body" muted>
                  No ideas yet. Capture one from the home screen to link notes to
                  it.
                </ThemedText>
              </View>
            ) : (
              ideas.map((it) => {
                const active = selected === it.id;
                return (
                  <Pressable
                    key={it.id}
                    onPress={() => {
                      onSelect(it.id);
                      onClose();
                    }}
                    style={[
                      styles.row,
                      { backgroundColor: colors.surface },
                      active && { backgroundColor: idea + "24" },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Relate to idea: ${it.title}`}
                  >
                    <SketchIcon type="idea" size={22} />
                    <ThemedText
                      style={[
                        styles.rowLabel,
                        { color: active ? colors.ink : colors.inkMuted },
                      ]}
                      numberOfLines={1}
                    >
                      {it.title}
                    </ThemedText>
                    {active ? (
                      <View style={[styles.activeDot, { backgroundColor: idea }]} />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
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
    maxHeight: "70%",
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
  scroll: {
    flexGrow: 0,
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
  freeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.6,
    borderStyle: "dashed",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyHint: {
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.md,
  },
});
