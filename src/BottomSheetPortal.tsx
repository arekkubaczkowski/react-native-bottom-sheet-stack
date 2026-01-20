'use no memo';

import React from 'react';
import { Portal } from 'react-native-teleport';

import { BottomSheetContext } from './BottomSheet.context';
import { useBottomSheetStore } from './bottomSheet.store';
import type { BottomSheetPortalId } from './portal.types';
import { sheetRefs } from './refsMap';

interface BottomSheetPortalProps {
  id: BottomSheetPortalId;
  children: React.ReactElement;
}

export function BottomSheetPortal({ id, children }: BottomSheetPortalProps) {
  const sheetState = useBottomSheetStore((state) => state.sheetsById[id]);

  // Only render when the sheet is active and using portal
  if (!sheetState?.usePortal) {
    return null;
  }

  // Get the ref that was created in useBottomSheetControl.open()
  const ref = sheetRefs[id];

  // Clone the child element to add the ref
  // @ts-ignore - same pattern as useBottomSheetManager
  const childWithRef = React.cloneElement(children, { ref });

  // Wrap with BottomSheetContext so useBottomSheetState() works inside portal content
  return (
    <Portal hostName={`bottomsheet-${id}`}>
      <BottomSheetContext.Provider value={{ id }}>
        {childWithRef}
      </BottomSheetContext.Provider>
    </Portal>
  );
}
