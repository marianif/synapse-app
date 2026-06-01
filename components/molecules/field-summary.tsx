import { StyleSheet, Text } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryKicker, tokens, useTheme } from "@/constants/theme";

import type { FieldRowItem } from "@/components/molecules/field-row";
import type { Scheme } from "@/constants/theme";
import type { EntryType } from "@/lib/types";

interface FieldSummaryProps {
  /** STAKES rows (deadlines + todos). */
  stakes: FieldRowItem[];
  /** PRESENT rows (events + ideas + somedays). */
  present: FieldRowItem[];
}

// One colored count-phrase — "3 deadlines" — where the number + noun carry the
// type's color. A span (not a whole line) so several inline into a sentence.
type CountSpan = { type: EntryType; n: number; noun: string };

// Singular/plural noun per type, in the order they read in a sentence.
const NOUNS: Record<EntryType, [string, string]> = {
  deadline: ["deadline", "deadlines"],
  todo: ["to-do", "to-dos"],
  event: ["event", "events"],
  idea: ["idea", "ideas"],
  someday: ["someday", "somedays"],
};

function spansFor(items: FieldRowItem[], order: EntryType[]): CountSpan[] {
  return order
    .map((type) => {
      const n = items.filter((i) => i.type === type).length;
      return n > 0 ? { type, n, noun: NOUNS[type][n === 1 ? 0 : 1] } : null;
    })
    .filter((s): s is CountSpan => s !== null);
}

/** A run of colored count-phrases joined with commas + "and", as one sentence
 *  flowing into the surrounding text. Numbers + nouns take the AA-safe type
 *  shade (entryKicker), the connective words stay muted ink. */
function CountClause({
  spans,
  scheme,
  muted,
}: {
  spans: CountSpan[];
  scheme: Scheme;
  muted: string;
}): React.ReactElement {
  return (
    <>
      {spans.map((s, i) => {
        const sep = i === 0 ? "" : i === spans.length - 1 ? " and " : ", ";
        return (
          <Text key={s.type}>
            <Text style={{ color: muted }}>{sep}</Text>
            <Text style={[styles.count, { color: entryKicker(s.type, scheme) }]}>
              {`${s.n} ${s.noun}`}
            </Text>
          </Text>
        );
      })}
    </>
  );
}

/**
 * The companion's read of the field, spoken as one conversational sentence with
 * the real per-type counts inlined and colored. Stakes (deadlines, to-dos) "need
 * you this week"; present things (events, ideas, somedays) are "still here" — so
 * the voice stays observational, never a flat imperative list.
 */
export function FieldSummary({
  stakes,
  present,
}: FieldSummaryProps): React.ReactElement {
  const { scheme, colors } = useTheme();

  const stakeSpans = spansFor(stakes, ["deadline", "todo"]);
  const presentSpans = spansFor(present, ["event", "idea", "someday"]);

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

  const empty = stakeSpans.length === 0 && presentSpans.length === 0;

  return (
    <ThemedText type="body" style={[styles.line, { color: colors.inkMuted }]}>
      {empty ? (
        "Your field is clear. Capture the first thing below."
      ) : (
        <>
          {stakeSpans.length > 0 ? (
            <>
              <CountClause
                spans={stakeSpans}
                scheme={scheme}
                muted={colors.inkMuted}
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
              />
              {presentTail}
            </>
          ) : null}
        </>
      )}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  line: {
    marginTop: -tokens.space.xs,
  },
  // Colored count-phrases pop through weight + type-color (no italic Inter is
  // loaded; "bold through type, calm through color" carries the emphasis).
  count: {
    fontFamily: tokens.type.fontInter.semiBold,
  },
});
