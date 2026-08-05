import React, { useEffect, useRef } from 'react';
import type { SheetAdapterRef } from './adapter.types';

import { StyleSheet } from 'react-native';
import { Portal } from 'react-native-teleport';
import { BottomSheetContext } from './BottomSheet.context';
import {
  useMount,
  useSheetExists,
  useSheetPortalSession,
  useUnmount,
} from './store';
import { BottomSheetDefaultIndexContext } from './BottomSheetDefaultIndex.context';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.context';
import { BottomSheetRefContext } from './BottomSheetRef.context';
import type { BottomSheetPortalId } from './portal.types';
import { setSheetRef } from './refsMap';
import { useStableCallback } from './useStableCallback';

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
  const sheetRef = useRef<SheetAdapterRef>(null);
  const groupId = bottomSheetManagerContext?.groupId || 'default';

  const mountSheet = useStableCallback(() => {
    mount({ id, groupId });
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
    <Portal
      hostName={`bottomsheet-${id}-${portalSession}`}
      style={StyleSheet.absoluteFill}
    >
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
