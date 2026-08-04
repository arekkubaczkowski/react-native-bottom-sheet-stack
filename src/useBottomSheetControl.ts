import React from 'react';
import type { SheetAdapterRef } from './adapter.types';

import { useOpen, useUpdateParams, type OpenMode } from './store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
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
    ? (options: OpenOptions<T>) => void
    : (options?: OpenOptions<T>) => void;

export interface UseBottomSheetControlReturn<T extends BottomSheetPortalId> {
  open: OpenFunction<T>;
  /**
   * Closes the sheet.
   *
   * @returns `true` once the sheet is closing, `false` if an `onBeforeClose`
   * interceptor blocked it or there was nothing to close.
   */
  close: () => Promise<boolean>;
  closeAll: (options?: CloseAllOptions) => Promise<void>;
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
        id,
        groupId,
        usePortal: true,
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
