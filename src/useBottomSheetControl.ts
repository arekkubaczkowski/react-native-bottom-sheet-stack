import React from 'react';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

import {
  useBottomSheetStore,
  type BottomSheetStatus,
  type PortalOpenOptions,
} from './bottomSheet.store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import type { BottomSheetPortalId } from './portal.types';
import { sheetRefs } from './refsMap';

export interface UseBottomSheetControlReturn {
  open: (options?: PortalOpenOptions) => void;
  close: () => void;
  isOpen: boolean;
  status: BottomSheetStatus | null;
}

export function useBottomSheetControl(
  id: BottomSheetPortalId
): UseBottomSheetControlReturn {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();

  const openPortal = useBottomSheetStore((state) => state.openPortal);
  const startClosing = useBottomSheetStore((state) => state.startClosing);
  const sheetState = useBottomSheetStore((state) => state.sheetsById[id]);

  const open = (options?: PortalOpenOptions) => {
    const groupId = bottomSheetManagerContext?.groupId || 'default';

    // Create ref when opening (same pattern as useBottomSheetManager)
    const ref = React.createRef<BottomSheetMethods>();
    sheetRefs[id] = ref;

    openPortal(id, groupId, options);
  };

  const close = () => {
    startClosing(id);
  };

  const status = sheetState?.status ?? null;
  const isOpen = status === 'open' || status === 'opening';

  return {
    open,
    close,
    isOpen,
    status,
  };
}
