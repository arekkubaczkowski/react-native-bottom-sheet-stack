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

export interface UseBottomSheetContextReturn<T> {
  bottomSheetState: BottomSheetState;
  params: ResolveParams<T>;
  close: () => void;
  /** @deprecated Use `close` instead */
  closeBottomSheet: () => void;
}

export function useBottomSheetContext<
  T extends BottomSheetPortalId | Unspecified = Unspecified,
>(): UseBottomSheetContextReturn<T> {
  const context = useMaybeBottomSheetContext();

  const bottomSheetState = useBottomSheetStore(
    (state) => state.sheetsById[context?.id!]
  );

  const startClosing = useBottomSheetStore((state) => state.startClosing);

  if (!bottomSheetState) {
    throw new Error(
      'useBottomSheetContext must be used within a BottomSheet component'
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

/**
 * @deprecated Use `useBottomSheetContext` instead
 */
export const useBottomSheetState = useBottomSheetContext;
