import React from 'react';
import type { SheetAdapterRef } from './adapter.types';

import { useOpen, useUpdateParams, type OpenMode } from './store';
import type { CloseAllResult, CloseResult } from './store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.context';
import { closeAllAnimated, requestClose } from './bottomSheetCoordinator';
import type {
  BottomSheetPortalId,
  BottomSheetPortalParams,
  HasParams,
} from './portal.types';
import { getSheetRef, setSheetRef } from './refsMap';
import type { CloseAllOptions } from './useBottomSheetManager';

interface BaseOpenOptions<TParams> {
  mode?: OpenMode;
  scaleBackground?: boolean;
  backdrop?: boolean;
  params?: TParams;
}

type OpenOptions<T extends BottomSheetPortalId> = Omit<
  BaseOpenOptions<BottomSheetPortalParams<T>>,
  'params'
> &
  (HasParams<T> extends true
    ? { params: BottomSheetPortalParams<T> }
    : { params?: BottomSheetPortalParams<T> });

type OpenFunction<T extends BottomSheetPortalId> =
  HasParams<T> extends true
    ? (options: OpenOptions<T>) => boolean
    : (options?: OpenOptions<T>) => boolean;

export interface UseBottomSheetControlReturn<T extends BottomSheetPortalId> {
  /**
   * Opens the sheet.
   *
   * @returns `false` when the store declined — the sheet is already on the
   * stack, or another sheet in the group is still animating open. A `__DEV__`
   * warning explains which. (`useBottomSheetManager().open()` reports the same
   * rejection as `null` instead of an ID, since there the ID is the useful
   * half of the answer; here you already know it.)
   */
  open: OpenFunction<T>;
  /**
   * Closes the sheet.
   *
   * @returns A `CloseResult` — `{ closed: true }`, or `{ closed: false, reason }`
   * naming why not (`'blocked'`, `'interceptor-error'`, `'not-closable'`).
   */
  close: () => Promise<CloseResult>;
  /**
   * Closes every sheet in the group, topmost first.
   *
   * @returns A `CloseAllResult` — what closed, and which sheet stopped the
   * cascade if an interceptor did.
   */
  closeAll: (options?: CloseAllOptions) => Promise<CloseAllResult>;
  updateParams: (params: BottomSheetPortalParams<T>) => void;
  resetParams: () => void;
}

export function useBottomSheetControl<T extends BottomSheetPortalId>(
  id: T
): UseBottomSheetControlReturn<T> {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();

  const storeOpen = useOpen();
  const storeUpdateParams = useUpdateParams();

  const open = (options?: OpenOptions<T>) => {
    const groupId = bottomSheetManagerContext?.groupId || 'default';

    const result = storeOpen(
      {
        kind: 'portal',
        id,
        groupId,
        scaleBackground: options?.scaleBackground,
        backdrop: options?.backdrop,
        params: options?.params as Record<string, unknown>,
      },
      options?.mode
    );

    // Registered only after the store accepts the sheet, so a rejected open
    // leaves no orphan in the module-global ref map. Persistent (keepMounted)
    // sheets already registered their own ref on mount — don't replace it.
    if (result.opened && !getSheetRef(id)) {
      setSheetRef(id, React.createRef<SheetAdapterRef>());
    }

    return result.opened;
  };

  const close = () => requestClose(id);

  const closeAll = (options?: CloseAllOptions) => {
    const groupId = bottomSheetManagerContext?.groupId || 'default';
    return closeAllAnimated(groupId, options);
  };

  const updateParams = (params: BottomSheetPortalParams<T>) => {
    storeUpdateParams(id, params as Record<string, unknown>);
  };

  const resetParams = () => {
    storeUpdateParams(id, undefined);
  };

  return {
    open: open as OpenFunction<T>,
    close,
    closeAll,
    updateParams,
    resetParams,
  };
}
