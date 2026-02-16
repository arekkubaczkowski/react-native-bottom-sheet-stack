import { useEffect } from 'react';
import { BackHandler } from 'react-native';

import { useBottomSheetStore } from './bottomSheet.store';

/**
 * Manages Android hardware back button for a sheet.
 *
 * The listener is only active when the sheet is fully open
 * AND is the topmost sheet in the stack.
 */
export function useBackHandler(id: string, onBackPress: () => void): void {
  const isTopAndOpen = useBottomSheetStore((state) => {
    const { stackOrder, sheetsById } = state;
    const sheet = sheetsById[id];
    return sheet?.status === 'open' && stackOrder[stackOrder.length - 1] === id;
  });

  useEffect(() => {
    if (!isTopAndOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onBackPress();
        return true;
      }
    );
    return () => subscription.remove();
  }, [isTopAndOpen, onBackPress]);
}
