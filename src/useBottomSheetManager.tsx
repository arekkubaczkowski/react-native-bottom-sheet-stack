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

  /**
   * Opens a sheet with inline content.
   *
   * @returns The sheet's ID, or `null` when the store declined to open it —
   * because the sheet is already on the stack, or another sheet in the group is
   * still animating open. A `__DEV__` warning explains which.
   */
  const openBottomSheet = (
    content: React.ReactElement,
    options: {
      id?: string;
      groupId?: string;
      mode?: OpenMode;
      scaleBackground?: boolean;
      backdrop?: boolean;
      params?: Record<string, unknown>;
    } = {}
  ): string | null => {
    const groupId =
      options.groupId || bottomSheetManagerContext?.groupId || 'default';

    const id = options.id || Math.random().toString(36);
    const ref = React.createRef<SheetAdapterRef>();

    const contentWithRef = React.cloneElement(content, {
      ref,
    } as { ref: typeof ref });

    const result = storeOpen(
      {
        id,
        groupId,
        content: contentWithRef,
        scaleBackground: options.scaleBackground,
        backdrop: options.backdrop,
        params: options.params,
      },
      options.mode
    );

    // Registered only after the store accepts the sheet. The ref map is
    // module-global and is only ever cleaned up by QueueItem's unmount — so
    // registering before a rejected open would leak an entry that nothing can
    // reclaim, once per rejected call, since inline IDs are random.
    if (!result.opened) {
      return null;
    }

    setSheetRef(id, ref);

    return id;
  };

  /**
   * Closes a sheet.
   *
   * @returns `true` once the sheet is closing, `false` if an `onBeforeClose`
   * interceptor blocked it or there was nothing to close.
   */
  const close = (id: string) => requestClose(id);

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
