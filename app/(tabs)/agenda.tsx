import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { AgendaFeed } from "@/components/organisms/agenda-feed";
import { tokens, useTheme } from "@/constants/theme";
import { useGlobalCapture } from "@/contexts/global-capture-context";
import { useDatabase } from "@/hooks/use-database/use-database";
import { agendaPrompts } from "@/lib/agenda-prompts";

import type { AgendaPrompt } from "@/lib/agenda-prompts";

/**
 * AGENDA — the activation surface.
 *
 * The Field shows the whole board. This surface does one smaller job: offer a
 * few useful ways back in. It never reports the database; it chooses one clear
 * invitation and, when useful, two alternatives.
 */
export default function AgendaScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const cap = useGlobalCapture();

  const { entries, tasks, projects } = useDatabase();

  // Anchor "now" once per mount: every dispatch's age is measured from it, so a
  // fresh Date.now() per render would make the feed re-score on every keystroke
  // elsewhere in the tree. Re-anchored on focus so a day passing is noticed.
  const [now, setNow] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, []),
  );

  const prompts = useMemo(
    () => agendaPrompts({ entries, tasks, projects, now }),
    [entries, tasks, projects, now],
  );

  // The entries the user flagged as next — not suggestions, so they lead the
  // page and are never dropped by the prompt ranking. Most recently chosen
  // first. A done entry has had its mark auto-cleared; the status guard is
  // belt-and-braces.
  const nextActions = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.is_next === 1 &&
            e.status !== "completed" &&
            e.status !== "met",
        )
        .sort((a, b) => (b.next_marked_at ?? 0) - (a.next_marked_at ?? 0)),
    [entries],
  );

  // Every invitation has one direct way in. The Agenda is useful only if the
  // action it suggests is one tap away.
  const handleSelect = useCallback(
    (prompt: AgendaPrompt) => {
      const target = prompt.target;
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
      }
    },
    [router],
  );

  const header = (
    <View style={styles.header}>
      <Text style={[styles.kicker, { color: colors.inkMuted }]}>AGENDA</Text>
      <ThemedText type="display" style={styles.title}>
        What could move?
      </ThemedText>
      <ThemedText type="body" muted style={styles.subtitle}>
        What you flagged to do next, and where else you could start.
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <AgendaFeed
        prompts={prompts}
        nextActions={nextActions}
        onSelect={handleSelect}
        onSelectEntry={(id) =>
          router.push({ pathname: "/edit", params: { id } })
        }
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
  subtitle: {
    marginTop: tokens.space.sm,
  },
});
