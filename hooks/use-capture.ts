import { useCallback, useMemo, useRef, useState } from "react";

import type {
  CaptureResolution,
  LinkableIdea,
} from "@/components/molecules/capture-resolver";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { useSpeechRecognizer } from "@/hooks/use-speech-recognizer";
import { splitCapture } from "@/lib/capture";

import type { EntryType } from "@/lib/types";

/**
 * The shared capture state-machine. Lifted from `app/(tabs)/index.tsx` so the
 * home AND the project surface can mount the same dock with the same grammar
 * — capture is the brand's headline verb (PRODUCT.md principle 1: ONE
 * trigger, no second add-path) and duplicating its state machine across
 * screens would let one drift from the other.
 *
 * Owns:
 *   - composer / recorder / resolver mutual-exclusivity (the dock shows ONE
 *     surface at a time)
 *   - the pending-thought hand-off from bar → resolver
 *   - voice transcript piping through speech recognition
 *   - the resolveCapture switch that turns a CaptureResolution into the
 *     right createEntry / addDiaryEntry call
 *
 * What it doesn't own (callers handle):
 *   - widget deep-link arming (home-only: setComposerOpen/setRecording from
 *     route params; the hook exposes the setters)
 *   - the manual project-creation bar (home-only at the moment; lives in the
 *     same dock space but is a different verb)
 *
 * Pre-locked attribution:
 *   - lockedProjectId, when set, threads through to:
 *       a) every createEntry (todo/deadline) so the resolved entry is
 *          pre-filed under the project; AND
 *       b) the resolver itself (via `lockedProjectId` prop) so the PROJECT
 *          picker row is hidden — the attribution is implied by the surface
 *          the capture started from.
 *     A "note" or "note-on" resolution under a locked project also pre-fills
 *     `linked_project_id` on the diary entry, so reflections stay with the
 *     project they were written about.
 */
/** A screen's own capture surface, driven by the tab-bar pen key while that
 *  screen is focused (tap → focus, long-press → voice). */
export interface CaptureTarget {
  focus: () => void;
  startVoice: () => void;
}

export interface UseCaptureOptions {
  /** When set, every captured entry is pre-attributed to this project and
   *  the resolver hides its PROJECT picker. */
  lockedProjectId?: string | null;
}

export interface UseCaptureReturn {
  // ── Surfaces (mutually exclusive in the dock) ──────────────────────────
  /** Text composer visible. Summoned by a pen-tap; closes on empty blur. */
  composerOpen: boolean;
  setComposerOpen: (open: boolean) => void;
  /** Voice recording in progress; the bar shows the live waveform. */
  isRecording: boolean;
  /** Resolver is showing because a thought is pending; null = no thought. */
  pendingThought: string | null;
  /** Inside the resolver: the note-rail (free + linkable) is expanded. */
  picking: boolean;
  setPicking: (picking: boolean) => void;
  /**
   * A type the resolver should open pre-selected on. Set when capture is
   * summoned from a type-specific surface (e.g. an empty "No deadlines yet"
   * stream) so the resolver skips straight to that door instead of the neutral
   * chooser — the user already said what flavour they want. `null` = the
   * neutral resolver (the pen, the widget deep-link). Cleared on resolve /
   * dismiss so the next capture starts neutral again.
   */
  seedType: EntryType | null;
  setSeedType: (type: EntryType | null) => void;

  // ── Chrome geometry (shared so surfaces rest on the REAL bar, not a guess) ─
  /** The tab bar's measured height, reported via onLayout by the tab bar and
   *  consumed by any surface that rests above it (global dock, notes composer)
   *  so nobody hardcodes an estimate that drifts per device. 0 until measured. */
  tabBarHeight: number;
  setTabBarHeight: (height: number) => void;

  /**
   * When true, the global dock stays mounted and resting even while idle
   * (no composer/recording/pending-thought) — set by the home screen on
   * focus so the capture affordance is always visible there, unfocused,
   * instead of appearing only after a tap. Other screens leave this false,
   * so the dock keeps its default on-demand (mount-on-tap) behavior.
   */
  dockAlwaysVisible: boolean;
  setDockAlwaysVisible: (visible: boolean) => void;
  /**
   * The dock registers its focus handler here once mounted, so `requestCapture`
   * can focus the TextInput when the dock is already resting visible (home) —
   * autoFocus alone only fires on mount, not on a later pen-tap.
   */
  registerDockFocus: (focus: () => void) => () => void;

