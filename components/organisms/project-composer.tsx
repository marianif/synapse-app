import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { WaveformVisualizer } from "@/components/atoms/waveform-bar";
import { DetailsStageView } from "@/components/organisms/details-stage-view";
import { DockShell } from "@/components/organisms/dock-shell";
import {
  entryColor,
  entryKicker,
  tokens,
  useEntryKicker,
  useTheme,
} from "@/constants/theme";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";
import type { DueRange, EntryType } from "@/lib/types";

// The four kinds the ProjectFab can arm. `note` is not an EntryType (it becomes
// a diary entry), so it lives alongside as its own literal.
export type ProjectComposerKind = EntryType | "note";

export interface ProjectComposerSubmitPayload {
  kind: ProjectComposerKind;
  text: string;
  date?: string;
  time?: string;
  dueRange?: DueRange;
}

const KIND_LABELS: Record<ProjectComposerKind, string> = {
  idea: "IDEA",
  todo: "TODO",
  deadline: "DEADLINE",
  note: "NOTE",
};

const KIND_PLACEHOLDERS: Record<ProjectComposerKind, string> = {
  idea: "An idea for this project…",
  todo: "Something to do…",
  deadline: "Something due…",
  note: "A note about this project…",
};

interface ProjectComposerProps {
  kind: ProjectComposerKind | null;
  onClose: () => void;
  onSubmit: (payload: ProjectComposerSubmitPayload) => void;
  /**
   * Seed the draft when the composer opens — used by the empty-project starter
   * rows, which pre-fill a suggested line ("Book a workout") the user can send
   * as-is or edit. Empty string (the FAB's path) opens a blank composer.
   */
  initialText?: string;
  /** Fires whenever the composer becomes active (mounted) or inactive, so the
   *  screen can render a backdrop scrim behind it. */
  onActivityChange?: (active: boolean) => void;
  /** Locked project for todo/deadline capture. When set, the details stage is
   *  shown with the project picker hidden. */
  projectId?: string | null;
  /** Project list required by the details stage shape; unused when a project is
   *  locked, but kept for interface parity. */
  activeProjects?: { id: string; title: string; emoji: string | null }[];
  /** Display name for the locked project (interface parity). */
  projectName?: string;
}

/**
 * A minimal capture surface armed by ProjectFab. For idea and note it stays a
 * single line: text field + mic. For todo and deadline it unfolds into the same
 * details stage the home dock uses (date / time / horizon), with the project
 * locked so the surface never asks the user to re-file.
 */
export function ProjectComposer({
  kind,
  onClose,
  onSubmit,
  initialText,
  onActivityChange,
  projectId,
  activeProjects,
  projectName,
}: ProjectComposerProps): React.ReactElement | null {
  const [stage, setStage] = useState<"input" | "details">("input");

  // Reset the stage whenever the composer is re-armed (kind changed).
  useEffect(() => {
    if (kind !== null) setStage("input");
  }, [kind]);

  // The composer is only meaningful while a flavour is chosen; report activity
  // only in that window so the parent doesn't show a scrim when `kind` is null.
  useEffect(() => {
    if (kind === null) return;
    onActivityChange?.(true);
    return () => onActivityChange?.(false);
  }, [kind, onActivityChange]);

  if (kind === null) return null;
  return (
    // contentKey includes the seed so switching starter rows (todo → idea)
    // remounts the body and re-seeds the draft, rather than keeping the old text.
    <DockShell
      register={stage === "details" ? "slab" : "surface"}
      contentKey={`project-composer-${kind}-${initialText ?? ""}`}
    >
      <ProjectComposerBody
        kind={kind}
        stage={stage}
        setStage={setStage}
        onClose={onClose}
        onSubmit={onSubmit}
        initialText={initialText}
        projectId={projectId}
        activeProjects={activeProjects}
        projectName={projectName}
      />
    </DockShell>
  );
}

