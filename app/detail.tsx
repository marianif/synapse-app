import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountdownChip } from '@/components/atoms/countdown-chip';
import { EntryDot } from '@/components/atoms/entry-dot';
import { ThemedText } from '@/components/atoms/themed-text';
import { DetailActionBar } from '@/components/molecules/detail-action-bar';
import { DetailMetadataRow } from '@/components/molecules/detail-metadata-row';
import { DetailSomedayHero } from '@/components/molecules/detail-someday-hero';
import { ListScreenHeader } from '@/components/organisms/list-screen-header';
import { EntryAccent, Radius, Spacing, Surface, TextColors } from '@/constants/theme';

import type { EntryType } from '@/components/atoms/entry-dot';
import type { ActionItem } from '@/components/molecules/detail-action-bar';

// ─── Data models ──────────────────────────────────────────────────────────────

interface TaskDetail {
  id: string;
  title: string;
  subtitle?: string;
  scheduledDate: string;
  scheduledTime?: string;
  status: 'scheduled' | 'active' | 'completed';
  estimatedDuration?: string;
  notes?: string;
}

interface DeadlineDetail {
  id: string;
  title: string;
  subtitle?: string;
  dueDate: string;
  dueTime?: string;
  status: 'pending' | 'overdue' | 'met';
  daysRemaining: number;
  notes?: string;
}

interface SomedayDetail {
  id: string;
  title: string;
  subtitle?: string;
  inspiration?: string;
  notes?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TASKS: Record<string, TaskDetail> = {
  t1: {
    id: 't1',
    title: 'Morning Sync: Design Review',
    subtitle: 'Design Team',
    scheduledDate: 'Tuesday, Mar 31',
    scheduledTime: '09:30 AM',
    status: 'completed',
    estimatedDuration: '45 min',
    notes: 'Go through the latest Figma frames with the team. Focus on the onboarding flow and the new component library.',
  },
  t2: {
    id: 't2',
    title: 'User Interview: Tech Stack',
    subtitle: 'Research Sprint',
    scheduledDate: 'Tuesday, Mar 31',
    scheduledTime: '02:00 PM',
    status: 'active',
    estimatedDuration: '60 min',
    notes: 'Interview with the lead engineer about the current stack. Prepare questions around CI/CD and deployment pipeline.',
  },
  t3: {
    id: 't3',
    title: 'Weekly Sync with Product',
    subtitle: 'Product Team',
    scheduledDate: 'Tuesday, Mar 31',
    scheduledTime: '04:00 PM',
    status: 'scheduled',
    estimatedDuration: '30 min',
  },
  t4: {
    id: 't4',
    title: 'Strategy Workshop',
    subtitle: 'Q3 Planning',
    scheduledDate: 'Wednesday, Apr 1',
    scheduledTime: '10:00 AM',
    status: 'scheduled',
    estimatedDuration: '3 hr',
    notes: 'Quarterly strategy alignment session. Bring the roadmap draft and competitive analysis.',
  },
  t5: {
    id: 't5',
    title: 'Update Documentation',
    subtitle: 'API endpoints',
    scheduledDate: 'Wednesday, Apr 1',
    status: 'scheduled',
    notes: 'Update the REST API docs with the new authentication endpoints. Use OpenAPI 3.0 format.',
  },
};

const MOCK_DEADLINES: Record<string, DeadlineDetail> = {
  d1: {
    id: 'd1',
    title: 'Product Launch v1',
    subtitle: 'Marketing Phase 1',
    dueDate: 'Friday, Apr 4',
    dueTime: '05:00 PM',
    status: 'pending',
    daysRemaining: 3,
    notes: 'All marketing assets must be approved. Coordinate with the comms team on the press release timing.',
  },
  d2: {
    id: 'd2',
    title: 'Quarterly Tax Filing',
    subtitle: 'Finance',
    dueDate: 'Sunday, Apr 6',
    dueTime: '11:59 PM',
    status: 'pending',
    daysRemaining: 6,
    notes: 'Send all receipts and expense reports to the accountant by Friday EOD.',
  },
  d3: {
    id: 'd3',
    title: 'Design System Handoff',
    subtitle: 'Product Team',
    dueDate: 'Monday, Apr 7',
    status: 'pending',
    daysRemaining: 7,
  },
  d4: {
    id: 'd4',
    title: 'Client Proposal Due',
    subtitle: 'Agency Project',
    dueDate: 'Thursday, Apr 10',
    status: 'pending',
    daysRemaining: 10,
    notes: 'Final proposal with scope, timeline, and pricing. Awaiting legal review.',
  },
};

const MOCK_SOMEDAY: Record<string, SomedayDetail> = {
  s1: {
    id: 's1',
    title: 'Build a personal design system from scratch',
    subtitle: 'Design & Development',
    inspiration: 'If you can\'t explain it to a six year old, you don\'t understand it yourself.',
    notes: 'Start with tokens — colors, spacing, typography. Build components in Storybook. Document everything.',
  },
  s2: {
    id: 's2',
    title: 'Write a short guide on async communication',
    subtitle: 'Writing',
    inspiration: 'The single biggest problem in communication is the illusion that it has taken place.',
    notes: 'Cover the difference between synchronous and asynchronous work. Include templates for status updates.',
  },
  s3: {
    id: 's3',
    title: 'Learn Rust basics',
    subtitle: 'Engineering',
    notes: 'Go through the official Rust book. Build a small CLI tool as a side project.',
  },
};

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
  task,
  accentColor,
}: {
  task: TaskDetail;
  accentColor: string;
}): React.ReactElement {
  const statusColor = getStatusColor(task.status, accentColor);
  return (
    <View style={styles.heroBlock}>
      <View style={[styles.statusChip, { backgroundColor: statusColor + '18' }]}>
        <ThemedText type="label" style={[styles.statusLabel, { color: statusColor }]}>
          {STATUS_LABELS[task.status]}
        </ThemedText>
      </View>
      <View style={styles.metaList}>
        <DetailMetadataRow
          icon="calendar-outline"
          label="Date"
          value={task.scheduledDate}
          accentColor={accentColor}
        />
        {task.scheduledTime ? (
          <DetailMetadataRow
            icon="clock-outline"
            label="Time"
            value={task.scheduledTime}
            accentColor={accentColor}
          />
        ) : null}
        {task.estimatedDuration ? (
          <DetailMetadataRow
            icon="timer-outline"
            label="Duration"
            value={task.estimatedDuration}
            accentColor={accentColor}
          />
        ) : null}
      </View>
    </View>
  );
}

