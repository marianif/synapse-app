import { StyleSheet, View } from "react-native";

import { StageHeader } from "@/components/molecules/stage-header";
import { TypeLane } from "@/components/molecules/type-lane";
import { tokens } from "@/constants/theme";
import type { EntryType } from "@/lib/types";

export interface ClassifyStageViewProps {
  ink: string;
  muted: string;
  raised: string;
  onBack: () => void;
  onDiscard: () => void;
  onSelectType: (type: EntryType | "note") => void;
}

export function ClassifyStageView({
  ink,
  muted,
  raised,
  onBack,
  onDiscard,
  onSelectType,
}: ClassifyStageViewProps): React.ReactElement {
  return (
    <View style={styles.classifyStage}>
      <StageHeader
        label="File it as"
        onBack={onBack}
        onDiscard={onDiscard}
        ink={ink}
        muted={muted}
      />
      <View style={styles.typeGrid}>
        <TypeLane
          variant="idea"
          label="Idea"
          ink={ink}
          raised={raised}
          onPress={() => onSelectType("idea")}
        />
        <TypeLane
          variant="todo"
          label="Todo"
          ink={ink}
          raised={raised}
          onPress={() => onSelectType("todo")}
        />
        <TypeLane
          variant="deadline"
          label="Deadline"
          ink={ink}
          raised={raised}
          onPress={() => onSelectType("deadline")}
        />
        <TypeLane
          variant="note"
          label="Note"
          ink={ink}
          raised={raised}
          onPress={() => onSelectType("note")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  classifyStage: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    gap: tokens.space.xs,
  },
  typeGrid: {
    flexDirection: "row",
    justifyContent: "center",
    gap: tokens.space.xs,
  },
});
