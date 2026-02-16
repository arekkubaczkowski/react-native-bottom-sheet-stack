import type { SharedValue } from 'react-native-reanimated';

import { ensureAnimatedIndex } from './animatedRegistry';
import { useBottomSheetContext } from './useBottomSheetContext';

/**
 * Returns the `animatedIndex` shared value for the current sheet.
 *
 * The value drives backdrop opacity and scale animations:
 * - `-1` = hidden (backdrop transparent)
 * - `0`  = fully visible (backdrop opaque)
 *
 * **Binary strategy** — set to `0` on expand and `-1` on close:
 * ```ts
 * const animatedIndex = useAnimatedIndex();
 * // in expand: animatedIndex.value = 0;
 * // in close:  animatedIndex.value = -1;
 * ```
 *
 * **Continuous strategy** — pass directly to a library that updates it during gestures:
 * ```ts
 * const animatedIndex = useAnimatedIndex();
 * <SomeSheet animatedIndex={animatedIndex} />
 * ```
 *
 * Must be called inside a sheet component (within `BottomSheetContext`).
 */
export function useAnimatedIndex(): SharedValue<number> {
  const { id } = useBottomSheetContext();
  return ensureAnimatedIndex(id);
}
