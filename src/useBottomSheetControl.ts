import React from 'react';
import type { SheetAdapterRef } from './adapter.types';

import {
  useOpen,
  useStartClosing,
  useUpdateParams,
  type OpenMode,
} from './bottomSheet.store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import type {
  BottomSheetPortalId,
  BottomSheetPortalParams,
  HasParams,
} from './portal.types';
import { getSheetRef, setSheetRef } from './refsMap';

interface BaseOpenOptions<TParams> {
  mode?: OpenMode;
  scaleBackground?: boolean;
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
  close: () => void;
  updateParams: (params: BottomSheetPortalParams<T>) => void;
  resetParams: () => void;
}

export function useBottomSheetControl<T extends BottomSheetPortalId>(
  id: T
): UseBottomSheetControlReturn<T> {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();

  const storeOpen = useOpen();
  const startClosing = useStartClosing();
  const storeUpdateParams = useUpdateParams();

  const open = (options?: OpenOptions<T>) => {
    const groupId = bottomSheetManagerContext?.groupId || 'default';

    // Only create ref if it doesn't exist (keepMounted sheets already have one)
    const existingRef = getSheetRef(id);
    if (!existingRef) {
      const ref = React.createRef<SheetAdapterRef>();
      setSheetRef(id, ref);
    }

    storeOpen(
      {
        id,
        groupId,
        content: null,
        usePortal: true,
        scaleBackground: options?.scaleBackground,
        params: options?.params as Record<string, unknown>,
      },
      options?.mode
    );
  };

  const close = () => {
    startClosing(id);
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
    updateParams,
    resetParams,
  };
}
