import { useEffect, type ForwardedRef } from 'react';

import type { SheetAdapterRef, SheetRef } from './adapter.types';
import { useMaybeBottomSheetContext } from './BottomSheet.context';
import { useMaybeBottomSheetRef } from './BottomSheetRef.context';
import { useBottomSheetStore } from './store';

/**
 * Returns the correct ref for a custom adapter.
 *
 * Handles the internal ref routing between portal/persistent mode
 * (where the ref comes from context) and inline mode (where the ref
 * is forwarded by `useBottomSheetManager`).
 *
 * Usage:
 * ```tsx
 * const MyAdapter = React.forwardRef<SheetAdapterRef, Props>(
 *   ({ children }, forwardedRef) => {
 *     const ref = useAdapterRef(forwardedRef);
 *     useImperativeHandle(ref, () => ({ expand: ..., close: ... }));
 *   }
 * );
 * ```
 */
export function useAdapterRef(
  forwardedRef: ForwardedRef<SheetAdapterRef> | undefined
): SheetRef | ForwardedRef<SheetAdapterRef> | undefined {
  const contextRef = useMaybeBottomSheetRef();
  const ref = contextRef ?? forwardedRef;
  const id = useMaybeBottomSheetContext()?.id;

  // The coordinator drives status *changes* only, so an adapter that mounts
  // under a live status has nobody to drive it. Under `open` it opens itself;
  // under `closing` a fresh adapter cannot animate a close it never opened, so
  // the sheet is ended in the store instead (same as `driveSheetRef`'s give-up
  // path) — a mid-close remount ends the sheet without re-animating. `hidden`
  // is deliberately left alone: nothing is stuck there and the store owns the
  // restore. Passive effect: the imperative handle is attached by then.
  useEffect(() => {
    if (!id || typeof ref !== 'object') {
      return;
    }
    const status = useBottomSheetStore.getState().sheetsById[id]?.status;
    if (status === 'open') {
      ref?.current?.expand();
    } else if (status === 'closing') {
      useBottomSheetStore.getState().finishClosing(id);
    }
  }, [id, ref]);

  return ref;
}
