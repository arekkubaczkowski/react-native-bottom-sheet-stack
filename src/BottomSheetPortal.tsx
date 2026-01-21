'use no memo';

import React from 'react';
import { Portal } from 'react-native-teleport';

import { BottomSheetContext } from './BottomSheet.context';
import { useBottomSheetStore } from './bottomSheet.store';
import type { BottomSheetPortalId } from './portal.types';
import { getSheetRef } from './refsMap';

interface BottomSheetPortalProps {
  id: BottomSheetPortalId;
  children: React.ReactElement;
}

export function BottomSheetPortal({ id, children }: BottomSheetPortalProps) {
  const usePortal = useBottomSheetStore(
    (state) => state.sheetsById[id]?.usePortal
  );

  if (!usePortal) {
    return null;
  }

  const ref = getSheetRef(id);

  const childWithRef = React.cloneElement(children, {
    ref,
  } as { ref: typeof ref });

  return (
    <Portal hostName={`bottomsheet-${id}`}>
      <BottomSheetContext.Provider value={{ id }}>
        {childWithRef}
      </BottomSheetContext.Provider>
    </Portal>
  );
}
