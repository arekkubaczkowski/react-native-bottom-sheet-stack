import { useCallback, useMemo } from 'react';
import { useMaybeBottomSheetContext } from './BottomSheet.context';
import {
  useBottomSheetStore,
  type BottomSheetState,
} from './bottomSheet.store';
import { shallow } from 'zustand/shallow';

export function useBottomSheetState(): {
  bottomSheetState: BottomSheetState;
  close: () => void;
  closeBottomSheet: () => void;
} {
  const context = useMaybeBottomSheetContext();
  const { bottomSheetsStack, startClosing } = useBottomSheetStore(
    (store) => ({
      bottomSheetsStack: store.stack,
      startClosing: store.startClosing,
    }),
    shallow
  );

  const bottomSheetState = useMemo(
    () =>
      bottomSheetsStack.find((bottomSheet) => bottomSheet.id === context?.id),
    [bottomSheetsStack, context?.id]
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
