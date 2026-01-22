'use no memo';

import React from 'react';
import { Portal } from 'react-native-teleport';

import { getAnimatedIndex } from './animatedRegistry';
import { BottomSheetContext } from './BottomSheet.context';
import { useSheetPortalSession } from './bottomSheet.store';
import { BottomSheetAnimatedIndexContext } from './BottomSheetAnimatedIndex.context';
import { BottomSheetDefaultIndexContext } from './BottomSheetDefaultIndex.context';
import { BottomSheetRefContext } from './BottomSheetRef.context';
import type { BottomSheetPortalId } from './portal.types';
import { getSheetRef } from './refsMap';

interface BottomSheetPortalProps {
  id: BottomSheetPortalId;
  children: React.ReactElement;
}

export function BottomSheetPortal({ id, children }: BottomSheetPortalProps) {
  const portalSession = useSheetPortalSession(id);
  const ref = getSheetRef(id);
  const animatedIndex = getAnimatedIndex(id);

  if (!portalSession || !ref) {
    return null;
  }

  const portalName = `bottomsheet-${id}-${portalSession}`;

  return (
    <Portal hostName={portalName}>
      <BottomSheetAnimatedIndexContext.Provider value={animatedIndex}>
        <BottomSheetContext.Provider value={{ id }}>
          <BottomSheetDefaultIndexContext.Provider value={{ defaultIndex: 0 }}>
            <BottomSheetRefContext.Provider value={ref}>
              {children}
            </BottomSheetRefContext.Provider>
          </BottomSheetDefaultIndexContext.Provider>
        </BottomSheetContext.Provider>
      </BottomSheetAnimatedIndexContext.Provider>
    </Portal>
  );
}
