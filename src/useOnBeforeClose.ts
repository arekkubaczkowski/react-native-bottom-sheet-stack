import { useEffect } from 'react';

import { useMaybeBottomSheetContext } from './BottomSheet.context';
import { useSetPreventDismiss } from './store';
import type { OnBeforeCloseCallback } from './onBeforeCloseRegistry';
import { removeOnBeforeClose, setOnBeforeClose } from './onBeforeCloseRegistry';
import { useStableCallback } from './useStableCallback';

/**
 * Registers an interceptor that is called before the sheet closes.
 *
 * When active, this hook:
 * 1. Sets `preventDismiss` on the sheet so adapters block user-initiated
 *    gestures (swipe down, pan-to-close) at the native level.
 * 2. Intercepts all programmatic close paths (backdrop tap, back button,
 *    `close()`, `closeAll()`) and calls the callback first.
 *
 * The interceptor receives `onConfirm` and `onCancel` and resolves whenever one
 * of them is called, so an asynchronous prompt needs no plumbing of its own.
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
 * @example Boolean return — an alternative for decisions that need no prompt.
 * Returning `boolean` or `Promise<boolean>` works in place of the callbacks:
 * `false` blocks the close, `true` allows it.
 * ```tsx
 * function MySheet() {
 *   const [dirty, setDirty] = useState(false);
 *
 *   useOnBeforeClose(() => !dirty);
 * }
 * ```
 */
export function useOnBeforeClose(callback: OnBeforeCloseCallback): void {
  const context = useMaybeBottomSheetContext();
  const setPreventDismiss = useSetPreventDismiss();
  // Every hook runs unconditionally, before the guard below. Throwing first
  // would change the hook count between renders — if the context disappears
  // mid-unmount, React reports "rendered fewer hooks than expected" and buries
  // the real cause.
  const stableCallback = useStableCallback(callback);
  const id = context?.id;

  useEffect(() => {
    if (!id) return;
    setOnBeforeClose(id, stableCallback);
    setPreventDismiss(id, true);
    return () => {
      removeOnBeforeClose(id);
      setPreventDismiss(id, false);
    };
  }, [id, stableCallback, setPreventDismiss]);

  if (!id) {
    throw new Error(
      'useOnBeforeClose must be used within a BottomSheet component'
    );
  }
}
