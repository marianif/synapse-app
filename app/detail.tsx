import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountdownChip } from '@/components/atoms/countdown-chip';
import { EntryDot } from '@/components/atoms/entry-dot';
import { ThemedText } from '@/components/atoms/themed-text';
import { DetailActionBar } from '@/components/molecules/detail-action-bar';
import { DetailMetadataRow } from '@/components/molecules/detail-metadata-row';
import { DetailSomedayHero } from '@/components/molecules/detail-someday-hero';
import { EmptyState } from '@/components/molecules/empty-state';
import { ListScreenHeader } from '@/components/organisms/list-screen-header';
import { EntryAccent, Radius, Spacing, Surface, TextColors } from '@/constants/theme';
import { useDatabase } from '@/hooks/use-database';

import type { EntryType } from '@/components/atoms/entry-dot';
import type { ActionItem } from '@/components/molecules/detail-action-bar';

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_ABBRS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDaysRemaining(dueDateStr: string | null): number {
  if (!dueDateStr) return 0;
  // Expects "DayName, Mon DD" e.g. "Thursday, Apr 10"
  const parts = dueDateStr.replace(',', '').split(' ');
  if (parts.length < 3) return 0;
  const monthIndex = MONTH_ABBRS.indexOf(parts[1]);
  const day = parseInt(parts[2], 10);
  if (monthIndex === -1 || isNaN(day)) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(today.getFullYear(), monthIndex, day);
  return Math.max(0, Math.ceil((due.getTime() - today.getTime()) / 86_400_000));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'SCHEDULED',
  active: 'ACTIVE NOW',
  completed: 'COMPLETED',
  pending: 'PENDING',
  overdue: 'OVERDUE',
  met: 'MET',
};

function getStatusColor(status: string, accentColor: string): string {
  if (status === 'completed' || status === 'met') return '#52C87A';
  if (status === 'overdue') return '#FF4444';
  if (status === 'active') return accentColor;
  return TextColors.tertiary;
}

// ─── Type chip ────────────────────────────────────────────────────────────────

function TypeChip({
  entryType,
  accentColor,
}: {
  entryType: EntryType;
  accentColor: string;
}): React.ReactElement {
  const labels: Record<EntryType, string> = {
    task: 'TASK',
    deadline: 'DEADLINE',
    event: 'EVENT',
    someday: 'ONE DAY',
  };
  return (
    <View style={[styles.typeChip, { backgroundColor: accentColor + '20' }]}>
      <EntryDot type={entryType} size={6} />
      <ThemedText type="caption" style={[styles.typeChipText, { color: accentColor }]}>
        {labels[entryType]}
      </ThemedText>
    </View>
  );
}

// ─── Section: Task hero ───────────────────────────────────────────────────────

function TaskHero({
  status,
  scheduledDate,
  scheduledTime,
  accentColor,
}: {
  status: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  accentColor: string;
}): React.ReactElement {
  const statusColor = getStatusColor(status, accentColor);
  return (
    <View style={styles.heroBlock}>
      <View style={[styles.statusChip, { backgroundColor: statusColor + '18' }]}>
        <ThemedText type="label" style={[styles.statusLabel, { color: statusColor }]}>
          {STATUS_LABELS[status] ?? status.toUpperCase()}
        </ThemedText>
      </View>
      <View style={styles.metaList}>
        {scheduledDate ? (
          <DetailMetadataRow
            icon="calendar-outline"
            label="Date"
            value={scheduledDate}
            accentColor={accentColor}
          />
        ) : null}
        {scheduledTime ? (
          <DetailMetadataRow
            icon="clock-outline"
            label="Time"
            value={scheduledTime}
            accentColor={accentColor}
          />
        ) : null}
      </View>
    </View>
  );
}

// ─── Section: Deadline hero ───────────────────────────────────────────────────

