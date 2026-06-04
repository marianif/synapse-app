import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { DiaryComposer } from "@/components/molecules/diary-composer";
import {
  DiaryFilterBar,
  type DiaryMacro,
} from "@/components/molecules/diary-filter-bar";
import { DiaryFeed } from "@/components/organisms/diary-feed";
import { LinkSheet, type LinkableIdea } from "@/components/organisms/link-sheet";
import { tokens } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";

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

  const linkedTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of boardEntries) map[e.id] = e.title;
    return map;
  }, [boardEntries]);

  const ideas: LinkableIdea[] = useMemo(
    () =>
      boardEntries
        .filter((e) => e.type === "idea")
        .map((e) => ({ id: e.id, title: e.title })),
    [boardEntries],
  );

  // Apply the active filter. An idea filter wins over the macro bucket.
  const visibleEntries = useMemo(() => {
    if (ideaId) return entries.filter((n) => n.linked_entry_id === ideaId);
    if (macro === "linked") return entries.filter((n) => n.linked_entry_id);
    if (macro === "free") return entries.filter((n) => !n.linked_entry_id);
    return entries;
  }, [entries, ideaId, macro]);

  const ideaLabel = ideaId ? linkedTitles[ideaId] ?? "Idea" : null;

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
        <DiaryComposer ideas={ideas} onSave={handleSave} />

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
      </ScrollView>

      <LinkSheet
        visible={ideaSheetOpen}
        selected={ideaId}
        ideas={ideas}
        onSelect={(id) => {
          setIdeaId(id);
          // Picking "Free note" (null) in the filter context means: show free.
          if (id === null) setMacro("free");
        }}
        onClose={() => setIdeaSheetOpen(false)}
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
  bottomSpacer: {
    height: 96,
  },
});
