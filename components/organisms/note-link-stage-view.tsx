import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { OptionChip } from "@/components/atoms/option-chip";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens } from "@/constants/theme";

export interface NoteLinkStageViewProps {
  ink: string;
  muted: string;
  raised: string;
  quiet: string;
  activeProjects: { id: string; title: string; emoji: string | null }[];
  onBack: () => void;
  onDiscard: () => void;
  onFileFree: () => void;
  onFileOnProject: (projectId: string) => void;
}

export function NoteLinkStageView({
  ink,
  muted,
  raised,
  quiet,
  activeProjects,
  onBack,
  onDiscard,
  onFileFree,
  onFileOnProject,
}: NoteLinkStageViewProps): React.ReactElement {
  return (
    <View style={styles.stage}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.headerButton}
      >
        <IconSymbol name="ChevronLeft" size={18} color={muted} />
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRail}
      >
        <OptionChip
          label="Free note"
          icon="Note2"
          selected={false}
          ink={ink}
          muted={muted}
          raised={quiet}
          onPress={onFileFree}
        />
        {activeProjects.map((project) => (
          <OptionChip
            key={project.id}
            label={project.title}
            emoji={project.emoji}
            selected={false}
            ink={ink}
            muted={muted}
            raised={quiet}
            onPress={() => onFileOnProject(project.id)}
          />
        ))}
      </ScrollView>
      <Pressable
        onPress={onDiscard}
        accessibilityRole="button"
        accessibilityLabel="Discard"
        style={styles.headerButton}
      >
        <IconSymbol name="X" size={16} color={muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.size.dockBar,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    gap: tokens.space.xs,
  },
  headerButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  chipScroll: {
    flex: 1,
  },
  chipRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
});
