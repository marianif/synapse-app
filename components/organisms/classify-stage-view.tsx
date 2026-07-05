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
          caption="keep it alive"
          scheme={scheme}
          ink={ink}
          muted={muted}
          onPress={() => onSelectType("idea")}
        />
        <TypeLane
          variant="todo"
          label="Todo"
          caption="make it actionable"
          scheme={scheme}
          ink={ink}
          muted={muted}
          onPress={() => onSelectType("todo")}
        />
        <TypeLane
          variant="deadline"
          label="Deadline"
          caption="give it a horizon"
          scheme={scheme}
          ink={ink}
          muted={muted}
          onPress={() => onSelectType("deadline")}
        />
        <TypeLane
          variant="note"
          label="Note"
          caption="diary trace"
          scheme={scheme}
          ink={ink}
          muted={muted}
          onPress={() => onSelectType("note")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  classifyStage: {
    paddingHorizontal: tokens.space.sm,
    paddingTop: 6,
    paddingBottom: tokens.space.sm,
    gap: tokens.space.xs,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs,
  },
});
