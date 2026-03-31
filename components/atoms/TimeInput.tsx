import React, { useEffect, useState } from 'react';
import { StyleProp, TextInput, TextStyle } from 'react-native';

import { Radius, Spacing, Surface, TextColors } from '@/constants/theme';

type TimeInputProps = {
  value?: string;
  onChange: (value: string) => void;
  style?: StyleProp<TextStyle>;
};

export default function TimeInput({ value, onChange, style }: TimeInputProps): React.JSX.Element {
  const [internalValue, setInternalValue] = useState(value ?? '');

  useEffect(() => {
    setInternalValue(value ?? '');
  }, [value]);

  const handleChange = (text: string) => {
    const upper = text.toUpperCase();

    // Detect AM/PM at the tail of the string
    let period = '';
    let base = upper;

    if (/[AP]M$/.test(upper)) {
      // Full "AM" or "PM" present
      period = upper.slice(-2);
      base = upper.slice(0, -2);
    } else if (/ [AP]$/.test(upper)) {
      // User just typed "A" or "P" after a space — auto-complete
      period = upper.endsWith('A') ? 'AM' : 'PM';
      base = upper.slice(0, -2);
    }

    // Extract digits from the base portion, cap at 4 (HHMM)
    const digits = base.replace(/\D/g, '').slice(0, 4);

    // Auto-insert colon after first 2 digits — no eager validation while typing
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
    if (period) {
      formatted += ` ${period}`;
    }

    setInternalValue(formatted);
    onChange(formatted);
  };

  return (
    <TextInput
      value={internalValue}
      onChangeText={handleChange}
      keyboardType="default"
      autoCapitalize="characters"
      placeholder="HH:MM AM"
      placeholderTextColor={TextColors.disabled}
      maxLength={8}
      style={[
        {
          backgroundColor: Surface.containerLow,
          borderRadius: Radius.lg,
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          color: TextColors.primary,
          fontSize: 16,
        },
        style,
      ]}
    />
  );
}
