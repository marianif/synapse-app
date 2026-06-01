import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, entryKicker, tokens, useTheme } from "@/constants/theme";

import type { FieldRowItem } from "@/components/molecules/field-row";
import type { Scheme } from "@/constants/theme";
import type { EntryType } from "@/lib/types";

interface FieldBriefingProps {
  /** Current time, injected so the molecule stays pure. */
  now: Date;
  /** STAKES rows (deadlines + todos), pre-sorted hottest-first. */
  stakes: FieldRowItem[];
  /** PRESENT rows (ideas + events + someday), pre-sorted hottest-first. */
  present: FieldRowItem[];
}

function greetingFor(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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

/**
 * The companion's read of the field, spoken as one conversational sentence with
 * the real per-type counts inlined and colored. Stakes (deadlines, to-dos) "need
 * you this week"; present things (events, ideas, somedays) are "still here" — so
 * the voice stays observational, never a flat imperative list. The "next" chip
 * surfaces the single thing most worth a glance: the hottest stake if any are on
 * the line, otherwise a present thing to keep alive, so it never only points at
 * pressure.
 */
function brief(
  stakes: FieldRowItem[],
  present: FieldRowItem[],
): {
  stakeSpans: CountSpan[];
  presentSpans: CountSpan[];
  next: FieldRowItem | null;
} {
  const stakeSpans = spansFor(stakes, ["deadline", "todo"]);
  const presentSpans = spansFor(present, ["event", "idea", "someday"]);
  const hot = stakes.filter((s) => s.heat === "hot");
  const next = hot[0] ?? present[0] ?? stakes[0] ?? null;
  return { stakeSpans, presentSpans, next };
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
            <Text
              style={[styles.count, { color: entryKicker(s.type, scheme) }]}
            >
              {`${s.n} ${s.noun}`}
            </Text>
          </Text>
        );
      })}
    </>
  );
}

export function FieldBriefing({
  now,
  stakes,
  present,
}: FieldBriefingProps): React.ReactElement {
  const router = useRouter();
  const { scheme, colors } = useTheme();

  const { stakeSpans, presentSpans, next } = brief(stakes, present);
  const total = stakes.length + present.length;
  // Subject-verb agreement: one stake "needs you", several "need you".
  const stakeCount = stakeSpans.reduce((sum, s) => sum + s.n, 0);
  const stakeVerb =
    stakeCount === 1 ? " needs you this week" : " need you this week";
  // After a stakes clause the present clause needs a verb ("is/are still
  // here"); standing alone it reads as its own fragment ("here, still alive.").
  const presentCount = presentSpans.reduce((sum, s) => sum + s.n, 0);
  const presentTail =
    stakeSpans.length === 0
      ? " here, still alive."
      : presentCount === 1
        ? " is still here."
        : " are still here.";
  const hotCount = stakes.filter((s) => s.heat === "hot").length;
  const captured = 0; // reserved: "+N today" once capture timestamps are read

  return (
    <View style={styles.wrap}>
      <ThemedText type="display" style={{ color: colors.ink }}>
        {`${greetingFor(now.getHours())}.`}
      </ThemedText>

      <ThemedText type="body" style={[styles.line, { color: colors.inkMuted }]}>
        {total === 0 ? (
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

      {next ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: "/detail", params: { id: next.id } })
          }
          accessibilityRole="button"
          accessibilityLabel={`Open ${next.title}${next.when ? `, ${next.when}` : ""}`}
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: colors.surface },
            tokens.elevation.tile,
            pressed && styles.chipPressed,
          ]}
        >
          <View
            style={[
              styles.chipEdge,
              { backgroundColor: entryColor(next.type) },
            ]}
          />
          <ThemedText
            type="item"
            numberOfLines={1}
            style={[styles.chipTitle, { color: colors.ink }]}
          >
            {next.title}
          </ThemedText>
          {next.when ? (
            <ThemedText
              type="mono"
              style={[styles.chipWhen, { color: colors.inkMuted }]}
            >
              {next.when}
            </ThemedText>
          ) : null}
          <ThemedText
            type="mono"
            style={[styles.chipArrow, { color: entryColor(next.type) }]}
          >
            →
          </ThemedText>
        </Pressable>
      ) : null}

      {total > 0 ? (
        <ThemedText
          type="label"
          style={[styles.readout, { color: colors.inkMuted }]}
        >
          {`${hotCount} HOT · ${present.length} PRESENT${
            captured > 0 ? ` · +${captured} TODAY` : ""
          }`}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.sm,
    paddingTop: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  line: {
    marginTop: -tokens.space.xs,
  },
  // Colored count-phrases pop through weight + type-color (no italic Inter is
  // loaded; "bold through type, calm through color" carries the emphasis).
  count: {
    fontFamily: tokens.type.fontInter.semiBold,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingLeft: tokens.space.md,
    paddingRight: tokens.space.md,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    marginTop: tokens.space.xs,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipEdge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  chipTitle: {
    flex: 1,
    marginRight: tokens.space.sm,
  },
  chipWhen: {
    marginRight: tokens.space.sm,
  },
  chipArrow: {},
  readout: {
    marginTop: tokens.space.xs,
    paddingHorizontal: tokens.space.xs,
  },
});
