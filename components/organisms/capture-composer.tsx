import { StyleSheet, Pressable } from "react-native";

import { CaptureResolver } from "@/components/molecules/capture-resolver";
import { CaptureBar } from "@/components/organisms/capture-bar";
import { DockShell } from "@/components/organisms/dock-shell";
import type { DockRegister } from "@/components/organisms/dock-shell";
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
}

/**
 * Is a dismissible dock surface up? The dock is summoned, so an outside tap
 * should put it away. The resolver is deliberately excluded: a pending thought
 * is a caught idea we don't silently drop on a stray tap — it keeps its own
 * keep/discard controls. Shared by the backdrop and the surface selector so
 * both read "is the dock open?" from one place.
 */
export function isDockDismissible(cap: UseCaptureReturn): boolean {
  return cap.composerOpen || cap.isRecording;
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
}: {
  cap: UseCaptureReturn;
}): React.ReactElement | null {
  if (!isDockDismissible(cap)) return null;

  // Dismiss whatever the outside tap landed behind. Recording is cancelled
  // (discards the transcript — same as the recorder's ✕); the composer closes.
  const dismiss = (): void => {
    if (cap.isRecording) void cap.cancelRecording();
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
 * The capture dock — one instrument that catches a thought and files it. Two
 * surfaces answer that one intention: the CaptureBar (compose / record) and the
 * pending-thought CaptureResolver. The home board and the project surface both
 * raise this exact dock; the only differences are details fed in as props —
 * which projects the resolver offers, and (via the `cap` instance) whether
 * attribution is pre-locked to a project.
 *
 * It creates board things only — ideas, notes, todos, deadlines. It does NOT
 * create projects: a project is a macro life-area container, not a caught
 * thought, and naming one is a deliberate act that lives on the Project Shelf
 * (`app/projects.tsx`), not in the mid-thought capture dock.
 *
 * It owns NO capture state: the screen passes a `useCapture()` instance and the
 * composer renders whichever surface that machine has active. It owns no
 * positioning either — the caller wraps it in whatever dock shell it needs (a
 * keyboard-lift transform on home, a KeyboardAvoidingView on the project
 * surface). The outside-tap backdrop is its own screen-level element
 * (`CaptureBackdrop`) rendered as a sibling above the dock, since it must span
 * the screen while these surfaces sit inside the positioned shell.
 *
 * The DockShell wraps whichever surface is active so the dock morphs in place
 * (idle line → recorder → resolver) instead of popping between separate objects.
 */
export function CaptureComposer({
  cap,
  projects,
}: CaptureComposerProps): React.ReactElement | null {
  // Exactly ONE surface occupies the dock at a time: a caught thought (resolver)
  // wins; otherwise the capture bar (composer / recorder). Deriving the active
  // surface here — rather than rendering parallel conditionals — lets the shell
  // treat the swap as a single body that cross-fades and reshapes in place, the
  // whole point of the morph. Nothing active → the dock isn't summoned.
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
