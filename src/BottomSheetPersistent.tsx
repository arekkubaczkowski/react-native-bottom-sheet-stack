import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React, { useEffect, useRef } from 'react';

import {
  useMount,
  useSheetExists,
  useSheetPortalSession,
  useUnmount,
} from './bottomSheet.store';
import { BottomSheetDefaultIndexContext } from './BottomSheetDefaultIndex.context';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import { BottomSheetRefContext } from './BottomSheetRef.context';
import type { BottomSheetPortalId } from './portal.types';
import { setSheetRef } from './refsMap';
import { useEvent } from './useEvent';
import { Portal } from 'react-native-teleport';
import { BottomSheetContext } from './BottomSheet.context';

interface BottomSheetPersistentProps {
  id: BottomSheetPortalId;
  children: React.ReactElement;
}

export function BottomSheetPersistent({
  id,
  children,
}: BottomSheetPersistentProps) {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();
  const mount = useMount();
  const unmount = useUnmount();
  const sheetExists = useSheetExists(id);
  const portalSession = useSheetPortalSession(id);
  const sheetRef = useRef<BottomSheetMethods>(null);
  const groupId = bottomSheetManagerContext?.groupId || 'default';

  const mountSheet = useEvent(() => {
    mount({ id, groupId, content: null, usePortal: true, keepMounted: true });
  });

  useEffect(() => {
    if (!sheetExists) {
      setSheetRef(id, sheetRef);
      mountSheet();
    }
  }, [id, sheetExists, mountSheet]);

  useEffect(() => {
    return () => {
      unmount(id);
    };
  }, [id, unmount]);

  if (!sheetExists) {
    return null;
  }

  return (
    <Portal hostName={`bottomsheet-${id}-${portalSession}`}>
      <BottomSheetContext.Provider value={{ id }}>
        <BottomSheetDefaultIndexContext.Provider value={{ defaultIndex: -1 }}>
          <BottomSheetRefContext.Provider value={sheetRef}>
            {children}
          </BottomSheetRefContext.Provider>
        </BottomSheetDefaultIndexContext.Provider>
      </BottomSheetContext.Provider>
    </Portal>
  );
}
