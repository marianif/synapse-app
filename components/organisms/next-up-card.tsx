import dayjs from "dayjs";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { CounterDisplay } from "@/components/atoms/counter-display";
import { ThemedText } from "@/components/atoms/themed-text";
import { entryColor, useTheme, tokens } from "@/constants/theme";
import { DbEntry } from "@/lib/types";

interface NextUpCardProps {
  entries: DbEntry[];
}

/**
 * "Next Up" hero card.
 * Identifies the closest upcoming event or deadline for today.
 * Shows time remaining in large hero typography.
 */
export function NextUpCard({ entries }: NextUpCardProps): React.ReactElement | null {
  const router = useRouter();
  const { colors } = useTheme();

  const nextItem = useMemo(() => {
    const today = dayjs().startOf("day");
    const now = dayjs();

    // Filter for events and deadlines scheduled for today that aren't completed
    const todayItems = entries.filter((e) => {
      if (e.status === "completed" || e.status === "met") return false;
      
      if (e.type === "event" && e.scheduled_date) {
        return dayjs(e.scheduled_date, "DD/MM/YYYY").isSame(today, "day");
      }
      if (e.type === "deadline" && e.due_date) {
        return dayjs(e.due_date, "DD/MM/YYYY").isSame(today, "day");
      }
      return false;
    });

    if (todayItems.length === 0) return null;

    // Map to comparable objects with a 'targetTime'
    const upcoming = todayItems.map((e) => {
      let targetTime = dayjs();
      if (e.type === "event" && e.scheduled_date && e.scheduled_time) {
        targetTime = dayjs(`${e.scheduled_date} ${e.scheduled_time}`, "DD/MM/YYYY hh:mm A");
      } else if (e.type === "deadline" && e.due_date) {
        // Deadlines without time are treated as end of day, but for "Next Up" 
        // we might prefer events with specific times.
        targetTime = e.due_time 
          ? dayjs(`${e.due_date} ${e.due_time}`, "DD/MM/YYYY hh:mm A")
          : dayjs(e.due_date, "DD/MM/YYYY").endOf("day");
      }
      return { entry: e, targetTime };
    })
    .filter(item => item.targetTime.isAfter(now))
    .sort((a, b) => a.targetTime.diff(b.targetTime));

    return upcoming[0] || null;
  }, [entries]);

  if (!nextItem) return null;

  const { entry, targetTime } = nextItem;
  const diffMinutes = targetTime.diff(dayjs(), "minute");
  
  let timeLabel = "";
  let unitLabel = "";
  
  if (diffMinutes >= 60) {
    timeLabel = Math.floor(diffMinutes / 60).toString();
    unitLabel = "HOURS LEFT";
  } else if (diffMinutes > 0) {
    timeLabel = diffMinutes.toString();
    unitLabel = "MINUTES LEFT";
  } else {
    timeLabel = "NOW";
    unitLabel = "STARTING";
  }

  const accentColor = entryColor(entry.type);

  return (
    <Pressable
      onPress={() => router.push(`/detail?id=${entry.id}`)}
      style={[styles.card, { backgroundColor: colors.surface }]}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          <ThemedText type="label" style={[styles.label, { color: colors.inkMuted }]}>
            NEXT UP
          </ThemedText>
          <ThemedText type="headline" numberOfLines={1} style={styles.title}>
            {entry.title}
          </ThemedText>
          <View style={styles.meta}>
            <View style={[styles.dot, { backgroundColor: accentColor }]} />
            <ThemedText type="caption" muted>
              {entry.type.toUpperCase()} • {entry.scheduled_time || entry.due_time || "Today"}
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.right}>
          <CounterDisplay value={parseInt(timeLabel) || 0} accentType={entry.type as any} />
          {isNaN(parseInt(timeLabel)) && (
             <ThemedText style={[styles.nowText, { color: accentColor }]}>{timeLabel}</ThemedText>
          )}
          <ThemedText type="label" style={[styles.unitLabel, { color: accentColor }]}>
            {unitLabel}
          </ThemedText>
        </View>
      </View>
      
      {/* Background Glow */}
      <View style={[styles.glow, { backgroundColor: accentColor }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xl,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  left: {
    flex: 1,
    gap: tokens.space.xs,
  },
  label: {
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  right: {
    alignItems: "flex-end",
  },
  nowText: {
    fontSize: tokens.type.display.size - 10,
    fontWeight: "700",
  },
  unitLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: -4,
  },
  glow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.08,
  },
});
