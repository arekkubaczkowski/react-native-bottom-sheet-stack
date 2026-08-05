import { useMaybeBottomSheetContext } from './BottomSheet.context';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.context';
import {
  useSheetParams,
  useSheetPreventDismiss,
  useStartClosing,
} from './store';
import type { CascadeOptions, CloseAllResult, CloseResult } from './store';
import { closeAllAnimated, requestClose } from './bottomSheetCoordinator';
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
   * @returns A `CloseResult` — `{ closed: true }`, or `{ closed: false, reason }`
   * naming why not (`'blocked'`, `'interceptor-error'`, `'not-closable'`).
   */
  close: () => Promise<CloseResult>;
  /**
   * Closes every sheet stacked above this one, leaving this one open.
   *
   * The common case for a sheet deep in a stack: finish here, then land back
   * on this screen rather than on an empty one, without having to name your own
   * ID or count how many sheets are above you.
   *
   * Pass `inclusive` to close this sheet as well.
   */
  closeAbove: (
    options?: Omit<CascadeOptions, 'until'>
  ) => Promise<CloseAllResult>;
  /**
   * Close the sheet, bypassing any onBeforeClose interceptor.
   * Useful for force-closing from within onBeforeClose confirmation flows.
   */
  forceClose: () => void;
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
  const managerContext = useMaybeBottomSheetManagerContext();

  if (!context?.id) {
    throw new Error(
      'useBottomSheetContext must be used within a BottomSheet component'
    );
  }

  const close = () => requestClose(context.id);
  const forceClose = () => startClosing(context.id);
  const closeAbove = (options?: Omit<CascadeOptions, 'until'>) =>
    closeAllAnimated(managerContext?.groupId || 'default', {
      ...options,
      until: context.id,
    });

  return {
    id: context.id,
    params: params as BottomSheetPortalParams<T>,
    preventDismiss,
    close,
    closeAbove,
    forceClose,
  };
}
