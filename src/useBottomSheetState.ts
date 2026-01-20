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
    (state) => state.sheetsById[context?.id!]
  );

  const startClosing = useBottomSheetStore((state) => state.startClosing);

  if (!bottomSheetState) {
    throw new Error(
      'useBottomSheetState must be used within a BottomSheetProvider'
    );
  }

  const close = () => startClosing(bottomSheetState.id);

  return {
    bottomSheetState,
    close,
    closeBottomSheet: close,
  };
}
