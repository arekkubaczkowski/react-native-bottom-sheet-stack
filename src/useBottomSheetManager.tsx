import React, { useCallback } from 'react';

import { useBottomSheetStore, type OpenMode } from './bottomSheet.store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import { sheetRefs } from './refsMap';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { shallow } from 'zustand/shallow';

export const useBottomSheetManager = () => {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();

  const {
    pushBottomSheet,
    replaceBottomSheet,
    switchBottomSheet,
    startClosing,
    storeClearAll,
  } = useBottomSheetStore(
    (store) => ({
      storeClearAll: store.clearAll,
      replaceBottomSheet: store.replace,
      pushBottomSheet: store.push,
      switchBottomSheet: store.switch,
      startClosing: store.startClosing,
    }),
    shallow
  );

  const openBottomSheet = useCallback(
    (
      content: React.ReactElement,
      options: {
        id?: string;
        groupId?: string;
        mode?: OpenMode;
      } = {}
    ) => {
      const groupId =
        options.groupId || bottomSheetManagerContext?.groupId || 'default';

      const id = Math.random().toString(36);
      const ref = React.createRef<BottomSheetMethods>();

      sheetRefs[id] = ref;

      // @ts-ignore
      const contentWithRef = React.cloneElement(content, { ref });

      if (options.mode === 'replace') {
        replaceBottomSheet({
          id,
          groupId,
          content: contentWithRef,
        });
      } else if (options.mode === 'switch') {
        switchBottomSheet({
          id,
          groupId,
          content: contentWithRef,
        });
      } else {
        pushBottomSheet({
          id,
          groupId,
          content: contentWithRef,
        });
      }

      return id;
    },
    [
      bottomSheetManagerContext?.groupId,
      pushBottomSheet,
      replaceBottomSheet,
      switchBottomSheet,
    ]
  );

  const close = useCallback(
    (id: string) => {
      startClosing(id);
    },
    [startClosing]
  );

  const clearAll = useCallback(() => {
    storeClearAll();
  }, [storeClearAll]);

  return {
    clearAll,
    close,
    openBottomSheet,
    pushBottomSheet,
    replaceBottomSheet,
  };
};
