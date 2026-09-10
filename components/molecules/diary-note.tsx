import dayjs from "dayjs";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  findNodeHandle,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextLayoutEventData,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { LinkText } from "@/components/atoms/link-text";
import { TagChip } from "@/components/atoms/tag-chip";
import { ThemedText } from "@/components/atoms/themed-text";
import type { LinkableKind } from "@/components/organisms/link-sheet";
import { SwipeableRow } from "@/components/organisms/swipeable-row";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useTendrilRegistry } from "@/hooks/use-tendril-registry";
import { ConfirmKey } from "@/lib/settings";

import type { DbDiaryEntry } from "@/lib/types";

/** Line cap for the collapsed body. Long notes clamp here and offer an
 *  expand/collapse toggle; short notes are unaffected. */
const COLLAPSED_LINES = 5;

interface DiaryNoteProps {
  entry: DbDiaryEntry;
  /** Title of the target this note is related to, if linked. Resolved by the
   *  feed (the note row only stores the id). */
  linkedTitle?: string;
  /** Kind of the linked target — picks the leading glyph. */
  linkedKind?: LinkableKind;
  /** Emoji of the linked project, when it has one. Shown in place of the folder
   *  glyph on a project chip so the project's identity carries through to the
   *  note. */
  linkedEmoji?: string | null;
  /** Parent project of the linked ENTRY, when that entry is filed in a project.
   *  Only meaningful when `linkedTitle` is an entry, not a project. When set,
   *  the relatedness chip becomes a breadcrumb — entry ⇾ project. */
  linkedProjectTitle?: string;
  /** Emoji of the linked entry's parent project, when it has one. */
  linkedProjectEmoji?: string | null;
  /** Hide the relatedness chip entirely. Use on surfaces that already imply
   *  the link (e.g. a project's own notes), where the chip would be redundant
   *  or misleading. */
  hideChip?: boolean;
  /** Tap the note body to edit it. Omit to render the body as static text. */
  onEdit?: () => void;
  /** Tap the relatedness chip to re-link this note (pull it into a project or
   *  idea). Omit to render the chip as a static label. */
  onRelate?: () => void;
  /** Toggle the note's bookmark (keep/pin). Omit to hide the footer's bookmark
   *  control entirely. */
  onToggleBookmark?: () => void;
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
  linkedKind,
  linkedEmoji,
  linkedProjectTitle,
  linkedProjectEmoji,
  hideChip = false,
  onEdit,
  onRelate,
  onToggleBookmark,
  onDelete,
}: DiaryNoteProps): React.ReactElement {
  const { colors } = useTheme();
  const router = useRouter();
  const registry = useTendrilRegistry();
  const noteRef = useRef<View | null>(null);

  // Expand/collapse: the body clamps at COLLAPSED_LINES and, when the text
  // actually overflows that cap (handwriting has variable metrics, so we ask
  // the renderer rather than guessing by character count), a quiet footer
  // lets the reader unfold the note in place.
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const onBodyTextLayout = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    setOverflows(e.nativeEvent.lines.length > COLLAPSED_LINES);
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // Measure this note's y in the outer ScrollView's coordinate system whenever
  // it lays out. The registry may be null (component used outside the diary
  // screen), in which case we skip measurement — no cost.
  const reportPosition = useCallback(() => {
    if (!registry) return;
    const noteNode = noteRef.current;
    const contentNode = registry.contentRef.current as {
      measure?: unknown;
    } | null;
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
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        ref={noteRef}
        onLayout={reportPosition}
        style={[styles.note, { backgroundColor: colors.surface }]}
      >
        <View style={styles.noteMeta}>
          <ThemedText
            type="mono"
            style={{ color: colors.inkMuted, fontSize: 11 }}
          >
            {dayjs.unix(entry.created_at).format("HH:mm")}
          </ThemedText>

          {hideChip ? null : (
            <Chip
              onRelate={onRelate}
              linkedTitle={linkedTitle}
              linkedKind={linkedKind}
              linkedEmoji={linkedEmoji}
              linkedProjectTitle={linkedProjectTitle}
              linkedProjectEmoji={linkedProjectEmoji}
            />
          )}
        </View>

        {/* Body — clamped to COLLAPSED_LINES when collapsed. The handwriting
            font has variable metrics, so we can't guess overflow by character
            count. A hidden measuring copy (same width, no clamp) reports the
            true line count via onTextLayout; only that decides whether the
            note is long enough to deserve the expand/collapse toggle. The
            measuring copy stays RAW plain text — only the visible body goes
            through LinkText, so the line-count math never sees link styling.
            URL runs inside the body render in the mono signal voice and tap
            into the in-app browser (the card's tap-to-edit doesn't fire). */}
        <View style={styles.bodyWrap}>
          <LinkText
            text={entry.body}
            style={[styles.noteBody, { color: colors.ink }]}
            numberOfLines={expanded ? undefined : COLLAPSED_LINES}
            linkStyle={styles.bodyLink}
          />
          {!expanded ? (
            <ThemedText
              style={[styles.noteBody, styles.bodyMeasure, { color: colors.ink }]}
              onTextLayout={onBodyTextLayout}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {entry.body}
            </ThemedText>
          ) : null}
        </View>

        {/* Footer — a quiet strip that anchors the note: the expand/collapse
            toggle on the left (only when the body overflows its cap, so short
            notes stay chrome-free) and, on the right, the bookmark toggle so
            any note can be kept at a glance. */}
        <View style={styles.footerRow}>
          {overflows ? (
            <Animated.View
              layout={LinearTransition.duration(220)}
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(120)}
            >
              <Pressable
                onPress={toggleExpanded}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={
                  expanded ? "Collapse note" : "Expand note to full height"
                }
                style={({ pressed }) => [
                  styles.expandRow,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="micro" muted>
                  {expanded ? "Collapse" : "Show more"}
                </ThemedText>
                <IconSymbol
                  name={expanded ? "ChevronUp" : "ChevronDown"}
                  size={13}
                  color={colors.inkMuted}
                />
              </Pressable>
            </Animated.View>
          ) : (
            <View />
          )}

          {onToggleBookmark ? (
            <BookmarkButton
              bookmarked={entry.bookmarked === 1}
              onPress={onToggleBookmark}
            />
          ) : null}
        </View>

        {/* Photos — a quiet horizontal strip of thumbnails under the tags.
            Tap one to open the full-screen lightbox. */}
        {entry.media.length > 0 ? (
          <View style={styles.mediaRow}>
            {entry.media.map((item) => {
              const aspect = item.width / item.height;
              return (
                <Pressable
                  key={item.uri}
                  onPress={() =>
                    router.push({
                      pathname: "/lightbox",
                      params: { uri: item.uri },
                    })
                  }
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Open photo"
                >
                  <Image
                    source={item.uri}
                    style={[
                      styles.mediaThumb,
                      { aspectRatio: aspect, maxWidth: 88 },
                    ]}
                    contentFit="cover"
                    transition={120}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Tags — readonly flat labels under the body, quieter than the meta
            row. Display only; editing happens in the note modal. Rendered
            ghost (the tag's own pastel ink, no fill) so the card surface
            stays clean and the chips read as whispered labels. */}
        {entry.tags.length > 0 ? (
          <View style={styles.tagRow}>
            {entry.tags.map((tag) => (
              <TagChip key={tag} label={tag} variant="ghost" size="md" />
            ))}
          </View>
        ) : null}
      </Pressable>
    </SwipeableRow>
  );
}

/**
 * The relatedness chip: ON · <target> when linked, "Unlinked" otherwise. When
 * `onRelate` is provided the chip becomes a button that pulls the note into a
 * project or idea (a trailing link glyph signals the affordance); otherwise it
 * renders as a static label.
 *
 * When the linked target is an ENTRY that belongs to a project, the chip
 * renders a single breadcrumb — entry ⇾ project — so the note's place in both
 * registers is visible at once. (A note linked directly to a project, or to an
 * entry with no project, keeps the single-target chip.)
 */
function Chip({
  onRelate,
  linkedTitle,
  linkedKind,
  linkedEmoji,
  linkedProjectTitle,
  linkedProjectEmoji,
}: {
  onRelate?: () => void;
  linkedTitle?: string;
  linkedKind?: LinkableKind;
  linkedEmoji?: string | null;
  linkedProjectTitle?: string;
  linkedProjectEmoji?: string | null;
}): React.ReactElement {
  const { colors } = useTheme();

  const entryLead =
    linkedKind === "project" ? (
      linkedEmoji ? (
        <Text style={styles.emoji}>{linkedEmoji}</Text>
      ) : (
        <IconSymbol name="Folder" size={13} color={colors.inkMuted} />
      )
    ) : (
      <SketchIcon type={linkedKind ?? "idea"} size={13} />
    );

  const content = linkedTitle ? (
    linkedProjectTitle ? (
      <>
        {entryLead}
        <ThemedText
          type="micro"
          numberOfLines={1}
          style={[styles.relLabel, { color: colors.inkMuted }]}
        >
          {linkedTitle.toUpperCase()}
        </ThemedText>
        <IconSymbol
          name="ChevronRight"
          size={11}
          color={colors.inkMuted}
        />
        {linkedProjectEmoji ? (
          <Text style={styles.emoji}>{linkedProjectEmoji}</Text>
        ) : (
          <IconSymbol name="Folder" size={13} color={colors.inkMuted} />
        )}
        <ThemedText
          type="micro"
          numberOfLines={1}
          style={[styles.relLabel, { color: colors.inkMuted }]}
        >
          {linkedProjectTitle.toUpperCase()}
        </ThemedText>
      </>
    ) : (
      <>
        {entryLead}
        <ThemedText
          type="micro"
          numberOfLines={1}
          style={[styles.relLabel, { color: colors.inkMuted }]}
        >
          {linkedTitle.toUpperCase()}
        </ThemedText>
      </>
    )
  ) : (
    <>
      <View style={[styles.freeDot, { borderColor: colors.inkMuted }]} />
      <ThemedText type="micro" style={{ color: colors.inkMuted }}>
        Unlinked
      </ThemedText>
    </>
  );

  if (!onRelate) {
    return (
      <View style={[styles.relTag, { backgroundColor: colors.surfaceSubtle }]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onRelate}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        linkedTitle
          ? `Related to ${linkedKind ?? "target"}: ${linkedTitle}. Tap to change.`
          : "Unlinked note. Tap to pull into a project or idea."
      }
      style={({ pressed }) => [
        styles.relTag,
        { backgroundColor: colors.surfaceSubtle },
        pressed && styles.pressed,
      ]}
    >
      {content}
      <IconSymbol name="Link" size={13} color={colors.inkMuted} />
    </Pressable>
  );
}

/**
 * The note's bookmark toggle. A filled ribbon reads as "kept" at full ink; the
 * outline ribbon is the quiet affordance for the unkept note. Pressing springs
 * the ribbon in a tiny direct-manipulation scale (respects reduced motion).
 */
function BookmarkButton({
  bookmarked,
  onPress,
}: {
  bookmarked: boolean;
  onPress: () => void;
}): React.ReactElement {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const springTo = (value: number) => {
    if (reducedMotion) {
      scale.value = value;
    } else {
      scale.value = withSpring(value, tokens.motion.spring);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => springTo(0.84)}
      onPressOut={() => springTo(1)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ selected: bookmarked }}
      accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark this note"}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Animated.View style={animatedStyle}>
        <IconSymbol
          name="Bookmark"
          weight={bookmarked ? "Filled" : "Outline"}
          size={16}
          color={bookmarked ? colors.ink : colors.inkMuted}
        />
      </Animated.View>
    </Pressable>
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
  emoji: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
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

  // URL runs inside the handwritten body: mono signal voice at a size that
  // optically matches the Caveat prose (Caveat runs ~30% larger, so 15pt mono
  // sits beside 20pt hand at similar weight). No lineHeight — the outer hand
  // line height governs the line box.
  bodyLink: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: 15,
    textDecorationLine: "underline",
  },

  // Relative wrapper so the hidden measuring copy (absolute) can share the
  // exact body width and report the true, unclamped line count.
  bodyWrap: {
    position: "relative",
  },
  bodyMeasure: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },

  // Footer — anchors the note: expand/collapse toggle (left, only when the
  // body overflows) and the bookmark toggle (right, always when enabled). The
  // space-between spread keeps the two ends of the strip visually distinct.
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: tokens.space.xs,
    gap: tokens.space.sm,
  },

  // Expand/collapse toggle for long notes — quiet, reads as a whispered
  // instruction rather than a button. Only rendered when overflowing.
  expandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingVertical: 2,
  },

  // Tags — wrapped pills in the same tonal vocabulary as the relatedness chip,
  // one step quieter. Readonly: the note modal is where tags are edited.
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs,
  },

  // Photos — a quiet strip under the tags, flat and wrapping like the tag row
  // so a many-photo note stacks instead of clipping off the card's edge.
  // Thumbs keep a portrait-ish footprint so the strip reads as a margin of
  // the note, not a gallery.
  mediaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  mediaThumb: {
    height: 56,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.color.scrim.shadow,
  },
});
