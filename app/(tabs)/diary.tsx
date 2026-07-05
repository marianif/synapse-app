import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
} from "react-native-reanimated";

import { DiaryComposer } from "@/components/molecules/diary-composer";
import {
  DiaryFilterBar,
  type DiaryMacro,
} from "@/components/molecules/diary-filter-bar";
import { DiaryFeed } from "@/components/organisms/diary-feed";
import { IdeaConstellation } from "@/components/organisms/idea-constellation";
import {
  LinkSheet,
  type LinkableIdea,
} from "@/components/organisms/link-sheet";
import { tokens } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import {
  TendrilRegistryProvider,
  useTendrilRegistryOwner,
} from "@/hooks/use-tendril-registry";

export default function DiaryScreen(): React.ReactElement {
  const { entries, addEntry, removeEntry, refresh } = useDiary();
  // Action-board entries — read only to resolve linked-idea titles for the
  // feed chip, and to offer ideas in the composer's link sheet. Diary writes
  // never touch this store.
  const { entries: boardEntries } = useDatabase();

  // Filter state. `macro` is the ALL/LINKED/FREE bucket; `ideaId` narrows to one
  // idea's notes and takes over when set (mutually exclusive with macro).
  const [macro, setMacro] = useState<DiaryMacro>("all");
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [ideaSheetOpen, setIdeaSheetOpen] = useState(false);

  const freeNoteCount = useMemo(
    () => entries.filter((n) => !n.linked_entry_id).length,
    [entries],
  );

  const handleSelectIdea = useCallback(
    (id: string | null) => {
      setIdeaId(id);
      if (id !== null) setMacro("all");
    },
    [],
  );

  const handleSelectFree = useCallback(() => {
    setIdeaId(null);
    setMacro("free");
  }, []);

  const linkedTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of boardEntries) map[e.id] = e.title;
    return map;
  }, [boardEntries]);

  // entryId → count of notes filed on it, from the diary store.
  const noteCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of entries) {
      if (n.linked_entry_id) {
        map[n.linked_entry_id] = (map[n.linked_entry_id] ?? 0) + 1;
      }
    }
    return map;
  }, [entries]);

  // Composer offers ALL ideas (you can relate to one with no notes yet), each
  // carrying its current count.
  const ideas: LinkableIdea[] = useMemo(
    () =>
      boardEntries
        .filter((e) => e.type === "idea")
        .map((e) => ({
          id: e.id,
          title: e.title,
          noteCount: noteCounts[e.id],
        })),
    [boardEntries, noteCounts],
  );

  // The FILTER sheet only shows ideas that actually have notes — filtering to an
  // empty idea would just yield a blank feed.
  const ideasWithNotes = useMemo(
    () => ideas.filter((i) => (i.noteCount ?? 0) > 0),
    [ideas],
  );

  // Apply the active filter. An idea filter wins over the macro bucket.
  const visibleEntries = useMemo(() => {
    if (ideaId) return entries.filter((n) => n.linked_entry_id === ideaId);
    if (macro === "linked") return entries.filter((n) => n.linked_entry_id);
    if (macro === "free") return entries.filter((n) => !n.linked_entry_id);
    return entries;
  }, [entries, ideaId, macro]);

  const ideaLabel = ideaId ? (linkedTitles[ideaId] ?? "Idea") : null;

  const handleSave = useCallback(
    (body: string, linkedEntryId: string | null) =>
      addEntry(body, null, linkedEntryId),
    [addEntry],
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Tendril registry — owns scrollY, the strip's bottom edge, and every note
  // row's measured y. Consumed by the constellation to draw amber lines from
  // a selected idea down to its diary notes as the user scrolls.
  const registry = useTendrilRegistryOwner();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      registry.scrollY.value = e.contentOffset.y;
    },
  });

  const onStripLayout = useCallback(
    (y: number, height: number) => {
      registry.registerStripBottom(y + height);
    },
    [registry],
  );

  return (
    <TendrilRegistryProvider value={registry}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={scrollHandler}
          scrollEventThrottle={1}
          ref={(node: unknown) => {
            // Fan the AnimatedRef out to our loose registry ref so DiaryNote
            // can measureLayout against the ScrollView. Callback ref bypasses
            // Animated.ScrollView's strict AnimatedRef typing.
            registry.contentRef.current = node;
          }}
        >
          <DiaryComposer ideas={ideas} onSave={handleSave} />

          <View
            onLayout={(e) => {
              onStripLayout(e.nativeEvent.layout.y, e.nativeEvent.layout.height);
            }}
          >
            <IdeaConstellation
              entries={boardEntries}
              notes={entries}
              selectedIdeaId={ideaId}
              onSelectIdea={handleSelectIdea}
              freeNoteCount={freeNoteCount}
              onSelectFree={handleSelectFree}
            />
          </View>

          <DiaryFilterBar
            macro={macro}
            onMacro={(m) => {
              setMacro(m);
              setIdeaId(null);
            }}
            ideaLabel={ideaLabel}
            onOpenIdeaFilter={() => setIdeaSheetOpen(true)}
            onClearIdea={() => setIdeaId(null)}
          />

          <DiaryFeed
            entries={visibleEntries}
            linkedTitles={linkedTitles}
            filtered={ideaId !== null || macro !== "all"}
            onDelete={removeEntry}
          />
          <View style={styles.bottomSpacer} />
        </Animated.ScrollView>

        <LinkSheet
          visible={ideaSheetOpen}
          selected={ideaId}
          ideas={ideasWithNotes}
          onSelect={(id) => {
            setIdeaId(id);
            // Picking "Free note" (null) in the filter context means: show free.
            if (id === null) setMacro("free");
          }}
          onClose={() => setIdeaSheetOpen(false)}
        />
      </KeyboardAvoidingView>
    </TendrilRegistryProvider>
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
  bottomSpacer: {
    height: 96,
  },
});
