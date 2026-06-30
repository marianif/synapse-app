import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { ConfirmSheet } from "@/components/molecules/confirm-sheet";
import { DirectRow } from "@/components/molecules/direct-row";
import { IdeaActionSheet } from "@/components/molecules/idea-action-sheet";
import { ProjectCaptureChooserSheet } from "@/components/molecules/project-capture-chooser-sheet";
import {
  ProjectDeadlineComposerSheet,
  ProjectIdeaComposerSheet,
  ProjectTodoComposerSheet,
} from "@/components/molecules/project-composers";
import { ProjectNoteComposerSheet } from "@/components/molecules/project-note-composer-sheet";
import { ProjectOverflowSheet } from "@/components/molecules/project-overflow-sheet";
import { ProjectPullInSheet } from "@/components/molecules/project-pull-in-sheet";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { tokens, useTheme } from "@/constants/theme";
import { useConfirm } from "@/hooks/use-confirm";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { doneStatus, sortDirect } from "@/lib/direct-when";
import { ConfirmKey } from "@/lib/settings";
import { isTodoFamily } from "@/lib/taxonomy";
import type { CreateEntryInput } from "@/contexts/database-context";
import type { DbEntry, EntryType } from "@/lib/types";

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
    createEntry,
    updateEntry,
    updateEntryStatus,
    deleteEntry,
    updateProject,
    deleteProject,
  } = useDatabase();
  const {
    entries: diaryEntries,
    addEntry: addDiaryEntry,
    updateEntry: updateDiaryEntry,
  } = useDiary();

  const project = projects.find((p) => p.id === id);

  const deleteConfirm = useConfirm({ confirmKey: ConfirmKey.deleteProject });

  // Overflow sheet — every tier-3 verb (rename, change emoji, archive, delete)
  // lives here so the project surface itself can stay a working zone. Opens
  // from ScreenHeader's `··` button on the "menu" pane; the hero emoji opens
  // it straight on the "emoji" pane so picking stays a single tap.
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [overflowMode, setOverflowMode] = useState<"menu" | "emoji">("menu");
  const openOverflow = (next: "menu" | "emoji"): void => {
    setOverflowMode(next);
    setOverflowOpen(true);
  };

  const requestDelete = (): void => {
    if (!project) return;
    deleteConfirm.request(() => {
      deleteProject(project.id)
        .then(() => router.back())
        .catch((err) => console.error("Failed to delete project:", err));
    });
  };

  const { spine, openCount, ideas, origin, notes, unfiledIdeas, unfiledNotes } =
    useMemo(() => {
      const filed = entries.filter((e) => e.project_id === id);
      // Spine: open AND done todos/deadlines, sorted by sortDirect so done
      // sinks to the bottom. DirectRow renders done lines with strikethrough +
      // dimmed dot intrinsically; swipe-to-delete still works on done rows,
      // which is what we want — the user can clear a done line if they're
      // sure, or leave it as a record of completion.
      const todoLike = filed.filter((e) => isTodoFamily(e.type));
      return {
        spine: sortDirect(todoLike),
        openCount: todoLike.filter((e) => !isDone(e)).length,
        ideas: filed.filter((e) => e.type === "idea" && !isDone(e)),
        origin: entries.find(
          (e) => e.type === "idea" && e.promoted_project_id === id,
        ),
        notes: diaryEntries.filter((n) => n.linked_project_id === id),
        // Pull-in pool — loose thinking the user can attribute to THIS project.
        // Ideas: open + unfiled. Notes: free (no entry link, no project link).
        // Todos/deadlines are intentionally excluded — those were either
        // captured into a project or live as standalone commitments; retro-
        // attaching them is a re-categorization verb that doesn't belong here.
        unfiledIdeas: entries.filter(
          (e) =>
            e.type === "idea" && !e.project_id && !isDone(e),
        ),
        unfiledNotes: diaryEntries.filter(
          (n) => !n.linked_project_id && !n.linked_entry_id,
        ),
      };
    }, [entries, diaryEntries, id]);
  const [pullInOpen, setPullInOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  // Capture flow: hero pen → chooser sheet → one of three composers. Held
  // separately (not a single union) so the chooser can close cleanly before
  // the composer animates in — overlapping sheet animations look stacked.
  const [chooserOpen, setChooserOpen] = useState(false);
  const [activeComposer, setActiveComposer] = useState<
    null | "todo" | "deadline" | "idea"
  >(null);

  // Long-press menu on idea chips. Holding the idea on the sheet by id (not
  // the row) means re-renders during pull-in / promote don't yank the menu
  // away from under the user's thumb.
  const [actionIdeaId, setActionIdeaId] = useState<string | null>(null);
  const actionIdea = useMemo(
    () => entries.find((e) => e.id === actionIdeaId) ?? null,
    [entries, actionIdeaId],
  );

  // Pull-in handlers. Both keep the sheet open — chaining is the point.
  // updateEntry / updateDiaryEntry update both DB and in-memory state, so
  // the next render's `unfiledIdeas`/`unfiledNotes` won't include the chip
  // the user just tapped (it vanishes from the strip automatically).
  const handlePullInIdea = (idea: DbEntry): void => {
    if (!id) return;
    void updateEntry(idea.id, { projectId: id }).catch((err) =>
      console.error("Failed to pull idea into project:", err),
    );
  };
  const handlePullInNote = (
    note: import("@/lib/types").DbDiaryEntry,
  ): void => {
    if (!id) return;
    void updateDiaryEntry(note.id, { linkedProjectId: id }).catch((err) =>
      console.error("Failed to pull note into project:", err),
    );
  };

  // Idea action handlers.
  const handleMakeTodoFromIdea = (idea: DbEntry): void => {
    if (!id) return;
    // Spawn a sibling todo carrying the idea's title; the idea stays put as
    // provenance (the user can later see "this todo came from that thought"
    // if we surface the link, or just leave the two as parallel rows).
    void createEntry({
      title: idea.title,
      type: "todo",
      projectId: id,
    }).catch((err) =>
      console.error("Failed to make todo from idea:", err),
    );
  };
  const handleUnfileIdea = (idea: DbEntry): void => {
    void updateEntry(idea.id, { projectId: null }).catch((err) =>
      console.error("Failed to unfile idea:", err),
    );
  };
  const handleOpenIdea = (idea: DbEntry): void => {
    router.push({
      pathname: "/detail",
      params: { id: idea.id, entryType: idea.type },
    });
  };

  // + write a note — opens the lightweight composer pre-linked to this project.
  const handleSaveNote = (body: string): void => {
    if (!id) return;
    void addDiaryEntry(body, null, null, id).catch((err) =>
      console.error("Failed to save project note:", err),
    );
  };

  // Hero pen → chooser → composer flow. The composers each emit a partial
  // CreateEntryInput; we splice in the type + projectId and persist. Closing
  // the composer is the composer's own responsibility; we just fire-and-log.
  const persistComposed = (
    type: "todo" | "deadline" | "idea",
    input: Partial<CreateEntryInput>,
  ): void => {
    if (!id) return;
    void createEntry({
      ...input,
      title: input.title ?? "",
      type,
      projectId: id,
    }).catch((err) =>
      console.error(`Failed to create ${type} in project:`, err),
    );
  };

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

  const handleRename = (next: string): void => {
    if (!project) return;
    void updateProject(project.id, { title: next }).catch((err) =>
      console.error("Failed to rename project:", err),
    );
  };
  const handleChangeEmoji = (next: string | null): void => {
    if (!project) return;
    void updateProject(project.id, { emoji: next }).catch((err) =>
      console.error("Failed to update project emoji:", err),
    );
  };
  const handleToggleArchive = (): void => {
    if (!project) return;
    const next = project.status === "archived" ? "active" : "archived";
    void updateProject(project.id, { status: next }).catch((err) =>
      console.error("Failed to archive project:", err),
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
              headerRight={
                <Pressable
                  onPress={() => openOverflow("menu")}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Project actions"
                  style={styles.overflowBtn}
                >
                  <MaterialCommunityIcons
                    name="dots-horizontal"
                    size={24}
                    color={colors.ink}
                  />
                </Pressable>
              }
            />
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO — emoji identity + open-count gauge. The emoji slot is the
            fast path to the picker (opens the overflow sheet directly on its
            emoji pane); the same picker is also reachable via the header
            `··` overflow → Change emoji, for symmetry with rename / archive /
            delete. The big mono number to the right is the instrument-panel
            readout: what's pressing in here. */}
        <View style={styles.hero}>
          <Pressable
            onPress={() => openOverflow("emoji")}
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
              <MaterialCommunityIcons
                name="folder-outline"
                size={28}
                color={colors.inkMuted}
              />
            )}
          </Pressable>

          <View style={styles.heroGauge}>
            <ThemedText type="display" style={{ color: colors.ink }}>
              {openCount}
            </ThemedText>
            <ThemedText
              type="micro"
              style={[styles.gaugeLabel, { color: colors.inkMuted }]}
            >
              ON THE LINE
            </ThemedText>
          </View>

          {/* Capture trigger — opens a chooser sheet that asks WHAT the new
              line is (todo / deadline / idea), then routes to the matching
              minimal composer pre-locked to this project. No voice and no
              ambient bar: the project surface is for deliberate authoring,
              not 5-second-window ambient capture (which lives on home). */}
          <Pressable
            onPress={() => setChooserOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add to this project"
            style={({ pressed }) => [
              styles.capturePen,
              { backgroundColor: colors.accent.clay },
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={colors.accent.onClay}
            />
          </Pressable>
        </View>

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
          {spine.length === 0 ? (
            <ThemedText
              type="hand"
              style={[styles.quiet, { color: colors.inkMuted }]}
            >
              Nothing on the line right now.
            </ThemedText>
          ) : (
            // Open lines first, then done lines (struck-through, dimmed dot —
            // DirectRow handles the styling intrinsically from entry.status).
            // Swipe-to-delete still works on done rows; the user clears them
            // if they want, or leaves them as the week's record of work.
            spine.map((e) => (
              <DirectRow
                key={e.id}
                entry={e}
                onMarkDone={handleMarkDone}
                onDelete={handleDeleteEntry}
              />
            ))
          )}
        </View>

        {/* PULL IN — intake button for loose ideas and notes. Hidden when
            nothing is loose (no point dangling an empty verb). Sits right
            after the open spine because pulling-in IS open work: it's the
            verb that turns ambient capture into project content. */}
        {unfiledIdeas.length + unfiledNotes.length > 0 ? (
          <Pressable
            onPress={() => setPullInOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Pull in ${unfiledIdeas.length} loose ideas and ${unfiledNotes.length} loose notes`}
            style={({ pressed }) => [
              styles.pullInButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name="plus"
              size={16}
              color={colors.inkMuted}
            />
            <ThemedText
              type="micro"
              style={[styles.pullInLabel, { color: colors.inkMuted }]}
            >
              {`PULL SOMETHING IN · ${unfiledIdeas.length + unfiledNotes.length}`}
            </ThemedText>
          </Pressable>
        ) : null}

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
                  onLongPress={() => setActionIdeaId(e.id)}
                  delayLongPress={300}
                  accessibilityRole="button"
                  accessibilityLabel={`Idea: ${e.title}`}
                  accessibilityHint="Long-press for actions"
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
            writing on the page rather than stored data. The section ALWAYS
            renders (even at zero notes) because it owns the "+ write a note"
            verb — the surface that displays notes is the one that authors them. */}
        <View style={styles.section}>
          {notes.length > 0 ? (
            <>
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
            </>
          ) : null}
          <Pressable
            onPress={() => setNoteOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Write a note about this project"
            style={({ pressed }) => [
              styles.addNoteBtn,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name="plus"
              size={16}
              color={colors.inkMuted}
            />
            <ThemedText
              type="micro"
              style={[styles.addNoteLabel, { color: colors.inkMuted }]}
            >
              {notes.length === 0 ? "WRITE A NOTE" : "ADD A NOTE"}
            </ThemedText>
          </Pressable>
        </View>

      </ScrollView>

      <ProjectOverflowSheet
        visible={overflowOpen}
        project={project}
        initialMode={overflowMode}
        onClose={() => setOverflowOpen(false)}
        onRename={handleRename}
        onChangeEmoji={handleChangeEmoji}
        onToggleArchive={handleToggleArchive}
        onDelete={requestDelete}
      />

      <ProjectPullInSheet
        visible={pullInOpen}
        onClose={() => setPullInOpen(false)}
        unfiledIdeas={unfiledIdeas}
        unfiledNotes={unfiledNotes}
        onAttachIdea={handlePullInIdea}
        onAttachNote={handlePullInNote}
      />

      <IdeaActionSheet
        visible={actionIdea !== null}
        idea={actionIdea}
        onClose={() => setActionIdeaId(null)}
        onMakeTodo={() => actionIdea && handleMakeTodoFromIdea(actionIdea)}
        onUnfile={() => actionIdea && handleUnfileIdea(actionIdea)}
        onOpen={() => actionIdea && handleOpenIdea(actionIdea)}
      />

      <ProjectNoteComposerSheet
        visible={noteOpen}
        projectTitle={project.title}
        onClose={() => setNoteOpen(false)}
        onSave={handleSaveNote}
      />

      {/* Hero pen → chooser → one of three composers. The chooser closes
          itself before the composer animates in (state holds them apart). */}
      <ProjectCaptureChooserSheet
        visible={chooserOpen}
        onClose={() => setChooserOpen(false)}
        onPick={(type) => {
          setChooserOpen(false);
          setActiveComposer(type);
        }}
      />
      <ProjectIdeaComposerSheet
        visible={activeComposer === "idea"}
        projectTitle={project.title}
        onClose={() => setActiveComposer(null)}
        onSave={(input) => persistComposed("idea", input)}
      />
      <ProjectTodoComposerSheet
        visible={activeComposer === "todo"}
        projectTitle={project.title}
        onClose={() => setActiveComposer(null)}
        onSave={(input) => persistComposed("todo", input)}
      />
      <ProjectDeadlineComposerSheet
        visible={activeComposer === "deadline"}
        projectTitle={project.title}
        onClose={() => setActiveComposer(null)}
        onSave={(input) => persistComposed("deadline", input)}
      />

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
  // Pen tile — the project's capture trigger. Clay slab, matches every
  // primary action across the brand; tap → text, long-press → voice.
  capturePen: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerGlyph: {
    fontSize: 22,
    lineHeight: 26,
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

  // Header `··` overflow button — matches the back button's hit area.
  overflowBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Add-note button — same mono quiet voice as the pull-in trigger, sits
  // under the NOTES margin so the verb belongs to the surface that displays
  // the notes. Aligned to the rule's indent so it reads as "add to the margin."
  addNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingVertical: tokens.space.sm,
    paddingLeft: tokens.space.md,
    alignSelf: "flex-start",
  },
  addNoteLabel: {
    letterSpacing: tokens.type.micro.tracking,
  },

  // Pull-in button — quiet mono affordance, sits flush between spine and
  // done-this-week. Reads as a verb (the "+" makes the intake meaning legible
  // without needing the word "ADD"), tier-2 weight so it never competes with
  // the DirectRow gestures above.
  pullInButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
    alignSelf: "flex-start",
  },
  pullInLabel: {
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
