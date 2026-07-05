import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { ConfirmSheet } from "@/components/molecules/confirm-sheet";
import { DirectPager } from "@/components/molecules/direct-pager";
import { DirectRow } from "@/components/molecules/direct-row";
import { IdeaActionSheet } from "@/components/molecules/idea-action-sheet";
import { ProjectNoteComposerSheet } from "@/components/molecules/project-note-composer-sheet";
import { ProjectOverflowSheet } from "@/components/molecules/project-overflow-sheet";
import { ProjectPullInSheet } from "@/components/molecules/project-pull-in-sheet";
import {
  CaptureBackdrop,
  CaptureComposer,
} from "@/components/organisms/capture-composer";
import { DirectDetailSheet } from "@/components/organisms/direct-detail-sheet";
import { ProjectComposer } from "@/components/organisms/project-composer";
import type { ProjectComposerKind } from "@/components/organisms/project-composer";
import { ProjectFab } from "@/components/organisms/project-fab";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { tokens, useTheme } from "@/constants/theme";
import { useCapture } from "@/hooks/use-capture";
import { useConfirm } from "@/hooks/use-confirm";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { doneStatus, sortDirect } from "@/lib/direct-when";
import { ConfirmKey } from "@/lib/settings";
import { isTodoFamily } from "@/lib/taxonomy";
import type { DbDiaryEntry, DbEntry, EntryType } from "@/lib/types";

const isDone = (e: DbEntry): boolean =>
  e.status === "completed" || e.status === "met";

