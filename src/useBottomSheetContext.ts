import { useMaybeBottomSheetContext } from './BottomSheet.context';
import { useSheetParams, useStartClosing } from './bottomSheet.store';
import { requestClose } from './bottomSheetCoordinator';
import type {
  BottomSheetPortalId,
  BottomSheetPortalParams,
} from './portal.types';

export interface UseBottomSheetContextReturn<TParams> {
  id: string;
  params: TParams;
  close: () => void;
  /**
   * Close the sheet, bypassing any onBeforeClose interceptor.
   * Useful for force-closing from within onBeforeClose confirmation flows.
   */
  forceClose: () => void;
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
  const params = useSheetParams(context?.id || '');
  const startClosing = useStartClosing();

  if (!context?.id) {
    throw new Error(
      'useBottomSheetContext must be used within a BottomSheet component'
    );
  }

  const close = () => {
    requestClose(context.id);
  };
  const forceClose = () => startClosing(context.id);

  return {
    id: context.id,
    params: params as BottomSheetPortalParams<T>,
    close,
    forceClose,
    closeBottomSheet: close,
  };
}

/**
 * @deprecated Use `useBottomSheetContext` instead
 */
export const useBottomSheetState = useBottomSheetContext;
