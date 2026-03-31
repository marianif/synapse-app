import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/atoms/themed-text';
import { ListItem } from '@/components/molecules/list-item';
import { WrapupCard } from '@/components/molecules/wrapup-card';
import { Fab } from '@/components/organisms/fab';
import { ListProgress } from '@/components/organisms/list-progress';
import { ListScreenHeader } from '@/components/organisms/list-screen-header';
import { EntryAccent, Radius, Spacing, Surface } from '@/constants/theme';

import type { EntryType } from '@/components/atoms/entry-dot';
import type { ItemStatus } from '@/components/molecules/list-item';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListEntry {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  timeChip?: string;
  entryType: EntryType;
  status: ItemStatus;
}

interface Section {
  label: string;
  entries: ListEntry[];
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const TASK_SECTIONS: Section[] = [
  {
    label: 'Today',
    entries: [
      {
        id: 't1',
        title: 'Morning Sync: Design Review',
        time: '09:30 AM',
        entryType: 'task',
        status: 'completed',
      },
      {
        id: 't2',
        title: 'User Interview: Tech Stack',
        time: '02:00 PM',
        entryType: 'task',
        status: 'active',
      },
      {
        id: 't3',
        title: 'Weekly Sync with Product',
        time: '04:00 PM',
        entryType: 'task',
        status: 'scheduled',
      },
    ],
  },
  {
    label: 'Tomorrow',
    entries: [
      {
        id: 't4',
        title: 'Strategy Workshop',
        subtitle: 'Q3 Planning',
        timeChip: '10:00',
        entryType: 'task',
        status: 'scheduled',
      },
      {
        id: 't5',
        title: 'Update Documentation',
        subtitle: 'API endpoints',
        entryType: 'task',
        status: 'scheduled',
      },
    ],
  },
];

const DEADLINE_SECTIONS: Section[] = [
  {
    label: 'This Week',
    entries: [
      {
        id: 'd1',
        title: 'Product Launch v1',
        subtitle: 'Marketing Phase 1',
        time: '05:00 PM',
        entryType: 'deadline',
        status: 'active',
      },
      {
        id: 'd2',
        title: 'Quarterly Tax Filing',
        subtitle: 'Finance',
        time: '11:59 PM',
        entryType: 'deadline',
        status: 'scheduled',
      },
    ],
  },
  {
    label: 'Next Week',
    entries: [
      {
        id: 'd3',
        title: 'Design System Handoff',
        subtitle: 'Product Team',
        timeChip: 'Mon',
        entryType: 'deadline',
        status: 'scheduled',
      },
      {
        id: 'd4',
        title: 'Client Proposal Due',
        subtitle: 'Agency Project',
        timeChip: 'Thu',
        entryType: 'deadline',
        status: 'scheduled',
      },
    ],
  },
];

const SOMEDAY_SECTIONS: Section[] = [
  {
    label: 'Ideas',
    entries: [
      {
        id: 's1',
        title: 'Build a personal design system from scratch',
        subtitle: 'Design & Development',
        entryType: 'someday',
        status: 'scheduled',
      },
      {
        id: 's2',
        title: 'Write a short guide on async communication',
        subtitle: 'Writing',
        entryType: 'someday',
        status: 'scheduled',
      },
      {
        id: 's3',
        title: 'Learn Rust basics',
        subtitle: 'Engineering',
        entryType: 'someday',
        status: 'scheduled',
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSectionCount(sections: Section[]): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  for (const section of sections) {
    for (const entry of section.entries) {
      total++;
      if (entry.status === 'completed') completed++;
    }
  }
  return { completed, total };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ListScreen(): React.ReactElement {
  const router = useRouter();
  const { entryType } = useLocalSearchParams<{ entryType?: string }>();

  const resolvedType: EntryType =
    entryType === 'deadline'
      ? 'deadline'
      : entryType === 'someday'
        ? 'someday'
        : 'task';

  const accentColor = EntryAccent[resolvedType];

  const screenTitle =
    resolvedType === 'deadline'
      ? 'Deadlines'
      : resolvedType === 'someday'
        ? 'One Day'
        : 'Weekly Tasks';

  const sections =
    resolvedType === 'deadline'
      ? DEADLINE_SECTIONS
      : resolvedType === 'someday'
        ? SOMEDAY_SECTIONS
        : TASK_SECTIONS;

  // Local status state (someday items have no meaningful status toggling)
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>(() => {
    const map: Record<string, ItemStatus> = {};
    for (const section of sections) {
      for (const entry of section.entries) {
        map[entry.id] = entry.status;
      }
    }
    return map;
  });

  function toggleItem(id: string): void {
    setStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === 'completed' ? 'scheduled' : 'completed',
    }));
  }

  const completedCount = Object.values(statuses).filter((s) => s === 'completed').length;
  const { total } = getSectionCount(sections);

  // Badge count = non-completed entries in first section
  const firstSectionCount = sections[0]?.entries.filter(
    (e) => statuses[e.id] !== 'completed',
  ).length ?? 0;

  const badgeLabel =
    resolvedType === 'deadline'
      ? 'DEADLINES'
      : resolvedType === 'someday'
        ? 'IDEAS'
        : 'TASKS';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <ListScreenHeader
          title={screenTitle}
          onBack={() => router.back()}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress header — hidden for someday (no completion concept) */}
          {resolvedType !== 'someday' ? (
            <ListProgress
              completed={completedCount}
              total={total}
              streak={8}
              entryType={resolvedType}
            />
          ) : null}

          {sections.map((section, sectionIndex) => (
            <View key={section.label} style={styles.section}>
              {/* Section header */}
              <View style={styles.sectionHeader}>
                <ThemedText type="headline">{section.label}</ThemedText>
                {sectionIndex === 0 && firstSectionCount > 0 ? (
                  <View style={[styles.countBadge, { backgroundColor: accentColor + '22' }]}>
                    <ThemedText
                      type="caption"
                      style={[styles.countBadgeText, { color: accentColor }]}
                    >
                      {firstSectionCount} {badgeLabel}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              {/* Items */}
              <View style={styles.itemList}>
                {section.entries.map((entry) => (
                  <ListItem
                    key={entry.id}
                    title={entry.title}
                    subtitle={entry.subtitle}
                    time={entry.time}
                    timeChip={entry.timeChip}
                    entryType={entry.entryType}
                    status={statuses[entry.id] ?? entry.status}
                    accentColor={accentColor}
                    onToggle={() => toggleItem(entry.id)}
                    onPress={() =>
                      router.push(`/detail?id=${entry.id}&entryType=${entry.entryType}`)
                    }
                  />
                ))}
              </View>
            </View>
          ))}

          {resolvedType !== 'someday' ? (
            <WrapupCard onViewStats={() => {}} />
          ) : null}

          {/* Bottom padding so FAB never overlaps the last entry */}
          <View style={styles.fabSpacer} />
        </ScrollView>

        <Fab onPress={() => router.push('/modal')} />
      </View>
    </SafeAreaView>
  );
}

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
    gap: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  countBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  itemList: {
    gap: Spacing.sm,
  },
  fabSpacer: {
    height: 80,
  },
});
