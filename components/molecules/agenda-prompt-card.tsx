import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { entryKicker, tokens, useTheme } from "@/constants/theme";
import type { AgendaPrompt } from "@/lib/agenda-prompts";
import type { EntryType } from "@/lib/types";

interface AgendaPromptCardProps {
  prompt: AgendaPrompt;
  index: number;
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
  index,
  featured = false,
  onPress,
}: AgendaPromptCardProps): React.ReactElement {
  const { scheme, colors } = useTheme();
  const accent = accentFor(prompt, scheme, colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${prompt.title} ${prompt.detail} ${prompt.body}`}
      accessibilityHint={`${prompt.actionLabel}. Opens it.`}
      onPress={() => onPress(prompt)}
      style={({ pressed }) => [
        styles.row,
        featured ? styles.featuredRow : styles.secondaryRow,
        { backgroundColor: featured ? colors.surfaceSubtle : "transparent" },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.indexGutter}>
        {!featured && (
          <Text style={[styles.index, { color: accent }]}>
            {String(index + 1).padStart(2, "0")}
          </Text>
        )}
        {featured ? (
          <IconSymbol name="Thumbtack" size={16} color={accent} />
        ) : (
          <View style={[styles.dot, { backgroundColor: accent }]} />
        )}
      </View>

      <View style={styles.copy}>
        <Text
          style={[
            featured ? styles.featuredSentence : styles.sentence,
            { color: colors.ink },
          ]}
        >
          {prompt.titlePrefix}
          <Text
            style={[
              featured ? styles.featuredSubject : styles.subject,
              { color: accent },
            ]}
          >
            {prompt.subject}
          </Text>
          {prompt.titleSuffix}
        </Text>
        <View style={styles.bottomLine}>
          <Text
            style={[styles.detail, { color: colors.inkMuted }]}
            numberOfLines={1}
          >
            {prompt.detail}
          </Text>
          <View style={styles.action}>
            <Text
              style={[
                styles.actionText,
                { color: accent, textDecorationColor: accent },
              ]}
            >
              {prompt.actionLabel}
            </Text>
            <IconSymbol name="ArrowRight" size={15} color={accent} />
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
  indexGutter: {
    alignItems: "center",
    gap: tokens.space.sm,
    paddingTop: tokens.space.xs,
    width: 22,
  },
  index: {
    fontFamily: tokens.type.fontMono.regular,
    fontSize: 12,
  },
  dot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  copy: {
    flex: 1,
    gap: tokens.space.xs,
  },
  featuredSentence: {
    fontFamily: tokens.type.fontInter.bold,
    fontSize: 18,
    lineHeight: 25,
  },
  sentence: {
    fontFamily: tokens.type.fontInter.semiBold,
    fontSize: 16,
    lineHeight: 21,
  },
  featuredSubject: {
    fontFamily: tokens.type.fontHand.bold,
    fontSize: 23,
    lineHeight: 26,
  },
  subject: {
    fontFamily: tokens.type.fontHand.bold,
    fontSize: 19,
    lineHeight: 22,
  },
  bottomLine: {
    alignItems: "center",
    columnGap: tokens.space.md,
    flexDirection: "row",
    marginTop: tokens.space.xs,
  },
  detail: {
    flex: 1,
    fontFamily: tokens.type.fontMono.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  action: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: tokens.space.xs,
    justifyContent: "center",
    minHeight: 36,
    paddingRight: tokens.space.xs,
  },
  actionText: {
    fontFamily: tokens.type.fontMono.medium,
    fontSize: 12,
    lineHeight: 16,
    textDecorationLine: "underline",
  },
});
