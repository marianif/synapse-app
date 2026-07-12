import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import {
  DiaryFilterBar,
  type DiaryMacro,
} from "@/components/molecules/diary-filter-bar";
import { DiaryFeed } from "@/components/organisms/diary-feed";
import {
  LinkSheet,
  type LinkSelection,
  type LinkableTarget,
} from "@/components/organisms/link-sheet";
import {
  NotesComposer,
  type NotesComposerHandle,
} from "@/components/organisms/notes-composer";
import { tokens } from "@/constants/theme";
import { useGlobalCapture } from "@/contexts/global-capture-context";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";

import type { DbDiaryEntry } from "@/lib/types";

export default function NotesScreen(): React.ReactElement {
  const cap = useGlobalCapture();
  const composerRef = useRef<NotesComposerHandle | null>(null);

  // The composer rests just above the tab bar and lifts with the keyboard.
  // We drive this by hand (a Keyboard listener + reanimated translateY) rather
  // than KeyboardAvoidingView: the notes screen sits inside the Tabs navigator
  // UNDER the overlaid tab bar, so KAV mis-measures its own bottom and the
  // composer ends up behind the keyboard. This is the same lift pattern the
  // global CaptureDock uses.
  //
  // `restBottom` is the composer's distance from the SCREEN bottom at rest.
  // The lift then raises it by `keyboardHeight - restBottom` so its bottom edge
  // lands just on top of the keyboard (the tab bar is hidden behind the
  // keyboard anyway, so we don't need to account for it in the lift).
  const restBottom = tokens.space.lg;
  const keyboardLift = useSharedValue(0);
  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      const lift = Math.max(0, e.endCoordinates.height - restBottom);
      keyboardLift.value = withTiming(lift, {
        duration: e.duration || 220,
        easing: Easing.out(Easing.cubic),
      });
    });
    const hide = Keyboard.addListener(hideEvt, (e) => {
      keyboardLift.value = withTiming(0, {
        duration: e?.duration || 200,
        easing: Easing.out(Easing.cubic),
      });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [restBottom, keyboardLift]);

  const composerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardLift.value }],
  }));

  const { entries, addEntry, updateEntry, removeEntry, refresh } = useDiary();
  // Board entries + projects — read-only, used to resolve linked titles for the
  // feed chip and to offer targets in the composer's link sheet. Notes writes
  // never touch these stores.
  const { entries: boardEntries, projects } = useDatabase();

  // Filter state. `macro` is the ALL/LINKED/FREE bucket; `target` narrows to
  // one project/idea and takes over when set (mutually exclusive with macro).
  const [macro, setMacro] = useState<DiaryMacro>("all");
  const [target, setTarget] = useState<LinkSelection>(null);
  const [targetSheetOpen, setTargetSheetOpen] = useState(false);

  // Pull-in: the note the user is re-relating. Tapping a feed row's relatedness
  // chip opens the link sheet pre-selected to the note's current target; picking
  // a new one re-links it (or picking "Free note" unlinks it). This is the notes
  // tab's replacement for the project screen's batch pull-in sheet — the verb
  // lives on each note now, so it works with or without an active project view.
  const [relatingNote, setRelatingNote] = useState<DbDiaryEntry | null>(null);

  // Whether the composer is actively lifted (focused or recording) — drives
  // the backdrop scrim so its surface tone doesn't fuse with the feed cards
  // scrolling behind it once it's the thing being acted on.
  const [composerActive, setComposerActive] = useState(false);

  const ideaTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of boardEntries) if (e.type === "idea") map[e.id] = e.title;
    return map;
  }, [boardEntries]);

  const projectTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) map[p.id] = p.title;
    return map;
  }, [projects]);

  // Count notes per target — one map per kind, indexed by the target id.
  const { ideaNoteCounts, projectNoteCounts } = useMemo(() => {
    const ideas: Record<string, number> = {};
    const projs: Record<string, number> = {};
    for (const n of entries) {
      if (n.linked_entry_id) {
        ideas[n.linked_entry_id] = (ideas[n.linked_entry_id] ?? 0) + 1;
      }
      if (n.linked_project_id) {
        projs[n.linked_project_id] = (projs[n.linked_project_id] ?? 0) + 1;
      }
    }
    return { ideaNoteCounts: ideas, projectNoteCounts: projs };
  }, [entries]);

  // Composer offers ALL projects + ideas (you can start a relation with no
  // notes filed yet), each carrying its current count.
  const composerTargets: LinkableTarget[] = useMemo(() => {
    const p: LinkableTarget[] = projects.map((pr) => ({
      id: pr.id,
      title: pr.title,
      kind: "project",
      noteCount: projectNoteCounts[pr.id],
    }));
    const i: LinkableTarget[] = boardEntries
      .filter((e) => e.type === "idea")
      .map((e) => ({
        id: e.id,
        title: e.title,
        kind: "idea",
        noteCount: ideaNoteCounts[e.id],
      }));
    return [...p, ...i];
  }, [projects, boardEntries, projectNoteCounts, ideaNoteCounts]);

  // The FILTER sheet only shows targets that actually have notes — filtering
  // to an empty target would just yield a blank feed.
  const filterTargets = useMemo(
    () => composerTargets.filter((t) => (t.noteCount ?? 0) > 0),
    [composerTargets],
  );

  const visibleEntries = useMemo(() => {
    if (target) {
      if (target.kind === "idea") {
        return entries.filter((n) => n.linked_entry_id === target.id);
      }
      return entries.filter((n) => n.linked_project_id === target.id);
    }
    if (macro === "linked") {
      return entries.filter((n) => n.linked_entry_id || n.linked_project_id);
    }
    if (macro === "free") {
      return entries.filter((n) => !n.linked_entry_id && !n.linked_project_id);
    }
    return entries;
  }, [entries, target, macro]);

  const targetLabel = target
    ? target.kind === "idea"
      ? (ideaTitles[target.id] ?? "Idea")
      : (projectTitles[target.id] ?? "Project")
    : null;

  const handleSave = useCallback(
    (body: string, selection: LinkSelection) =>
      addEntry(
        body,
        null,
        selection?.kind === "idea" ? selection.id : null,
        selection?.kind === "project" ? selection.id : null,
      ),
    [addEntry],
  );

  const handlePickTarget = useCallback((selection: LinkSelection) => {
    setTarget(selection);
    // Picking "Free note" (null) in the filter context means: show free.
    if (selection === null) setMacro("free");
  }, []);

  // The note-being-related's current link, mapped into the sheet's selection
  // shape so the sheet opens with its existing target highlighted.
  const relatingSelection: LinkSelection = relatingNote
    ? relatingNote.linked_project_id
      ? { kind: "project", id: relatingNote.linked_project_id }
      : relatingNote.linked_entry_id
        ? { kind: "idea", id: relatingNote.linked_entry_id }
        : null
    : null;

  const handleRelink = useCallback(
    (selection: LinkSelection) => {
      if (!relatingNote) return;
      // A note carries at most one link — writing one target clears the other.
      void updateEntry(relatingNote.id, {
        linkedEntryId: selection?.kind === "idea" ? selection.id : null,
        linkedProjectId: selection?.kind === "project" ? selection.id : null,
      });
      setRelatingNote(null);
    },
    [relatingNote, updateEntry],
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
      // While the notes tab is focused, the tab-bar pen key focuses THIS
      // composer instead of raising the neutral global dock — the notes tab
      // owns its own input, so the two capture bars never share the band.
      // Unregister on blur so the pen key falls back to the global dock on
      // every other tab.
      const unregister = cap.registerCaptureTarget({
        focus: () => composerRef.current?.focus(),
        startVoice: () => composerRef.current?.startVoice(),
      });
      return unregister;
    }, [refresh, cap]),
  );

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <DiaryFilterBar
          macro={macro}
          onMacro={(m) => {
            setMacro(m);
            setTarget(null);
          }}
          targetLabel={targetLabel}
          targetKind={target?.kind ?? null}
          onOpenTargetFilter={() => setTargetSheetOpen(true)}
          onClearTarget={() => setTarget(null)}
        />

        <DiaryFeed
          entries={visibleEntries}
          ideaTitles={ideaTitles}
          projectTitles={projectTitles}
          filtered={target !== null || macro !== "all"}
          onRelate={setRelatingNote}
          onDelete={removeEntry}
        />
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Backdrop scrim — only while the composer is actively lifted (focused
          or recording). The bar shares `colors.surface` with the feed cards
          behind it, so without a scrim an active composer visually fuses with
          the content it's floating over. Tapping it blurs/dismisses, same as
          the global capture dock's backdrop. */}
      {composerActive ? (
        <Animated.View
          entering={FadeIn.duration(tokens.motion.duration.fast)}
          exiting={FadeOut.duration(tokens.motion.duration.fast)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable
            style={[StyleSheet.absoluteFill, styles.scrim]}
            onPress={() => Keyboard.dismiss()}
            accessibilityLabel="Dismiss note composer"
          />
        </Animated.View>
      ) : null}

      {/* Composer floating above the tab bar — the feed scrolls behind it, and
          it rides up with the keyboard (hand-driven lift; see keyboardLift
          above). Rests at `restBottom` so it clears the overlaid tab bar. */}
      <Animated.View
        style={[styles.composerBar, { bottom: restBottom }, composerStyle]}
      >
        <NotesComposer
          ref={composerRef}
          targets={composerTargets}
          onSave={handleSave}
          onActivityChange={setComposerActive}
        />
      </Animated.View>

      <LinkSheet
        visible={targetSheetOpen}
        selected={target}
        targets={filterTargets}
        onSelect={handlePickTarget}
        onClose={() => setTargetSheetOpen(false)}
      />

      {/* Pull-in sheet — re-relate a single note. Offers ALL projects & ideas
          (unlike the filter sheet, which only lists targets that already have
          notes), because pulling a note IN is exactly how a target gets its
          first note. */}
      <LinkSheet
        visible={relatingNote !== null}
        selected={relatingSelection}
        targets={composerTargets}
        onSelect={handleRelink}
        onClose={() => setRelatingNote(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
    gap: tokens.space.xxl,
  },
  composerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    // `bottom` is supplied inline (restOffset) so the bar rests above the tab
    // bar; it lifts from there with the keyboard.
    paddingHorizontal: tokens.space.lg,
  },
  bottomSpacer: {
    height: 120,
  },
  scrim: {
    backgroundColor: tokens.color.scrim.medium,
  },
});
