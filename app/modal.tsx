import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/atoms/themed-text';
import { useDatabase } from '@/hooks/use-database';
import { Radius, Spacing, Surface, TextColors, EntryAccent } from '@/constants/theme';

import type { EntryType } from '@/components/atoms/entry-dot';

type FormType = 'task' | 'deadline' | 'someday';

const TYPE_OPTIONS: { value: FormType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'someday', label: 'Someday' },
];

export default function AddEntryModal(): React.ReactElement {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<FormType>('task');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const { createEntry, createIdea, isCreating } = useDatabase();

  const accentColor = type === 'task'
    ? EntryAccent.task
    : type === 'deadline'
      ? EntryAccent.deadline
      : EntryAccent.someday;

  async function handleSave(): Promise<void> {
    if (!title.trim() || isCreating) return;

    try {
      if (type === 'someday') {
        await createIdea({
          title: title.trim(),
          inspiration: notes.trim() || undefined,
        });
      } else {
        await createEntry({
          title: title.trim(),
          type: type as EntryType,
          scheduledDate: date.trim() || undefined,
          scheduledTime: time.trim() || undefined,
          dueDate: type === 'deadline' ? date.trim() : undefined,
          dueTime: type === 'deadline' ? time.trim() : undefined,
          notes: notes.trim() || undefined,
        });
      }
    } catch (error) {
      console.error('Failed to save entry:', error);
    }
  }

  const canSave = title.trim().length > 0 && !isCreating;
  const showDateTime = type !== 'someday';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.screen}>
          {/* Header */}
          <View style={styles.header}>
            <Link href="/" dismissTo asChild>
              <Pressable style={styles.headerButton} hitSlop={12}>
                <ThemedText type="body" muted>
                  Cancel
                </ThemedText>
              </Pressable>
            </Link>
            <ThemedText type="headline">Add Entry</ThemedText>
            <View style={styles.headerButton} /> {/* Spacer */}
          </View>

          {/* Form */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title Input */}
            <View style={styles.field}>
              <ThemedText type="caption" muted style={styles.label}>
                TITLE
              </ThemedText>
              <TextInput
                style={[styles.input, styles.titleInput]}
                value={title}
                onChangeText={setTitle}
                placeholder="What do you need to do?"
                placeholderTextColor={TextColors.disabled}
                autoFocus
                returnKeyType="next"
              />
            </View>

            {/* Type Selector */}
            <View style={styles.field}>
              <ThemedText type="caption" muted style={styles.label}>
                TYPE
              </ThemedText>
              <View style={styles.typeSelector}>
                {TYPE_OPTIONS.map((option) => {
                  const isSelected = type === option.value;
                  const optionAccent =
                    option.value === 'task'
                      ? EntryAccent.task
                      : option.value === 'deadline'
                        ? EntryAccent.deadline
                        : EntryAccent.someday;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setType(option.value)}
                      style={[
                        styles.typeOption,
                        isSelected && {
                          backgroundColor: optionAccent + '20',
                          borderColor: optionAccent,
                        },
                      ]}
                    >
                      <ThemedText
                        type="bodyBold"
                        style={[
                          styles.typeOptionText,
                          isSelected && { color: optionAccent },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Date/Time Fields (hidden for Someday) */}
            {showDateTime && (
              <View style={styles.row}>
                <View style={[styles.field, styles.halfField]}>
                  <ThemedText type="caption" muted style={styles.label}>
                    {type === 'deadline' ? 'DUE DATE' : 'DATE'}
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={date}
                    onChangeText={setDate}
                    placeholder="e.g. Friday, Apr 4"
                    placeholderTextColor={TextColors.disabled}
                  />
                </View>
                <View style={[styles.field, styles.halfField]}>
                  <ThemedText type="caption" muted style={styles.label}>
                    TIME
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={time}
                    onChangeText={setTime}
                    placeholder="e.g. 02:00 PM"
                    placeholderTextColor={TextColors.disabled}
                  />
                </View>
              </View>
            )}

            {/* Notes */}
            <View style={styles.field}>
              <ThemedText type="caption" muted style={styles.label}>
                NOTES
              </ThemedText>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any additional notes..."
                placeholderTextColor={TextColors.disabled}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Action Bar */}
          <View style={styles.actionBar}>
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: accentColor },
                !canSave && styles.saveButtonDisabled,
                pressed && styles.saveButtonPressed,
              ]}
            >
              <ThemedText type="bodyBold" style={styles.saveButtonText}>
                {isCreating ? 'Saving...' : 'Save'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  keyboardView: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Surface.outlineVariant,
  },
  headerButton: {
    width: 60,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: TextColors.primary,
    fontSize: 16,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 100,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeOption: {
    flex: 1,
    backgroundColor: Surface.containerLow,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  typeOptionText: {
    color: TextColors.secondary,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  actionBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Surface.outlineVariant,
  },
  saveButton: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonText: {
    color: '#131316',
    fontSize: 16,
    fontWeight: '600',
  },
});