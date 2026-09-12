import { StyleSheet, Text } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { CountClause, spansFor } from "@/components/molecules/count-clause";
import { entryKicker, tokens, useTheme } from "@/constants/theme";

import type { FieldRowItem } from "@/components/molecules/field-row";
import type { EntryType } from "@/lib/types";

/**
 * A flagged "next action" as the greeting names it: enough to identify the
 * entry (id + type for its color) and its title to render in the handwritten
 * layer. Built by the home screen from the open, flagged entries.
 */
export interface NextAction {
  id: string;
  type: EntryType;
  title: string;
}

interface FieldSummaryProps {
  /** STAKES rows (deadlines + todos). */
  stakes: FieldRowItem[];
  /** PRESENT rows (ideas). */
  present: FieldRowItem[];
  /**
   * Open entries the user flagged as next, most recently chosen first. The
   * summary names up to three and reports the remainder as a tappable count.
   */
  nextActions?: NextAction[];
  /** Optional tap per count-phrase — lets the voice drill into a cut. */
  onSelectType?: (type: EntryType) => void;
  /** Tapping a named next action opens its entry. */
  onSelectNext?: (id: string) => void;
  /** Tapping "+N more" leaves the voice for the Agenda, where all are listed. */
  onShowMoreNext?: () => void;
}

/** How many next actions the greeting names before folding the rest into +N. */
const NEXT_SHOWN = 3;

/**
 * The companion's read of the field, spoken as one conversational sentence with
 * the real per-type counts inlined and colored. Stakes (deadlines, to-dos) "need
 * you this week"; present things (ideas) are "still here". When the user has
 * flagged next actions, they ride along as a final clause in the handwritten
 * voice — additive, never a replacement: the counts above stay intact.
 */
export function FieldSummary({
  stakes,
  present,
  nextActions,
  onSelectType,
  onSelectNext,
  onShowMoreNext,
}: FieldSummaryProps): React.ReactElement {
  const { scheme, colors } = useTheme();

  const stakeSpans = spansFor(stakes, ["deadline", "todo"]);
  const presentSpans = spansFor(present, ["idea"]);

  // Subject-verb agreement: one stake "needs you", several "need you".
  const stakeCount = stakeSpans.reduce((sum, s) => sum + s.n, 0);
  const stakeVerb =
    stakeCount === 1 ? " needs you this week" : " need you this week";
  // After a stakes clause the present clause needs a verb ("is/are still here");
  // standing alone it reads as its own fragment ("here, still alive.").
  const presentCount = presentSpans.reduce((sum, s) => sum + s.n, 0);
  const presentTail =
    stakeSpans.length === 0
      ? " here, still alive."
      : presentCount === 1
        ? " is still here."
        : " are still here.";

  const hasSummary = stakeSpans.length > 0 || presentSpans.length > 0;

  // The next-action clause: name up to three, fold the rest into "+N more".
  const next = nextActions ?? [];
  const shown = next.slice(0, NEXT_SHOWN);
  const more = next.length - shown.length;

  return (
    <ThemedText type="body" style={[styles.line, { color: colors.inkMuted }]}>
      {stakeSpans.length > 0 ? (
        <>
          <CountClause
            spans={stakeSpans}
            scheme={scheme}
            muted={colors.inkMuted}
            onSelect={onSelectType}
          />
          {stakeVerb}
          {presentSpans.length > 0 ? "; " : "."}
        </>
      ) : null}
      {presentSpans.length > 0 ? (
        <>
          <CountClause
            spans={presentSpans}
            scheme={scheme}
            muted={colors.inkMuted}
            onSelect={onSelectType}
          />
          {presentTail}
        </>
      ) : null}

      {shown.length > 0 ? (
        <>
          {hasSummary ? " And you flagged " : "You flagged "}
          {shown.length === 1 ? "this as next: " : "these as next: "}
          {shown.map((n, i) => (
            <Text key={n.id}>
              {i === 0 ? "" : i === shown.length - 1 ? " and " : ", "}
              <Text
                onPress={onSelectNext ? () => onSelectNext(n.id) : undefined}
                accessibilityRole={onSelectNext ? "button" : undefined}
                accessibilityLabel={
                  onSelectNext ? `Open next action: ${n.title}` : undefined
                }
                style={[styles.next, { color: entryKicker(n.type, scheme) }]}
              >
                {n.title}
              </Text>
            </Text>
          ))}
          {more > 0 ? (
            <>
              {", "}
              <Text
                onPress={onShowMoreNext}
                accessibilityRole={onShowMoreNext ? "button" : undefined}
                accessibilityLabel={
                  onShowMoreNext ? `Show ${more} more next actions` : undefined
                }
                style={[styles.more, { color: colors.inkMuted }]}
              >
                {`+${more} more`}
              </Text>
            </>
          ) : null}
          {"."}
        </>
      ) : null}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  line: {
    marginTop: -tokens.space.xs,
  },
  // Flagged next-action titles are hand-scrawled — the same Caveat voice as the
  // count-phrases, sized up for its small optical size. They take the entry's
  // AA-safe kicker shade so identity survives, and stay tappable.
  next: {
    fontFamily: tokens.type.fontHand.bold,
    fontSize: 20,
    lineHeight: tokens.type.body.lineHeight,
    transform: [{ translateY: 1 }],
  },
  more: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.mono.size,
  },
});
