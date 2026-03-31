import { useMemo } from 'react';

import type { DbEntry } from '@/lib/schema';
import type { EntryType } from '@/components/atoms/entry-dot';

export interface CalendarEntry {
  id: string;
  title: string;
  type: EntryType;
  date: string;
  time?: string | null;
}

export interface DayCount {
  date: string;
  count: number;
  types: EntryType[];
}

export interface UpcomingEntry {
  id: string;
  title: string;
  type: EntryType;
  date: string;
  time?: string | null;
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toDisplayDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDow = firstDay.getDay();
  const paddingBefore = startDow === 0 ? 6 : startDow - 1;
  for (let i = paddingBefore - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function entryToCalendarEntry(entry: DbEntry): CalendarEntry | null {
  const dateStr = entry.scheduled_date ?? entry.due_date;
  if (!dateStr) return null;
  return {
    id: entry.id,
    title: entry.title,
    type: entry.type,
    date: dateStr,
    time: entry.scheduled_time ?? entry.due_time,
  };
}

export function useCalendarData(
  entries: DbEntry[],
  currentMonth: Date,
): {
  calendarDays: Date[];
  currentMonthLabel: string;
  isCurrentMonth: boolean;
  today: Date;
  getEntriesForDay: (date: Date) => CalendarEntry[];
  monthCount: number;
  upcomingEntries: UpcomingEntry[];
  weekCounts: DayCount[];
} {
  const today = useMemo(() => new Date(), []);

  const calendarDays = useMemo(() => {
    return getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  }, [currentMonth]);

  const currentMonthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentMonth]);

  const isCurrentMonth = useMemo(() => {
    return isSameDay(
      new Date(today.getFullYear(), today.getMonth(), 1),
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    );
  }, [today, currentMonth]);

  const calendarEntries = useMemo(() => {
    return entries
      .map(entryToCalendarEntry)
      .filter((e): e is CalendarEntry => e !== null);
  }, [entries]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of calendarEntries) {
      const existing = map.get(entry.date) ?? [];
      existing.push(entry);
      map.set(entry.date, existing);
    }
    return map;
  }, [calendarEntries]);

  const getEntriesForDay = useMemo(() => {
    return (date: Date): CalendarEntry[] => {
      const key = toDisplayDate(date);
      return entriesByDate.get(key) ?? [];
    };
  }, [entriesByDate]);

  const monthCount = useMemo(() => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return calendarEntries.filter((e) => {
      const d = parseDate(e.date);
      if (!d) return false;
      return d >= monthStart && d <= monthEnd;
    }).length;
  }, [calendarEntries, currentMonth]);

  const upcomingEntries = useMemo(() => {
    const result: UpcomingEntry[] = [];
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);

    for (const entry of calendarEntries) {
      const d = parseDate(entry.date);
      if (!d) continue;
      if (d >= today && d <= endDate) {
        result.push(entry);
      }
    }

    result.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (!dateA || !dateB) return 0;
      const dayDiff = dateA.getTime() - dateB.getTime();
      if (dayDiff !== 0) return dayDiff;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });

    return result.slice(0, 5);
  }, [calendarEntries, today]);

  const weekCounts = useMemo((): DayCount[] => {
    const result: DayCount[] = [];
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = toDisplayDate(d);
      const dayEntries = entriesByDate.get(key) ?? [];
      const types = [...new Set(dayEntries.map((e) => e.type))];
      result.push({
        date: key,
        count: dayEntries.length,
        types,
      });
    }

    return result;
  }, [today, entriesByDate]);

  return {
    calendarDays,
    currentMonthLabel,
    isCurrentMonth,
    today,
    getEntriesForDay,
    monthCount,
    upcomingEntries,
    weekCounts,
  };
}