  // ── Screen-owned capture (the pen key delegates instead of opening) ─────
  /**
   * A screen with its OWN composer (e.g. the notes tab) registers handlers
   * here so the tab-bar pen key drives THAT composer instead of raising the
   * neutral global dock — one pen key, but it means "put something in HERE"
   * on a surface that owns its own input. `focus` handles a tap, `startVoice`
   * a long-press. Returns an unregister fn; the screen calls it on blur/unmount
   * so the pen key falls back to the global dock.
   */
  registerCaptureTarget: (target: CaptureTarget) => () => void;
  /**
   * The tab bar calls this on pen-tap. If a screen has registered a target,
   * its focus handler runs (and the global dock stays closed); otherwise this
   * opens the neutral global dock. Route-awareness lives in whoever registers,
   * not in the chrome.
   */
  requestCapture: () => void;
  /**
   * The tab bar calls this on pen long-press. If a screen owns capture, its
   * voice handler runs; otherwise the neutral global recorder arms.
   */
  requestVoiceCapture: () => void;

  // ── Voice piping ───────────────────────────────────────────────────────
  transcript: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  /** Stop recording AND discard the transcript — used by the dock's cancel. */
  cancelRecording: () => Promise<void>;

  // ── Bar → resolver hand-off ────────────────────────────────────────────
  /** A thought arrives from the bar (typed or spoken); surface the resolver. */
  capture: (text: string) => void;
  /** The resolver commits a destination → create the right row. */
  resolveCapture: (resolution: CaptureResolution) => void;
  /** Discard the pending thought without filing it. */
  dismissPending: () => void;

  // ── Resolver inputs ────────────────────────────────────────────────────
  /** Recent ideas (cap 8) the user can file a note ON. */
  recentIdeas: LinkableIdea[];
  /** The pre-locked project, if any — pass straight to CaptureResolver. */
  lockedProjectId: string | null;
}

/** Cap on the "note on…" idea offering. Newest-first; capture is a 5-second
 *  decision, not a browse — short list keeps it that way. */
const RECENT_IDEAS_CAP = 8;

