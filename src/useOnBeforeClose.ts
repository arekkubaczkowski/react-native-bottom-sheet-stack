import { useEffect } from 'react';

import { useMaybeBottomSheetContext } from './BottomSheet.context';
import { useSetPreventDismiss } from './bottomSheet.store';
import type { OnBeforeCloseCallback } from './onBeforeCloseRegistry';
import { removeOnBeforeClose, setOnBeforeClose } from './onBeforeCloseRegistry';
import { useEvent } from './useEvent';

/**
 * Registers an interceptor that is called before the sheet closes.
 *
 * When active, this hook:
 * 1. Sets `preventDismiss` on the sheet so adapters block user-initiated
 *    gestures (swipe down, pan-to-close) at the native level.
 * 2. Intercepts all programmatic close paths (backdrop tap, back button,
 *    `close()`, `closeAll()`) and calls the callback first.
 *
 * The interceptor receives `onConfirm` and `onCancel` callbacks. Call these
 * when the user makes a decision. This works seamlessly with `Alert.alert`:
 *
 * ```tsx
 * useOnBeforeClose(({ onConfirm, onCancel }) => {
 *   if (dirty) {
 *     Alert.alert('Discard changes?', '', [
 *       { text: 'Cancel', onPress: onCancel },
 *       { text: 'Discard', onPress: onConfirm },
 *     ]);
 *   } else {
 *     onConfirm(); // Allow close immediately
 *   }
 * });
 * ```
 *
 * For backward compatibility, you can still return `boolean` or `Promise<boolean>`:
 * - Return `false` (or resolve to `false`) to prevent closing
 * - Return `true` (or resolve to `true`) to allow closing
 *
 * Use `forceClose()` from `useBottomSheetContext` to bypass the interceptor entirely.
 *
 * Must be used inside a sheet component (within BottomSheetContext).
 *
 * @example Callback pattern (recommended)
 * ```tsx
 * function MySheet() {
 *   const [dirty, setDirty] = useState(false);
 *
 *   useOnBeforeClose(({ onConfirm, onCancel }) => {
 *     if (dirty) {
 *       Alert.alert('Discard changes?', '', [
 *         { text: 'Cancel', style: 'cancel', onPress: onCancel },
 *         { text: 'Discard', onPress: onConfirm },
 *       ]);
 *     } else {
 *       onConfirm();
 *     }
 *   });
 * }
 * ```
 *
 * @example Boolean return (backward compatible)
 * ```tsx
 * function MySheet() {
 *   const [dirty, setDirty] = useState(false);
 *
 *   useOnBeforeClose(() => {
 *     return !dirty; // false blocks, true allows
 *   });
 * }
 * ```
 */
export function useOnBeforeClose(callback: OnBeforeCloseCallback): void {
  const context = useMaybeBottomSheetContext();
  const setPreventDismiss = useSetPreventDismiss();

  if (!context?.id) {
    throw new Error(
      'useOnBeforeClose must be used within a BottomSheet component'
    );
  }

  const id = context.id;
  const stableCallback = useEvent(callback);

  useEffect(() => {
    setOnBeforeClose(id, stableCallback);
    setPreventDismiss(id, true);
    return () => {
      removeOnBeforeClose(id);
      setPreventDismiss(id, false);
    };
  }, [id, stableCallback, setPreventDismiss]);
}
