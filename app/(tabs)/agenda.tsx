import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { AgendaFeed } from "@/components/organisms/agenda-feed";
import { tokens, useTheme } from "@/constants/theme";
import { useGlobalCapture } from "@/contexts/global-capture-context";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { agendaVoice } from "@/lib/agenda-voice";

import type { Dispatch } from "@/lib/agenda-voice";

/**
 * AGENDA — the board's dispatch.
 *
 * The Field shows you WHAT is on the board. This is a ranked stream of what
 * has HAPPENED to it: the deadline that ran out, the idea that has sat a
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

  const { entries, tasks, projects } = useDatabase();
  const { entries: notes } = useDiary();

  // Anchor "now" once per mount: every dispatch's age is measured from it, so a
  // fresh Date.now() per render would make the feed re-score on every keystroke
  // elsewhere in the tree. Re-anchored on focus so a day passing is noticed.
  const [now, setNow] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, []),
  );

  const dispatches = useMemo(
    () => agendaVoice({ entries, tasks, notes, projects, now }),
    [entries, tasks, notes, projects, now],
  );

  // The feed is a pointer into the board, never a dead end: an entry line opens
  // its detail+edit modal, a project line pushes the project, a note line hands
  // off to the Notes tab where that trace lives.
  const handleSelect = useCallback(
    (d: Dispatch) => {
      const target = d.target;
      switch (target.kind) {
        case "entry": {
          router.push({ pathname: "/edit", params: { id: target.id } });
          return;
        }
        case "project":
          // Agenda is its own tab, in neither shared group, so it has to pick a
          // stack to land the project in. Projects is the honest home for it:
          // following a dispatch about a project and then hitting Back leaves
          // you on the shelf, alongside the rest of your projects — whereas
          // landing on the Field would imply you'd come from there.
          router.push({
            pathname: "/(tabs)/(projects)/project",
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
    [router],
  );

  const header = (
    <View style={styles.header}>
      <Text style={[styles.kicker, { color: colors.inkMuted }]}>AGENDA</Text>
      <ThemedText type="display" style={styles.title}>
        The board&apos;s dispatch
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
