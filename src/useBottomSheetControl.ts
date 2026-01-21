import React from 'react';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

import { useBottomSheetStore, type OpenMode } from './bottomSheet.store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import type {
  BottomSheetPortalId,
  BottomSheetPortalParams,
  HasParams,
} from './portal.types';
import { setSheetRef } from './refsMap';

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

  const storeOpen = useBottomSheetStore((state) => state.open);
  const startClosing = useBottomSheetStore((state) => state.startClosing);
  const storeUpdateParams = useBottomSheetStore((state) => state.updateParams);

  const open = (options?: OpenOptions<T>) => {
    const groupId = bottomSheetManagerContext?.groupId || 'default';

    const ref = React.createRef<BottomSheetMethods>();
    setSheetRef(id, ref);

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
