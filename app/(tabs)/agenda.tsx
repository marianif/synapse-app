import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { AgendaFeed } from "@/components/organisms/agenda-feed";
import { DirectDetailSheet } from "@/components/organisms/direct-detail-sheet";
import { tokens, useTheme } from "@/constants/theme";
import { useGlobalCapture } from "@/contexts/global-capture-context";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { agendaVoice } from "@/lib/agenda-voice";
import { doneStatus } from "@/lib/direct-when";

import type { Dispatch } from "@/lib/agenda-voice";
import type { DbEntry, EntryType } from "@/lib/types";

/**
 * AGENDA — the board's voice.
 *
 * The Field shows you WHAT is on the board. This is the board talking about
 * what has HAPPENED to it: the deadline that ran out, the idea that has sat a
 * week, the checklist you stopped halfway, last night's note. An RSS feed of
 * your own life, in your own handwriting, newest and loudest first.
 *
 * It curates nothing away — the full board still lives on the Field. This is a
 * ranking of what time has done, not a filter over what exists.
 */
export default function AgendaScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const cap = useGlobalCapture();

  const {
    entries,
    tasks,
    projects,
    fetchEntries,
    updateEntryStatus,
    deleteEntry,
  } = useDatabase();
  const { entries: notes, refresh: refreshDiary } = useDiary();

  // Anchor "now" once per mount: every dispatch's age is measured from it, so a
  // fresh Date.now() per render would make the feed re-score on every keystroke
  // elsewhere in the tree. Re-anchored on focus below.
  const [now, setNow] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      // Re-read the board and re-clock the voice on every entry into the tab —
      // a day passing is exactly the kind of thing this screen exists to notice.
      setNow(Date.now());
      fetchEntries();
      refreshDiary();
    }, [fetchEntries, refreshDiary]),
  );

  const dispatches = useMemo(
    () => agendaVoice({ entries, tasks, notes, projects, now }),
    [entries, tasks, notes, projects, now],
  );

  // The feed is a pointer into the board, never a dead end: an entry line opens
  // its detail sheet in place, a project line pushes the project, a note line
  // hands off to the Notes tab where that trace lives.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selected?.project_id) ?? null,
    [projects, selected?.project_id],
  );

  const handleSelect = useCallback(
    (d: Dispatch) => {
      const target = d.target;
      switch (target.kind) {
        case "entry": {
          const entry = entries.find((e) => e.id === target.id);
          if (entry) setSelectedId(entry.id);
          return;
        }
        case "project":
          router.push({
            pathname: "/(projects)/project",
            params: { id: target.id },
          });
          return;
        case "note":
          router.push("/(tabs)/notes");
          return;
        case "board":
          // A board-level line (a collision, a silence, the orphan count) is
          // about the whole field, so it hands you back to the field itself.
          router.push("/");
          return;
      }
    },
    [entries, router],
  );

  const handleMarkDone = useCallback(
    (entry: DbEntry): void => {
      void updateEntryStatus(
        entry.id,
        doneStatus(entry.type as EntryType),
      ).catch((err) => console.error("Failed to mark entry done:", err));
    },
    [updateEntryStatus],
  );

  const handleDelete = useCallback(
    (entry: DbEntry): void => {
      setSelectedId(null);
      void deleteEntry(entry.id).catch((err) =>
        console.error("Failed to delete entry:", err),
      );
    },
    [deleteEntry],
  );

  const header = (
    <View style={styles.header}>
      <Text style={[styles.kicker, { color: colors.inkMuted }]}>AGENDA</Text>
      <ThemedText type="display" style={styles.title}>
        The voice of the board
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <AgendaFeed
        dispatches={dispatches}
        onSelect={handleSelect}
        header={header}
        bottomInset={cap.tabBarHeight}
      />

      <DirectDetailSheet
        entry={selected}
        project={selectedProject}
        visible={selected !== null}
        onClose={() => setSelectedId(null)}
        onMarkDone={handleMarkDone}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.xl,
    gap: tokens.space.xs,
  },
  kicker: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.kicker.size,
    lineHeight: tokens.type.kicker.lineHeight,
    letterSpacing: tokens.type.kicker.tracking,
  },
  title: {
    letterSpacing: tokens.type.display.tracking,
  },
});
