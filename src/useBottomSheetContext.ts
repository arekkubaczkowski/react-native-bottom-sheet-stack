import { useMaybeBottomSheetContext } from './BottomSheet.context';
import {
  useSheetParams,
  useSheetPreventDismiss,
  useStartClosing,
} from './bottomSheet.store';
import { requestClose } from './bottomSheetCoordinator';
import type {
  BottomSheetPortalId,
  BottomSheetPortalParams,
} from './portal.types';

/**
 * Sentinel ID used when a sheet-scoped hook runs outside a sheet. Never matches
 * a real sheet, so store selectors resolve to `undefined` instead of needing a
 * conditional call.
 */
const NO_SHEET_ID = '__no_sheet__';

export interface UseBottomSheetContextReturn<TParams> {
  id: string;
  params: TParams;
  /**
   * Whether dismissal is currently blocked for this sheet (set via
   * `useOnBeforeClose`). Adapters block user gestures when this is true; UI can
   * read it to e.g. hide a grab handle.
   */
  preventDismiss: boolean;
  /**
   * Closes the sheet.
   *
   * @returns `true` once the sheet is closing, `false` if an `onBeforeClose`
   * interceptor blocked it or there was nothing to close.
   */
  close: () => Promise<boolean>;
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
  // NO_SHEET_ID keeps the hook count stable when there is no context: the
  // selectors still run, and simply find nothing.
  const id = context?.id ?? NO_SHEET_ID;
  const params = useSheetParams(id);
  const preventDismiss = useSheetPreventDismiss(id);
  const startClosing = useStartClosing();

  if (!context?.id) {
    throw new Error(
      'useBottomSheetContext must be used within a BottomSheet component'
    );
  }

  const close = () => requestClose(context.id);
  const forceClose = () => startClosing(context.id);

  return {
    id: context.id,
    params: params as BottomSheetPortalParams<T>,
    preventDismiss,
    close,
    forceClose,
    closeBottomSheet: close,
  };
}

/**
 * @deprecated Use `useBottomSheetContext` instead
 */
export const useBottomSheetState = useBottomSheetContext;
