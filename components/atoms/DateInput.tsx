import React, { useEffect, useState } from 'react';
import { StyleProp, TextInput, TextStyle } from 'react-native';

import { Radius, Spacing, useTheme } from '@/constants/theme';

type DateInputProps = {
  value?: string;
  onChange: (value: string) => void;
  style?: StyleProp<TextStyle>;
};

export default function DateInput({ value, onChange, style }: DateInputProps): React.JSX.Element {
  const { colors } = useTheme();
  const [internalValue, setInternalValue] = useState(value ?? '');

  useEffect(() => {
    setInternalValue(value ?? '');
  }, [value]);

  const handleChange = (text: string) => {
    // Extract only digits, cap at 8 (DDMMYYYY)
    const digits = text.replace(/\D/g, '').slice(0, 8);

    // Auto-insert slashes based on digit count — no eager validation while typing
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    setInternalValue(formatted);
    onChange(formatted);
  };

  return (
    <TextInput
      value={internalValue}
      onChangeText={handleChange}
      keyboardType="numeric"
      placeholder="DD/MM/YYYY"
      placeholderTextColor={colors.inkMuted}
      maxLength={10}
      style={[
        {
          backgroundColor: colors.surfaceSubtle,
          borderRadius: Radius.lg,
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          color: colors.ink,
          fontSize: 16,
        },
        style,
      ]}
    />
  );
}
