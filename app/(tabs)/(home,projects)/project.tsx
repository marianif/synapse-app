import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { ConfirmSheet } from "@/components/molecules/confirm-sheet";
import { DiaryNote } from "@/components/molecules/diary-note";
import { DirectPager } from "@/components/molecules/direct-pager";
import { DirectRow } from "@/components/molecules/direct-row";
import { IdeaActionSheet } from "@/components/molecules/idea-action-sheet";
import { ProjectOverflowSheet } from "@/components/molecules/project-overflow-sheet";
import { ProjectStarters } from "@/components/molecules/project-starters";
import {
  CaptureBackdrop,
  CaptureComposer,
} from "@/components/organisms/capture-composer";
import type {
  ProjectComposerKind,
  ProjectComposerSubmitPayload,
} from "@/components/organisms/project-composer";
import { ProjectComposer } from "@/components/organisms/project-composer";
import {
  FAB_OPEN_FOOTPRINT,
  ProjectFab,
} from "@/components/organisms/project-fab";
import { ScreenHeader } from "@/components/organisms/screen-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useGlobalCapture } from "@/contexts/global-capture-context";
import { useCapture } from "@/hooks/use-capture";
import { useConfirm } from "@/hooks/use-confirm";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { doneStatus, sortDirect } from "@/lib/direct-when";
import { horizonEndDate } from "@/lib/horizons";
import type { StarterPrompt, StarterType } from "@/lib/project-starters";
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

  const { entries: diaryEntries, addEntry: addDiaryEntry, removeEntry: removeDiaryEntry } =
  useDiary();

  const project = projects.find((p) => p.id === id);

  const deleteConfirm = useConfirm({ confirmKey: ConfirmKey.deleteProject });
  const entryDeleteConfirm = useConfirm({
    confirmKey: ConfirmKey.deleteEntry,
  });
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

  const { spine, ideas, origin, notes, presentTypes } = useMemo(() => {
    const filed = entries.filter((e) => e.project_id === id);
    // Spine: open AND done todos/deadlines, sorted by sortDirect so done
    // sinks to the bottom. DirectRow renders done lines with strikethrough +
    // dimmed dot intrinsically; swipe-to-delete still works on done rows,
    // which is what we want — the user can clear a done line if they're
    // sure, or leave it as a record of completion.
    const todoLike = filed.filter((e) => isTodoFamily(e.type));
    const projectNotes = diaryEntries.filter((n) => n.linked_project_id === id);
    // Which channels this project already carries — drives which starter
    // prompts survive. A starter for type T persists until T has a real entry,
    // so each of the four channels retires independently (not all-or-nothing
    // on the first capture). Counts entries of ANY status; a completed todo
    // still means the todo channel has been used. Notes live in a separate
    // table, so their presence is tracked alongside the EntryType set.
    const present = new Set<StarterType>(filed.map((e) => e.type as EntryType));
    if (projectNotes.length > 0) present.add("note");
    return {
      spine: sortDirect(todoLike),
      ideas: filed.filter((e) => e.type === "idea" && !isDone(e)),
      origin: entries.find(
        (e) => e.type === "idea" && e.promoted_project_id === id,
      ),
      notes: projectNotes,
      presentTypes: present,
    };
  }, [entries, diaryEntries, id]);

  const isEmpty =
    spine.length === 0 && ideas.length === 0 && notes.length === 0 && !origin;

  // Capture: the SAME dock the home board uses (bar → resolver), pre-locked to
  // this project. The old hero-pen → chooser-sheet → three-composer flow was a
  // slower, project-only fork of capture; capture is the brand's one trigger
  // (PRODUCT.md: one add-path), so the project surface now speaks the same
  // grammar. `lockedProjectId` threads attribution through every resolution and
  // hides the resolver's PROJECT picker — the surface implies the project.
  const cap = useCapture({ lockedProjectId: id ?? null });

  // This screen is a pushed Stack.Screen inside the tab layout, so the
  // CustomTabBar stays mounted underneath it — the dock's `bottom` gap
  // (space.lg) sits ABOVE the tab bar, not at the true screen bottom. The
  // keyboard height the OS reports is measured from the true screen bottom,
  // so the rest offset must include the tab bar's real height too, or the
  // lift overshoots by exactly that height and the composer floats too high
  // above the keyboard.
  const { tabBarHeight } = useGlobalCapture();

  // FAB-armed composer: which kind is currently open (null = closed).
  // Distinct from `cap` (the shared home-style dock): this composer skips the
  // classify/details stages because the FAB item already decided the kind.
  const [fabKind, setFabKind] = useState<ProjectComposerKind | null>(null);
  // Text the composer opens pre-filled with. The FAB arms it empty; the empty-
  // project starter rows arm it with a suggested line the user can send or edit.
  const [starterSeed, setStarterSeed] = useState("");

  // Whether the FAB-armed ProjectComposer is up — drives a backdrop scrim so
  // the composer doesn't visually fuse with the project content behind it.
  const [composerActive, setComposerActive] = useState(false);

  // Aborts the FAB-armed composer: clears the kind (unmounts it) and the seed
  // text, discarding whatever draft was in progress. Shared by the composer's
  // own close paths (submit, details-stage discard) and the backdrop tap, so
  // tapping outside the composer cancels it exactly like CaptureBackdrop's
  // outside-tap cancels the home dock instead of merely dropping the keyboard.
  const closeFabComposer = (): void => {
    setFabKind(null);
    setStarterSeed("");
  };

  // When the FAB's pill menu fans out, it can visually land on top of list
  // content (notes especially) since the pills+captions are a fixed-position
  // overlay, not part of the scroll flow. Rather than paint a scrim/backing
  // shape behind them, reserve that much space at the bottom of the
  // scrollable content and scroll it into view — so there's simply nothing
  // back there for the pills to sit on top of. Only meaningful for a project
  // with real content; the empty-state FAB has no scrollable content behind
  // it to begin with.
  const scrollRef = useRef<ScrollView | null>(null);
  const [fabReserve, setFabReserve] = useState(0);
  const handleFabOpenChange = (open: boolean): void => {
    if (isEmpty) return;
    if (open) {
      setFabReserve(FAB_OPEN_FOOTPRINT);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true }),
      );
    } else {
      setFabReserve(0);
    }
  };

  // Manual keyboard-lift for the pinned dock. KeyboardAvoidingView doesn't
  // reliably lift an absolutely-positioned child on iOS (KAV measures its own
  // frame, and an absolute wrapper detaches from that measurement), so we
  // subscribe to keyboard events and translate the dock so its bottom edge lands
  // just above the keyboard. The rest offset is the tab bar's real height plus
  // the dock's own bottom gap (space.lg) — same math as CaptureDock/
  // AddProjectBar; the 1.05 multiplier leaves the same tiny gap they use.
  // Android's soft input mode already resizes the window, so we only need the
  // offset on iOS.
  const restOffset = tabBarHeight + tokens.space.lg;
  const keyboardLift = useSharedValue(0);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      const lift = Math.max(0, e.endCoordinates.height - restOffset);
      keyboardLift.value = withTiming(lift, {
        duration: e.duration || 220,
        easing: Easing.out(Easing.cubic),
      });
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", (e) => {
      keyboardLift.value = withTiming(0, {
        duration: e?.duration || 200,
        easing: Easing.out(Easing.cubic),
      });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardLift, restOffset]);

  const dockLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardLift.value * 1.05 }],
  }));

  const handleFabSubmit = (payload: ProjectComposerSubmitPayload): void => {
    if (!id) return;
    if (payload.kind === "note") {
      void addDiaryEntry(payload.text, null, null, id).catch((err) =>
        console.error("Failed to save project note:", err),
      );
      return;
    }
    if (payload.kind === "idea") {
      void createEntry({
        title: payload.text,
        type: payload.kind,
        projectId: id,
      }).catch((err) =>
        console.error(`Failed to capture ${payload.kind}:`, err),
      );
      return;
    }
    const due = payload.dueRange ? horizonEndDate(payload.dueRange) : undefined;
    void createEntry({
      title: payload.text,
      type: payload.kind,
      projectId: id,
      scheduledDate:
        payload.kind === "todo"
          ? (due ?? payload.date ?? undefined)
          : undefined,
      scheduledTime:
        payload.kind === "todo"
          ? payload.dueRange
            ? undefined
            : (payload.time ?? undefined)
          : undefined,
      dueDate:
        payload.kind === "deadline"
          ? (due ?? payload.date ?? undefined)
          : undefined,
      dueTime:
        payload.kind === "deadline"
          ? payload.dueRange
            ? undefined
            : (payload.time ?? undefined)
          : undefined,
      dueRange: payload.dueRange ?? undefined,
    }).catch((err) => console.error(`Failed to capture ${payload.kind}:`, err));
  };

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

  // Long-press menu on idea chips. Holding the idea on the sheet by id (not
  // the row) means re-renders during pull-in / promote don't yank the menu
  // away from under the user's thumb.
  const [actionIdeaId, setActionIdeaId] = useState<string | null>(null);
  const actionIdea = useMemo(
    () => entries.find((e) => e.id === actionIdeaId) ?? null,
    [entries, actionIdeaId],
  );

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

  // Arm the composer from an empty-project starter row. Same in-screen composer
  // the FAB opens — one add-path — seeded with the prompt's suggested text when
  // it's a real suggestion (a default project's tailored line), or blank for a
  // generic user-created placeholder. Nothing is committed until the user sends.
  const handleStartFromStarter = (prompt: StarterPrompt): void => {
    setStarterSeed(prompt.prefill ? prompt.text : "");
    setFabKind(prompt.type as ProjectComposerKind);
  };
  const handleOpenIdea = (idea: DbEntry): void => {
    router.push({
      pathname: "/edit",
      params: { id: idea.id },
    });
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
              <ScreenHeader title="Project" onBack={() => router.back()} />
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
                    <IconSymbol
                      name="Folder"
                      size={22}
                      color={colors.inkMuted}
                    />
                  )}
                </Pressable>
              }
              onBack={() => router.back()}
              headerRight={
                <Pressable
                  onPress={() => openOverflow("menu")}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Project actions"
                  style={styles.overflowBtn}
                >
                  <IconSymbol name="MoreH" size={24} color={colors.ink} />
                </Pressable>
              }
            />
          ),
        }}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          fabReserve > 0 && {
            paddingBottom: styles.content.paddingBottom + fabReserve,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Provenance — the handwritten line that says where this project
            came from. Identity, not metadata. Its own band so the eye
            registers it as the project's origin story, not as content. */}
        {origin ? (
          <View
            accessibilityRole="button"
            accessibilityLabel={`Born from idea: ${origin.title}`}
            style={[styles.originBand]}
          >
            <ThemedText
              type="hand"
              style={[styles.originText, { color: colors.inkMuted }]}
            >
              Born from “{origin.title}”.
            </ThemedText>
          </View>
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
          {/* Real spine lines first. Open lines, then done (struck-through,
              dimmed dot — DirectRow styles intrinsically from entry.status). */}
          {spine.length > 0 ? (
            <>
              {spinePageItems.map((e) => (
                <DirectRow
                  key={e.id}
                  entry={e}
                  onPress={(entry) =>
                    router.push({ pathname: "/edit", params: { id: entry.id } })
                  }
                  onMarkDone={handleMarkDone}
                  onDelete={handleDeleteEntry}
                />
              ))}
              <DirectPager
                page={safeSpinePage}
                pageCount={spinePageCount}
                onChange={(p) =>
                  setSpinePage(Math.max(0, Math.min(p, spinePageCount - 1)))
                }
              />
            </>
          ) : null}

          {/* Starter prompts — the instrument panel's unlit channels. One row
              per type the project doesn't yet carry (topic-suited on a seeded
              default, generic on a user-created project). Persists PER TYPE:
              after a todo lands it sits above, and the idea/deadline/note
              prompts stay below until each is used. Renders null once all
              four channels exist. Decoupled from `isEmpty` so it coexists
              with real rows. Note's starter is the only add-path for notes on
              this screen now — no separate "write a note" CTA. */}
          <ProjectStarters
            projectTitle={project.title}
            presentTypes={presentTypes}
            onStart={handleStartFromStarter}
          />
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
                      pathname: "/edit",
                      params: { id: e.id },
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

        {/* NOTES — session-grouped diary cards, the same DiaryNote the notes
            tab renders, so a note here looks and behaves exactly like one in
            the feed. The relatedness chip is suppressed: a note in this
            section is by definition ON this project, so the label would be
            redundant. Tap a note to edit it (the /note modal), swipe to
            delete. Adding a note happens via the FAB / starter row, same as
            every other channel — no dedicated CTA in this section. */}
        {notes.length > 0 ? (
          <View style={styles.section}>
            {notesSessionGroups.map((group) => (
              <View key={group.label} style={styles.notesGroup}>
                <ThemedText
                  type="micro"
                  style={[styles.sessionHeader, { color: colors.inkMuted }]}
                >
                  {group.label} · {group.ids.length}{" "}
                  {group.ids.length === 1 ? "NOTE" : "NOTES"}
                </ThemedText>
                {group.ids.map((nid) => {
                  const note = notesById.get(nid);
                  if (!note) return null;
                  return (
                    <DiaryNote
                      key={note.id}
                      entry={note}
                      hideChip
                      onDelete={() => void removeDiaryEntry(note.id)}
                      onEdit={() =>
                        router.push({
                          pathname: "/note",
                          params: {
                            id: note.id,
                            body: note.body,
                            relatable: "0",
                          },
                        })
                      }
                    />
                  );
                })}
              </View>
            ))}
          </View>
        ) : null}
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
      <IdeaActionSheet
        visible={actionIdea !== null}
        idea={actionIdea}
        onClose={() => setActionIdeaId(null)}
        onMakeTodo={() => actionIdea && handleMakeTodoFromIdea(actionIdea)}
        onUnfile={() => actionIdea && handleUnfileIdea(actionIdea)}
        onOpen={() => actionIdea && handleOpenIdea(actionIdea)}
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

      {/* ProjectComposer backdrop — screen-level so the FAB-armed composer
          doesn't visually fuse with the project content behind it. */}
      {composerActive ? (
        <Animated.View
          entering={FadeIn.duration(tokens.motion.duration.fast)}
          exiting={FadeOut.duration(tokens.motion.duration.fast)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable
            style={[StyleSheet.absoluteFill, styles.scrim]}
            onPress={() => {
              Keyboard.dismiss();
              closeFabComposer();
            }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss project composer"
          />
        </Animated.View>
      ) : null}

      {/* The capture dock — the same instrument as the home board, pinned to the
          bottom and pre-locked to this project (no ManualBar: a project can't
          birth a sibling project). Only mounts a surface when summoned. */}
      <Animated.View
        style={[styles.dock, dockLiftStyle]}
        pointerEvents="box-none"
      >
        <CaptureComposer cap={cap} projects={projects} />
        <ProjectComposer
          kind={fabKind}
          initialText={starterSeed}
          onClose={closeFabComposer}
          onSubmit={handleFabSubmit}
          onActivityChange={setComposerActive}
          projectId={id}
          activeProjects={projects
            .filter((p) => p.status === "active")
            .map((p) => ({ id: p.id, title: p.title, emoji: p.emoji }))}
          projectName={project.title}
        />
      </Animated.View>
      {fabKind === null ? (
        <>
          <ProjectFab
            isEmpty={isEmpty}
            onAction={(key) => {
              // The FAB always opens the composer blank — starter rows are the
              // only path that seeds it.
              setStarterSeed("");
              setFabKind(key as ProjectComposerKind);
            }}
            onOpenChange={handleFabOpenChange}
          />
        </>
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

  // Notes — session-grouped DiaryNote cards. The group owns the rhythm between
  // its header and its cards; the section supplies the gap between groups.
  notesGroup: {
    gap: tokens.space.sm,
  },
  sessionHeader: {
    letterSpacing: tokens.type.micro.tracking,
    marginTop: tokens.space.sm,
    marginBottom: tokens.space.xs,
  },

  // Header `··` overflow button — matches the back button's hit area.
  overflowBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
  scrim: {
    backgroundColor: tokens.color.scrim.medium,
  },
});