// ─── Section: Deadline hero ───────────────────────────────────────────────────

function DeadlineHero({
  deadline,
  accentColor,
}: {
  deadline: DeadlineDetail;
  accentColor: string;
}): React.ReactElement {
  return (
    <View style={styles.heroBlock}>
      <CountdownChip
        daysRemaining={deadline.daysRemaining}
        state={deadline.status}
      />
      <View style={styles.metaList}>
        <DetailMetadataRow
          icon="calendar-alert"
          label="Due Date"
          value={deadline.dueDate}
          accentColor={accentColor}
        />
        {deadline.dueTime ? (
          <DetailMetadataRow
            icon="clock-outline"
            label="Due Time"
            value={deadline.dueTime}
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
    entryType === 'deadline'
      ? 'deadline'
      : entryType === 'someday'
        ? 'someday'
        : 'task';

  const accentColor = EntryAccent[resolvedType];

  // ── Resolve mock data ────────────────────────────────────────────────────────
  const task = resolvedType === 'task' ? (MOCK_TASKS[id ?? 't1'] ?? MOCK_TASKS['t1']) : null;
  const deadline = resolvedType === 'deadline' ? (MOCK_DEADLINES[id ?? 'd1'] ?? MOCK_DEADLINES['d1']) : null;
  const someday = resolvedType === 'someday' ? (MOCK_SOMEDAY[id ?? 's1'] ?? MOCK_SOMEDAY['s1']) : null;

  const title = task?.title ?? deadline?.title ?? someday?.title ?? '';
  const subtitle = task?.subtitle ?? deadline?.subtitle ?? someday?.subtitle;
  const notes = task?.notes ?? deadline?.notes ?? someday?.notes;

  // ── Action bar ───────────────────────────────────────────────────────────────
  const actions: [ActionItem, ActionItem, ActionItem] =
    resolvedType === 'task'
      ? [
          {
            icon: 'check-circle-outline',
            label: task?.status === 'completed' ? 'Completed' : 'Complete',
            onPress: () => {},
            isPrimary: true,
            accentColor,
          },
          { icon: 'calendar-clock', label: 'Reschedule', onPress: () => {} },
          { icon: 'trash-can-outline', label: 'Delete', onPress: () => {}, isDanger: true },
        ]
      : resolvedType === 'deadline'
        ? [
            {
              icon: 'check-decagram-outline',
              label: deadline?.status === 'met' ? 'Met' : 'Mark Met',
              onPress: () => {},
              isPrimary: true,
              accentColor,
            },
            { icon: 'calendar-clock', label: 'Reschedule', onPress: () => {} },
            { icon: 'trash-can-outline', label: 'Delete', onPress: () => {}, isDanger: true },
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
            { icon: 'trash-can-outline', label: 'Delete', onPress: () => {}, isDanger: true },
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
          {resolvedType === 'task' && task ? (
            <TaskHero task={task} accentColor={accentColor} />
          ) : resolvedType === 'deadline' && deadline ? (
            <DeadlineHero deadline={deadline} accentColor={accentColor} />
          ) : someday ? (
            <DetailSomedayHero inspiration={someday.inspiration} />
          ) : null}

          {/* Project / subtitle */}
          {subtitle ? (
            <DetailMetadataRow
              icon="folder-outline"
              label="Project"
              value={subtitle}
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
