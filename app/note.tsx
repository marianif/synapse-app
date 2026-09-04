import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { TagChip } from "@/components/atoms/tag-chip";
import { ThemedText } from "@/components/atoms/themed-text";
import {
  LinkSheet,
  type LinkableTarget,
  type LinkSelection,
} from "@/components/organisms/link-sheet";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";
import { countTags, suggestTags } from "@/lib/tags";

/**
 * Parse the `tags` nav param (a JSON array string) into a label array. Same
 * relaxed contract as the DB reader: absent or malformed reads as an empty
 * set, so a stale link can never crash the editor.
 */
function parseTagsParam(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string");
  } catch {
    return [];
  }
}

/**
 * A single note opened up for editing, presented as a native modal
 * (`presentation: "modal"` in the root stack). The sheet is deliberately
 * top-anchored and never wrapped in a KeyboardAvoidingView: a native pageSheet
 * is not resized for the keyboard, so the keyboard slides over the sheet's
 * lower edge instead of shoving it up — the header (close / save) and the
 * relate row stay clear of it by sitting above the body input.
 *
 * The note's content is passed in through navigation params so the draft can be
 * seeded synchronously at mount (the diary store already holds the row, but a
 * lookup would flash the pre-save text until it resolves). The modal commits on
 * Save — or on dismissal, via the autosave paths below — through `updateEntry`,
 * which upserts the diary slice so every consumer re-renders the saved note.
 *
 * On the notes tab (`relatable`) the relate row lets the user move the note
 * while editing it. Opened from a project screen (`relatable=0`) the relate
 * row is hidden — the note is by definition ON that project, so the link is
 * implied.
 *
 * Closing the modal autosaves: dismissing via the X, the native swipe-down, or
 * the back gesture unmounts the screen, and a single cleanup writes the latest
 * draft (and any relate change) through the diary store. The Check button is
 * that same commit, expressed explicitly.
 */
