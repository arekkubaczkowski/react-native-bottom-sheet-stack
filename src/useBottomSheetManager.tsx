import React from 'react';

import { useBottomSheetStore, type OpenMode } from './bottomSheet.store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import { sheetRefs } from './refsMap';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { shallow } from 'zustand/shallow';

export const useBottomSheetManager = () => {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();

  const { storeOpen, startClosing, storeClearAll } = useBottomSheetStore(
    (store) => ({
      storeOpen: store.open,
      storeClearAll: store.clearAll,
      startClosing: store.startClosing,
    }),
    shallow
  );

  const openBottomSheet = (
    content: React.ReactElement,
    options: {
      id?: string;
      groupId?: string;
      mode?: OpenMode;
      scaleBackground?: boolean;
    } = {}
  ) => {
    const groupId =
      options.groupId || bottomSheetManagerContext?.groupId || 'default';

    const id = options.id || Math.random().toString(36);
    const ref = React.createRef<BottomSheetMethods>();

    sheetRefs[id] = ref;

    // @ts-ignore
    const contentWithRef = React.cloneElement(content, { ref });

    storeOpen(
      {
        id,
        groupId,
        content: contentWithRef,
        scaleBackground: options.scaleBackground,
      },
      options.mode
    );

    return id;
  };

  const close = (id: string) => {
    startClosing(id);
  };

  const clearAll = () => {
    storeClearAll();
  };

  return {
    clearAll,
    close,
    openBottomSheet,
  };
};