export function useCapture(
  options: UseCaptureOptions = {},
): UseCaptureReturn {
  const { lockedProjectId = null } = options;

  const { entries, createEntry } = useDatabase();
  const { addEntry: addDiaryEntry } = useDiary();

  const { transcript, startRecording, stopRecording } = useSpeechRecognizer();

  const [composerOpen, setComposerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingThought, setPendingThought] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [seedType, setSeedType] = useState<EntryType | null>(null);
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const [dockAlwaysVisible, setDockAlwaysVisible] = useState(false);

  // The mounted dock parks its focus handler here (a ref, not state — the
  // dock re-registers on every mount, and this must never trigger a re-render
  // of the tab layout that owns this hook).
  const dockFocus = useRef<(() => void) | null>(null);
  const registerDockFocus = useCallback(
    (focus: () => void): (() => void) => {
      dockFocus.current = focus;
      return () => {
        if (dockFocus.current === focus) dockFocus.current = null;
      };
    },
    [],
  );

  // Recent ideas offered under "Note on…". Capped + newest-first; reading
  // off the in-memory entries (single source of truth) keeps this fresh
  // without a re-fetch on every capture.
  const recentIdeas: LinkableIdea[] = useMemo(
    () =>
      entries
        .filter((e) => e.type === "idea")
        .slice(0, RECENT_IDEAS_CAP)
        .map((e) => ({ id: e.id, title: e.title })),
    [entries],
  );

  // A screen that owns its own composer parks a focus handler here. Held in a
  // ref (not state) so registering never re-renders the tab layout, and so the
  // pen key always reads the latest handler without a stale closure.
  const captureTarget = useRef<CaptureTarget | null>(null);

  const registerCaptureTarget = useCallback(
    (target: CaptureTarget): (() => void) => {
      captureTarget.current = target;
      return () => {
        // Only clear if we're still the registered target — guards against a
        // late unmount stomping a newer screen's registration.
        if (captureTarget.current === target) captureTarget.current = null;
      };
    },
    [],
  );

  const requestCapture = useCallback((): void => {
    // A screen with its own composer wins — focus it, leave the global dock
    // closed. Otherwise fall back to the neutral global dock.
    if (captureTarget.current) {
      captureTarget.current.focus();
      return;
    }
    // The dock is already resting visible (home) — focus its input instead
    // of re-opening it, since it's already open in the idle sense.
    if (dockAlwaysVisible && dockFocus.current) {
      dockFocus.current();
      return;
    }
    setComposerOpen(true);
  }, [dockAlwaysVisible]);

  const requestVoiceCapture = useCallback((): void => {
    if (captureTarget.current) {
      captureTarget.current.startVoice();
      return;
    }
    // No screen owns capture — arm the neutral global recorder (same as
    // handleStartRecording below, inlined to avoid a forward reference).
    setComposerOpen(false);
    setIsRecording(true);
    void startRecording();
  }, [startRecording]);

  const capture = useCallback((text: string): void => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPicking(false);
    setPendingThought(trimmed);
  }, []);

  const resolveCapture = useCallback(
    (resolution: CaptureResolution): void => {
      const text = pendingThought;
      setPendingThought(null);
      setPicking(false);
      setSeedType(null);
      if (!text) return;
      const { title, notes } = splitCapture(text);
      switch (resolution.kind) {
        case "idea":
          createEntry({
            title,
            type: "idea",
            notes,
            // An idea captured INSIDE a project belongs to that project too —
            // it's the project's thinking. The shelf's pull-in is the path
            // out if the user later decides otherwise.
            projectId: lockedProjectId ?? undefined,
          }).catch((err) => console.error("Failed to capture idea:", err));
          break;
        case "todo":
          createEntry({
            title,
            type: "todo",
            notes,
            scheduledDate: resolution.scheduledDate,
            scheduledTime: resolution.scheduledTime,
            // Lock wins — resolver hides the picker when locked, so its
            // resolution.projectId is always the seeded value anyway, but
            // be explicit in case a future call site forgets to pass the
            // lock through to the resolver.
            projectId: lockedProjectId ?? resolution.projectId,
          }).catch((err) => console.error("Failed to capture todo:", err));
          break;
        case "deadline":
          createEntry({
            title,
            type: "deadline",
            notes,
            dueDate: resolution.dueDate,
            dueTime: resolution.dueTime,
            dueRange: resolution.dueRange,
            projectId: lockedProjectId ?? resolution.projectId,
          }).catch((err) => console.error("Failed to capture deadline:", err));
          break;
        case "note":
          addDiaryEntry(text, null, null, lockedProjectId ?? null).catch(
            (err) => console.error("Failed to file diary note:", err),
          );
          break;
        case "note-on":
          addDiaryEntry(
            text,
            null,
            resolution.entryId,
            lockedProjectId ?? null,
          ).catch((err) =>
            console.error("Failed to file linked diary note:", err),
          );
          break;
      }
    },
    [pendingThought, addDiaryEntry, createEntry, lockedProjectId],
  );

  const handleStartRecording = useCallback(async (): Promise<void> => {
    setIsRecording(true);
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async (): Promise<void> => {
    await stopRecording();
    setIsRecording(false);
    capture(transcript);
  }, [stopRecording, transcript, capture]);

  const handleCancelRecording = useCallback(async (): Promise<void> => {
    await stopRecording();
    setIsRecording(false);
  }, [stopRecording]);

  const dismissPending = useCallback((): void => {
    setPendingThought(null);
    setPicking(false);
    setSeedType(null);
  }, []);

  // Closing the composer drops any pending seed — a seed only lives for the
  // capture it was armed for. If the user abandons the composer empty (blur),
  // the next neutral capture must start neutral, not inherit a stale flavour.
  const handleSetComposerOpen = useCallback((open: boolean): void => {
    setComposerOpen(open);
    if (!open) setSeedType(null);
  }, []);

  return {
    composerOpen,
    setComposerOpen: handleSetComposerOpen,
    isRecording,
    pendingThought,
    picking,
    setPicking,
    transcript,
    startRecording: handleStartRecording,
    stopRecording: handleStopRecording,
    cancelRecording: handleCancelRecording,
    capture,
    resolveCapture,
    dismissPending,
    seedType,
    setSeedType,
    tabBarHeight,
    setTabBarHeight,
    dockAlwaysVisible,
    setDockAlwaysVisible,
    registerDockFocus,
    registerCaptureTarget,
    requestCapture,
    requestVoiceCapture,
    recentIdeas,
    lockedProjectId,
  };
}
