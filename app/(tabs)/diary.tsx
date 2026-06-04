import { useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { DiaryComposer } from "@/components/molecules/diary-composer";
import { DiaryFeed } from "@/components/organisms/diary-feed";
import { type LinkableIdea } from "@/components/organisms/link-sheet";
import { tokens } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";

export default function DiaryScreen(): React.ReactElement {
  const { entries, addEntry, removeEntry, refresh } = useDiary();
  // Action-board entries — read only to resolve linked-idea titles for the
  // feed chip, and to offer ideas in the composer's link sheet. Diary writes
  // never touch this store.
  const { entries: boardEntries } = useDatabase();

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
        <DiaryFeed
          entries={entries}
          linkedTitles={linkedTitles}
          onDelete={removeEntry}
        />
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
