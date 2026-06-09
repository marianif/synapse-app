import { useCallback, useEffect, useRef, useState } from "react";

import { getConfirmSkip, setConfirmSkip } from "@/lib/settings";

import type { ConfirmKeyValue } from "@/lib/settings";

interface UseConfirmOptions {
  /** Stable preference key — the "don't ask again" state is stored under it. */
  confirmKey: ConfirmKeyValue;
}

interface UseConfirmResult {
  /** True while the sheet should be mounted/visible. */
  visible: boolean;
  /** "Don't ask me again" checkbox state, for the sheet. */
  dontAsk: boolean;
  toggleDontAsk: () => void;
  /**
   * Ask to run a destructive action. If the user has previously opted out of
   * the prompt for this key, the action fires immediately; otherwise the sheet
   * opens and the action runs on confirm.
   */
  request: (action: () => void) => Promise<void>;
  /** Fire the pending action (persisting the skip pref if checked). */
  confirm: () => void;
  /** Dismiss without running the action. */
  cancel: () => void;
}

/**
 * Confirmation flow for a single destructive action, with a persisted
 * "don't ask again" preference. Pair with <ConfirmSheet>: spread `visible`,
 * `dontAsk`, `toggleDontAsk`, and wire `confirm`/`cancel`. Call `request(fn)`
 * from the destructive handler — it short-circuits straight to `fn` when the
 * user has opted out, so the sheet never flashes for remembered choices.
 */
export function useConfirm({ confirmKey }: UseConfirmOptions): UseConfirmResult {
  const [visible, setVisible] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  // Cache the persisted skip pref so `request` can decide synchronously after
  // the first read. Re-read on key change.
  const skipRef = useRef<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    skipRef.current = null;
    getConfirmSkip(confirmKey).then((v) => {
      if (alive) skipRef.current = v;
    });
    return () => {
      alive = false;
    };
  }, [confirmKey]);

  const request = useCallback(
    async (action: () => void): Promise<void> => {
      // Prefer the cached value; fall back to a read if the cache hasn't warmed.
      const skip = skipRef.current ?? (await getConfirmSkip(confirmKey));
      skipRef.current = skip;
      if (skip) {
        action();
        return;
      }
      pendingAction.current = action;
      setDontAsk(false);
      setVisible(true);
    },
    [confirmKey],
  );

  const confirm = useCallback((): void => {
    setVisible(false);
    if (dontAsk) {
      skipRef.current = true;
      void setConfirmSkip(confirmKey, true);
    }
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }, [confirmKey, dontAsk]);

  const cancel = useCallback((): void => {
    setVisible(false);
    pendingAction.current = null;
  }, []);

  const toggleDontAsk = useCallback((): void => {
    setDontAsk((v) => !v);
  }, []);

  return { visible, dontAsk, toggleDontAsk, request, confirm, cancel };
}
