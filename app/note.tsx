import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SketchIcon } from "@/components/atoms/sketch-icon";
import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  LinkSheet,
  type LinkableTarget,
  type LinkSelection,
} from "@/components/organisms/link-sheet";
import { tokens, useTheme } from "@/constants/theme";
import { useDatabase } from "@/hooks/use-database/use-database";
import { useDiary } from "@/hooks/use-diary";

/**
 * A single note opened up for editing, presented as a native modal
 * (`presentation: "modal"` in the root stack). The sheet is deliberately
 * top-anchored and never wrapped in a KeyboardAvoidingView: a native pageSheet
 * is not resized for the keyboard, so the keyboard slides over the sheet's
 * lower edge instead of shoving it up — the header (close / save) and the
 * relate row stay clear of it by sitting above the body input.
 *
 * The note's content is passed in through navigation params — the caller's
 * store already holds it, and this route mounts its own `useDiary` instance
 * that loads asynchronously, so looking the note up again here would seed the
 * draft from an empty store. The modal commits on Save via `updateEntry`.
 *
 * On the notes tab (`relatable`) the relate row lets the user move the note
 * while editing it. Opened from a project screen (`relatable=0`) the relate
 * row is hidden — the note is by definition ON that project, so the link is
 * implied.
 *
 * Closing the modal autosaves: dismissing via the X, the native swipe-down, or
 * the back gesture commits the draft (and any relate change) without needing
 * the Save button — the Check button is an explicit save for the same write.
 */
export default function NoteScreen(): React.ReactElement {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, body, relatable, linkedProjectId, linkedEntryId } =
    useLocalSearchParams<{
      id?: string;
      body?: string;
      relatable?: string;
      /** The note's current link, if it has one — seeds the relate row. */
      linkedProjectId?: string;
      linkedEntryId?: string;
    }>();

  const { updateEntry } = useDiary();
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

  // Live values for the blur-time autosave — the focus-effect cleanup captures
  // the first render's draft otherwise.
  const latestRef = useRef({ draft, selection });
  latestRef.current = { draft, selection };
  // Set once a write has committed; the dismissal listener then skips so
  // closing never writes twice.
  const committedRef = useRef(false);

  // Persist the latest draft + relate selection if anything changed. Marks
  // committed so an idle open/close (or a double path) never touches the DB.
  // Resolves when the write lands so callers can sequence on it.
  const persist = useCallback((): Promise<void> => {
    if (committedRef.current || !id) return Promise.resolve();
    const { draft: latestDraft, selection: latestSelection } = latestRef.current;
    const trimmed = latestDraft.trim();
    if (!trimmed) return Promise.resolve();
    const dirty =
      trimmed !== (body ?? "") ||
      (canRelate &&
        ((latestSelection?.kind === "project" &&
          latestSelection.id !== (linkedProjectId ?? "")) ||
          (latestSelection?.kind === "idea" &&
            latestSelection.id !== (linkedEntryId ?? "")) ||
          (!latestSelection &&
            Boolean(linkedProjectId || linkedEntryId))));
    if (!dirty) return Promise.resolve();
    committedRef.current = true;
    return updateEntry(id, {
      body: trimmed,
      ...(canRelate
        ? {
            linkedEntryId:
              latestSelection?.kind === "idea" ? latestSelection.id : null,
            linkedProjectId:
              latestSelection?.kind === "project"
                ? latestSelection.id
                : null,
          }
        : {}),
    });
  }, [id, body, canRelate, linkedProjectId, linkedEntryId, updateEntry]);

  // Save when the screen is being removed — the X, the native swipe-down, and
  // the back gesture all funnel through `beforeRemove`, which blocks dismissal
  // until the write lands so the caller's refresh never reads stale data.
  // Idempotent via committedRef: the explicit Check button writes first and
  // then navigates, so this listener just replays the removal.
  useEffect(() => {
    if (!id) return;
    return navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      void persist().then(() => {
        navigation.dispatch(e.data.action);
      });
    });
  }, [navigation, persist, id]);

  // Blur-time autosave safety net: whatever dismissal path closes the sheet,
  // the screen blurs as it's removed and this cleanup persists the latest
  // draft. `beforeRemove` is the primary path; `persist` is idempotent
  // (committedRef), so a close that reaches both writes at most once.
  useFocusEffect(
    useCallback(() => {
      return () => {
        void persist();
      };
    }, [persist]),
  );

  if (!id) {
    return (
      <View
        style={[
          styles.screen,
          { backgroundColor: colors.paper, paddingTop: insets.top },
        ]}
      >
        <ThemedText type="hand" style={[styles.gone, { color: colors.inkMuted }]}>
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
    const trimmed = draft.trim();
    if (!trimmed) return;
    // Mark committed first so the blur cleanup (autosave) doesn't double-write
    // as this explicit save navigates away.
    committedRef.current = true;
    void updateEntry(id, {
      body: trimmed,
      ...(canRelate
        ? {
            linkedEntryId: selection?.kind === "idea" ? selection.id : null,
            linkedProjectId:
              selection?.kind === "project" ? selection.id : null,
          }
        : {}),
    }).then(() => router.back());
  };

  const handleRelate = (next: LinkSelection): void => {
    setSelection(next);
    setLinkSheetOpen(false);
  };

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.paper, paddingTop: insets.top },
      ]}
    >
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