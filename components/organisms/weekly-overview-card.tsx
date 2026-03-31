import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { BentoCardHeader } from "@/components/molecules/bento-card-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { WeekdayRow } from "@/components/molecules/weekday-row";
import {
  EntryAccent,
  Radius,
  Spacing,
  Surface,
  TextColors,
} from "@/constants/theme";

import type { EntryType } from "@/components/atoms/entry-dot";
import type { ItemStatus } from "@/components/molecules/list-item";

interface WeekdayEntry {
  day: string;
  title?: string;
  entryType?: EntryType;
  status?: ItemStatus;
}

interface WeeklyOverviewCardProps {
  totalCount: number;
  spanDays: number;
  entries: WeekdayEntry[];
  isEmpty?: boolean;
  onAdd?: () => void;
}

/**
 * Bento card showing the weekly todo overview.
 * Large blue counter + weekday rows with todo dots.
 */
export function WeeklyOverviewCard({
  totalCount,
  spanDays,
  entries,
  isEmpty = false,
  onAdd,
}: WeeklyOverviewCardProps): React.ReactElement {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/list?entryType=todo")}
      accessibilityRole="button"
      accessibilityLabel="Open weekly todos list"
    >
      <View style={styles.card}>
        <BentoCardHeader
          count={totalCount}
          accentType="todo"
          label="Weekly Overview"
          description={isEmpty ? "No todos yet" : `Across ${spanDays} days`}
          icon={
            <MaterialCommunityIcons
              name="chart-bar"
              size={24}
              color={TextColors.secondary}
            />
          }
        />
        {isEmpty ? (
          <EmptyState
            title="No todos this week"
            description="Schedule todos to track your weekly momentum."
            ctaLabel="+ Add Todo"
            onCta={onAdd ?? (() => router.push("/list?entryType=todo"))}
            accentColor={EntryAccent.todo}
          />
        ) : (
          <View style={styles.rows}>
            {entries.map((entry) => (
              <WeekdayRow
                key={entry.day}
                day={entry.day}
                title={entry.title}
                entryType={entry.entryType ?? "todo"}
                status={entry.status}
              />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  rows: {
    gap: Spacing.xs,
  },
});