function DeadlineHero({
  status,
  dueDate,
  dueTime,
  accentColor,
}: {
  status: string;
  dueDate: string | null;
  dueTime: string | null;
  accentColor: string;
}): React.ReactElement {
  const daysRemaining = parseDaysRemaining(dueDate);
  return (
    <View style={styles.heroBlock}>
      <CountdownChip
        daysRemaining={daysRemaining}
        state={status as 'pending' | 'overdue' | 'met'}
      />
      <View style={styles.metaList}>
        {dueDate ? (
          <DetailMetadataRow
            icon="calendar-alert"
            label="Due Date"
            value={dueDate}
            accentColor={accentColor}
          />
        ) : null}
        {dueTime ? (
          <DetailMetadataRow
            icon="clock-outline"
            label="Due Time"
            value={dueTime}
            accentColor={accentColor}
          />
        ) : null}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DetailScreen(): React.ReactElement {
  const router = useRouter();
  const { id, entryType } = useLocalSearchParams<{ id?: string; entryType?: string }>();

  const resolvedType: EntryType =
    entryType === 'deadline' ? 'deadline' :
    entryType === 'someday' ? 'someday' :
    entryType === 'event' ? 'event' :
    'task';

  const accentColor = EntryAccent[resolvedType];

  const isSomeday = resolvedType === 'someday';

  const { entries, ideas, isLoading, updateEntryStatus, deleteEntry, fetchEntries, fetchIdeas } =
    useDatabase();

  useFocusEffect(
    useCallback(() => {
      if (isSomeday) {
        fetchIdeas();
      } else {
        fetchEntries(resolvedType);
      }
    }, [isSomeday, resolvedType, fetchEntries, fetchIdeas]),
  );

  // ── Resolve entry ────────────────────────────────────────────────────────────

  const entry = isSomeday ? null : entries.find((e) => e.id === id);
  const idea = isSomeday ? ideas.find((i) => i.id === id) : null;

  const title = entry?.title ?? idea?.title ?? '';
  const notes = entry?.notes ?? idea?.notes ?? null;

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ListScreenHeader title="" onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator color={accentColor} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────

  if (!entry && !idea) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ListScreenHeader title="" onBack={() => router.back()} />
        <View style={styles.centered}>
          <EmptyState
            icon="alert-circle-outline"
            title="Entry not found"
            description="This entry may have been deleted."
            ctaLabel="Go Back"
            onCta={() => router.back()}
            accentColor={accentColor}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Action bar ───────────────────────────────────────────────────────────────

  async function handleComplete(): Promise<void> {
    if (!entry) return;
    const nextStatus = entry.status === 'completed' ? 'scheduled' : 'completed';
    await updateEntryStatus(entry.id, nextStatus);
  }

  async function handleMarkMet(): Promise<void> {
    if (!entry) return;
    const nextStatus = entry.status === 'met' ? 'pending' : 'met';
    await updateEntryStatus(entry.id, nextStatus);
  }

  async function handleDelete(): Promise<void> {
    if (entry) {
      await deleteEntry(entry.id);
    }
    router.back();
  }

  const actions: [ActionItem, ActionItem, ActionItem] =
    resolvedType === 'task' || resolvedType === 'event'
      ? [
          {
            icon: 'check-circle-outline',
            label: entry?.status === 'completed' ? 'Completed' : 'Complete',
            onPress: handleComplete,
            isPrimary: true,
            accentColor,
          },
          { icon: 'calendar-clock', label: 'Reschedule', onPress: () => {} },
          { icon: 'trash-can-outline', label: 'Delete', onPress: handleDelete, isDanger: true },
        ]
      : resolvedType === 'deadline'
        ? [
            {
              icon: 'check-decagram-outline',
              label: entry?.status === 'met' ? 'Met' : 'Mark Met',
              onPress: handleMarkMet,
              isPrimary: true,
              accentColor,
            },
            { icon: 'calendar-clock', label: 'Reschedule', onPress: () => {} },
            { icon: 'trash-can-outline', label: 'Delete', onPress: handleDelete, isDanger: true },
          ]
        : [
            {
              icon: 'arrow-up-circle-outline',
              label: 'Promote',
              onPress: () => {},
              isPrimary: true,
              accentColor,
            },
            { icon: 'pencil-outline', label: 'Edit', onPress: () => {} },
            { icon: 'trash-can-outline', label: 'Delete', onPress: () => router.back(), isDanger: true },
          ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        {/* ── Header ───────────────────────────────────────────── */}
        <ListScreenHeader
          title=""
          onBack={() => router.back()}
        />

        {/* ── Scrollable content ──────────────────────────────── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Type chip */}
          <TypeChip entryType={resolvedType} accentColor={accentColor} />

          {/* Title */}
          <ThemedText type="headline" style={styles.title}>
            {title}
          </ThemedText>

          {/* Type-specific hero block */}
          {entry && (resolvedType === 'task' || resolvedType === 'event') ? (
            <TaskHero
              status={entry.status}
              scheduledDate={entry.scheduled_date}
              scheduledTime={entry.scheduled_time}
              accentColor={accentColor}
            />
          ) : entry && resolvedType === 'deadline' ? (
            <DeadlineHero
              status={entry.status}
              dueDate={entry.due_date}
              dueTime={entry.due_time}
              accentColor={accentColor}
            />
          ) : idea ? (
            <DetailSomedayHero inspiration={idea.inspiration ?? undefined} />
          ) : null}

          {/* Project / subtitle (ideas only) */}
          {idea?.subtitle ? (
            <DetailMetadataRow
              icon="folder-outline"
              label="Project"
              value={idea.subtitle}
              accentColor={accentColor}
            />
          ) : null}

          {/* Notes */}
          {notes ? (
            <View style={styles.notesBlock}>
              <ThemedText type="caption" muted style={styles.notesLabel}>
                NOTES
              </ThemedText>
              <ThemedText type="body" style={styles.notesText}>
                {notes}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.contentSpacer} />
        </ScrollView>

        {/* ── Action bar — pinned above safe area ─────────────── */}
        <View style={styles.actionBarWrapper}>
          <DetailActionBar actions={actions} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  screen: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  typeChipText: {
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Inter_700Bold',
  },
  // ── Hero block ──────────────────────────────────────────────
  heroBlock: {
    gap: Spacing.md,
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  statusLabel: {
    letterSpacing: 0.8,
  },
  metaList: {
    gap: Spacing.sm,
  },
  // ── Notes ───────────────────────────────────────────────────
  notesBlock: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  notesLabel: {
    letterSpacing: 0.6,
  },
  notesText: {
    lineHeight: 22,
    color: TextColors.secondary,
  },
  contentSpacer: {
    height: Spacing.xl,
  },
  // ── Action bar ───────────────────────────────────────────────
  actionBarWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Surface.base,
  },
});
