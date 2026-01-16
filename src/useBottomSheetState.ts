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

  const bottomSheetState = useBottomSheetStore(
    useCallback((state) => state.sheetsById[context?.id!], [context?.id])
  );

  const startClosing = useBottomSheetStore((state) => state.startClosing);

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
