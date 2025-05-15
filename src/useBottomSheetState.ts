import { useCallback } from 'react';
import { useMaybeBottomSheetContext } from './BottomSheet.context';
import {
  useBottomSheetStore,
  type BottomSheetState,
} from './bottomSheet.store';

export function useBottomSheetState(): {
  bottomSheetState: BottomSheetState;
  close: () => void;
  closeBottomSheet: () => void;
} {
  const context = useMaybeBottomSheetContext();
  const { bottomSheetsStack, startClosing } = useBottomSheetStore((store) => ({
    bottomSheetsStack: store.stack,
    startClosing: store.startClosing,
  }));

  const bottomSheetState = bottomSheetsStack.find(
    (bottomSheet) => bottomSheet.id === context?.id
  );

  if (!bottomSheetState) {
    throw new Error(
      'useBottomSheetState must be used within a BottomSheetProvider'
    );
  }

  const close = useCallback(
    () => startClosing(bottomSheetState.id),
    [bottomSheetState.id, startClosing]
  );

  return {
    bottomSheetState,
    close,
    closeBottomSheet: close,
  };
}
