import { StyleSheet, TextInput, View } from "react-native";

import { tokens } from "@/constants/theme";

export function ExactInline({
  date,
  time,
  color,
  muted,
  raised,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  color: string;
  muted: string;
  raised: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}): React.ReactElement {
  return (
    <View style={styles.exactInline}>
      <TextInput
        value={date}
        onChangeText={onDateChange}
        placeholder="DD/MM/YYYY"
        placeholderTextColor={muted}
        selectionColor={color}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel="Exact date"
        style={[styles.exactInput, { color, backgroundColor: raised }]}
      />
      <TextInput
        value={time}
        onChangeText={onTimeChange}
        placeholder="HH:MM"
        placeholderTextColor={muted}
        selectionColor={color}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel="Exact time"
        style={[
          styles.exactInput,
          styles.timeInput,
          { color, backgroundColor: raised },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  exactInline: {
    flexDirection: "row",
    gap: tokens.space.xs,
  },
  exactInput: {
    flex: 1,
    minHeight: 32,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    fontFamily: tokens.type.fontMono.medium,
    fontSize: tokens.type.mono.size,
    lineHeight: tokens.type.mono.lineHeight,
  },
  timeInput: {
    flex: 0.56,
  },
});
