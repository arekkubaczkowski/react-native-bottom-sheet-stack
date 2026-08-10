import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import type { BackdropConfig } from './backdrop.types';

/**
 * Value equality for a sheet's backdrop override.
 *
 * Adapters re-apply their `backdrop` prop from an effect, and a JSX object
 * literal is fresh on every consumer render — so `setBackdrop` compares by
 * value and skips the write. Without it a consumer re-render would patch the
 * store, waking `BottomSheetBackdrop` (and any other subscriber) each time.
 *
 * Lives beside the backdrop rather than in `store/helpers.ts`: those are pure
 * stack operations and stay free of React Native imports.
 */
export function backdropValuesEqual(
  a: BackdropConfig | false | undefined,
  b: BackdropConfig | false | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.kind !== b.kind || a.pressToDismiss !== b.pressToDismiss) return false;
  if (a.kind !== 'styled' || b.kind !== 'styled') {
    return a.kind === 'custom' && b.kind === 'custom'
      ? a.component === b.component
      : false;
  }
  return flattenedStylesEqual(a.style, b.style);
}

function flattenedStylesEqual(
  a: StyleProp<ViewStyle> | undefined,
  b: StyleProp<ViewStyle> | undefined
): boolean {
  const flatA = StyleSheet.flatten(a);
  const flatB = StyleSheet.flatten(b);
  if (flatA === flatB) return true;
  if (!flatA || !flatB) return !flatA && !flatB;

  const keysA = Object.keys(flatA) as (keyof ViewStyle)[];
  if (keysA.length !== Object.keys(flatB).length) return false;

  return keysA.every((key) => {
    const valueA = flatA[key];
    const valueB = flatB[key];
    if (Object.is(valueA, valueB)) return true;
    // Nested values (`transform`, `shadowOffset`) miss the shallow check; they
    // are plain serializable style data, so structural comparison is sound.
    // A literal whose key order varies between renders would compare unequal —
    // that costs one redundant write, never a wrong render.
    if (typeof valueA === 'object' && valueA && typeof valueB === 'object') {
      return JSON.stringify(valueA) === JSON.stringify(valueB);
    }
    return false;
  });
}
