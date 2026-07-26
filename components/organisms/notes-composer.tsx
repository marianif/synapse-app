import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/atoms/themed-text";
import { WaveformVisualizer } from "@/components/atoms/waveform-bar";
import { DockShell } from "@/components/organisms/dock-shell";
import {
  LinkSheet,
  type LinkSelection,
  type LinkableTarget,
} from "@/components/organisms/link-sheet";
import { tokens, useTheme } from "@/constants/theme";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";

interface NotesComposerProps {
  targets: LinkableTarget[];
  onSave: (body: string, selection: LinkSelection) => Promise<void> | void;
  /** Fires whenever the composer transitions between resting and actively
   *  lifted (focused or recording), so the screen can show a backdrop scrim
   *  behind the bar — its surface tone otherwise fuses with the feed cards
   *  scrolling behind it once it's the thing being acted on. */
  onActivityChange?: (active: boolean) => void;
  /** Measured height of the overlaid tab bar. The composer visually rests
   *  `tokens.space.lg` above the tab bar, but the keyboard lift is calculated
   *  from the screen bottom, so we need the bar's full height to compute the
   *  correct offset. Matches CaptureDock's restOffset math. */
  tabBarHeight: number;
}

/** Imperative handle so the tab-bar pen key can focus this composer (it's the
 *  notes tab's own input — the pen delegates here instead of the global dock). */
export interface NotesComposerHandle {
  focus: () => void;
  startVoice: () => void;
  /** Pre-fill the draft and focus, so a shared link/text (iOS share sheet →
   *  synapseapp:///notes?shared=…) lands as an editable note the user can
   *  annotate before saving. Appends to any in-progress draft rather than
   *  clobbering it. */
  seed: (text: string) => void;
}

/** Whether the composer is actively lifted — focused for text entry or
 *  recording — vs. resting as an idle bar. Callers use this to decide when to
 *  show a backdrop scrim behind the bar (see notes.tsx). */
export interface NotesComposerActivity {
  active: boolean;
}

/**
 * The notes tab's command bar — a minimal capture surface armed for the "note"
 * kind, styled after ProjectComposer. Unlike the home dock's multi-kind capture,
 * this composer always writes notes and presents the LinkSheet on commit so the
 * note can be filed onto a project, an idea, or left free.
 *
 * The shell (DockShell) carries the scheme-aware neutral surface; the accent is
 * inkMuted — notes have no entry-code color. The bar reads as a single
 * instrument: kicker label → text → send/mic, and swaps to a recording readout
 * (waveform → close / confirm) when the mic is armed.
 */
export const NotesComposer = forwardRef<
  NotesComposerHandle,
  NotesComposerProps
>(function NotesComposer(
  { targets, onSave, onActivityChange, tabBarHeight },
  ref,
): React.ReactElement {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const { transcript, startRecording, stopRecording } = useSpeechRecognizer();

  useEffect(() => {
    onActivityChange?.(isFocused || isRecording);
  }, [isFocused, isRecording, onActivityChange]);

  // The composer lives inside the tab slot, so its visual bottom is only
  // `tokens.space.lg` above the tab bar. But the keyboard reports its height
  // from the screen bottom, below the tab bar. To lift the bar so it lands on
  // top of the keyboard (and not a full tab-bar-height above it), we subtract
  // the bar's full height plus the gap from the keyboard height. The 1.05
  // multiplier matches CaptureDock: it leaves a tiny gap above the keyboard
  // instead of sitting flush against it.
  const restOffset = tabBarHeight + tokens.space.lg;
  const keyboardLift = useSharedValue(0);
  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      const lift = Math.max(0, e.endCoordinates.height - restOffset);
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
  }, [restOffset, keyboardLift]);

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardLift.value * 1.05 }],
  }));

  const accent = colors.inkMuted;
  const hasText = draft.trim().length > 0;

  // Voice: the live transcript streams into the draft while recording.
  useEffect(() => {
    if (isRecording && transcript) setDraft(transcript);
  }, [transcript, isRecording]);

  const handleStartRecording = (): void => {
    setIsRecording(true);
    void startRecording();
  };

  // The tab-bar pen key delegates here while the notes tab is focused: tap →
  // focus the input, long-press → arm this composer's own voice capture. Both
  // stay inside the notes composer so neither ever races the global dock.
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    startVoice: () => handleStartRecording(),
    seed: (text: string) => {
      setDraft((prev) => (prev.trim() ? `${prev}\n${text}` : text));
      inputRef.current?.focus();
    },
  }));

  const handleStopRecording = (): void => {
    void stopRecording().then(() => {
      setIsRecording(false);
      if (draft.trim()) setLinkSheetOpen(true);
    });
  };

  const handleCancelRecording = (): void => {
    void stopRecording().then(() => {
      setIsRecording(false);
      setDraft("");
    });
  };

  const handleSend = (): void => {
    if (!hasText) return;
    Keyboard.dismiss();
    setLinkSheetOpen(true);
  };

  const handleLink = async (selection: LinkSelection): Promise<void> => {
    setLinkSheetOpen(false);
    await onSave(draft, selection);
    setDraft("");
  };

  if (isRecording) {
    return (
      <Animated.View style={[styles.composerContainer, liftStyle]}>
        <DockShell register="surface" contentKey="notes-composer-recording">
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
        </DockShell>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.composerContainer, liftStyle]}>
      <DockShell register="surface" contentKey="notes-composer">
        <View style={styles.inputStage}>
          <View style={styles.kickerSlot}>
            <ThemedText type="micro" style={[styles.kicker, { color: accent }]}>
              NOTE
            </ThemedText>
          </View>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleSend}
            placeholder="Write a note, capture a thought…"
            placeholderTextColor={colors.inkMuted}
            selectionColor={accent}
            returnKeyType="done"
            submitBehavior="submit"
            accessibilityLabel="Write a diary note"
            multiline
            style={[styles.input, { color: colors.ink }]}
          />
          {hasText ? (
            <Pressable
              onPress={handleSend}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Save note"
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
              <MaterialCommunityIcons
                name="microphone"
                size={20}
                color={accent}
              />
            </Pressable>
          )}
        </View>
      </DockShell>

      <LinkSheet
        visible={linkSheetOpen}
        selected={null}
        targets={targets}
        onSelect={handleLink}
        onClose={() => setLinkSheetOpen(false)}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  composerContainer: {
    width: "100%",
  },
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
