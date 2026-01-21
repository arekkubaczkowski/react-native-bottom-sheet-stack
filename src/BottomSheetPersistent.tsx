import React, { cloneElement, useEffect, useRef, useState } from 'react';
import { Portal } from 'react-native-teleport';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

import { BottomSheetContext } from './BottomSheet.context';
import { useBottomSheetStore } from './bottomSheet.store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import type { BottomSheetPortalId } from './portal.types';
import { setSheetRef, cleanupSheetRef } from './refsMap';

interface BottomSheetPersistentProps {
  id: BottomSheetPortalId;
  children: React.ReactElement;
}

export function BottomSheetPersistent({
  id,
  children,
}: BottomSheetPersistentProps) {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();
  const mount = useBottomSheetStore((state) => state.mount);
  const unmount = useBottomSheetStore((state) => state.unmount);

  const sheetExists = useBottomSheetStore(
    (state) => !!state.sheetsById[id]?.id
  );

  const sheetRef = useRef<BottomSheetMethods>(null);
  const [childWithRef, setChildWithRef] = useState<React.ReactElement | null>(
    null
  );

  // Clone element with ref in useEffect (not during render)
  useEffect(() => {
    setChildWithRef(
      cloneElement(children, { ref: sheetRef } as { ref: typeof sheetRef })
    );
  }, [children]);

  // Mount sheet and sync ref to global refsMap
  useEffect(() => {
    const groupId = bottomSheetManagerContext?.groupId || 'default';

    setSheetRef(id, sheetRef);
    mount({
      id,
      groupId,
      content: null,
      usePortal: true,
      keepMounted: true,
    });

    return () => {
      unmount(id);
      cleanupSheetRef(id);
    };
  }, [id, bottomSheetManagerContext?.groupId, mount, unmount]);

  if (!sheetExists || !childWithRef) {
    return null;
  }

  return (
    <Portal hostName={`bottomsheet-${id}`}>
      <BottomSheetContext.Provider value={{ id }}>
        {childWithRef}
      </BottomSheetContext.Provider>
    </Portal>
  );
}