const PAGE_SIZE = 6;

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
  const entryDeleteConfirm = useConfirm({
    confirmKey: ConfirmKey.deleteEntry,
  });
  const [selectedEntry, setSelectedEntry] = useState<DbEntry | null>(null);
  const [spinePage, setSpinePage] = useState(0);

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

  const { spine, ideas, origin, notes, unfiledIdeas, unfiledNotes } =
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
          (e) => e.type === "idea" && !e.project_id && !isDone(e),
        ),
        unfiledNotes: diaryEntries.filter(
          (n) => !n.linked_project_id && !n.linked_entry_id,
        ),
      };
    }, [entries, diaryEntries, id]);
  const [pullInOpen, setPullInOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DbDiaryEntry | null>(null);

  // Capture: the SAME dock the home board uses (bar → resolver), pre-locked to
  // this project. The old hero-pen → chooser-sheet → three-composer flow was a
  // slower, project-only fork of capture; capture is the brand's one trigger
  // (PRODUCT.md: one add-path), so the project surface now speaks the same
  // grammar. `lockedProjectId` threads attribution through every resolution and
  // hides the resolver's PROJECT picker — the surface implies the project.
  const cap = useCapture({ lockedProjectId: id ?? null });

  // FAB-armed composer: which kind is currently open (null = closed).
  // Distinct from `cap` (the shared home-style dock): this composer skips the
  // classify/details stages because the FAB item already decided the kind.
  const [fabKind, setFabKind] = useState<ProjectComposerKind | null>(null);

  // Manual keyboard-lift for the pinned dock. KeyboardAvoidingView doesn't
  // reliably lift an absolutely-positioned child on iOS (KAV measures its own
  // frame, and an absolute wrapper detaches from that measurement), so we
  // subscribe to keyboard events and shift the dock's `bottom` by the
  // keyboard height directly. Android's soft input mode already resizes the
  // window, so we only need the offset on iOS.
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      setKbHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", () => {
      setKbHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleFabSubmit = (
    kind: ProjectComposerKind,
    text: string,
  ): void => {
    if (!id) return;
    if (kind === "note") {
      void addDiaryEntry(text, null, null, id).catch((err) =>
        console.error("Failed to save project note:", err),
      );
      return;
    }
    void createEntry({ title: text, type: kind, projectId: id }).catch((err) =>
      console.error(`Failed to capture ${kind}:`, err),
    );
  };

  function lastActiveLabel(epochSeconds: number): string {
    const diffDays = Math.floor((Date.now() / 1000 - epochSeconds) / 86400);
    if (diffDays <= 0) return "TODAY";
    if (diffDays === 1) return "YESTERDAY";
    if (diffDays < 7) return `${diffDays}D AGO`;
    if (diffDays < 14) return "1W AGO";
    if (diffDays < 60) return `${Math.floor(diffDays / 7)}W AGO`;
    return "A WHILE BACK";
  }

  const lastActive = useMemo(() => {
    const ts: number[] = [];
    if (project?.last_opened_at)
      ts.push(Math.floor(project.last_opened_at / 1000));
    for (const e of spine) ts.push(e.updated_at);
    for (const e of ideas) ts.push(e.updated_at);
    for (const n of notes) ts.push(n.updated_at);
    return ts.length > 0
      ? Math.max(...ts)
      : (project?.updated_at ?? Math.floor(Date.now() / 1000));
  }, [project, spine, ideas, notes]);

  const openCount = useMemo(
    () => spine.filter((e) => !isDone(e)).length,
    [spine],
  );
  const doneCount = useMemo(() => spine.filter(isDone).length, [spine]);

  const spinePageCount = Math.max(1, Math.ceil(spine.length / PAGE_SIZE));
  const safeSpinePage = Math.min(spinePage, spinePageCount - 1);
  useEffect(() => {
    if (spinePage > spinePageCount - 1) setSpinePage(spinePageCount - 1);
  }, [spinePage, spinePageCount]);
  const spinePageItems = useMemo(
    () =>
      spine.slice(
        safeSpinePage * PAGE_SIZE,
        safeSpinePage * PAGE_SIZE + PAGE_SIZE,
      ),
    [spine, safeSpinePage],
  );

  const notesById = useMemo(() => {
    const map = new Map<string, DbDiaryEntry>();
    for (const n of notes) map.set(n.id, n);
    return map;
  }, [notes]);

  const notesSessionGroups = useMemo(() => {
    const groups: { label: string; ids: string[] }[] = [];
    const sorted = [...notes].sort((a, b) => b.created_at - a.created_at);
    for (const note of sorted) {
      const date = new Date(note.created_at * 1000);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      let label: string;
      if (date.toDateString() === today.toDateString()) {
        label = "TODAY";
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = "YESTERDAY";
      } else {
        label = date
          .toLocaleDateString("en-US", { month: "short", day: "numeric" })
          .toUpperCase();
      }
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.ids.push(note.id);
      } else {
        groups.push({ label, ids: [note.id] });
      }
    }
    return groups;
  }, [notes]);

  function ruleOpacity(epochSeconds: number): number {
    const daysSince = Math.floor((Date.now() / 1000 - epochSeconds) / 86400);
    if (daysSince === 0) return 1.0;
    if (daysSince === 1) return 0.6;
    return 0.3;
  }

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
  const handlePullInNote = (note: import("@/lib/types").DbDiaryEntry): void => {
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
    }).catch((err) => console.error("Failed to make todo from idea:", err));
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

  // + write/edit a note — opens the lightweight composer pre-linked to this
  // project. When editing, the composer is pre-populated and saves via
  // updateDiaryEntry; for new notes it calls addDiaryEntry.
  const handleTapNote = (note: DbDiaryEntry): void => {
    setEditingNote(note);
    setNoteOpen(true);
  };

  const handleSaveNote = (body: string): void => {
    if (!id) return;
    if (editingNote) {
      void updateDiaryEntry(editingNote.id, { body }).catch((err) =>
        console.error("Failed to update note:", err),
      );
      setEditingNote(null);
    } else {
      void addDiaryEntry(body, null, null, id).catch((err) =>
        console.error("Failed to save project note:", err),
      );
    }
  };

  // DirectRow done/delete handlers — same shape as the home board, so a line
  // triaged here behaves exactly like the same line on the board.
  const handleMarkDone = (entry: DbEntry): void => {
    void updateEntryStatus(entry.id, doneStatus(entry.type as EntryType)).catch(
      (err) => console.error("Failed to mark entry done:", err),
    );
  };
  const handleDeleteEntry = (entry: DbEntry): void => {
    void entryDeleteConfirm.request(() => {
      void deleteEntry(entry.id).catch((err) =>
        console.error("Failed to delete entry:", err),
      );
    });
  };

  const handleEditEntry = (entry: DbEntry): void => {
    router.push({
      pathname: "/detail",
      params: { id: entry.id, entryType: entry.type },
    });
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
              <ScreenHeader
                title="Project"
                onBack={() => router.back()}
                inset
              />
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
                <Pressable
                  onPress={() => openOverflow("emoji")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    project.emoji
                      ? `Change project emoji, currently ${project.emoji}`
                      : "Pick an emoji for this project"
                  }
                >
                  {project.emoji ? (
                    <ThemedText type="title" style={styles.headerGlyph}>
                      {project.emoji}
                    </ThemedText>
                  ) : (
                    <MaterialCommunityIcons
                      name="folder-outline"
                      size={22}
                      color={colors.inkMuted}
                    />
                  )}
                </Pressable>
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

        {/* Stats bar — compact instrument readout below provenance.
            Open count (primary), done ratio, and last-active label in the
            mono signal layer so the eye gets the project's vital signs
            without a dedicated hero section. */}

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
            <>
              {spinePageItems.map((e) => (
                <DirectRow
                  key={e.id}
                  entry={e}
                  onPress={setSelectedEntry}
                  onMarkDone={handleMarkDone}
                  onDelete={handleDeleteEntry}
                />
              ))}
              <DirectPager
                page={safeSpinePage}
                pageCount={spinePageCount}
                onChange={(p) =>
                  setSpinePage(
                    Math.max(0, Math.min(p, spinePageCount - 1)),
                  )
                }
              />
            </>
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

        {/* NOTES — the handwritten margin, now with session grouping so the
            margin reads like a dated journal. Each note is tappable to edit;
            the vertical rule uses per-note opacity segments (today = full,
            yesterday = 0.6, older = 0.3) so recency is carried by the rule. */}
        <View style={styles.section}>
          {notesSessionGroups.map((group) => (
            <View key={group.label}>
              <ThemedText
                type="micro"
                style={[styles.sessionHeader, { color: colors.inkMuted }]}
              >
                {group.label} · {group.ids.length}{" "}
                {group.ids.length === 1 ? "NOTE" : "NOTES"}
              </ThemedText>
              <View style={styles.margin}>
                {group.ids.map((nid) => {
                  const note = notesById.get(nid);
                  if (!note) return null;
                  const segOpacity = ruleOpacity(note.created_at);
                  return (
                    <Pressable
                      key={note.id}
                      onPress={() => handleTapNote(note)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit note: ${note.body.slice(0, 40)}`}
                      style={({ pressed }) => [
                        styles.marginNoteRow,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.ruleSegment,
                          {
                            backgroundColor: colors.surfaceSubtle,
                            opacity: segOpacity,
                          },
                        ]}
                      />
                      <ThemedText
                        type="hand"
                        style={[styles.marginNote, { color: colors.ink }]}
                      >
                        {note.body}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          {notes.length === 0 ? (
            <ThemedText
              type="hand"
              style={[styles.quiet, { color: colors.inkMuted }]}
            >
              No notes yet.
            </ThemedText>
          ) : null}
          <Pressable
            onPress={() => {
              setEditingNote(null);
              setNoteOpen(true);
            }}
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
        initialBody={editingNote?.body}
        onClose={() => {
          setNoteOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
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
      <DirectDetailSheet
        entry={selectedEntry}
        project={project ?? null}
        visible={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        onMarkDone={handleMarkDone}
        onDelete={handleDeleteEntry}
        onEdit={handleEditEntry}
      />
      <ConfirmSheet
        visible={entryDeleteConfirm.visible}
        kicker="DELETE ENTRY"
        message="This removes it from the field for good."
        dontAsk={entryDeleteConfirm.dontAsk}
        onToggleDontAsk={entryDeleteConfirm.toggleDontAsk}
        onConfirm={entryDeleteConfirm.confirm}
        onCancel={entryDeleteConfirm.cancel}
      />
      {/* Outside-tap backdrop — screen-level so it spans the whole surface while
          the dock sits pinned below. Only exists while a dismissible surface is
          up; the resolver is intentionally not covered. */}
      <CaptureBackdrop cap={cap} />
      {/* The capture dock — the same instrument as the home board, pinned to the
          bottom and pre-locked to this project (no ManualBar: a project can't
          birth a sibling project). Only mounts a surface when summoned. */}
      <View
        style={[
          styles.dock,
          { bottom: tokens.space.lg + kbHeight },
        ]}
        pointerEvents="box-none"
      >
        <CaptureComposer cap={cap} projects={projects} />
        <ProjectComposer
          kind={fabKind}
          onClose={() => setFabKind(null)}
          onSubmit={handleFabSubmit}
        />
      </View>
      {fabKind === null ? (
        <ProjectFab
          onAction={(key) => {
            setFabKind(key as ProjectComposerKind);
          }}
        />
      ) : null}
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

  // Stats bar — compact instrument readout between provenance and spine.
  // Mimics the bento-card CounterDisplay feel but as an inline strip so it
  // never competes with the DirectRow gestures below.
  statsBar: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: tokens.space.md,
  },
  statsPrimary: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statsSecondary: {
    fontSize: tokens.type.micro.size,
    letterSpacing: tokens.type.micro.tracking,
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

  // Notes margin — per-note 2px rule segments whose opacity varies with
  // recency (today = full, yesterday = 0.6, older = 0.3). No container
  // border — each row carries its own left bar.
  sessionHeader: {
    letterSpacing: tokens.type.micro.tracking,
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.xs,
  },
  margin: {
    gap: tokens.space.sm,
  },
  marginNoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.md,
  },
  ruleSegment: {
    width: 2,
    alignSelf: "stretch",
    borderRadius: 1,
  },
  marginNote: {
    fontSize: 18,
    lineHeight: 24,
    flex: 1,
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

  // Capture dock — pinned to the bottom edge, matching the home board's dock.
  dock: {
    position: "absolute",
    left: tokens.space.lg,
    right: tokens.space.lg,
    bottom: tokens.space.lg,
  },
  pressed: {
    opacity: 0.7,
  },
});
