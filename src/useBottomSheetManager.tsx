import React from 'react';

import { applyDeprecatedBackdrop } from './deprecatedBackdropOption';
import { useOpen, useClearGroup, useSetBackdrop, type OpenMode } from './store';
import type { CascadeOptions, CloseAllResult, CloseResult } from './store';
import { useMaybeBottomSheetManagerContext } from './BottomSheetManager.context';
import type { SheetAdapterRef } from './adapter.types';
import { closeAllAnimated, requestClose } from './bottomSheetCoordinator';
import { setSheetRef } from './refsMap';

export const useBottomSheetManager = () => {
  const bottomSheetManagerContext = useMaybeBottomSheetManagerContext();

  const storeOpen = useOpen();
  const storeClearGroup = useClearGroup();
  const setBackdrop = useSetBackdrop();

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
      /**
       * @deprecated Configure the backdrop on the sheet's adapter instead:
       * `<MyAdapter backdrop={false}>`, or a `BackdropConfig` to restyle or
       * replace it. The adapter prop works identically in inline, portal and
       * persistent mode, and can express more than on/off. Removed in the next
       * major.
       */
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
        kind: 'inline',
        id,
        groupId,
        content: contentWithRef,
        scaleBackground: options.scaleBackground,
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

    applyDeprecatedBackdrop(id, options.backdrop, setBackdrop);

    return id;
  };

  /**
   * Closes a sheet.
   *
   * @returns A `CloseResult` — `{ closed: true }`, or `{ closed: false, reason }`
   * naming why not (`'blocked'`, `'interceptor-error'`, `'not-closable'`).
   */
  const close = (id: string): Promise<CloseResult> => requestClose(id);

  const groupId = () => bottomSheetManagerContext?.groupId || 'default';

  /**
   * Closes the group's sheets from the top down, one after another.
   *
   * Pass `until` or `depth` to stop short of emptying the group — or reach for
   * {@link closeTo} / {@link closeDepth}, which say the same thing in a name.
   */
  const closeAll = (options?: CascadeOptions) =>
    closeAllAnimated(groupId(), options);

  /**
   * Closes sheets down to `id`, leaving it open — the stack equivalent of
   * navigating back to a screen.
   *
   * Pass `inclusive` to close `id` too. An `id` that is not on this group's
   * stack closes nothing, rather than falling through to closing everything.
   */
  const closeTo = (
    id: string,
    options?: Omit<CascadeOptions, 'until'>
  ): Promise<CloseAllResult> =>
    closeAllAnimated(groupId(), { ...options, until: id });

  /**
   * Closes at most `count` sheets, counting from the top of the stack.
   *
   * A count at or past the stack's height empties the group; zero or less
   * closes nothing.
   */
  const closeDepth = (
    count: number,
    options?: Omit<CascadeOptions, 'depth'>
  ): Promise<CloseAllResult> =>
    closeAllAnimated(groupId(), { ...options, depth: count });

  /**
   * Removes every sheet in the group from the store immediately.
   *
   * This is a teardown primitive, not a way to close sheets: there is no exit
   * animation and **`onBeforeClose` interceptors do not run**, so a sheet
   * guarding unsaved work is discarded without asking. Use {@link closeAll} for
   * anything user-facing.
   */
  const destroyAll = () => {
    storeClearGroup(groupId());
  };

  return {
    open: openBottomSheet,
    close,
    closeAll,
    closeTo,
    closeDepth,
    destroyAll,
  };
};
