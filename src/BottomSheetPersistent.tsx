import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Portal } from 'react-native-teleport';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

import { BottomSheetContext } from './BottomSheet.context';
import { BottomSheetRefContext } from './BottomSheetRef.context';
import { useMount, useUnmount, useSheetExists } from './bottomSheet.store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import type { BottomSheetPortalId } from './portal.types';
import { setSheetRef, cleanupSheetRef } from './refsMap';
import { cleanupAnimatedIndex } from './animatedRegistry';
import { useEvent } from './useEvent';

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

  const sheetRef = useRef<BottomSheetMethods>(null);
  const groupId = bottomSheetManagerContext?.groupId || 'default';

  const mountSheet = useEvent(() => {
    setSheetRef(id, sheetRef);
    mount({ id, groupId, content: null, usePortal: true, keepMounted: true });
  });

  useLayoutEffect(() => {
    mountSheet();
    return () => {
      unmount(id);
      cleanupSheetRef(id);
      cleanupAnimatedIndex(id);
    };
  }, [id, groupId, mount, unmount, mountSheet]);

  // Re-mount if sheet was removed externally (e.g., by clearGroup during fast refresh)
  useEffect(() => {
    if (!sheetExists) {
      mountSheet();
    }
  }, [sheetExists, id, groupId, mount, mountSheet]);

  if (!sheetExists) {
    return null;
  }

  return (
    <Portal hostName={`bottomsheet-${id}`}>
      <BottomSheetContext.Provider value={{ id }}>
        <BottomSheetRefContext.Provider value={sheetRef}>
          {children}
        </BottomSheetRefContext.Provider>
      </BottomSheetContext.Provider>
    </Portal>
  );
}
