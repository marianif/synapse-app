import dayjs from "dayjs";
import { useCallback, useEffect, useRef } from "react";
import { findNodeHandle, StyleSheet, View } from "react-native";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { SwipeableRow } from "@/components/organisms/swipeable-row";
import { tokens, useTheme } from "@/constants/theme";
import { useTendrilRegistry } from "@/hooks/use-tendril-registry";
import { ConfirmKey } from "@/lib/settings";

import type { DbDiaryEntry } from "@/lib/types";

interface DiaryNoteProps {
  entry: DbDiaryEntry;
  /**
   * Title of the idea this note is related to, if linked. Resolved by the feed
   * (the note row only stores the id). A linked note shows an "ON · <idea>"
   * chip; an unlinked one shows a quiet "FREE" chip — so every note declares
   * its relatedness at a glance.
   */
  linkedTitle?: string;
  onDelete: () => void;
}

/**
 * A single kept diary line — timestamp, a relatedness chip (ON · <idea> when
 * linked, FREE otherwise), and the handwritten body — wrapped in a
 * swipe-to-delete row. Self-contained so any feed can render one.
 */
export function DiaryNote({
  entry,
  linkedTitle,
  onDelete,
}: DiaryNoteProps): React.ReactElement {
  const { colors } = useTheme();
  const registry = useTendrilRegistry();
  const noteRef = useRef<View | null>(null);

  // Measure this note's y in the outer ScrollView's coordinate system whenever
  // it lays out. The registry may be null (component used outside the diary
  // screen), in which case we skip measurement — no cost.
  const reportPosition = useCallback(() => {
    if (!registry) return;
    const noteNode = noteRef.current;
    const contentNode = registry.contentRef.current as
      | { measure?: unknown }
      | null;
    if (!contentNode || !noteNode) return;
    const contentHandle = findNodeHandle(contentNode as never);
    if (contentHandle == null) return;
    noteNode.measureLayout(
      contentHandle,
      (_x, y) => {
        if (!registry) return;
        // Anchor the tendril at the vertical midpoint of the note card.
        // We can't measure height here without a second call; use ~36pt as a
        // reasonable card mid-height offset (padding + a short line of text).
        registry.ensureNote(entry.id).value = y + 36;
      },
      () => {
        // measureLayout failure is silent by design — the tendril will simply
        // clip to the strip edge until the next layout pass reports.
      },
    );
  }, [registry, entry.id]);

  useEffect(() => {
    if (!registry) return;
    registry.ensureNote(entry.id);
    return () => {
      registry.releaseNote(entry.id);
    };
  }, [registry, entry.id]);

  return (
    <SwipeableRow
      onDelete={onDelete}
      confirmKey={ConfirmKey.deleteNote}
      confirmKicker="DELETE NOTE"
      confirmMessage="This note is just for you — deleting it can't be undone."
    >
      <View
        ref={noteRef}
        onLayout={reportPosition}
        style={[styles.note, { backgroundColor: colors.surface }]}
      >
        <View style={styles.noteMeta}>
          <ThemedText type="mono" style={{ color: colors.inkMuted }}>
            {dayjs.unix(entry.created_at).format("HH:mm")}
          </ThemedText>

          {linkedTitle ? (
            <View
              style={[
                styles.relTag,
                { backgroundColor: colors.type.ideas + "1F" },
              ]}
            >
              <SketchIcon type="idea" size={13} />
              <ThemedText
                type="micro"
                numberOfLines={1}
                style={[styles.relLabel, { color: colors.inkMuted }]}
              >
                {linkedTitle.toUpperCase()}
              </ThemedText>
            </View>
          ) : (
            <View
              style={[styles.relTag, { backgroundColor: colors.surfaceSubtle }]}
            >
              <View
                style={[styles.freeDot, { borderColor: colors.inkMuted }]}
              />
              <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                Unlinked
              </ThemedText>
            </View>
          )}
        </View>

        <ThemedText style={[styles.noteBody, { color: colors.ink }]}>
          {entry.body}
        </ThemedText>
      </View>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  note: {
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  noteMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  relTag: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: tokens.space.xs,
    paddingVertical: 3,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.sm,
  },
  relLabel: {
    flexShrink: 1,
  },
  freeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.4,
    borderStyle: "dashed",
  },
  noteBody: {
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 20,
    lineHeight: 26,
  },
});
