import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { CountClause, spansFor } from "@/components/molecules/count-clause";
import { tokens, useTheme } from "@/constants/theme";

import type { FieldRowItem } from "@/components/molecules/field-row";

interface FieldSummaryProps {
  /** STAKES rows (deadlines + todos). */
  stakes: FieldRowItem[];
  /** PRESENT rows (events + ideas + somedays). */
  present: FieldRowItem[];
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
});
