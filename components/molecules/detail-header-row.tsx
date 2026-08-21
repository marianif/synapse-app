import { StyleSheet, View } from "react-native";

import { EntryDot } from "@/components/atoms/entry-dot";
import { ThemedText } from "@/components/atoms/themed-text";
import { tokens } from "@/constants/theme";

import type { EntryType } from "@/lib/types";

type DetailHeaderRowProps = {
  type: EntryType;
  accent: string;
  urgency: { text: string; color: string } | null;
  statusLabel: string;
  statusColor: string | null;
};

// Type dot + type label + urgency chip + status label — the sheet's identity
// row. Status reads in its feedback color when meaningful (overdue/done),
// muted otherwise.
export function DetailHeaderRow({
  type,
  accent,
  urgency,
  statusLabel,
  statusColor,
}: DetailHeaderRowProps): React.ReactElement {
  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <EntryDot type={type} size={8} />
        <ThemedText type="label" style={{ color: accent }}>
          {type}
        </ThemedText>
      </View>

      <View style={styles.trailing}>
        {urgency ? (
          <ThemedText
            type="micro"
            style={[styles.urgency, { color: urgency.color }]}
          >
            {urgency.text}
          </ThemedText>
        ) : null}

        {statusColor ? (
          <ThemedText type="micro" style={{ color: statusColor }}>
            {statusLabel}
          </ThemedText>
        ) : (
          <ThemedText type="micro" muted>
            {statusLabel}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.space.sm,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  urgency: {
    fontVariant: ["tabular-nums"],
  },
});
