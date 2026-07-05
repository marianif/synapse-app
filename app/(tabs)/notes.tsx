import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { NotesComposer } from "@/components/organisms/notes-composer";
import { tokens } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";

import type { DbDiaryEntry } from "@/lib/types";

export default function NotesScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
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
    }, [refresh]),
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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

      {/* Composer pinned to the bottom as a floating action bar — the feed
          scrolls behind it, the KeyboardAvoidingView lifts it above the
          keyboard when the input is focused. */}
      <View style={[styles.composerBar, { paddingBottom: insets.bottom }]}>
        <NotesComposer targets={composerTargets} onSave={handleSave} />
      </View>

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
    </KeyboardAvoidingView>
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
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
  },
  bottomSpacer: {
    height: 120,
  },
});
