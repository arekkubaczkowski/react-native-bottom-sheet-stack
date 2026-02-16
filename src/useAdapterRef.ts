import type { ForwardedRef } from 'react';

import type { SheetAdapterRef, SheetRef } from './adapter.types';
import { useBottomSheetRefContext } from './BottomSheetRef.context';

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
  forwardedRef: ForwardedRef<SheetAdapterRef>
): SheetRef | ForwardedRef<SheetAdapterRef> {
  const contextRef = useBottomSheetRefContext();
  return contextRef ?? forwardedRef;
}
