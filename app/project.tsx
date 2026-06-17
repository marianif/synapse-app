import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { ConfirmSheet } from "@/components/molecules/confirm-sheet";
import { DirectRow } from "@/components/molecules/direct-row";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { tokens, useTheme } from "@/constants/theme";
import { useConfirm } from "@/hooks/use-confirm";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { doneStatus } from "@/lib/direct-when";
import { ConfirmKey } from "@/lib/settings";
import { isTodoFamily } from "@/lib/taxonomy";
import type { DbEntry, EntryType } from "@/lib/types";

/** A small curated grid of starter emoji — fast pick, then the "another" tap
 *  opens the system emoji keyboard for anything off-shelf. */
const EMOJI_QUICK = ["🧠", "🎨", "🎭", "🪩", "🛠️", "🌿", "📚", "💼", "🎬", "🧪", "🪐", "✨"];

const isDone = (e: DbEntry): boolean =>
  e.status === "completed" || e.status === "met";

/**
 * A project opened up. A destination *and* a triage zone: the spine of open
 * lines reads at a glance, swipe-actions on each line let the user mark done
 * or delete in-place (same gesture as the home board — a project is the home
 * board narrowed to one life area, so the gestures must match), and the
 * project's memory (ideas it carries, notes written about it, the idea it
 * grew out of) sits around it as recall.
 *
 * Identity: the emoji glyph the user picks for this project is the visual
 * anchor — surfaces here as a hero, and on every home row that references it.
 * Until picked, a quiet "pick one" affordance sits in its place.
 *
 * Volume hierarchy, loudest to quietest:
 *   1. Emoji hero + open-count gauge — visual identity and instrument readout.
 *   2. Provenance — handwritten line saying where this project came from.
 *   3. ON THE LINE — DirectRow spine, swipe to mark done / delete.
 *   4. IDEAS — a wrapped pin-row of recalled thinking.
 *   5. NOTES — the margin column, Caveat, no card chrome.
 *   6. Archive / Delete — kicker-weight footer.
 */
