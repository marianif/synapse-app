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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { WaveformVisualizer } from "@/components/atoms/waveform-bar";
import { DockShell } from "@/components/organisms/dock-shell";
import type {
  LinkSelection,
  LinkableTarget,
} from "@/components/organisms/link-sheet";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { entryKicker, entryTint, tokens, useTheme } from "@/constants/theme";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";
import { useUiPreference } from "@/hooks/use-ui-preference";

interface NotesComposerProps {
  targets: LinkableTarget[];
  onSave: (body: string, selection: LinkSelection) => Promise<void> | void;
  /** Fires whenever the composer transitions between resting and actively
   *  lifted (focused, recording, or with the link menu open), so the screen can
   *  show a backdrop scrim behind the bar — its surface tone otherwise fuses
   *  with the feed cards scrolling behind it once it's the thing being acted on. */
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
  /** Close any floating surface (the link menu) — used by the screen's scrim
   *  tap so an outside press dismisses the menu even when the input is unfocused. */
  dismiss: () => void;
}

const LAST_TARGET_KEY = "notes.last-target";

/** The persisted link key. `"free"` is an unlinked note; otherwise it encodes the
 *  target kind + id so the composer can remember where the last note was filed. */
function isTargetKey(value: string | null): value is string {
  return (
    value === "free" ||
    (typeof value === "string" &&
      (value.startsWith("project:") || value.startsWith("idea:")))
  );
}

function selectionToKey(selection: LinkSelection): string {
  if (!selection) return "free";
  return `${selection.kind}:${selection.id}`;
}

function keyToSelection(key: string, targets: LinkableTarget[]): LinkSelection {
  if (key.startsWith("project:")) {
    const id = key.slice("project:".length);
    return targets.some((t) => t.kind === "project" && t.id === id)
      ? { kind: "project", id }
      : null;
  }
  if (key.startsWith("idea:")) {
    const id = key.slice("idea:".length);
    return targets.some((t) => t.kind === "idea" && t.id === id)
      ? { kind: "idea", id }
      : null;
  }
  return null;
}

/**
 * The notes tab's command bar — a minimal capture surface armed for the "note"
 * kind, laid out after the capture console: one thought row (mark → text → mic)
 * over a chip rail that carries the note's relation plus the file key. The
 * relation is filed inline through a floating option rail instead of a modal
 * LinkSheet, so writing a note never detours through a second screen.
 *
 * The shell (DockShell) keeps the neutral action slab (`accent.clay`) so the bar
 * reads as chrome, not as another note card — notes have no entry-code color, so
 * all ink/icons sit on-slab (`accent.onClay`).
 */
export const NotesComposer = forwardRef<
  NotesComposerHandle,
  NotesComposerProps
