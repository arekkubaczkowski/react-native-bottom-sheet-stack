import { useEffect } from 'react';

import { useMaybeBottomSheetContext } from './BottomSheet.context';
import { useSetPreventDismiss } from './bottomSheet.store';
import type { OnBeforeCloseCallback } from './onBeforeCloseRegistry';
import { removeOnBeforeClose, setOnBeforeClose } from './onBeforeCloseRegistry';

/**
 * Registers an interceptor that is called before the sheet closes.
 *
 * When active, this hook:
 * 1. Sets `preventDismiss` on the sheet so adapters block user-initiated
 *    gestures (swipe down, pan-to-close) at the native level.
 * 2. Intercepts all programmatic close paths (backdrop tap, back button,
 *    `close()`, `closeAll()`) and calls the callback first.
 *
 * Return `false` (or a Promise that resolves to `false`) to prevent closing.
 * Return `true` (or resolve to `true`) to allow the close to proceed.
 *
 * Use `forceClose()` from `useBottomSheetContext` to bypass the interceptor.
 *
 * Must be used inside a sheet component (within BottomSheetContext).
 *
 * @example
 * ```tsx
 * function MySheet() {
 *   const [dirty, setDirty] = useState(false);
 *   const { forceClose } = useBottomSheetContext();
 *
 *   useOnBeforeClose(() => {
 *     if (dirty) {
 *       Alert.alert('Discard changes?', '', [
 *         { text: 'Cancel', style: 'cancel' },
 *         { text: 'Discard', onPress: () => forceClose() },
 *       ]);
 *       return false;
 *     }
 *     return true;
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

  useEffect(() => {
    setOnBeforeClose(id, callback);
    setPreventDismiss(id, true);
    return () => {
      removeOnBeforeClose(id);
      setPreventDismiss(id, false);
    };
  }, [id, callback, setPreventDismiss]);
}
