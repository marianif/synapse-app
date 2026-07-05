import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/atoms/themed-text";
import { StageHeader } from "@/components/molecules/stage-header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { entryColor, tokens } from "@/constants/theme";

export interface NoteLinkStageViewProps {
  ink: string;
  muted: string;
  raised: string;
  quiet: string;
  recentIdeas: { id: string; title: string }[];
  onBack: () => void;
  onDiscard: () => void;
  onFileFree: () => void;
  onFileOnIdea: (entryId: string) => void;
}

export function NoteLinkStageView({
  ink,
  muted,
  raised,
  quiet,
  recentIdeas,
  onBack,
  onDiscard,
  onFileFree,
  onFileOnIdea,
}: NoteLinkStageViewProps): React.ReactElement {
  return (
    <View style={styles.detailStage}>
      <StageHeader
        label="Note"
        onBack={onBack}
        onDiscard={onDiscard}
        ink={ink}
        muted={muted}
      />
      <View style={styles.noteChoices}>
        <Pressable
          onPress={onFileFree}
          accessibilityRole="button"
          accessibilityLabel="File as free note"
          style={({ pressed }) => [
            styles.freeNote,
            { backgroundColor: raised },
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol name="note-text-outline" size={14} color={ink} />
          <ThemedText type="bodyBold" style={{ color: ink }}>
            Free note
          </ThemedText>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.ideaRail}
        >
          {recentIdeas.map((idea) => (
            <Pressable
              key={idea.id}
              onPress={() => onFileOnIdea(idea.id)}
              accessibilityRole="button"
              accessibilityLabel={`Note on idea: ${idea.title}`}
              style={({ pressed }) => [
                styles.ideaChip,
                { backgroundColor: quiet },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.ideaDot,
                  { backgroundColor: entryColor("idea") },
                ]}
              />
              <ThemedText
                type="body"
                numberOfLines={1}
                style={[styles.ideaLabel, { color: ink }]}
              >
                {idea.title}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailStage: {
    paddingHorizontal: tokens.space.sm,
    paddingTop: 6,
    paddingBottom: tokens.space.sm,
    gap: tokens.space.xs,
  },
  noteChoices: {
    gap: tokens.space.xs,
  },
  freeNote: {
    minHeight: 36,
    borderRadius: tokens.radius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
  },
  ideaRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingRight: tokens.space.sm,
  },
  ideaChip: {
    minHeight: 34,
    maxWidth: 200,
    borderRadius: tokens.radius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
    paddingHorizontal: tokens.space.sm,
  },
  ideaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ideaLabel: {
    maxWidth: 160,
  },
  pressed: {
    opacity: 0.62,
  },
});
