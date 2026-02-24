import React from 'react';

import { useOpen, useClearGroup, type OpenMode } from './bottomSheet.store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.provider';
import type { SheetAdapterRef } from './adapter.types';
import { closeAllAnimated, requestClose } from './bottomSheetCoordinator';
import { setSheetRef } from './refsMap';

export interface CloseAllOptions {
  /** Delay in ms between each cascading close animation. Default: 100 */
  stagger?: number;
}

export const useBottomSheetManager = () => {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();

  const storeOpen = useOpen();
  const storeClearGroup = useClearGroup();

  const openBottomSheet = (
    content: React.ReactElement,
    options: {
      id?: string;
      groupId?: string;
      mode?: OpenMode;
      scaleBackground?: boolean;
      backdrop?: boolean;
    } = {}
  ) => {
    const groupId =
      options.groupId || bottomSheetManagerContext?.groupId || 'default';

    const id = options.id || Math.random().toString(36);
    const ref = React.createRef<SheetAdapterRef>();

    setSheetRef(id, ref);

    const contentWithRef = React.cloneElement(content, {
      ref,
    } as { ref: typeof ref });

    storeOpen(
      {
        id,
        groupId,
        content: contentWithRef,
        scaleBackground: options.scaleBackground,
        backdrop: options.backdrop,
      },
      options.mode
    );

    return id;
  };

  const close = (id: string) => {
    requestClose(id);
  };

  const closeAll = (options?: CloseAllOptions) => {
    const groupId = bottomSheetManagerContext?.groupId || 'default';
    return closeAllAnimated(groupId, options);
  };

  const clear = () => {
    const groupId = bottomSheetManagerContext?.groupId || 'default';
    storeClearGroup(groupId);
  };

  return {
    open: openBottomSheet,
    close,
    closeAll,
    clear,
    /** @deprecated Use `open` instead */
    openBottomSheet,
    /** @deprecated Use `clear` instead */
    clearAll: clear,
  };
};
