import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { EmptyState } from "@/components/molecules/empty-state";
import { TodayEventRow } from "@/components/molecules/today-event-row";
import {
  Brand,
  EntryAccent,
  Radius,
  Spacing,
  Surface,
  TextColors,
} from "@/constants/theme";

interface TodayEvent {
  id: string;
  title: string;
  timeRange?: string;
  subtitle?: string;
  statusTime?: string;
  statusLabel?: string;
  isActive?: boolean;
}

interface TodaySectionProps {
  events: TodayEvent[];
  isEmpty?: boolean;
  onAdd?: () => void;
}

/**
 * Today section organism.
 * Shows "TODAY" / "CURRENT STATUS" header row and a list of today's events.
 * The active event displays a live countdown status badge.
 */
export function TodaySection({
  events,
  isEmpty = false,
  onAdd,
}: TodaySectionProps): React.ReactElement {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="label" style={{ color: Brand.primary }}>
          Today
        </ThemedText>
        <ThemedText type="label" style={{ color: TextColors.tertiary }}>
          Current Status
        </ThemedText>
      </View>
      <View style={styles.card}>
        {isEmpty ? (
          <EmptyState
            icon="calendar-clock"
            title="No events today"
            description="Your day is clear!"
            ctaLabel="+ Add Event"
            onCta={onAdd ?? (() => {})}
            accentColor={EntryAccent.event}
          />
        ) : (
          events.map((event, index) => (
            <View key={event.id}>
              <TodayEventRow
                title={event.title}
                timeRange={event.timeRange}
                subtitle={event.subtitle}
                statusTime={event.statusTime}
                statusLabel={event.statusLabel}
                isActive={event.isActive}
              />
              {index < events.length - 1 && <View style={styles.separator} />}
            </View>
          ))
        )}
      </View>
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
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
  },
  card: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
});
