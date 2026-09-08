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

  // The coordinator drives status *changes* only, so an adapter mounted under
  // an already-open sheet (a wrapper's fallback) has nobody else to open it.
  // Passive effect: the imperative handle is attached by then.
  useEffect(() => {
    if (!id || typeof ref !== 'object') {
      return;
    }
    if (useBottomSheetStore.getState().sheetsById[id]?.status !== 'open') {
      return;
    }
    ref?.current?.expand();
  }, [id, ref]);

  return ref;
}
