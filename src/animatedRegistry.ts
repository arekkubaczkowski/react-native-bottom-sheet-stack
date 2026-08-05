import { makeMutable, type SharedValue } from 'react-native-reanimated';

/**
 * Registry for shared animated values per sheet.
 *
 * Keyed by sheet ID rather than held in the store: shared values are not
 * serializable state, and both the store actions and the rendering hooks need
 * to reach the same value for a sheet. Either side may be first to ask for it,
 * so entries are created on demand — a sheet that has been cleaned up has no
 * entry, and callers handle its absence.
 */
const animatedIndexRegistry = new Map<string, SharedValue<number>>();

/** The value of a fully hidden sheet — the low end of the backdrop's fade. */
export const HIDDEN_ANIMATED_INDEX = -1;

export function ensureAnimatedIndex(sheetId: string): SharedValue<number> {
  const existing = animatedIndexRegistry.get(sheetId);
  if (existing) {
    return existing;
  }

  const animatedIndex = makeMutable(HIDDEN_ANIMATED_INDEX);
  animatedIndexRegistry.set(sheetId, animatedIndex);
  return animatedIndex;
}

/**
 * Returns the sheet's animated index, rewound to hidden.
 *
 * A sheet that re-opens still carries the value from its last cycle; without
 * the rewind its backdrop flashes opaque before the adapter drives it down.
 */
export function resetAnimatedIndex(sheetId: string): SharedValue<number> {
  const animatedIndex = ensureAnimatedIndex(sheetId);
  animatedIndex.value = HIDDEN_ANIMATED_INDEX;
  return animatedIndex;
}

export function getAnimatedIndex(
  sheetId: string
): SharedValue<number> | undefined {
  return animatedIndexRegistry.get(sheetId);
}

export function cleanupAnimatedIndex(sheetId: string): void {
  animatedIndexRegistry.delete(sheetId);
}

/**
 * Reset all animated indexes. Useful for testing.
 * @internal
 */
export function __resetAnimatedIndexes(): void {
  animatedIndexRegistry.clear();
}

/**
 * Get all animated indexes for debugging.
 * @internal
 */
export function __getAllAnimatedIndexes(): Map<string, SharedValue<number>> {
  return animatedIndexRegistry;
}
