import { useRef } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';

import { useTheme, tokens } from '@/constants/theme';

// The delete action sits on the bright danger code; its icon must be a fixed
// cool-near-black in both schemes (4.75:1). colors.ink fails AA in dark (3.1:1,
// near-white on mid-red). Reuses the dark-paper token value.
const ON_DANGER = tokens.color.dark.paper;

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  accentColor?: string;
}

export function SwipeableRow({
  children,
  onDelete,
  accentColor,
}: SwipeableRowProps): React.ReactElement {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = (): void => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            swipeableRef.current?.close();
            onDelete();
          },
        },
      ],
      { cancelable: true },
    );
  };

  const renderRightActions = (): React.ReactElement => (
    <RectButton
      style={[styles.deleteAction, { backgroundColor: colors.feedback.danger }]}
      onPress={handleDelete}
    >
      <MaterialCommunityIcons
        name="trash-can-outline"
        size={22}
        color={ON_DANGER}
      />
    </RectButton>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    borderRadius: tokens.radius.md,
    marginLeft: tokens.space.sm,
  },
});
