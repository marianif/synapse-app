import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { entryKicker, tokens, useTheme } from "@/constants/theme";
import type { AgendaPrompt } from "@/lib/agenda-prompts";
import type { EntryType } from "@/lib/types";

interface AgendaPromptCardProps {
  prompt: AgendaPrompt;
  featured?: boolean;
  onPress: (prompt: AgendaPrompt) => void;
}

function accentFor(
  prompt: AgendaPrompt,
  scheme: "light" | "dark",
  colors: ReturnType<typeof useTheme>["colors"],
): string {
  if (prompt.channel === "project") return colors.ink;
  return entryKicker(prompt.channel as EntryType, scheme);
}

export function AgendaPromptCard({
  prompt,
  featured = false,
  onPress,
}: AgendaPromptCardProps): React.ReactElement {
  const { scheme, colors } = useTheme();
  const accent = accentFor(prompt, scheme, colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${prompt.title} ${prompt.body}`}
      accessibilityHint={`${prompt.actionLabel}. Opens it.`}
      onPress={() => onPress(prompt)}
      style={({ pressed }) => [
        styles.row,
        featured ? styles.featuredRow : styles.secondaryRow,
        {
          backgroundColor: featured ? colors.surfaceSubtle : "transparent",
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <View style={styles.copy}>
        <Text style={[styles.label, { color: accent }]}>{prompt.label}</Text>
        <Text
          style={[
            featured ? styles.featuredTitle : styles.title,
            { color: colors.ink },
          ]}
        >
          {prompt.title}
        </Text>
        <View style={styles.bottomLine}>
          <Text style={[styles.body, { color: colors.inkMuted }]}>
            {prompt.body}
          </Text>
          <View style={styles.action}>
            <IconSymbol name="Forward" size={22} color={accent} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: tokens.radius.sm,
    columnGap: tokens.space.md,
  },
  featuredRow: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.md,
  },
  secondaryRow: {
    paddingVertical: tokens.space.sm,
  },
  pressed: {
    opacity: 0.58,
  },
  dot: {
    borderRadius: 3,
    height: 6,
    marginTop: 8,
    width: 6,
  },
  copy: {
    flex: 1,
    gap: tokens.space.xs,
  },
  label: {
    fontFamily: tokens.type.fontHand.medium,
    fontSize: 17,
    lineHeight: 20,
  },
  featuredTitle: {
    fontFamily: tokens.type.fontInter.bold,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  title: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 16,
    lineHeight: 21,
  },
  bottomLine: {
    alignItems: "center",
    columnGap: tokens.space.md,
    flexDirection: "row",
  },
  action: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    minHeight: 36,
    justifyContent: "center",
    paddingRight: tokens.space.xs,
  },
  body: {
    flex: 1,
    fontFamily: tokens.type.fontInter.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  actionText: {
    fontFamily: tokens.type.fontFraunces.regular,
    textTransform: "uppercase",
    fontSize: 10,
    lineHeight: 16,
    textDecorationLine: "underline",
    letterSpacing: 0.5,
  },
});
