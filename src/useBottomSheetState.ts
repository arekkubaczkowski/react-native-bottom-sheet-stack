import { useMaybeBottomSheetContext } from './BottomSheet.context';
import {
  useBottomSheetStore,
  type BottomSheetState,
} from './bottomSheet.store';
import type {
  BottomSheetPortalId,
  BottomSheetPortalParams,
} from './portal.types';

// Marker type to detect when no generic is provided
declare const UNSPECIFIED: unique symbol;
type Unspecified = typeof UNSPECIFIED;

type ResolveParams<T> = T extends Unspecified
  ? unknown
  : T extends BottomSheetPortalId
    ? BottomSheetPortalParams<T>
    : unknown;

export interface UseBottomSheetStateReturn<T> {
  bottomSheetState: BottomSheetState;
  params: ResolveParams<T>;
  close: () => void;
  closeBottomSheet: () => void;
}

export function useBottomSheetState<
  T extends BottomSheetPortalId | Unspecified = Unspecified,
>(): UseBottomSheetStateReturn<T> {
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
    params: bottomSheetState.params as ResolveParams<T>,
    close,
    closeBottomSheet: close,
  };
}
