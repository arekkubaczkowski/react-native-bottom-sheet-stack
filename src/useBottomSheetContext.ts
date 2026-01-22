import { useMaybeBottomSheetContext } from './BottomSheet.context';
import { useSheet, useStartClosing } from './bottomSheet.store';
import type {
  BottomSheetPortalId,
  BottomSheetPortalParams,
} from './portal.types';

export interface UseBottomSheetContextReturn<TParams> {
  id: string;
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
  const sheet = useSheet(context?.id ?? '');
  const startClosing = useStartClosing();

  const id = sheet?.id;
  const params = sheet?.params;

  if (!id) {
    throw new Error(
      'useBottomSheetContext must be used within a BottomSheet component'
    );
  }

  const close = () => startClosing(id);

  return {
    id,
    params: params as BottomSheetPortalParams<T>,
    close,
    closeBottomSheet: close,
  };
}

/**
 * @deprecated Use `useBottomSheetContext` instead
 */
export const useBottomSheetState = useBottomSheetContext;
