import { StyleSheet, Text } from "react-native";

import { entryKicker, tokens } from "@/constants/theme";

import type { FieldRowItem, Heat } from "@/components/molecules/field-row";
import type { Scheme } from "@/constants/theme";
import type { EntryType } from "@/lib/types";

/**
 * The companion's spoken read of ONE channel, built when you poke its orbiting
 * dot. It speaks in the SAME voice as FieldSummary: a muted-ink sentence with
 * the meaningful bits lifted out in the handwritten agenda hand (Caveat) and the
 * type's AA-safe color. There, the lifted bits are counts; here they're the real
 * THINGS — "Rebecca's birthday Thu" reads like a note you jotted, dropped into a
 * typed line.
 *
 * Two voices, by what the channel carries:
 *
 *  • ROLL-CALL — deadline, todo, event. Time-bound, so the line names real items
 *    with their own when-labels. The scaffolding ("then", "leads", "behind")
 *    varies by how the channel is shaped — one thing, a pair, or a stack — so it
 *    never reads as a filled-in template.
 *
 *  • SHAPE SENTENCE — idea, someday. No clock, so it characterizes the pile
 *    (light/heavy, drifting/stirring) and pins the newest by name.
 *
 * The phrasing is pure (segmentsFor → a list of text/colored-item segments); the
 * FocusLine component just renders those segments. Keeps copy testable and the
 * styling in one place.
 */

const HEAT_RANK: Record<Heat, number> = { hot: 3, warm: 2, cool: 1 };

/** How many real items a roll-call names before the rest collapse to "+N". */
const ROLL_CALL_MAX = 3;

const ROLL_CALL_TYPES: ReadonlySet<EntryType> = new Set([
  "deadline",
  "todo",
  "event",
]);

/**
 * One piece of the spoken line. A bare `text` segment is muted scaffolding; a
 * segment carrying an `item` is a real entry, rendered in the hand + type color.
 * An item segment's own `text` is what to show for it (title, or title + when).
 */
export type Segment = {
  text: string;
  item?: FieldRowItem;
};

/** Hottest-first; within a heat, dated leads undated so a "when" reads first. */
function byUrgency(a: FieldRowItem, b: FieldRowItem): number {
  const heat = HEAT_RANK[b.heat] - HEAT_RANK[a.heat];
  if (heat !== 0) return heat;
  if (a.when && !b.when) return -1;
  if (!a.when && b.when) return 1;
  return 0;
}

/** Label for a named item: "Rebecca's birthday Thu", or just the title undated. */
function label(item: FieldRowItem): string {
  return item.when ? `${item.title} ${item.when}` : item.title;
}

/** An item segment — the colored, handwritten lift. */
function lift(item: FieldRowItem): Segment {
  return { text: label(item), item };
}

/** Plain muted-scaffolding segment. */
function say(text: string): Segment {
  return { text };
}

/**
 * Roll-call segments. The connective copy changes with the shape of the channel
 * — a lone item, a pair, or a stack — and leans on whether the lead is overdue,
 * so the same three entries don't always read the same way.
 */
function rollCallSegments(rows: FieldRowItem[]): Segment[] {
  const ordered = [...rows].sort(byUrgency);
  const lead = ordered[0];
  const leadOverdue = !!lead.when && lead.when.includes("over");
  const leadHot = lead.heat === "hot";

  // One thing on the clock.
  if (ordered.length === 1) {
    return leadOverdue
      ? [lift(lead), say(" — and it's slipping.")]
      : leadHot
        ? [say("Just "), lift(lead), say(" — nothing else close.")]
        : [say("Only "), lift(lead), say(" out there.")];
  }

  // A pair — name both, joined by tone.
  if (ordered.length === 2) {
    const [a, b] = ordered;
    return leadOverdue
      ? [lift(a), say(" is overdue, then "), lift(b), say(".")]
      : [lift(a), say(", then "), lift(b), say(".")];
  }

  // A stack — lead, a couple named, the rest folded into a tail.
  const shown = ordered.slice(0, ROLL_CALL_MAX);
  const rest = ordered.length - shown.length;
  const [first, ...others] = shown;

  const middle: Segment[] = [];
  others.forEach((item, i) => {
    middle.push(say(i === 0 ? " — then " : ", "));
    middle.push(lift(item));
  });

  const tail =
    rest > 0 ? say(`, and ${rest} more behind.`) : say(".");

  return [
    lift(first),
    say(leadOverdue ? " leads, overdue" : leadHot ? " leads" : " sits up top"),
    ...middle,
    tail,
  ];
}

/**
 * Shape-sentence segments for the clock-less channels. Reads the texture, then
 * pins the newest (last row, insert order) by name as the lifted item.
 */
function shapeSegments(type: EntryType, rows: FieldRowItem[]): Segment[] {
  const n = rows.length;
  const newest = rows[rows.length - 1];

  if (n === 1) {
    return type === "idea"
      ? [say("One idea parked: "), lift(newest), say(".")]
      : [say("One someday, still alive: "), lift(newest), say(".")];
  }

  // Something in here is moving if any row isn't cool; otherwise it's at rest.
  const charged = rows.some((r) => r.heat !== "cool");
  const texture =
    type === "idea"
      ? charged
        ? `${n} ideas, one catching light. Newest: `
        : `${n} ideas drifting here. Newest: `
      : charged
        ? `${n} somedays, one stirring. Newest: `
        : `${n} somedays waiting. Newest: `;

  return [say(texture), lift(newest), say(".")];
}

/**
 * The spoken segments for a channel, dispatched on entry type (not lane) so an
 * event always rolls call even in the present stream. Empty channels return null.
 */
export function segmentsFor(
  type: EntryType,
  rows: FieldRowItem[],
): Segment[] | null {
  if (rows.length === 0) return null;
  return ROLL_CALL_TYPES.has(type)
    ? rollCallSegments(rows)
    : shapeSegments(type, rows);
}

interface FocusLineProps {
  type: EntryType;
  rows: FieldRowItem[];
  scheme: Scheme;
  /** Muted ink for the scaffolding words — matches FieldSummary's body color. */
  muted: string;
}

/**
 * Renders a focused channel's read as one body sentence: muted scaffolding with
 * the real items lifted in the agenda hand and the type's kicker color. Returns
 * null when the channel is empty (caller falls back to the field summary).
 */
export function FocusLine({
  type,
  rows,
  scheme,
  muted,
}: FocusLineProps): React.ReactElement | null {
  const segments = segmentsFor(type, rows);
  if (!segments) return null;

  const code = entryKicker(type, scheme);

  return (
    <Text style={[styles.line, { color: muted }]}>
      {segments.map((seg, i) =>
        seg.item ? (
          <Text key={`${seg.item.id}-${i}`} style={[styles.item, { color: code }]}>
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    marginTop: -tokens.space.xs,
    paddingRight: tokens.space.md,
  },
  // Same agenda-hand lift as CountClause: Caveat, sized up off a light optical
  // weight and nudged onto the baseline so the loops sit level with the Inter.
  item: {
    fontFamily: tokens.type.fontHand.bold,
    fontSize: 20,
    lineHeight: tokens.type.body.lineHeight,
    transform: [{ translateY: 1 }],
  },
});
