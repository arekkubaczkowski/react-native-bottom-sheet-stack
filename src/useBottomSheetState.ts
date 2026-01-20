import { useMaybeBottomSheetContext } from './BottomSheet.context';
import {
  useBottomSheetStore,
  type BottomSheetState,
} from './bottomSheet.store';
import type {
  BottomSheetPortalId,
  BottomSheetPortalParams,
} from './portal.types';

export interface UseBottomSheetContextReturn<TParams> {
  bottomSheetState: BottomSheetState;
  params: TParams;
  close: () => void;
  /** @deprecated Use `close` instead */
  closeBottomSheet: () => void;
}

/** Without generic - params typed as unknown */
export function useBottomSheetContext(): UseBottomSheetContextReturn<unknown>;
/** With generic - params typed based on portal registry */
export function useBottomSheetContext<
  T extends BottomSheetPortalId,
>(): UseBottomSheetContextReturn<BottomSheetPortalParams<T>>;
export function useBottomSheetContext<
  T extends BottomSheetPortalId,
>(): UseBottomSheetContextReturn<BottomSheetPortalParams<T> | unknown> {
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
    params: bottomSheetState.params as BottomSheetPortalParams<T>,
    close,
    closeBottomSheet: close,
  };
}

/**
 * @deprecated Use `useBottomSheetContext` instead
 */
export const useBottomSheetState = useBottomSheetContext;
