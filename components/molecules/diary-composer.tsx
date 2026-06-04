import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { LinkSheet, type LinkableIdea } from "@/components/organisms/link-sheet";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";

interface DiaryComposerProps {
  /** Ideas this note can be related to (newest-first). */
  ideas: LinkableIdea[];
  /** Persist a kept entry. The composer clears its draft + link on resolve. */
  onSave: (body: string, linkedEntryId: string | null) => Promise<void> | void;
}

/**
 * The always-present "what happened today" line. Owns its own draft, idea-link,
 * and voice-capture state so the diary screen only has to wire persistence —
 * drop it anywhere a quick reflective note is wanted. Caveat body so it reads
 * like a thing you scrawled, not a form field. A note is either related to an
 * idea (the diary's organizing gesture) or free.
 */
export function DiaryComposer({
  ideas,
  onSave,
}: DiaryComposerProps): React.ReactElement {
  const { colors } = useTheme();

  const [draft, setDraft] = useState("");
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);

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

  const canSave = draft.trim().length > 0;
  const linkedIdea = linkedId
    ? ideas.find((i) => i.id === linkedId) ?? null
    : null;

  const handleSave = async (): Promise<void> => {
    if (!canSave) return;
    // If the linked idea vanished (deleted while composing), file it as free.
    await onSave(draft, linkedIdea ? linkedIdea.id : null);
    setDraft("");
    setLinkedId(null);
  };

  return (
    <>
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
            {/* Link trigger — opens the link sheet. Shows the related idea's
                title + amber tint when linked, a neutral "relate" prompt when
                free. This is the diary's organizing gesture (it replaced mood). */}
            <Pressable
              onPress={() => setLinkSheetOpen(true)}
              hitSlop={6}
              style={[
                styles.toolButton,
                { backgroundColor: colors.surfaceSubtle },
                linkedIdea ? { backgroundColor: colors.type.ideas + "24" } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                linkedIdea ? `Related to idea: ${linkedIdea.title}` : "Relate to an idea"
              }
            >
              <SketchIcon
                type="idea"
                size={18}
                color={linkedIdea ? colors.type.ideas : colors.inkMuted}
              />
              <ThemedText
                type="micro"
                numberOfLines={1}
                style={[
                  styles.linkLabel,
                  { color: linkedIdea ? colors.ink : colors.inkMuted },
                ]}
              >
                {linkedIdea ? linkedIdea.title.toUpperCase() : "RELATE"}
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

      <LinkSheet
        visible={linkSheetOpen}
        selected={linkedId}
        ideas={ideas}
        onSelect={setLinkedId}
        onClose={() => setLinkSheetOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
    maxWidth: 200,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.pill,
  },
  linkLabel: {
    flexShrink: 1,
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
});