export default function NoteScreen(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, body, relatable, linkedProjectId, linkedEntryId, tags } =
    useLocalSearchParams<{
      id?: string;
      body?: string;
      relatable?: string;
      /** The note's current link, if it has one — seeds the relate row. */
      linkedProjectId?: string;
      linkedEntryId?: string;
      /** The note's tags, as a JSON array string — seeds the tag editor. */
      tags?: string;
    }>();

  const { updateEntry, entries: diaryEntries } = useDiary();
  const { projects, entries: boardEntries } = useDatabase();

  const canRelate = relatable !== "0";

  // Targets for the relate picker: every project and idea, so the user can
  // pull the note anywhere (or make it free) from the editor.
  const targets: LinkableTarget[] = (() => {
    const p: LinkableTarget[] = projects.map((pr) => ({
      id: pr.id,
      title: pr.title,
      kind: "project",
    }));
    const i: LinkableTarget[] = boardEntries
      .filter((e) => e.type === "idea")
      .map((e) => ({ id: e.id, title: e.title, kind: "idea" }));
    return [...p, ...i];
  })();

  // Draft seeded straight from the params, synchronously at mount.
  const [draft, setDraft] = useState(body ?? "");
  const [selection, setSelection] = useState<LinkSelection>(() => {
    if (linkedProjectId) return { kind: "project", id: linkedProjectId };
    if (linkedEntryId) return { kind: "idea", id: linkedEntryId };
    return null;
  });
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);

  // Tags — seeded from the param, replaced wholesale on save. New tags are
  // committed from the add-field via commitTag; each chip's X removes one.
  const seedTags = parseTagsParam(tags);
  const [tagSet, setTagSet] = useState<string[]>(seedTags);
  const [tagDraft, setTagDraft] = useState("");

  // The tag vocabulary — every distinct tag across notes, with counts. Same
  // `countTags` the notes tab's rail uses, so the editor and the feed agree
  // on what "already existing" means.
  const vocab = useMemo(() => countTags(diaryEntries), [diaryEntries]);

  // Suggestions for the add-field: quick picks of the most-used tags while
  // the field is empty and focused, narrowing to draft matches (prefix first,
  // then substring) as the user types — excluding tags already on the note,
  // capped at six so the row stays one line. Hidden the moment the field
  // blurs, so an idle editor looks exactly like today.
  const [tagFieldFocused, setTagFieldFocused] = useState(false);
  const suggestions = useMemo(() => {
    if (!tagFieldFocused) return [];
    return suggestTags(vocab, tagDraft, tagSet);
  }, [tagFieldFocused, vocab, tagDraft, tagSet]);

  // Live values for the unmount write below — a cleanup would capture the
  // first render's values otherwise.
  const latestRef = useRef({ draft, selection, tags: tagSet });
  latestRef.current = { draft, selection, tags: tagSet };

  // Add one tag through the shared normalization path (dedupe + latestRef
  // mirror), used by the suggestion chips. The field's own commit reuses it.
  const addTag = (t: string): void => {
    if (tagSet.includes(t)) return;
    const next = [...tagSet, t];
    setTagSet(next);
    latestRef.current = { ...latestRef.current, tags: next };
    setTagDraft("");
  };

  // Commit the tag field: split on commas, trim + lowercase (the store's
  // normalization), dedupe against the current set. Mirrors the result onto
  // latestRef synchronously so a dismissal landing on the same tick as the
  // keyboard's blur never writes a stale set.
  const commitTag = (): void => {
    const parts = tagDraft
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    setTagDraft("");
    if (parts.length === 0) return;
    const next = [...new Set([...tagSet, ...parts])];
    setTagSet(next);
    latestRef.current = { ...latestRef.current, tags: next };
  };

  // Write once as the screen unmounts. Dismissing the modal (X, swipe-down,
  // back) unmounts it, the thunk updates SQLite and the diary slice, and every
  // consumer reading the slice re-renders the saved note — no refresh, no
  // dismissal blocking, no double-write guards. Skips no-ops so an idle
  // open/close never touches the DB.
  useEffect(() => {
    return () => {
      if (!id) return;
      const { draft: latestDraft, selection: latestSelection, tags: latestTags } =
        latestRef.current;
      const trimmed = latestDraft.trim();
      if (!trimmed) return;
      const unchangedLink =
        !canRelate ||
        (latestSelection === null
          ? !linkedProjectId && !linkedEntryId
          : latestSelection.kind === "project"
            ? latestSelection.id === (linkedProjectId ?? "")
            : latestSelection.id === (linkedEntryId ?? ""));
      const unchangedTags =
        JSON.stringify(latestTags) === JSON.stringify(seedTags);
      if (trimmed === (body ?? "") && unchangedLink && unchangedTags) return;
      void updateEntry(id, {
        body: trimmed,
        tags: latestTags,
        ...(canRelate
          ? {
              linkedEntryId:
                latestSelection?.kind === "idea" ? latestSelection.id : null,
              linkedProjectId:
                latestSelection?.kind === "project" ? latestSelection.id : null,
            }
          : {}),
      });
    };
    // Params and store bindings are stable for the screen's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!id) {
    return (
      <View
        style={[
          styles.screen,
          { backgroundColor: colors.paper, paddingTop: insets.top },
        ]}
      >
        <ThemedText
          type="hand"
          style={[styles.gone, { color: colors.inkMuted }]}
        >
          This note is gone.
        </ThemedText>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.goneBack}
        >
          <ThemedText type="micro" style={{ color: colors.ink }}>
            GO BACK
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  const selectionTitle = selection
    ? targets.find((t) => t.id === selection.id)?.title
    : undefined;

  const handleSave = (): void => {
    if (!draft.trim()) return;
    // Closing triggers the single unmount write — this button is that same
    // commit, expressed explicitly.
    router.back();
  };

  const handleRelate = (next: LinkSelection): void => {
    setSelection(next);
    setLinkSheetOpen(false);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {/* Header — close / kicker / save. Stays above the keyboard by sitting
          at the very top of the sheet. */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close note editor"
          style={styles.headerBtn}
        >
          <IconSymbol name="X" size={22} color={colors.ink} />
        </Pressable>

        <View style={styles.headerTitle}>
          <ThemedText type="micro" style={{ color: colors.inkMuted }}>
            EDIT NOTE
          </ThemedText>
        </View>

        <Pressable
          onPress={handleSave}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Save note"
          style={styles.headerBtn}
        >
          <IconSymbol name="Check" size={22} color={colors.ink} />
        </Pressable>
      </View>

      {/* Relate row — only when the note is being edited outside its own
          project. Mirrors the feed chip: shows where the note lives, and a
          tap opens the picker. Rendered above the body so the keyboard never
          covers it. */}
      {canRelate ? (
        <Pressable
          onPress={() => setLinkSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            selectionTitle
              ? `Related to ${selection?.kind ?? "target"}: ${selectionTitle}. Tap to change.`
              : "Unlinked note. Tap to pull into a project or idea."
          }
          style={({ pressed }) => [
            styles.relateRow,
            { backgroundColor: colors.surfaceSubtle },
            pressed && styles.pressed,
          ]}
        >
          {selection ? (
            <>
              {selection.kind === "project" ? (
                <IconSymbol name="Folder" size={13} color={colors.inkMuted} />
              ) : (
                <SketchIcon type="idea" size={13} />
              )}
              <ThemedText
                type="micro"
                numberOfLines={1}
                style={[styles.relateLabel, { color: colors.inkMuted }]}
              >
                {selectionTitle?.toUpperCase() ?? "ON · TARGET"}
              </ThemedText>
            </>
          ) : (
            <>
              <View
                style={[styles.freeDot, { borderColor: colors.inkMuted }]}
              />
              <ThemedText type="micro" style={{ color: colors.inkMuted }}>
                Unlinked
              </ThemedText>
            </>
          )}
          <IconSymbol name="Link" size={13} color={colors.inkMuted} />
        </Pressable>
      ) : null}

      {/* Tags — the note's flat labels. A wrapping row of existing chips
          (each #tag with an X to remove) plus an inline add-field; commits on
          return / comma / blur, normalized to trimmed lowercase + deduped.
          Sits above the body so the keyboard never covers it. */}
      <View style={styles.tagSection}>
        <View style={styles.tagHeader}>
          <IconSymbol name="Hashtag" size={12} color={colors.inkMuted} />
          <ThemedText type="micro" style={{ color: colors.inkMuted }}>
            TAGS
          </ThemedText>
        </View>

        {tagSet.length > 0 ? (
          <View style={styles.tagRow}>
            {tagSet.map((t) => (
              <TagChip
                key={t}
                label={t}
                variant="hue"
                trailing="remove"
                onPress={() => {
                  const next = tagSet.filter((x) => x !== t);
                  setTagSet(next);
                  latestRef.current = { ...latestRef.current, tags: next };
                }}
                accessibilityLabel={`Remove tag ${t}`}
              />
            ))}
          </View>
        ) : null}

        <TextInput
          value={tagDraft}
          onChangeText={setTagDraft}
          onSubmitEditing={commitTag}
          onFocus={() => setTagFieldFocused(true)}
          onBlur={() => {
            commitTag();
            setTagFieldFocused(false);
          }}
          returnKeyType="done"
          autoCorrect={false}
          autoCapitalize="none"
          placeholder="Add a tag…"
          placeholderTextColor={colors.inkMuted}
          selectionColor={colors.ink}
          style={[styles.tagInput, { color: colors.inkMuted }]}
          accessibilityLabel="Add a tag"
        />

        {/* Suggestions — only while the add-field is focused: quick picks of
            the most-used tags when empty, draft matches as you type (prefix
            first, then substring). A `+` signals "not yet on this note"; tap
            commits through the same path as the field. */}
        {suggestions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.suggestionRow}
          >
            {suggestions.map((t) => (
              <TagChip
                key={t}
                label={t}
                variant="hue"
                trailing="add"
                onPress={() => addTag(t)}
                accessibilityLabel={`Add tag ${t}`}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* Body — handwritten input, auto-focused. Grows with content; the sheet
          below this line is what the keyboard overlays, so the caret always
          scrolls into view rather than the sheet moving. */}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        autoFocus
        multiline
        textAlignVertical="top"
        placeholder="Write a note, capture a thought…"
        placeholderTextColor={colors.inkMuted}
        selectionColor={colors.ink}
        accessibilityLabel="Edit note"
        style={[styles.input, { color: colors.ink }]}
      />

      <LinkSheet
        visible={linkSheetOpen}
        selected={selection}
        targets={targets}
        onSelect={handleRelate}
        onClose={() => setLinkSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.space.md,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  relateRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
    gap: tokens.space.xs,
    paddingVertical: 3,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.sm,
  },
  relateLabel: {
    flexShrink: 1,
  },
  freeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.4,
    borderStyle: "dashed",
  },

  // Tags — the note's flat labels. Header line + wrapping chip row + a slim
  // add-field. Same chip vocabulary as the feed's relatedness tag.
  tagSection: {
    marginTop: tokens.space.md,
    gap: tokens.space.sm,
  },
  tagHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs,
  },
  tagInput: {
    fontFamily: tokens.type.fontInter.regular,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 2,
    minHeight: 24,
  },

  // Suggestions — one horizontal line under the add-field, same chip
  // vocabulary as the owned tags (the `+` marks "not yet on this note").
  suggestionRow: {
    flexDirection: "row",
    gap: tokens.space.xs,
  },
  input: {
    flex: 1,
    marginTop: tokens.space.md,
    fontFamily: tokens.type.fontHand.regular,
    fontSize: 20,
    lineHeight: 26,
    paddingVertical: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  gone: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
    marginTop: tokens.space.xl,
  },
  goneBack: {
    alignItems: "center",
    paddingVertical: tokens.space.md,
  },
});
