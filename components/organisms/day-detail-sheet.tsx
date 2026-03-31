import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { EmptyState } from "@/components/molecules/empty-state";
import { EntryRow } from "@/components/molecules/entry-row";
import { Brand, Radius, Spacing, Surface, TextColors } from "@/constants/theme";

import type { CalendarEntry } from "@/hooks/use-calendar-data";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.5;

interface DayDetailSheetProps {
  visible: boolean;
  date: Date | null;
  entries: CalendarEntry[];
  onClose: () => void;
  onAdd: (date: Date) => void;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function DayDetailSheet({
  visible,
  date,
  entries,
  onClose,
  onAdd,
}: DayDetailSheetProps): React.ReactElement {
  const hasEntries = entries.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          {date && (
            <View style={styles.header}>
              <ThemedText type="headline" style={styles.dateLabel}>
                {formatDateLabel(date)}
              </ThemedText>
              <ThemedText type="caption" muted>
                {hasEntries
                  ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
                  : "No entries"}
              </ThemedText>
            </View>
          )}

          <View style={styles.content}>
            {hasEntries ? (
              <View style={styles.list}>
                {entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    title={entry.title}
                    time={entry.time ?? undefined}
                    entryType={entry.type}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                title="Nothing here"
                description="No entries scheduled for this day."
                ctaLabel="+ Add Entry"
                onCta={() => date && onAdd(date)}
                accentColor={Brand.primary}
              />
            )}
          </View>

          {hasEntries && date && (
            <Pressable
              onPress={() => onAdd(date)}
              style={styles.addButton}
              accessibilityRole="button"
            >
              <ThemedText type="body" style={styles.addButtonText}>
                + Add to this day
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheet: {
    backgroundColor: Surface.containerLow,
    borderTopLeftRadius: Radius.xl + 8,
    borderTopRightRadius: Radius.xl + 8,
    minHeight: SHEET_HEIGHT,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: TextColors.disabled,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Surface.outlineVariant,
    gap: 2,
  },
  dateLabel: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  list: {
    gap: Spacing.xs,
  },
  addButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    backgroundColor: Brand.fabGlow,
    borderRadius: Radius.md,
  },
  addButtonText: {
    color: Brand.primary,
    fontWeight: "600",
  },
});
