import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useEntryKicker, useTheme } from "@/constants/theme";

// Above this many ideas, a search field earns its place; below it, the list is
// short enough to graze and a search box would just be chrome.
const SEARCH_THRESHOLD = 6;

export interface LinkableIdea {
  id: string;
  title: string;
  /** Diary notes already filed on this idea. Shown as a trailing mono count. */
  noteCount?: number;
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
  const idea = useEntryKicker("idea");

  const [query, setQuery] = useState("");
  const showSearch = ideas.length > SEARCH_THRESHOLD;
  const searching = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ideas;
    return ideas.filter((i) => i.title.toLowerCase().includes(q));
  }, [ideas, query]);

  // Leave the sheet clean for its next open — drop any half-typed search.
  const close = (): void => {
    setQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={close} />

        <View style={[styles.sheet, { backgroundColor: colors.surfaceSubtle }]}>
          <View style={[styles.handle, { backgroundColor: colors.inkMuted }]} />

          <View style={styles.header}>
            <ThemedText type="label" style={{ color: colors.inkMuted }}>
              RELATE THIS NOTE
            </ThemedText>
          </View>

          {showSearch ? (
            <View style={styles.searchWrap}>
              <View
                style={[styles.search, { backgroundColor: colors.surface }]}
              >
                <IconSymbol name="magnify" size={18} color={colors.inkMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search ideas"
                  placeholderTextColor={colors.inkMuted}
                  selectionColor={idea}
                  autoCorrect={false}
                  returnKeyType="search"
                  style={[styles.searchInput, { color: colors.ink }]}
                  accessibilityLabel="Search ideas"
                />
                {searching ? (
                  <Pressable
                    onPress={() => setQuery("")}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
                    <IconSymbol name="close" size={16} color={colors.inkMuted} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Free note — always first; clears the link. Hidden while searching,
                since a query is clearly a hunt for a specific idea. */}
            {!searching ? (
              <Pressable
                onPress={() => {
                  onSelect(null);
                  close();
                }}
                style={[
                  styles.row,
                  { backgroundColor: colors.surface },
                  selected === null && {
                    backgroundColor: colors.inkMuted + "1F",
                  },
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
                  <View
                    style={[styles.activeDot, { backgroundColor: colors.inkMuted }]}
                  />
                ) : null}
              </Pressable>
            ) : null}

            {ideas.length === 0 ? (
              <View style={styles.emptyHint}>
                <ThemedText type="body" muted>
                  No ideas yet. Capture one from the home screen to link notes to
                  it.
                </ThemedText>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyHint}>
                <ThemedText type="body" muted>
                  No ideas match “{query.trim()}”.
                </ThemedText>
              </View>
            ) : (
              filtered.map((it) => {
                const active = selected === it.id;
                return (
                  <Pressable
                    key={it.id}
                    onPress={() => {
                      onSelect(it.id);
                      close();
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
                    {it.noteCount ? (
                      <ThemedText
                        type="mono"
                        style={{ color: colors.inkMuted }}
                      >
                        {it.noteCount}
                      </ThemedText>
                    ) : null}
                    {active ? (
                      <View style={[styles.activeDot, { backgroundColor: idea }]} />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  searchWrap: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.md,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 44,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: tokens.type.item.size,
    fontFamily: tokens.type.fontInter.regular,
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
