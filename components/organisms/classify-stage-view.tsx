import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { TypeLane } from "@/components/molecules/type-lane";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { Scheme } from "@/constants/theme";
import { tokens } from "@/constants/theme";
import type { EntryType } from "@/lib/types";

export interface ClassifyStageViewProps {
  scheme: Scheme;
  ink: string;
  muted: string;
  raised: string;
  onBack: () => void;
  onDiscard: () => void;
  onSelectType: (type: EntryType | "note") => void;
}

export function ClassifyStageView({
  scheme,
  ink,
  muted,
  raised,
  onBack,
  onDiscard,
  onSelectType,
}: ClassifyStageViewProps): React.ReactElement {
  return (
    <View style={styles.classifyStage}>
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
        style={styles.typeGridScroll}
        contentContainerStyle={styles.typeGrid}
        showsHorizontalScrollIndicator={false}
      >
        <TypeLane
          variant="idea"
          label="Idea"
          scheme={scheme}
          ink={ink}
          raised={raised}
          onPress={() => onSelectType("idea")}
        />
        <TypeLane
          variant="todo"
          label="Todo"
          scheme={scheme}
          ink={ink}
          raised={raised}
          onPress={() => onSelectType("todo")}
        />
        <TypeLane
          variant="deadline"
          label="Deadline"
          scheme={scheme}
          ink={ink}
          raised={raised}
          onPress={() => onSelectType("deadline")}
        />
        <TypeLane
          variant="note"
          label="Note"
          scheme={scheme}
          ink={ink}
          raised={raised}
          onPress={() => onSelectType("note")}
        />
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
  classifyStage: {
    flexDirection: "row",
    alignItems: "center",
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
  typeGridScroll: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    gap: tokens.space.xs,
  },
});
