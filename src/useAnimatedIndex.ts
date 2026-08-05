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
 * Drive it so it travels with the sheet, never in a single step — a discrete
 * `set(0)` puts the backdrop at full opacity on the first frame, a whole
 * animation ahead of the sheet it is meant to be backing.
 *
 * Hand it to a library that tracks the gesture itself:
 * ```ts
 * <SomeSheet animatedIndex={useAnimatedIndex()} />
 * ```
 *
 * Derive it from a position the library reports:
 * ```ts
 * useDerivedValue(() => animatedIndex.set(progress.value - 1));
 * ```
 *
 * Or animate it with the same config as the sheet, when neither is available:
 * ```ts
 * animatedIndex.set(withTiming(0, { duration: openDuration }));
 * ```
 *
 * Must be called inside a sheet component (within `BottomSheetContext`).
 */
export function useAnimatedIndex(): SharedValue<number> {
  const { id } = useBottomSheetContext();
  return ensureAnimatedIndex(id);
}
