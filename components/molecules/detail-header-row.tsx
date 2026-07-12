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
      <EntryDot type={type} size={8} />
      <ThemedText type="label" style={{ color: accent }}>
        {type}
      </ThemedText>

      {urgency ? (
        <View style={[styles.chip, { backgroundColor: urgency.color + "18" }]}>
          <ThemedText type="micro" style={{ color: urgency.color }}>
            {urgency.text}
          </ThemedText>
        </View>
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
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  chip: {
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
