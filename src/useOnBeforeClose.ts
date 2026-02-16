import { useEffect } from 'react';

import { useMaybeBottomSheetContext } from './BottomSheet.context';
import type { OnBeforeCloseCallback } from './onBeforeCloseRegistry';
import { removeOnBeforeClose, setOnBeforeClose } from './onBeforeCloseRegistry';

/**
 * Registers an interceptor that is called before the sheet closes.
 *
 * Return `false` (or a Promise that resolves to `false`) to prevent closing.
 * Return `true` (or resolve to `true`) to allow the close to proceed.
 *
 * Must be used inside a sheet component (within BottomSheetContext).
 *
 * @example
 * ```tsx
 * function MySheet() {
 *   const [dirty, setDirty] = useState(false);
 *
 *   useOnBeforeClose(() => {
 *     if (dirty) {
 *       Alert.alert('Discard changes?', '', [
 *         { text: 'Cancel', style: 'cancel' },
 *         { text: 'Discard', onPress: () => close() },
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

  if (!context?.id) {
    throw new Error(
      'useOnBeforeClose must be used within a BottomSheet component'
    );
  }

  const id = context.id;

  useEffect(() => {
    setOnBeforeClose(id, callback);
    return () => {
      removeOnBeforeClose(id);
    };
  });
}
