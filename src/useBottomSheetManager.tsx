import React from 'react';

import { useBottomSheetStore, type OpenMode } from './bottomSheet.store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import { setSheetRef } from './refsMap';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { shallow } from 'zustand/shallow';

export const useBottomSheetManager = () => {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();

  const { storeOpen, startClosing, storeClearGroup } = useBottomSheetStore(
    (store) => ({
      storeOpen: store.open,
      storeClearGroup: store.clearGroup,
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

    setSheetRef(id, ref);

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

  const clear = () => {
    const groupId = bottomSheetManagerContext?.groupId || 'default';
    storeClearGroup(groupId);
  };

  return {
    open: openBottomSheet,
    close,
    clear,
    /** @deprecated Use `open` instead */
    openBottomSheet,
    /** @deprecated Use `clear` instead */
    clearAll: clear,
  };
};
