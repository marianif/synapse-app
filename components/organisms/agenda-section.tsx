import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { EmptyState } from "@/components/molecules/empty-state";
import { EntryRow } from "@/components/molecules/entry-row";
import { Brand, Spacing, TextColors } from "@/constants/theme";

import type { EntryType } from "@/components/atoms/entry-dot";

interface AgendaEntry {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  entryType: EntryType;
}

interface AgendaSectionProps {
  date: string; // e.g. "Tuesday, Mar 31"
  entries: AgendaEntry[];
  isEmpty?: boolean;
  onAdd?: () => void;
}

/**
 * Agenda section organism.
 * Full-bleed flat list (no card background) of the day's entries
 * sorted chronologically. No divider lines — spacing handles separation.
 */
export function AgendaSection({
  date,
  entries,
  isEmpty = false,
  onAdd,
}: AgendaSectionProps): React.ReactElement {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="label" style={{ color: TextColors.tertiary }}>
          {date}
        </ThemedText>
      </View>
      {isEmpty ? (
        <EmptyState
          icon="text-box-check-outline"
          title="Your day is clear"
          description="Add a todo, deadline, or event to build today's agenda."
          ctaLabel="+ Add Entry"
          onCta={onAdd ?? (() => {})}
          accentColor={Brand.primary}
        />
      ) : (
        <View style={styles.list}>
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              title={entry.title}
              subtitle={entry.subtitle}
              time={entry.time}
              entryType={entry.entryType}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: Spacing.xs,
  },

  list: {
    gap: Spacing.xs,
  },
});
