import { ExtensionStorage } from "@bacons/apple-targets";
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import dayjs from "dayjs";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";

import { toDisplayDate } from "@/lib/date-utils";
import { habitTone } from "@/lib/habit-color";
import {
  cancelHabitNotification,
  cancelNotificationForEntry,
  cancelProjectReturnNotification,
  NOTIFICATION_RESYNC_INTERVAL_MS,
  requestNotificationPermissions,
  scheduleEntryNotification,
  scheduleHabitNotification,
  scheduleProjectReturnNotification,
  syncScheduledNotifications,
} from "@/lib/notifications";
import { expandHabitCadence } from "@/lib/recurrence";
import type { DbEntry, DbHabit } from "@/lib/types";
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
import {
  createHabit,
  deleteHabit,
  updateHabit,
} from "@/store/thunks/habits";

const storage = new ExtensionStorage("group.dev.the-wedge.synapse-app");

function syncEntriesToWidget(entries: DbEntry[]): void {
  try {
    // `ExtensionStorage` only carries `string | number` values, so `due_date`
    // is attached only when set rather than sent as null.
    const widgetEntries = entries.slice(0, 10).map((e) => {
      const row: Record<string, string | number> = {
        id: e.id,
        title: e.title,
        status: e.status,
        type: e.type,
        is_next: e.is_next,
      };
      if (e.due_date) row.due_date = e.due_date;
      return row;
    });
    storage.set("widget_entries", widgetEntries);
    // The slice above caps at 10, so the widget's open count must come from
    // the whole list or it would silently stop at the cap.
    const openCount = entries.filter(
      (e) => e.status !== "completed" && e.status !== "met",
    ).length;
    storage.set("widget_open_count", openCount);
    ExtensionStorage.reloadWidget("entriesWidget");
    ExtensionStorage.reloadWidget("nextActionWidget");
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

// ─── Habits context for the Habits widget ────────────────────────────────────
//
// Only today's due habits travel — the same `expandHabitCadence` verdict the
// Habits tab renders. Hues are resolved to both schemes here so the Swift side
// never re-derives color math.

function syncHabitsToWidget(state: RootState): void {
  try {
    const today = dayjs().startOf("day").toDate();
    const todayKey = toDisplayDate(today);
    const doneKeys = new Set(
      state.habits.habitCompletions.map(
        (c) => `${c.habit_id}::${c.instance_date}`,
      ),
    );
    const projectEmojis: Record<string, string> = {};
    for (const project of state.projects.projects) {
      if (project.emoji) projectEmojis[project.id] = project.emoji;
    }

    const habits = state.habits.habits
      .filter(
        (habit) =>
          habit.status === "active" &&
          expandHabitCadence(habit, today, today).length > 0,
      )
      .slice(0, 10)
      .map((habit) => {
        const row: Record<string, string | number> = {
          id: habit.id,
          title: habit.title,
          done: doneKeys.has(`${habit.id}::${todayKey}`) ? 1 : 0,
        };
        // Glyph precedence mirrors HabitRow: project emoji, then own emoji.
        const glyph =
          (habit.project_id ? projectEmojis[habit.project_id] : null) ??
          habit.emoji ??
          null;
        if (glyph) row.glyph = glyph;
        if (habit.color_hue !== null) {
          const light = habitTone(habit.color_hue, "light");
          const dark = habitTone(habit.color_hue, "dark");
          row.tint_light = light.tint;
          row.tint_dark = dark.tint;
          row.mark_light = light.mark;
          row.mark_dark = dark.mark;
          row.ink_light = light.ink;
          row.ink_dark = dark.ink;
        }
        return row;
      });

    storage.set("widget_habits", habits);
    // The widget stamps its header with this so a day the app was never
    // opened reads as "as of", never as a silently wrong today.
    storage.set("widget_habits_date", todayKey);
    ExtensionStorage.reloadWidget("habitsWidget");
  } catch (error) {
    console.error("[store] syncHabitsToWidget failed:", error);
  }
}

listenerMiddleware.startListening({
  // Projects ride along: a project-linked habit inherits the project's emoji.
  predicate: (action) =>
    typeof action.type === "string" &&
    (action.type.startsWith("habits/") || action.type.startsWith("projects/")),
  effect: (_action, api) => {
    syncHabitsToWidget(api.getState() as RootState);
  },
});

// ─── Notifications: schedule on create/update, cancel on delete ──────────────

listenerMiddleware.startListening({
  matcher: isAnyOf(
    createEntry.fulfilled,
    updateEntry.fulfilled,
    updateEntryStatus.fulfilled,
  ),
  effect: async (action, api) => {
    const entry = (action as unknown as { payload: DbEntry }).payload;
    // A completed/met entry must not keep a pending reminder: cancel instead of
    // re-scheduling so a finished deadline goes quiet.
    if (entry.status === "completed" || entry.status === "met") {
      await cancelNotificationForEntry(entry.id).catch((err) => {
        console.warn("[store] cancelNotificationForEntry failed:", err);
      });
      return;
    }
    // Ask for notifications only when a deadline makes the benefit clear.
    if (action.type === createEntry.fulfilled.type && entry.type === "deadline") {
      const granted = await requestNotificationPermissions();
      if (!granted) return;
    }
    // The reminder body names the owning project, so resolve it from state.
    const projectTitle = entry.project_id
      ? (api.getState() as RootState).projects.projects.find(
          (project) => project.id === entry.project_id,
        )?.title
      : null;
    // Scheduling remains fire-and-forget so it never blocks a save.
    scheduleEntryNotification(entry, projectTitle).catch((err) => {
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
  effect: async (action, api) => {
    // `getOriginalState` must be read synchronously, before the first await.
    const originalEntries = (api.getOriginalState() as RootState).entries
      .entries;
    const state = api.getState() as RootState;

    // Only the project(s) an entry actually left or landed in can change.
    // Rescheduling every project on every entry mutation was pure churn: the
    // 7-day window keys off last_opened_at, so the clock never moved.
    const affected = new Set<string>();
    if (deleteEntry.fulfilled.match(action)) {
      const previous = originalEntries.find(
        (entry) => entry.id === action.payload,
      );
      if (previous?.project_id) affected.add(previous.project_id);
    } else {
      const entry = (action as unknown as { payload: DbEntry }).payload;
      const previous = originalEntries.find((row) => row.id === entry.id);
      if (previous?.project_id) affected.add(previous.project_id);
      if (entry.project_id) affected.add(entry.project_id);
    }
    if (affected.size === 0) return;

    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") return;

    console.log(
      `[store] project-return resync for ${affected.size} affected project(s)`,
    );
    for (const projectId of affected) {
      const project = state.projects.projects.find(
        (candidate) => candidate.id === projectId,
      );
      if (!project) {
        await cancelProjectReturnNotification(projectId);
        continue;
      }
      await scheduleProjectReturnNotification(project, state.entries.entries);
    }
  },
});

listenerMiddleware.startListening({
  actionCreator: deleteProject.fulfilled,
  effect: (action) => {
    void cancelProjectReturnNotification(action.payload);
  },
});

// ─── Habit nudges: schedule on create/update, cancel on delete ───────────────

listenerMiddleware.startListening({
  matcher: isAnyOf(createHabit.fulfilled, updateHabit.fulfilled),
  effect: async (action) => {
    const habit = (action as unknown as { payload: DbHabit }).payload;
    // A habit nudge is opt-in per habit: no reminder time means no notification.
    if (habit.status !== "active" || !habit.reminder_time) return;
    // Ask for permission only when the user has actually set a nudge — that is
    // the moment the benefit is concrete, matching the deadline-reminder rule.
    if (action.type === createHabit.fulfilled.type) {
      const granted = await requestNotificationPermissions();
      if (!granted) return;
    }
    scheduleHabitNotification(habit).catch((err) => {
      console.warn("[store] scheduleHabitNotification failed:", err);
    });
  },
});

listenerMiddleware.startListening({
  actionCreator: deleteHabit.fulfilled,
  effect: (action) => {
    void cancelHabitNotification(action.payload);
  },
});

// ─── Watch connectivity pipeline ──────────────────────────────────────────────

let watchSyncStarted = false;
let lastNotificationResyncAt = Date.now();

/**
 * Rebuild the notification schedule after the app comes back to the
 * foreground. Throttled: the pending series already covers the near future,
 * so this only needs to refill the lookahead occasionally. Bootstrap just
 * synced, hence the `lastNotificationResyncAt` seed.
 */
async function resyncNotificationsIfStale(
  getState: () => RootState,
): Promise<void> {
  if (Date.now() - lastNotificationResyncAt < NOTIFICATION_RESYNC_INTERVAL_MS) {
    return;
  }
  lastNotificationResyncAt = Date.now();
  const state = getState();
  await syncScheduledNotifications({
    entries: state.entries.entries,
    projects: state.projects.projects,
    habits: state.habits.habits,
  }).catch((error) => {
    console.warn("[store] foreground notification resync failed:", error);
  });
}

/**
 * One-time subscription to the Watch pipeline: pending-note drain on mount,
 * foreground, and a 30s interval, plus message / context / file listeners.
 * Lives in the middleware (not a component) because the listeners must survive
 * navigation. Guarded so React StrictMode double-mounts can't double-subscribe.
 */
export function startWatchSync(
  dispatch: AppDispatch,
  getState: () => RootState,
): void {
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
    if (nextAppState !== "active") return;
    void syncPendingNotes();
    void resyncNotificationsIfStale(getState);
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
