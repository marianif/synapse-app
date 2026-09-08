import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  DiaryFilterBar,
  type DiaryMacro,
} from "@/components/molecules/diary-filter-bar";
import { DiaryTagRail } from "@/components/molecules/diary-tag-rail";
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
import { useSharedIntake } from "@/hooks/use-shared-intake";
import { countTags } from "@/lib/tags";
import type { TagCount } from "@/lib/tags";

import type { DbDiaryEntry, EntryType } from "@/lib/types";

export default function NotesScreen(): React.ReactElement {
  const cap = useGlobalCapture();
  const router = useRouter();
  const composerRef = useRef<NotesComposerHandle | null>(null);

  // Shared payloads from the iOS share extension. A link shared from Safari
  // arrives as "title\nurl" (or a bare text selection) via the App Group
  // container. We seed the composer so it lands as an editable note the user
  // annotates before saving — sharing IS note-taking, so it flows through the
  // normal composer path rather than a silent write.
  //
  // The share can arrive while the user is on another tab, so we route to notes
  // first and seed once the composer has mounted.
  useSharedIntake((payload) => {
    if (composerRef.current) {
      composerRef.current.seed(payload);
      return;
    }
    router.navigate("/notes");
    pendingShare.current.push(payload);
  });

  // Drains anything queued above once the composer is available.
  const pendingShare = useRef<string[]>([]);
  useEffect(() => {
    if (!composerRef.current || pendingShare.current.length === 0) return;
    const queued = pendingShare.current;
    pendingShare.current = [];
    for (const payload of queued) composerRef.current.seed(payload);
  });

  // The composer rests just above the tab bar and lifts with the keyboard.
  // NotesComposer handles the lift itself (matching CaptureDock), so the screen
  // only positions the bar visually and feeds it the measured tab bar height.
  const TAB_BAR_HEIGHT_FALLBACK = 8 + 52 + 20;

  const { entries, addEntry, updateEntry, removeEntry } = useDiary();
  // Board entries + projects — read-only, used to resolve linked titles for the
  // feed chip and to offer targets in the composer's link sheet. Notes writes
  // never touch these stores.
  const { entries: boardEntries, projects } = useDatabase();

  // Filter state. `macro` is the ALL/LINKED/FREE bucket; `target` narrows to
  // one project/idea and takes over when set (mutually exclusive with macro);
  // `selectedTags` narrows to flat labels — any selected tag matches (OR) —
  // and composes with both.
  const [macro, setMacro] = useState<DiaryMacro>("all");
  const [target, setTarget] = useState<LinkSelection>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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

  // ─── Composer peek: hide-on-down / reveal-on-up ─────────────────────────────
  // The composer rests above the tab bar permanently. Once the user scrolls
  // down into the feed it slides out of the band (Safari-style) to hand content
  // the vertical space back, and the first upward scroll — or landing near the
  // top — brings it back. It is never hidden mid-use: while the composer is
  // focused or recording (composerActive) the bar stays put. Scrolls are read
  // on the UI thread so the slide stays in sync with the feed, never janking.
  const HIDE_AT = 32; // px of downward scroll before the bar yields
  const composerHidden = useSharedValue(false);
  const composerTranslate = useSharedValue(0);
  const composerHideDistance = useSharedValue(
    tokens.size.dockBar + tokens.space.lg,
  );
  const composerActiveFlag = useSharedValue(false);
  const lastScrollY = useSharedValue(0);

  const composerScrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      const dy = y - lastScrollY.value;
      lastScrollY.value = y;
      if (composerActiveFlag.value) return;
      if (!composerHidden.value && y > HIDE_AT && dy > 1) {
        composerHidden.value = true;
        composerTranslate.value = withTiming(composerHideDistance.value, {
          duration: tokens.motion.duration.base,
          easing: Easing.inOut(Easing.cubic),
        });
      } else if (composerHidden.value && (y <= HIDE_AT || dy < -1)) {
        composerHidden.value = false;
        composerTranslate.value = withTiming(0, {
          duration: tokens.motion.duration.base,
          easing: Easing.inOut(Easing.cubic),
        });
      }
    },
  });

  const composerBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: composerTranslate.value }],
  }));

  // The bar slides down by its own height + the gap it rests at — enough for it
  // to exit the tab slot entirely and disappear behind the tab bar's top edge.
  const handleComposerLayout = (e: LayoutChangeEvent): void => {
    composerHideDistance.value = e.nativeEvent.layout.height + tokens.space.lg;
  };

  // Mirror composer activity onto the UI thread so the scroll worklet can skip
  // hiding, and force the bar back into view when it becomes the thing being
  // acted on — never hide an instrument mid-use.
  useEffect(() => {
    composerActiveFlag.value = composerActive;
    if (!composerActive) return;
    composerHidden.value = false;
    composerTranslate.value = withTiming(0, {
      duration: tokens.motion.duration.fast,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [composerActive, composerActiveFlag, composerHidden, composerTranslate]);

  // Titles + types for EVERY board entry (todo / deadline / idea) — so a note
  // linked to any entry from the editor shows its true title and glyph in the
  // feed chip, not just idea-linked ones.
  const entryTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of boardEntries) map[e.id] = e.title;
    return map;
  }, [boardEntries]);

  const entryKinds = useMemo(() => {
    const map: Record<string, EntryType> = {};
    for (const e of boardEntries) map[e.id] = e.type;
    return map;
  }, [boardEntries]);

  // id → owning project, so a note linked to an entry that is itself filed in
  // a project can show that project on its relatedness chip as a breadcrumb.
  const entryProjectIds = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of boardEntries) if (e.project_id) map[e.id] = e.project_id;
    return map;
  }, [boardEntries]);

  const projectTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) map[p.id] = p.title;
    return map;
  }, [projects]);

  // Only projects that actually carry an emoji — the chip falls back to the
  // folder glyph for the rest.
  const projectEmojis = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) if (p.emoji) map[p.id] = p.emoji;
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

  // Distinct tags across ALL notes, with counts — the rail's full vocabulary
  // even while a filter narrows the feed. Sorted by popularity, then alpha.
  const tagCounts: TagCount[] = useMemo(() => countTags(entries), [entries]);

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
    let list = entries;
    // Tag filter composes with the macro/target axes — narrowing by label
    // never silently resets the current project/idea view. Multi-select:
    // any selected tag matches, so adding a tag only widens the feed.
    if (selectedTags.length > 0) {
      list = list.filter((n) =>
        selectedTags.some((t) => n.tags.includes(t)),
      );
    }
    if (target) {
      if (target.kind === "idea") {
        return list.filter((n) => n.linked_entry_id === target.id);
      }
      return list.filter((n) => n.linked_project_id === target.id);
    }
    if (macro === "linked") {
      return list.filter((n) => n.linked_entry_id || n.linked_project_id);
    }
    if (macro === "free") {
      return list.filter((n) => !n.linked_entry_id && !n.linked_project_id);
    }
    return list;
  }, [entries, target, macro, selectedTags]);

  const targetLabel = target
    ? target.kind === "idea"
      ? (entryTitles[target.id] ?? "Idea")
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

  // Tag rail toggle: tap a pill to add it to the filter, tap it again to
  // remove. Multi-select — any selected tag matches, so taps only widen.
  const handleToggleTag = useCallback((t: string) => {
    setSelectedTags((current) =>
      current.includes(t)
        ? current.filter((x) => x !== t)
        : [...current, t],
    );
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
    }, [cap]),
  );

  return (
    <View style={styles.flex}>
      <Animated.ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={composerScrollHandler}
      >
        <View style={styles.filterCluster}>
          <DiaryFilterBar
            macro={macro}
            onMacro={(m) => {
              setMacro(m);
              setTarget(null);
            }}
            targetLabel={targetLabel}
            targetKind={target?.kind ?? null}
            targetCount={filterTargets.length}
            onOpenTargetFilter={() => setTargetSheetOpen(true)}
            onClearTarget={() => setTarget(null)}
          />

          <DiaryTagRail
            tags={tagCounts}
            selected={selectedTags}
            onToggle={handleToggleTag}
          />
        </View>

        <DiaryFeed
          entries={visibleEntries}
          entryTitles={entryTitles}
          entryKinds={entryKinds}
          entryProjectIds={entryProjectIds}
          projectTitles={projectTitles}
          projectEmojis={projectEmojis}
          filtered={
            target !== null || macro !== "all" || selectedTags.length > 0
          }
          onRelate={setRelatingNote}
          onToggleBookmark={(entry) =>
            void updateEntry(entry.id, {
              bookmarked: entry.bookmarked ? 0 : 1,
            })
          }
          onEdit={(entry) =>
            router.push({
              pathname: "/note",
              params: {
                id: entry.id,
                body: entry.body,
                tags: JSON.stringify(entry.tags),
                media: JSON.stringify(entry.media),
                linkedProjectId: entry.linked_project_id ?? "",
                linkedEntryId: entry.linked_entry_id ?? "",
              },
            })
          }
          onDelete={removeEntry}
        />
        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>

      {/* Backdrop scrim — only while the composer is actively lifted (focused
          or recording). The bar now rides the clay slab so it no longer fuses
          with the feed, but the scrim still isolates the active instrument and
          gives the user an outside-tap dismiss target, same as the global
          capture dock's backdrop. */}
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
          it rides up with the keyboard (NotesComposer handles the lift to match
          CaptureDock). Rests `tokens.space.lg` above the tab bar. */}
      <Animated.View
        onLayout={handleComposerLayout}
        style={[styles.composerBar, composerBarStyle, { bottom: tokens.space.lg }]}
      >
        <NotesComposer
          ref={composerRef}
          targets={composerTargets}
          onSave={handleSave}
          onActivityChange={setComposerActive}
          tabBarHeight={cap.tabBarHeight || TAB_BAR_HEIGHT_FALLBACK}
        />
      </Animated.View>

      <LinkSheet
        visible={targetSheetOpen}
        selected={target}
        targets={filterTargets}
        title="BY PROJECT · IDEA"
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
  // The macro row + tag rail read as one filter cluster — tighter inner gap
  // than the content's xxl so the rail hugs its header line.
  filterCluster: {
    gap: tokens.space.md,
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
