import { StyleSheet, Pressable } from "react-native";

import { CaptureResolver } from "@/components/molecules/capture-resolver";
import { CaptureBar } from "@/components/organisms/capture-bar";
import { DockShell } from "@/components/organisms/dock-shell";
import type { DockRegister } from "@/components/organisms/dock-shell";
import { ManualBar } from "@/components/organisms/manual-bar";
import type { UseCaptureReturn } from "@/hooks/use-capture";
import type { DbProject } from "@/lib/types";

interface CaptureComposerProps {
  /**
   * The capture state-machine driving the dock. Both screens create their own
   * via `useCapture()` (home neutral, project pre-locked) and hand the whole
   * instance here — the composer reads its surfaces off it and never owns state.
   */
  cap: UseCaptureReturn;
  /** Active projects offered in the resolver's PROJECT picker. */
  projects: DbProject[];
  /**
   * Enables the ManualBar (new-project) surface. When provided, a raised manual
   * bar can occupy the dock; the callback creates the project from the typed
   * name. Omit on surfaces that structurally can't birth a project (e.g. inside
   * a project) — no callback, no ManualBar.
   */
  onManualCreate?: (title: string) => void;
  /**
   * Whether the manual bar is currently raised. Only meaningful alongside
   * `onManualCreate`; the owning screen holds this state (the pen key / an
   * "add project" affordance raises it).
   */
  manualOpen?: boolean;
  /** Close the manual bar (blur-empty or an explicit dismiss). */
  onManualDismiss?: () => void;
}

/**
 * Is a dismissible dock surface up? The dock is summoned, so an outside tap
 * should put it away. The resolver is deliberately excluded: a pending thought
 * is a caught idea we don't silently drop on a stray tap — it keeps its own
 * keep/discard controls. Shared by the backdrop and the surface selector so
 * both read "is the dock open?" from one place.
 */
export function isDockDismissible(
  cap: UseCaptureReturn,
  manualOpen = false,
): boolean {
  const showManual = manualOpen && cap.pendingThought === null && !cap.isRecording;
  return showManual || cap.composerOpen || cap.isRecording;
}

/**
 * The outside-tap backdrop — a transparent full-screen catcher that only exists
 * while a dismissible dock surface is up. Tapping off the dock puts it away.
 *
 * This is a SEPARATE element from the surfaces because it must live at the
 * screen level (full-screen), while the surfaces live inside the positioned dock
 * shell. Render this as a sibling BEFORE the dock so the bars stay above it and
 * interactive; the resolver is intentionally not covered (see isDockDismissible).
 */
export function CaptureBackdrop({
  cap,
  manualOpen = false,
  onManualDismiss,
}: {
  cap: UseCaptureReturn;
  manualOpen?: boolean;
  onManualDismiss?: () => void;
}): React.ReactElement | null {
  if (!isDockDismissible(cap, manualOpen)) return null;

  // Dismiss whatever the outside tap landed behind. Recording is cancelled
  // (discards the transcript — same as the recorder's ✕); the composer and
  // manual bar just close.
  const dismiss = (): void => {
    if (cap.isRecording) void cap.cancelRecording();
    onManualDismiss?.();
    cap.setComposerOpen(false);
  };

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={dismiss}
      accessibilityLabel="Dismiss capture"
    />
  );
}

/**
 * The capture dock's surfaces — one instrument that puts a thought on the board.
 * It gathers the three mutually-exclusive surfaces that answer that one
 * intention (the ManualBar new-project line, the pending-thought CaptureResolver,
 * and the always-summonable CaptureBar composer/recorder). The home board and
 * the project surface both raise this exact set; the only differences are details
 * fed in as props — whether a ManualBar can appear, which projects the resolver
 * offers, and (via the `cap` instance) whether attribution is pre-locked to a
 * project.
 *
 * It owns NO capture state: the screen passes a `useCapture()` instance and the
 * composer renders whichever surface that machine has active. It owns no
 * positioning either — the caller wraps it in whatever dock shell it needs (a
 * keyboard-lift transform on home, a KeyboardAvoidingView on the project
 * surface). The outside-tap backdrop is its own screen-level element
 * (`CaptureBackdrop`) rendered as a sibling above the dock, since it must span
 * the screen while these surfaces sit inside the positioned shell.
 *
 * Mutual exclusivity mirrors the dock's grammar: the resolver wins when a thought
 * is pending; the manual bar shows only while raised with nothing pending and no
 * recording; the bar shows for composer/recording.
 */
export function CaptureComposer({
  cap,
  projects,
  onManualCreate,
  manualOpen = false,
  onManualDismiss,
}: CaptureComposerProps): React.ReactElement | null {
  const showManual =
    onManualCreate !== undefined &&
    manualOpen &&
    cap.pendingThought === null &&
    !cap.isRecording;

  // Exactly ONE surface occupies the dock at a time, resolved in priority order:
  // a caught thought (resolver) wins; then a raised new-project line; then the
  // capture bar (composer/recorder). Deriving the active surface here — rather
  // than rendering three conditionals — lets the shell treat the swap as a
  // single body that cross-fades and reshapes in place, the whole point of the
  // morph. Nothing active → the dock isn't summoned, so render nothing.
  let surface: React.ReactElement;
  let register: DockRegister;
  let contentKey: string;

  if (cap.pendingThought !== null) {
    // The resolver rides the committed slab — a caught thought being filed.
    register = "slab";
    contentKey = "resolver";
    surface = (
      <CaptureResolver
        text={cap.pendingThought}
        ideas={cap.recentIdeas}
        projects={projects}
        picking={cap.picking}
        onTogglePicking={() => cap.setPicking(!cap.picking)}
        onResolve={cap.resolveCapture}
        onDismiss={cap.dismissPending}
        lockedProjectId={cap.lockedProjectId}
        seedType={cap.seedType}
      />
    );
  } else if (showManual) {
    // The new-project line — deliberate creation, on the committed slab.
    register = "slab";
    contentKey = "manual";
    surface = (
      <ManualBar
        onCreateProject={onManualCreate!}
        onDismissEmpty={() => onManualDismiss?.()}
      />
    );
  } else if (cap.composerOpen || cap.isRecording) {
    // The capture bar: idle composer reads as CONTENT (the fillable surface);
    // recording flips to the committed slab. The fill shift is the state signal.
    register = cap.isRecording ? "slab" : "surface";
    contentKey = cap.isRecording ? "recording" : "composer";
    surface = (
      <CaptureBar
        onSubmit={cap.capture}
        onVoice={cap.startRecording}
        isRecording={cap.isRecording}
        transcript={cap.transcript}
        onStop={cap.stopRecording}
        onCancel={cap.cancelRecording}
        autoFocus={cap.composerOpen}
        onDismissEmpty={() => cap.setComposerOpen(false)}
      />
    );
  } else {
    return null;
  }

  return (
    <DockShell register={register} contentKey={contentKey}>
      {surface}
    </DockShell>
  );
}
