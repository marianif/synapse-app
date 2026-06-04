import dayjs from "dayjs";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { MoodGlyph } from "@/components/atoms/mood-glyph";
import { ThemedText } from "@/components/atoms/themed-text";
import { MoodSheet, type MoodOption } from "@/components/organisms/mood-sheet";
import { SwipeableRow } from "@/components/organisms/swipeable-row";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useDiary } from "@/hooks/use-diary";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";

import type { DbDiaryEntry, DiaryMood } from "@/lib/types";

// Reflective layer, not an action zone — moods are a calm affective tag, never a
// score. Each carries the closest electric code so the glyph reads at a glance
// without inventing a new token.
const MOODS: { value: DiaryMood; label: string; code: keyof typeof tokens.color.type }[] = [
  { value: "bright", label: "bright", code: "ideas" },
  { value: "calm", label: "calm", code: "someday" },
  { value: "charged", label: "charged", code: "todo" },
  { value: "tired", label: "tired", code: "event" },
  { value: "low", label: "low", code: "bills" },
];

const MOOD_OPTIONS: MoodOption[] = MOODS.map((m) => ({
  value: m.value,
  label: m.label,
  color: tokens.color.type[m.code],
}));

function moodCode(mood: DiaryMood | null): string | null {
  const m = MOODS.find((x) => x.value === mood);
  return m ? tokens.color.type[m.code] : null;
}

/** Group entries by calendar day, preserving the newest-first order. */
function groupByDay(
  entries: DbDiaryEntry[],
): { key: string; label: string; items: DbDiaryEntry[] }[] {
  const out: { key: string; label: string; items: DbDiaryEntry[] }[] = [];
  for (const e of entries) {
    const d = dayjs.unix(e.created_at);
    const key = d.format("YYYY-MM-DD");
    const isToday = d.isSame(dayjs(), "day");
    const isYesterday = d.isSame(dayjs().subtract(1, "day"), "day");
    const label = isToday
      ? "Today"
      : isYesterday
        ? "Yesterday"
        : d.format("dddd, MMM D");
    const last = out[out.length - 1];
    if (last && last.key === key) last.items.push(e);
    else out.push({ key, label, items: [e] });
  }
  return out;
}

