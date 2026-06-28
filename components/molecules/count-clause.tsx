import { StyleSheet, Text } from "react-native";

import { entryKicker, tokens } from "@/constants/theme";

import type { FieldRowItem } from "@/components/molecules/field-row";
import type { Scheme } from "@/constants/theme";
import type { EntryType } from "@/lib/types";

// One colored count-phrase — "3 deadlines" — where the number + noun carry the
// type's color. A span (not a whole line) so several inline into a sentence.
export type CountSpan = { type: EntryType; n: number; noun: string };

// Singular/plural noun per type, in the order they read in a sentence.
const NOUNS: Record<EntryType, [string, string]> = {
  deadline: ["deadline", "deadlines"],
  todo: ["to-do", "to-dos"],
  idea: ["idea", "ideas"],
};

/** Count each type in `order`, dropping the zeros — yields the colored spans in
 *  reading order, with singular/plural nouns already resolved. */
export function spansFor(
  items: FieldRowItem[],
  order: EntryType[],
): CountSpan[] {
  return order
    .map((type) => {
      const n = items.filter((i) => i.type === type).length;
      return n > 0 ? { type, n, noun: NOUNS[type][n === 1 ? 0 : 1] } : null;
    })
    .filter((s): s is CountSpan => s !== null);
}

interface CountClauseProps {
  spans: CountSpan[];
  scheme: Scheme;
  /** Muted ink for the connective words ("and", commas). */
  muted: string;
}

/** A run of colored count-phrases joined with commas + "and", as one sentence
 *  flowing into the surrounding text. Numbers + nouns take the AA-safe type
 *  shade (entryKicker), the connective words stay muted ink. */
export function CountClause({
  spans,
  scheme,
  muted,
}: CountClauseProps): React.ReactElement {
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

const styles = StyleSheet.create({
  // Count-phrases are hand-scrawled agenda notes — Caveat carries "I jotted this
  // down to remember it", the type-color carries the category. Caveat runs small
  // and light optically, so it's sized up from the body and pulled a touch off
  // the baseline so the loops sit level with the surrounding Inter.
  count: {
    fontFamily: tokens.type.fontHand.bold,
    fontSize: 20,
    lineHeight: tokens.type.body.lineHeight,
    transform: [{ translateY: 1 }],
  },
});
