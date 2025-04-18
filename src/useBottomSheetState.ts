import { useMaybeBottomSheetContext } from './BottomSheet.context';
import {
  useBottomSheetStore,
  type BottomSheetState,
} from './bottomSheet.store';

export function useBottomSheetState(): {
  bottomSheetState: BottomSheetState;
  close: () => void;
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

  return {
    bottomSheetState,
    close: () => startClosing(bottomSheetState.id),
  };
}