function ProjectComposerBody({
  kind,
  stage,
  setStage,
  onClose,
  onSubmit,
  initialText,
  projectId,
  activeProjects,
  projectName,
}: {
  kind: ProjectComposerKind;
  stage: "input" | "details";
  setStage: (stage: "input" | "details") => void;
  onClose: () => void;
  onSubmit: (payload: ProjectComposerSubmitPayload) => void;
  initialText?: string;
  projectId?: string | null;
  activeProjects?: { id: string; title: string; emoji: string | null }[];
  projectName?: string;
}): React.ReactElement {
  const { colors, scheme } = useTheme();
  const [draft, setDraft] = useState(initialText ?? "");
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const { transcript, startRecording, stopRecording } = useSpeechRecognizer();

  const [exact, setExact] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dueRange, setDueRange] = useState<DueRange | null>(null);

  // Details stage only applies to dated kinds when a project is locked.
  const needsDetails =
    (kind === "todo" || kind === "deadline") && projectId != null;

  // Explicit focus after mount — `autoFocus` doesn't fire reliably inside
  // DockShell's opacity cross-fade. Small delay so the fade-in / layout have
  // committed before we ask the OS to raise the keyboard.
  useEffect(() => {
    if (isRecording || stage !== "input") return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isRecording, stage]);

  // Type accent: use the AA-safe kicker shade so the ink reads on the neutral
  // surface fill in both schemes. Note falls back to the muted ink (no code).
  const typeAccent = useEntryKicker(kind === "note" ? "todo" : kind);
  const accent = kind === "note" ? colors.inkMuted : typeAccent;

  const hasText = draft.trim().length > 0;

  useEffect(() => {
    if (isRecording && transcript) setDraft(transcript);
  }, [transcript, isRecording]);

  const handleInputSubmit = (): void => {
    const text = draft.trim();
    if (!text) return;
    if (needsDetails) {
      setStage("details");
      return;
    }
    onSubmit({ kind, text });
    setDraft("");
    onClose();
  };

  const handleCommitDetails = (): void => {
    const text = draft.trim();
    if (!text) return;
    onSubmit({ kind, text, date, time, dueRange: dueRange ?? undefined });
    setDraft("");
    onClose();
  };

  const handleStartRecording = (): void => {
    setIsRecording(true);
    void startRecording();
  };

  const handleStopRecording = (): void => {
    void stopRecording().then(() => {
      setIsRecording(false);
      if (draft.trim()) handleInputSubmit();
    });
  };

  const handleCancelRecording = (): void => {
    void stopRecording().then(() => {
      setIsRecording(false);
      setDraft("");
    });
  };

  if (isRecording) {
    return (
      <View style={styles.recordingStage}>
        <Pressable
          onPress={handleCancelRecording}
          accessibilityRole="button"
          accessibilityLabel="Discard recording"
          style={styles.roundButton}
        >
          <MaterialCommunityIcons name="close" size={20} color={colors.ink} />
        </Pressable>
        <View style={styles.recordingCenter}>
          {transcript ? (
            <ThemedText
              type="item"
              numberOfLines={1}
              style={[styles.transcript, { color: colors.ink }]}
            >
              {transcript}
            </ThemedText>
          ) : (
            <WaveformVisualizer barCount={9} color={accent} />
          )}
        </View>
        <Pressable
          onPress={handleStopRecording}
          accessibilityRole="button"
          accessibilityLabel="Save recording"
          style={[styles.primaryRound, { backgroundColor: accent }]}
        >
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={colors.surface}
          />
        </Pressable>
      </View>
    );
  }

  if (stage === "details" && needsDetails) {
    const datedKind = kind as "todo" | "deadline";
    const onSlab = colors.accent.onClay;
    const detailMuted = `${onSlab}A6`;
    const detailQuiet = `${onSlab}24`;
    const detailRaised = `${onSlab}1F`;
    const detailAccent =
      scheme === "dark"
        ? entryKicker(datedKind, "light")
        : entryColor(datedKind);

    return (
      <DetailsStageView
        selected={datedKind}
        accent={detailAccent}
        muted={detailMuted}
        raised={detailRaised}
        quiet={detailQuiet}
        ink={onSlab}
        scheme={scheme}
        exact={exact}
        setExact={setExact}
        date={date}
        setDate={setDate}
        time={time}
        setTime={setTime}
        dueRange={dueRange}
        setDueRange={setDueRange}
        projectId={projectId ?? null}
        setProjectId={() => {}}
        activeProjects={activeProjects ?? []}
        lockedProjectId={projectId ?? null}
        projectName={projectName ?? ""}
        onBack={() => setStage("input")}
        onDiscard={onClose}
        onCommit={handleCommitDetails}
      />
    );
  }

  return (
    <View style={styles.inputStage}>
      <View style={styles.kickerSlot}>
        <ThemedText
          type="micro"
          style={[styles.kicker, { color: accent }]}
        >
          {KIND_LABELS[kind]}
        </ThemedText>
      </View>
      <TextInput
        ref={inputRef}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={handleInputSubmit}
        placeholder={KIND_PLACEHOLDERS[kind]}
        placeholderTextColor={colors.inkMuted}
        selectionColor={accent}
        returnKeyType="done"
        submitBehavior="submit"
        accessibilityLabel={KIND_PLACEHOLDERS[kind]}
        multiline={kind === "note"}
        style={[styles.input, { color: colors.ink }]}
      />
      {hasText ? (
        <Pressable
          onPress={handleInputSubmit}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Save ${KIND_LABELS[kind].toLowerCase()}`}
          style={({ pressed }) => [
            styles.primaryRound,
            { backgroundColor: accent },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={colors.surface}
          />
        </Pressable>
      ) : (
        <Pressable
          onPress={handleStartRecording}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Capture by voice"
          style={({ pressed }) => [
            styles.secondaryRound,
            { borderColor: accent },
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons name="microphone" size={20} color={accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputStage: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: tokens.space.md,
    paddingRight: tokens.space.xs,
    gap: tokens.space.sm,
  },
  kickerSlot: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  kicker: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.lineHeight,
    letterSpacing: tokens.type.kicker.tracking,
  },
  input: {
    flex: 1,
    paddingVertical: tokens.space.sm,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
    fontFamily: tokens.type.fontInter.medium,
  },
  primaryRound: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryRound: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  roundButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingStage: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.space.sm,
    gap: tokens.space.sm,
  },
  recordingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  transcript: {
    alignSelf: "stretch",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.62,
  },
});
