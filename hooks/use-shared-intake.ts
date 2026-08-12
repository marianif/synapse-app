import { ExtensionStorage } from "@bacons/apple-targets";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

/** Must match `appGroup` in targets/share/ShareViewController.swift. */
const APP_GROUP = "group.dev.the-wedge.synapse-app";
/** Must match `payloadKey` in targets/share/ShareViewController.swift. */
const PAYLOAD_KEY = "shared_incoming";

/**
 * Drains payloads left by the iOS share extension.
 *
 * The extension writes into the App Group container, then asks the host to
 * open the app's `synapseapp` scheme so Synapse foregrounds on the Notes tab
 * (see targets/share/ShareViewController.swift). Shared storage is the durable
 * channel: it has no dependency on the foreground call succeeding, and shares
 * queued while the app was closed all survive.
 *
 * The extension appends to an array, so shares queued while the app was closed
 * all survive. We drain on mount and on every foreground, clearing the key so
 * nothing replays.
 *
 * @param onPayload Called once per shared item, oldest first.
 */
export function useSharedIntake(onPayload: (payload: string) => void): void {
  // Kept in a ref so a caller passing an inline closure doesn't re-subscribe
  // the AppState listener on every render.
  const handler = useRef(onPayload);
  handler.current = onPayload;

  const drain = useCallback((): void => {
    if (Platform.OS !== "ios") return;
    try {
      const storage = new ExtensionStorage(APP_GROUP);
      const raw = storage.get(PAYLOAD_KEY);
      if (!raw) return;

      // `get` returns the bridged value; the extension writes a string array,
      // but tolerate a bare string in case a single value comes back unwrapped.
      const items: string[] = Array.isArray(raw) ? raw : [String(raw)];

      // Clear before dispatching so a throw in a handler can't cause a replay
      // loop on the next foreground.
      storage.remove(PAYLOAD_KEY);

      for (const item of items) {
        const trimmed = typeof item === "string" ? item.trim() : "";
        if (trimmed) handler.current(trimmed);
      }
    } catch (error) {
      console.error("[useSharedIntake] failed to drain shared payloads", error);
    }
  }, []);

  useEffect(() => {
    // Cold start: the share may have happened while the app was terminated.
    drain();

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") drain();
    });
    return () => sub.remove();
  }, [drain]);
}
