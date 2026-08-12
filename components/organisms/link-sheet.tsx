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
import { tokens, useTheme } from "@/constants/theme";

// Above this many targets, a search field earns its place; below it, the list
// is short enough to graze and a search box would just be chrome.
const SEARCH_THRESHOLD = 6;

export type LinkableKind = "idea" | "project";

export interface LinkableTarget {
  id: string;
  title: string;
  kind: LinkableKind;
  /** Notes already filed on this target. Shown as a trailing mono count. */
  noteCount?: number;
}

/** Back-compat alias — legacy call sites (capture-resolver, use-capture) still
 *  pass idea-only lists. New sites use `LinkableTarget`. */
export type LinkableIdea = {
  id: string;
  title: string;
  noteCount?: number;
};

/** The composite selection returned when the user picks a target. `null` = free
 *  note. Idea and project are mutually exclusive on a single note. */
export type LinkSelection =
  | { kind: "idea"; id: string }
  | { kind: "project"; id: string }
  | null;

interface LinkSheetProps {
  visible: boolean;
  /** Currently-linked target, or null (a free note). */
  selected: LinkSelection;
  targets: LinkableTarget[];
  /** Pick a target to link, or null to make the note free. */
  onSelect: (selection: LinkSelection) => void;
  onClose: () => void;
  /** Sheet header label. Defaults to "Relate this note". */
  title?: string;
}

/**
 * Bottom sheet for relating a note to a project or an idea — the notes tab's
 * organizing gesture. A note is either ON a target or FREE. The first row is
 * always "Free note" (clears any link); the rest are your projects and ideas,
 * sectioned so the writer can graze either register.
 */
export function LinkSheet({
  visible,
  selected,
  targets,
  onSelect,
  onClose,
  title = "RELATE THIS NOTE",
}: LinkSheetProps): React.ReactElement {
  const { colors } = useTheme();

  const [query, setQuery] = useState("");
  const showSearch = targets.length > SEARCH_THRESHOLD;
  const searching = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter((t) => t.title.toLowerCase().includes(q));
  }, [targets, query]);

  const projects = useMemo(
    () => filtered.filter((t) => t.kind === "project"),
    [filtered],
  );
  const ideas = useMemo(
    () => filtered.filter((t) => t.kind === "idea"),
    [filtered],
  );

  const isSelected = (t: LinkableTarget): boolean =>
    selected !== null && selected.kind === t.kind && selected.id === t.id;

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
              {title}
            </ThemedText>
          </View>

          {showSearch ? (
            <View style={styles.searchWrap}>
              <View
                style={[styles.search, { backgroundColor: colors.surface }]}
              >
                <IconSymbol name="Search" size={18} color={colors.inkMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search projects & ideas"
                  placeholderTextColor={colors.inkMuted}
                  selectionColor={colors.ink}
                  autoCorrect={false}
                  returnKeyType="search"
                  style={[styles.searchInput, { color: colors.ink }]}
                  accessibilityLabel="Search projects and ideas"
                />
                {searching ? (
                  <Pressable
                    onPress={() => setQuery("")}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
                    <IconSymbol name="X" size={16} color={colors.inkMuted} />
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
            {/* Free note — always first, hidden while searching. */}
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
                accessibilityLabel="Free note, not related to anything"
              >
                <View
                  style={[styles.freeDot, { borderColor: colors.inkMuted }]}
                />
                <ThemedText
                  style={[styles.rowLabel, { color: colors.ink }]}
                  numberOfLines={1}
                >
                  Free note
                </ThemedText>
                {selected === null ? (
                  <View
                    style={[
                      styles.activeDot,
                      { backgroundColor: colors.inkMuted },
                    ]}
                  />
                ) : null}
              </Pressable>
            ) : null}

            {targets.length === 0 ? (
              <View style={styles.emptyHint}>
                <ThemedText type="body" muted>
                  Nothing to link yet. Capture a project or an idea to relate
                  notes to it.
                </ThemedText>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyHint}>
                <ThemedText type="body" muted>
                  Nothing matches “{query.trim()}”.
                </ThemedText>
              </View>
            ) : (
              <>
                {projects.length > 0 ? (
                  <>
                    <ThemedText
                      type="label"
                      style={[styles.sectionLabel, { color: colors.inkMuted }]}
                    >
                      PROJECTS
                    </ThemedText>
                    {projects.map((it) => (
                      <TargetRow
                        key={`project:${it.id}`}
                        target={it}
                        active={isSelected(it)}
                        onPress={() => {
                          onSelect({ kind: "project", id: it.id });
                          close();
                        }}
                      />
                    ))}
                  </>
                ) : null}

                {ideas.length > 0 ? (
                  <>
                    <ThemedText
                      type="label"
                      style={[styles.sectionLabel, { color: colors.inkMuted }]}
                    >
                      IDEAS
                    </ThemedText>
                    {ideas.map((it) => (
                      <TargetRow
                        key={`idea:${it.id}`}
                        target={it}
                        active={isSelected(it)}
                        onPress={() => {
                          onSelect({ kind: "idea", id: it.id });
                          close();
                        }}
                      />
                    ))}
                  </>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TargetRow({
  target,
  active,
  onPress,
}: {
  target: LinkableTarget;
  active: boolean;
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { backgroundColor: colors.surface },
        active && { backgroundColor: colors.inkMuted + "24" },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Relate to ${target.kind}: ${target.title}`}
    >
      {target.kind === "idea" ? (
        <SketchIcon type="idea" size={22} />
      ) : (
        <IconSymbol name="Folder" size={22} color={colors.inkMuted} />
      )}
      <ThemedText
        style={[
          styles.rowLabel,
          { color: active ? colors.ink : colors.inkMuted },
        ]}
        numberOfLines={1}
      >
        {target.title}
      </ThemedText>
      {target.noteCount ? (
        <ThemedText type="mono" style={{ color: colors.inkMuted }}>
          {target.noteCount}
        </ThemedText>
      ) : null}
      {active ? (
        <View style={[styles.activeDot, { backgroundColor: colors.ink }]} />
      ) : null}
    </Pressable>
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
  sectionLabel: {
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.sm,
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