export default function DiaryScreen(): React.ReactElement {
  const { colors } = useTheme();
  const { entries, addEntry, removeEntry, refresh } = useDiary();

  const [draft, setDraft] = useState("");
  const [mood, setMood] = useState<DiaryMood | null>(null);
  const [moodSheetOpen, setMoodSheetOpen] = useState(false);

  // Voice capture appends into the draft. We snapshot whatever was already typed
  // when a dictation session starts, then keep the draft = base + live transcript
  // so speech extends the note instead of clobbering it. (Diary is iOS-leaning;
  // the recognizer is a no-op web stub.)
  const { transcript, isRecording, toggleRecording } = useSpeechRecognizer();
  const dictationBase = useRef("");
  const wasRecording = useRef(false);

  useEffect(() => {
    if (isRecording && !wasRecording.current) {
      // session just began — anchor to the current draft (with a trailing space
      // so dictated words don't fuse onto the last typed word).
      const existing = draft.trim();
      dictationBase.current = existing ? existing + " " : "";
    }
    wasRecording.current = isRecording;
    if (isRecording && transcript) {
      setDraft(dictationBase.current + transcript);
    }
  }, [isRecording, transcript, draft]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const canSave = draft.trim().length > 0;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    await addEntry(draft, mood);
    setDraft("");
    setMood(null);
  }, [canSave, addEntry, draft, mood]);

  const activeMoodColor = moodCode(mood);

  const grouped = groupByDay(entries);

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
        {/* Composer — the always-present "what happened" line. Caveat body so it
            reads like a thing you scrawled, not a form field. */}
        <View style={[styles.composer, { backgroundColor: colors.surface }]}>
          <View
            style={[styles.composerEdge, { backgroundColor: colors.type.someday }]}
          />
          <View style={styles.composerBody}>
            <ThemedText type="label" style={{ color: colors.inkMuted }}>
              {dayjs().format("dddd, MMM D").toUpperCase()}
            </ThemedText>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="What happened today…"
              placeholderTextColor={colors.inkMuted}
              multiline
              style={[
                styles.input,
                { color: colors.ink, fontFamily: tokens.type.fontHand.medium },
              ]}
            />

            <View style={styles.toolRow}>
              {/* Mood trigger — opens the bottom sheet. Shows the picked mood's
                  glyph + tint when set, a neutral "add mood" face otherwise. */}
              <Pressable
                onPress={() => setMoodSheetOpen(true)}
                hitSlop={6}
                style={[
                  styles.toolButton,
                  { backgroundColor: colors.surfaceSubtle },
                  mood && activeMoodColor
                    ? { backgroundColor: activeMoodColor + "24" }
                    : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={mood ? `Mood: ${mood}` : "Add a mood"}
              >
                <MoodGlyph
                  mood={mood ?? "calm"}
                  color={mood && activeMoodColor ? activeMoodColor : colors.inkMuted}
                  size={22}
                />
                <ThemedText
                  type="micro"
                  style={{ color: mood && activeMoodColor ? colors.ink : colors.inkMuted }}
                >
                  {mood ? mood.toUpperCase() : "MOOD"}
                </ThemedText>
              </Pressable>

              {/* Voice capture — dictation streams into the draft above. */}
              <Pressable
                onPress={toggleRecording}
                hitSlop={6}
                style={[
                  styles.micButton,
                  { backgroundColor: colors.surfaceSubtle },
                  isRecording && { backgroundColor: colors.feedback.danger + "24" },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isRecording }}
                accessibilityLabel={isRecording ? "Stop recording" : "Record a note"}
              >
                <IconSymbol
                  name={isRecording ? "stop" : "microphone"}
                  size={20}
                  color={isRecording ? colors.feedback.danger : colors.inkMuted}
                />
              </Pressable>

              <Pressable
                onPress={handleSave}
                disabled={!canSave}
                hitSlop={8}
                style={[
                  styles.saveKey,
                  { backgroundColor: colors.accent.clay },
                  !canSave && styles.saveKeyDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save entry"
              >
                <ThemedText type="label" style={{ color: colors.accent.onClay }}>
                  KEEP
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Feed — reverse-chronological, grouped by day. */}
        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText type="title" style={{ color: colors.ink }}>
              Your diary is empty
            </ThemedText>
            <ThemedText
              type="body"
              muted
              style={styles.emptyBody}
            >
              Write a line above. Nothing here is a task — it is just for you,
              kept in order.
            </ThemedText>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.key} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <ThemedText type="label" style={{ color: colors.ink }}>
                  {group.label.toUpperCase()}
                </ThemedText>
                <View
                  style={[styles.dayRule, { backgroundColor: colors.surfaceSubtle }]}
                />
              </View>

              {group.items.map((e) => {
                const code = moodCode(e.mood);
                return (
                  <SwipeableRow key={e.id} onDelete={() => removeEntry(e.id)}>
                    <View style={[styles.note, { backgroundColor: colors.surface }]}>
                      <View style={styles.noteMeta}>
                        <ThemedText type="mono" style={{ color: colors.inkMuted }}>
                          {dayjs.unix(e.created_at).format("HH:mm")}
                        </ThemedText>
                        {e.mood && code ? (
                          <View
                            style={[styles.moodTag, { backgroundColor: code + "24" }]}
                          >
                            <MoodGlyph mood={e.mood} color={code} size={14} />
                            <ThemedText
                              type="micro"
                              style={{ color: colors.inkMuted }}
                            >
                              {e.mood}
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                      <ThemedText
                        style={[styles.noteBody, { color: colors.ink }]}
                      >
                        {e.body}
                      </ThemedText>
                    </View>
                  </SwipeableRow>
                );
              })}
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <MoodSheet
        visible={moodSheetOpen}
        selected={mood}
        options={MOOD_OPTIONS}
        onSelect={setMood}
        onClose={() => setMoodSheetOpen(false)}
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
  // ── Composer ──
  composer: {
    flexDirection: "row",
    borderRadius: tokens.radius.md,
    overflow: "hidden",
  },
  composerEdge: {
    width: 3,
  },
  composerBody: {
    flex: 1,
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  input: {
    fontSize: 22,
    lineHeight: 28,
    minHeight: 56,
    paddingTop: tokens.space.xs,
    textAlignVertical: "top",
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  toolButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 40,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.pill,
  },
  micButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
  },
  saveKey: {
    marginLeft: "auto",
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: tokens.space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.sm,
  },
  saveKeyDisabled: {
    opacity: 0.4,
  },
  // ── Feed ──
  dayGroup: {
    gap: tokens.space.md,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.xs,
  },
  dayRule: {
    flex: 1,
    height: 2,
    borderRadius: tokens.radius.pill,
  },
  note: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  noteMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  moodTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingVertical: 2,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.pill,
  },
  noteBody: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 20,
    lineHeight: 26,
  },
  empty: {
    paddingTop: tokens.space.xxxl,
    gap: tokens.space.sm,
    alignItems: "center",
  },
  emptyBody: {
    textAlign: "center",
    maxWidth: 280,
  },
  bottomSpacer: {
    height: 96,
  },
});
