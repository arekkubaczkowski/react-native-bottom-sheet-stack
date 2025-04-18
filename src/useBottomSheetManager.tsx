import React from 'react';

import { useBottomSheetStore, type OpenMode } from './bottomSheet.store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import { sheetRefs } from './refsMap';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

export const useBottomSheetManager = () => {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();

  const {
    pushBottomSheet,
    replaceBottomSheet,
    switchBottomSheet,
    stack,
    startClosing,
    storeClearAll,
  } = useBottomSheetStore((store) => ({
    storeClearAll: store.clearAll,
    replaceBottomSheet: store.replace,
    pushBottomSheet: store.push,
    switchBottomSheet: store.switch,
    stack: store.stack,
    startClosing: store.startClosing,
  }));

  const openBottomSheet = (
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
  };

  const closeTop = () => {
    const top = stack.at(-1);
    if (top) {
      startClosing(top.id);
    }
  };

  const clearAll = () => {
    storeClearAll();
  };

  return {
    clearAll,
    closeTop,
    openBottomSheet,
    pushBottomSheet,
    replaceBottomSheet,
  };
};