export default function ProjectScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const {
    projects,
    entries,
    updateEntryStatus,
    deleteEntry,
    updateProject,
    deleteProject,
  } = useDatabase();
  const { entries: diaryEntries } = useDiary();

  const project = projects.find((p) => p.id === id);

  const deleteConfirm = useConfirm({ confirmKey: ConfirmKey.deleteProject });

  // Inline emoji picker — tapping the hero opens this row of quick picks.
  // Picking commits immediately; tapping "more" focuses a hidden TextInput so
  // the system emoji keyboard takes over for anything off-shelf.
  const [pickerOpen, setPickerOpen] = useState(false);
  const emojiInputRef = useRef<TextInput>(null);

  const requestDelete = (): void => {
    if (!project) return;
    deleteConfirm.request(() => {
      deleteProject(project.id)
        .then(() => router.back())
        .catch((err) => console.error("Failed to delete project:", err));
    });
  };

  const { open, ideas, origin, notes } = useMemo(() => {
    const filed = entries.filter((e) => e.project_id === id);
    return {
      open: filed.filter((e) => isTodoFamily(e.type) && !isDone(e)),
      ideas: filed.filter((e) => e.type === "idea" && !isDone(e)),
      origin: entries.find(
        (e) => e.type === "idea" && e.promoted_project_id === id,
      ),
      notes: diaryEntries.filter((n) => n.linked_project_id === id),
    };
  }, [entries, diaryEntries, id]);

  // DirectRow done/delete handlers — same shape as the home board, so a line
  // triaged here behaves exactly like the same line on the board.
  const handleMarkDone = (entry: DbEntry): void => {
    void updateEntryStatus(
      entry.id,
      doneStatus(entry.type as EntryType),
    ).catch((err) => console.error("Failed to mark entry done:", err));
  };
  const handleDeleteEntry = (entry: DbEntry): void => {
    void deleteEntry(entry.id).catch((err) =>
      console.error("Failed to delete entry:", err),
    );
  };

  const pickEmoji = (next: string | null): void => {
    if (!project) return;
    setPickerOpen(false);
    void updateProject(project.id, { emoji: next }).catch((err) =>
      console.error("Failed to update project emoji:", err),
    );
  };

  if (!project) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.paper }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            header: () => (
              <ScreenHeader title="Project" onBack={() => router.back()} inset />
            ),
          }}
        />
        <ThemedText
          type="hand"
          style={[styles.empty, { color: colors.inkMuted }]}
        >
          This project is gone.
        </ThemedText>
      </View>
    );
  }

  const archived = project.status === "archived";

  // Archived projects: a hairline tonal wash on the paper, never a banner.
  // The kicker on the header says "ARCHIVED PROJECT"; the surface whispers it.
  const screenBg = archived ? colors.surfaceSubtle : colors.paper;

  return (
    <View style={[styles.screen, { backgroundColor: screenBg }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <ScreenHeader
              title={project.title}
              kicker={archived ? "ARCHIVED PROJECT" : "PROJECT"}
              glyph={
                project.emoji ? (
                  <ThemedText type="title" style={styles.headerGlyph}>
                    {project.emoji}
                  </ThemedText>
                ) : undefined
              }
              onBack={() => router.back()}
              inset
            />
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO — emoji identity + open-count gauge.
            Tapping the emoji opens an inline quick-pick row; a quiet "+"
            slot stands in until one is chosen. The big mono number to the
            right is the instrument-panel readout: what's pressing in here. */}
        <View style={styles.hero}>
          <Pressable
            onPress={() => setPickerOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              project.emoji
                ? `Change project emoji, currently ${project.emoji}`
                : "Pick an emoji for this project"
            }
            style={({ pressed }) => [
              styles.heroGlyphSlot,
              { backgroundColor: colors.surface },
              pressed && styles.pressed,
            ]}
          >
            {project.emoji ? (
              <ThemedText style={styles.heroEmoji}>{project.emoji}</ThemedText>
            ) : (
              <ThemedText
                type="title"
                style={{ color: colors.inkMuted }}
              >
                +
              </ThemedText>
            )}
          </Pressable>

          <View style={styles.heroGauge}>
            <ThemedText type="display" style={{ color: colors.ink }}>
              {open.length}
            </ThemedText>
            <ThemedText
              type="micro"
              style={[styles.gaugeLabel, { color: colors.inkMuted }]}
            >
              ON THE LINE
            </ThemedText>
          </View>
        </View>

        {/* Inline emoji picker — only mounts when the hero is tapped. A wrap
            of quick options, a "more" tile that hands off to the system
            emoji keyboard, and a clear chip when one is already set. */}
        {pickerOpen ? (
          <View style={styles.pickerRow}>
            {EMOJI_QUICK.map((e) => (
              <Pressable
                key={e}
                onPress={() => pickEmoji(e)}
                accessibilityRole="button"
                accessibilityLabel={`Set project emoji to ${e}`}
                style={({ pressed }) => [
                  styles.pickerTile,
                  { backgroundColor: colors.surface },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.pickerEmoji}>{e}</ThemedText>
              </Pressable>
            ))}
            <Pressable
              onPress={() => emojiInputRef.current?.focus()}
              accessibilityRole="button"
              accessibilityLabel="Pick a different emoji from the keyboard"
              style={({ pressed }) => [
                styles.pickerTile,
                { backgroundColor: colors.surface },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                MORE
              </ThemedText>
            </Pressable>
            {project.emoji ? (
              <Pressable
                onPress={() => pickEmoji(null)}
                accessibilityRole="button"
                accessibilityLabel="Clear project emoji"
                style={({ pressed }) => [
                  styles.pickerTile,
                  { backgroundColor: colors.surface },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                  CLEAR
                </ThemedText>
              </Pressable>
            ) : null}

            {/* Off-screen capture: focus this and the system keyboard opens;
                first emoji entered commits and dismisses the keyboard. */}
            <TextInput
              ref={emojiInputRef}
              value=""
              onChangeText={(t) => {
                const trimmed = t.trim();
                if (!trimmed) return;
                pickEmoji(Array.from(trimmed)[0] ?? null);
                emojiInputRef.current?.blur();
              }}
              style={styles.hiddenInput}
              caretHidden
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
        ) : null}

        {/* Provenance — the handwritten line that says where this project
            came from. Identity, not metadata. Its own band so the eye
            registers it as the project's origin story, not as content. */}
        {origin ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/detail",
                params: { id: origin.id, entryType: origin.type },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Born from idea: ${origin.title}`}
            style={({ pressed }) => [
              styles.originBand,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="hand"
              style={[styles.originText, { color: colors.inkMuted }]}
            >
              Born from “{origin.title}”.
            </ThemedText>
          </Pressable>
        ) : null}

        {/* The actionable spine — open todos and deadlines filed here.
            Uses DirectRow so swipe-to-done and swipe-to-delete are the same
            gesture as on the home board. A project IS the board narrowed
            to one life area, not a separate read-only view. The gauge above
            already labels this section, so no duplicate kicker here. */}
        <View style={styles.section}>
          {open.length === 0 ? (
            <ThemedText
              type="hand"
              style={[styles.quiet, { color: colors.inkMuted }]}
            >
              Nothing on the line right now.
            </ThemedText>
          ) : (
            open.map((e) => (
              <DirectRow
                key={e.id}
                entry={e}
                onMarkDone={handleMarkDone}
                onDelete={handleDeleteEntry}
              />
            ))
          )}
        </View>

        {/* IDEAS — recall layer, intentionally quieter than the spine. A
            wrapped pin-row, each idea a slim chip, so the volume is clearly
            below the line above. */}
        {ideas.length > 0 ? (
          <View style={styles.section}>
            <ThemedText
              type="micro"
              style={[styles.sectionKicker, { color: colors.inkMuted }]}
            >
              IDEAS CARRIED · {ideas.length}
            </ThemedText>
            <View style={styles.pinRow}>
              {ideas.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() =>
                    router.push({
                      pathname: "/detail",
                      params: { id: e.id, entryType: e.type },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Idea: ${e.title}`}
                  style={({ pressed }) => [
                    styles.pin,
                    { backgroundColor: colors.surface },
                    pressed && styles.pressed,
                  ]}
                >
                  <EntryDot type="idea" />
                  <ThemedText
                    type="body"
                    numberOfLines={1}
                    style={[styles.pinTitle, { color: colors.ink }]}
                  >
                    {e.title}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* NOTES — the handwritten margin. No card chrome; just Caveat lines
            indented from a quiet vertical rule, so the section reads as
            writing on the page rather than stored data. */}
        {notes.length > 0 ? (
          <View style={styles.section}>
            <ThemedText
              type="micro"
              style={[styles.sectionKicker, { color: colors.inkMuted }]}
            >
              NOTES · {notes.length}
            </ThemedText>
            <View
              style={[
                styles.margin,
                { borderLeftColor: colors.surfaceSubtle },
              ]}
            >
              {notes.map((n) => (
                <ThemedText
                  key={n.id}
                  type="hand"
                  style={[styles.marginNote, { color: colors.ink }]}
                >
                  {n.body}
                </ThemedText>
              ))}
            </View>
          </View>
        ) : null}

        {/* Back-room: archive and delete. Kicker weight, well below the
            reading zone — present and tappable, never competing. */}
        <View style={styles.backroom}>
          <Pressable
            onPress={() =>
              updateProject(project.id, {
                status: archived ? "active" : "archived",
              }).catch((err) => console.error("Failed to archive:", err))
            }
            accessibilityRole="button"
            accessibilityLabel={
              archived ? "Reactivate project" : "Archive project"
            }
            style={({ pressed }) => [
              styles.backroomBtn,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="micro"
              style={[styles.backroomLabel, { color: colors.inkMuted }]}
            >
              {archived ? "REACTIVATE" : "ARCHIVE"}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={requestDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete project"
            style={({ pressed }) => [
              styles.backroomBtn,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="micro"
              style={[
                styles.backroomLabel,
                { color: colors.feedback.danger },
              ]}
            >
              DELETE
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={deleteConfirm.visible}
        kicker="DELETE PROJECT"
        message="Its todos and ideas stay on the board, just unfiled."
        dontAsk={deleteConfirm.dontAsk}
        onToggleDontAsk={deleteConfirm.toggleDontAsk}
        onConfirm={deleteConfirm.confirm}
        onCancel={deleteConfirm.cancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xxxl,
    gap: tokens.space.xxl,
  },

  // Hero: emoji slot on the left, gauge on the right.
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.lg,
  },
  heroGlyphSlot: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  heroEmoji: {
    fontSize: 36,
    lineHeight: 44,
  },
  heroGauge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.md,
  },
  gaugeLabel: {
    letterSpacing: tokens.type.micro.tracking,
  },
  headerGlyph: {
    fontSize: 22,
    lineHeight: 26,
  },

  // Picker tiles — slim, surface-filled, wrap to fit the row.
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  pickerTile: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },

  // Provenance band: own breathing room, reads as a margin note above the
  // content rather than as a row in it.
  originBand: {
    paddingVertical: tokens.space.xs,
  },
  originText: {
    fontSize: 18,
    lineHeight: 24,
  },

  section: {
    gap: tokens.space.sm,
  },
  sectionKicker: {
    letterSpacing: tokens.type.micro.tracking,
    marginBottom: tokens.space.xs,
  },
  quiet: {
    fontSize: 18,
    lineHeight: 24,
    paddingVertical: tokens.space.xs,
  },

  // Ideas pin-row — wrapped chips so footprint stays below the spine.
  pinRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  pin: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 36,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.sm,
    maxWidth: "100%",
  },
  pinTitle: {
    flexShrink: 1,
  },

  // Notes margin — a quiet vertical rule on the left, Caveat lines stacked.
  margin: {
    borderLeftWidth: 2,
    paddingLeft: tokens.space.md,
    gap: tokens.space.sm,
  },
  marginNote: {
    fontSize: 18,
    lineHeight: 24,
  },

  // Back-room footer — kicker weight, real distance above.
  backroom: {
    flexDirection: "row",
    gap: tokens.space.xxxl,
    paddingTop: tokens.space.xxl,
  },
  backroomBtn: {
    minHeight: 44,
    justifyContent: "center",
  },
  backroomLabel: {
    letterSpacing: tokens.type.micro.tracking,
  },

  empty: {
    padding: tokens.space.xl,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.7,
  },
});
