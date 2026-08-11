import { StyleSheet } from 'react-native';

import type { BackdropConfig } from './backdrop.types';

/**
 * Value equality for a sheet's backdrop override.
 *
 * Adapters re-apply their `backdrop` prop from an effect and a JSX object
 * literal is fresh on every consumer render, so `setBackdrop` compares by value
 * and skips the write — otherwise a consumer re-render would patch the store
 * and re-render `BottomSheetBackdrop` each time.
 *
 * Styles are compared as flattened JSON, which is key-order sensitive: a
 * literal whose key order varied between renders would cost one redundant
 * write, never a wrong render. Comparing key-by-key instead is not worth it —
 * it has to reach for `JSON.stringify` on nested values (`transform`,
 * `shadowOffset`) anyway, and walking only one side's keys silently returns
 * `true` when one style carries an explicit `undefined` where the other
 * carries a real value, which *would* be a wrong render.
 *
 * Lives beside the backdrop rather than in `store/helpers.ts`: those are pure
 * stack operations, free of React Native imports.
 */
export function backdropValuesEqual(
  a: BackdropConfig | false | undefined,
  b: BackdropConfig | false | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.kind !== b.kind || a.pressToDismiss !== b.pressToDismiss) return false;
  if (a.kind === 'custom' && b.kind === 'custom') {
    return a.component === b.component;
  }
  if (a.kind === 'styled' && b.kind === 'styled') {
    return (
      JSON.stringify(StyleSheet.flatten(a.style)) ===
      JSON.stringify(StyleSheet.flatten(b.style))
    );
  }
  return false;
}
