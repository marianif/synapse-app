import { StyleSheet, View } from "react-native";

import { StageHeader } from "@/components/molecules/stage-header";
import { TypeLane } from "@/components/molecules/type-lane";
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