>(function NotesComposer(
  { targets, onSave, onActivityChange, tabBarHeight },
  ref,
): React.ReactElement {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const { transcript, startRecording, stopRecording } = useSpeechRecognizer();

  // The note's relation is remembered between saves (and app launches) so
  // consecutive notes can be filed to the same target without re-picking.
  const [targetKey, setTargetKey, preferenceLoaded] = useUiPreference(
    LAST_TARGET_KEY,
    "free",
    isTargetKey,
  );
  const selection = keyToSelection(targetKey, targets);

  useEffect(() => {
    onActivityChange?.(isFocused || isRecording || menuOpen);
  }, [isFocused, isRecording, menuOpen, onActivityChange]);

  // If the remembered target was deleted while the app was closed, fall back
  // to a free note once the preference has loaded.
  useEffect(() => {
    if (!preferenceLoaded) return;
    if (targetKey !== "free" && selection === null) setTargetKey("free");
  }, [preferenceLoaded, targetKey, selection, setTargetKey]);

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

  const onSlab = colors.accent.onClay;
  const onSlabMuted = `${onSlab}A6`;
  const hasText = draft.trim().length > 0;

  // Voice: the live transcript streams into the draft while recording.
  useEffect(() => {
    if (isRecording && transcript) setDraft(transcript);
  }, [transcript, isRecording]);

  const handleStartRecording = (): void => {
    setMenuOpen(false);
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
    dismiss: () => setMenuOpen(false),
  }));

  const handleStopRecording = (): void => {
    void stopRecording().then(() => {
      setIsRecording(false);
    });
  };

  const handleCancelRecording = (): void => {
    void stopRecording().then(() => {
      setIsRecording(false);
      setDraft("");
    });
  };

  // One tap files: the chip rail IS the classification, so there is no modal
  // beat between writing and saving. The chosen relation is remembered.
  const handleFile = async (): Promise<void> => {
    const text = draft.trim();
    if (!text) return;
    setMenuOpen(false);
    await onSave(text, selection);
    setDraft("");
  };

  const menuEntering = reduced
    ? undefined
    : FadeInDown.duration(tokens.motion.duration.fast);
  const menuExiting = reduced
    ? undefined
    : FadeOutUp.duration(tokens.motion.duration.fast);

  return (
    <Animated.View style={[styles.composerContainer, liftStyle]}>
      <DockShell
        register="slab"
        radius={tokens.radius.lg}
        contentKey={isRecording ? "notes-composer-recording" : "notes-composer"}
        overlay={
          menuOpen ? (
            <Animated.View
              entering={menuEntering}
              exiting={menuExiting}
              style={styles.menu}
            >
              <View style={styles.menuBlock}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.menuRail}
                  keyboardShouldPersistTaps="handled"
                >
                  <LinkOption
                    label="Free note"
                    icon="Note2"
                    selected={selection === null}
                    onPress={() => {
                      setTargetKey(selectionToKey(null));
                      setMenuOpen(false);
                    }}
                  />
                    {targets.map((target) => (
                      <LinkOption
                        key={`${target.kind}:${target.id}`}
                        label={`${target.emoji ? `${target.emoji} ` : ""}${target.title}`}
                        icon={target.kind === "idea" ? "Sparkles" : "Folder"}
                      semantic={target.kind === "idea" ? "idea" : undefined}
                      selected={
                        selection !== null &&
                        selection.kind === target.kind &&
                        selection.id === target.id
                      }
                      onPress={() => {
                        // The menu only offers relations a note can carry
                        // (idea or project); other kinds never reach here.
                        if (
                          target.kind === "idea" ||
                          target.kind === "project"
                        ) {
                          setTargetKey(
                            selectionToKey({
                              kind: target.kind,
                              id: target.id,
                            }),
                          );
                        }
                        setMenuOpen(false);
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            </Animated.View>
          ) : undefined
        }
      >
        {isRecording ? (
          <View style={styles.recordingStage}>
            <Pressable
              onPress={handleCancelRecording}
              accessibilityRole="button"
              accessibilityLabel="Discard recording"
              hitSlop={6}
              style={({ pressed }) => [
                styles.roundButton,
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol name="X" size={20} color={onSlab} />
            </Pressable>
            <View style={styles.recordingCenter}>
              {transcript ? (
                <Text
                  style={[styles.transcript, { color: onSlab }]}
                  numberOfLines={1}
                >
                  {transcript}
                </Text>
              ) : (
                <WaveformVisualizer barCount={9} color={onSlab} />
              )}
            </View>
            <Pressable
              onPress={handleStopRecording}
              accessibilityRole="button"
              accessibilityLabel="Save recording"
              hitSlop={6}
              style={({ pressed }) => [
                styles.primaryRound,
                { backgroundColor: onSlab },
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol
                name="ArrowRight"
                size={20}
                color={colors.accent.clay}
              />
            </Pressable>
          </View>
        ) : (
          <View style={styles.console}>
            <View style={styles.thoughtRow}>
              <View style={styles.signalMark}>
                <IconSymbol name="Pen" size={18} color={onSlab} />
              </View>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onSubmitEditing={() => void handleFile()}
                placeholder="Write a note, capture a thought…"
                placeholderTextColor={onSlabMuted}
                selectionColor={onSlab}
                returnKeyType="done"
                submitBehavior="submit"
                accessibilityLabel="Write a diary note"
                multiline
                style={[styles.input, { color: onSlab }]}
              />
              <Pressable
                onPress={handleStartRecording}
                accessibilityRole="button"
                accessibilityLabel="Capture by voice"
                hitSlop={6}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: `${onSlab}22` },
                  pressed && styles.pressed,
                ]}
              >
                <IconSymbol name="Microphone" size={18} color={onSlab} />
              </Pressable>
            </View>

            <View style={styles.rail}>
              <ScrollView
                horizontal
                style={styles.contextScroll}
                contentContainerStyle={styles.contextRail}
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <ContextChip
                  label={linkLabel(selection, targets)}
                  icon={linkIcon(selection)}
                  onPress={() => setMenuOpen((open) => !open)}
                />
              </ScrollView>

              <View style={styles.actionGroup}>
                {hasText ? (
                  <Pressable
                    onPress={() => void handleFile()}
                    accessibilityRole="button"
                    accessibilityLabel="Save note"
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.primaryRound,
                      { backgroundColor: onSlab },
                      pressed && styles.pressed,
                    ]}
                  >
                    <IconSymbol
                      name="ArrowRight"
                      size={20}
                      color={colors.accent.clay}
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        )}
      </DockShell>
    </Animated.View>
  );
});

function linkLabel(
  selection: LinkSelection,
  targets: LinkableTarget[],
): string {
  if (!selection) return "Free note";
  const target = targets.find(
    (t) => t.kind === selection.kind && t.id === selection.id,
  );
  return target?.title ?? "Free note";
}

function linkIcon(selection: LinkSelection): IconSymbolName {
  if (selection?.kind === "project") return "Folder";
  if (selection?.kind === "idea") return "Sparkles";
  return "Note2";
}

function ContextChip({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconSymbolName;
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  const onSlab = colors.accent.onClay;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Relate to ${label}`}
      style={({ pressed }) => [
        styles.contextChip,
        { backgroundColor: `${onSlab}22` },
        pressed && styles.pressed,
      ]}
    >
      <IconSymbol name={icon} size={14} color={onSlab} />
      <Text
        style={[styles.contextChipLabel, { color: onSlab }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <IconSymbol name="ChevronDown" size={13} color={onSlab} />
    </Pressable>
  );
}

function LinkOption({
  label,
  icon,
  selected,
  semantic,
  onPress,
}: {
  label: string;
  icon: IconSymbolName;
  selected: boolean;
  semantic?: "idea";
  onPress: () => void;
}): React.ReactElement {
  const { colors, scheme } = useTheme();
  const backgroundColor =
    selected && semantic === "idea"
      ? entryTint("idea", scheme)
      : selected
        ? colors.accent.clay
        : colors.surfaceSubtle;
  const foreground =
    selected && semantic === "idea"
      ? entryKicker("idea", scheme)
      : selected
        ? colors.accent.onClay
        : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.menuOption,
        { backgroundColor },
        pressed && styles.pressed,
      ]}
    >
      <IconSymbol name={icon} size={14} color={foreground} />
      <Text
        style={[styles.menuOptionLabel, { color: foreground }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  composerContainer: {
    width: "100%",
  },
  console: {
    padding: tokens.space.xs,
    gap: tokens.space.xs,
  },
  thoughtRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.sm,
  },
  signalMark: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    // Cap the multiline field so a long paste grows to a bounded block, then
    // scrolls internally — the composer bar never balloons to fill the screen.
    maxHeight: tokens.space.xxxl * 2,
    paddingVertical: 0,
    textAlignVertical: "center",
    fontFamily: tokens.type.fontInter.medium,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
  },
  rail: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
  },
  contextScroll: {
    flex: 1,
    minWidth: 0,
  },
  contextRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  contextChip: {
    minHeight: 32,
    maxWidth: 180,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  contextChipLabel: {
    flexShrink: 1,
    fontFamily: tokens.type.fontInter.medium,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.xs,
  },
  menuBlock: {
    gap: tokens.space.xs,
  },
  menuRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingVertical: tokens.space.xs,
  },
  menuOption: {
    minHeight: 40,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs,
  },
  menuOptionLabel: {
    fontFamily: tokens.type.fontInter.medium,
    fontSize: tokens.type.body.size,
    lineHeight: tokens.type.body.lineHeight,
  },
  recordingStage: {
    minHeight: tokens.size.dockBar,
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
    fontFamily: tokens.type.fontInter.medium,
    fontSize: tokens.type.item.size,
    lineHeight: tokens.type.item.lineHeight,
  },
  primaryRound: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  roundButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.62,
  },
});
