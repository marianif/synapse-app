import { ExtensionStorage } from "@bacons/apple-targets";
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import dayjs from "dayjs";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";

import {
  cancelProjectReturnNotification,
  cancelNotificationForEntry,
  requestNotificationPermissions,
  scheduleEntryNotification,
  scheduleProjectReturnNotification,
} from "@/lib/notifications";
import type { DbEntry } from "@/lib/types";
import { SpeechRecognizerModule } from "@/modules/speech-recognizer";
import * as WatchConnectivity from "@/modules/watch-connectivity";
import type { AppDispatch, RootState } from "@/store";
import {
  createEntry,
  deleteEntry,
  deleteRecurringSeries,
  updateEntry,
  updateEntryStatus,
} from "@/store/thunks/entries";
import {
  deleteProject,
  touchProject,
} from "@/store/thunks/projects";

const storage = new ExtensionStorage("group.dev.the-wedge.synapse-app");

function syncEntriesToWidget(entries: DbEntry[]): void {
  try {
    const widgetEntries = entries.slice(0, 10).map((e) => ({
      id: e.id,
      title: e.title,
      status: e.status,
    }));
    storage.set("widget_entries", widgetEntries);
    ExtensionStorage.reloadWidget("entriesWidget");
  } catch (error) {
    console.error("[store] syncEntriesToWidget failed:", error);
  }
}

export const listenerMiddleware = createListenerMiddleware();

// ─── Widget + Watch context, kept in step with the entries slice ─────────────

listenerMiddleware.startListening({
  predicate: (action) =>
    typeof action.type === "string" && action.type.startsWith("entries/"),
  effect: (_action, api) => {
    const entries = (api.getState() as RootState).entries.entries;
    syncEntriesToWidget(entries);
    if (entries.length > 0) {
      const titles = entries.slice(0, 20).map((e) => e.title);
      WatchConnectivity.updateWatchContext({ phone_notes: titles }).catch(
        (err: unknown) => {
          console.warn(
            "[store] Failed to sync to Watch:",
            err instanceof Error ? err.message : err,
          );
        },
      );
    }
  },
});

// ─── Notifications: schedule on create/update, cancel on delete ──────────────

listenerMiddleware.startListening({
  matcher: isAnyOf(
    createEntry.fulfilled,
    updateEntry.fulfilled,
    updateEntryStatus.fulfilled,
  ),
  effect: async (action) => {
    const entry = (action as unknown as { payload: DbEntry }).payload;
    // Ask for notifications only when a deadline makes the benefit clear.
    if (action.type === createEntry.fulfilled.type && entry.type === "deadline") {
      const granted = await requestNotificationPermissions();
      if (!granted) return;
    }
    // Scheduling remains fire-and-forget so it never blocks a save.
    scheduleEntryNotification(entry).catch((err) => {
      console.warn("[store] scheduleEntryNotification failed:", err);
    });
  },
});

listenerMiddleware.startListening({
  matcher: isAnyOf(deleteEntry.fulfilled, deleteRecurringSeries.fulfilled),
  effect: (action) => {
    cancelNotificationForEntry(
      (action as unknown as { payload: string }).payload,
    ).catch((err) => {
      console.warn("[store] cancelNotificationForEntry failed:", err);
    });
  },
});

// ─── Project return invitations ──────────────────────────────────────────────

listenerMiddleware.startListening({
  actionCreator: touchProject.fulfilled,
  effect: async (action, api) => {
    const { id, at } = action.payload;
    if (at === null) return;

    const state = api.getState() as RootState;
    const project = state.projects.projects.find((candidate) => candidate.id === id);
    if (!project) return;
    const hasOpenWork = state.entries.entries.some(
      (entry) =>
        entry.project_id === id &&
        entry.status !== "completed" &&
        entry.status !== "met",
    );
    if (!hasOpenWork) {
      await cancelProjectReturnNotification(id);
      return;
    }

    // The first project-return invitation is the one notification permission
    // is for: the user has just entered a project and there is work to return
    // to later. Existing permission checks return immediately.
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    await scheduleProjectReturnNotification(project, state.entries.entries);
  },
});

