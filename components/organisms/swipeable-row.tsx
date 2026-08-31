import { useRef } from 'react';
import { StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable, RectButton } from 'react-native-gesture-handler';

import { ConfirmSheet } from '@/components/molecules/confirm-sheet';
import { useTheme, tokens } from '@/constants/theme';
import { useConfirm } from '@/hooks/use-confirm';
import { ConfirmKey } from '@/lib/settings';

import type { ConfirmKeyValue } from '@/lib/settings';

// The delete action sits on the bright danger code; its icon must be a fixed
// cool-near-black in both schemes (4.75:1). colors.ink fails AA in dark (3.1:1,
// near-white on mid-red). Reuses the dark-paper token value.
const ON_DANGER = tokens.color.dark.paper;

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  accentColor?: string;
  /**
   * Which "don't ask again" preference governs this row's delete confirm.
   * Defaults to the shared entry key; diary notes pass their own.
   */
  confirmKey?: ConfirmKeyValue;
  /** Copy for the branded confirm sheet — defaults to the entry voice. */
  confirmKicker?: string;
  confirmMessage?: string;
  /** Called when this row's swipe opens; `close` dismisses it. Lets a list
   *  keep a single row open and dismiss it on outside interaction. */
  onSwipeOpen?: (close: () => void) => void;
}

export function SwipeableRow({
  children,
  onDelete,
  accentColor,
  confirmKey = ConfirmKey.deleteEntry,
  confirmKicker = 'DELETE ENTRY',
  confirmMessage = 'This removes it from the field for good.',
  onSwipeOpen,
}: SwipeableRowProps): React.ReactElement {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);
  const confirm = useConfirm({ confirmKey });

  const handleDelete = (): void => {
    // Close the swipe either way; the branded sheet (or the immediate delete,
    // when the user has opted out of the prompt) takes it from here.
    swipeableRef.current?.close();
    void confirm.request(onDelete);
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
    <>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
        onSwipeableWillOpen={() =>
          onSwipeOpen?.(() => swipeableRef.current?.close())
        }
      >
        {children}
      </Swipeable>

      <ConfirmSheet
        visible={confirm.visible}
        kicker={confirmKicker}
        message={confirmMessage}
        dontAsk={confirm.dontAsk}
        onToggleDontAsk={confirm.toggleDontAsk}
        onConfirm={confirm.confirm}
        onCancel={confirm.cancel}
      />
    </>
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
