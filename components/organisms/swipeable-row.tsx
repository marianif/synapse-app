import { useRef } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';

import { Radius, Spacing, TextColors } from '@/constants/theme';

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
    <RectButton style={styles.deleteAction} onPress={handleDelete}>
      <MaterialCommunityIcons
        name="trash-can-outline"
        size={22}
        color={TextColors.primary}
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
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    borderRadius: Radius.lg,
    marginLeft: Spacing.sm,
  },
});