listenerMiddleware.startListening({
  matcher: isAnyOf(
    createEntry.fulfilled,
    updateEntry.fulfilled,
    updateEntryStatus.fulfilled,
    deleteEntry.fulfilled,
  ),
  effect: async (_action, api) => {
    const state = api.getState() as RootState;
    const { projects, entries } = state;
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") return;

    for (const project of projects.projects) {
      await scheduleProjectReturnNotification(project, entries.entries);
    }
  },
});

listenerMiddleware.startListening({
  actionCreator: deleteProject.fulfilled,
  effect: (action) => {
    void cancelProjectReturnNotification(action.payload);
  },
});

// ─── Watch connectivity pipeline ──────────────────────────────────────────────

let watchSyncStarted = false;

/**
 * One-time subscription to the Watch pipeline: pending-note drain on mount,
 * foreground, and a 30s interval, plus message / context / file listeners.
 * Lives in the middleware (not a component) because the listeners must survive
 * navigation. Guarded so React StrictMode double-mounts can't double-subscribe.
 */
export function startWatchSync(dispatch: AppDispatch): void {
  if (watchSyncStarted) return;
  watchSyncStarted = true;

  const fileTodo = (title: string): void => {
    dispatch(
      createEntry({
        title,
        type: "todo",
        scheduledDate: dayjs().format("DD/MM/YYYY"),
      }),
    ).catch(() => {
      // createEntry already logged the failure; swallow the rejection.
    });
  };

  const syncPendingNotes = async (): Promise<void> => {
    try {
      // get() returns a JSON string (e.g. '["note1","note2"]') because
      // ExtensionStorage.get deserializes Data→JSON→string. Parse it manually.
      const raw = storage.get("pending_notes") as string | null;
      console.log("[store] pending_notes raw from Watch:", raw);
      if (!raw) return;

      let pendingNotes: string[] = [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed))
          pendingNotes = parsed.filter((v) => typeof v === "string");
      } catch {
        console.error(
          "[store] failed to parse pending_notes JSON:",
          raw,
        );
        return;
      }

      if (pendingNotes.length === 0) return;

      console.log(
        `[store] found ${pendingNotes.length} pending note(s) from Watch`,
      );

      for (const title of pendingNotes) fileTodo(title);

      // Clear by writing an empty JSON array as Data (matching Watch write format)
      storage.remove("pending_notes");
      console.log(`[store] synced ${pendingNotes.length} Watch note(s)`);
    } catch (error) {
      console.error("[store] syncPendingNotes failed:", error);
    }
  };

  void syncPendingNotes();

  const appStateSub = AppState.addEventListener("change", (nextAppState) => {
    if (nextAppState === "active") void syncPendingNotes();
  });

  // Listen for real-time messages from Watch
  const watchMsgSub = WatchConnectivity.addWatchMessageListener((message) => {
    console.log("[store] Received Watch message:", message);
    if (message.notes && Array.isArray(message.notes)) {
      message.notes.forEach((title: string) => fileTodo(title));
    }
  });

  // Listen for context updates (more reliable for background sync)
  const watchCtxSub = WatchConnectivity.addWatchContextListener((context) => {
    console.log("[store] Received Watch context:", context);
    if (context.notes && Array.isArray(context.notes)) {
      context.notes.forEach((title: string) => fileTodo(title));
    }
  });

  // Listen for audio files from Watch
  const watchFileSub = WatchConnectivity.addWatchFileListener(async (file) => {
    console.log("[store] Received Watch file event:", file);
    if (!file.url) {
      console.warn("[store] Received file event without URL");
      return;
    }
    try {
      console.log(
        "[store] Triggering transcription for:",
        file.url,
      );
      const transcript = await SpeechRecognizerModule.transcribeFile(file.url);
      console.log("[store] Transcription result:", transcript);
      if (transcript) fileTodo(transcript);
    } catch (error) {
      console.error("[store] Transcription failed:", error);
    }
  });

  const interval = setInterval(() => void syncPendingNotes(), 30000);
}
