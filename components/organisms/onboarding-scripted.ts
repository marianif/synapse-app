import { useEffect, useMemo, useState } from "react";

import type { UseCaptureReturn } from "@/hooks/use-capture";
import type { DbProject } from "@/lib/types";

/**
 * A scripted stand-in for the capture state machine, used only by the
 * onboarding showcase. It renders the REAL `CaptureConsole` and drives its
 * read state on a loop — no microphone, no database writes — so the chapter
 * is autonomous. Every action method is a no-op: the showcase is display-only.
 */

const noop = (): void => {};
const noopAsync = async (): Promise<void> => {};

export const MOCK_PROJECTS: DbProject[] = [
  {
    id: "onboarding-project",
    title: "Book project",
    status: "active",
    emoji: "📕",
    description: null,
    is_featured: 0,
    last_opened_at: null,
    created_at: 0,
    updated_at: 0,
  },
];

const TRANSCRIPT = "maybe write a book";
const PHASE_MS = 1600;

/**
 * 0 idle · 1 recording (waveform) · 2 transcript · 3 caught (pending thought).
 */
type Phase = 0 | 1 | 2 | 3;

export function useScriptedCapture(
  active: boolean,
  reduced: boolean,
  delayMs = 0,
): UseCaptureReturn {
  const [phase, setPhase] = useState<Phase>(0);

  useEffect(() => {
    if (!active || reduced) {
      // Reduced motion holds one representative frame: the caught thought.
      setPhase(reduced ? 3 : 0);
      return;
    }
    // Hold the idle readout through the console's cinematic intro, then start
    // the loop so no state churns while the dock is still arriving.
    let interval: ReturnType<typeof setInterval> | null = null;
    const startId = setTimeout(() => {
      interval = setInterval(() => {
        setPhase((current) => ((current + 1) % 4) as Phase);
      }, PHASE_MS);
    }, delayMs);
    return () => {
      clearTimeout(startId);
      if (interval) clearInterval(interval);
    };
  }, [active, reduced, delayMs]);

  return useMemo((): UseCaptureReturn => {
    const isRecording = phase === 1 || phase === 2;
    const transcript = phase === 2 ? TRANSCRIPT : "";
    const pendingThought = phase === 3 ? TRANSCRIPT : null;

    return {
      composerOpen: phase === 0,
      setComposerOpen: noop,
      consoleFocused: false,
      setConsoleFocused: noop,
      isRecording,
      pendingThought,
      picking: false,
      setPicking: noop,
      // Deterministic chip: the console opens on the todo kind.
      seedType: "todo",
      setSeedType: noop,
      tabBarHeight: 0,
      setTabBarHeight: noop,
      dockAlwaysVisible: false,
      setDockAlwaysVisible: noop,
      registerDockFocus: () => noop,
      registerCaptureTarget: () => noop,
      requestCapture: noop,
      requestVoiceCapture: noop,
      transcript,
      startRecording: noopAsync,
      stopRecording: noopAsync,
      cancelRecording: noopAsync,
      capture: noop,
      resolveCapture: noop,
      dismissPending: noop,
      recentIdeas: [],
      lockedProjectId: null,
    };
  }, [phase]);
}
