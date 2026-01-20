import React from 'react';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

import {
  useBottomSheetStore,
  type BottomSheetStatus,
  type PortalOpenOptions,
} from './bottomSheet.store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import type {
  BottomSheetPortalId,
  BottomSheetPortalParams,
  HasParams,
} from './portal.types';
import { sheetRefs } from './refsMap';

type OpenOptions<T extends BottomSheetPortalId> = Omit<
  PortalOpenOptions<BottomSheetPortalParams<T>>,
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
  isOpen: boolean;
  status: BottomSheetStatus | null;
}

export function useBottomSheetControl<T extends BottomSheetPortalId>(
  id: T
): UseBottomSheetControlReturn<T> {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();

  const openPortal = useBottomSheetStore((state) => state.openPortal);
  const startClosing = useBottomSheetStore((state) => state.startClosing);
  const storeUpdateParams = useBottomSheetStore((state) => state.updateParams);
  const sheetState = useBottomSheetStore((state) => state.sheetsById[id]);

  const open = (options?: OpenOptions<T>) => {
    const groupId = bottomSheetManagerContext?.groupId || 'default';

    // Create ref when opening (same pattern as useBottomSheetManager)
    const ref = React.createRef<BottomSheetMethods>();
    sheetRefs[id] = ref;

    openPortal(id, groupId, options);
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

  const status = sheetState?.status ?? null;
  const isOpen = status === 'open' || status === 'opening';

  return {
    open: open as OpenFunction<T>,
    close,
    updateParams,
    resetParams,
    isOpen,
    status,
  };
}
