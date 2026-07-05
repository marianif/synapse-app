import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { tokens, useEntryTint, useTheme } from "@/constants/theme";

import type { DbDiaryEntry, DbEntry } from "@/lib/types";

/**
 * Pull-In — the project's intake sheet for loose thinking.
 *
 * Two horizontal strips: IDEAS (unfiled open ideas, amber chips) and NOTES
 * (free diary notes, neutral chips). Tap a chip → attach to this project.
 *
 * Why these two and not todos/deadlines: todos and deadlines, once they
 * exist, were either captured into a project or live unfiled as standalone
 * commitments. Retro-attaching a todo to a project is a re-categorization
 * verb, not a thinking-recovery one. Ideas and notes are the brain's loose
 * material — pulling them into a project is the meaningful verb.
 *
 * The sheet stays open after each pull so the user can chain — they're
 * often catching up on a project's worth of loose thinking at once. The
 * chip vanishes from the sheet as soon as the parent's state updates.
 * Bottom DONE slab closes; tap outside the sheet body also closes.
 */
export function ProjectPullInSheet({
  visible,
  onClose,
  unfiledIdeas,
  unfiledNotes,
  onAttachIdea,
  onAttachNote,
}: {
  visible: boolean;
  onClose: () => void;
  /** Open ideas with no project_id. Parent filters; sheet just renders. */
  unfiledIdeas: DbEntry[];
  /** Diary notes with no link target at all. Parent filters; sheet renders. */
  unfiledNotes: DbDiaryEntry[];
  /** Commit one idea → this project. Sheet does NOT close. */
  onAttachIdea: (entry: DbEntry) => void;
  /** Commit one note → this project. Sheet does NOT close. */
  onAttachNote: (note: DbDiaryEntry) => void;
}): React.ReactElement {
  const { colors } = useTheme();
  const ideaTint = useEntryTint("idea");

  // If both strips empty, render an instructive empty state instead of two
  // ghost rails. (The parent already hides the "+ pull in" button when both
  // counts are zero, so reaching here means counts dropped during chaining.)
  const isEmpty = unfiledIdeas.length === 0 && unfiledNotes.length === 0;

  // Capacities trimmed to the chips that fit comfortably; the strip scrolls
  // horizontally so we don't need to clip the data, but ordering matters:
  // newest first (these are by created_at desc out of the DB).
  const ideas = useMemo(() => unfiledIdeas, [unfiledIdeas]);
  const notes = useMemo(() => unfiledNotes, [unfiledNotes]);

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
          <View style={styles.headerRow}>
            <ThemedText
              type="label"
              style={[styles.title, { color: colors.inkMuted }]}
            >
              PULL IN
            </ThemedText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close pull-in"
              style={styles.closeBtn}
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={colors.inkMuted}
              />
            </Pressable>
          </View>

          {isEmpty ? (
            <ThemedText
              type="hand"
              style={[styles.emptyHint, { color: colors.inkMuted }]}
            >
              Nothing loose right now.
            </ThemedText>
          ) : (
            <>
              {ideas.length > 0 ? (
                <View style={styles.strip}>
                  <ThemedText
                    type="micro"
                    style={[styles.stripKicker, { color: colors.inkMuted }]}
                  >
                    {`IDEAS · ${ideas.length}`}
                  </ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {ideas.map((idea) => (
                      <Pressable
                        key={idea.id}
                        onPress={() => onAttachIdea(idea)}
                        accessibilityRole="button"
                        accessibilityLabel={`Pull in idea: ${idea.title}`}
                        style={({ pressed }) => [
                          styles.chip,
                          { backgroundColor: ideaTint },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.chipDot}>
                          <EntryDot type="idea" size={6} />
                        </View>
                        <ThemedText
                          type="body"
                          numberOfLines={2}
                          style={[styles.chipText, { color: colors.ink }]}
                        >
                          {idea.title}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {notes.length > 0 ? (
                <View style={styles.strip}>
                  <ThemedText
                    type="micro"
                    style={[styles.stripKicker, { color: colors.inkMuted }]}
                  >
                    {`NOTES · ${notes.length}`}
                  </ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {notes.map((note) => (
                      <Pressable
                        key={note.id}
                        onPress={() => onAttachNote(note)}
                        accessibilityRole="button"
                        accessibilityLabel={`Pull in note: ${note.body.slice(0, 40)}`}
                        style={({ pressed }) => [
                          styles.chip,
                          { backgroundColor: colors.surfaceSubtle },
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText
                          type="body"
                          numberOfLines={2}
                          style={[styles.chipText, { color: colors.ink }]}
                        >
                          {note.body}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </>
          )}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.doneSlab,
              { backgroundColor: colors.accent.clay },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Done pulling in"
          >
            <ThemedText
              type="bodyBold"
              style={{ color: colors.accent.onClay }}
            >
              Done
            </ThemedText>
          </Pressable>
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
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.lg,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
    paddingHorizontal: tokens.space.md,
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyHint: {
    textAlign: "center",
    paddingVertical: tokens.space.xl,
    fontSize: 18,
    lineHeight: 24,
  },

  // Strip — kicker + horizontal scroll row of chips.
  strip: {
    gap: tokens.space.sm,
  },
  stripKicker: {
    letterSpacing: tokens.type.micro.tracking,
    paddingHorizontal: tokens.space.md,
  },
  chipRow: {
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
  },
  // Idea chips get a leading dot (the brand's type signal); notes are neutral
  // — diary is non-actionable, so no type code, just a tonally recessed surface.
  chip: {
    width: 200,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: tokens.radius.md,
    overflow: "hidden",
  },
  chipDot: {
    paddingLeft: tokens.space.md,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    flex: 1,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },

  doneSlab: {
    minHeight: 48,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: tokens.space.xs,
  },

  pressed: { opacity: 0.7 },
});
