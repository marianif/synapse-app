import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { DiaryComposer } from "@/components/molecules/diary-composer";
import { DiaryFeed } from "@/components/organisms/diary-feed";
import { tokens } from "@/constants/theme";
import { useDiary } from "@/hooks/use-diary";

export default function DiaryScreen(): React.ReactElement {
  const { entries, addEntry, removeEntry, refresh } = useDiary();

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
        <DiaryComposer onSave={addEntry} />
        <DiaryFeed entries={entries} onDelete={removeEntry} />
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
